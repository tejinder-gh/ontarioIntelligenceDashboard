import { describe, it, expect } from 'bun:test';
import { sql } from '../src/db/index.js';
import { checkSourceCapability, AUTHORITATIVE_SOURCES } from '../src/ingestion/registry.js';

describe('T-009 — Centralized Source Registry & Capability Enforcement Suite', () => {
  it('AC1: registers all authoritative sources with friendly codes, publishers, and frequencies', async () => {
    const sources = await sql`
      SELECT id, friendly_code, name, organization_type, official_dataset_id, frequency, supported_geography 
      FROM sources 
      WHERE friendly_code IS NOT NULL;
    `;

    expect(sources.length).toBeGreaterThanOrEqual(26);

    const friendlyCodes = sources.map(s => s.friendly_code);
    expect(friendlyCodes).toContain('GEO-ONT-MUN');
    expect(friendlyCodes).toContain('GEO-SGC21');
    expect(friendlyCodes).toContain('DEM-CEN21');
    expect(friendlyCodes).toContain('POP-CSD-EST');
    expect(friendlyCodes).toContain('BUS-CNT-CSD');
    expect(friendlyCodes).toContain('FUEL-RETAIL');
    expect(friendlyCodes).toContain('RENT-CMHC');
    expect(friendlyCodes).toContain('MUNI-FIR');
    expect(friendlyCodes).toContain('SPEND-SHS');
    expect(friendlyCodes).toContain('WEALTH-SFS');
    expect(friendlyCodes).toContain('BIZ-OSM');
  });

  it('AC2 & AC5: enforces authorized attribute groups and prevents illegitimate usage', async () => {
    // 1. Census CAN provide demographics at CSD
    const validDemog = await checkSourceCapability('DEM-CEN21', 'demographics', 'CSD');
    expect(validDemog.authorized).toBe(true);

    // 2. Census CANNOT provide live competitors or ratings
    const invalidCompetitors = await checkSourceCapability('DEM-CEN21', 'live_competitors');
    expect(invalidCompetitors.authorized).toBe(false);
    expect(invalidCompetitors.reason).toContain('NOT authorized');

    const invalidRatings = await checkSourceCapability('DEM-CEN21', 'ratings');
    expect(invalidRatings.authorized).toBe(false);

    // 3. Survey of Household Spending CANNOT provide CSD-level municipal observations
    const invalidCsdSpend = await checkSourceCapability('SPEND-SHS', 'household_spending', 'CSD');
    expect(invalidCsdSpend.authorized).toBe(false);
    expect(invalidCsdSpend.reason).toContain('not supported');

    // 4. OpenStreetMap CANNOT provide verified financial revenues
    const invalidOsmRev = await checkSourceCapability('BIZ-OSM', 'revenues');
    expect(invalidOsmRev.authorized).toBe(false);

    // 5. CMHC CANNOT provide commercial real estate rent
    const invalidCmhcCre = await checkSourceCapability('RENT-CMHC', 'commercial_rent');
    expect(invalidCmhcCre.authorized).toBe(false);
  });

  it('AC3: metrics definitions strictly classify default_classification as OBSERVED, BENCHMARK, DERIVED, or MODELED', async () => {
    const metrics = await sql`
      SELECT id, name, default_classification 
      FROM metrics_definitions 
      WHERE default_classification IS NOT NULL;
    `;

    expect(metrics.length).toBeGreaterThan(15);
    const validClassifications = ['OBSERVED', 'BENCHMARK', 'DERIVED', 'MODELED'];

    for (const m of metrics) {
      expect(validClassifications).toContain(m.default_classification);
    }

    // Check specific classification assignments
    const popMetric = metrics.find(m => m.id === 'pop_total');
    expect(popMetric?.default_classification).toBe('OBSERVED');

    const growthMetric = metrics.find(m => m.id === 'pop_growth_5yr');
    expect(growthMetric?.default_classification).toBe('DERIVED');

    const spendMetric = metrics.find(m => m.id === 'spending_food_restaurant');
    expect(spendMetric?.default_classification).toBe('BENCHMARK');

    const gasDeltaMetric = metrics.find(m => m.id === 'fuel_gas_delta_to_toronto');
    expect(gasDeltaMetric?.default_classification).toBe('DERIVED');
  });
});
