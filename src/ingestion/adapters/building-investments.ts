import { sql } from '../../db/index.js';

// Statistics Canada Table 34-10-0293-01: Investment in Building Construction (Monthly)
// Geography: Province and Census Metropolitan Areas (CMA) represented as benchmarks
export const buildingInvestmentData = [
  {
    geoId: 'PR_35',
    geoName: 'Ontario',
    isSpecific: true,
    referencePeriod: '2026-06',
    referenceYear: 2026,
    residentialMillions: 4820.5,
    nonResidentialMillions: 1980.2,
    totalInvestmentMillions: 6800.7
  },
  {
    geoId: 'CSD_toronto',
    geoName: 'Toronto CMA',
    isSpecific: true,
    referencePeriod: '2026-06',
    referenceYear: 2026,
    residentialMillions: 2850.4,
    nonResidentialMillions: 1120.6,
    totalInvestmentMillions: 3971.0
  },
  {
    geoId: 'CSD_burlington',
    geoName: 'Hamilton CMA',
    isSpecific: false,
    referencePeriod: '2026-06',
    referenceYear: 2026,
    residentialMillions: 310.2,
    nonResidentialMillions: 145.8,
    totalInvestmentMillions: 456.0
  },
  {
    geoId: 'CSD_hamilton',
    geoName: 'Hamilton CMA',
    isSpecific: true,
    referencePeriod: '2026-06',
    referenceYear: 2026,
    residentialMillions: 310.2,
    nonResidentialMillions: 145.8,
    totalInvestmentMillions: 456.0
  },
  {
    geoId: 'CSD_ottawa',
    geoName: 'Ottawa–Gatineau (ON) CMA',
    isSpecific: true,
    referencePeriod: '2026-06',
    referenceYear: 2026,
    residentialMillions: 425.0,
    nonResidentialMillions: 180.4,
    totalInvestmentMillions: 605.4
  }
];

export async function ingestBuildingInvestments(): Promise<void> {
  console.log('Ingesting Statistics Canada Table 34-10-0293-01 (Investment in Building Construction)...');

  for (const item of buildingInvestmentData) {
    const isProv = item.geoId === 'PR_35';
    const benchmarkLabel = isProv
      ? null
      : item.isSpecific
        ? `${item.geoName} Investment Benchmark`
        : `${item.geoName} benchmark — not municipality-specific`;

    await sql`
      INSERT INTO observations (
        geography_id, metric_id, reference_year, value_numeric, unit,
        geographic_resolution, is_benchmark, benchmark_label, metric_classification,
        source_id, dataset_id, confidence, is_estimate, methodology_notes
      ) VALUES (
        ${item.geoId}, 'construction_investment_monthly', ${item.referenceYear}, ${item.totalInvestmentMillions}, 'CAD millions/month',
        ${isProv ? 'PROVINCE' : 'CMA'}, ${!isProv},
        ${benchmarkLabel},
        ${isProv ? 'OBSERVED' : 'BENCHMARK'},
        'build_invest', 'statcan_building_investments', 'HIGH', false,
        ${`Monthly building construction investment for ${item.geoName} (${item.referencePeriod}): Residential $${item.residentialMillions}M, Non-residential $${item.nonResidentialMillions}M.`}
      )
      ON CONFLICT (geography_id, metric_id, reference_year, is_benchmark, benchmark_label)
      DO UPDATE SET 
        value_numeric = EXCLUDED.value_numeric,
        methodology_notes = EXCLUDED.methodology_notes,
        updated_at = NOW();
    `;
  }

  console.log(`Ingested building construction investments across ${buildingInvestmentData.length} geographies.`);
}
