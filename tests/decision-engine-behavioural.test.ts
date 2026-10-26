import { describe, it, expect } from 'vitest';
import { runDecisionEngine, replayDecisionRun } from '../src/decision-engine/engine.js';
import { buildDecisionModel } from '../src/decision-engine/decision-modeler.js';
import { executeStagedFunnel } from '../src/decision-engine/staged-funnel.js';
import { evaluateBusinessHypotheses } from '../src/decision-engine/hypothesis-evaluator.js';
import { calculateFinancialEconomics } from '../src/decision-engine/financial-scenarios.js';
import { runSensitivityAnalysis } from '../src/decision-engine/sensitivity-matrix.js';
import { buildMetricProvenance } from '../src/decision-engine/provenance.js';

describe('Decision Engine Behavioural Quality & Verification Suite', () => {
  // 1. Non-Restaurant Inquiry: Logistics & Shipping Centre
  it('B1: evaluates shipping centre inquiry without restaurant assumptions', async () => {
    const result = await runDecisionEngine({
      inquiry: 'I want to open a shipping and courier logistics centre with flexible location in Ontario',
      investmentCapital: 350000,
      workingCapital: 60000
    });

    expect(result.decisionModel.categoryId).toBe('logistics_warehouse');
    expect(result.decisionModel.naicsCode).toBe('484110');
    expect(result.decisionModel.volumeUnit).toBe('daily dispatches / parcels');
    expect(result.decisionModel.unitRevenueLabel).toBe('Revenue per Waybill / Dispatch');

    // Financial lines must not contain food costs
    const econ = result.financialEconomics;
    expect(econ.bands.baseCase.unitName).toBe('daily dispatches / parcels');
    expect(econ.breakEvenDailyUnits).toBeGreaterThan(0);

    // Material unknowns must focus on industrial criteria (overhead doors, 3-phase 400A)
    const unknowns = result.materialUnknowns;
    expect(unknowns.some(u => u.title.toLowerCase().includes('industrial') || u.title.toLowerCase().includes('overhead'))).toBe(true);
    expect(unknowns.some(u => u.title.includes('Type 1 Grease Exhaust'))).toBe(false);
  });

  // 2. No Eligible Properties: Graceful Neighborhood Bounding Without Hallucinating Addresses
  it('B2: bounds resolution tier to PROMISING_NEIGHBOURHOOD when no commercial listing exists', async () => {
    const { decisionModel } = buildDecisionModel({
      inquiry: 'Open a commercial logistics freight depot in Ontario'
    });
    const funnel = await executeStagedFunnel(decisionModel);
    
    // For logistics_warehouse, no pre-seeded listings exist in business_listings
    const topCandidate = funnel.shortlistedCandidates[0]!;
    expect(topCandidate.resolutionTier).toBe('PROMISING_NEIGHBOURHOOD');
    expect(topCandidate.propertyAddress).toBeUndefined();
    expect(topCandidate.listingId).toBeUndefined();

    // Provenance/ledger must report physical address as UNAVAILABLE or UNVERIFIED
    const unverifiedClaim = funnel.stoppingCriteria.some(s => s.includes('PROMISING_NEIGHBOURHOOD'));
    expect(unverifiedClaim).toBe(true);
  });

  // 3. Low Competition With Weak Demand: Does Not Conflate Low Competition with High Demand
  it('B3: rejects low competition as proof of unmet demand when catchment scale is insufficient', () => {
    const { decisionModel } = buildDecisionModel({ inquiry: 'Open pizza store' });
    
    // Synthetic low-density candidate with 1 competitor but weak population
    const weakMarketCandidate = {
      id: 'weak_market',
      name: 'Sparse Rural Node',
      city: 'Ruralville',
      parentGeoId: 'CSD_rural',
      resolutionTier: 'PROSPECTIVE_MARKET' as const,
      population2021: 4500,
      populationGrowthPct: -0.5,
      medianIncome: 55000,
      annualFoodAwayExpenditure: 2100,
      commercialNetRentSqft: 18.0,
      commercialTmiSqft: 6.0,
      commercialGrossRentSqft: 24.0,
      estimatedDirectCompetitors: 1, // Very low competition
      competitorDataSource: 'StatCan Business Counts',
      attractivenessScore: 35,
      confidenceScore: 85,
      suitabilityScore: 40,
      zoningFeasibilityStatus: 'UNVERIFIED_PENDING_REVIEW' as const,
      buildingSuitabilityStatus: 'UNVERIFIED_MEP_CHECK_NEEDED' as const
    };

    const hypotheses = evaluateBusinessHypotheses(weakMarketCandidate, decisionModel);
    const compHypothesis = hypotheses.find(h => h.id === 'H5_COMPETITOR_GAP')!;
    
    // Must recognize alternative explanation (low count is symptom of weak market, not unmet demand)
    expect(compHypothesis.alternativeExplanation).toContain('deficient customer demand');
    expect(compHypothesis.status).toBe('CONTRADICTED');
  });

  // 4. Strong Demand With Unviable Economics
  it('B4: flags unviable economics when lease rate breaches viability ceiling or capital is deficient', async () => {
    // Investment capital far below requirement ($35k vs $195k needed)
    const result = await runDecisionEngine({
      inquiry: 'I want to open a pizza store in Burlington with only $35,000 capital',
      investmentCapital: 35000,
      workingCapital: 5000
    });

    expect(result.decisionBrief.recommendation.outcome).toBe('DO_NOT_PROCEED');
    expect(result.decisionBrief.recommendation.summaryHeadline).toContain('DO NOT PROCEED');
  });

  // 5. Feasibility Gates: Unverified Permitted Use Blocks Final Commitment
  it('B5: enforces feasibility gate on unverified zoning regardless of commercial score', async () => {
    const result = await runDecisionEngine({
      inquiry: 'Open a pizza store in Burlington Ontario'
    });

    const topCand = result.geographicFunnel.shortlistedCandidates[0]!;
    expect(topCand.zoningFeasibilityStatus).toBe('UNVERIFIED_PENDING_REVIEW');
    expect(result.decisionBrief.recommendation.feasibilityGateNote).toContain('FEASIBILITY GATE ACTIVE');
    expect(result.decisionBrief.recommendation.resolutionTier).not.toBe('FEASIBILITY_VERIFIED_PROPERTY');
  });

  // 6. Ranking Reversals Under Realistic Cost Shocks
  it('B6: demonstrates deterministic ranking switch when cost threshold is exceeded', () => {
    const { decisionModel } = buildDecisionModel({ inquiry: 'Open pizza store' });
    
    const candidateA = {
      id: 'cand_a',
      name: 'Downtown Commercial Unit',
      city: 'Burlington',
      parentGeoId: 'CSD_burlington',
      resolutionTier: 'POTENTIALLY_SUITABLE_PROPERTY' as const,
      population2021: 186948,
      populationGrowthPct: 2.0,
      medianIncome: 93800,
      annualFoodAwayExpenditure: 4480,
      commercialNetRentSqft: 28.0,
      commercialTmiSqft: 10.0,
      commercialGrossRentSqft: 38.0,
      estimatedDirectCompetitors: 14,
      competitorDataSource: 'StatCan Business Counts',
      attractivenessScore: 88,
      confidenceScore: 85,
      suitabilityScore: 86,
      zoningFeasibilityStatus: 'UNVERIFIED_PENDING_REVIEW' as const,
      buildingSuitabilityStatus: 'UNVERIFIED_MEP_CHECK_NEEDED' as const,
      squareFootage: 1400
    };

    const candidateB = {
      id: 'cand_b',
      name: 'Secondary Arterial Strip Plaza',
      city: 'Hamilton',
      parentGeoId: 'CSD_hamilton',
      resolutionTier: 'POTENTIALLY_SUITABLE_PROPERTY' as const,
      population2021: 569353,
      populationGrowthPct: 1.5,
      medianIncome: 75200,
      annualFoodAwayExpenditure: 3850,
      commercialNetRentSqft: 18.0,
      commercialTmiSqft: 7.0,
      commercialGrossRentSqft: 25.0,
      estimatedDirectCompetitors: 28,
      competitorDataSource: 'StatCan Business Counts',
      attractivenessScore: 80,
      confidenceScore: 85,
      suitabilityScore: 81,
      zoningFeasibilityStatus: 'UNVERIFIED_PENDING_REVIEW' as const,
      buildingSuitabilityStatus: 'UNVERIFIED_MEP_CHECK_NEEDED' as const,
      squareFootage: 1400
    };

    const econA = calculateFinancialEconomics(candidateA, decisionModel);
    const { switchingConditions } = runSensitivityAnalysis(candidateA, candidateB, econA, decisionModel);

    expect(switchingConditions.length).toBeGreaterThan(0);
    const rentSwitch = switchingConditions.find(s => s.formulaTrigger.includes('Gross Lease Rate'))!;
    expect(rentSwitch.alternativeTarget).toBe(candidateB.name);
    expect(rentSwitch.switchingThresholdValue).toMatch(/\$\d+\.\d{2}\/sqft/);
  });

  // 7. Source Provenance: City Data Invalidation for Property-Level Claims
  it('B7: validates that city-level CSD data cannot be asserted as property address resolution', () => {
    const invalidProvenance = buildMetricProvenance({
      metricKey: 'pedestrian_count',
      metricName: 'Pedestrian Footfall Count',
      sourceName: 'StatCan 2021 Census',
      sourceUrl: 'https://statcan.gc.ca',
      datasetId: '98-316-X2021001',
      observationPeriod: '2021',
      geographyId: 'CSD_burlington',
      geographyName: 'Burlington',
      geographyResolution: 'CSD',
      units: 'pedestrians/hr',
      originalValue: 1200,
      transformation: 'Direct measurement',
      evidenceClassification: 'OBSERVED',
      limitations: 'Municipal aggregate',
      claimRequiresAddressLevel: true // Demands address level
    });

    // Enforce Staff Engineer standard: geographicFitValid MUST be false
    expect(invalidProvenance.geographicFitValid).toBe(false);
  });

  // 8. Replay Reproducibility & Persistence
  it('B8: verifies saved analysis can be replayed identically from PostgreSQL', async () => {
    const original = await runDecisionEngine({
      inquiry: 'Open a pizza takeout store in Ontario',
      workspaceId: 'ws_test_reproducibility',
      userId: 'analyst_qa'
    });

    const replayed = await replayDecisionRun(original.runId, 'ws_test_reproducibility');
    expect(replayed.runId).toBe(original.runId);
    expect(replayed.decisionModel.categoryId).toBe(original.decisionModel.categoryId);
    expect(replayed.decisionBrief.recommendation.outcome).toBe(original.decisionBrief.recommendation.outcome);
    expect(replayed.financialEconomics.breakEvenDailyOrders).toBe(original.financialEconomics.breakEvenDailyOrders);
  });

  // 9. Workspace Isolation & Unauthorized Access Prevention
  it('B9: denies unauthorized access when querying runs from another workspace', async () => {
    const original = await runDecisionEngine({
      inquiry: 'Open an artisan pizza restaurant in Ontario',
      workspaceId: 'ws_tenant_alpha',
      userId: 'user_alpha'
    });

    // Attempt to access tenant alpha's run from tenant beta's workspace
    await expect(
      replayDecisionRun(original.runId, 'ws_tenant_beta')
    ).rejects.toThrow(/access denied|not found/i);
  });
});
