import { sql } from '../db/index.js';
import { computeDescriptiveStatistics, computeZScore, computePercentileRank } from './statistics.js';
import { detectOutliersForMetric } from './outliers.js';

export async function precomputeDerivedAnalytics(): Promise<void> {
  console.log('Precomputing Layer 3 Derived Analytics, Outliers, and Municipal Rankings across all Ontario CSDs...');

  const metricsToPrecompute = [
    { id: 'pop_total', name: 'Total Population', unit: 'people' },
    { id: 'pop_growth_5yr', name: '5-Year Population Growth', unit: '%' },
    { id: 'pop_density', name: 'Population Density', unit: 'people/sq km' },
    { id: 'income_median_hh', name: 'Median Household Total Income', unit: 'CAD' },
    { id: 'income_average_hh', name: 'Average Household Total Income', unit: 'CAD' },
    { id: 'income_after_tax_median_hh', name: 'Median After-Tax Household Income', unit: 'CAD' },
    { id: 'shelter_cost_median_rent', name: 'Median Monthly Tenant Rent', unit: 'CAD/month' },
    { id: 'shelter_cost_median_owner', name: 'Median Monthly Owner Shelter Cost', unit: 'CAD/month' },
    { id: 'labor_participation_rate', name: 'Labour Force Participation Rate', unit: '%' },
    { id: 'labor_unemployment_rate', name: 'Unemployment Rate', unit: '%' },
    { id: 'dwelling_value_average', name: 'Average Dwelling Value', unit: 'CAD' },
    { id: 'municipal_operating_budget', name: 'Municipal Operating Expenditures', unit: 'CAD' },
    { id: 'municipal_capital_expenditures', name: 'Municipal Capital Expenditures', unit: 'CAD' },
    { id: 'municipal_taxation_revenue', name: 'Municipal Property Taxation Revenue', unit: 'CAD' },
    { id: 'prop_multi_owner_pct', name: 'Multi-Property Ownership Share', unit: '%' },
    { id: 'businesses_per_1000_pop', name: 'Businesses per 1,000 Residents', unit: 'businesses/1k pop' },
    { id: 'businesses_total_counts', name: 'Total Business Establishments', unit: 'establishments' }
  ];

  for (const m of metricsToPrecompute) {
    // Fetch observed values across CSDs (latest reference year per geography)
    const rows = await sql`
      SELECT DISTINCT ON (o.geography_id) o.geography_id, g.name, o.value_numeric, o.reference_year
      FROM observations o
      JOIN geographies g ON g.id = o.geography_id
      WHERE o.metric_id = ${m.id} AND g.geo_type = 'CSD' AND o.value_numeric IS NOT NULL
      ORDER BY o.geography_id, o.reference_year DESC;
    `;

    if (rows.length === 0) continue;

    const cityObs = rows.map(r => ({
      geographyId: r.geography_id,
      geographyName: r.name,
      value: Number(r.value_numeric),
      referenceYear: Number(r.reference_year) || 2021
    }));

    const stats = computeDescriptiveStatistics(cityObs.map(c => c.value));
    const outlierResults = detectOutliersForMetric(m.id, m.name, m.unit, cityObs);

    // Sort descending for rank (or ascending if lower is better, standard rank is highest to lowest)
    const sorted = [...cityObs].sort((a, b) => b.value - a.value);

    // Prepare rows for chunked upsert
    const recordsToInsert = cityObs.map(item => {
      const z = computeZScore(item.value, stats.mean, stats.stdDev);
      const pRank = computePercentileRank(item.value, cityObs.map(c => c.value));
      const rank = sorted.findIndex(s => s.geographyId === item.geographyId) + 1;
      const out = outlierResults.find(o => o.geographyId === item.geographyId);

      return {
        geography_id: item.geographyId,
        metric_id: m.id,
        reference_year: item.referenceYear,
        mean_value: stats.mean,
        median_value: stats.median,
        min_value: stats.min,
        max_value: stats.max,
        std_dev: stats.stdDev,
        percentile_rank: pRank,
        z_score: z,
        iqr_value: stats.iqr,
        skewness: stats.skewness,
        is_outlier: out?.isOutlier || false,
        outlier_reason: out?.explanation || '',
        ontario_rank: rank,
        total_geographies_ranked: cityObs.length
      };
    });

    // Chunked upsert (chunks of 100)
    const chunkSize = 100;
    for (let i = 0; i < recordsToInsert.length; i += chunkSize) {
      const chunk = recordsToInsert.slice(i, i + chunkSize);
      for (const rec of chunk) {
        await sql`
          INSERT INTO derived_analytics (
            geography_id, metric_id, reference_year, mean_value, median_value, min_value, max_value,
            std_dev, percentile_rank, z_score, iqr_value, skewness, is_outlier, outlier_reason,
            ontario_rank, total_geographies_ranked, recalculated_at
          ) VALUES (
            ${rec.geography_id}, ${rec.metric_id}, ${rec.reference_year}, ${rec.mean_value}, ${rec.median_value}, ${rec.min_value}, ${rec.max_value},
            ${rec.std_dev}, ${rec.percentile_rank}, ${rec.z_score}, ${rec.iqr_value}, ${rec.skewness}, ${rec.is_outlier}, ${rec.outlier_reason},
            ${rec.ontario_rank}, ${rec.total_geographies_ranked}, NOW()
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
  }

  console.log('Layer 3 derived analytics and outlier detection precomputed successfully across all CSDs.');
}
