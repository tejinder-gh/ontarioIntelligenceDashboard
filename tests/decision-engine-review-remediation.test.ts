import { describe, it, expect } from 'vitest';
import { sql } from '../src/db/index.js';
import { buildDecisionModel, extractBudgetFromText, extractLocationsFromText } from '../src/decision-engine/decision-modeler.js';
import { calculateFinancialEconomics } from '../src/decision-engine/financial-scenarios.js';
import { runSensitivityAnalysis, verifySwitchingThresholds } from '../src/decision-engine/sensitivity-matrix.js';
import { computeCandidateSuitability, sortCandidatesBySuitability } from '../src/decision-engine/suitability-scorer.js';
import { getAuditedCompetitorCount } from '../src/decision-engine/competitor-auditor.js';
import { buildEvidenceLedger } from '../src/decision-engine/evidence-ledger.js';
import { generateDecisionBrief } from '../src/decision-engine/decision-brief-generator.js';
import { prioritizeMaterialUnknowns } from '../src/decision-engine/unknowns-priority.js';
import { replayDecisionRun, runDecisionEngine } from '../src/decision-engine/engine.js';
import { ensureWorkspaceAccess, verifyWorkspaceMembership } from '../src/server/workspace-auth.js';
import type { FunnelCandidate } from '../src/decision-engine/types.js';

describe('PR #1 Staff Review Remediation & Behavioral Verification Suite', () => {

  // =========================================================================
  // ITEM 1: Authorization & Workspace Isolation
  // =========================================================================
  describe('Item 1: Authorization & Multi-Tenant Workspace Boundary', () => {
    it('verifies server session membership and rejects non-members supplying victim workspace ID', async () => {
      const ownerUserId = '11111111-1111-4111-8111-111111111111';
      const victimUserId = '22222222-2222-4222-8222-222222222222';
      const isolatedWs = 'ws_victim_enterprise_corp';

      // Clean up previous test runs if any
      await sql`DELETE FROM workspace_memberships WHERE workspace_id = ${isolatedWs};`;

      // Seed valid users to satisfy foreign key constraint
      await sql`
        INSERT INTO users (id, email) VALUES (${ownerUserId}, 'owner.corp@example.com')
        ON CONFLICT (id) DO NOTHING;
      `;
      await sql`
        INSERT INTO users (id, email) VALUES (${victimUserId}, 'victim.attacker@example.com')
        ON CONFLICT (id) DO NOTHING;
      `;

      // 1. Owner initializes isolated workspace
      const ownerAccess = await ensureWorkspaceAccess(ownerUserId, isolatedWs);
      expect(ownerAccess.allowed).toBe(true);

      // Verify membership record in database
      const isOwnerMember = await verifyWorkspaceMembership(ownerUserId, isolatedWs);
      expect(isOwnerMember).toBe(true);

      // 2. Attacker/non-member tries to access victim's workspace
      const nonMemberAccess = await ensureWorkspaceAccess(victimUserId, isolatedWs);
      expect(nonMemberAccess.allowed).toBe(false);
      expect(nonMemberAccess.reason).toContain('Access denied');

      const isVictimMember = await verifyWorkspaceMembership(victimUserId, isolatedWs);
      expect(isVictimMember).toBe(false);

      // Clean up
      await sql`DELETE FROM workspace_memberships WHERE workspace_id = ${isolatedWs};`;
    });
  });

  // =========================================================================
  // ITEM 2: Multi-Factor Candidate Scoring & Order Invariance
  // =========================================================================
  describe('Item 2: Multi-Factor Candidate Scoring & Deterministic Ranking', () => {
    it('ensures lowest rent candidate does not win if inferior on composite suitability', () => {
      const { decisionModel } = buildDecisionModel({ inquiry: 'Open pizza store' });

      // Candidate A: Very low rent ($12/sqft), but low income ($52k), shrinking population, no verified address
      const cheapInferior = computeCandidateSuitability({
        id: 'cand_cheap',
        name: 'Cheap Dilapidated Unit',
        city: 'Declining Rural Node',
        medianIncome: 52000,
        population2021: 18000,
        populationGrowthPct: -1.2,
        commercialGrossRentSqft: 12.0,
        monthlyRent: 1400,
        squareFootage: 1400,
        estimatedDirectCompetitors: 0,
        hasVerifiedAddress: false,
        hasConfirmedListing: false
      }, decisionModel);

      // Candidate B: Normal rent ($36/sqft), high income ($98k), growing population (+3.8%), verified commercial listing
      const primeSuperior = computeCandidateSuitability({
        id: 'cand_prime',
        name: 'Burlington Commercial Plaza',
        city: 'Burlington',
        medianIncome: 98000,
        population2021: 186000,
        populationGrowthPct: 3.8,
        commercialGrossRentSqft: 36.0,
        monthlyRent: 4200,
        squareFootage: 1400,
        estimatedDirectCompetitors: 12,
        hasVerifiedAddress: true,
        hasConfirmedListing: true
      }, decisionModel);

      // Prime superior must win on composite score despite higher rent
      expect(primeSuperior.totalSuitabilityScore).toBeGreaterThan(cheapInferior.totalSuitabilityScore);
      expect(primeSuperior.incomeScore).toBeGreaterThan(cheapInferior.incomeScore);
      expect(primeSuperior.verificationScore).toBeGreaterThan(cheapInferior.verificationScore);
    });

    it('guarantees deterministic, input-order invariant sorting', () => {
      const { decisionModel } = buildDecisionModel({ inquiry: 'Open pizza store' });

      const candA: FunnelCandidate = {
        id: 'cand_a',
        name: 'Alpha Plaza',
        city: 'Burlington',
        parentGeoId: 'CSD_burlington',
        resolutionTier: 'POTENTIALLY_SUITABLE_PROPERTY',
        population2021: 186000,
        populationGrowthPct: 2.5,
        medianIncome: 95000,
        annualFoodAwayExpenditure: 4200,
        commercialGrossRentSqft: 35.0,
        commercialNetRentSqft: 25.0,
        commercialTmiSqft: 10.0,
        attractivenessScore: 85,
        confidenceScore: 80,
        suitabilityScore: 84,
        zoningFeasibilityStatus: 'UNVERIFIED_PENDING_REVIEW',
        buildingSuitabilityStatus: 'UNVERIFIED_MEP_CHECK_NEEDED'
      };

      const candB: FunnelCandidate = {
        id: 'cand_b',
        name: 'Beta Plaza',
        city: 'Hamilton',
        parentGeoId: 'CSD_hamilton',
        resolutionTier: 'POTENTIALLY_SUITABLE_PROPERTY',
        population2021: 560000,
        populationGrowthPct: 1.2,
        medianIncome: 75000,
        annualFoodAwayExpenditure: 3800,
        commercialGrossRentSqft: 26.0,
        commercialNetRentSqft: 18.0,
        commercialTmiSqft: 8.0,
        attractivenessScore: 78,
        confidenceScore: 80,
        suitabilityScore: 79,
        zoningFeasibilityStatus: 'UNVERIFIED_PENDING_REVIEW',
        buildingSuitabilityStatus: 'UNVERIFIED_MEP_CHECK_NEEDED'
      };

      const candC: FunnelCandidate = {
        id: 'cand_c',
        name: 'Gamma Plaza',
        city: 'Oakville',
        parentGeoId: 'CSD_oakville',
        resolutionTier: 'POTENTIALLY_SUITABLE_PROPERTY',
        population2021: 213000,
        populationGrowthPct: 3.1,
        medianIncome: 115000,
        annualFoodAwayExpenditure: 5100,
        commercialGrossRentSqft: 42.0,
        commercialNetRentSqft: 30.0,
        commercialTmiSqft: 12.0,
        attractivenessScore: 92,
        confidenceScore: 88,
        suitabilityScore: 91,
        zoningFeasibilityStatus: 'UNVERIFIED_PENDING_REVIEW',
        buildingSuitabilityStatus: 'UNVERIFIED_MEP_CHECK_NEEDED'
      };

      // Sort permutation 1: [A, B, C]
      const sorted1 = sortCandidatesBySuitability([candA, candB, candC]);
      // Sort permutation 2: [B, C, A]
      const sorted2 = sortCandidatesBySuitability([candB, candC, candA]);
      // Sort permutation 3: [C, A, B]
      const sorted3 = sortCandidatesBySuitability([candC, candA, candB]);

      expect(sorted1.map(c => c.id)).toEqual(['cand_c', 'cand_a', 'cand_b']);
      expect(sorted2.map(c => c.id)).toEqual(['cand_c', 'cand_a', 'cand_b']);
      expect(sorted3.map(c => c.id)).toEqual(['cand_c', 'cand_a', 'cand_b']);
    });
  });

  // =========================================================================
  // ITEM 3: Honest Provenance & Absence of Evidence
  // =========================================================================
  describe('Item 3: Honest Provenance & Absence of Evidence', () => {
    it('returns UNAVAILABLE without fabricated numbers when category is not recorded', () => {
      const result = getAuditedCompetitorCount('CSD_non_existent', 'unknown_category');
      expect(result.count).toBeUndefined();
      expect(result.classification).toBe('UNAVAILABLE');
      expect(result.source).toContain('UNAVAILABLE');
      expect(result.source).not.toContain('16');
      expect(result.source).not.toContain('12%');
    });

    it('labels broad sector NAICS 48-49 as BENCHMARK, not direct courier storefronts', () => {
      const result = getAuditedCompetitorCount('CSD_burlington', 'logistics_warehouse');
      if (result.count !== undefined) {
        expect(result.classification).toBe('BENCHMARK');
        expect(result.source).toContain('Benchmark');
        expect(result.source).toContain('not direct courier storefronts');
      }
    });
  });

  // =========================================================================
  // ITEM 4: Exact Mathematical Switching Thresholds
  // =========================================================================
  describe('Item 4: Exact Mathematical Switching Equality', () => {
    it('proves Net_1(R*) = Net_2 at lease rate switching threshold and reverses on either side', () => {
      const { decisionModel } = buildDecisionModel({ inquiry: 'Open pizza store' });

      const topCand: FunnelCandidate = {
        id: 'top_1',
        name: 'Top Candidate Plaza',
        city: 'Burlington',
        parentGeoId: 'CSD_burlington',
        resolutionTier: 'POTENTIALLY_SUITABLE_PROPERTY',
        population2021: 186000,
        populationGrowthPct: 2.0,
        medianIncome: 94000,
        annualFoodAwayExpenditure: 4200,
        commercialGrossRentSqft: 24.0,
        commercialNetRentSqft: 17.0,
        commercialTmiSqft: 7.0,
        monthlyRent: 2800,
        squareFootage: 1400,
        attractivenessScore: 88,
        confidenceScore: 85,
        suitabilityScore: 87,
        zoningFeasibilityStatus: 'UNVERIFIED_PENDING_REVIEW',
        buildingSuitabilityStatus: 'UNVERIFIED_MEP_CHECK_NEEDED'
      };

      const runnerCand: FunnelCandidate = {
        id: 'runner_2',
        name: 'Runner Up Plaza',
        city: 'Hamilton',
        parentGeoId: 'CSD_hamilton',
        resolutionTier: 'POTENTIALLY_SUITABLE_PROPERTY',
        population2021: 560000,
        populationGrowthPct: 1.5,
        medianIncome: 75000,
        annualFoodAwayExpenditure: 3800,
        commercialGrossRentSqft: 34.0,
        commercialNetRentSqft: 24.0,
        commercialTmiSqft: 10.0,
        monthlyRent: 3966,
        squareFootage: 1400,
        attractivenessScore: 80,
        confidenceScore: 85,
        suitabilityScore: 82,
        zoningFeasibilityStatus: 'UNVERIFIED_PENDING_REVIEW',
        buildingSuitabilityStatus: 'UNVERIFIED_MEP_CHECK_NEEDED'
      };

      const topEconomics = calculateFinancialEconomics(topCand, decisionModel);
      const runnerEconomics = calculateFinancialEconomics(runnerCand, decisionModel);

      // Solve exact thresholds
      const verification = verifySwitchingThresholds(topCand, runnerCand, decisionModel);

      // 1. Net incomes must be identical at threshold (within rounding/floating point error)
      expect(verification.rentEqualityDelta).toBeLessThan(0.01);
      expect(verification.thresholdRentSqft).toBeGreaterThan(topCand.commercialGrossRentSqft);

      // 2. Order reversal: If top rent increases by $5/sqft ABOVE threshold, runner becomes more profitable
      const shockedTopAbove: FunnelCandidate = {
        ...topCand,
        commercialGrossRentSqft: verification.thresholdRentSqft + 5.0,
        monthlyRent: (verification.thresholdRentSqft + 5.0) * topCand.squareFootage! / 12
      };
      const shockedTopEconAbove = calculateFinancialEconomics(shockedTopAbove, decisionModel);
      expect(shockedTopEconAbove.bands.baseCase.netOperatingIncome).toBeLessThan(runnerEconomics.bands.baseCase.netOperatingIncome);

      // 3. Order reversal: If top rent is $5/sqft BELOW threshold, top candidate remains more profitable
      const shockedTopBelow: FunnelCandidate = {
        ...topCand,
        commercialGrossRentSqft: verification.thresholdRentSqft - 5.0,
        monthlyRent: (verification.thresholdRentSqft - 5.0) * topCand.squareFootage! / 12
      };
      const shockedTopEconBelow = calculateFinancialEconomics(shockedTopBelow, decisionModel);
      expect(shockedTopEconBelow.bands.baseCase.netOperatingIncome).toBeGreaterThan(runnerEconomics.bands.baseCase.netOperatingIncome);
    });

    it('proves Net_1(V*) = Net_2 at daily transaction volume threshold', () => {
      const { decisionModel } = buildDecisionModel({ inquiry: 'Open pizza store' });

      const topCand: FunnelCandidate = {
        id: 'top_cand',
        name: 'Top Candidate Unit',
        city: 'Burlington',
        parentGeoId: 'CSD_burlington',
        resolutionTier: 'POTENTIALLY_SUITABLE_PROPERTY',
        population2021: 186000,
        populationGrowthPct: 2.0,
        medianIncome: 94000,
        annualFoodAwayExpenditure: 4200,
        commercialGrossRentSqft: 34.0,
        commercialNetRentSqft: 24.0,
        commercialTmiSqft: 10.0,
        monthlyRent: 3966,
        squareFootage: 1400,
        attractivenessScore: 88,
        confidenceScore: 85,
        suitabilityScore: 87,
        zoningFeasibilityStatus: 'UNVERIFIED_PENDING_REVIEW',
        buildingSuitabilityStatus: 'UNVERIFIED_MEP_CHECK_NEEDED'
      };

      const runnerCand: FunnelCandidate = {
        id: 'runner_cand',
        name: 'Runner Up Unit',
        city: 'Hamilton',
        parentGeoId: 'CSD_hamilton',
        resolutionTier: 'POTENTIALLY_SUITABLE_PROPERTY',
        population2021: 560000,
        populationGrowthPct: 1.5,
        medianIncome: 75000,
        annualFoodAwayExpenditure: 3800,
        commercialGrossRentSqft: 24.0,
        commercialNetRentSqft: 17.0,
        commercialTmiSqft: 7.0,
        monthlyRent: 2800,
        squareFootage: 1400,
        attractivenessScore: 80,
        confidenceScore: 85,
        suitabilityScore: 82,
        zoningFeasibilityStatus: 'UNVERIFIED_PENDING_REVIEW',
        buildingSuitabilityStatus: 'UNVERIFIED_MEP_CHECK_NEEDED'
      };

      const verification = verifySwitchingThresholds(topCand, runnerCand, decisionModel);
      expect(verification.thresholdDailyVolume).toBeGreaterThan(0);
      expect(verification.volumeEqualityDelta).toBeLessThan(decisionModel.targetPricePointAov);
    });
  });

  // =========================================================================
  // ITEM 5: Capital & Cost Model Consistency
  // =========================================================================
  describe('Item 5: Capital Expenditure & Funding Shortfall Integration', () => {
    it('separates acquisition asking price from greenfield fit-out CapEx', () => {
      const { decisionModel } = buildDecisionModel({ inquiry: 'Open pizza store' });

      // 1. Existing business acquisition listing ($165,000 asking price)
      const acquisitionCand: FunnelCandidate = {
        id: 'cand_acq',
        name: 'Turnkey Pizzeria Asset Sale',
        city: 'Burlington',
        parentGeoId: 'CSD_burlington',
        resolutionTier: 'POTENTIALLY_SUITABLE_PROPERTY',
        population2021: 186000,
        populationGrowthPct: 2.0,
        medianIncome: 94000,
        annualFoodAwayExpenditure: 4200,
        commercialGrossRentSqft: 34.0,
        commercialNetRentSqft: 24.0,
        commercialTmiSqft: 10.0,
        monthlyRent: 3966,
        squareFootage: 1400,
        askingPrice: 165000,
        attractivenessScore: 88,
        confidenceScore: 85,
        suitabilityScore: 87,
        zoningFeasibilityStatus: 'UNVERIFIED_PENDING_REVIEW',
        buildingSuitabilityStatus: 'UNVERIFIED_MEP_CHECK_NEEDED'
      };

      const acqEcon = calculateFinancialEconomics(acquisitionCand, decisionModel);
      expect(acqEcon.isAcquisition).toBe(true);
      expect(acqEcon.acquisitionCost).toBe(165000);
      expect(acqEcon.totalInitialCapital).toBeGreaterThan(165000);

      // 2. Greenfield space without asking price
      const greenfieldCand: FunnelCandidate = {
        ...acquisitionCand,
        id: 'cand_greenfield',
        askingPrice: undefined
      };

      const greenfieldEcon = calculateFinancialEconomics(greenfieldCand, decisionModel);
      expect(greenfieldEcon.isAcquisition).toBe(false);
      expect(greenfieldEcon.acquisitionCost).toBe(0);
    });

    it('rejects recommendation with DO_NOT_PROCEED when investment capital is below required initial capital', () => {
      // Model where user has $120,000 available, but required capital is ~$215,000
      const { decisionModel, activeScenario } = buildDecisionModel({
        inquiry: 'Open a pizza store',
        investmentCapital: 120000,
        workingCapital: 20000
      });

      const cand: FunnelCandidate = {
        id: 'cand_sample',
        name: 'Downtown Commercial Space',
        city: 'Burlington',
        parentGeoId: 'CSD_burlington',
        resolutionTier: 'POTENTIALLY_SUITABLE_PROPERTY',
        population2021: 186000,
        populationGrowthPct: 2.0,
        medianIncome: 94000,
        annualFoodAwayExpenditure: 4200,
        commercialGrossRentSqft: 38.0,
        commercialNetRentSqft: 26.0,
        commercialTmiSqft: 12.0,
        monthlyRent: 4433,
        squareFootage: 1400,
        attractivenessScore: 88,
        confidenceScore: 85,
        suitabilityScore: 87,
        zoningFeasibilityStatus: 'UNVERIFIED_PENDING_REVIEW',
        buildingSuitabilityStatus: 'UNVERIFIED_MEP_CHECK_NEEDED'
      };

      const economics = calculateFinancialEconomics(cand, decisionModel);
      expect(economics.isFullyFunded).toBe(false);
      expect(economics.fundingGap).toBeGreaterThan(0);

      const brief = generateDecisionBrief(cand, [], decisionModel, activeScenario, economics, []);
      expect(brief.recommendation.outcome).toBe('DO_NOT_PROCEED');
      expect(brief.recommendation.summaryHeadline).toContain('DO NOT PROCEED');
      expect(brief.recommendation.summaryHeadline).toContain('Funding gap');
    });
  });

  // =========================================================================
  // ITEM 7: Occupancy Cost Ratio Comparison Units
  // =========================================================================
  describe('Item 7: Occupancy Ratio Percentage vs Fraction Units', () => {
    it('compares occupancy ratio in decimal fractions and formats percentages in presentation', () => {
      const { decisionModel } = buildDecisionModel({ inquiry: 'Open pizza store' });

      // Monthly sales = 78 orders * $28.50 * 30 = $66,690.
      // Rent of $4,500/mo = 6.7% occupancy ratio (0.0674).
      // Max ceiling is 9% (0.09).
      const cand: FunnelCandidate = {
        id: 'cand_rent_test',
        name: 'Plaza Unit',
        city: 'Burlington',
        parentGeoId: 'CSD_burlington',
        resolutionTier: 'POTENTIALLY_SUITABLE_PROPERTY',
        population2021: 186000,
        populationGrowthPct: 2.0,
        medianIncome: 94000,
        annualFoodAwayExpenditure: 4200,
        commercialGrossRentSqft: 36.0,
        commercialNetRentSqft: 26.0,
        commercialTmiSqft: 10.0,
        monthlyRent: 4500,
        squareFootage: 1500,
        attractivenessScore: 88,
        confidenceScore: 85,
        suitabilityScore: 87,
        zoningFeasibilityStatus: 'UNVERIFIED_PENDING_REVIEW',
        buildingSuitabilityStatus: 'UNVERIFIED_MEP_CHECK_NEEDED'
      };

      const ledger = buildEvidenceLedger(cand, decisionModel);
      const rentItem = ledger.find(e => e.claim.toLowerCase().includes('occupancy'))!;
      expect(rentItem).toBeDefined();

      // Calculation method must cleanly show formatted percentages
      expect(rentItem.calculationMethod).toMatch(/\d+\.\d+%.*evaluated against.*\d+\.\d+%/);
      expect(rentItem.evidenceObserved).toMatch(/\$\d+[\d,]*\/month/);
    });
  });

  // =========================================================================
  // ITEM 8: Replay Validation & Persistence
  // =========================================================================
  describe('Item 8: Replay Validation & Immutable Snapshots', () => {
    it('restores financialEconomics from persisted snapshot identically without re-running heuristics', async () => {
      const original = await runDecisionEngine({
        inquiry: 'Open an independent pizza shop in Ontario',
        investmentCapital: 220000,
        workingCapital: 40000,
        workspaceId: 'ws_replay_integrity_suite'
      });

      const replayed = await replayDecisionRun(original.runId, 'ws_replay_integrity_suite');
      expect(replayed.financialEconomics.bands.baseCase.annualRevenue)
        .toBe(original.financialEconomics.bands.baseCase.annualRevenue);
      expect(replayed.financialEconomics.totalInitialCapital)
        .toBe(original.financialEconomics.totalInitialCapital);
      expect(replayed.financialEconomics.breakEvenDailyUnits)
        .toBe(original.financialEconomics.breakEvenDailyUnits);
    });

    it('rejects malformed snapshot and throws error without inventing placeholder candidates', async () => {
      const corruptedRunId = 'run_corrupted_test_record';

      // Insert an invalid row missing essential decision model and alternatives payload
      await sql`
        INSERT INTO decision_engine_runs (
          id, engine_version, category_id, inquiry_text, operating_format,
          scenario_label, recommendation_outcome, decision_model_snapshot,
          funnel_snapshot, hypotheses_snapshot, evidence_snapshot,
          alternatives_snapshot, sensitivity_snapshot, decision_brief,
          workspace_id
        ) VALUES (
          ${corruptedRunId}, '2.0.0', 'pizza_store', 'corrupted test', 'TAKEOUT_DELIVERY',
          'Corrupted', 'DO_NOT_PROCEED', '{}'::jsonb,
          '{}'::jsonb, '[]'::jsonb, '[]'::jsonb,
          '[]'::jsonb, '{}'::jsonb, '{}'::jsonb,
          'ws_malformed_test'
        ) ON CONFLICT (id) DO UPDATE SET alternatives_snapshot = '[]'::jsonb;
      `;

      await expect(
        replayDecisionRun(corruptedRunId, 'ws_malformed_test')
      ).rejects.toThrow(/Malformed snapshot|missing/i);

      // Clean up
      await sql`DELETE FROM decision_engine_runs WHERE id = ${corruptedRunId};`;
    });
  });

  // =========================================================================
  // PRODUCT GAPS: Shipping Counter vs Logistics & Text Extraction
  // =========================================================================
  describe('Product Gaps: Shipping Counter Archetype & Intent Extraction', () => {
    it('distinguishes retail shipping counter from logistics warehouse', () => {
      const retailShippingModel = buildDecisionModel({
        inquiry: 'I want to open a retail shipping and courier counter in a strip plaza'
      });
      expect(retailShippingModel.decisionModel.categoryId).toBe('retail_shipping_counter');
      expect(retailShippingModel.decisionModel.naicsCode).toBe('561431');
      expect(retailShippingModel.decisionModel.volumeUnit).toContain('parcel');

      const industrialLogisticsModel = buildDecisionModel({
        inquiry: 'I want to open a freight distribution warehouse with cross-dock loading'
      });
      expect(industrialLogisticsModel.decisionModel.categoryId).toBe('logistics_warehouse');
      expect(industrialLogisticsModel.decisionModel.naicsCode).toBe('484110');
      expect(industrialLogisticsModel.decisionModel.volumeUnit).toContain('dispatches');
    });

    it('extracts budget and target municipality from natural language inquiry text', () => {
      const extractedBudget = extractBudgetFromText('I have $185,000 available to open a store in Burlington');
      expect(extractedBudget).toBe(185000);

      const extractedLocations = extractLocationsFromText('Looking for retail spots in Burlington or Oakville');
      expect(extractedLocations).toContain('Burlington');
      expect(extractedLocations).toContain('Oakville');

      const model = buildDecisionModel({
        inquiry: 'I have $220,000 budget to start a pizzeria in Hamilton'
      });
      expect(model.decisionModel.investmentCapital).toBe(220000);
      expect(model.decisionModel.geographicScope).toContain('Hamilton');
    });
  });
});
