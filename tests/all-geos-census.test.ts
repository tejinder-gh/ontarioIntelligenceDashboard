import { describe, it, expect } from 'bun:test';
import { sql } from '../src/db/index.js';

describe('T-011 & T-012 — Full Ontario Census 2021 Ingestion & Population Estimates Suite', () => {
  it('AC1: verifies 100% of Ontario municipalities (444 CSDs/municipalities) have authentic 2021 population', async () => {
    const [totalGeos] = await sql`SELECT count(*) FROM geographies;`;
    expect(Number(totalGeos.count)).toBe(444);

    const [unpopulated] = await sql`
      SELECT count(*) FROM geographies WHERE population_2021 IS NULL;
    `;
    expect(Number(unpopulated.count)).toBe(0);

    const [totalPop] = await sql`
      SELECT sum(population_2021) as sum_pop FROM geographies WHERE geo_type = 'CSD';
    `;
    // Total municipal population of Ontario is ~14.2M
    expect(Number(totalPop.sum_pop)).toBeGreaterThan(12000000);
  });

  it('AC2: verifies observations table contains census observations with explicit metric_classification', async () => {
    const [obsCount] = await sql`SELECT count(*) FROM observations WHERE reference_year = 2021;`;
    expect(Number(obsCount.count)).toBeGreaterThanOrEqual(444 * 10);

    const [invalidClassifications] = await sql`
      SELECT count(*) as count FROM observations 
      WHERE metric_classification NOT IN ('OBSERVED', 'BENCHMARK', 'DERIVED', 'MODELED');
    `;
    expect(Number(invalidClassifications.count)).toBe(0);
  });

  it('AC3: verifies fine-grained 9 standard age cohorts are recorded in census_demographics', async () => {
    const ageLabels = [
      '0 to 14 years', '15 to 19 years', '20 to 24 years', 
      '25 to 34 years', '35 to 44 years', '45 to 54 years', 
      '55 to 64 years', '65 to 74 years', '75 years and over'
    ];

    const cohorts = await sql`
      SELECT category_label, count(*) as geo_count 
      FROM census_demographics 
      WHERE dimension_type = 'AGE_GROUP'
      GROUP BY category_label;
    `;

    expect(cohorts.length).toBeGreaterThanOrEqual(9);
    for (const label of ageLabels) {
      const match = cohorts.find(c => c.category_label === label);
      expect(match).toBeDefined();
      expect(Number(match?.geo_count)).toBeGreaterThanOrEqual(440);
    }
  });

  it('AC4: verifies housing stock structural breakdown in census_demographics', async () => {
    const housing = await sql`
      SELECT category_label, count(*) as geo_count 
      FROM census_demographics 
      WHERE dimension_type = 'HOUSING_STOCK'
      GROUP BY category_label;
    `;

    expect(housing.length).toBeGreaterThanOrEqual(5);
    const housingLabels = housing.map(h => h.category_label);
    expect(housingLabels).toContain('Single-detached house');
    expect(housingLabels).toContain('Semi-detached house');
    expect(housingLabels).toContain('Row house / Townhouse');
  });

  it('AC5 (T-012): verifies annual population estimates are tracked separately from Census counts', async () => {
    const [estimates] = await sql`
      SELECT count(*) as count FROM observations WHERE metric_id = 'pop_estimate_current';
    `;
    expect(Number(estimates.count)).toBeGreaterThanOrEqual(380);

    // Verify Burlington has both census count (186,948) and postcensal estimate (~197k-199k)
    const [burlingtonCensus] = await sql`
      SELECT value_numeric FROM observations WHERE geography_id = 'CSD_burlington' AND metric_id = 'pop_total';
    `;
    const [burlingtonEstimate] = await sql`
      SELECT value_numeric, reference_year FROM observations WHERE geography_id = 'CSD_burlington' AND metric_id = 'pop_estimate_current';
    `;

    expect(Number(burlingtonCensus.value_numeric)).toBe(186948);
    expect(Number(burlingtonEstimate.value_numeric)).toBeGreaterThan(190000);
    expect(Number(burlingtonEstimate.reference_year)).toBeGreaterThanOrEqual(2024);
  });
});
