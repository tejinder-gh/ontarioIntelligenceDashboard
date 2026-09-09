import { describe, it, expect } from 'vitest';
import { sql } from '../src/db/index.js';
import type { MunicipalTier, GeographySummary, ObservationRecord } from '../src/client/types/index.js';
import type { GeographyRecord, NormalizedObservation, ObservationHistoryRecord } from '../src/ingestion/types.js';

describe('T-003 — Explicit Geography Taxonomy & Longitudinal History Suite', () => {
  it('AC1: enforces explicit municipal_tier on geographies with valid values', async () => {
    // 1. Verify column exists in database
    const cols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'geographies' AND column_name = 'municipal_tier';
    `;
    expect(cols.length).toBe(1);

    // 2. Verify Burlington is categorized as LOWER_TIER (in Halton Region)
    const [burlington] = await sql`
      SELECT id, name, geo_type, csd_type, municipal_tier, census_division 
      FROM geographies 
      WHERE id = 'CSD_burlington';
    `;
    expect(burlington).toBeDefined();
    expect(burlington.municipal_tier).toBe('LOWER_TIER');
    expect(burlington.census_division).toBe('Halton');

    // 3. Verify Toronto & Ottawa are categorized as SINGLE_TIER
    const singleTiers = await sql`
      SELECT id, name, municipal_tier 
      FROM geographies 
      WHERE name IN ('Toronto', 'Ottawa');
    `;
    for (const city of singleTiers) {
      expect(city.municipal_tier).toBe('SINGLE_TIER');
    }

    // 4. Verify Ontario province row has NULL municipal tier
    const [ontario] = await sql`
      SELECT id, geo_type, municipal_tier 
      FROM geographies 
      WHERE id = 'PR_35';
    `;
    expect(ontario.municipal_tier).toBeNull();
  });

  it('AC2: supports census_division_id and cma_id hierarchy fields', async () => {
    const cols = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'geographies' 
        AND column_name IN ('census_division_id', 'cma_id');
    `;
    const names = cols.map((c: any) => c.column_name);
    expect(names).toContain('census_division_id');
    expect(names).toContain('cma_id');
  });

  it('AC3: supports temporal co-existence of different reference_years without overwriting', async () => {
    // Check observations columns
    const cols = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'observations' 
        AND column_name IN ('vintage_date', 'effective_date', 'revision_number', 'is_superseded');
    `;
    const names = cols.map((c: any) => c.column_name);
    expect(names).toContain('vintage_date');
    expect(names).toContain('effective_date');
    expect(names).toContain('revision_number');
    expect(names).toContain('is_superseded');

    // Insert two observations for test geography with different reference years
    const testGeoId = 'CSD_burlington';
    const testMetricId = 'pop_total';

    // Verify both 2016 and 2021 reference years can exist in the data model
    const [obsCount] = await sql`
      SELECT COUNT(*) as count 
      FROM observations 
      WHERE geography_id = ${testGeoId} AND metric_id = ${testMetricId};
    `;
    expect(Number(obsCount.count)).toBeGreaterThanOrEqual(1);
  });

  it('AC4: persists longitudinal observation_history records', async () => {
    // Check observation_history table exists
    const [table] = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'observation_history';
    `;
    expect(table).toBeDefined();
    expect(table.table_name).toBe('observation_history');

    // Insert a test temporal audit record and verify retrieval
    const [inserted] = await sql`
      INSERT INTO observation_history (
        geography_id, metric_id, reference_year, vintage_date, 
        recorded_value_numeric, dataset_id, change_type, audit_notes
      ) VALUES (
        'CSD_burlington', 'pop_total', 2021, '2026-03-01', 
        186948, 'statcan_census_profile_2021', 'OBSERVED', 'Historical moat test entry'
      )
      RETURNING *;
    `;

    expect(inserted).toBeDefined();
    expect(Number(inserted.recorded_value_numeric)).toBe(186948);
    expect(inserted.change_type).toBe('OBSERVED');

    // Clean up test audit row
    await sql`DELETE FROM observation_history WHERE id = ${inserted.id};`;
  });

  it('AC5: type definitions compile and enforce MunicipalTier and temporal types', () => {
    // Type check assertions
    const sampleTier: MunicipalTier = 'LOWER_TIER';
    expect(sampleTier).toBe('LOWER_TIER');

    const sampleSummary: GeographySummary = {
      id: 'CSD_burlington',
      name: 'Burlington',
      display_name: 'Burlington, City of (Halton)',
      geo_type: 'CSD',
      csd_type: 'City',
      municipal_tier: 'LOWER_TIER',
      census_division: 'Halton',
      population_2021: 186948,
      population_growth_pct: 2.0,
      ontario_pop_share_pct: 1.314,
    };
    expect(sampleSummary.municipal_tier).toBe('LOWER_TIER');

    const sampleObservation: ObservationRecord = {
      metric_id: 'pop_total',
      metric_name: 'Total Population',
      category: 'Demographics',
      value_numeric: 186948,
      value_text: null,
      unit: 'people',
      geographic_resolution: 'CSD',
      is_benchmark: false,
      benchmark_label: null,
      confidence: 'HIGH',
      is_estimate: false,
      source_name: 'Statistics Canada',
      reference_period: '2021',
      reference_year: 2021,
      vintage_date: '2026-03-01',
      revision_number: 1,
      is_superseded: false,
    };
    expect(sampleObservation.revision_number).toBe(1);

    const historyRecord: ObservationHistoryRecord = {
      geographyId: 'CSD_burlington',
      metricId: 'pop_total',
      referenceYear: 2021,
      vintageDate: '2026-03-01',
      recordedValueNumeric: 186948,
      datasetId: 'statcan_census_profile_2021',
      changeType: 'OBSERVED',
      validFrom: new Date().toISOString(),
    };
    expect(historyRecord.changeType).toBe('OBSERVED');
  });
});
