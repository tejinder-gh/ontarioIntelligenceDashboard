-- ============================================================================
-- Ontario Economic & Business Intelligence Platform - PostgreSQL Relational Schema
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Geographies (Province, CMA, CD, CSD / Municipality, DA)
CREATE TABLE IF NOT EXISTS geographies (
    id VARCHAR(64) PRIMARY KEY,              -- e.g. 'CSD_3524002', 'PR_35', 'CMA_35535'
    dguid VARCHAR(64) UNIQUE,                 -- Statistics Canada Dissemination Geography Unique ID
    name VARCHAR(255) NOT NULL,              -- e.g. 'Burlington', 'Ontario', 'Toronto'
    display_name VARCHAR(255) NOT NULL,      -- e.g. 'Burlington, City of (Halton)'
    geo_type VARCHAR(32) NOT NULL,           -- 'PROVINCE', 'CMA', 'CA', 'CD', 'CSD'
    csd_type VARCHAR(64),                    -- 'City', 'Town', 'Township', 'Municipality'
    census_division VARCHAR(128),            -- e.g. 'Halton', 'Peel', 'Simcoe'
    parent_id VARCHAR(64) REFERENCES geographies(id),
    land_area_sqkm NUMERIC(12, 2),
    latitude NUMERIC(10, 6),
    longitude NUMERIC(10, 6),
    population_2021 INTEGER,
    population_2016 INTEGER,
    population_growth_pct NUMERIC(6, 2),
    ontario_pop_share_pct NUMERIC(6, 3),    -- dynamically derived or verified: pop / ontario_pop * 100
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geographies_type ON geographies(geo_type);
CREATE INDEX IF NOT EXISTS idx_geographies_name ON geographies(name);
CREATE INDEX IF NOT EXISTS idx_geographies_parent ON geographies(parent_id);

-- 2. Geographic Aliases (for search and mapping)
CREATE TABLE IF NOT EXISTS geographic_aliases (
    id SERIAL PRIMARY KEY,
    geography_id VARCHAR(64) NOT NULL REFERENCES geographies(id) ON DELETE CASCADE,
    alias_name VARCHAR(255) NOT NULL,
    normalized_alias VARCHAR(255) NOT NULL,
    UNIQUE(geography_id, normalized_alias)
);

CREATE INDEX IF NOT EXISTS idx_geo_aliases_norm ON geographic_aliases(normalized_alias);

-- 3. Sources Registry
CREATE TABLE IF NOT EXISTS sources (
    id VARCHAR(64) PRIMARY KEY,              -- 'statcan', 'ontario_mmah', 'osm', 'sedar_fdd'
    name VARCHAR(255) NOT NULL,              -- 'Statistics Canada', 'Ontario Ministry of Municipal Affairs'
    organization_type VARCHAR(64) NOT NULL,  -- 'FEDERAL_GOV', 'PROVINCIAL_GOV', 'MUNICIPAL_GOV', 'OPEN_DATA', 'REGULATORY_FILING'
    website_url TEXT NOT NULL,
    priority_rank INTEGER NOT NULL,          -- 1 (highest) to 10 (lowest)
    is_authoritative BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Source Capabilities Registry (Enforces authorized scopes per Section 11 of User Spec)
CREATE TABLE IF NOT EXISTS source_capabilities (
    id SERIAL PRIMARY KEY,
    source_id VARCHAR(64) NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    attribute_group VARCHAR(64) NOT NULL,    -- 'demographics', 'income', 'business_locations', 'ratings', 'municipal_budgets', 'wealth'
    is_authorized BOOLEAN DEFAULT TRUE,
    supported_resolutions TEXT[] NOT NULL,    -- ARRAY['PROVINCE', 'CMA', 'CSD']
    notes TEXT,
    UNIQUE(source_id, attribute_group)
);

-- 5. Datasets (Versioned registries with URLs, reference periods and superseding references)
CREATE TABLE IF NOT EXISTS datasets (
    id VARCHAR(128) PRIMARY KEY,             -- e.g. 'statcan_census_profile_2021', 'statcan_business_counts_2025_12'
    source_id VARCHAR(64) NOT NULL REFERENCES sources(id),
    name VARCHAR(255) NOT NULL,
    dataset_code VARCHAR(64),                -- '98-401-X2021001', '33-10-1097-01', '11-10-0222-01'
    reference_period VARCHAR(64) NOT NULL,   -- '2021', 'December 2025', '2023-2024'
    release_date DATE,
    source_url TEXT NOT NULL,
    geographic_coverage VARCHAR(64) NOT NULL,-- 'CSD_CANADA', 'CSD_ONTARIO', 'PROVINCE_ONTARIO'
    naics_version VARCHAR(32),               -- '2022 v1.0', '2017'
    update_frequency VARCHAR(32),            -- 'QUENQUENNIAL', 'SEMI_ANNUAL', 'ANNUAL', 'CONTINUOUS'
    superseding_dataset_id VARCHAR(128),
    etag VARCHAR(255),
    last_modified_header VARCHAR(255),
    stale_after_days INTEGER DEFAULT 365,
    is_current BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Ingestion Runs (Audit trail for synchronization)
CREATE TABLE IF NOT EXISTS ingestion_runs (
    id SERIAL PRIMARY KEY,
    dataset_id VARCHAR(128) NOT NULL REFERENCES datasets(id),
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    status VARCHAR(32) NOT NULL,             -- 'RUNNING', 'COMPLETED', 'FAILED', 'NOT_MODIFIED'
    rows_fetched INTEGER DEFAULT 0,
    rows_inserted INTEGER DEFAULT 0,
    rows_updated INTEGER DEFAULT 0,
    rows_rejected INTEGER DEFAULT 0,
    error_message TEXT,
    checksum VARCHAR(128),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Layer 1: Raw Ingestion Records (Full provenance preserving original payloads)
CREATE TABLE IF NOT EXISTS raw_ingestion_records (
    id BIGSERIAL PRIMARY KEY,
    ingestion_run_id INTEGER NOT NULL REFERENCES ingestion_runs(id),
    dataset_id VARCHAR(128) NOT NULL REFERENCES datasets(id),
    external_record_id VARCHAR(255),
    raw_payload JSONB NOT NULL,
    retrieved_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_raw_records_ds_ext ON raw_ingestion_records(dataset_id, external_record_id);

-- 8. Metrics Definitions & Data Dictionary (Section 27)
CREATE TABLE IF NOT EXISTS metrics_definitions (
    id VARCHAR(64) PRIMARY KEY,              -- 'pop_total', 'income_median_hh', 'spending_food_restaurants'
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,           -- 'Demographics', 'Financial', 'Workforce', 'Businesses', 'Spending', 'Municipal'
    subcategory VARCHAR(64),
    unit VARCHAR(64) NOT NULL,               -- 'people', 'CAD', 'CAD/year', 'businesses/10k pop', '%'
    definition TEXT NOT NULL,
    formula TEXT,
    preferred_aggregation VARCHAR(32),       -- 'SUM', 'MEDIAN', 'MEAN', 'WEIGHTED_AVG'
    geographic_scope_supported VARCHAR(64),  -- 'CSD_AND_ABOVE', 'PROVINCE_AND_CMA_ONLY'
    limitations TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Layer 2: Normalized Observations Fact Table
CREATE TABLE IF NOT EXISTS observations (
    id BIGSERIAL PRIMARY KEY,
    geography_id VARCHAR(64) NOT NULL REFERENCES geographies(id) ON DELETE CASCADE,
    metric_id VARCHAR(64) NOT NULL REFERENCES metrics_definitions(id),
    reference_year INTEGER NOT NULL,
    value_numeric NUMERIC(16, 4),
    value_text TEXT,
    unit VARCHAR(64) NOT NULL,
    geographic_resolution VARCHAR(32) NOT NULL, -- 'CSD', 'CMA', 'PROVINCE', 'CANADA'
    is_benchmark BOOLEAN DEFAULT FALSE,
    benchmark_label VARCHAR(128),              -- e.g. 'Toronto CMA benchmark — not Burlington-specific'
    source_id VARCHAR(64) NOT NULL REFERENCES sources(id),
    dataset_id VARCHAR(128) NOT NULL REFERENCES datasets(id),
    confidence VARCHAR(32) DEFAULT 'HIGH',     -- 'HIGH', 'MEDIUM', 'LOW', 'BENCHMARK'
    is_estimate BOOLEAN DEFAULT FALSE,
    methodology_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE NULLS NOT DISTINCT (geography_id, metric_id, reference_year, is_benchmark, benchmark_label)
);

CREATE INDEX IF NOT EXISTS idx_obs_geo_metric ON observations(geography_id, metric_id);
CREATE INDEX IF NOT EXISTS idx_obs_metric_year ON observations(metric_id, reference_year);

-- 10. Census Demographics: Structured Dynamic Breakdown (Section 5 & 6)
CREATE TABLE IF NOT EXISTS census_demographics (
    id SERIAL PRIMARY KEY,
    geography_id VARCHAR(64) NOT NULL REFERENCES geographies(id) ON DELETE CASCADE,
    reference_year INTEGER NOT NULL DEFAULT 2021,
    dimension_type VARCHAR(64) NOT NULL,     -- 'ETHNIC_ORIGIN', 'VISIBLE_MINORITY', 'MOTHER_TONGUE', 'AGE_GROUP', 'HOUSEHOLD_TYPE'
    category_code VARCHAR(128),
    category_label VARCHAR(255) NOT NULL,    -- e.g. 'Italian', 'South Asian', 'Age 25 to 44', 'Couples with children'
    count_total INTEGER NOT NULL,
    count_men INTEGER,
    count_women INTEGER,
    percentage_share NUMERIC(6, 2),
    dataset_id VARCHAR(128) NOT NULL REFERENCES datasets(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(geography_id, reference_year, dimension_type, category_label)
);

CREATE INDEX IF NOT EXISTS idx_demog_geo_dim ON census_demographics(geography_id, dimension_type);

-- 11. Census Workforce: Dynamic Occupations (NOC 2021) & Industries (NAICS 2022) (Section 12)
CREATE TABLE IF NOT EXISTS census_workforce (
    id SERIAL PRIMARY KEY,
    geography_id VARCHAR(64) NOT NULL REFERENCES geographies(id) ON DELETE CASCADE,
    reference_year INTEGER NOT NULL DEFAULT 2021,
    dimension_type VARCHAR(32) NOT NULL,     -- 'OCCUPATION_NOC', 'INDUSTRY_NAICS', 'COMMUTE_MODE'
    code VARCHAR(32) NOT NULL,               -- NOC code or NAICS code
    label VARCHAR(255) NOT NULL,             -- e.g. 'Food counter attendants', 'Full-service restaurants'
    employed_count INTEGER NOT NULL,
    percentage_of_workforce NUMERIC(6, 2),
    median_employment_income NUMERIC(12, 2),
    average_employment_income NUMERIC(12, 2),
    dataset_id VARCHAR(128) NOT NULL REFERENCES datasets(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(geography_id, reference_year, dimension_type, code)
);

CREATE INDEX IF NOT EXISTS idx_workforce_geo_dim ON census_workforce(geography_id, dimension_type);

-- 12. Municipal Financial Profile: Ontario MMAH FIR Multi-Year Statements (Section 11)
CREATE TABLE IF NOT EXISTS municipal_finances (
    id SERIAL PRIMARY KEY,
    geography_id VARCHAR(64) NOT NULL REFERENCES geographies(id) ON DELETE CASCADE,
    fiscal_year INTEGER NOT NULL,
    schedule_code VARCHAR(32) NOT NULL,      -- 'SLC_10' (Revenues), 'SLC_40' (Operating Expenses), 'SLC_51' (Capital)
    account_category VARCHAR(128) NOT NULL,  -- 'General Government', 'Transportation - Roads', 'Transportation - Transit', 'Protection - Police', 'Protection - Fire', 'Parks & Recreation', 'Planning & Development'
    amount_dollars NUMERIC(16, 2) NOT NULL,
    pct_of_total_budget NUMERIC(6, 2),
    per_capita_dollars NUMERIC(12, 2),
    dataset_id VARCHAR(128) NOT NULL REFERENCES datasets(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(geography_id, fiscal_year, schedule_code, account_category)
);

CREATE INDEX IF NOT EXISTS idx_munfin_geo_year ON municipal_finances(geography_id, fiscal_year);

-- 13. Household Expenditures: Survey of Household Spending (Section 10)
CREATE TABLE IF NOT EXISTS household_expenditures (
    id SERIAL PRIMARY KEY,
    geography_id VARCHAR(64) NOT NULL REFERENCES geographies(id) ON DELETE CASCADE,
    reference_year INTEGER NOT NULL,
    expenditure_category VARCHAR(128) NOT NULL, -- 'Food from stores', 'Food from restaurants', 'Shelter', 'Transportation - Vehicles', 'Recreation', 'Health care'
    average_spending_cad NUMERIC(12, 2) NOT NULL,
    pct_of_total_expenditure NUMERIC(6, 2),
    geographic_resolution VARCHAR(32) NOT NULL, -- 'PROVINCE', 'CMA'
    is_benchmark BOOLEAN DEFAULT TRUE,
    benchmark_note TEXT,
    dataset_id VARCHAR(128) NOT NULL REFERENCES datasets(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(geography_id, reference_year, expenditure_category)
);

-- 14. Wealth & Net Worth Benchmarks: Survey of Financial Security (Section 9)
CREATE TABLE IF NOT EXISTS wealth_benchmarks (
    id SERIAL PRIMARY KEY,
    geography_id VARCHAR(64) NOT NULL REFERENCES geographies(id) ON DELETE CASCADE,
    reference_year INTEGER NOT NULL,
    family_type VARCHAR(64) NOT NULL,        -- 'All family units', 'Economic families', 'Persons not in an economic family'
    median_net_worth_cad NUMERIC(14, 2) NOT NULL,
    average_net_worth_cad NUMERIC(14, 2) NOT NULL,
    median_assets_cad NUMERIC(14, 2),
    median_debt_cad NUMERIC(14, 2),
    debt_to_asset_ratio NUMERIC(6, 2),
    geographic_resolution VARCHAR(32) NOT NULL, -- 'PROVINCE', 'CMA'
    is_benchmark BOOLEAN DEFAULT TRUE,
    benchmark_note TEXT NOT NULL,
    dataset_id VARCHAR(128) NOT NULL REFERENCES datasets(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(geography_id, reference_year, family_type)
);

-- 15. Business Categories Taxonomy (NAICS 2022 Hierarchical, Section 64)
CREATE TABLE IF NOT EXISTS business_categories (
    id VARCHAR(64) PRIMARY KEY,              -- 'pizza_store', 'full_service_restaurant', 'daycare', 'tutoring_center', 'gym', 'auto_repair'
    display_name VARCHAR(128) NOT NULL,
    naics_sector_code VARCHAR(8) NOT NULL,   -- e.g. '72'
    naics_sector_name VARCHAR(128) NOT NULL, -- 'Accommodation and food services'
    naics_subsector_code VARCHAR(8) NOT NULL,-- '722'
    naics_code VARCHAR(16) NOT NULL,         -- '722513'
    naics_title VARCHAR(255) NOT NULL,       -- 'Limited-service eating places'
    description TEXT,
    typical_sqft INTEGER,
    typical_capex_min NUMERIC(12, 2),
    typical_capex_max NUMERIC(12, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Businesses & Locations (OSM-listed and Directory locations, Section 17 & 18)
CREATE TABLE IF NOT EXISTS businesses (
    id VARCHAR(64) PRIMARY KEY,              -- e.g. 'osm_node_1234567'
    name VARCHAR(255) NOT NULL,
    category_id VARCHAR(64) NOT NULL REFERENCES business_categories(id),
    geography_id VARCHAR(64) NOT NULL REFERENCES geographies(id),
    naics_code VARCHAR(16),
    address VARCHAR(255),
    city VARCHAR(128) NOT NULL,
    postal_code VARCHAR(16),
    latitude NUMERIC(10, 6) NOT NULL,
    longitude NUMERIC(10, 6) NOT NULL,
    is_chain BOOLEAN DEFAULT FALSE,
    brand_name VARCHAR(128),
    source_type VARCHAR(64) NOT NULL,        -- 'OSM_LISTED', 'MUNICIPAL_OPEN_DATA', 'BUSINESS_DIRECTORY'
    source_element_id VARCHAR(128),
    tags JSONB,
    first_observed_at TIMESTAMPTZ DEFAULT NOW(),
    last_confirmed_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_businesses_geo_cat ON businesses(geography_id, category_id);
CREATE INDEX IF NOT EXISTS idx_businesses_coords ON businesses(latitude, longitude);

-- 17. Business Reviews (Independent Provider Adapter, Section 17 & User Instruction #7)
CREATE TABLE IF NOT EXISTS business_reviews (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    provider_name VARCHAR(64) NOT NULL,      -- 'google_places', 'yelp', 'unconfigured'
    rating NUMERIC(3, 2),
    review_count INTEGER,
    price_level VARCHAR(8),                  -- '$', '$$', '$$$'
    distribution_json JSONB,
    retrieved_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, provider_name)
);

-- 18. Commercial Business Listings & Sales History (Section 19, 20, 21 & User Instruction #8)
CREATE TABLE IF NOT EXISTS business_listings (
    id SERIAL PRIMARY KEY,
    listing_uid VARCHAR(128) UNIQUE NOT NULL,
    category_id VARCHAR(64) NOT NULL REFERENCES business_categories(id),
    geography_id VARCHAR(64) NOT NULL REFERENCES geographies(id),
    business_name VARCHAR(255),
    address VARCHAR(255),
    asking_price NUMERIC(14, 2) NOT NULL,    -- Strictly separate
    confirmed_sale_price NUMERIC(14, 2),     -- Strictly NULL unless legally confirmed
    status VARCHAR(32) NOT NULL,             -- 'ACTIVE', 'REMOVED', 'EXPIRED', 'RELISTED', 'PRICE_CHANGED', 'CONFIRMED_SOLD', 'UNKNOWN'
    revenue_disclosed NUMERIC(14, 2),
    sde_cashflow_disclosed NUMERIC(14, 2),
    monthly_rent NUMERIC(10, 2),
    square_footage INTEGER,
    franchise_brand VARCHAR(128),
    broker_name VARCHAR(128),
    source_url TEXT,
    first_listed_date DATE NOT NULL,
    last_active_date DATE NOT NULL,
    repeated_listing_parent_id INTEGER REFERENCES business_listings(id),
    match_confidence NUMERIC(4, 2),          -- 0.00 to 1.00
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listings_geo_cat ON business_listings(geography_id, category_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON business_listings(status);

-- 19. Commercial Real Estate Benchmarks (Section 16 & 17)
CREATE TABLE IF NOT EXISTS commercial_real_estate (
    id SERIAL PRIMARY KEY,
    geography_id VARCHAR(64) NOT NULL REFERENCES geographies(id) ON DELETE CASCADE,
    property_type VARCHAR(64) NOT NULL,      -- 'RETAIL_STRIP_PLAZA', 'RETAIL_STREETFRONT', 'COMMERCIAL_OFFICE', 'INDUSTRIAL'
    net_rent_sqft_cad NUMERIC(8, 2) NOT NULL,
    tmi_additional_rent_sqft_cad NUMERIC(8, 2) NOT NULL,
    gross_rent_sqft_cad NUMERIC(8, 2) NOT NULL,
    vacancy_rate_pct NUMERIC(5, 2) NOT NULL,
    reference_period VARCHAR(32) NOT NULL,   -- '2024-Q4', '2025-Q1'
    source_report VARCHAR(255) NOT NULL,     -- 'CBRE Canada Retail Report', 'Colliers GTA Retail'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(geography_id, property_type, reference_period)
);

-- 20. Verifiable Revenue Benchmark Chains (Section 22 & User Instruction #10)
CREATE TABLE IF NOT EXISTS revenue_benchmark_chains (
    id SERIAL PRIMARY KEY,
    category_id VARCHAR(64) NOT NULL REFERENCES business_categories(id),
    geography_id VARCHAR(64) NOT NULL REFERENCES geographies(id),
    naics_code VARCHAR(16) NOT NULL,
    source_dataset VARCHAR(128) NOT NULL,
    reference_year INTEGER NOT NULL,
    low_annual_revenue NUMERIC(14, 2) NOT NULL,
    median_annual_revenue NUMERIC(14, 2) NOT NULL,
    avg_annual_revenue NUMERIC(14, 2) NOT NULL,
    high_annual_revenue NUMERIC(14, 2) NOT NULL,
    cogs_pct NUMERIC(5, 2) NOT NULL,
    labor_pct NUMERIC(5, 2) NOT NULL,
    rent_pct NUMERIC(5, 2) NOT NULL,
    sde_ebitda_pct NUMERIC(5, 2) NOT NULL,
    assumptions TEXT NOT NULL,
    adjustment_methodology TEXT NOT NULL,
    confidence VARCHAR(32) DEFAULT 'MEDIUM',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category_id, geography_id, reference_year)
);

-- 21. Layer 3: Derived Analytics & Precomputed Statistics (Section 44)
CREATE TABLE IF NOT EXISTS derived_analytics (
    id SERIAL PRIMARY KEY,
    geography_id VARCHAR(64) NOT NULL REFERENCES geographies(id) ON DELETE CASCADE,
    metric_id VARCHAR(64) NOT NULL REFERENCES metrics_definitions(id),
    reference_year INTEGER NOT NULL,
    mean_value NUMERIC(16, 4),
    median_value NUMERIC(16, 4),
    min_value NUMERIC(16, 4),
    max_value NUMERIC(16, 4),
    std_dev NUMERIC(16, 4),
    percentile_rank NUMERIC(6, 2),
    z_score NUMERIC(8, 4),
    iqr_value NUMERIC(16, 4),
    skewness NUMERIC(8, 4),
    is_outlier BOOLEAN DEFAULT FALSE,
    outlier_reason TEXT,
    ontario_rank INTEGER,
    total_geographies_ranked INTEGER,
    recalculated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(geography_id, metric_id, reference_year)
);

CREATE INDEX IF NOT EXISTS idx_derived_geo_metric ON derived_analytics(geography_id, metric_id);
CREATE INDEX IF NOT EXISTS idx_derived_outlier ON derived_analytics(is_outlier);

-- 22. Data Coverage Analytics Reports (Section 62 & User Instruction #15)
CREATE TABLE IF NOT EXISTS data_coverage_reports (
    id SERIAL PRIMARY KEY,
    geography_id VARCHAR(64) NOT NULL REFERENCES geographies(id) ON DELETE CASCADE,
    demographics_coverage_pct NUMERIC(5, 2) NOT NULL,
    income_coverage_pct NUMERIC(5, 2) NOT NULL,
    workforce_coverage_pct NUMERIC(5, 2) NOT NULL,
    competitor_locations_coverage_pct NUMERIC(5, 2) NOT NULL,
    ratings_coverage_status VARCHAR(64) NOT NULL, -- 'UNAVAILABLE', 'PARTIAL', 'COMPLETE'
    commercial_rent_coverage_pct NUMERIC(5, 2) NOT NULL,
    confirmed_transactions_pct NUMERIC(5, 2) NOT NULL,
    overall_confidence VARCHAR(32) NOT NULL,     -- 'HIGH', 'MEDIUM', 'LOW'
    confidence_rationale TEXT NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(geography_id)
);
