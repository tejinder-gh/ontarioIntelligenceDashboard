export type ActiveTab =
  | 'overview'
  | 'city_intelligence'
  | 'demographics'
  | 'financial_profile'
  | 'consumer_spending'
  | 'workforce'
  | 'business_landscape'
  | 'municipality_finances'
  | 'city_rankings'
  | 'opportunity_lab'
  | 'competition'
  | 'business_listings'
  | 'outliers'
  | 'data_explorer'
  | 'methodology_sources';

export interface GeographySummary {
  id: string;
  name: string;
  display_name: string;
  geo_type: string;
  csd_type: string;
  census_division: string;
  population_2021: number | null;
  population_growth_pct: number | null;
  ontario_pop_share_pct: number | null;
}

export interface ObservationRecord {
  metric_id: string;
  metric_name: string;
  category: string;
  value_numeric: number | null;
  value_text: string | null;
  unit: string;
  geographic_resolution: string;
  is_benchmark: boolean;
  benchmark_label: string | null;
  confidence: string;
  is_estimate: boolean;
  source_name: string;
  reference_period: string;
}
