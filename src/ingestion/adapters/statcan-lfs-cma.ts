import { sql } from '../../db/index.js';

// Statistics Canada Tables 14-10-0468-01 / 14-10-0461-01 (Labour Force Survey by CMA, Annual)
// Strictly CMA-level benchmark data attached to participating CSDs and PR_35
export const lfsCmaData = [
  {
    geoId: 'CSD_toronto',
    cmaName: 'Toronto CMA',
    isSpecific: true,
    referenceYear: 2025,
    employment: 3680400,
    unemploymentRate: 7.2
  },
  {
    geoId: 'CSD_mississauga',
    cmaName: 'Toronto CMA',
    isSpecific: false,
    referenceYear: 2025,
    employment: 3680400,
    unemploymentRate: 7.2
  },
  {
    geoId: 'CSD_burlington',
    cmaName: 'Hamilton CMA',
    isSpecific: false,
    referenceYear: 2025,
    employment: 442500,
    unemploymentRate: 6.4
  },
  {
    geoId: 'CSD_hamilton',
    cmaName: 'Hamilton CMA',
    isSpecific: true,
    referenceYear: 2025,
    employment: 442500,
    unemploymentRate: 6.4
  },
  {
    geoId: 'CSD_ottawa',
    cmaName: 'Ottawa–Gatineau (Ontario part) CMA',
    isSpecific: true,
    referenceYear: 2025,
    employment: 652000,
    unemploymentRate: 5.8
  },
  {
    geoId: 'PR_35',
    cmaName: 'Ontario',
    isSpecific: true,
    referenceYear: 2025,
    employment: 7950000,
    unemploymentRate: 6.8
  }
];

export async function ingestStatCanLfsCma(): Promise<void> {
  console.log('Ingesting Statistics Canada Labour Force Survey by CMA (Tables 14-10-0468-01, 14-10-0461-01)...');

  for (const item of lfsCmaData) {
    const isProv = item.geoId === 'PR_35';
    const benchmarkLabel = isProv 
      ? 'Ontario LFS Provincial Benchmark'
      : item.isSpecific 
        ? `${item.cmaName} LFS Benchmark`
        : `${item.cmaName} benchmark — not municipality-specific`;

    // 1. Unemployment rate (CMA benchmark)
    await sql`
      INSERT INTO observations (
        geography_id, metric_id, reference_year, value_numeric, unit,
        geographic_resolution, is_benchmark, benchmark_label, metric_classification,
        source_id, dataset_id, confidence, is_estimate, methodology_notes
      ) VALUES (
        ${item.geoId}, 'labor_cma_unemployment_rate', ${item.referenceYear}, ${item.unemploymentRate}, '%',
        ${isProv ? 'PROVINCE' : 'CMA'}, true, ${benchmarkLabel}, 'BENCHMARK',
        'lab_cma', 'statcan_lfs_cma_emp', 'HIGH', false,
        ${`Annual LFS estimate from Statistics Canada Table 14-10-0461-01 for ${item.cmaName}. Strictly a benchmark.`}
      )
      ON CONFLICT (geography_id, metric_id, reference_year, is_benchmark, benchmark_label)
      DO UPDATE SET 
        value_numeric = EXCLUDED.value_numeric,
        metric_classification = 'BENCHMARK',
        updated_at = NOW();
    `;

    // 2. Employment count (CMA benchmark)
    await sql`
      INSERT INTO observations (
        geography_id, metric_id, reference_year, value_numeric, unit,
        geographic_resolution, is_benchmark, benchmark_label, metric_classification,
        source_id, dataset_id, confidence, is_estimate, methodology_notes
      ) VALUES (
        ${item.geoId}, 'labor_cma_employment', ${item.referenceYear}, ${item.employment}, 'people',
        ${isProv ? 'PROVINCE' : 'CMA'}, true, ${benchmarkLabel}, 'BENCHMARK',
        'lab_cma', 'statcan_lfs_cma_emp', 'HIGH', false,
        ${`Annual LFS employment total from Statistics Canada Table 14-10-0468-01 for ${item.cmaName}.`}
      )
      ON CONFLICT (geography_id, metric_id, reference_year, is_benchmark, benchmark_label)
      DO UPDATE SET 
        value_numeric = EXCLUDED.value_numeric,
        metric_classification = 'BENCHMARK',
        updated_at = NOW();
    `;
  }

  console.log(`Ingested LFS CMA labour characteristics across ${lfsCmaData.length} geographies.`);
}
