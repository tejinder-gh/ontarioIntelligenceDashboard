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
    geo_type VARCHAR(32) NOT NULL,           -- 'PROVINCE', 'CMA', 'CA', 'CD', 'CSD', 'DISSEMINATION_AREA'
    csd_type VARCHAR(64),                    -- 'City', 'Town', 'Township', 'Municipality'
    municipal_tier VARCHAR(32) CHECK (municipal_tier IN ('SINGLE_TIER', 'UPPER_TIER', 'LOWER_TIER', 'UNORGANIZED')),
    census_division VARCHAR(128),            -- e.g. 'Halton', 'Peel', 'Simcoe'
    census_division_id VARCHAR(64) REFERENCES geographies(id),
    cma_id VARCHAR(64) REFERENCES geographies(id),
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
CREATE INDEX IF NOT EXISTS idx_geographies_tier ON geographies(municipal_tier);
CREATE INDEX IF NOT EXISTS idx_geographies_name ON geographies(name);
CREATE INDEX IF NOT EXISTS idx_geographies_parent ON geographies(parent_id);
CREATE INDEX IF NOT EXISTS idx_geographies_cd_id ON geographies(census_division_id);
CREATE INDEX IF NOT EXISTS idx_geographies_cma_id ON geographies(cma_id);

-- 2. Geographic Aliases (for search and mapping)
CREATE TABLE IF NOT EXISTS geographic_aliases (
    id SERIAL PRIMARY KEY,
    geography_id VARCHAR(64) NOT NULL REFERENCES geographies(id) ON DELETE CASCADE,
    alias_name VARCHAR(255) NOT NULL,
    normalized_alias VARCHAR(255) NOT NULL,
    UNIQUE(geography_id, normalized_alias)
);

CREATE INDEX IF NOT EXISTS idx_geo_aliases_norm ON geographic_aliases(normalized_alias);

-- 3. Sources Registry (Sections 5 & 6)
CREATE TABLE IF NOT EXISTS sources (
    id VARCHAR(64) PRIMARY KEY,              -- 'statcan', 'ontario_mmah', 'osm', 'sedar_fdd', etc.
    friendly_code VARCHAR(64) UNIQUE,        -- 'DEM-CEN21', 'POP-CSD-EST', 'BUS-CNT-CSD', 'FUEL-RETAIL', etc.
    name VARCHAR(255) NOT NULL,              -- 'Statistics Canada', 'Ontario Ministry of Municipal Affairs'
    organization_type VARCHAR(64) NOT NULL,  -- 'FEDERAL_GOV', 'PROVINCIAL_GOV', 'MUNICIPAL_GOV', 'OPEN_DATA', 'REGULATORY_FILING'
    official_dataset_id VARCHAR(64),         -- e.g. '98-316-X2021001', '17-10-0155-01'
    website_url TEXT NOT NULL,
    frequency VARCHAR(32),                   -- 'QUENQUENNIAL', 'ANNUAL', 'SEMI_ANNUAL', 'MONTHLY', 'DAILY'
    supported_geography VARCHAR(64),         -- 'PROVINCE', 'CMA', 'CD', 'CSD'
    licence_rules TEXT,
    cache_policy TEXT,
    last_checked TIMESTAMPTZ,
    last_changed TIMESTAMPTZ,
    priority_rank INTEGER NOT NULL,          -- 1 (highest) to 10 (lowest)
    is_authoritative BOOLEAN DEFAULT TRUE,
    official_publisher VARCHAR(255),
    doi VARCHAR(128),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Source Capabilities Registry (Legacy & Source-Level)
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
    dataset_code VARCHAR(64),                -- '98-401-X2021001', '33-10-1176-01', '11-10-0222-01'
    reference_period VARCHAR(64) NOT NULL,   -- '2021', 'June 2026', '2023-2024'
    release_date DATE,
    source_url TEXT NOT NULL,
    doi VARCHAR(128),
    official_publisher VARCHAR(255),
    geographic_coverage VARCHAR(64) NOT NULL,-- 'CSD_CANADA', 'CSD_ONTARIO', 'PROVINCE_ONTARIO'
    naics_version VARCHAR(32),               -- '2022 v1.0', '2017'
    update_frequency VARCHAR(32),            -- 'QUENQUENNIAL', 'SEMI_ANNUAL', 'ANNUAL', 'CONTINUOUS'
    classification VARCHAR(32) CHECK (classification IN ('OBSERVED', 'BENCHMARK', 'DERIVED', 'MODELED')) DEFAULT 'OBSERVED',
    superseding_dataset_id VARCHAR(128),
    checksum VARCHAR(128),
    etag VARCHAR(255),
    last_modified_header VARCHAR(255),
    stale_after_days INTEGER DEFAULT 365,
    is_current BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5a. Dataset Versions (Audit trail and historical lineage per Section 40)
CREATE TABLE IF NOT EXISTS dataset_versions (
    id VARCHAR(128) PRIMARY KEY,
    dataset_id VARCHAR(128) NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    version_tag VARCHAR(64) NOT NULL,
    reference_period VARCHAR(64) NOT NULL,
    release_date DATE,
    source_url TEXT NOT NULL,
    checksum VARCHAR(128),
    etag VARCHAR(255),
    last_modified VARCHAR(255),
    ingested_at TIMESTAMPTZ DEFAULT NOW(),
    is_current BOOLEAN DEFAULT TRUE,
    supersedes_version_id VARCHAR(128),
    record_count INTEGER DEFAULT 0,
    change_summary TEXT
);

CREATE INDEX IF NOT EXISTS idx_ds_versions_ds ON dataset_versions(dataset_id);

-- 5b. Dataset Capabilities Registry (Granular Positive & Negative Capability Enforcement)
CREATE TABLE IF NOT EXISTS dataset_capabilities (
    id SERIAL PRIMARY KEY,
    dataset_id VARCHAR(128) NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    source_id VARCHAR(64) NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    attribute_group VARCHAR(64) NOT NULL,
    capability_name VARCHAR(128) NOT NULL,
    is_provided BOOLEAN NOT NULL DEFAULT TRUE, -- TRUE = yes, FALSE = no
    supported_resolutions TEXT[] DEFAULT ARRAY[]::TEXT[],
    notes TEXT,
    constraints TEXT,
    UNIQUE(dataset_id, attribute_group, capability_name)
);

CREATE INDEX IF NOT EXISTS idx_ds_caps_ds ON dataset_capabilities(dataset_id);
CREATE INDEX IF NOT EXISTS idx_ds_caps_attr ON dataset_capabilities(attribute_group);

-- 5c. Dataset Geographies Registry (Allowed geographic resolutions per Section 40)
CREATE TABLE IF NOT EXISTS dataset_geographies (
    id SERIAL PRIMARY KEY,
    dataset_id VARCHAR(128) NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    geographic_resolution VARCHAR(32) NOT NULL, -- 'CANADA', 'PROVINCE', 'CMA', 'CA', 'CD', 'CSD', 'DA'
    notes TEXT,
    UNIQUE(dataset_id, geographic_resolution)
);

-- 5d. Dataset Refresh Policies (Section 34 & Section 40)
CREATE TABLE IF NOT EXISTS dataset_refresh_policies (
    id SERIAL PRIMARY KEY,
    dataset_id VARCHAR(128) NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    source_id VARCHAR(64) NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    frequency VARCHAR(32) NOT NULL, -- 'ANNUAL', 'SEMI_ANNUAL', 'MONTHLY', 'QUENQUENNIAL', 'DAILY', 'ON_DEMAND'
    stale_after_days INTEGER NOT NULL DEFAULT 365,
    check_cadence VARCHAR(64) NOT NULL,
    policy_description TEXT NOT NULL,
    next_check_expected DATE,
    UNIQUE(dataset_id)
);

-- 5e. Dataset Licence Rules (Provider Restrictions & Storage Policies per Section 40)
CREATE TABLE IF NOT EXISTS dataset_licence_rules (
    id SERIAL PRIMARY KEY,
    dataset_id VARCHAR(128) NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    source_id VARCHAR(64) NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    licence_name VARCHAR(255) NOT NULL,
    licence_url TEXT,
    permissions_summary TEXT,
    restrictions_summary TEXT,
    max_cache_duration_hours INTEGER, -- e.g. 24 for Yelp Places
    can_persist_identifiers_only BOOLEAN DEFAULT FALSE, -- e.g. Google Place IDs or Yelp IDs
    attribution_required BOOLEAN DEFAULT FALSE,
    attribution_text TEXT,
    UNIQUE(dataset_id)
);

-- 5f. Dataset Dependencies (Dependency Graph per Section 40)
CREATE TABLE IF NOT EXISTS dataset_dependencies (
    id SERIAL PRIMARY KEY,
    dependent_dataset_id VARCHAR(128) NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    prerequisite_dataset_id VARCHAR(128) NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    dependency_type VARCHAR(64) NOT NULL, -- 'TAXONOMY', 'GEOGRAPHY_PARENT', 'BENCHMARK_BASE', 'PER_CAPITA_POPULATION', 'SUPERSESSION'
    notes TEXT,
    UNIQUE(dependent_dataset_id, prerequisite_dataset_id, dependency_type)
);

-- 5g. Source Disagreements Ledger (Discrepancy Resolution per Section 36)
CREATE TABLE IF NOT EXISTS source_disagreements (
    id SERIAL PRIMARY KEY,
    metric_id VARCHAR(64) NOT NULL REFERENCES metrics_definitions(id),
    geography_id VARCHAR(64) NOT NULL REFERENCES geographies(id),
    reference_period VARCHAR(64) NOT NULL,
    source_a_id VARCHAR(64) NOT NULL REFERENCES sources(id),
    value_a NUMERIC(16, 4),
    source_b_id VARCHAR(64) NOT NULL REFERENCES sources(id),
    value_b NUMERIC(16, 4),
    discrepancy_pct NUMERIC(6, 2),
    preferred_source_id VARCHAR(64) REFERENCES sources(id),
    selection_rationale TEXT,
    detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5h. Coverage Gaps Ledger (Tracking Unsupported Resolution Requests per Section 39)
CREATE TABLE IF NOT EXISTS coverage_gaps (
    id SERIAL PRIMARY KEY,
    requested_metric VARCHAR(64) NOT NULL,
    requested_geography VARCHAR(64) NOT NULL,
    closest_available_geography VARCHAR(64),
    sources_checked TEXT[] NOT NULL,
    reason TEXT NOT NULL,
    fallback_benchmark_code VARCHAR(64),
    user_context TEXT,
    requested_at TIMESTAMPTZ DEFAULT NOW()
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
    default_classification VARCHAR(32) CHECK (default_classification IN ('OBSERVED', 'BENCHMARK', 'DERIVED', 'MODELED')) DEFAULT 'OBSERVED',
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
    metric_classification VARCHAR(32) CHECK (metric_classification IN ('OBSERVED', 'BENCHMARK', 'DERIVED', 'MODELED')) DEFAULT 'OBSERVED',
    source_id VARCHAR(64) NOT NULL REFERENCES sources(id),
    dataset_id VARCHAR(128) NOT NULL REFERENCES datasets(id),
    confidence VARCHAR(32) DEFAULT 'HIGH',     -- 'HIGH', 'MEDIUM', 'LOW', 'BENCHMARK'
    is_estimate BOOLEAN DEFAULT FALSE,
    methodology_notes TEXT,
    vintage_date DATE DEFAULT CURRENT_DATE,
    effective_date DATE DEFAULT CURRENT_DATE,
    revision_number INTEGER DEFAULT 1,
    is_superseded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE NULLS NOT DISTINCT (geography_id, metric_id, reference_year, is_benchmark, benchmark_label)
);

CREATE INDEX IF NOT EXISTS idx_obs_geo_metric ON observations(geography_id, metric_id);
CREATE INDEX IF NOT EXISTS idx_obs_metric_year ON observations(metric_id, reference_year);
CREATE INDEX IF NOT EXISTS idx_obs_vintage ON observations(vintage_date);
CREATE INDEX IF NOT EXISTS idx_obs_classification ON observations(metric_classification);

-- 9b. Observation Snapshots & Longitudinal Change Ledger (Preserves temporal moat per Amendment #11)
CREATE TABLE IF NOT EXISTS observation_history (
    id BIGSERIAL PRIMARY KEY,
    observation_id BIGINT REFERENCES observations(id) ON DELETE CASCADE,
    geography_id VARCHAR(64) NOT NULL REFERENCES geographies(id) ON DELETE CASCADE,
    metric_id VARCHAR(64) NOT NULL REFERENCES metrics_definitions(id),
    reference_year INTEGER NOT NULL,
    vintage_date DATE NOT NULL,
    recorded_value_numeric NUMERIC(16, 4),
    recorded_value_text TEXT,
    dataset_id VARCHAR(128) NOT NULL REFERENCES datasets(id),
    change_type VARCHAR(32) DEFAULT 'OBSERVED', -- 'OBSERVED', 'REVISED', 'SUPERSEDED'
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_to TIMESTAMPTZ,
    audit_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_obs_hist_geo_metric ON observation_history(geography_id, metric_id, reference_year);
CREATE INDEX IF NOT EXISTS idx_obs_hist_vintage ON observation_history(vintage_date);

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

-- 15b. Business Category Aliases & Synonyms Taxonomy (Section 15)
CREATE TABLE IF NOT EXISTS category_aliases (
    id SERIAL PRIMARY KEY,
    category_id VARCHAR(64) NOT NULL REFERENCES business_categories(id) ON DELETE CASCADE,
    alias_term VARCHAR(128) NOT NULL,
    match_type VARCHAR(32) NOT NULL DEFAULT 'SYNONYM', -- 'CANONICAL', 'SYNONYM', 'ALIAS', 'PROVIDER_MAPPING', 'NAICS'
    provider_name VARCHAR(64) DEFAULT 'INTERNAL',      -- 'INTERNAL', 'STATCAN', 'OSM', 'GOOGLE', 'YELP'
    confidence_weight NUMERIC(4, 2) DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category_id, alias_term, provider_name)
);

CREATE INDEX IF NOT EXISTS idx_cat_alias_term ON category_aliases(alias_term);
CREATE INDEX IF NOT EXISTS idx_cat_alias_cat_id ON category_aliases(category_id);

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
    latitude NUMERIC(10, 6),
    longitude NUMERIC(10, 6),
    is_chain BOOLEAN DEFAULT FALSE,
    brand_name VARCHAR(128),
    entity_id VARCHAR(64),
    source_type VARCHAR(64) NOT NULL,        -- 'OSM_LISTED', 'OVERTURE_MAPS', 'MUNICIPAL_OPEN_DATA', 'BUSINESS_DIRECTORY'
    source_element_id VARCHAR(128),
    source_observed_at TIMESTAMPTZ,
    verification_status VARCHAR(32) NOT NULL DEFAULT 'UNVERIFIED',
    verification_basis TEXT,
    operating_status VARCHAR(32) NOT NULL DEFAULT 'UNKNOWN',
    phone VARCHAR(64),
    email VARCHAR(255),
    website VARCHAR(512),
    quality_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    confidence_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    tags JSONB,
    first_observed_at TIMESTAMPTZ DEFAULT NOW(),
    last_confirmed_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_businesses_geo_cat ON businesses(geography_id, category_id);
CREATE INDEX IF NOT EXISTS idx_businesses_coords ON businesses(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_businesses_verification ON businesses(verification_status);
CREATE INDEX IF NOT EXISTS idx_businesses_operating_status ON businesses(operating_status);
CREATE INDEX IF NOT EXISTS idx_businesses_quality_score ON businesses(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_businesses_source_observed ON businesses(source_observed_at DESC);

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
    title VARCHAR(255),
    business_name VARCHAR(255),
    address VARCHAR(255),
    asking_price NUMERIC(14, 2) NOT NULL,    -- Strictly separate
    previous_asking_price NUMERIC(14, 2),    -- Historical asking price before reduction
    confirmed_sale_price NUMERIC(14, 2),     -- Strictly NULL unless legally confirmed
    status VARCHAR(32) NOT NULL,             -- 'ACTIVE', 'REMOVED', 'EXPIRED', 'RELISTED', 'PRICE_CHANGED', 'CONFIRMED_SOLD', 'UNKNOWN'
    revenue_disclosed NUMERIC(14, 2),
    ebitda_disclosed NUMERIC(14, 2),
    sde_cashflow_disclosed NUMERIC(14, 2),
    monthly_rent NUMERIC(10, 2),
    square_footage INTEGER,
    is_franchise BOOLEAN DEFAULT FALSE,
    franchise_brand VARCHAR(128),
    broker_name VARCHAR(128),
    source_url TEXT,
    phone VARCHAR(64),
    coordinates VARCHAR(64),
    first_listed_date DATE NOT NULL,
    last_active_date DATE NOT NULL,
    removed_date DATE,
    repeated_listing_parent_id INTEGER REFERENCES business_listings(id),
    match_confidence NUMERIC(4, 2),          -- 0.00 to 1.00
    notes TEXT,
    is_demo_fixture BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listings_geo_cat ON business_listings(geography_id, category_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON business_listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_demo ON business_listings(is_demo_fixture);

-- 18b. Historical Listing Price & Status Timeline (Requirement 26)
CREATE TABLE IF NOT EXISTS business_listing_price_history (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER REFERENCES business_listings(id) ON DELETE CASCADE,
    recorded_date DATE NOT NULL,
    asking_price NUMERIC(14, 2) NOT NULL,
    event_type VARCHAR(64) NOT NULL,         -- 'INITIAL_LISTING', 'PRICE_REDUCTION', 'PRICE_INCREASE', 'RELISTED', 'REMOVED', 'CONFIRMED_SOLD'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_price_history ON business_listing_price_history(listing_id, recorded_date);

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

-- 23. Audit Events Ledger (Phase 2 Amendment #6 & T-006)
CREATE TABLE IF NOT EXISTS audit_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(64) NOT NULL,             -- 'LISTING_NEW', 'LISTING_PRICE_CHANGE', 'LISTING_RELIST', 'COMMERCIAL_LEASE_CHANGE', 'MUNICIPAL_BUDGET_NEW', 'STATCAN_RELEASE', 'ECONOMIC_INDICATOR_CHANGE'
    entity_type VARCHAR(64) NOT NULL,            -- 'business_listing', 'commercial_lease', 'observation', 'municipal_finance', 'dataset'
    entity_id VARCHAR(128) NOT NULL,
    geography_id VARCHAR(64) REFERENCES geographies(id),
    category_id VARCHAR(64) REFERENCES business_categories(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    old_value NUMERIC(16, 4),
    new_value NUMERIC(16, 4),
    delta_pct NUMERIC(8, 4),
    metadata JSONB,
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_type ON audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_geo ON audit_events(geography_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_occurred ON audit_events(occurred_at DESC);

-- 24. Subscriber Watches for Automated Alerts (Phase 2 Amendment #6 & T-006)
CREATE TABLE IF NOT EXISTS subscriber_watches (
    id SERIAL PRIMARY KEY,
    subscriber_email VARCHAR(255) NOT NULL,
    subscriber_name VARCHAR(255),
    watch_type VARCHAR(64) NOT NULL,             -- 'LISTING_WATCH', 'INDICATOR_WATCH', 'BUDGET_WATCH'
    geography_id VARCHAR(64) REFERENCES geographies(id),
    radius_km NUMERIC(6, 2),
    category_id VARCHAR(64) REFERENCES business_categories(id),
    metric_id VARCHAR(64) REFERENCES metrics_definitions(id),
    threshold_pct NUMERIC(6, 2),
    notification_channel VARCHAR(32) DEFAULT 'EMAIL',
    is_active BOOLEAN DEFAULT TRUE,
    last_evaluated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_watches_active ON subscriber_watches(is_active);
CREATE INDEX IF NOT EXISTS idx_sub_watches_geo ON subscriber_watches(geography_id);
CREATE INDEX IF NOT EXISTS idx_sub_watches_email ON subscriber_watches(subscriber_email);

-- 25. Watch Notification Queue & Dispatch Ledger (Phase 2 Amendment #6 & T-006)
CREATE TABLE IF NOT EXISTS watch_notifications (
    id SERIAL PRIMARY KEY,
    watch_id INTEGER NOT NULL REFERENCES subscriber_watches(id) ON DELETE CASCADE,
    event_id INTEGER NOT NULL REFERENCES audit_events(id) ON DELETE CASCADE,
    subscriber_email VARCHAR(255) NOT NULL,
    delivered BOOLEAN DEFAULT FALSE,
    delivered_at TIMESTAMPTZ,
    channel VARCHAR(32) DEFAULT 'EMAIL',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(watch_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_watch_notif_pending ON watch_notifications(delivered);

-- 26. Retail Fuel Pricing & Gas Price Delta Engine (Section 6, 11 & T-013)
CREATE TABLE IF NOT EXISTS fuel_prices (
    id SERIAL PRIMARY KEY,
    geography_id VARCHAR(64) NOT NULL REFERENCES geographies(id) ON DELETE CASCADE,
    product_type VARCHAR(64) NOT NULL DEFAULT 'Regular unleaded gasoline at self service filling stations',
    reference_month DATE NOT NULL,
    price_cents_per_litre NUMERIC(8, 2) NOT NULL,
    toronto_benchmark_cents NUMERIC(8, 2) NOT NULL,
    absolute_delta_cents NUMERIC(8, 2) NOT NULL,
    delta_pct NUMERIC(6, 2) NOT NULL,
    source_id VARCHAR(64) NOT NULL REFERENCES sources(id),
    dataset_id VARCHAR(128) NOT NULL REFERENCES datasets(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(geography_id, product_type, reference_month)
);

CREATE INDEX IF NOT EXISTS idx_fuel_geo_month ON fuel_prices(geography_id, reference_month);

-- 27. Residential Property Ownership Concentration (Section 6, 9 & T-014)
CREATE TABLE IF NOT EXISTS property_ownership (
    id SERIAL PRIMARY KEY,
    geography_id VARCHAR(64) NOT NULL REFERENCES geographies(id) ON DELETE CASCADE,
    reference_year INTEGER NOT NULL,
    total_owners INTEGER NOT NULL,
    single_property_owners INTEGER NOT NULL,
    multi_property_owners INTEGER NOT NULL,
    multi_property_owner_pct NUMERIC(6, 2) NOT NULL,
    source_id VARCHAR(64) NOT NULL REFERENCES sources(id),
    dataset_id VARCHAR(128) NOT NULL REFERENCES datasets(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(geography_id, reference_year)
);

CREATE INDEX IF NOT EXISTS idx_prop_owner_geo_year ON property_ownership(geography_id, reference_year);

-- 28. CMHC Rental Market Survey Indicators (Section 6, 9 & T-014)
CREATE TABLE IF NOT EXISTS rental_market (
    id SERIAL PRIMARY KEY,
    geography_id VARCHAR(64) NOT NULL REFERENCES geographies(id) ON DELETE CASCADE,
    reference_year INTEGER NOT NULL,
    average_rent_cad NUMERIC(10, 2) NOT NULL,
    median_rent_cad NUMERIC(10, 2),
    vacancy_rate_pct NUMERIC(5, 2) NOT NULL,
    rent_bachelor_cad NUMERIC(10, 2),
    rent_1bed_cad NUMERIC(10, 2),
    rent_2bed_cad NUMERIC(10, 2),
    rent_3bed_plus_cad NUMERIC(10, 2),
    rental_universe INTEGER,
    turnover_rate_pct NUMERIC(5, 2),
    source_id VARCHAR(64) NOT NULL REFERENCES sources(id),
    dataset_id VARCHAR(128) NOT NULL REFERENCES datasets(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(geography_id, reference_year)
);

CREATE INDEX IF NOT EXISTS idx_rental_geo_year ON rental_market(geography_id, reference_year);

-- 29. User-Requested Analytical Insights Ledger (Section 1, 41 & T-010)
CREATE TABLE IF NOT EXISTS requested_insights (
    id SERIAL PRIMARY KEY,
    geography_id VARCHAR(64) REFERENCES geographies(id),
    geography_name VARCHAR(255),
    metric_id VARCHAR(64),
    metric_name VARCHAR(255),
    module VARCHAR(64) NOT NULL,             -- 'Demographics', 'Competition', 'Financial', 'Workforce', 'RealEstate', 'Municipal'
    business_category VARCHAR(64),
    demographic VARCHAR(64),
    user_context TEXT,
    user_email VARCHAR(255),
    status VARCHAR(32) DEFAULT 'PENDING',    -- 'PENDING', 'QUEUED_FOR_INGESTION', 'INGESTED', 'DECLINED'
    request_count INTEGER DEFAULT 1,
    last_requested_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_req_insights_geo ON requested_insights(geography_id);
CREATE INDEX IF NOT EXISTS idx_req_insights_module ON requested_insights(module);
CREATE INDEX IF NOT EXISTS idx_req_insights_metric ON requested_insights(metric_id);

-- 30. Municipal Official Plans & Strategic Growth Initiatives (Requirement 13 & T-017)
CREATE TABLE IF NOT EXISTS municipal_planning_initiatives (
    id SERIAL PRIMARY KEY,
    geography_id VARCHAR(64) NOT NULL REFERENCES geographies(id) ON DELETE CASCADE,
    plan_type VARCHAR(64) NOT NULL,          -- 'OFFICIAL_PLAN', 'SECONDARY_PLAN', 'TRANSPORTATION_MASTER_PLAN', 'HOUSING_ACTION_PLAN', 'GROWTH_STRATEGY', 'DEVELOPMENT_CHARGE_STUDY'
    initiative_category VARCHAR(64) NOT NULL, -- 'RESIDENTIAL_GROWTH', 'COMMERCIAL_NODE', 'INDUSTRIAL_EXPANSION', 'TRANSIT_PROJECT', 'MAJOR_ROAD', 'HOUSING_PROJECT', 'INFRASTRUCTURE', 'INTENSIFICATION_AREA', 'EMPLOYMENT_AREA', 'ZONING_AMENDMENT'
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    target_completion_year INTEGER,
    estimated_capital_cad NUMERIC(16, 2),
    housing_units_targeted INTEGER,
    commercial_sqft_targeted INTEGER,
    spatial_corridor VARCHAR(255),
    status VARCHAR(32) NOT NULL DEFAULT 'APPROVED', -- 'APPROVED', 'UNDER_CONSTRUCTION', 'PLANNED', 'PROPOSED'
    source_document VARCHAR(255) NOT NULL,
    source_page_ref VARCHAR(128),
    reference_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_planning_geo ON municipal_planning_initiatives(geography_id);
CREATE INDEX IF NOT EXISTS idx_planning_cat ON municipal_planning_initiatives(initiative_category);
CREATE INDEX IF NOT EXISTS idx_planning_type ON municipal_planning_initiatives(plan_type);

-- Local, metadata-only launch planning. Source references are not verified proof.
CREATE TABLE IF NOT EXISTS launch_workspaces (
    id UUID PRIMARY KEY,
    name VARCHAR(120) NOT NULL CHECK (length(trim(name)) > 0),
    municipality VARCHAR(120) NOT NULL CHECK (length(trim(municipality)) > 0),
    industry VARCHAR(160) NOT NULL CHECK (length(trim(industry)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS launch_checks (
    workspace_id UUID NOT NULL REFERENCES launch_workspaces(id) ON DELETE CASCADE,
    id VARCHAR(100) NOT NULL,
    applicability VARCHAR(20) NOT NULL DEFAULT 'unknown' CHECK (applicability IN ('unknown', 'applicable', 'not_applicable')),
    completion VARCHAR(20) NOT NULL DEFAULT 'incomplete' CHECK (completion IN ('incomplete', 'complete')),
    blocker VARCHAR(20) NOT NULL DEFAULT 'none' CHECK (blocker IN ('none', 'unresolved', 'resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (workspace_id, id)
);
CREATE TABLE IF NOT EXISTS launch_evidence (
    id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL,
    check_id VARCHAR(100) NOT NULL,
    title VARCHAR(200) NOT NULL CHECK (length(trim(title)) > 0),
    source_url VARCHAR(2048) NOT NULL CHECK (source_url ~ '^https?://[^[:space:]]+$'),
    source_publisher VARCHAR(160) NOT NULL CHECK (length(trim(source_publisher)) > 0),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    kind VARCHAR(32) NOT NULL DEFAULT 'user_recorded_reference' CHECK (kind = 'user_recorded_reference'),
    FOREIGN KEY (workspace_id, check_id) REFERENCES launch_checks(workspace_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_launch_evidence_check ON launch_evidence(workspace_id, check_id);


-- 31. Dossier Orders (T-046)
CREATE TABLE IF NOT EXISTS dossier_orders (
    id SERIAL PRIMARY KEY,
    stripe_session_id VARCHAR(255) UNIQUE NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    city_id VARCHAR(64) NOT NULL REFERENCES geographies(id),
    category_id VARCHAR(64) NOT NULL REFERENCES business_categories(id),
    amount_total_cad INTEGER NOT NULL,
    payment_status VARCHAR(64) NOT NULL,
    fulfilled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 32. Rate Limiting (Phase 2 Remediation)
CREATE TABLE IF NOT EXISTS rate_limits (
    ip_address VARCHAR(45) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    request_count INTEGER DEFAULT 1,
    PRIMARY KEY (ip_address, endpoint, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup ON rate_limits(window_start);

-- 33. User Accounts & Authentication (Phase 2 Remediation)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS auth_tokens (
    token VARCHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    token_type VARCHAR(32) NOT NULL DEFAULT 'SESSION',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_user ON auth_tokens(user_id);

-- 34. Multi-Tenant Workspace Memberships (T-062 Phase 2 Auth)
CREATE TABLE IF NOT EXISTS workspace_memberships (
    workspace_id VARCHAR(64) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL DEFAULT 'MEMBER',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_memberships_user ON workspace_memberships(user_id);

-- 35. Intelligent Research and Decision Engine Versioned Runs
CREATE TABLE IF NOT EXISTS decision_engine_runs (
    id VARCHAR(64) PRIMARY KEY,
    engine_version VARCHAR(32) NOT NULL,
    category_id VARCHAR(64) NOT NULL,
    inquiry_text TEXT NOT NULL,
    operating_format VARCHAR(64) NOT NULL,
    scenario_label VARCHAR(128) NOT NULL,
    selected_candidate_id VARCHAR(64),
    recommendation_outcome VARCHAR(64) NOT NULL,
    workspace_id VARCHAR(64) DEFAULT 'default_workspace',
    user_id UUID REFERENCES users(id),
    decision_model_snapshot JSONB NOT NULL,
    funnel_snapshot JSONB NOT NULL,
    hypotheses_snapshot JSONB NOT NULL,
    evidence_snapshot JSONB NOT NULL,
    alternatives_snapshot JSONB NOT NULL,
    sensitivity_snapshot JSONB NOT NULL,
    financial_snapshot JSONB,
    decision_brief JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decision_runs_cat ON decision_engine_runs(category_id);
CREATE INDEX IF NOT EXISTS idx_decision_runs_created ON decision_engine_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_runs_workspace ON decision_engine_runs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_decision_runs_user ON decision_engine_runs(user_id);

-- 36. Business Entities (Parent corporate/holding entities)
CREATE TABLE IF NOT EXISTS business_entities (
    id VARCHAR(64) PRIMARY KEY,
    legal_name VARCHAR(255) NOT NULL,
    jurisdiction VARCHAR(64) NOT NULL DEFAULT 'CA',
    registration_number VARCHAR(128),
    entity_type VARCHAR(64) NOT NULL DEFAULT 'CORPORATION',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_entities_legal_name ON business_entities(legal_name);
CREATE INDEX IF NOT EXISTS idx_business_entities_reg_no ON business_entities(registration_number);

-- 37. Business Source Records (Append-only raw source observations)
CREATE TABLE IF NOT EXISTS business_source_records (
    id VARCHAR(64) PRIMARY KEY,
    source_id VARCHAR(64) NOT NULL REFERENCES sources(id),
    source_record_id VARCHAR(255) NOT NULL,
    canonical_business_id VARCHAR(64) REFERENCES businesses(id) ON DELETE SET NULL,
    raw_payload JSONB NOT NULL,
    payload_checksum VARCHAR(64) NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ingestion_run_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (source_id, source_record_id)
);

CREATE INDEX IF NOT EXISTS idx_biz_src_canonical ON business_source_records(canonical_business_id);
CREATE INDEX IF NOT EXISTS idx_biz_src_lookup ON business_source_records(source_id, source_record_id);

-- 38. Business Aliases
CREATE TABLE IF NOT EXISTS business_aliases (
    id VARCHAR(64) PRIMARY KEY,
    business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    alias_name VARCHAR(255) NOT NULL,
    alias_type VARCHAR(64) NOT NULL DEFAULT 'TRADING_NAME',
    source_id VARCHAR(64) REFERENCES sources(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_aliases_name ON business_aliases(alias_name);
CREATE INDEX IF NOT EXISTS idx_business_aliases_biz ON business_aliases(business_id);

-- 39. Business Contacts & CASL Compliance Points
CREATE TABLE IF NOT EXISTS business_contacts (
    id VARCHAR(64) PRIMARY KEY,
    business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    channel_type VARCHAR(32) NOT NULL,
    channel_value VARCHAR(255) NOT NULL,
    contact_role VARCHAR(64),
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    casl_consent_type VARCHAR(32) NOT NULL DEFAULT 'UNVERIFIED',
    casl_evidence_ref TEXT,
    casl_obtained_at TIMESTAMPTZ,
    casl_expires_at TIMESTAMPTZ,
    is_suppressed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (business_id, channel_type, channel_value)
);

CREATE INDEX IF NOT EXISTS idx_business_contacts_channel ON business_contacts(channel_type, channel_value);
CREATE INDEX IF NOT EXISTS idx_business_contacts_casl ON business_contacts(casl_consent_type);

-- 40. Business Identity Matches (Candidate deduplication & merge ledger)
CREATE TABLE IF NOT EXISTS business_identity_matches (
    id VARCHAR(64) PRIMARY KEY,
    business_id_a VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    business_id_b VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    confidence_score NUMERIC(5,2) NOT NULL,
    match_method VARCHAR(64) NOT NULL,
    match_signals JSONB NOT NULL DEFAULT '{}'::jsonb,
    resolution_status VARCHAR(32) NOT NULL DEFAULT 'PENDING_REVIEW',
    resolved_by VARCHAR(64),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_identity_matches_status ON business_identity_matches(resolution_status);
CREATE INDEX IF NOT EXISTS idx_identity_matches_pairs ON business_identity_matches(business_id_a, business_id_b);

-- 41. Business Verification Events (Independent operational audit trail)
CREATE TABLE IF NOT EXISTS business_verification_events (
    id VARCHAR(64) PRIMARY KEY,
    business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    verification_method VARCHAR(64) NOT NULL,
    observed_operating_status VARCHAR(32) NOT NULL,
    confidence NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_by VARCHAR(64) NOT NULL DEFAULT 'SYSTEM_AGENT'
);

CREATE INDEX IF NOT EXISTS idx_biz_verif_events ON business_verification_events(business_id, verified_at DESC);

-- 42. Durable PostgreSQL Job Queue & Outbox
CREATE TABLE IF NOT EXISTS durable_jobs (
    id VARCHAR(64) PRIMARY KEY,
    queue_name VARCHAR(64) NOT NULL,
    job_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    idempotency_key VARCHAR(128) UNIQUE,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    lease_owner VARCHAR(64),
    lease_expires_at TIMESTAMPTZ,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    backoff_base_sec INTEGER NOT NULL DEFAULT 10,
    next_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_error TEXT,
    result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_durable_jobs_lease ON durable_jobs(queue_name, status, next_run_at);
CREATE INDEX IF NOT EXISTS idx_durable_jobs_idemp ON durable_jobs(idempotency_key);

-- 43. Venture Modules
CREATE TABLE IF NOT EXISTS venture_modules (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    version VARCHAR(32) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT,
    config_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
    supported_workflows JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 44. Venture Targets (Pipeline & Qualification)
CREATE TABLE IF NOT EXISTS venture_targets (
    id VARCHAR(64) PRIMARY KEY,
    venture_id VARCHAR(64) NOT NULL REFERENCES venture_modules(id) ON DELETE CASCADE,
    business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    qualification_status VARCHAR(32) NOT NULL DEFAULT 'QUALIFIED',
    qualification_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    qualification_hypotheses JSONB NOT NULL DEFAULT '[]'::jsonb,
    opportunity_signals JSONB NOT NULL DEFAULT '{}'::jsonb,
    enriched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (venture_id, business_id)
);

CREATE INDEX IF NOT EXISTS idx_venture_targets_status ON venture_targets(venture_id, qualification_status);
CREATE INDEX IF NOT EXISTS idx_venture_targets_score ON venture_targets(venture_id, qualification_score DESC);

-- 45. Outreach Campaigns
CREATE TABLE IF NOT EXISTS outreach_campaigns (
    id VARCHAR(64) PRIMARY KEY,
    venture_id VARCHAR(64) NOT NULL REFERENCES venture_modules(id),
    name VARCHAR(255) NOT NULL,
    execution_mode VARCHAR(32) NOT NULL DEFAULT 'DRY_RUN',
    authorized_channels JSONB NOT NULL DEFAULT '["EMAIL"]'::jsonb,
    target_criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
    daily_send_cap INTEGER NOT NULL DEFAULT 50,
    budget_cap_cad NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    sender_identity VARCHAR(255),
    compliance_basis VARCHAR(64) NOT NULL DEFAULT 'CASL_B2B_RELEVANT',
    approval_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    approved_by VARCHAR(64),
    approved_at TIMESTAMPTZ,
    kill_switch_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_venture ON outreach_campaigns(venture_id, execution_mode);

-- 46. Outreach Messages & Action Ledger
CREATE TABLE IF NOT EXISTS outreach_messages (
    id VARCHAR(64) PRIMARY KEY,
    campaign_id VARCHAR(64) NOT NULL REFERENCES outreach_campaigns(id) ON DELETE CASCADE,
    business_id VARCHAR(64) NOT NULL REFERENCES businesses(id),
    contact_id VARCHAR(64) REFERENCES business_contacts(id),
    channel VARCHAR(32) NOT NULL,
    recipient_address VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    body_text TEXT NOT NULL,
    is_dry_run BOOLEAN NOT NULL DEFAULT TRUE,
    dispatch_status VARCHAR(32) NOT NULL DEFAULT 'SCHEDULED',
    provider_message_id VARCHAR(128),
    response_intent VARCHAR(64),
    casl_exemption_record JSONB NOT NULL DEFAULT '{}'::jsonb,
    dispatched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_campaign_status ON outreach_messages(campaign_id, dispatch_status);
CREATE INDEX IF NOT EXISTS idx_outreach_recipient ON outreach_messages(recipient_address);

-- 47. Outreach Suppression Registry
CREATE TABLE IF NOT EXISTS outreach_suppression (
    id VARCHAR(64) PRIMARY KEY,
    channel_type VARCHAR(32) NOT NULL,
    channel_value VARCHAR(255) NOT NULL,
    scope VARCHAR(32) NOT NULL DEFAULT 'GLOBAL',
    campaign_id VARCHAR(64) REFERENCES outreach_campaigns(id),
    reason VARCHAR(64) NOT NULL,
    evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    suppressed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (channel_type, channel_value, scope)
);

CREATE INDEX IF NOT EXISTS idx_suppression_lookup ON outreach_suppression(channel_type, channel_value);

-- 48. Acuity Voice Jobs Gateway Contract
CREATE TABLE IF NOT EXISTS acuity_voice_jobs (
    id VARCHAR(64) PRIMARY KEY,
    campaign_id VARCHAR(64) NOT NULL REFERENCES outreach_campaigns(id),
    business_id VARCHAR(64) NOT NULL REFERENCES businesses(id),
    target_phone VARCHAR(64) NOT NULL,
    lead_name VARCHAR(128),
    business_name VARCHAR(255) NOT NULL,
    persona VARCHAR(64) NOT NULL DEFAULT 'COMMERCIAL_RESEARCHER',
    status VARCHAR(32) NOT NULL DEFAULT 'STAGED',
    disposition VARCHAR(64),
    recording_ref VARCHAR(255),
    transcript_summary TEXT,
    regulatory_clearance JSONB NOT NULL DEFAULT '{"dncl_checked": false, "time_window_valid": true, "ai_disclosure_active": true}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_acuity_jobs_status ON acuity_voice_jobs(status);
CREATE INDEX IF NOT EXISTS idx_acuity_jobs_campaign ON acuity_voice_jobs(campaign_id);


