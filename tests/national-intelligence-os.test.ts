import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'node:crypto';
import { sql, closeDatabase } from '../src/db/index.js';
import { entityResolver, computeQualityScore } from '../src/resolution/entity-resolver.js';
import { caslEngine } from '../src/compliance/casl.js';
import { marketingOutreachModule } from '../src/ventures/modules/marketing/index.js';
import { businessAcquisitionModule } from '../src/ventures/modules/acquisition/index.js';
import { acuityGateway } from '../src/integrations/acuity.js';
import { durableQueue } from '../src/jobs/queue.js';
import { isValidCanadianProvince, getProvinceMetadata } from '../src/geography/canada.js';
import type { RawSourceRecord } from '../src/acquisition/types.js';
import { ventureRegistry } from '../src/ventures/registry.js';

describe('National Business Intelligence & Venture Execution OS', () => {
  const testRunId = `test_run_${Date.now()}`;
  const createdBusinessIds: string[] = [];
  const createdCampaignIds: string[] = [];
  const createdSuppressionKeys: string[] = [];

  beforeAll(async () => {
    await ventureRegistry.syncWithDatabase();
  });

  afterAll(async () => {
    // Clean up test records completely to prevent any table leakage
    if (createdCampaignIds.length > 0) {
      await sql`DELETE FROM acuity_voice_jobs WHERE campaign_id = ANY(${createdCampaignIds});`;
      await sql`DELETE FROM outreach_messages WHERE campaign_id = ANY(${createdCampaignIds});`;
      await sql`DELETE FROM outreach_campaigns WHERE id = ANY(${createdCampaignIds});`;
    }
    await sql`DELETE FROM acuity_voice_jobs WHERE id LIKE 'voice_test_%';`;
    await sql`DELETE FROM outreach_campaigns WHERE name ILIKE '%test%' OR id LIKE 'test_%';`;

    if (createdSuppressionKeys.length > 0) {
      await sql`DELETE FROM outreach_suppression WHERE channel_value = ANY(${createdSuppressionKeys});`;
    }
    await sql`DELETE FROM outreach_suppression WHERE channel_value LIKE 'optout_%';`;

    if (createdBusinessIds.length > 0) {
      await sql`DELETE FROM business_contacts WHERE business_id = ANY(${createdBusinessIds});`;
      await sql`DELETE FROM business_source_records WHERE canonical_business_id = ANY(${createdBusinessIds});`;
      await sql`DELETE FROM businesses WHERE id = ANY(${createdBusinessIds});`;
    }
    await sql`DELETE FROM business_source_records WHERE source_record_id LIKE 'test_src_%';`;
    await sql`DELETE FROM durable_jobs WHERE queue_name LIKE 'test_queue_%';`;
  });

  // 1. Exact source-ID repeat ingestion never creates duplicates
  it('enforces that repeating ingestion with same source-ID never creates duplicates', async () => {
    const uniqueSuffix = crypto.randomUUID().slice(0, 8);
    const rawRecord: RawSourceRecord = {
      sourceId: 'foursquare_overture_places',
      sourceRecordId: `test_src_${uniqueSuffix}`,
      name: `Oakville Tech Solutions ${uniqueSuffix}`,
      address: `${uniqueSuffix} Lakeshore Rd E`,
      city: 'Oakville',
      province: 'ON',
      postalCode: 'L6J 1H3',
      latitude: 43.4439,
      longitude: -79.6698,
      phone: '(905) 845-1234',
      email: 'info@oakvilletech.ca',
      website: 'https://oakvilletech.ca',
      categories: ['Business and Professional Services > Software'],
      sourceObservedAt: new Date('2026-07-01'),
      rawPayload: { place_id: `sample_${uniqueSuffix}` },
    };

    const firstRun = await entityResolver.resolveAndPersist(rawRecord, testRunId);
    if (firstRun.canonicalBusinessId) {
      createdBusinessIds.push(firstRun.canonicalBusinessId);
    }
    expect(firstRun.isNew).toBe(true);
    expect(firstRun.matchType).toBe('NEW_RECORD');

    const secondRun = await entityResolver.resolveAndPersist(rawRecord, testRunId);
    expect(secondRun.isNew).toBe(false);
    expect(secondRun.matchType).toBe('EXACT_SOURCE_ID');
    expect(secondRun.canonicalBusinessId).toBe(firstRun.canonicalBusinessId);

    // Verify database count for this source_record_id is strictly 1
    const [count] = await sql<{ count: string }[]>`
      SELECT count(*) FROM business_source_records 
      WHERE source_record_id = ${rawRecord.sourceRecordId};
    `;
    expect(parseInt(count.count, 10)).toBe(1);
  });

  // 2. Same name at different branches remains distinct
  it('preserves distinct identities for same-name branches at different locations', async () => {
    const branch1: RawSourceRecord = {
      sourceId: 'foursquare_overture_places',
      sourceRecordId: `test_src_${crypto.randomUUID()}`,
      name: 'Paramount Fine Foods',
      brandName: 'Paramount Fine Foods',
      isChain: true,
      address: '900 Maple Ave',
      city: 'Burlington',
      province: 'ON',
      postalCode: 'L7S 2J8',
      latitude: 43.3325,
      longitude: -79.8142,
      phone: '(905) 634-9999',
      categories: ['Dining and Drinking > Restaurant'],
      sourceObservedAt: new Date(),
      rawPayload: {},
    };

    const branch2: RawSourceRecord = {
      sourceId: 'foursquare_overture_places',
      sourceRecordId: `test_src_${crypto.randomUUID()}`,
      name: 'Paramount Fine Foods',
      brandName: 'Paramount Fine Foods',
      isChain: true,
      address: '2500 Winston Churchill Blvd',
      city: 'Oakville',
      province: 'ON',
      postalCode: 'L6H 7E5',
      latitude: 43.5123,
      longitude: -79.6789,
      phone: '(905) 829-1111',
      categories: ['Dining and Drinking > Restaurant'],
      sourceObservedAt: new Date(),
      rawPayload: {},
    };

    const res1 = await entityResolver.resolveAndPersist(branch1, testRunId);
    const res2 = await entityResolver.resolveAndPersist(branch2, testRunId);
    if (res1.canonicalBusinessId) createdBusinessIds.push(res1.canonicalBusinessId);
    if (res2.canonicalBusinessId) createdBusinessIds.push(res2.canonicalBusinessId);

    expect(res1.canonicalBusinessId).not.toBe(res2.canonicalBusinessId);
  });

  // 3. Shared franchise phone does not merge branches
  it('does not merge separate branches simply because they share a central 1-800 phone number', async () => {
    const centralPhone = '(800) 268-7499';
    const pizza1: RawSourceRecord = {
      sourceId: 'foursquare_overture_places',
      sourceRecordId: `test_src_${crypto.randomUUID()}`,
      name: 'Pizza Pizza',
      brandName: 'Pizza Pizza',
      isChain: true,
      address: '500 Brant St',
      city: 'Burlington',
      province: 'ON',
      latitude: 43.3270,
      longitude: -79.7990,
      phone: centralPhone,
      categories: ['Dining and Drinking > Restaurant > Pizza'],
      sourceObservedAt: new Date(),
      rawPayload: {},
    };

    const pizza2: RawSourceRecord = {
      sourceId: 'foursquare_overture_places',
      sourceRecordId: `test_src_${crypto.randomUUID()}`,
      name: 'Pizza Pizza',
      brandName: 'Pizza Pizza',
      isChain: true,
      address: '1011 Upper Middle Rd E',
      city: 'Oakville',
      province: 'ON',
      latitude: 43.4789,
      longitude: -79.7123,
      phone: centralPhone,
      categories: ['Dining and Drinking > Restaurant > Pizza'],
      sourceObservedAt: new Date(),
      rawPayload: {},
    };

    const r1 = await entityResolver.resolveAndPersist(pizza1, testRunId);
    const r2 = await entityResolver.resolveAndPersist(pizza2, testRunId);
    if (r1.canonicalBusinessId) createdBusinessIds.push(r1.canonicalBusinessId);
    if (r2.canonicalBusinessId) createdBusinessIds.push(r2.canonicalBusinessId);

    expect(r1.canonicalBusinessId).not.toBe(r2.canonicalBusinessId);
  });

  // 4. Multiple businesses at one address remain distinct
  it('maintains distinct identities for multiple businesses occupying the same address (commercial plaza)', async () => {
    const sharedAddress = '1450 Headon Rd';
    const bizA: RawSourceRecord = {
      sourceId: 'foursquare_overture_places',
      sourceRecordId: `test_src_${crypto.randomUUID()}`,
      name: 'Headon Forest Dental Clinic',
      address: sharedAddress,
      city: 'Burlington',
      province: 'ON',
      latitude: 43.3642,
      longitude: -79.8211,
      phone: '(905) 332-1111',
      categories: ['Health and Medicine > Dentist'],
      sourceObservedAt: new Date(),
      rawPayload: {},
    };

    const bizB: RawSourceRecord = {
      sourceId: 'foursquare_overture_places',
      sourceRecordId: `test_src_${crypto.randomUUID()}`,
      name: 'Headon Optical Boutique',
      address: sharedAddress,
      city: 'Burlington',
      province: 'ON',
      latitude: 43.3642,
      longitude: -79.8211,
      phone: '(905) 332-2222',
      categories: ['Retail > Eyewear'],
      sourceObservedAt: new Date(),
      rawPayload: {},
    };

    const rA = await entityResolver.resolveAndPersist(bizA, testRunId);
    const rB = await entityResolver.resolveAndPersist(bizB, testRunId);
    if (rA.canonicalBusinessId) createdBusinessIds.push(rA.canonicalBusinessId);
    if (rB.canonicalBusinessId) createdBusinessIds.push(rB.canonicalBusinessId);

    expect(rA.canonicalBusinessId).not.toBe(rB.canonicalBusinessId);
  });

  // 5. Unverified records never become verified merely through ingestion
  it('guarantees newly ingested records remain UNVERIFIED and last_confirmed_at is NULL', async () => {
    const newRecord: RawSourceRecord = {
      sourceId: 'foursquare_overture_places',
      sourceRecordId: `test_src_${crypto.randomUUID()}`,
      name: 'Milton Logistics Hub',
      address: '8400 Boston Church Rd',
      city: 'Milton',
      province: 'ON',
      latitude: 43.5123,
      longitude: -79.8890,
      categories: ['Business and Professional Services > Freight'],
      sourceObservedAt: new Date('2026-06-15'),
      rawPayload: {},
    };

    const res = await entityResolver.resolveAndPersist(newRecord, testRunId);
    if (res.canonicalBusinessId) createdBusinessIds.push(res.canonicalBusinessId);
    const [biz] = await sql<{
      verification_status: string;
      operating_status: string;
      last_confirmed_at: string | null;
    }[]>`
      SELECT verification_status, operating_status, last_confirmed_at
      FROM businesses
      WHERE id = ${res.canonicalBusinessId};
    `;

    expect(biz.verification_status).toBe('UNVERIFIED');
    expect(biz.operating_status).toBe('UNKNOWN');
    expect(biz.last_confirmed_at).toBeNull();
  });

  // 6. Null enrichment does not erase valid existing values
  it('prevents null or weaker incoming values from overwriting existing valid phone and website', async () => {
    const initialRecord: RawSourceRecord = {
      sourceId: 'foursquare_overture_places',
      sourceRecordId: `test_src_${crypto.randomUUID()}`,
      name: 'Georgetown Auto Clinic',
      address: '25 Guelph St',
      city: 'Halton Hills',
      province: 'ON',
      latitude: 43.6450,
      longitude: -79.9230,
      phone: '(905) 877-5555',
      website: 'https://georgetownauto.ca',
      categories: ['Automotive > Auto Repair'],
      sourceObservedAt: new Date('2026-01-01'),
      rawPayload: {},
    };

    const res = await entityResolver.resolveAndPersist(initialRecord, testRunId);
    if (res.canonicalBusinessId) createdBusinessIds.push(res.canonicalBusinessId);

    // Follow-up observation with missing phone & website
    const sparseFollowUp: RawSourceRecord = {
      sourceId: 'foursquare_overture_places',
      sourceRecordId: initialRecord.sourceRecordId,
      name: 'Georgetown Auto Clinic',
      address: '25 Guelph St',
      city: 'Halton Hills',
      province: 'ON',
      latitude: 43.6450,
      longitude: -79.9230,
      phone: null,
      website: null,
      categories: ['Automotive > Auto Repair'],
      sourceObservedAt: new Date('2026-08-01'),
      rawPayload: {},
    };

    await entityResolver.resolveAndPersist(sparseFollowUp, testRunId);

    const [updatedBiz] = await sql<{ phone: string | null; website: string | null }[]>`
      SELECT phone, website FROM businesses WHERE id = ${res.canonicalBusinessId};
    `;

    expect(updatedBiz.phone).toBe('(905) 877-5555');
    expect(updatedBiz.website).toBe('https://georgetownauto.ca');
  });

  // 7. CASL Compliance: Conspicuous publication requires B2B relevance
  it('evaluates CASL Section 10(9) B2B relevance and blocks irrelevant offerings', async () => {
    const relevantResult = await caslEngine.evaluateEligibility({
      recipientAddress: 'owner@burlingtonpizza.ca',
      channelType: 'EMAIL',
      recipientBusinessCategory: 'pizza_store',
      offeringTopic: 'Commercial Kitchen Energy Efficiency Grants',
      senderOrganization: 'Ontario Commercial Energy Initiative',
      senderAddress: '100 King St W, Toronto, ON M5X 1C9',
      senderContact: 'contact@energy.ontario.ca',
    });

    expect(relevantResult.isEligible).toBe(true);
    expect(relevantResult.consentBasis).toBe('CONSPICUOUS_PUBLICATION');
    expect(relevantResult.mandatoryFooterText).toContain('unsubscribe');

    const irrelevantResult = await caslEngine.evaluateEligibility({
      recipientAddress: 'owner@burlingtonpizza.ca',
      channelType: 'EMAIL',
      recipientBusinessCategory: 'pizza_store',
      offeringTopic: '', // No topic
      senderOrganization: 'Ontario Commercial Energy Initiative',
      senderAddress: '100 King St W, Toronto, ON M5X 1C9',
      senderContact: 'contact@energy.ontario.ca',
    });

    expect(irrelevantResult.isEligible).toBe(false);
    expect(irrelevantResult.blockReason).toBe('OFFERING_NOT_RELEVANT_TO_BUSINESS_CAPACITY');
  });

  // 8. Suppressed contacts cannot be messaged across any campaign
  it('enforces universal suppression: an opted-out contact is blocked from all campaigns', async () => {
    const suppressedEmail = `optout_${Date.now()}@example.com`;
    createdSuppressionKeys.push(suppressedEmail);
    await caslEngine.recordOptOut('EMAIL', suppressedEmail, 'UNSUBSCRIBE_REQUEST');

    const result = await caslEngine.evaluateEligibility({
      recipientAddress: suppressedEmail,
      channelType: 'EMAIL',
      recipientBusinessCategory: 'automotive_repair',
      offeringTopic: 'Shop Management Software Partnership',
      senderOrganization: 'Ontario Tech Partners',
      senderAddress: '100 King St W, Toronto, ON M5X 1C9',
      senderContact: 'contact@techpartners.ca',
      campaignId: 'camp_different_venture',
    });

    expect(result.isEligible).toBe(false);
    expect(result.blockReason).toContain('SUPPRESSED');
  });

  // 9. Campaigns cannot send without approval gate
  it('enforces activation gate: campaigns cannot execute live dispatches in DRAFT or DRY_RUN mode', async () => {
    const campaignId = await marketingOutreachModule.createCampaign({
      name: 'Unapproved Test Campaign',
      targetCategories: ['pizza_store'],
      targetCities: ['Burlington'],
      offeringTopic: 'Commercial Growth',
      senderOrganization: 'Test Corp',
      senderAddress: '123 Main St, Toronto, ON',
      senderContact: 'contact@test.ca',
    });
    createdCampaignIds.push(campaignId);

    const [campaign] = await sql<{ approval_status: string; execution_mode: string }[]>`
      SELECT approval_status, execution_mode FROM outreach_campaigns WHERE id = ${campaignId};
    `;

    expect(campaign.approval_status).toBe('PENDING');
    expect(campaign.execution_mode).toBe('DRY_RUN');

    // Attempting Acuity voice call must be blocked by regulatory gate
    const [sampleBiz] = await sql<{ id: string; name: string }[]>`
      SELECT id, name FROM businesses LIMIT 1;
    `;
    const voiceRes = await acuityGateway.stageVoiceCallJob({
      campaignId,
      businessId: sampleBiz.id,
      targetPhone: '(905) 555-0199',
      businessName: sampleBiz.name,
    });

    expect(voiceRes.status).toBe('BLOCKED_BY_REGULATORY_GATE');
    expect(voiceRes.clearanceDetails.authorizedCampaign).toBe(false);
  });

  // 10. Durable job retry idempotency
  it('guarantees durable worker job queue enforces idempotency and leasing recovery', async () => {
    const queueName = `test_queue_${Date.now()}`;
    const idempotencyKey = `idemp_${crypto.randomUUID()}`;

    const jobId1 = await durableQueue.enqueue({
      queueName,
      jobType: 'SOURCE_SYNC',
      payload: { source: 'foursquare' },
      idempotencyKey,
    });

    const jobId2 = await durableQueue.enqueue({
      queueName,
      jobType: 'SOURCE_SYNC',
      payload: { source: 'foursquare' },
      idempotencyKey,
    });

    expect(jobId1).toBe(jobId2);

    // Atomically lease job
    const leasedJob = await durableQueue.leaseNext(queueName, 'worker_1', 30);
    expect(leasedJob).not.toBeNull();
    expect(leasedJob?.id).toBe(jobId1);

    // Complete job
    await durableQueue.complete(jobId1, { recordsProcessed: 50 });

    const stats = await durableQueue.getStats(queueName);
    expect(stats.COMPLETED).toBe(1);
    expect(stats.PENDING).toBe(0);
  });

  // 11. Venture Module Framework: Multi-venture qualification separation
  it('supports independent qualification rules across Marketing and Acquisition modules', () => {
    const chainStore = {
      id: 'biz_chain_test',
      name: "Domino's Pizza",
      categoryId: 'pizza_store',
      city: 'Burlington',
      province: 'ON',
      isChain: true,
      phone: '(905) 634-1234',
      email: 'corporate@dominos.ca',
    };

    const marketingEval = marketingOutreachModule.qualifyBusiness(chainStore);
    const acquisitionEval = businessAcquisitionModule.qualifyBusiness(chainStore);

    // Marketing qualifies chains (active marketing target)
    expect(marketingEval.isQualified).toBe(true);

    // Acquisition strictly disqualifies franchise chains (not an independent acquisition prospect)
    expect(acquisitionEval.isQualified).toBe(false);
    expect(acquisitionEval.priorityTier).toBe('DISQUALIFIED');
  });

  // 12. Canada geographic taxonomy validation
  it('validates official Canadian province SGC codes and rejects foreign locations', () => {
    expect(isValidCanadianProvince('ON')).toBe(true);
    expect(isValidCanadianProvince('QC')).toBe(true);
    expect(isValidCanadianProvince('BC')).toBe(true);
    expect(isValidCanadianProvince('NY')).toBe(false);
    expect(isValidCanadianProvince('CA')).toBe(false); // CA is country, not province

    const ontarioMeta = getProvinceMetadata('ON');
    expect(ontarioMeta?.sgcCode).toBe('35');
    expect(ontarioMeta?.callingCutoffLocalHour).toBe(21);
  });
});
