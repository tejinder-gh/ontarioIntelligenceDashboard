import crypto from 'node:crypto';
import { sql } from '../db/index.js';
import type { RawSourceRecord } from '../acquisition/types.js';
import {
  normalizeBusinessName,
  normalizeAddress,
  normalizePostalCode,
  normalizePhone,
  extractDomain,
  calculateDistanceMeters,
} from './normalizer.js';
import { mapCategoriesToCanonical, isNonCommercialEntity } from './category-mapper.js';
import { resolveGeographyId } from './geo-resolver.js';

export interface ResolutionResult {
  canonicalBusinessId: string;
  isNew: boolean;
  matchType: 'EXACT_SOURCE_ID' | 'STRONG_IDENTITY_MATCH' | 'NEW_RECORD';
  confidenceScore: number;
}

export function computeQualityScore(record: RawSourceRecord): number {
  let score = 20; // Has name
  if (record.address && record.address.length > 5) score += 20;
  if (record.latitude && record.longitude) score += 20;
  if (record.phone) score += 15;
  if (record.website) score += 15;
  if (record.email) score += 10;
  return Math.min(100, score);
}

export class EntityResolver {
  async resolveAndPersist(
    record: RawSourceRecord,
    ingestionRunId?: string
  ): Promise<ResolutionResult> {
    // Strictly isolate businesses table: non-commercial entities (parks, metro stations, municipal boundaries) must not leak into businesses directory
    if (isNonCommercialEntity(record.name, record.categories)) {
      return {
        canonicalBusinessId: '',
        isNew: false,
        matchType: 'NEW_RECORD',
        confidenceScore: 0,
      };
    }

    const rawPayloadStr = JSON.stringify(record.rawPayload);
    const checksum = crypto.createHash('sha256').update(rawPayloadStr).digest('hex');
    const normalizedName = normalizeBusinessName(record.name);
    const normalizedAddr = normalizeAddress(record.address);
    const normalizedPostcode = normalizePostalCode(record.postalCode);
    const normalizedPhone = normalizePhone(record.phone);
    const domain = extractDomain(record.website);
    const categoryId = mapCategoriesToCanonical(record.categories);
    const geographyId = await resolveGeographyId(record.city, record.province);
    const qualityScore = computeQualityScore(record);

    // 1. Check exact source record mapping
    const [existingSrc] = await sql<{ canonical_business_id: string | null }[]>`
      SELECT canonical_business_id 
      FROM business_source_records 
      WHERE source_id = ${record.sourceId} AND source_record_id = ${record.sourceRecordId};
    `;

    if (existingSrc?.canonical_business_id) {
      const canonicalId = existingSrc.canonical_business_id;
      await this.updateExistingCanonical(canonicalId, record, qualityScore);
      await this.recordSourceRecord(record, canonicalId, checksum, ingestionRunId);
      await this.syncContacts(canonicalId, record);
      return {
        canonicalBusinessId: canonicalId,
        isNew: false,
        matchType: 'EXACT_SOURCE_ID',
        confidenceScore: 1.0,
      };
    }

    // 2. Search for candidate matches in the same geography using targeted name, address, phone, or postal code
    const namePrefix = normalizedName.slice(0, 12).trim();
    const addrPrefix = normalizedAddr ? normalizedAddr.slice(0, 12).trim() : '';

    const candidates = await sql<{
      id: string;
      name: string;
      address: string | null;
      postal_code: string | null;
      latitude: number | null;
      longitude: number | null;
      phone: string | null;
      website: string | null;
    }[]>`
      SELECT id, name, address, postal_code, latitude, longitude, phone, website
      FROM businesses
      WHERE geography_id = ${geographyId}
        AND (
          (${namePrefix.length >= 3 ? sql`LOWER(name) ILIKE ${'%' + namePrefix + '%'}` : sql`false`})
          OR (${addrPrefix.length >= 4 ? sql`LOWER(address) ILIKE ${'%' + addrPrefix + '%'}` : sql`false`})
          OR (${record.phone ? sql`phone = ${record.phone}` : sql`false`})
          OR (${normalizedPostcode ? sql`postal_code = ${normalizedPostcode}` : sql`false`})
        )
      LIMIT 50;
    `;

    let bestCandidateId: string | null = null;
    let highestConfidence = 0.0;

    for (const cand of candidates) {
      const candNormName = normalizeBusinessName(cand.name);
      const candNormAddr = normalizeAddress(cand.address);
      const candNormPostcode = normalizePostalCode(cand.postal_code);
      const candPhone = normalizePhone(cand.phone);
      const candDomain = extractDomain(cand.website);
      const distance = calculateDistanceMeters(
        record.latitude,
        record.longitude,
        cand.latitude != null ? Number(cand.latitude) : null,
        cand.longitude != null ? Number(cand.longitude) : null
      );

      let confidence = 0.0;
      if (candNormName === normalizedName && normalizedName.length > 3) {
        confidence += 0.50;
      } else if (candNormName.includes(normalizedName) || normalizedName.includes(candNormName)) {
        confidence += 0.30;
      }

      if (candNormAddr && normalizedAddr && candNormAddr === normalizedAddr) {
        confidence += 0.30;
      } else if (distance < 100) {
        confidence += 0.20;
      }

      if (normalizedPostcode && candNormPostcode && normalizedPostcode === candNormPostcode) {
        confidence += 0.10;
      }

      if (normalizedPhone && candPhone && normalizedPhone === candPhone) {
        confidence += 0.10;
      }

      if (domain && candDomain && domain === candDomain) {
        confidence += 0.10;
      }

      if (confidence > highestConfidence) {
        highestConfidence = confidence;
        bestCandidateId = cand.id;
      }
    }

    // Strong identity match threshold
    if (bestCandidateId && highestConfidence >= 0.85) {
      await this.updateExistingCanonical(bestCandidateId, record, qualityScore);
      await this.recordSourceRecord(record, bestCandidateId, checksum, ingestionRunId);
      await this.syncContacts(bestCandidateId, record);

      // Record identity match audit
      await sql`
        INSERT INTO business_identity_matches (
          id, business_id_a, business_id_b, confidence_score, match_method, 
          match_signals, resolution_status, resolved_at
        ) VALUES (
          ${`match_${crypto.randomUUID()}`}, ${bestCandidateId}, ${bestCandidateId}, 
          ${highestConfidence}, 'STRONG_LOCATION_MATCH', 
          ${JSON.stringify({ distance: 'calculated', name_match: true })}::jsonb, 
          'AUTO_MERGED', NOW()
        );
      `;

      return {
        canonicalBusinessId: bestCandidateId,
        isNew: false,
        matchType: 'STRONG_IDENTITY_MATCH',
        confidenceScore: highestConfidence,
      };
    }

    // New Canonical Business Location
    const newCanonicalId = `biz_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
    await sql`
      INSERT INTO businesses (
        id, name, category_id, geography_id, address, city, postal_code,
        latitude, longitude, is_chain, brand_name, source_type, source_element_id,
        source_observed_at, verification_status, operating_status, phone, email,
        website, quality_score, confidence_score, tags, first_observed_at, is_active
      ) VALUES (
        ${newCanonicalId}, ${record.name}, ${categoryId}, ${geographyId}, 
        ${record.address ?? null}, ${record.city}, ${record.postalCode ?? null},
        ${record.latitude}, ${record.longitude}, ${record.isChain || false}, 
        ${record.brandName ?? null}, ${record.sourceId}, ${record.sourceRecordId},
        ${record.sourceObservedAt}, 'UNVERIFIED', 'UNKNOWN', 
        ${record.phone ?? null}, ${record.email ?? null}, ${record.website ?? null}, 
        ${qualityScore}, 0.80, ${JSON.stringify(record.rawPayload)}::jsonb, 
        NOW(), true
      );
    `;

    await this.recordSourceRecord(record, newCanonicalId, checksum, ingestionRunId);
    await this.syncContacts(newCanonicalId, record);

    return {
      canonicalBusinessId: newCanonicalId,
      isNew: true,
      matchType: 'NEW_RECORD',
      confidenceScore: 1.0,
    };
  }

  private async updateExistingCanonical(
    canonicalId: string,
    record: RawSourceRecord,
    qualityScore: number
  ): Promise<void> {
    await sql`
      UPDATE businesses SET
        phone = COALESCE(phone, ${record.phone ?? null}),
        email = COALESCE(email, ${record.email ?? null}),
        website = COALESCE(website, ${record.website ?? null}),
        address = COALESCE(address, ${record.address ?? null}),
        postal_code = COALESCE(postal_code, ${record.postalCode ?? null}),
        latitude = COALESCE(latitude, ${record.latitude ?? null}),
        longitude = COALESCE(longitude, ${record.longitude ?? null}),
        source_observed_at = GREATEST(source_observed_at, ${record.sourceObservedAt}),
        quality_score = GREATEST(quality_score, ${qualityScore})
      WHERE id = ${canonicalId};
    `;
  }

  private async recordSourceRecord(
    record: RawSourceRecord,
    canonicalId: string,
    checksum: string,
    ingestionRunId?: string
  ): Promise<void> {
    await sql`
      INSERT INTO business_source_records (
        id, source_id, source_record_id, canonical_business_id, 
        raw_payload, payload_checksum, observed_at, ingestion_run_id
      ) VALUES (
        ${`bsr_${crypto.randomUUID()}`}, ${record.sourceId}, ${record.sourceRecordId}, 
        ${canonicalId}, ${JSON.stringify(record.rawPayload)}::jsonb, 
        ${checksum}, ${record.sourceObservedAt}, ${ingestionRunId || null}
      )
      ON CONFLICT (source_id, source_record_id) DO UPDATE SET
        observed_at = EXCLUDED.observed_at,
        canonical_business_id = EXCLUDED.canonical_business_id;
    `;
  }

  private async syncContacts(canonicalId: string, record: RawSourceRecord): Promise<void> {
    if (record.phone) {
      await sql`
        INSERT INTO business_contacts (
          id, business_id, channel_type, channel_value, contact_role, 
          casl_consent_type, is_verified
        ) VALUES (
          ${`ct_${crypto.randomUUID()}`}, ${canonicalId}, 'PHONE', 
          ${record.phone}, 'GENERAL_BUSINESS', 'CONSPICUOUS_PUBLICATION', false
        )
        ON CONFLICT (business_id, channel_type, channel_value) DO NOTHING;
      `;
    }

    if (record.email) {
      await sql`
        INSERT INTO business_contacts (
          id, business_id, channel_type, channel_value, contact_role, 
          casl_consent_type, is_verified
        ) VALUES (
          ${`ct_${crypto.randomUUID()}`}, ${canonicalId}, 'EMAIL', 
          ${record.email}, 'GENERAL_BUSINESS', 'CONSPICUOUS_PUBLICATION', false
        )
        ON CONFLICT (business_id, channel_type, channel_value) DO NOTHING;
      `;
    }
  }
}

export const entityResolver = new EntityResolver();
