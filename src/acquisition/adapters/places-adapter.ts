import postgres from 'postgres';
import type { SourceAdapter, SourceMetadata, RawSourceRecord, IngestionFilter } from '../types.js';
import { REGISTERED_SOURCES } from '../sources-catalog.js';
import { isNonCommercialEntity } from '../../resolution/category-mapper.js';

const FSQ_DATABASE_URL = process.env.FSQ_DATABASE_URL || 
  'postgresql://postgres:postgres@localhost:5432/fourSquare_datadump';

interface FsqPlaceRow {
  fsq_place_id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  locality: string | null;
  region: string | null;
  postcode: string | null;
  country: string | null;
  tel: string | null;
  website: string | null;
  email: string | null;
  fsq_category_labels_json: string | null;
  date_created: string | null;
  date_refreshed: string | null;
}

export class PlacesAdapter implements SourceAdapter {
  readonly metadata: SourceMetadata = REGISTERED_SOURCES.foursquare_overture_places;
  private sqlClient: postgres.Sql | null = null;

  private getClient(): postgres.Sql {
    if (!this.sqlClient) {
      this.sqlClient = postgres(FSQ_DATABASE_URL, {
        max: 5,
        idle_timeout: 20,
        connect_timeout: 10,
        onnotice: () => {},
      });
    }
    return this.sqlClient;
  }

  async testConnection(): Promise<boolean> {
    try {
      const client = this.getClient();
      const [row] = await client`SELECT 1 as ok`;
      return row.ok === 1;
    } catch (err) {
      console.warn('[PlacesAdapter] Connection test warning:', err);
      return false;
    }
  }

  async fetchRecords(filter?: IngestionFilter): Promise<RawSourceRecord[]> {
    const client = this.getClient();
    const rawLimit = typeof filter?.limit === 'number' ? filter.limit : 500;
    const limit = Math.max(1, Math.min(10000, rawLimit));
    const offset = Math.max(0, Number(filter?.offset) || 0);
    const targetCities = filter?.cities && filter.cities.length > 0 
      ? filter.cities 
      : ['Burlington', 'Oakville', 'Milton', 'Halton Hills'];

    // Query uses index on country = 'CA'
    const rows = await client<FsqPlaceRow[]>`
      SELECT 
        fsq_place_id, name, latitude, longitude, address, locality, 
        region, postcode, country, tel, website, email, 
        fsq_category_labels_json, date_created, date_refreshed
      FROM places_oecd_plus_in_cn_20260709
      WHERE country = 'CA'
        AND locality = ANY(${targetCities})
      ORDER BY date_refreshed DESC NULLS LAST, fsq_place_id ASC
      LIMIT ${limit}
      OFFSET ${offset};
    `;

    const rawRecords = rows.map((row) => this.mapToRawRecord(row));
    // Strictly isolate table scope: exclude non-commercial parks, transit stops, municipal boundaries, and schools
    return rawRecords.filter((rec) => !isNonCommercialEntity(rec.name, rec.categories));
  }

  private mapToRawRecord(row: FsqPlaceRow): RawSourceRecord {
    let categories: string[] = [];
    if (row.fsq_category_labels_json) {
      try {
        const parsed = JSON.parse(row.fsq_category_labels_json);
        if (Array.isArray(parsed)) {
          categories = parsed.map((item) => String(item));
        }
      } catch {
        categories = [row.fsq_category_labels_json];
      }
    }

    const observedAt = row.date_refreshed 
      ? new Date(row.date_refreshed) 
      : row.date_created 
        ? new Date(row.date_created) 
        : new Date('2026-07-01');

    return {
      sourceId: this.metadata.sourceId,
      sourceRecordId: row.fsq_place_id,
      name: (row.name || 'Unnamed Business').trim(),
      brandName: null,
      isChain: false,
      address: row.address ? row.address.trim() : null,
      city: row.locality ? row.locality.trim() : 'Unknown',
      province: row.region ? row.region.trim().toUpperCase() : 'ON',
      postalCode: row.postcode ? row.postcode.trim() : null,
      latitude: row.latitude || 43.3262,
      longitude: row.longitude || -79.7994,
      phone: row.tel ? row.tel.trim() : null,
      email: row.email ? row.email.trim() : null,
      website: row.website ? row.website.trim() : null,
      categories,
      sourceObservedAt: observedAt,
      rawPayload: {
        fsq_place_id: row.fsq_place_id,
        name: row.name,
        address: row.address,
        locality: row.locality,
        region: row.region,
        postcode: row.postcode,
        country: row.country,
        tel: row.tel,
        website: row.website,
        email: row.email,
        date_created: row.date_created,
        date_refreshed: row.date_refreshed,
      },
    };
  }

  async close(): Promise<void> {
    if (this.sqlClient) {
      await this.sqlClient.end();
      this.sqlClient = null;
    }
  }
}

export const placesAdapter = new PlacesAdapter();
