import { describe, it, expect } from 'bun:test';
import { sql } from '../src/db/index.js';
import { checkSourceCapability, AUTHORITATIVE_SOURCES } from '../src/ingestion/registry.js';
import { 
  checkDatasetCapability, 
  getDetailedProvenance, 
  recordCoverageGap, 
  recordSourceDisagreement 
} from '../src/ingestion/capability-engine.js';

describe('T-009 — Centralized Source Registry & Capability Enforcement Suite', () => {
  it('AC1: registers all 35 authoritative sources with friendly codes, official publishers, catalogue IDs, and frequencies', async () => {
    const sources = await sql`
      SELECT id, friendly_code, name, organization_type, official_dataset_id, official_publisher, doi, frequency, supported_geography 
      FROM sources 
      WHERE friendly_code IS NOT NULL;
    `;

    expect(sources.length).toBeGreaterThanOrEqual(35);

    const friendlyCodes = sources.map(s => s.friendly_code);
    expect(friendlyCodes).toContain('GEO-ONT-MUN');
    expect(friendlyCodes).toContain('GEO-SGC21');
    expect(friendlyCodes).toContain('DEM-CEN21');
    expect(friendlyCodes).toContain('POP-CSD-EST');
    expect(friendlyCodes).toContain('POP-CSD-PROJ');
    expect(friendlyCodes).toContain('BUS-CNT-CSD');
    expect(friendlyCodes).toContain('BUS-CNT-NONEMP');
    expect(friendlyCodes).toContain('LAB-CMA');
    expect(friendlyCodes).toContain('LAB-CMA-IND');
    expect(friendlyCodes).toContain('BUILD-INVEST');
    expect(friendlyCodes).toContain('MUNI-DEV-CHARGE');
    expect(friendlyCodes).toContain('CRE-LISTING-DDF');
    expect(friendlyCodes).toContain('FUEL-RETAIL');
    expect(friendlyCodes).toContain('RENT-CMHC');
    expect(friendlyCodes).toContain('MUNI-FIR');
    expect(friendlyCodes).toContain('SPEND-SHS');
    expect(friendlyCodes).toContain('WEALTH-SFS');
    expect(friendlyCodes).toContain('BIZ-OSM');
    expect(friendlyCodes).toContain('BIZ-GOOGLE');
    expect(friendlyCodes).toContain('BIZ-YELP');
  });

  it('AC2 & AC5: enforces authorized attribute groups and prevents illegitimate usage via source_capabilities', async () => {
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

    const projMetric = metrics.find(m => m.id === 'pop_projected_2031');
    expect(projMetric?.default_classification).toBe('MODELED');
  });

  it('AC4: datasets catalog manages June 2026 Table 33-10-1176-01 superseding Table 33-10-1097-01 for lineage', async () => {
    const datasets = await sql`
      SELECT dataset_code, name, reference_period, release_date, is_current, superseding_dataset_id, classification
      FROM datasets
      WHERE dataset_code IN ('33-10-1176-01', '33-10-1097-01');
    `;

    expect(datasets.length).toBe(2);

    const currentTable = datasets.find(d => d.dataset_code === '33-10-1176-01');
    expect(currentTable).toBeDefined();
    expect(currentTable?.is_current).toBe(true);
    expect(currentTable?.reference_period).toContain('June 2026');
    expect(currentTable?.release_date).toBe('2026-08-14');
    expect(currentTable?.classification).toBe('OBSERVED');

    const supersededTable = datasets.find(d => d.dataset_code === '33-10-1097-01');
    expect(supersededTable).toBeDefined();
    expect(supersededTable?.is_current).toBe(false);
    expect(supersededTable?.superseding_dataset_id).toBe('33-10-1176-01');
  });

  it('AC5: Table 33-10-1175-01 (non-employer counts) is strictly restricted to Province and rejected at CSD', async () => {
    // 1. Check capability engine
    const csdCheck = await checkDatasetCapability('33-10-1175-01', 'non_employer_counts', 'CSD');
    expect(csdCheck.allowed).toBe(false);
    expect(csdCheck.reason).toContain('prohibited');

    const provCheck = await checkDatasetCapability('33-10-1175-01', 'non_employer_counts', 'PROVINCE');
    expect(provCheck.allowed).toBe(true);

    // 2. Verify observations in DB: only PR_35 should have non-employer counts
    const observations = await sql`
      SELECT geography_id, value_numeric, geographic_resolution, metric_classification
      FROM observations
      WHERE metric_id = 'businesses_non_employer_counts';
    `;

    expect(observations.length).toBeGreaterThanOrEqual(1);
    for (const obs of observations) {
      expect(obs.geography_id).toBe('PR_35');
      expect(obs.geographic_resolution).toBe('PROVINCE');
    }
  });

  it('AC6: Section 40 programmatic capability engine enforces rules and prevents invalid queries', async () => {
    // Census cannot provide live business counts
    const censusBiz = await checkDatasetCapability('DEM-CEN21', 'business_counts', 'CSD');
    expect(censusBiz.allowed).toBe(false);
    expect(censusBiz.reason).toContain('Census of Population cannot provide live business entity counts');

    // SHS cannot provide CSD resolution
    const shsCsd = await checkDatasetCapability('11-10-0222-01', 'spending_category', 'CSD');
    expect(shsCsd.allowed).toBe(false);
    expect(shsCsd.fallbackBenchmarkCode).toBe('PR_35');

    // Google Places permanent warehousing prohibited
    const googleWh = await checkDatasetCapability('BIZ-GOOGLE', 'place_warehouse', 'CSD');
    expect(googleWh.allowed).toBe(false);
    expect(googleWh.reason).toContain('prohibit permanent warehousing');
  });

  it('AC7: retrieves full 14-field provenance dossier via getDetailedProvenance', async () => {
    const prov = await getDetailedProvenance('pop_total', 'CSD_burlington');
    expect(prov).toBeDefined();
    expect(prov.metric_id).toBe('pop_total');
    expect(prov.metric_name).toBe('Total Population');
    expect(prov.official_publisher).toBe('Statistics Canada');
    expect(prov.official_dataset_id).toBe('98-316-X2021001');
    expect(prov.metric_classification).toBe('OBSERVED');
    expect(prov.geographic_resolution).toBe('CSD');
    expect(prov.reference_year).toBe(2021);
    expect(prov.source_friendly_code).toBe('DEM-CEN21');
    expect(prov.licence_rules).toContain('Statistics Canada Open Licence');
  });

  it('AC8: records coverage gaps and source disagreements without silent overrides', async () => {
    // 1. Coverage Gap
    const gapId = await recordCoverageGap({
      requestedMetric: 'local_patio_tax_rate',
      requestedGeography: 'CSD_burlington',
      closestAvailableGeography: 'PR_35',
      sourcesChecked: ['MUNI-FIR', 'GEO-ONT-MUN'],
      reason: 'UNAVAILABLE_UPSTREAM',
      fallbackBenchmarkCode: 'PR_35',
      userContext: 'Commercial hospitality feasibility audit'
    });
    expect(gapId).toBeGreaterThan(0);

    const [gap] = await sql`SELECT * FROM coverage_gaps WHERE id = ${gapId}`;
    expect(gap.requested_metric).toBe('local_patio_tax_rate');
    expect(gap.reason).toBe('UNAVAILABLE_UPSTREAM');

    // 2. Source Disagreement
    const diagId = await recordSourceDisagreement({
      metricId: 'pop_total',
      geographyId: 'CSD_burlington',
      referencePeriod: '2024',
      sourceAId: 'DEM-CEN21',
      valueA: 186948,
      sourceBId: 'POP-CSD-EST',
      valueB: 191200,
      preferredSourceId: 'POP-CSD-EST',
      selectionRationale: 'Annual post-censal estimate reflects recent interprovincial migration'
    });
    expect(diagId).toBeGreaterThan(0);

    const [disag] = await sql`SELECT * FROM source_disagreements WHERE id = ${diagId}`;
    expect(disag.discrepancy_pct).toBeGreaterThan(2);
    expect(disag.selection_rationale).toContain('post-censal estimate');
  });
});

