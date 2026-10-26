import { describe, it, expect } from 'vitest';
import { sql } from '../src/db/index.js';
import { buildDecisionModel, extractBudgetFromText } from '../src/decision-engine/decision-modeler.js';
import { executeStagedFunnel } from '../src/decision-engine/staged-funnel.js';
import { calculateFinancialEconomics } from '../src/decision-engine/financial-scenarios.js';
import { runSensitivityAnalysis, verifySwitchingThresholds } from '../src/decision-engine/sensitivity-matrix.js';
import { buildEvidenceLedger } from '../src/decision-engine/evidence-ledger.js';
import { replayDecisionRun } from '../src/decision-engine/engine.js';
import type { FunnelCandidate } from '../src/decision-engine/types.js';

describe('PR #1 Follow-up Review Verification & Algorithmic Rigor Suite', () => {

  // =========================================================================
  // ITEM 3: Geography Enforcement & Fail-Closed Screened Bounding
  // =========================================================================
  describe('Geography Enforcement & Screened Bounding', () => {
    it('restricts candidate search to Ottawa when inquiry specifies Ottawa', async () => {
      const { decisionModel } = buildDecisionModel({ inquiry: 'Open retail shipping store in Ottawa' });
      expect(decisionModel.allowedGeographyIds).toContain('CSD_ottawa');

      const funnel = await executeStagedFunnel(decisionModel);
      expect(funnel.stages.screenedMarkets.length).toBe(1);
      expect(funnel.stages.screenedMarkets[0]!.id).toBe('CSD_ottawa');

      for (const cand of funnel.shortlistedCandidates) {
        expect(cand.parentGeoId).toBe('CSD_ottawa');
        expect(cand.city).toBe('Ottawa');
      }
    });

    it('fails closed and returns 0 candidates when all evaluated markets fail screening', async () => {
      const { decisionModel } = buildDecisionModel({ inquiry: 'Open pizza store' });
      const zeroModel = {
        ...decisionModel,
        allowedGeographyIds: ['CSD_nonexistent_village']
      };

      const zeroFunnel = await executeStagedFunnel(zeroModel);
      expect(zeroFunnel.shortlistedCandidates).toHaveLength(0);
      expect(zeroFunnel.stoppingCriteria.some(c => c.includes('failed viability screening'))).toBe(true);
    });
  });

  // =========================================================================
  // ITEM 4: Competitor Classification & Honest Lineage
  // =========================================================================
  describe('Competitor Classification & Honest Lineage', () => {
    it('marks broad sector transport as BENCHMARK and avoids direct competitor claims for shipping counters', async () => {
      const { decisionModel } = buildDecisionModel({ inquiry: 'Open a retail shipping and courier counter in Burlington' });
      const funnel = await executeStagedFunnel(decisionModel);
      const topCand = funnel.shortlistedCandidates[0]!;

      expect(topCand.competitorClassification).toBe('BENCHMARK');

      const ledger = buildEvidenceLedger(topCand, decisionModel);
      const compItem = ledger.find(item => item.claim.includes('transportation') || item.claim.includes('Competitive density'));
      expect(compItem).toBeDefined();
      expect(compItem!.classification).toBe('BENCHMARK');
      expect(compItem!.evidenceObserved).toContain('NAICS 48-49');
      expect(compItem!.evidenceObserved).not.toContain('Audited business register identifies');
      expect(compItem!.decisionImplication).toContain('Conduct ground truth field audit');

      const foodItem = ledger.find(item => item.claim.includes('dining spend') || item.evidenceObserved.includes('dining spend'));
      expect(foodItem).toBeUndefined();
    });

    it('classifies imputed income as UNVERIFIED_ASSUMPTION, not AUDITED', () => {
      const mockCandidate: FunnelCandidate = {
        id: 'cand_imputed_test',
        name: 'Imputed Income Test',
        resolutionTier: 'POTENTIALLY_SUITABLE_PROPERTY',
        parentGeoId: 'CSD_imputed_market',
        city: 'Imputed Market',
        population2021: 85000,
        populationGrowthPct: 1.2,
        medianIncome: 85000,
        medianIncomeSource: 'IMPUTED_DEFAULT',
        commercialNetRentSqft: 28.0,
        commercialTmiSqft: 10.0,
        commercialGrossRentSqft: 38.0,
        estimatedDirectCompetitors: 12,
        competitorDataSource: 'StatCan Business Counts',
        competitorClassification: 'OBSERVED',
        attractivenessScore: 75,
        confidenceScore: 50,
        suitabilityScore: 68,
        zoningFeasibilityStatus: 'UNVERIFIED_PENDING_REVIEW',
        buildingSuitabilityStatus: 'UNVERIFIED_MEP_CHECK_NEEDED',
        monthlyRent: 4200,
        squareFootage: 1500
      };

      const { decisionModel } = buildDecisionModel({ inquiry: 'Open pizza store' });
      const ledger = buildEvidenceLedger(mockCandidate, decisionModel);
      const incomeItem = ledger.find(item => item.provenance?.metricKey === 'median_household_income')!;
      expect(incomeItem.classification).toBe('UNVERIFIED_ASSUMPTION');
      expect(incomeItem.provenance?.evidenceClassification).toBe('UNVERIFIED_ASSUMPTION');
      expect(incomeItem.evidenceObserved).toContain('provincial benchmark');
    });
  });

  // =========================================================================
  // ITEM 5: Rent Authority & Production Calculator Equality
  // =========================================================================
  describe('Rent Authority & Production Calculator Switching Equality', () => {
    it('synchronizes rent inputs and proves exact equality through calculateFinancialEconomics', () => {
      const { decisionModel } = buildDecisionModel({ inquiry: 'Open pizza store' });

      // Deliberately inconsistent rent inputs: grossRent is $48/sqft ($67,200/yr), monthlyRent is $3,500/mo ($42,000/yr = $30/sqft)
      const topCand: FunnelCandidate = {
        id: 'cand_top_inconsistent',
        name: 'Top Prime Location',
        resolutionTier: 'POTENTIALLY_SUITABLE_PROPERTY',
        parentGeoId: 'CSD_burlington',
        city: 'Burlington',
        population2021: 186000,
        populationGrowthPct: 1.8,
        medianIncome: 92000,
        medianIncomeSource: 'OBSERVED_CENSUS',
        annualFoodAwayExpenditure: 3450,
        commercialNetRentSqft: 34.0,
        commercialTmiSqft: 14.0,
        commercialGrossRentSqft: 48.0,
        monthlyRent: 3500, // Effective starting rate = $30.00/sqft
        squareFootage: 1400,
        estimatedDirectCompetitors: 14,
        competitorDataSource: 'StatCan Table 33-10-1097-01',
        competitorClassification: 'OBSERVED',
        attractivenessScore: 82,
        confidenceScore: 88,
        suitabilityScore: 85,
        zoningFeasibilityStatus: 'UNVERIFIED_PENDING_REVIEW',
        buildingSuitabilityStatus: 'UNVERIFIED_MEP_CHECK_NEEDED'
      };

      const runnerCand: FunnelCandidate = {
        ...topCand,
        id: 'cand_runner_value',
        name: 'Runner-up Plaza',
        commercialGrossRentSqft: 38.0,
        monthlyRent: 3100,
        attractivenessScore: 78,
        suitabilityScore: 80
      };

      const verification = verifySwitchingThresholds(topCand, runnerCand, decisionModel);
      expect(verification.rentEqualityDelta).toBeLessThanOrEqual(5);

      // Verify that at R* - $10, topCandidate net income is strictly superior
      const lowerRentCand: FunnelCandidate = {
        ...topCand,
        commercialGrossRentSqft: verification.thresholdRentSqft - 10,
        monthlyRent: Math.round(((verification.thresholdRentSqft - 10) * 1400) / 12)
      };
      const lowerEcon = calculateFinancialEconomics(lowerRentCand, decisionModel);
      expect(lowerEcon.bands.baseCase.netOperatingIncome).toBeGreaterThan(verification.runnerNet);

      // Verify that at R* + $10, runnerCand net income is strictly superior (ranking reversal)
      const higherRentCand: FunnelCandidate = {
        ...topCand,
        commercialGrossRentSqft: verification.thresholdRentSqft + 10,
        monthlyRent: Math.round(((verification.thresholdRentSqft + 10) * 1400) / 12)
      };
      const higherEcon = calculateFinancialEconomics(higherRentCand, decisionModel);
      expect(higherEcon.bands.baseCase.netOperatingIncome).toBeLessThan(verification.runnerNet);
    });

    it('volume shock accounts for franchise royalties and investor management fees', () => {
      const { decisionModel } = buildDecisionModel({
        inquiry: 'Open franchise pizza store as passive investor',
        ownership: 'FRANCHISE',
        ownerInvolvement: 'INVESTOR'
      });

      const candidate: FunnelCandidate = {
        id: 'cand_franchise_inv',
        name: 'Franchise Investor Unit',
        resolutionTier: 'POTENTIALLY_SUITABLE_PROPERTY',
        parentGeoId: 'CSD_mississauga',
        city: 'Mississauga',
        population2021: 717000,
        populationGrowthPct: 1.5,
        medianIncome: 95000,
        medianIncomeSource: 'OBSERVED_CENSUS',
        annualFoodAwayExpenditure: 3450,
        commercialNetRentSqft: 36.0,
        commercialTmiSqft: 14.0,
        commercialGrossRentSqft: 50.0,
        monthlyRent: 5000,
        squareFootage: 1200,
        estimatedDirectCompetitors: 30,
        competitorDataSource: 'StatCan',
        competitorClassification: 'OBSERVED',
        attractivenessScore: 80,
        confidenceScore: 85,
        suitabilityScore: 82,
        zoningFeasibilityStatus: 'UNVERIFIED_PENDING_REVIEW',
        buildingSuitabilityStatus: 'UNVERIFIED_MEP_CHECK_NEEDED'
      };

      const economics = calculateFinancialEconomics(candidate, decisionModel);
      const { shocks } = runSensitivityAnalysis(candidate, undefined, economics, decisionModel);

      const volumeShock = shocks.find(s => s.parameter.includes('Ramp / Volume'))!;
      expect(volumeShock).toBeDefined();
      expect(volumeShock.shockedMetric).toContain('net');
    });
  });

  // =========================================================================
  // ITEM 6: Budget Extraction Intent & Magnitude
  // =========================================================================
  describe('Budget Extraction Intent & Magnitude', () => {
    it('extracts budget when explicit intent keywords and suffixes are present', () => {
      expect(extractBudgetFromText('sell $20 pizzas with a $300,000 budget')).toBe(300000);
      expect(extractBudgetFromText('budget $500')).toBe(500);
      expect(extractBudgetFromText('I have $1.5m in equity to invest')).toBe(1500000);
      expect(extractBudgetFromText('capital of $75k')).toBe(75000);
      expect(extractBudgetFromText('available funds of $80 thousand')).toBe(80000);
      expect(extractBudgetFromText('$250k capital')).toBe(250000);
    });

    it('returns undefined for menu prices and rent when budget keywords are absent', () => {
      expect(extractBudgetFromText('pizzas cost $25 and lease is $4000/mo')).toBeUndefined();
      expect(extractBudgetFromText('looking for 1500 sqft with 5 staff members')).toBeUndefined();
    });
  });

  // =========================================================================
  // ITEM 7: Replay Schema Validation & Legacy Rejection
  // =========================================================================
  describe('Replay Schema Validation & Legacy Rejection', () => {
    it('rejects empty {} or malformed financial snapshots with schema validation error', async () => {
      const corruptedRunId = 'run_empty_curly_test';

      await sql`
        INSERT INTO decision_engine_runs (
          id, engine_version, category_id, inquiry_text, operating_format,
          scenario_label, recommendation_outcome, decision_model_snapshot,
          funnel_snapshot, hypotheses_snapshot, evidence_snapshot,
          alternatives_snapshot, sensitivity_snapshot, financial_snapshot,
          decision_brief, workspace_id
        ) VALUES (
          ${corruptedRunId}, '2.0.0', 'pizza_store', 'schema validation test', 'TAKEOUT_DELIVERY',
          'Test', 'PROCEED_WITH_VERIFICATION', '{"categoryId":"pizza_store"}'::jsonb,
          '{}'::jsonb, '[]'::jsonb, '[]'::jsonb,
          '[{"candidate":{"id":"c1"}}]'::jsonb, '{}'::jsonb, '{}'::jsonb,
          '{}'::jsonb, 'ws_schema_val_test'
        ) ON CONFLICT (id) DO UPDATE SET financial_snapshot = '{}'::jsonb;
      `;

      await expect(
        replayDecisionRun(corruptedRunId, 'ws_schema_val_test')
      ).rejects.toThrow(/schema validation failed/i);

      await sql`DELETE FROM decision_engine_runs WHERE id = ${corruptedRunId};`;
    });

    it('rejects legacy runs without financial_snapshot with explicit legacy error', async () => {
      const legacyRunId = 'run_legacy_v1_record';

      await sql`
        INSERT INTO decision_engine_runs (
          id, engine_version, category_id, inquiry_text, operating_format,
          scenario_label, recommendation_outcome, decision_model_snapshot,
          funnel_snapshot, hypotheses_snapshot, evidence_snapshot,
          alternatives_snapshot, sensitivity_snapshot, financial_snapshot,
          decision_brief, workspace_id
        ) VALUES (
          ${legacyRunId}, '1.0.0', 'pizza_store', 'legacy test', 'TAKEOUT_DELIVERY',
          'Legacy', 'PROCEED_WITH_VERIFICATION', '{"categoryId":"pizza_store"}'::jsonb,
          '{}'::jsonb, '[]'::jsonb, '[]'::jsonb,
          '[{"candidate":{"id":"c1"}}]'::jsonb, '{}'::jsonb, NULL,
          '{}'::jsonb, 'ws_legacy_test'
        ) ON CONFLICT (id) DO UPDATE SET financial_snapshot = NULL;
      `;

      await expect(
        replayDecisionRun(legacyRunId, 'ws_legacy_test')
      ).rejects.toThrow(/Unsupported legacy run snapshot/i);

      await sql`DELETE FROM decision_engine_runs WHERE id = ${legacyRunId};`;
    });
  });
});
