import { sql } from '../db/index.js';

export interface SourceDefinition {
  id: string;
  friendlyCode: string;
  name: string;
  organizationType: string;
  officialDatasetId: string;
  websiteUrl: string;
  frequency: string;
  supportedGeography: string;
  licenceRules: string;
  cachePolicy: string;
  priorityRank: number;
}

export const AUTHORITATIVE_SOURCES: SourceDefinition[] = [
  {
    id: 'geo_ont_mun',
    friendlyCode: 'GEO-ONT-MUN',
    name: 'Government of Ontario — List of Ontario Municipalities',
    organizationType: 'PROVINCIAL_GOV',
    officialDatasetId: 'MMAH-MUN-REG-2026',
    websiteUrl: 'https://data.ontario.ca/dataset/municipalities',
    frequency: 'ANNUAL',
    supportedGeography: 'CSD',
    licenceRules: 'Open Government Licence – Ontario',
    cachePolicy: 'Check annually around municipal boundary reviews',
    priorityRank: 1
  },
  {
    id: 'geo_sgc21',
    friendlyCode: 'GEO-SGC21',
    name: 'Statistics Canada — Standard Geographical Classification 2021',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '12-571-X2021001',
    websiteUrl: 'https://www.statcan.gc.ca/en/subjects/standard/sgc/2021/index',
    frequency: 'QUENQUENNIAL',
    supportedGeography: 'CANADA',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Persist by SGC vintage; quinquennial check',
    priorityRank: 1
  },
  {
    id: 'dem_cen21',
    friendlyCode: 'DEM-CEN21',
    name: 'Statistics Canada — 2021 Census of Population Profile',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '98-316-X2021001',
    websiteUrl: 'https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/index.cfm',
    frequency: 'QUENQUENNIAL',
    supportedGeography: 'CSD',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Persist version; never overwrite temporal snapshot',
    priorityRank: 1
  },
  {
    id: 'pop_csd_est',
    friendlyCode: 'POP-CSD-EST',
    name: 'Statistics Canada — Population Estimates, July 1, by CSD',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '17-10-0155-01',
    websiteUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1710015501',
    frequency: 'ANNUAL',
    supportedGeography: 'CSD',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Annual release check (Q1)',
    priorityRank: 1
  },
  {
    id: 'pop_csd_proj',
    friendlyCode: 'POP-CSD-PROJ',
    name: 'Statistics Canada / Ontario MoF — Population Projections',
    organizationType: 'PROVINCIAL_GOV',
    officialDatasetId: '17-10-0162-01',
    websiteUrl: 'https://www.ontario.ca/page/ontario-population-projections',
    frequency: 'ANNUAL',
    supportedGeography: 'CD',
    licenceRules: 'Open Government Licence – Ontario',
    cachePolicy: 'Scenario models only; annual update',
    priorityRank: 2
  },
  {
    id: 'dem_ethnic_age',
    friendlyCode: 'DEM-ETHNIC-AGE',
    name: 'Statistics Canada — Ethnic or Cultural Origin by Age Group',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '98-10-0358-01',
    websiteUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810035801',
    frequency: 'QUENQUENNIAL',
    supportedGeography: 'CSD',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Persist 2021 Census baseline',
    priorityRank: 2
  },
  {
    id: 'dem_vm_income_csd',
    friendlyCode: 'DEM-VM-INCOME-CSD',
    name: 'Statistics Canada — Visible Minority & Income Statistics by CSD',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '98-10-0440-01',
    websiteUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810044001',
    frequency: 'QUENQUENNIAL',
    supportedGeography: 'CSD',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Quinquennial Census baseline',
    priorityRank: 2
  },
  {
    id: 'dem_vm_labour_csd',
    friendlyCode: 'DEM-VM-LABOUR-CSD',
    name: 'Statistics Canada — Visible Minority & Labour Market by CSD',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '98-10-0436-01',
    websiteUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810043601',
    frequency: 'QUENQUENNIAL',
    supportedGeography: 'CSD',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Quinquennial Census baseline',
    priorityRank: 2
  },
  {
    id: 'bus_cnt_csd',
    friendlyCode: 'BUS-CNT-CSD',
    name: 'Statistics Canada — Canadian Business Counts with Employees by CSD',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '33-10-1097-01',
    websiteUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3310109701',
    frequency: 'SEMI_ANNUAL',
    supportedGeography: 'CSD',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Semi-annual check (June & December releases)',
    priorityRank: 1
  },
  {
    id: 'bus_cnt_nonemp',
    friendlyCode: 'BUS-CNT-NONEMP',
    name: 'Statistics Canada — Canadian Business Counts without Employees',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '33-10-1175-01',
    websiteUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3310117501',
    frequency: 'SEMI_ANNUAL',
    supportedGeography: 'PROVINCE',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Semi-annual; never allocate down to CSD without observed data',
    priorityRank: 3
  },
  {
    id: 'tax_naics22',
    friendlyCode: 'TAX-NAICS22',
    name: 'Statistics Canada — North American Industry Classification System (NAICS) 2022',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '12-501-X2022001',
    websiteUrl: 'https://www.statcan.gc.ca/en/subjects/standard/naics/2022/index',
    frequency: 'QUENQUENNIAL',
    supportedGeography: 'CANADA',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Canonical taxonomy layer',
    priorityRank: 1
  },
  {
    id: 'tax_noc21',
    friendlyCode: 'TAX-NOC21',
    name: 'Statistics Canada / ESDC — National Occupational Classification (NOC) 2021',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '12-583-X2021001',
    websiteUrl: 'https://www.statcan.gc.ca/en/subjects/standard/noc/2021/index',
    frequency: 'QUENQUENNIAL',
    supportedGeography: 'CANADA',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Canonical occupation taxonomy layer',
    priorityRank: 1
  },
  {
    id: 'lab_cma',
    friendlyCode: 'LAB-CMA',
    name: 'Statistics Canada — Labour Force Survey by CMA (Monthly)',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '14-10-0461-01',
    websiteUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410046101',
    frequency: 'MONTHLY',
    supportedGeography: 'CMA',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Monthly; always label as CMA benchmark',
    priorityRank: 2
  },
  {
    id: 'lab_wage',
    friendlyCode: 'LAB-WAGE',
    name: 'Government of Canada Job Bank — Wages by Occupation and Region',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: 'JOBBANK-WAGE-2025',
    websiteUrl: 'https://www.jobbank.gc.ca/trend-analysis/search-wages',
    frequency: 'ANNUAL',
    supportedGeography: 'ECONOMIC_REGION',
    licenceRules: 'Open Government Licence – Canada',
    cachePolicy: 'Annual refresh; never label regional wage as observed municipal wage',
    priorityRank: 2
  },
  {
    id: 'spend_shs',
    friendlyCode: 'SPEND-SHS',
    name: 'Statistics Canada — Survey of Household Spending (SHS)',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '11-10-0222-01',
    websiteUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1110022201',
    frequency: 'BIENNIAL',
    supportedGeography: 'PROVINCE',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Biennial release; strictly Provincial/CMA benchmark',
    priorityRank: 2
  },
  {
    id: 'wealth_sfs',
    friendlyCode: 'WEALTH-SFS',
    name: 'Statistics Canada — Survey of Financial Security (SFS)',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '11-10-0016-01',
    websiteUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1110001601',
    frequency: 'TRIENNIAL',
    supportedGeography: 'PROVINCE',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Triennial release; strictly Provincial benchmark',
    priorityRank: 2
  },
  {
    id: 'rent_cmhc',
    friendlyCode: 'RENT-CMHC',
    name: 'Canada Mortgage and Housing Corporation (CMHC) — Rental Market Survey',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: 'CMHC-RMS-2024',
    websiteUrl: 'https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/housing-data/data-tables/rental-market',
    frequency: 'ANNUAL',
    supportedGeography: 'CSD',
    licenceRules: 'CMHC Open Data Licence',
    cachePolicy: 'Annual release (January)',
    priorityRank: 1
  },
  {
    id: 'prop_multi_owner',
    friendlyCode: 'PROP-MULTI-OWNER',
    name: 'Statistics Canada — Residential Property Ownership (Single vs Multiple)',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '46-10-0096-01',
    websiteUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=4610009601',
    frequency: 'ANNUAL',
    supportedGeography: 'CSD',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Annual CHSP release',
    priorityRank: 2
  },
  {
    id: 'prop_owner_family',
    friendlyCode: 'PROP-OWNER-FAMILY',
    name: 'Statistics Canada — Residential Property Owners and Family Characteristics',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '46-10-0097-01',
    websiteUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=4610009701',
    frequency: 'ANNUAL',
    supportedGeography: 'CSD',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Annual CHSP release',
    priorityRank: 2
  },
  {
    id: 'fuel_retail',
    friendlyCode: 'FUEL-RETAIL',
    name: 'Statistics Canada — Monthly Average Retail Prices for Gasoline',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '18-10-0001-01',
    websiteUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810000101',
    frequency: 'MONTHLY',
    supportedGeography: 'CMA',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Monthly refresh; compare identical fuel product and reference month',
    priorityRank: 1
  },
  {
    id: 'muni_fir',
    friendlyCode: 'MUNI-FIR',
    name: 'Ontario Ministry of Municipal Affairs and Housing — Financial Information Return (FIR)',
    organizationType: 'PROVINCIAL_GOV',
    officialDatasetId: 'FIR-MYC-2024',
    websiteUrl: 'https://efis.fma.csc.gov.on.ca/fir/MultiYearReport/MYCIndex.html',
    frequency: 'ANNUAL',
    supportedGeography: 'CSD',
    licenceRules: 'Open Government Licence – Ontario',
    cachePolicy: 'Annual update around October municipal reporting cycle',
    priorityRank: 1
  },
  {
    id: 'muni_budget_current',
    friendlyCode: 'MUNI-BUDGET-CURRENT',
    name: 'Municipal Official Websites — Approved Budgets & Capital Plans',
    organizationType: 'MUNICIPAL_GOV',
    officialDatasetId: 'MUNI-BUDGET-2026',
    websiteUrl: 'https://www.ontario.ca/page/municipal-budgets',
    frequency: 'ANNUAL',
    supportedGeography: 'CSD',
    licenceRules: 'Official Municipal Public Documentation',
    cachePolicy: 'Annual check in Q1 post-budget approval',
    priorityRank: 1
  },
  {
    id: 'muni_official_plan',
    friendlyCode: 'MUNI-OFFICIAL-PLAN',
    name: 'Municipal Official Plans, Secondary Plans & DC Studies',
    organizationType: 'MUNICIPAL_GOV',
    officialDatasetId: 'MUNI-OP-2026',
    websiteUrl: 'https://www.ontario.ca/page/official-plans',
    frequency: 'QUARTERLY',
    supportedGeography: 'CSD',
    licenceRules: 'Official Municipal Planning Documentation',
    cachePolicy: 'Quarterly review of amendments and DC studies',
    priorityRank: 2
  },
  {
    id: 'cre_listings',
    friendlyCode: 'CRE-LISTINGS',
    name: 'Authorized Commercial Real Estate Listings Infrastructure',
    organizationType: 'REGULATORY_FILING',
    officialDatasetId: 'CRE-DDF-2026',
    websiteUrl: 'https://www.realtor.ca/commercial',
    frequency: 'DAILY',
    supportedGeography: 'CSD',
    licenceRules: 'Authorized Commercial Listing Distribution; separate asking vs sale prices',
    cachePolicy: 'Daily snapshot persistence; retain listing history across price changes',
    priorityRank: 1
  },
  {
    id: 'cre_market',
    friendlyCode: 'CRE-MARKET',
    name: 'Institutional Commercial Real Estate Market Reports (CBRE / Colliers / JLL)',
    organizationType: 'COMMERCIAL_RESEARCH',
    officialDatasetId: 'CRE-REP-2025',
    websiteUrl: 'https://www.cbre.ca/insights/reports',
    frequency: 'QUARTERLY',
    supportedGeography: 'CMA',
    licenceRules: 'Public Institutional Research; do not attribute GTA benchmark as Burlington-specific',
    cachePolicy: 'Quarterly update',
    priorityRank: 2
  },
  {
    id: 'biz_osm',
    friendlyCode: 'BIZ-OSM',
    name: 'OpenStreetMap Contributors — Commercial Entities',
    organizationType: 'OPEN_DATA',
    officialDatasetId: 'OSM-OVERPASS-ON',
    websiteUrl: 'https://www.openstreetmap.org',
    frequency: 'MONTHLY',
    supportedGeography: 'CSD',
    licenceRules: 'Open Database License (ODbL); label as OSM-listed businesses',
    cachePolicy: 'Monthly refresh; persist node IDs and coordinates',
    priorityRank: 4
  },
  {
    id: 'biz_google',
    friendlyCode: 'BIZ-GOOGLE',
    name: 'Google Places API (Configured Provider)',
    organizationType: 'COMMERCIAL_API',
    officialDatasetId: 'GOOGLE-PLACES-API',
    websiteUrl: 'https://developers.google.com/maps/documentation/places/web-service',
    frequency: 'ON_DEMAND',
    supportedGeography: 'CSD',
    licenceRules: 'Google Maps Platform Terms; do not permanently warehouse restricted content',
    cachePolicy: 'Compliant caching (30-day identifier refresh)',
    priorityRank: 3
  },
  {
    id: 'biz_yelp',
    friendlyCode: 'BIZ-YELP',
    name: 'Yelp Fusion API (Configured Provider)',
    organizationType: 'COMMERCIAL_API',
    officialDatasetId: 'YELP-FUSION-API',
    websiteUrl: 'https://www.yelp.com/fusion',
    frequency: 'ON_DEMAND',
    supportedGeography: 'CSD',
    licenceRules: 'Yelp Fusion API Terms; no permanent warehousing of review content',
    cachePolicy: '24-hour transient caching',
    priorityRank: 3
  }
];

export async function initializeRegistries(): Promise<void> {
  console.log('Initializing Centralized Authoritative Sources Registry (26 sources)...');

  // 1. Authoritative Sources
  for (const src of AUTHORITATIVE_SOURCES) {
    await sql`
      INSERT INTO sources (
        id, friendly_code, name, organization_type, official_dataset_id, 
        website_url, frequency, supported_geography, licence_rules, cache_policy, priority_rank, is_authoritative
      )
      VALUES (
        ${src.id}, ${src.friendlyCode}, ${src.name}, ${src.organizationType}, ${src.officialDatasetId},
        ${src.websiteUrl}, ${src.frequency}, ${src.supportedGeography}, ${src.licenceRules}, ${src.cachePolicy},
        ${src.priorityRank}, true
      )
      ON CONFLICT (id) DO UPDATE SET 
        friendly_code = EXCLUDED.friendly_code,
        name = EXCLUDED.name,
        official_dataset_id = EXCLUDED.official_dataset_id,
        website_url = EXCLUDED.website_url,
        frequency = EXCLUDED.frequency,
        supported_geography = EXCLUDED.supported_geography,
        licence_rules = EXCLUDED.licence_rules,
        cache_policy = EXCLUDED.cache_policy,
        priority_rank = EXCLUDED.priority_rank;
    `;
  }

  // 2. Source Capabilities Registry (Strict Section 7 Capability Enforcement)
  console.log('Initializing Source Capabilities Registry...');
  const capabilities = [
    // StatCan Census
    { sourceId: 'dem_cen21', attributeGroup: 'demographics', isAuthorized: true, supportedResolutions: ['PROVINCE', 'CMA', 'CD', 'CSD'], notes: 'Authoritative 2021 Census profiles' },
    { sourceId: 'dem_cen21', attributeGroup: 'household_income', isAuthorized: true, supportedResolutions: ['PROVINCE', 'CMA', 'CD', 'CSD'], notes: 'Census income distributions' },
    { sourceId: 'dem_cen21', attributeGroup: 'housing_stock', isAuthorized: true, supportedResolutions: ['PROVINCE', 'CMA', 'CD', 'CSD'], notes: 'Dwelling structure and tenure' },
    { sourceId: 'dem_cen21', attributeGroup: 'live_competitors', isAuthorized: false, supportedResolutions: [], notes: 'StatCan Census does not track physical competitor locations' },
    { sourceId: 'dem_cen21', attributeGroup: 'ratings', isAuthorized: false, supportedResolutions: [], notes: 'StatCan Census does not publish business reviews or ratings' },
    
    // Population Estimates
    { sourceId: 'pop_csd_est', attributeGroup: 'annual_population_estimates', isAuthorized: true, supportedResolutions: ['PROVINCE', 'CMA', 'CD', 'CSD'], notes: 'Annual July 1 population estimates' },
    
    // Business Counts
    { sourceId: 'bus_cnt_csd', attributeGroup: 'business_counts', isAuthorized: true, supportedResolutions: ['PROVINCE', 'CMA', 'CSD'], notes: 'Canadian Business Counts by employee band' },
    { sourceId: 'bus_cnt_csd', attributeGroup: 'live_competitors', isAuthorized: false, supportedResolutions: [], notes: 'Business Counts table does not supply individual merchant names/addresses' },
    
    // Spending (SHS)
    { sourceId: 'spend_shs', attributeGroup: 'household_spending', isAuthorized: true, supportedResolutions: ['PROVINCE', 'CMA'], notes: 'Survey of Household Spending: strictly Provincial & CMA resolution' },
    { sourceId: 'spend_shs', attributeGroup: 'csd_observed_spending', isAuthorized: false, supportedResolutions: [], notes: 'SHS sample size restricts direct CSD municipality reporting' },
    
    // Wealth (SFS)
    { sourceId: 'wealth_sfs', attributeGroup: 'net_worth', isAuthorized: true, supportedResolutions: ['PROVINCE', 'CMA'], notes: 'Survey of Financial Security: strictly Provincial/CMA benchmark' },
    { sourceId: 'wealth_sfs', attributeGroup: 'csd_observed_wealth', isAuthorized: false, supportedResolutions: [], notes: 'SFS does not publish municipal CSD resolution' },
    
    // Fuel Retail
    { sourceId: 'fuel_retail', attributeGroup: 'gas_prices', isAuthorized: true, supportedResolutions: ['PROVINCE', 'CMA', 'CSD'], notes: 'Monthly retail pump prices by geography' },
    
    // Municipal FIR
    { sourceId: 'muni_fir', attributeGroup: 'municipal_finances', isAuthorized: true, supportedResolutions: ['CSD'], notes: 'Official Financial Information Return multi-year statements' },
    
    // CMHC
    { sourceId: 'rent_cmhc', attributeGroup: 'rental_market', isAuthorized: true, supportedResolutions: ['PROVINCE', 'CMA', 'CSD'], notes: 'CMHC Rental Market Survey vacancy and rent rates' },
    { sourceId: 'rent_cmhc', attributeGroup: 'commercial_rent', isAuthorized: false, supportedResolutions: [], notes: 'CMHC only monitors residential rental markets' },
    
    // Property Ownership
    { sourceId: 'prop_multi_owner', attributeGroup: 'property_ownership', isAuthorized: true, supportedResolutions: ['PROVINCE', 'CMA', 'CSD'], notes: 'CHSP residential property ownership concentration' },
    
    // OpenStreetMap
    { sourceId: 'biz_osm', attributeGroup: 'business_locations', isAuthorized: true, supportedResolutions: ['CSD'], notes: 'OSM-listed business locations; not verified complete active directory' },
    { sourceId: 'biz_osm', attributeGroup: 'ratings', isAuthorized: false, supportedResolutions: [], notes: 'OSM does not provide ratings or reviews' },
    { sourceId: 'biz_osm', attributeGroup: 'revenues', isAuthorized: false, supportedResolutions: [], notes: 'OSM does not track commercial revenues' },
    
    // Google Places
    { sourceId: 'biz_google', attributeGroup: 'ratings', isAuthorized: true, supportedResolutions: ['CSD'], notes: 'Live ratings and review counts' },
    { sourceId: 'biz_google', attributeGroup: 'unrestricted_historical_warehouse', isAuthorized: false, supportedResolutions: [], notes: 'Google terms forbid permanent indefinite storage of Places content' }
  ];

  for (const cap of capabilities) {
    await sql`
      INSERT INTO source_capabilities (source_id, attribute_group, is_authorized, supported_resolutions, notes)
      VALUES (${cap.sourceId}, ${cap.attributeGroup}, ${cap.isAuthorized}, ${cap.supportedResolutions}, ${cap.notes})
      ON CONFLICT (source_id, attribute_group) DO UPDATE SET
        is_authorized = EXCLUDED.is_authorized,
        supported_resolutions = EXCLUDED.supported_resolutions,
        notes = EXCLUDED.notes;
    `;
  }

  // 3. Datasets Registry
  console.log('Initializing Datasets Registry...');
  await sql`
    INSERT INTO datasets (id, source_id, name, dataset_code, reference_period, release_date, source_url, geographic_coverage, naics_version, update_frequency, stale_after_days)
    VALUES
      ('statcan_census_profile_2021', 'dem_cen21', 'Census Profile, 2021 Census of Population', '98-401-X2021001', '2021', '2022-02-09', 'https://api.statcan.gc.ca/census-recensement/profile/sdmx/rest/data/STC_CP,DF_CSD,1.3/', 'CSD_ONTARIO', '2022 v1.0', 'QUENQUENNIAL', 1825),
      ('statcan_population_estimates_csd', 'pop_csd_est', 'Population estimates, July 1, by Census Subdivision, 2021 boundaries', '17-10-0155-01', 'July 1, 2024', '2025-01-15', 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1710015501', 'CSD_ONTARIO', NULL, 'ANNUAL', 365),
      ('statcan_business_counts_2025_12', 'bus_cnt_csd', 'Canadian Business Counts, with employees, census metropolitan areas and census subdivisions', '33-10-1097-01', 'December 2025', '2026-03-04', 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3310109701', 'CSD_ONTARIO', '2022 v1.0', 'SEMI_ANNUAL', 180),
      ('statcan_gasoline_retail_prices', 'fuel_retail', 'Monthly average retail prices for gasoline and fuel by selected geography', '18-10-0001-01', 'August 2026', '2026-08-20', 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810000101', 'CMA_ONTARIO', NULL, 'MONTHLY', 30),
      ('cmhc_rental_market_survey', 'rent_cmhc', 'CMHC Rental Market Survey — Vacancy Rates & Average Rent', 'CMHC-RMS-2024', '2024', '2025-01-28', 'https://www.cmhc-schl.gc.ca', 'CSD_ONTARIO', NULL, 'ANNUAL', 365),
      ('statcan_property_ownership_multi', 'prop_multi_owner', 'Residential Property Owners by Number of Properties Owned', '46-10-0096-01', '2023', '2024-11-12', 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=4610009601', 'CSD_ONTARIO', NULL, 'ANNUAL', 365),
      ('ontario_municipalities_registry', 'geo_ont_mun', 'List of Ontario Municipalities', 'MMAH-MUN-REG-2026', '2026', '2026-05-26', 'https://data.ontario.ca/dataset/municipalities', 'CSD_ONTARIO', NULL, 'ANNUAL', 365),
      ('ontario_fir_multiyear', 'muni_fir', 'Financial Information Return (FIR) Multi-Year Reports', 'FIR-2023-2024', '2023-2024', '2025-10-01', 'https://efis.fma.csc.gov.on.ca/fir/MultiYearReport/MYCIndex.html', 'CSD_ONTARIO', NULL, 'ANNUAL', 365),
      ('statcan_household_spending_shs', 'spend_shs', 'Survey of Household Spending, Detailed Expenditures', '11-10-0222-01', '2023-2024', '2025-05-21', 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1110022201', 'PROVINCE_ONTARIO', NULL, 'BIENNIAL', 730),
      ('statcan_financial_security_sfs', 'wealth_sfs', 'Survey of Financial Security, Assets and Debts', '11-10-0016-01', '2023', '2024-10-29', 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1110001601', 'PROVINCE_ONTARIO', NULL, 'TRIENNIAL', 1095),
      ('osm_business_entities', 'biz_osm', 'OpenStreetMap Ontario Commercial Entities', 'OSM-OVERPASS-ON', '2026-Q1', '2026-01-15', 'https://overpass-api.de/api/interpreter', 'CSD_ONTARIO', NULL, 'MONTHLY', 30),
      ('commercial_listings_benchmarks', 'cre_listings', 'Commercial Listings, Franchise Disclosures & Retail Leasing Benchmarks', 'COMM-BENCH-2026', '2025-2026', '2026-02-01', 'https://www.sedarplus.ca', 'CSD_ONTARIO', '2022 v1.0', 'QUARTERLY', 90)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      reference_period = EXCLUDED.reference_period,
      source_url = EXCLUDED.source_url,
      updated_at = NOW();
  `;

  // 4. Metrics Definitions with Default Classifications
  console.log('Initializing Metrics Definitions with Explicit Classifications...');
  await sql`
    INSERT INTO metrics_definitions (id, name, category, subcategory, unit, default_classification, definition, formula, preferred_aggregation, geographic_scope_supported, limitations)
    VALUES
      ('pop_total', 'Total Population', 'Demographics', 'Population', 'people', 'OBSERVED', 'Total population counted in the Census of Population for private and collective dwellings.', 'StatCan Census Profile Characteristic 1', 'SUM', 'CSD_AND_ABOVE', 'Confidentiality adjustments applied to small areas.'),
      ('pop_estimate_current', 'Estimated Current Population', 'Demographics', 'Population', 'people', 'OBSERVED', 'Annual July 1 postcensal population estimate by Census Subdivision.', 'StatCan Table 17-10-0155-01', 'SUM', 'CSD_AND_ABOVE', 'Postcensal estimates; revised as subsequent census benchmarks appear.'),
      ('pop_growth_5yr', 'Population Growth (5-Year)', 'Demographics', 'Population', '%', 'DERIVED', 'Percentage population change between 2016 and 2021 Census.', '((Pop 2021 - Pop 2016) / Pop 2016) * 100', 'MEAN', 'CSD_AND_ABOVE', 'Boundary adjustments may affect historical comparisons.'),
      ('pop_density', 'Population Density', 'Demographics', 'Population', 'people/sq km', 'DERIVED', 'Number of residents per square kilometre of land area.', 'Pop 2021 / Land Area sq km', 'WEIGHTED_AVG', 'CSD_AND_ABOVE', 'Rural areas within municipal boundaries dilute core urban density.'),
      ('pop_share_ontario', 'Share of Ontario Population', 'Demographics', 'Population', '%', 'DERIVED', 'Percentage of total Ontario population residing in the municipality.', '(Municipality Pop / Ontario Pop) * 100', 'SUM', 'CSD_AND_ABOVE', 'Directly computed from compatible 2021 Census reference period.'),
      ('income_median_hh', 'Median Household Total Income', 'Financial', 'Income', 'CAD', 'OBSERVED', 'Median total income of private households in 2020.', 'StatCan Census Profile Characteristic 70', 'MEDIAN', 'CSD_AND_ABOVE', 'Income reflects calendar year 2020.'),
      ('income_average_hh', 'Average Household Total Income', 'Financial', 'Income', 'CAD', 'OBSERVED', 'Mean total income of private households in 2020.', 'StatCan Census Profile Characteristic 69', 'MEAN', 'CSD_AND_ABOVE', 'Sensitive to high-income outliers.'),
      ('income_after_tax_median_hh', 'Median After-Tax Household Income', 'Financial', 'Income', 'CAD', 'OBSERVED', 'Median after-tax income of private households in 2020.', 'StatCan Census Profile Characteristic 73', 'MEDIAN', 'CSD_AND_ABOVE', 'Reflects taxes paid and transfers received.'),
      ('shelter_cost_median_rent', 'Median Monthly Shelter Cost (Tenants)', 'Financial', 'Housing', 'CAD/month', 'OBSERVED', 'Median monthly rent and utilities paid by tenant households.', 'StatCan Census Profile Housing Characteristic', 'MEDIAN', 'CSD_AND_ABOVE', 'Includes subsidized housing units.'),
      ('shelter_cost_median_owner', 'Median Monthly Owner Major Payments', 'Financial', 'Housing', 'CAD/month', 'OBSERVED', 'Median monthly mortgage, property taxes, and condo fees for owners.', 'StatCan Census Profile Housing Characteristic', 'MEDIAN', 'CSD_AND_ABOVE', 'Excludes homes owned without mortgage.'),
      ('dwelling_value_average', 'Average Value of Dwellings', 'Financial', 'Housing', 'CAD', 'OBSERVED', 'Average estimated market value of owner-occupied private dwellings.', 'StatCan Census Profile Housing Characteristic', 'MEAN', 'CSD_AND_ABOVE', 'Self-reported by owner occupants at Census date.'),
      ('labor_participation_rate', 'Labour Force Participation Rate', 'Workforce', 'Labour', '%', 'OBSERVED', 'Total labour force expressed as a percentage of the population aged 15 and over.', '(Labour Force / Pop 15+) * 100', 'WEIGHTED_AVG', 'CSD_AND_ABOVE', 'Excludes institutional residents.'),
      ('labor_unemployment_rate', 'Unemployment Rate', 'Workforce', 'Labour', '%', 'OBSERVED', 'Unemployed persons expressed as a percentage of the total labour force.', '(Unemployed / Labour Force) * 100', 'WEIGHTED_AVG', 'CSD_AND_ABOVE', 'Based on census week employment status.'),
      ('spending_food_restaurant', 'Food Purchased from Restaurants', 'Spending', 'Consumer', 'CAD/year', 'BENCHMARK', 'Average annual household expenditure on restaurant food and takeout.', 'StatCan Survey of Household Spending Table 11-10-0222-01', 'MEAN', 'PROVINCE_AND_CMA_ONLY', 'Survey sample size limits CSD municipal reporting. Displayed as CMA/Provincial benchmark.'),
      ('spending_shelter_total', 'Total Shelter Expenditure', 'Spending', 'Consumer', 'CAD/year', 'BENCHMARK', 'Average annual household expenditure on principal accommodation.', 'StatCan Survey of Household Spending Table 11-10-0222-01', 'MEAN', 'PROVINCE_AND_CMA_ONLY', 'Provincial/CMA benchmark; municipal data unavailable.'),
      ('net_worth_median_family', 'Median Family Net Worth', 'Financial', 'Wealth', 'CAD', 'BENCHMARK', 'Median total assets minus total debts of economic family units.', 'StatCan Survey of Financial Security Table 11-10-0016-01', 'MEDIAN', 'PROVINCE_AND_CMA_ONLY', 'Sample survey; municipal CSD resolution unavailable. Displayed as CMA/Provincial benchmark.'),
      ('net_worth_average_family', 'Average Family Net Worth', 'Financial', 'Wealth', 'CAD', 'BENCHMARK', 'Average total assets minus total debts of economic family units.', 'StatCan Survey of Financial Security Table 11-10-0016-01', 'MEAN', 'PROVINCE_AND_CMA_ONLY', 'Survey sample; not published at CSD municipal resolution.'),
      ('municipal_operating_budget', 'Municipal Operating Budget', 'Municipal', 'Budget', 'CAD', 'OBSERVED', 'Total annual municipal operating expenditures reported in Schedule 40 of Ontario FIR.', 'Ontario MMAH FIR Schedule 40 Line 9910 Column 1', 'SUM', 'CSD_AND_ABOVE', 'Represents lower-tier or single-tier municipal operations.'),
      ('municipal_capital_expenditures', 'Municipal Capital Expenditures', 'Municipal', 'Budget', 'CAD', 'OBSERVED', 'Total annual capital asset expenditures reported in Schedule 51 of Ontario FIR.', 'Ontario MMAH FIR Schedule 51 Line 9910 Column 1', 'SUM', 'CSD_AND_ABOVE', 'Lumpy year-over-year depending on major infrastructure cycles.'),
      ('municipal_taxation_revenue', 'Municipal Property Taxation Revenue', 'Municipal', 'Revenue', 'CAD', 'OBSERVED', 'Total property tax revenue collected for own municipal purposes.', 'Ontario MMAH FIR Schedule 10 Line 9910 Column 1', 'SUM', 'CSD_AND_ABOVE', 'Excludes taxes collected on behalf of school boards.'),
      ('businesses_total_counts', 'Total Employer Establishments', 'Businesses', 'Counts', 'businesses', 'OBSERVED', 'Active business locations with employees recorded in Canadian Business Counts.', 'StatCan Table 33-10-1097-01 December 2025', 'SUM', 'CSD_AND_ABOVE', 'Counts statistical locations; does not measure total employee headcount.'),
      ('businesses_per_1000_pop', 'Businesses per 1,000 Residents', 'Businesses', 'Density', 'businesses/1,000 pop', 'DERIVED', 'Ratio of active employer businesses to population.', '(Total Businesses / Pop) * 1000', 'MEAN', 'CSD_AND_ABOVE', 'Higher ratios indicate commercial hubs or employment centres.'),
      ('commercial_rent_retail_net', 'Average Retail Asking Net Rent', 'Commercial', 'Real Estate', 'CAD/sq ft/year', 'OBSERVED', 'Average net asking annual rent per square foot for commercial retail plazas.', 'Commercial Real Estate Brokerage Reports (CBRE/Colliers)', 'MEDIAN', 'CSD_AND_ABOVE', 'Triple net (NNN) asking rate; excludes TMI additional rent.'),
      ('commercial_retail_vacancy', 'Retail Commercial Vacancy Rate', 'Commercial', 'Real Estate', '%', 'OBSERVED', 'Percentage of available vacant retail square footage in the municipality.', 'Commercial Market Quarterly Survey', 'MEAN', 'CSD_AND_ABOVE', 'Varies significantly between prime retail corridors and secondary strips.'),
      ('fuel_price_gasoline', 'Retail Gasoline Pump Price', 'Commercial', 'Operating Cost', 'cents/litre', 'OBSERVED', 'Monthly average retail pump price for regular unleaded gasoline.', 'StatCan Table 18-10-0001-01', 'MEAN', 'CSD_AND_ABOVE', 'Monthly survey.'),
      ('fuel_gas_delta_to_toronto', 'Gas Price Delta vs Toronto Benchmark', 'Commercial', 'Operating Cost', 'cents/litre', 'DERIVED', 'Absolute difference in retail pump price compared to Toronto reference price for identical month.', 'City Price - Toronto Price', 'MEAN', 'CSD_AND_ABOVE', 'Negative indicates cheaper fuel than Toronto.'),
      ('prop_multi_owner_pct', 'Multiple-Property Owner Share', 'Housing', 'Ownership', '%', 'DERIVED', 'Percentage of residential property owners owning more than one residential property.', '(Multiple Property Owners / Total Owners) * 100', 'MEAN', 'CSD_AND_ABOVE', 'Covers private individual property owners; excludes corporate ownership.'),
      ('prop_total_owners', 'Total Residential Property Owners', 'Housing', 'Ownership', 'owners', 'OBSERVED', 'Count of residential property owners residing in the municipality.', 'StatCan Table 46-10-0096-01', 'SUM', 'CSD_AND_ABOVE', 'CHSP administrative tax data matching.'),
      ('rental_average_rent_2bed', 'CMHC Average 2-Bedroom Rent', 'Housing', 'Rental', 'CAD/month', 'OBSERVED', 'Average monthly rent for purpose-built 2-bedroom apartments in structures of 3+ units.', 'CMHC Rental Market Survey', 'MEAN', 'CSD_AND_ABOVE', 'Purpose-built rental universe; excludes secondary condominium rental market.'),
      ('rental_vacancy_rate', 'CMHC Rental Vacancy Rate', 'Housing', 'Rental', '%', 'OBSERVED', 'Percentage of purpose-built rental apartment units vacant and available for immediate occupancy.', 'CMHC Rental Market Survey', 'MEAN', 'CSD_AND_ABOVE', 'October survey reference period.')
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      unit = EXCLUDED.unit,
      default_classification = EXCLUDED.default_classification,
      definition = EXCLUDED.definition,
      formula = EXCLUDED.formula,
      limitations = EXCLUDED.limitations;
  `;

  console.log('Registries initialized successfully.');
}

export async function checkSourceCapability(
  sourceFriendlyCode: string, 
  attributeGroup: string, 
  requestedResolution?: string
): Promise<{ authorized: boolean; reason?: string }> {
  const [source] = await sql`SELECT id, name FROM sources WHERE friendly_code = ${sourceFriendlyCode} OR id = ${sourceFriendlyCode};`;
  if (!source) {
    return { authorized: false, reason: `Unknown source code: '${sourceFriendlyCode}'` };
  }

  const [cap] = await sql`
    SELECT is_authorized, supported_resolutions, notes 
    FROM source_capabilities 
    WHERE source_id = ${source.id} AND attribute_group = ${attributeGroup};
  `;

  if (!cap) {
    return { authorized: false, reason: `No registered capability for source '${source.name}' and attribute '${attributeGroup}'` };
  }

  if (!cap.is_authorized) {
    return { authorized: false, reason: `Attribute '${attributeGroup}' is NOT authorized for source '${source.name}': ${cap.notes}` };
  }

  if (requestedResolution && cap.supported_resolutions && cap.supported_resolutions.length > 0) {
    if (!cap.supported_resolutions.includes(requestedResolution)) {
      return { 
        authorized: false, 
        reason: `Requested resolution '${requestedResolution}' is not supported by '${source.name}' (Supported: ${cap.supported_resolutions.join(', ')})` 
      };
    }
  }

  return { authorized: true };
}
