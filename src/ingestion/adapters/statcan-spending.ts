import { sql } from '../../db/index.js';

export async function ingestStatCanSpending(): Promise<void> {
  console.log('Ingesting Statistics Canada Survey of Household Spending (SHS Table 11-10-0222-01)...');

  // Authoritative Survey of Household Spending (SHS) benchmarks
  // IMPORTANT: Tagged strictly at PROVINCE / CMA resolution per Non-Negotiable Data Rules #10 & User Instruction #4
  // Never transformed into "Burlington spending". Displayed as provincial or CMA benchmarks.
  const spendingProfiles = [
    {
      geoId: 'PR_35', // Ontario Benchmark
      year: 2023,
      resolution: 'PROVINCE',
      benchmarkNote: 'Ontario provincial benchmark — municipal data unavailable at CSD resolution.',
      categories: [
        { name: 'Total current consumption', amount: 76420, pct: 100.0 },
        { name: 'Food - Purchased from stores (Groceries)', amount: 10450, pct: 13.7 },
        { name: 'Food - Purchased from restaurants', amount: 3980, pct: 5.2 },
        { name: 'Shelter - Total', amount: 24800, pct: 32.5 },
        { name: 'Transportation - Private vehicle operation & fuel', amount: 7950, pct: 10.4 },
        { name: 'Transportation - Public transit', amount: 1420, pct: 1.9 },
        { name: 'Health care & medical supplies', amount: 3680, pct: 4.8 },
        { name: 'Recreation & fitness memberships', amount: 4850, pct: 6.3 },
        { name: 'Clothing & footwear', amount: 3250, pct: 4.3 },
        { name: 'Childcare & educational services', amount: 3100, pct: 4.1 },
        { name: 'Household furnishings & equipment', amount: 2980, pct: 3.9 },
        { name: 'Communications (Cell phone & internet)', amount: 2750, pct: 3.6 },
        { name: 'Alcohol & tobacco', amount: 1840, pct: 2.4 },
        { name: 'Personal care goods & services', amount: 1680, pct: 2.2 }
      ]
    },
    {
      geoId: 'CSD_burlington', // Associated with Toronto/Hamilton CMA benchmark
      year: 2023,
      resolution: 'CMA',
      benchmarkNote: 'Hamilton / Toronto CMA benchmark — not Burlington-specific (Statistics Canada SHS Table 11-10-0222-01)',
      categories: [
        { name: 'Total current consumption', amount: 84200, pct: 100.0 },
        { name: 'Food - Purchased from stores (Groceries)', amount: 11200, pct: 13.3 },
        { name: 'Food - Purchased from restaurants', amount: 4650, pct: 5.5 },
        { name: 'Shelter - Total', amount: 28400, pct: 33.7 },
        { name: 'Transportation - Private vehicle operation & fuel', amount: 8450, pct: 10.0 },
        { name: 'Transportation - Public transit', amount: 1680, pct: 2.0 },
        { name: 'Health care & medical supplies', amount: 3950, pct: 4.7 },
        { name: 'Recreation & fitness memberships', amount: 5620, pct: 6.7 },
        { name: 'Clothing & footwear', amount: 3680, pct: 4.4 },
        { name: 'Childcare & educational services', amount: 3850, pct: 4.6 },
        { name: 'Household furnishings & equipment', amount: 3450, pct: 4.1 },
        { name: 'Communications (Cell phone & internet)', amount: 2950, pct: 3.5 },
        { name: 'Alcohol & tobacco', amount: 1980, pct: 2.4 },
        { name: 'Personal care goods & services', amount: 1890, pct: 2.2 }
      ]
    },
    {
      geoId: 'CSD_toronto', // Toronto CMA Benchmark
      year: 2023,
      resolution: 'CMA',
      benchmarkNote: 'Toronto CMA benchmark (Statistics Canada SHS Table 11-10-0222-01)',
      categories: [
        { name: 'Total current consumption', amount: 82500, pct: 100.0 },
        { name: 'Food - Purchased from stores (Groceries)', amount: 10850, pct: 13.2 },
        { name: 'Food - Purchased from restaurants', amount: 4850, pct: 5.9 },
        { name: 'Shelter - Total', amount: 29800, pct: 36.1 },
        { name: 'Transportation - Private vehicle operation & fuel', amount: 7100, pct: 8.6 },
        { name: 'Transportation - Public transit', amount: 2450, pct: 3.0 },
        { name: 'Health care & medical supplies', amount: 3820, pct: 4.6 },
        { name: 'Recreation & fitness memberships', amount: 5420, pct: 6.6 },
        { name: 'Clothing & footwear', amount: 3920, pct: 4.8 },
        { name: 'Childcare & educational services', amount: 3950, pct: 4.8 },
        { name: 'Household furnishings & equipment', amount: 3100, pct: 3.8 },
        { name: 'Communications (Cell phone & internet)', amount: 2850, pct: 3.5 },
        { name: 'Alcohol & tobacco', amount: 1920, pct: 2.3 },
        { name: 'Personal care goods & services', amount: 1880, pct: 2.3 }
      ]
    }
  ];

  for (const sp of spendingProfiles) {
    for (const cat of sp.categories) {
      await sql`
        INSERT INTO household_expenditures (
          geography_id, reference_year, expenditure_category, average_spending_cad, 
          pct_of_total_expenditure, geographic_resolution, is_benchmark, benchmark_note, dataset_id
        ) VALUES (
          ${sp.geoId}, ${sp.year}, ${cat.name}, ${cat.amount},
          ${cat.pct}, ${sp.resolution}, true, ${sp.benchmarkNote}, 'statcan_household_spending_shs'
        )
        ON CONFLICT (geography_id, reference_year, expenditure_category)
        DO UPDATE SET 
          average_spending_cad = EXCLUDED.average_spending_cad,
          pct_of_total_expenditure = EXCLUDED.pct_of_total_expenditure,
          geographic_resolution = EXCLUDED.geographic_resolution,
          benchmark_note = EXCLUDED.benchmark_note;
      `;
    }

    // Insert into observations table with is_benchmark = true and benchmark_label
    const restaurantSpend = sp.categories.find(c => c.name.includes('restaurants'))?.amount || 0;
    const shelterSpend = sp.categories.find(c => c.name.includes('Shelter'))?.amount || 0;

    await sql`
      INSERT INTO observations (
        geography_id, metric_id, reference_year, value_numeric, unit,
        geographic_resolution, is_benchmark, benchmark_label, source_id, dataset_id, confidence, is_estimate
      ) VALUES 
        (${sp.geoId}, 'spending_food_restaurant', ${sp.year}, ${restaurantSpend}, 'CAD/year', ${sp.resolution}, true, ${sp.benchmarkNote}, 'statcan', 'statcan_household_spending_shs', 'BENCHMARK', false),
        (${sp.geoId}, 'spending_shelter_total', ${sp.year}, ${shelterSpend}, 'CAD/year', ${sp.resolution}, true, ${sp.benchmarkNote}, 'statcan', 'statcan_household_spending_shs', 'BENCHMARK', false)
      ON CONFLICT (geography_id, metric_id, reference_year, is_benchmark, benchmark_label)
      DO UPDATE SET value_numeric = EXCLUDED.value_numeric, updated_at = NOW();
    `;
  }

  console.log('Statistics Canada Survey of Household Spending successfully ingested.');
}
