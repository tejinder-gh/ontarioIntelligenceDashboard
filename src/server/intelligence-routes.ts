import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { sql } from '../db/index.js';
import { runHaltonAcquisition, runTorontoLicencesAcquisition } from '../acquisition/pipeline.js';
import { REGISTERED_SOURCES } from '../acquisition/sources-catalog.js';

export const intelligenceRouter = Router();

// 1. Business Directory & Advanced Search
intelligenceRouter.get('/businesses', async (req: Request, res: Response) => {
  try {
    const {
      city,
      province = 'ON',
      category_id,
      verification_status,
      operating_status,
      quality_min,
      has_phone,
      has_email,
      has_website,
      search,
      limit = '50',
      offset = '0',
    } = req.query;

    const parsedLimit = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));
    const parsedOffset = Math.max(0, parseInt(String(offset), 10) || 0);

    const conditions: any[] = [sql`b.is_active = true`];

    if (city && city !== 'all') {
      conditions.push(sql`LOWER(b.city) = LOWER(${String(city)})`);
    }
    if (category_id && category_id !== 'all') {
      conditions.push(sql`b.category_id = ${String(category_id)}`);
    }
    if (verification_status && verification_status !== 'all') {
      conditions.push(sql`b.verification_status = ${String(verification_status)}`);
    }
    if (operating_status && operating_status !== 'all') {
      conditions.push(sql`b.operating_status = ${String(operating_status)}`);
    }
    if (quality_min) {
      conditions.push(sql`b.quality_score >= ${Number(quality_min)}`);
    }
    if (has_phone === 'true') {
      conditions.push(sql`b.phone IS NOT NULL`);
    }
    if (has_email === 'true') {
      conditions.push(sql`b.email IS NOT NULL`);
    }
    if (has_website === 'true') {
      conditions.push(sql`b.website IS NOT NULL`);
    }
    if (search) {
      const pattern = `%${String(search).trim()}%`;
      conditions.push(sql`(b.name ILIKE ${pattern} OR b.address ILIKE ${pattern})`);
    }

    const whereClause = conditions.reduce((acc, cond) => sql`${acc} AND ${cond}`);

    const [countRow] = await sql<{ count: string }[]>`
      SELECT count(*) FROM businesses b WHERE ${whereClause};
    `;

    const businesses = await sql`
      SELECT 
        b.id, b.name, b.category_id, b.geography_id, b.address, b.city,
        b.postal_code, b.latitude, b.longitude, b.is_chain, b.brand_name,
        b.source_type, b.source_observed_at, b.verification_status,
        b.operating_status, b.phone, b.email, b.website, b.quality_score,
        b.confidence_score, b.first_observed_at, b.last_confirmed_at,
        c.display_name as category_name
      FROM businesses b
      LEFT JOIN business_categories c ON b.category_id = c.id
      WHERE ${whereClause}
      ORDER BY b.quality_score DESC, b.created_at DESC
      LIMIT ${parsedLimit}
      OFFSET ${parsedOffset};
    `;

    res.json({
      success: true,
      data: {
        total: parseInt(countRow.count, 10),
        limit: parsedLimit,
        offset: parsedOffset,
        businesses,
      },
    });
  } catch (err: any) {
    console.error('[API Error] Failed to query businesses:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Business Profile 360 & Provenance Lineage
intelligenceRouter.get('/businesses/:id', async (req: Request, res: Response) => {
  try {
    const businessId = req.params.id;

    const [business] = await sql`
      SELECT 
        b.*, c.display_name as category_name, g.display_name as geography_name
      FROM businesses b
      LEFT JOIN business_categories c ON b.category_id = c.id
      LEFT JOIN geographies g ON b.geography_id = g.id
      WHERE b.id = ${businessId};
    `;

    if (!business) {
      return res.status(404).json({ success: false, error: 'Business location not found.' });
    }

    const [sourceRecords, contacts, verificationEvents, identityMatches] = await Promise.all([
      sql`
        SELECT bsr.id, bsr.source_id, bsr.source_record_id, bsr.raw_payload, 
               bsr.payload_checksum, bsr.observed_at, s.name as source_name
        FROM business_source_records bsr
        LEFT JOIN sources s ON bsr.source_id = s.id
        WHERE bsr.canonical_business_id = ${businessId}
        ORDER BY bsr.observed_at DESC;
      `,
      sql`
        SELECT id, channel_type, channel_value, contact_role, is_verified, 
               casl_consent_type, casl_evidence_ref, is_suppressed
        FROM business_contacts
        WHERE business_id = ${businessId}
        ORDER BY is_verified DESC, created_at DESC;
      `,
      sql`
        SELECT id, verification_method, observed_operating_status, confidence, 
               evidence, verified_at, verified_by
        FROM business_verification_events
        WHERE business_id = ${businessId}
        ORDER BY verified_at DESC;
      `,
      sql`
        SELECT id, business_id_a, business_id_b, confidence_score, match_method, 
               resolution_status, match_signals, created_at
        FROM business_identity_matches
        WHERE business_id_a = ${businessId} OR business_id_b = ${businessId}
        ORDER BY created_at DESC;
      `,
    ]);

    res.json({
      success: true,
      data: {
        business,
        sourceRecords,
        contacts,
        verificationEvents,
        identityMatches,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Operational Verification Event
intelligenceRouter.post('/businesses/:id/verify', async (req: Request, res: Response) => {
  try {
    const businessId = req.params.id;
    const {
      verification_method = 'DIRECT_OUTREACH',
      observed_operating_status = 'OPERATING',
      evidence = {},
      verified_by = 'OPERATOR_DESK',
    } = req.body;

    const eventId = `verif_${crypto.randomUUID()}`;

    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO business_verification_events (
          id, business_id, verification_method, observed_operating_status,
          confidence, evidence, verified_at, verified_by
        ) VALUES (
          ${eventId}, ${businessId}, ${verification_method}, ${observed_operating_status},
          1.00, ${JSON.stringify(evidence)}::jsonb, NOW(), ${verified_by}
        );
      `;

      await tx`
        UPDATE businesses SET
          verification_status = 'VERIFIED_ACTIVE',
          operating_status = ${observed_operating_status},
          verification_basis = ${verification_method},
          last_confirmed_at = NOW(),
          quality_score = LEAST(100.0, quality_score + 10.0)
        WHERE id = ${businessId};
      `;
    });

    res.json({ success: true, message: 'Verification event recorded.', eventId });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Source Operations & Licensing Health
intelligenceRouter.get('/sources/health', async (req: Request, res: Response) => {
  try {
    const sources = Object.values(REGISTERED_SOURCES);
    const runs = await sql`
      SELECT ir.*, s.name as source_name
      FROM ingestion_runs ir
      LEFT JOIN sources s ON ir.dataset_id = s.id
      ORDER BY ir.start_time DESC
      LIMIT 10;
    `;

    const [stats] = await sql<{
      total_canonical: string;
      total_sources: string;
      total_contacts: string;
      total_verified: string;
    }[]>`
      SELECT 
        (SELECT count(*) FROM businesses) as total_canonical,
        (SELECT count(*) FROM business_source_records) as total_sources,
        (SELECT count(*) FROM business_contacts) as total_contacts,
        (SELECT count(*) FROM businesses WHERE verification_status = 'VERIFIED_ACTIVE') as total_verified;
    `;

    res.json({
      success: true,
      data: {
        sources,
        stats: {
          totalCanonical: parseInt(stats.total_canonical, 10),
          totalSources: parseInt(stats.total_sources, 10),
          totalContacts: parseInt(stats.total_contacts, 10),
          totalVerified: parseInt(stats.total_verified, 10),
        },
        recentRuns: runs,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Trigger Acquisition Run
intelligenceRouter.post('/acquisition/run', async (req: Request, res: Response) => {
  try {
    const { source = 'halton', limit = 600 } = req.body;
    let report;
    if (source === 'halton') {
      report = await runHaltonAcquisition({ limit: Number(limit) });
    } else {
      report = await runTorontoLicencesAcquisition(Number(limit));
    }
    res.json({ success: true, report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
