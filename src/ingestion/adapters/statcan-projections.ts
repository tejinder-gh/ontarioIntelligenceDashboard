import { sql } from '../../db/index.js';

// Statistics Canada Table 17-10-0162-01
// Projected population for census divisions and census subdivisions, 2021 boundaries, by projection scenario
// Scenarios: M1 (Medium Growth / Historical Trends), High Growth, Low Growth
export const populationProjectionsData = [
  {
    geoId: 'CSD_burlington',
    censusDivision: 'Halton',
    censusDivisionId: 'CD_3524',
    projectionYear: 2031,
    scenarios: {
      M1_medium: { population: 204500, growthPct: 9.39 },
      high_growth: { population: 212800, growthPct: 13.83 },
      low_growth: { population: 196200, growthPct: 4.95 }
    },
    uncertaintyWarning: 'Projection model based on demographic component assumptions (fertility, mortality, net migration). Not a guaranteed forecast.'
  },
  {
    geoId: 'CSD_oakville',
    censusDivision: 'Halton',
    censusDivisionId: 'CD_3524',
    projectionYear: 2031,
    scenarios: {
      M1_medium: { population: 242000, growthPct: 13.21 },
      high_growth: { population: 254500, growthPct: 19.06 },
      low_growth: { population: 229800, growthPct: 7.50 }
    },
    uncertaintyWarning: 'Projection model based on demographic component assumptions. Not a guaranteed forecast.'
  },
  {
    geoId: 'CSD_milton',
    censusDivision: 'Halton',
    censusDivisionId: 'CD_3524',
    projectionYear: 2031,
    scenarios: {
      M1_medium: { population: 178000, growthPct: 33.87 },
      high_growth: { population: 192000, growthPct: 44.40 },
      low_growth: { population: 164000, growthPct: 23.34 }
    },
    uncertaintyWarning: 'High-growth suburban expansion zone subject to regional infrastructure and provincial growth allocation.'
  },
  {
    geoId: 'CSD_mississauga',
    censusDivision: 'Peel',
    censusDivisionId: 'CD_3521',
    projectionYear: 2031,
    scenarios: {
      M1_medium: { population: 758000, growthPct: 5.57 },
      high_growth: { population: 785000, growthPct: 9.33 },
      low_growth: { population: 732000, growthPct: 1.95 }
    },
    uncertaintyWarning: 'Intensification-driven growth model; reliant on transit corridor density.'
  },
  {
    geoId: 'CSD_toronto',
    censusDivision: 'Toronto',
    censusDivisionId: 'CD_3520',
    projectionYear: 2031,
    scenarios: {
      M1_medium: { population: 3125000, growthPct: 11.85 },
      high_growth: { population: 3290000, growthPct: 17.75 },
      low_growth: { population: 2975000, growthPct: 6.48 }
    },
    uncertaintyWarning: 'Metropolitan hub projection subject to international immigration targets and interprovincial migration flows.'
  },
  {
    geoId: 'PR_35',
    censusDivision: 'Ontario',
    censusDivisionId: null,
    projectionYear: 2031,
    scenarios: {
      M1_medium: { population: 16450000, growthPct: 15.65 },
      high_growth: { population: 17300000, growthPct: 21.63 },
      low_growth: { population: 15650000, growthPct: 10.03 }
    },
    uncertaintyWarning: 'Provincial projection model from Ontario Ministry of Finance / Statistics Canada.'
  }
];

export async function ingestStatCanProjections(): Promise<void> {
  console.log('Ingesting Statistics Canada Table 17-10-0162-01 (Population Projections)...');

  for (const item of populationProjectionsData) {
    const medium = item.scenarios.M1_medium;

    await sql`
      INSERT INTO observations (
        geography_id, metric_id, reference_year, value_numeric, unit,
        geographic_resolution, is_benchmark, metric_classification,
        source_id, dataset_id, confidence, is_estimate, methodology_notes
      ) VALUES (
        ${item.geoId}, 'pop_projected_2031', 2031, ${medium.population}, 'people',
        'CSD', false, 'MODELED',
        'pop_csd_proj', 'statcan_population_projections_csd', 'MEDIUM', true,
        ${`Projection Scenario M1 (Medium Growth): ${medium.population.toLocaleString()} residents projected by 2031 (+${medium.growthPct}%). ${item.uncertaintyWarning}`}
      )
      ON CONFLICT (geography_id, metric_id, reference_year, is_benchmark, benchmark_label)
      DO UPDATE SET 
        value_numeric = EXCLUDED.value_numeric,
        methodology_notes = EXCLUDED.methodology_notes,
        metric_classification = 'MODELED',
        updated_at = NOW();
    `;
  }

  console.log(`Populated population projections across ${populationProjectionsData.length} geographies.`);
}
