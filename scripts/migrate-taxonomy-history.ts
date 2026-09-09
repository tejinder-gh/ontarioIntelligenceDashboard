import { sql } from '../src/db/index.js';

export async function runMigration() {
  console.log('--- Migrating Database Schema for Explicit Geography Taxonomy & Longitudinal Moat ---');

  // 1. Alter geographies table
  await sql`
    ALTER TABLE geographies 
    ADD COLUMN IF NOT EXISTS municipal_tier VARCHAR(32),
    ADD COLUMN IF NOT EXISTS census_division_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS cma_id VARCHAR(64);
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_geographies_tier ON geographies(municipal_tier);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_geographies_cd_id ON geographies(census_division_id);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_geographies_cma_id ON geographies(cma_id);
  `;

  // 2. Alter observations table for longitudinal versioning
  await sql`
    ALTER TABLE observations 
    ADD COLUMN IF NOT EXISTS vintage_date DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS effective_date DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS revision_number INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS is_superseded BOOLEAN DEFAULT FALSE;
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_obs_vintage ON observations(vintage_date);
  `;

  // 3. Create observation_history table
  await sql`
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
      change_type VARCHAR(32) DEFAULT 'OBSERVED',
      valid_from TIMESTAMPTZ DEFAULT NOW(),
      valid_to TIMESTAMPTZ,
      audit_notes TEXT
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_obs_hist_geo_metric ON observation_history(geography_id, metric_id, reference_year);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_obs_hist_vintage ON observation_history(vintage_date);
  `;

  // 4. Backfill municipal_tier for Ontario CSDs
  // In Ontario:
  // Upper-Tier Regions/Counties containing lower-tier municipalities:
  const upperTierDivisions = [
    'Halton', 'Peel', 'York', 'Durham', 'Waterloo', 'Niagara',
    'Simcoe', 'Essex', 'Wellington', 'Middlesex', 'Lambton', 'Bruce',
    'Grey', 'Huron', 'Perth', 'Elgin', 'Oxford', 'Dufferin',
    'Northumberland', 'Peterborough', 'Hastings', 'Frontenac', 'Lanark',
    'Renfrew', 'Lennox and Addington', 'United Counties of Prescott and Russell',
    'United Counties of Stormont, Dundas and Glengarry', 'Haliburton'
  ];

  // Single-Tier Municipalities (no upper tier county/region):
  const singleTierNames = [
    'Toronto', 'Ottawa', 'Hamilton', 'Greater Sudbury', 'Chatham-Kent',
    'Brantford', 'Brant', 'Guelph', 'Kingston', 'Kawartha Lakes',
    'Norfolk', 'Haldimand', 'Prince Edward County', 'Cornwall', 'Belleville',
    'Quinte West', 'Stratford', 'St. Marys', 'St. Thomas', 'Smiths Falls',
    'Gananoque', 'Prescott', 'Brockville', 'Pembroke', 'Timmins',
    'North Bay', 'Thunder Bay', 'Sault Ste. Marie', 'Kenora', 'Dryden',
    'Fort Frances', 'Rainy River', 'Temiskaming Shores', 'Elliot Lake'
  ];

  // Update Single-Tier
  for (const name of singleTierNames) {
    await sql`
      UPDATE geographies 
      SET municipal_tier = 'SINGLE_TIER'
      WHERE geo_type = 'CSD' AND LOWER(name) = ${name.toLowerCase()};
    `;
  }

  // Update Lower-Tier in Upper-Tier regions/counties
  for (const div of upperTierDivisions) {
    await sql`
      UPDATE geographies 
      SET municipal_tier = 'LOWER_TIER'
      WHERE geo_type = 'CSD' 
        AND municipal_tier IS NULL 
        AND LOWER(census_division) = ${div.toLowerCase()};
    `;
  }

  // Default remaining CSDs in northern territorial districts to SINGLE_TIER or UNORGANIZED
  await sql`
    UPDATE geographies 
    SET municipal_tier = CASE 
      WHEN LOWER(name) LIKE '%unorganized%' THEN 'UNORGANIZED'
      ELSE 'SINGLE_TIER'
    END
    WHERE geo_type = 'CSD' AND municipal_tier IS NULL;
  `;

  // Province row has NULL municipal tier
  await sql`
    UPDATE geographies 
    SET municipal_tier = NULL 
    WHERE geo_type = 'PROVINCE';
  `;

  console.log('✅ Database migration applied successfully.');
}

// Execute if run directly
if (import.meta.main) {
  runMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
