import { sql } from '../db/index.js';
import { computeDescriptiveStatistics, computeZScore, computePercentileRank } from './statistics.js';
import { detectOutliersForMetric } from './outliers.js';

export async function precomputeDerivedAnalytics(): Promise<void> {
  console.log('Precomputing Layer 3 Derived Analytics, Outliers, and Municipal Rankings...');

  const metricsToPrecompute = [
    { id: 'pop_total', name: 'Total Population', unit: 'people' },
    { id: 'pop_growth_5yr', name: '5-Year Population Growth', unit: '%' },
    { id: 'income_median_hh', name: 'Median Household Total Income', unit: 'CAD' },
    { id: 'income_average_hh', name: 'Average Household Total Income', unit: 'CAD' },
    { id: 'shelter_cost_median_rent', name: 'Median Monthly Tenant Rent', unit: 'CAD/month' },
    { id: 'labor_participation_rate', name: 'Labour Force Participation Rate', unit: '%' },
    { id: 'labor_unemployment_rate', name: 'Unemployment Rate', unit: '%' },
    { id: 'businesses_per_1000_pop', name: 'Businesses per 1,000 Residents', unit: 'businesses/1k pop' }
  ];

  for (const m of metricsToPrecompute) {
    // Fetch observed values across CSDs
    const rows = await sql`
      SELECT o.geography_id, g.name, o.value_numeric, o.reference_year
      FROM observations o
      JOIN geographies g ON g.id = o.geography_id
      WHERE o.metric_id = ${m.id} AND g.geo_type = 'CSD' AND o.value_numeric IS NOT NULL;
    `;

    if (rows.length === 0) continue;

    const cityObs = rows.map(r => ({
      geographyId: r.geography_id,
      geographyName: r.name,
      value: Number(r.value_numeric)
    }));

    const stats = computeDescriptiveStatistics(cityObs.map(c => c.value));
    const outlierResults = detectOutliersForMetric(m.id, m.name, m.unit, cityObs);

    // Sort descending for rank
    const sorted = [...cityObs].sort((a, b) => b.value - a.value);

    for (const item of cityObs) {
      const z = computeZScore(item.value, stats.mean, stats.stdDev);
      const pRank = computePercentileRank(item.value, cityObs.map(c => c.value));
      const rank = sorted.findIndex(s => s.geographyId === item.geographyId) + 1;
      const out = outlierResults.find(o => o.geographyId === item.geographyId);

      await sql`
        INSERT INTO derived_analytics (
          geography_id, metric_id, reference_year, mean_value, median_value, min_value, max_value,
          std_dev, percentile_rank, z_score, iqr_value, skewness, is_outlier, outlier_reason,
          ontario_rank, total_geographies_ranked, recalculated_at
        ) VALUES (
          ${item.geographyId}, ${m.id}, 2021, ${stats.mean}, ${stats.median}, ${stats.min}, ${stats.max},
          ${stats.stdDev}, ${pRank}, ${z}, ${stats.iqr}, ${stats.skewness}, ${out?.isOutlier || false}, ${out?.explanation || ''},
          ${rank}, ${cityObs.length}, NOW()
        )
        ON CONFLICT (geography_id, metric_id, reference_year)
        DO UPDATE SET
          mean_value = EXCLUDED.mean_value,
          median_value = EXCLUDED.median_value,
          min_value = EXCLUDED.min_value,
          max_value = EXCLUDED.max_value,
          std_dev = EXCLUDED.std_dev,
          percentile_rank = EXCLUDED.percentile_rank,
          z_score = EXCLUDED.z_score,
          iqr_value = EXCLUDED.iqr_value,
          skewness = EXCLUDED.skewness,
          is_outlier = EXCLUDED.is_outlier,
          outlier_reason = EXCLUDED.outlier_reason,
          ontario_rank = EXCLUDED.ontario_rank,
          total_geographies_ranked = EXCLUDED.total_geographies_ranked,
          recalculated_at = NOW();
      `;
    }
  }

  console.log('Layer 3 derived analytics and outlier detection precomputed successfully.');
}
