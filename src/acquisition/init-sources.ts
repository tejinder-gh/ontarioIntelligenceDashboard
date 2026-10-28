import { sql } from '../db/index.js';

export async function ensureSourcesAndDatasets(): Promise<void> {
  // 1. Sources registration
  await sql`
    INSERT INTO sources (
      id, name, organization_type, website_url, priority_rank, is_authoritative,
      friendly_code, official_publisher, frequency, supported_geography, licence_rules
    ) VALUES (
      'foursquare_overture_places', 'Overture Maps Foundation / Foursquare Places',
      'OPEN_DATA_CONSORTIUM', 'https://overturemaps.org', 1, true,
      'FSQ_OVERTURE', 'Overture Maps Foundation', 'MONTHLY', 'NATIONAL',
      'ODbL 1.0 Attribution Required; No Commercial Electronic Message Consent Implied'
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      licence_rules = EXCLUDED.licence_rules;
  `;

  await sql`
    INSERT INTO sources (
      id, name, organization_type, website_url, priority_rank, is_authoritative,
      friendly_code, official_publisher, frequency, supported_geography, licence_rules
    ) VALUES (
      'toronto_open_data_licences', 'City of Toronto Open Data — Business Licences',
      'MUNICIPAL_GOVERNMENT', 'https://open.toronto.ca', 1, true,
      'TO_LICENCES', 'City of Toronto', 'BI_WEEKLY', 'MUNICIPAL',
      'Open Government Licence — Toronto; Statutory License Data'
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      licence_rules = EXCLUDED.licence_rules;
  `;

  // 2. Datasets registration
  await sql`
    INSERT INTO datasets (
      id, source_id, name, dataset_code, reference_period, source_url,
      geographic_coverage, update_frequency, stale_after_days, is_current
    ) VALUES (
      'foursquare_overture_places', 'foursquare_overture_places',
      'Overture Maps Canadian Places & Commercial Points of Interest',
      'PLACES_CA_2026', '2026-07', 'https://overturemaps.org',
      'NATIONAL', 'MONTHLY', 60, true
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      is_current = true;
  `;

  await sql`
    INSERT INTO datasets (
      id, source_id, name, dataset_code, reference_period, source_url,
      geographic_coverage, update_frequency, stale_after_days, is_current
    ) VALUES (
      'toronto_open_data_licences', 'toronto_open_data_licences',
      'City of Toronto Municipal Business Licensing Registry',
      'MUNI_LIC_TO_2026', '2026-08', 'https://open.toronto.ca',
      'MUNICIPAL', 'BI_WEEKLY', 30, true
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      is_current = true;
  `;
}
