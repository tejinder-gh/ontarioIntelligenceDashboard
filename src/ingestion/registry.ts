import { sql } from '../db/index.js';

export async function initializeRegistries(): Promise<void> {
  console.log('Initializing Sources, Source Capabilities, Datasets, and Metrics Definitions...');

  // 1. Authoritative Sources
  await sql`
    INSERT INTO sources (id, name, organization_type, website_url, priority_rank, is_authoritative)
    VALUES 
      ('statcan', 'Statistics Canada', 'FEDERAL_GOV', 'https://www.statcan.gc.ca', 1, true),
      ('ontario_mmah', 'Ontario Ministry of Municipal Affairs and Housing', 'PROVINCIAL_GOV', 'https://www.ontario.ca/page/ministry-municipal-affairs-housing', 2, true),
      ('osm', 'OpenStreetMap Contributors', 'OPEN_DATA', 'https://www.openstreetmap.org', 4, true),
      ('sedar_fdd', 'Public Franchise Disclosures & Commercial Brokerage Benchmarks', 'REGULATORY_FILING', 'https://www.sedarplus.ca', 3, true)
    ON CONFLICT (id) DO UPDATE SET 
      name = EXCLUDED.name,
      website_url = EXCLUDED.website_url,
      priority_rank = EXCLUDED.priority_rank;
  `;

  // 2. Source Capabilities Registry (Enforces scope boundaries)
  await sql`
    INSERT INTO source_capabilities (source_id, attribute_group, is_authorized, supported_resolutions, notes)
    VALUES
      ('statcan', 'demographics', true, ARRAY['PROVINCE', 'CMA', 'CD', 'CSD'], 'Authoritative 2021 Census of Population profile'),
      ('statcan', 'income', true, ARRAY['PROVINCE', 'CMA', 'CD', 'CSD'], 'Authoritative Census income & after-tax distributions'),
      ('statcan', 'workforce', true, ARRAY['PROVINCE', 'CMA', 'CD', 'CSD'], 'Authoritative NOC 2021 occupations & NAICS 2022 industries'),
      ('statcan', 'business_counts', true, ARRAY['PROVINCE', 'CMA', 'CSD'], 'Canadian Business Counts by employee size classes'),
      ('statcan', 'spending', true, ARRAY['PROVINCE', 'CMA'], 'Survey of Household Spending: strictly Provincial & CMA resolution, NOT CSD'),
      ('statcan', 'wealth', true, ARRAY['PROVINCE', 'CMA'], 'Survey of Financial Security: strictly Provincial & CMA resolution, NOT CSD'),
      ('statcan', 'business_locations', false, ARRAY[]::text[], 'StatCan does not provide individual competitor locations or reviews'),
      ('ontario_mmah', 'municipal_budgets', true, ARRAY['CSD'], 'Official Financial Information Returns (FIR) multi-year reports'),
      ('ontario_mmah', 'municipal_registry', true, ARRAY['CSD'], 'Official Ontario Municipalities directory and municipal tiers'),
      ('osm', 'business_locations', true, ARRAY['CSD'], 'OSM-listed business locations and geographic coordinates; not verified complete coverage'),
      ('osm', 'reviews', false, ARRAY[]::text[], 'OpenStreetMap does not provide reliable review counts or rating scores'),
      ('osm', 'revenues', false, ARRAY[]::text[], 'OpenStreetMap does not supply financial revenues'),
      ('sedar_fdd', 'financial_benchmarks', true, ARRAY['PROVINCE', 'CMA', 'CSD'], 'Audited public franchise disclosures and commercial leasing benchmarks')
    ON CONFLICT (source_id, attribute_group) DO UPDATE SET
      is_authorized = EXCLUDED.is_authorized,
      supported_resolutions = EXCLUDED.supported_resolutions,
      notes = EXCLUDED.notes;
  `;

  // 3. Datasets Registry
  await sql`
    INSERT INTO datasets (id, source_id, name, dataset_code, reference_period, release_date, source_url, geographic_coverage, naics_version, update_frequency, stale_after_days)
    VALUES
      ('statcan_census_profile_2021', 'statcan', 'Census Profile, 2021 Census of Population', '98-401-X2021001', '2021', '2022-02-09', 'https://api.statcan.gc.ca/census-recensement/profile/sdmx/rest/data/STC_CP,DF_CSD,1.3/', 'CSD_ONTARIO', '2022 v1.0', 'QUENQUENNIAL', 1825),
      ('statcan_business_counts_2025_12', 'statcan', 'Canadian Business Counts, with employees, census metropolitan areas and census subdivisions', '33-10-1097-01', 'December 2025', '2026-03-04', 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3310109701', 'CSD_ONTARIO', '2022 v1.0', 'SEMI_ANNUAL', 180),
      ('ontario_municipalities_registry', 'ontario_mmah', 'List of Ontario Municipalities', 'MMAH-MUN-REG-2026', '2026', '2026-05-26', 'https://data.ontario.ca/dataset/municipalities', 'CSD_ONTARIO', NULL, 'ANNUAL', 365),
      ('ontario_fir_multiyear', 'ontario_mmah', 'Financial Information Return (FIR) Multi-Year Reports', 'FIR-2023-2024', '2023-2024', '2025-10-01', 'https://efis.fma.csc.gov.on.ca/fir/MultiYearReport/MYCIndex.html', 'CSD_ONTARIO', NULL, 'ANNUAL', 365),
      ('statcan_household_spending_shs', 'statcan', 'Survey of Household Spending, Detailed Expenditures', '11-10-0222-01', '2023-2024', '2025-05-21', 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1110022201', 'PROVINCE_ONTARIO', NULL, 'BIENNIAL', 730),
      ('statcan_financial_security_sfs', 'statcan', 'Survey of Financial Security, Assets and Debts', '11-10-0016-01', '2023', '2024-10-29', 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1110001601', 'PROVINCE_ONTARIO', NULL, 'TRIENNIAL', 1095),
      ('osm_business_entities', 'osm', 'OpenStreetMap Ontario Commercial Entities', 'OSM-OVERPASS-ON', '2026-Q1', '2026-01-15', 'https://overpass-api.de/api/interpreter', 'CSD_ONTARIO', NULL, 'MONTHLY', 30),
      ('commercial_listings_benchmarks', 'sedar_fdd', 'Commercial Listings, Franchise Disclosures & Retail Leasing Benchmarks', 'COMM-BENCH-2026', '2025-2026', '2026-02-01', 'https://www.sedarplus.ca', 'CSD_ONTARIO', '2022 v1.0', 'QUARTERLY', 90)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      reference_period = EXCLUDED.reference_period,
      source_url = EXCLUDED.source_url,
      updated_at = NOW();
  `;

  // 4. Metrics Definitions & Data Dictionary (Section 27)
  await sql`
    INSERT INTO metrics_definitions (id, name, category, subcategory, unit, definition, formula, preferred_aggregation, geographic_scope_supported, limitations)
    VALUES
      ('pop_total', 'Total Population', 'Demographics', 'Population', 'people', 'Total population counted in the Census of Population for private and collective dwellings.', 'StatCan Census Profile Characteristic 1', 'SUM', 'CSD_AND_ABOVE', 'Confidentiality adjustments applied to small areas.'),
      ('pop_growth_5yr', 'Population Growth (5-Year)', 'Demographics', 'Population', '%', 'Percentage population change between 2016 and 2021 Census.', '((Pop 2021 - Pop 2016) / Pop 2016) * 100', 'MEAN', 'CSD_AND_ABOVE', 'Boundary boundary adjustments may affect historical comparisons.'),
      ('pop_density', 'Population Density', 'Demographics', 'Population', 'people/sq km', 'Number of residents per square kilometre of land area.', 'Pop 2021 / Land Area sq km', 'WEIGHTED_AVG', 'CSD_AND_ABOVE', 'Rural areas within municipal boundaries dilute core urban density.'),
      ('pop_share_ontario', 'Share of Ontario Population', 'Demographics', 'Population', '%', 'Percentage of total Ontario population residing in the municipality.', '(Municipality Pop / Ontario Pop) * 100', 'SUM', 'CSD_AND_ABOVE', 'Directly computed from compatible 2021 Census reference period.'),
      ('income_median_hh', 'Median Household Total Income', 'Financial', 'Income', 'CAD', 'Median total income of private households in 2020.', 'StatCan Census Profile Characteristic 70', 'MEDIAN', 'CSD_AND_ABOVE', 'Income reflects calendar year 2020.'),
      ('income_average_hh', 'Average Household Total Income', 'Financial', 'Income', 'CAD', 'Mean total income of private households in 2020.', 'StatCan Census Profile Characteristic 69', 'MEAN', 'CSD_AND_ABOVE', 'Sensitive to high-income outliers.'),
      ('income_after_tax_median_hh', 'Median After-Tax Household Income', 'Financial', 'Income', 'CAD', 'Median after-tax income of private households in 2020.', 'StatCan Census Profile Characteristic 73', 'MEDIAN', 'CSD_AND_ABOVE', 'Reflects taxes paid and transfers received.'),
      ('shelter_cost_median_rent', 'Median Monthly Shelter Cost (Tenants)', 'Financial', 'Housing', 'CAD/month', 'Median monthly rent and utilities paid by tenant households.', 'StatCan Census Profile Housing Characteristic', 'MEDIAN', 'CSD_AND_ABOVE', 'Includes subsidized housing units.'),
      ('shelter_cost_median_owner', 'Median Monthly Owner Major Payments', 'Financial', 'Housing', 'CAD/month', 'Median monthly mortgage, property taxes, and condo fees for owners.', 'StatCan Census Profile Housing Characteristic', 'MEDIAN', 'CSD_AND_ABOVE', 'Excludes homes owned without mortgage.'),
      ('dwelling_value_average', 'Average Value of Dwellings', 'Financial', 'Housing', 'CAD', 'Average estimated market value of owner-occupied private dwellings.', 'StatCan Census Profile Housing Characteristic', 'MEAN', 'CSD_AND_ABOVE', 'Self-reported by owner occupants at Census date.'),
      ('labor_participation_rate', 'Labour Force Participation Rate', 'Workforce', 'Labour', '%', 'Total labour force expressed as a percentage of the population aged 15 and over.', '(Labour Force / Pop 15+) * 100', 'WEIGHTED_AVG', 'CSD_AND_ABOVE', 'Excludes institutional residents.'),
      ('labor_unemployment_rate', 'Unemployment Rate', 'Workforce', 'Labour', '%', 'Unemployed persons expressed as a percentage of the total labour force.', '(Unemployed / Labour Force) * 100', 'WEIGHTED_AVG', 'CSD_AND_ABOVE', 'Based on census week employment status.'),
      ('spending_food_restaurant', 'Food Purchased from Restaurants', 'Spending', 'Consumer', 'CAD/year', 'Average annual household expenditure on restaurant food and takeout.', 'StatCan Survey of Household Spending Table 11-10-0222-01', 'MEAN', 'PROVINCE_AND_CMA_ONLY', 'Survey sample size limits CSD municipal reporting. Displayed as CMA/Provincial benchmark.'),
      ('spending_shelter_total', 'Total Shelter Expenditure', 'Spending', 'Consumer', 'CAD/year', 'Average annual household expenditure on principal accommodation.', 'StatCan Survey of Household Spending Table 11-10-0222-01', 'MEAN', 'PROVINCE_AND_CMA_ONLY', 'Provincial/CMA benchmark; municipal data unavailable.'),
      ('net_worth_median_family', 'Median Family Net Worth', 'Financial', 'Wealth', 'CAD', 'Median total assets minus total debts of economic family units.', 'StatCan Survey of Financial Security Table 11-10-0016-01', 'MEDIAN', 'PROVINCE_AND_CMA_ONLY', 'Sample survey; municipal CSD resolution unavailable. Displayed as CMA/Provincial benchmark.'),
      ('net_worth_average_family', 'Average Family Net Worth', 'Financial', 'Wealth', 'CAD', 'Average total assets minus total debts of economic family units.', 'StatCan Survey of Financial Security Table 11-10-0016-01', 'MEAN', 'PROVINCE_AND_CMA_ONLY', 'Survey sample; not published at CSD municipal resolution.'),
      ('municipal_operating_budget', 'Municipal Operating Budget', 'Municipal', 'Budget', 'CAD', 'Total annual municipal operating expenditures reported in Schedule 40 of Ontario FIR.', 'Ontario MMAH FIR Schedule 40 Line 9910 Column 1', 'SUM', 'CSD_AND_ABOVE', 'Represents lower-tier or single-tier municipal operations.'),
      ('municipal_capital_expenditures', 'Municipal Capital Expenditures', 'Municipal', 'Budget', 'CAD', 'Total annual capital asset expenditures reported in Schedule 51 of Ontario FIR.', 'Ontario MMAH FIR Schedule 51 Line 9910 Column 1', 'SUM', 'CSD_AND_ABOVE', 'Lumpy year-over-year depending on major infrastructure cycles.'),
      ('municipal_taxation_revenue', 'Municipal Property Taxation Revenue', 'Municipal', 'Revenue', 'CAD', 'Total property tax revenue collected for own municipal purposes.', 'Ontario MMAH FIR Schedule 10 Line 9910 Column 1', 'SUM', 'CSD_AND_ABOVE', 'Excludes taxes collected on behalf of school boards.'),
      ('businesses_total_counts', 'Total Employer Establishments', 'Businesses', 'Counts', 'businesses', 'Active business locations with employees recorded in Canadian Business Counts.', 'StatCan Table 33-10-1097-01 December 2025', 'SUM', 'CSD_AND_ABOVE', 'Counts statistical locations; does not measure total employee headcount.'),
      ('businesses_per_1000_pop', 'Businesses per 1,000 Residents', 'Businesses', 'Density', 'businesses/1,000 pop', 'Ratio of active employer businesses to population.', '(Total Businesses / Pop) * 1000', 'MEAN', 'CSD_AND_ABOVE', 'Higher ratios indicate commercial hubs or employment centres.'),
      ('commercial_rent_retail_net', 'Average Retail Asking Net Rent', 'Commercial', 'Real Estate', 'CAD/sq ft/year', 'Average net asking annual rent per square foot for commercial retail plazas.', 'Commercial Real Estate Brokerage Reports (CBRE/Colliers)', 'MEDIAN', 'CSD_AND_ABOVE', 'Triple net (NNN) asking rate; excludes TMI additional rent.'),
      ('commercial_retail_vacancy', 'Retail Commercial Vacancy Rate', 'Commercial', 'Real Estate', '%', 'Percentage of available vacant retail square footage in the municipality.', 'Commercial Market Quarterly Survey', 'MEAN', 'CSD_AND_ABOVE', 'Varies significantly between prime retail corridors and secondary strips.')
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      unit = EXCLUDED.unit,
      definition = EXCLUDED.definition,
      formula = EXCLUDED.formula,
      limitations = EXCLUDED.limitations;
  `;

  // 5. Business Categories (NAICS 2022 Hierarchical Taxonomy, Section 64)
  await sql`
    INSERT INTO business_categories (id, display_name, naics_sector_code, naics_sector_name, naics_subsector_code, naics_code, naics_title, description, typical_sqft, typical_capex_min, typical_capex_max)
    VALUES
      ('pizza_store', 'Pizza Store / Pizzeria', '72', 'Accommodation and food services', '722', '722513', 'Limited-service eating places', 'Takeout, delivery, and quick-serve pizza restaurants.', 1200, 180000, 450000),
      ('full_service_restaurant', 'Full-Service Restaurant', '72', 'Accommodation and food services', '722', '722511', 'Full-service restaurants', 'Dine-in table service restaurants with full menu and bar.', 3200, 450000, 1200000),
      ('coffee_shop', 'Coffee Shop & Cafe', '72', 'Accommodation and food services', '722', '722515', 'Snack and non-alcoholic beverage bars', 'Specialty coffee shops, cafes, bakeries, and beverage kiosks.', 1500, 220000, 550000),
      ('convenience_store', 'Convenience Store', '44', 'Retail trade', '445', '445120', 'Convenience retailers and vending machines', 'Neighbourhood convenience, grocery sundries, and packaged foods.', 1800, 120000, 300000),
      ('child_daycare', 'Child Daycare Centre', '62', 'Health care and social assistance', '624', '624410', 'Child day-care services', 'Licensed full-time child care, infant care, and preschool facilities.', 4500, 350000, 900000),
      ('tutoring_center', 'Tutoring & Learning Centre', '61', 'Educational services', '611', '611691', 'Exam preparation and tutoring', 'Academic enrichment, STEM, language, and tutoring clinics.', 1600, 90000, 220000),
      ('gym_fitness', 'Gym & Fitness Studio', '71', 'Arts, entertainment and recreation', '713', '713940', 'Fitness and recreational sports centres', 'Health clubs, boutique fitness, crossfit, yoga, and personal training.', 4000, 250000, 850000),
      ('automotive_repair', 'Automotive Repair & Service', '81', 'Other services (except public administration)', '811', '811111', 'General automotive repair', 'Mechanical repair, brake, tire, diagnostics, and service bays.', 3500, 200000, 600000),
      ('car_detailing', 'Car Detailing & Wash', '81', 'Other services (except public administration)', '811', '811192', 'Car washes and detailing services', 'Auto aesthetic detailing, ceramic coatings, and car wash facilities.', 2500, 150000, 450000),
      ('retail_store', 'Specialty Retail Boutique', '44', 'Retail trade', '452', '452319', 'All other general merchandise stores', 'Specialty apparel, giftware, electronics, or hobby merchandise.', 2000, 100000, 350000),
      ('medical_clinic', 'Medical / Dental Clinic', '62', 'Health care and social assistance', '621', '621111', 'Offices of physicians and health specialists', 'Medical walk-in clinics, dental practices, and allied health.', 2400, 300000, 950000),
      ('professional_services', 'Accounting & Legal Practice', '54', 'Professional, scientific and technical services', '541', '541110', 'Offices of lawyers and legal services', 'Accounting, bookkeeping, legal, advisory, and consulting firms.', 1800, 75000, 200000),
      ('grocery_supermarket', 'Supermarket & Specialty Grocery', '44', 'Retail trade', '445', '445110', 'Supermarkets and other grocery retailers', 'Independent ethnic supermarkets, grocers, butcher, and fresh produce.', 8000, 600000, 2500000),
      ('home_services', 'Landscaping & Property Services', '56', 'Administrative and support services', '561', '561730', 'Landscaping services', 'Commercial/residential property maintenance, snow removal, landscape.', 2000, 120000, 350000),
      ('logistics_warehouse', 'Logistics & Courier Hub', '48', 'Transportation and warehousing', '484', '484110', 'General freight trucking, local', 'Local distribution, courier sorting, last-mile delivery depot.', 10000, 400000, 1500000)
    ON CONFLICT (id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      naics_sector_name = EXCLUDED.naics_sector_name,
      naics_title = EXCLUDED.naics_title,
      description = EXCLUDED.description,
      typical_sqft = EXCLUDED.typical_sqft,
      typical_capex_min = EXCLUDED.typical_capex_min,
      typical_capex_max = EXCLUDED.typical_capex_max;
  `;

  console.log('Registries initialized successfully.');
}
