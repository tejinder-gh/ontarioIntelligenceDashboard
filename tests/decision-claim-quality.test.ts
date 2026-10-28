import { describe, expect, it } from 'vitest';
import { generateDecisionBrief } from '../src/decision-engine/decision-brief-generator.js';
import { describeCompetitorEvidence } from '../src/decision-engine/claim-language.js';
import { prioritizeMaterialUnknowns } from '../src/decision-engine/unknowns-priority.js';
import type { DecisionModel, FinancialEconomics, FunnelCandidate, OperatingScenario } from '../src/decision-engine/types.js';

const candidate = {
  name: 'Example market', city: 'Burlington', population2021: 100000,
  populationGrowthPct: 2, medianIncome: 85000, medianIncomeSource: 'IMPUTED_DEFAULT',
  commercialGrossRentSqft: 30, competitorClassification: 'UNAVAILABLE',
  competitorDataSource: 'UNAVAILABLE', zoningFeasibilityStatus: 'UNVERIFIED_PENDING_REVIEW',
  resolutionTier: 'PROSPECTIVE_MARKET',
} as FunnelCandidate;
const model = { categoryId: 'pizza_store', naicsCode: '722513', investmentCapital: 300000, format: 'TAKEOUT_DELIVERY', ownership: 'INDEPENDENT' } as DecisionModel;
const scenario = { label: 'Example scenario' } as OperatingScenario;
const economics = { isFullyFunded: true, breakEvenFeasible: true, breakEvenDailyUnits: 10, totalInitialCapital: 200000, operationalCapacity: { unitCapacity: 100 }, bands: { conservative: { netOperatingIncome: 1 }, baseCase: { netOperatingIncome: 2 }, optimistic: { netOperatingIncome: 3 } } } as FinancialEconomics;

describe('decision claim evidence', () => {
  it('discloses unavailable competitors and imputed income in the brief', () => {
    const text = generateDecisionBrief(candidate, [], model, scenario, economics, []).whyThisLocation.join(' ');
    expect(text).toContain('unavailable');
    expect(text).toContain('imputed');
    expect(text).not.toContain('undefined licensed');
    expect(text).not.toContain('preserves sustainable operating margins');
  });

  it('distinguishes broad sector counts from direct competitors', () => {
    const broad = { ...candidate, estimatedDirectCompetitors: 90, competitorClassification: 'BENCHMARK' } as FunnelCandidate;
    expect(describeCompetitorEvidence(broad)).toContain('broad sector');
    expect(describeCompetitorEvidence(broad)).toContain('not a count of direct competitors');
    expect(generateDecisionBrief(broad, [], model, scenario, economics, []).whyThisLocation.join(' ')).not.toContain('90 licensed');
  });

  it('does not treat an observed category count as verified active competitors', () => {
    const observed = { ...candidate, estimatedDirectCompetitors: 0, competitorClassification: 'OBSERVED' } as FunnelCandidate;
    expect(describeCompetitorEvidence(observed)).toContain('0 establishments');
    expect(describeCompetitorEvidence(observed)).toContain('not a verified count of active direct competitors');
  });

  it('does not claim that zoning evidence was retrieved when no lookup was performed', () => {
    for (const category of ['pizza_store', 'logistics_warehouse', 'child_daycare']) {
      expect(prioritizeMaterialUnknowns(candidate, category)[0]?.retrievalStatus).toBe('NOT_RETRIEVED');
    }
  });
});
