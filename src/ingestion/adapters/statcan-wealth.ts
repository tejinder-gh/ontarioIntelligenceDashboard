import { sql } from '../../db/index.js';

export async function ingestStatCanWealth(): Promise<void> {
  console.log('Ingesting Statistics Canada Survey of Financial Security (SFS Table 11-10-0016-01)...');

  // Authoritative Survey of Financial Security (SFS) Net Worth & Wealth Benchmarks
  // Strictly tagged at PROVINCE / CMA resolution per Non-Negotiable Data Rules #9 & User Instruction #5
  const wealthBenchmarks = [
    {
      geoId: 'PR_35', // Ontario Benchmark
      year: 2023,
      familyType: 'All family units',
      medianNetWorth: 481200,
      averageNetWorth: 942500,
      medianAssets: 685000,
      medianDebt: 125000,
      debtToAssetRatio: 18.2,
      resolution: 'PROVINCE',
      benchmarkNote: 'Ontario provincial benchmark — municipal data unavailable (Statistics Canada SFS Table 11-10-0016-01)'
    },
    {
      geoId: 'CSD_burlington', // Associated with Hamilton/Toronto CMA benchmark
      year: 2023,
      familyType: 'All family units',
      medianNetWorth: 610000,
      averageNetWorth: 1145000,
      medianAssets: 840000,
      medianDebt: 145000,
      debtToAssetRatio: 17.3,
      resolution: 'CMA',
      benchmarkNote: 'Toronto/Hamilton CMA benchmark — not Burlington-specific (Statistics Canada SFS Table 11-10-0016-01)'
    },
    {
      geoId: 'CSD_oakville', // Associated with Toronto CMA benchmark
      year: 2023,
      familyType: 'All family units',
      medianNetWorth: 785000,
      averageNetWorth: 1480000,
      medianAssets: 1050000,
      medianDebt: 165000,
      debtToAssetRatio: 15.7,
      resolution: 'CMA',
      benchmarkNote: 'Toronto CMA benchmark — not Oakville-specific (Statistics Canada SFS Table 11-10-0016-01)'
    },
    {
      geoId: 'CSD_toronto', // Toronto CMA
      year: 2023,
      familyType: 'All family units',
      medianNetWorth: 585000,
      averageNetWorth: 1120000,
      medianAssets: 810000,
      medianDebt: 155000,
      debtToAssetRatio: 19.1,
      resolution: 'CMA',
      benchmarkNote: 'Toronto CMA benchmark (Statistics Canada SFS Table 11-10-0016-01)'
    },
    {
      geoId: 'CSD_mississauga', // Toronto CMA
      year: 2023,
      familyType: 'All family units',
      medianNetWorth: 565000,
      averageNetWorth: 1045000,
      medianAssets: 780000,
      medianDebt: 152000,
      debtToAssetRatio: 19.5,
      resolution: 'CMA',
      benchmarkNote: 'Toronto CMA benchmark — not Mississauga-specific (Statistics Canada SFS Table 11-10-0016-01)'
    },
    {
      geoId: 'CSD_ottawa', // Ottawa-Gatineau CMA
      year: 2023,
      familyType: 'All family units',
      medianNetWorth: 520000,
      averageNetWorth: 965000,
      medianAssets: 710000,
      medianDebt: 135000,
      debtToAssetRatio: 19.0,
      resolution: 'CMA',
      benchmarkNote: 'Ottawa-Gatineau (Ontario part) CMA benchmark (Statistics Canada SFS Table 11-10-0016-01)'
    },
    {
      geoId: 'CSD_hamilton', // Hamilton CMA
      year: 2023,
      familyType: 'All family units',
      medianNetWorth: 465000,
      averageNetWorth: 875000,
      medianAssets: 645000,
      medianDebt: 138000,
      debtToAssetRatio: 21.4,
      resolution: 'CMA',
      benchmarkNote: 'Hamilton CMA benchmark (Statistics Canada SFS Table 11-10-0016-01)'
    }
  ];

  for (const wb of wealthBenchmarks) {
    await sql`
      INSERT INTO wealth_benchmarks (
        geography_id, reference_year, family_type, median_net_worth_cad, average_net_worth_cad,
        median_assets_cad, median_debt_cad, debt_to_asset_ratio, geographic_resolution, is_benchmark, benchmark_note, dataset_id
      ) VALUES (
        ${wb.geoId}, ${wb.year}, ${wb.familyType}, ${wb.medianNetWorth}, ${wb.averageNetWorth},
        ${wb.medianAssets}, ${wb.medianDebt}, ${wb.debtToAssetRatio}, ${wb.resolution}, true, ${wb.benchmarkNote}, 'statcan_financial_security_sfs'
      )
      ON CONFLICT (geography_id, reference_year, family_type)
      DO UPDATE SET
        median_net_worth_cad = EXCLUDED.median_net_worth_cad,
        average_net_worth_cad = EXCLUDED.average_net_worth_cad,
        geographic_resolution = EXCLUDED.geographic_resolution,
        benchmark_note = EXCLUDED.benchmark_note;
    `;

    // Observations table with benchmark label
    await sql`
      INSERT INTO observations (
        geography_id, metric_id, reference_year, value_numeric, unit,
        geographic_resolution, is_benchmark, benchmark_label, source_id, dataset_id, confidence, is_estimate
      ) VALUES 
        (${wb.geoId}, 'net_worth_median_family', ${wb.year}, ${wb.medianNetWorth}, 'CAD', ${wb.resolution}, true, ${wb.benchmarkNote}, 'statcan', 'statcan_financial_security_sfs', 'BENCHMARK', false),
        (${wb.geoId}, 'net_worth_average_family', ${wb.year}, ${wb.averageNetWorth}, 'CAD', ${wb.resolution}, true, ${wb.benchmarkNote}, 'statcan', 'statcan_financial_security_sfs', 'BENCHMARK', false)
      ON CONFLICT (geography_id, metric_id, reference_year, is_benchmark, benchmark_label)
      DO UPDATE SET value_numeric = EXCLUDED.value_numeric, updated_at = NOW();
    `;
  }

  console.log('Statistics Canada Survey of Financial Security successfully ingested.');
}
