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

export type MunicipalTier = 'SINGLE_TIER' | 'UPPER_TIER' | 'LOWER_TIER' | 'UNORGANIZED' | null;

export interface GeographySummary {
  id: string;
  name: string;
  display_name: string;
  geo_type: string;
  csd_type: string | null;
  municipal_tier?: MunicipalTier;
  census_division: string | null;
  census_division_id?: string | null;
  cma_id?: string | null;
  parent_id?: string | null;
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
  reference_year?: number;
  vintage_date?: string;
  effective_date?: string;
  revision_number?: number;
  is_superseded?: boolean;
}
