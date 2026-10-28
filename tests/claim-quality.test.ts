import { describe, it, expect } from 'vitest';
import { getAuditedCompetitorCount } from '../src/decision-engine/competitor-auditor.js';
import { runSensitivityAnalysis, verifySwitchingThresholds } from '../src/decision-engine/sensitivity-matrix.js';
import { generateDecisionBrief } from '../src/decision-engine/decision-brief-generator.js';
import { buildEvidenceLedger } from '../src/decision-engine/evidence-ledger.js';
import { calculateFinancialEconomics } from '../src/decision-engine/financial-scenarios.js';
import { buildDecisionModel } from '../src/decision-engine/decision-modeler.js';
import { sortCandidatesBySuitability } from '../src/decision-engine/suitability-scorer.js';
import { placesAdapter } from '../src/acquisition/adapters/places-adapter.js';
import { torontoLicencesAdapter } from '../src/acquisition/adapters/toronto-licences-adapter.js';
import { marketingOutreachModule } from '../src/ventures/modules/marketing/index.js';
import type { FunnelCandidate } from '../src/decision-engine/types.js';

describe('Claim Quality, Evidence Standards & Internal Consistency Suite', () => {
  const baseCandidate: FunnelCandidate = {
    id: 'cand_burlington_downtown',
    city: 'Burlington',
    name: 'Downtown Commercial Core',
    csdCode: '3524002',
    neighbourhood: 'Downtown',
    propertyAddress: '430 Brant St, Burlington, ON',
    listingId: 'MLS-W8102941',
    squareFootage: 1400,
    commercialGrossRentSqft: 42.0,
    monthlyRent: 4900,
    medianIncome: 104500,
    population2021: 186948,
    populationGrowthPct: 2.1,
    resolutionTier: 'POTENTIALLY_SUITABLE_PROPERTY',
    zoningFeasibilityStatus: 'UNVERIFIED_PENDING_REVIEW',
    suitabilityScore: 84,
    attractivenessScore: 88,
    confidenceScore: 78,
    scoreContributions: { income: 22, growth: 15, rent: 20, comp: 12, verif: 15 },
    tradeOffs: [],
    missingEvidence: [],
    scoreExplanation: 'Balanced downtown location with verified foot traffic and active commercial listing.'
  };

  const runnerUpCandidate: FunnelCandidate = {
    ...baseCandidate,
    id: 'cand_oakville_lakeshore',
    city: 'Oakville',
    name: 'Lakeshore Road Corridor',
    propertyAddress: '150 Lakeshore Rd E, Oakville, ON',
    listingId: 'MLS-W8109923',
    commercialGrossRentSqft: 48.0,
    monthlyRent: 5600,
    medianIncome: 118000,
    population2021: 213759,
    suitabilityScore: 82,
  };

  // 1. Zero vs Unknown: Competitor auditing never substitutes 0 for missing data
  it('CQ-1: never substitutes 0 for unknown competitor counts; returns UNAVAILABLE', () => {
    const unrecordedResult = getAuditedCompetitorCount('CSD_non_existent', 'pizza_store');
    expect(unrecordedResult.count).toBeUndefined();
    expect(unrecordedResult.classification).toBe('UNAVAILABLE');
    expect(unrecordedResult.source).toContain('UNAVAILABLE');

    const unknownCatResult = getAuditedCompetitorCount('CSD_burlington', 'unsupported_new_category');
    expect(unknownCatResult.count).toBeUndefined();
    expect(unknownCatResult.classification).toBe('UNAVAILABLE');
  });

  // 2. Sensitivity Matrix: Missing competitor count must not print "0 existing area competitors"
  it('CQ-2: sensitivity matrix labels unobserved competitor count as UNAVAILABLE without zero-substitution', () => {
    const { decisionModel } = buildDecisionModel({ inquiry: 'Open pizza store' });
    const candidateWithoutComps: FunnelCandidate = {
      ...baseCandidate,
      estimatedDirectCompetitors: undefined,
      competitorClassification: undefined,
    };
    const economics = calculateFinancialEconomics(candidateWithoutComps, decisionModel);
    const { shocks } = runSensitivityAnalysis(candidateWithoutComps, runnerUpCandidate, economics, decisionModel);

    const compShock = shocks.find(s => s.parameter === 'Local Competitive Ingress')!;
    expect(compShock).toBeDefined();
    expect(compShock.baseMetric).not.toContain('0 existing area competitors');
    expect(compShock.baseMetric).toContain('UNAVAILABLE');
    expect(compShock.impactOnViability).toContain('UNVERIFIED COMPETITIVE BASELINE');
    expect(compShock.resilienceRating).toBe('SENSITIVE');
  });

  // 3. Benchmark vs Direct Competitor: Broad sector counts are disclosed as benchmarks
  it('CQ-3: marks broad sector aggregates as BENCHMARK, not direct storefronts', () => {
    const logisticsResult = getAuditedCompetitorCount('CSD_burlington', 'retail_shipping_counter');
    expect(logisticsResult.classification).toBe('BENCHMARK');
    expect(logisticsResult.source).toContain('Broad Transportation & Warehousing Sector Benchmark');
    expect(logisticsResult.source).toContain('not direct courier storefronts');

    const { decisionModel } = buildDecisionModel({ inquiry: 'Open retail shipping counter in Burlington' });
    const benchmarkCand: FunnelCandidate = {
      ...baseCandidate,
      estimatedDirectCompetitors: 290,
      competitorClassification: 'BENCHMARK',
      competitorDataSource: logisticsResult.source
    };
    const economics = calculateFinancialEconomics(benchmarkCand, decisionModel);
    const { shocks } = runSensitivityAnalysis(benchmarkCand, runnerUpCandidate, economics, decisionModel);

    const compShock = shocks.find(s => s.parameter === 'Local Competitive Ingress')!;
    expect(compShock.baseMetric).toContain('sector establishments');
    expect(compShock.baseMetric).toContain('StatCan Benchmark');
    expect(compShock.impactOnViability).toContain('SECTOR BENCHMARK CAUTION');
  });

  // 4. Feasibility Gate: Zoning is UNVERIFIED until official municipal certificate
  it('CQ-4: zoning feasibility gate is honest; never claims VERIFIED without municipal clearance', () => {
    const { decisionModel, activeScenario } = buildDecisionModel({ inquiry: 'Open pizza store in Burlington' });
    const unverifiedCand: FunnelCandidate = {
      ...baseCandidate,
      zoningFeasibilityStatus: 'UNVERIFIED_PENDING_REVIEW'
    };
    const economics = calculateFinancialEconomics(unverifiedCand, decisionModel);
    const brief = generateDecisionBrief(unverifiedCand, [], decisionModel, activeScenario, economics, []);

    expect(brief.recommendation.feasibilityGateNote).toContain('FEASIBILITY GATE ACTIVE (UNVERIFIED)');
    expect(brief.recommendation.feasibilityGateNote).not.toContain('FEASIBILITY GATE VERIFIED');
    expect(brief.recommendation.feasibilityGateNote).toContain('zoning compliance certificate');
  });

  // 5. Evidence Ledger: Property listing and zoning classification is UNVERIFIED, not OBSERVED
  it('CQ-5: evidence ledger classifies uncertified property listing & zoning as UNVERIFIED', () => {
    const { decisionModel } = buildDecisionModel({ inquiry: 'Open pizza store' });
    const ledger = buildEvidenceLedger(baseCandidate, decisionModel);

    const propItem = ledger.find(item => item.claim.includes('Physical property'))!;
    expect(propItem).toBeDefined();
    expect(propItem.classification).toBe('UNVERIFIED');
    expect(propItem.evidenceObserved).toContain('advertises');
    expect(propItem.calculationMethod).toContain('zoning permitted use unverified');
    expect(propItem.provenance?.evidenceClassification).toBe('UNVERIFIED');
    expect(propItem.provenance?.transformation).toContain('municipal zoning permitted use and building utilities remain unverified');
  });

  // 6. Coordinates Null Preservation: Adapters must not fabricate Burlington or City Hall coordinates
  it('CQ-6: adapters preserve null coordinates without injecting fixed coordinates', () => {
    // PlacesAdapter test
    const rawFsqWithoutCoords = {
      fsq_place_id: 'test_fsq_123',
      name: 'No Coords Shop',
      latitude: null,
      longitude: null,
      address: '100 Main St',
      locality: 'Oakville',
      region: 'ON',
      postcode: 'L6H 1A1',
      country: 'CA',
      tel: null,
      website: null,
      email: null,
      fsq_category_labels_json: null,
      date_created: '2026-01-01',
      date_refreshed: null
    };
    // @ts-expect-error private method call in unit test
    const mappedPlaces = placesAdapter.mapToRawRecord(rawFsqWithoutCoords);
    expect(mappedPlaces.latitude).toBeNull();
    expect(mappedPlaces.longitude).toBeNull();
    expect(mappedPlaces.latitude).not.toBe(43.3262);

    // TorontoLicencesAdapter test
    const rawLicence = {
      licence_no: 'LIC-999',
      category: 'Commercial Business',
      operating_name: 'Scarborough Retail',
      client_name: 'Owner Name',
      business_phone: '416-555-0199',
      address_line_1: '5000 Sheppard Ave E',
      address_line_2: null,
      ward: 'Ward 23',
      issued_date: '2026-02-01',
      last_record_update: '2026-03-01'
    };
    // @ts-expect-error private method call in unit test
    const mappedLicence = torontoLicencesAdapter.mapToRawRecord(rawLicence);
    expect(mappedLicence.latitude).toBeNull();
    expect(mappedLicence.longitude).toBeNull();
    expect(mappedLicence.latitude).not.toBe(43.6532);
  });

  // 7. Outreach Dry-Run: Delivery status must be SIMULATED, never DELIVERED
  it('CQ-7: dry-run campaign records dispatch_status as SIMULATED and never DELIVERED', async () => {
    const campaignId = await marketingOutreachModule.createCampaign({
      name: `Dry Run Audit Test ${Date.now()}`,
      targetCategories: ['pizza_store'],
      targetCities: ['Burlington'],
      offeringTopic: 'Local Storefront Logistics',
      senderOrganization: 'Ontario Intelligence Audit Test',
      senderAddress: '100 King St W, Toronto, ON',
      senderContact: 'compliance@intelligence.ontario.ca',
      dailySendCap: 5,
    });

    try {
      await marketingOutreachModule.approveCampaign(campaignId, 'auditor_staff', 'DRY_RUN');
      const report = await marketingOutreachModule.executeDryRunSequence(campaignId, 5);

      expect(report.evaluated).toBeGreaterThanOrEqual(0);

      // Verify database records for this campaign
      const { sql } = await import('../src/db/index.js');
      const messages = await sql<{ dispatch_status: string; is_dry_run: boolean; provider_message_id: string }[]>`
        SELECT dispatch_status, is_dry_run, provider_message_id 
        FROM outreach_messages 
        WHERE campaign_id = ${campaignId};
      `;

      for (const msg of messages) {
        expect(msg.is_dry_run).toBe(true);
        expect(msg.dispatch_status).toBe('SIMULATED');
        expect(msg.dispatch_status).not.toBe('DELIVERED');
        expect(msg.provider_message_id).toContain('simulated_dry_run_');
      }
    } finally {
      const { sql } = await import('../src/db/index.js');
      await sql`DELETE FROM outreach_messages WHERE campaign_id = ${campaignId};`;
      await sql`DELETE FROM outreach_campaigns WHERE id = ${campaignId};`;
    }
  });

  // 8. Deterministic Candidate Sorting: Shuffling candidates produces identical top recommendation
  it('CQ-8: suitability ranking is deterministic and input-order invariant', () => {
    const candA = { ...baseCandidate, id: 'A', suitabilityScore: 85 };
    const candB = { ...baseCandidate, id: 'B', suitabilityScore: 80 };
    const candC = { ...baseCandidate, id: 'C', suitabilityScore: 75 };

    const sorted1 = sortCandidatesBySuitability([candA, candB, candC]);
    const sorted2 = sortCandidatesBySuitability([candC, candA, candB]);
    const sorted3 = sortCandidatesBySuitability([candB, candC, candA]);

    expect(sorted1.map(c => c.id)).toEqual(['A', 'B', 'C']);
    expect(sorted2.map(c => c.id)).toEqual(['A', 'B', 'C']);
    expect(sorted3.map(c => c.id)).toEqual(['A', 'B', 'C']);
  });

  // 9. Mathematical Cash Flow Switching Equality: Net_1(R*) = Net_2
  it('CQ-9: switching threshold R* satisfies Net_1(R*) = Net_2 exactly', () => {
    const { decisionModel } = buildDecisionModel({ inquiry: 'Open pizza store' });
    const verification = verifySwitchingThresholds(baseCandidate, runnerUpCandidate, decisionModel);
    expect(verification.rentEqualityDelta).toBeLessThan(0.01);
    expect(verification.thresholdRentSqft).toBeGreaterThan(baseCandidate.commercialGrossRentSqft);
  });

  // 10. Geographic Separation: Municipal counts are never asserted as neighbourhood counts
  it('CQ-10: decision brief separates municipal-level macro demographics from address-level screening', () => {
    const { decisionModel, activeScenario } = buildDecisionModel({ inquiry: 'Open pizza store in Burlington' });
    const candidateWithComps: FunnelCandidate = {
      ...baseCandidate,
      estimatedDirectCompetitors: 48,
      competitorClassification: 'OBSERVED',
      competitorDataSource: 'StatCan Table 33-10-1097-01'
    };
    const economics = calculateFinancialEconomics(candidateWithComps, decisionModel);
    const brief = generateDecisionBrief(candidateWithComps, [
      { candidate: candidateWithComps, rankingRationale: 'Top candidate' },
      { candidate: runnerUpCandidate, rankingRationale: 'Higher gross rent' }
    ], decisionModel, activeScenario, economics, []);

    const whyLocation = brief.whyThisLocation.join(' ');
    // Must clearly state municipal context for population and competitors
    expect(whyLocation).toContain('municipal population');
    expect(whyLocation).toContain('in Burlington');
    expect(whyLocation).toContain('Physical Premise Screening');
  });
});
