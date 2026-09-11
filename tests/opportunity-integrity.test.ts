import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ sql: vi.fn() }));

vi.mock('../src/db/index.js', () => ({ sql: db.sql }));

import { runWorkflowA, runWorkflowB } from '../src/analytics/opportunity-engine.js';

describe('opportunity engine evidence integrity', () => {
  beforeEach(() => {
    db.sql.mockReset();
  });

  it('preserves unavailable Workflow A inputs and estimates as null', async () => {
    db.sql.mockResolvedValueOnce([{
      geo_id: 'CSD_integrity_test',
      city_name: 'Integrity Test',
      population: 100_000,
      growth_pct: null,
      median_income: null,
      retail_rent: null,
      part_rate: null,
      competitor_count: '0'
    }]);

    const [result] = await runWorkflowA('unknown_category');

    expect(result.growthPct).toBeNull();
    expect(result.medianHouseholdIncome).toBeNull();
    expect(result.retailAskingRentSqft).toBeNull();
    expect(result.estimatedRevenue).toBeNull();
    expect(result.scoreComponents.purchasingPowerScore).toBeNull();
    expect(result.scoreComponents.growthScore).toBeNull();
    expect(result.scoreComponents.operatingCostScore).toBeNull();
    expect(result.scoreComponents.laborScore).toBeNull();
    expect(result.coverageReport).toEqual({
      demographicsCoverage: 50,
      incomeCoverage: 0,
      competitorLocationsCoverage: 100,
      commercialRentCoverage: 0
    });
    expect(result.availability).toEqual({ availableInputs: 2, totalInputs: 6, completenessPct: 33 });
    expect(result.confidence).toBe('LOW');
    expect(result.evidenceMetadata.estimatedRevenue).toEqual({ classification: 'UNAVAILABLE', available: false });
  });

  it('does not synthesize Workflow B counts, revenue, confidence, or success probability', async () => {
    db.sql
      .mockResolvedValueOnce([{
        id: 'CSD_integrity_test',
        name: 'Integrity Test',
        population: 100_000,
        growth_pct: null,
        median_income: null
      }])
      .mockResolvedValueOnce([{
        id: 'unknown_category',
        display_name: 'Unknown Category',
        naics_code: '000000',
        typical_capex_min: null,
        typical_capex_max: null,
        low_rev: null,
        median_rev: null,
        high_rev: null,
        sde_pct: null,
        existing_count: '0'
      }]);

    const [result] = await runWorkflowB('CSD_integrity_test');

    expect(result.existingCount).toBeNull();
    expect(result.countPer10kPop).toBeNull();
    expect(result.peerBenchmarkPer10kPop).toBeNull();
    expect(result.gapIndex).toBeNull();
    expect(result.opportunityScore).toBeNull();
    expect(result.successProbability).toBeNull();
    expect(result.typicalInvestmentCAD).toEqual({ min: null, max: null });
    expect(result.estimatedAnnualRevenueCAD).toEqual({ low: null, median: null, high: null, sdeMedian: null });
    expect(result.availability).toEqual({ availableInputs: 1, totalInputs: 10, completenessPct: 10 });
    expect(result.confidence).toBe('LOW');
    expect(result.evidenceMetadata.existingCount).toEqual({ classification: 'UNAVAILABLE', available: false });
    expect(result.evidenceMetadata.successProbability).toEqual({ classification: 'UNAVAILABLE', available: false });
  });
});
