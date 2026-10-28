import postgres from 'postgres';
import type { SourceAdapter, SourceMetadata, RawSourceRecord, IngestionFilter } from '../types.js';
import { REGISTERED_SOURCES } from '../sources-catalog.js';

const DATASETS_DATABASE_URL = process.env.DATASETS_DATABASE_URL || 
  'postgresql://postgres:postgres@localhost:5432/datasets_ingest';

interface LicenceRow {
  licence_no: string;
  category: string | null;
  operating_name: string | null;
  client_name: string | null;
  business_phone: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  ward: string | null;
  issued_date: string | null;
  last_record_update: string | null;
}

export class TorontoLicencesAdapter implements SourceAdapter {
  readonly metadata: SourceMetadata = REGISTERED_SOURCES.toronto_open_data_licences;
  private sqlClient: postgres.Sql | null = null;

  private getClient(): postgres.Sql {
    if (!this.sqlClient) {
      this.sqlClient = postgres(DATASETS_DATABASE_URL, {
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
      console.warn('[TorontoLicencesAdapter] Connection warning:', err);
      return false;
    }
  }

  async fetchRecords(filter?: IngestionFilter): Promise<RawSourceRecord[]> {
    const client = this.getClient();
    const limit = filter?.limit || 100;
    const offset = filter?.offset || 0;

    const rows = await client<LicenceRow[]>`
      SELECT 
        licence_no, category, operating_name, client_name, business_phone,
        address_line_1, address_line_2, ward, issued_date, last_record_update
      FROM toronto_business_licences
      WHERE operating_name IS NOT NULL AND operating_name != ''
      ORDER BY last_record_update DESC NULLS LAST
      LIMIT ${limit}
      OFFSET ${offset};
    `;

    return rows.map((row) => this.mapToRawRecord(row));
  }

  private mapToRawRecord(row: LicenceRow): RawSourceRecord {
    const businessName = (row.operating_name || row.client_name || 'Licensed Commercial Entity').trim();
    const address = [row.address_line_1, row.address_line_2].filter(Boolean).join(', ') || null;
    const observedAt = row.last_record_update 
      ? new Date(row.last_record_update) 
      : row.issued_date 
        ? new Date(row.issued_date) 
        : new Date();

    return {
      sourceId: this.metadata.sourceId,
      sourceRecordId: row.licence_no,
      name: businessName,
      brandName: row.client_name && row.client_name !== businessName ? row.client_name.trim() : null,
      isChain: false,
      address,
      city: 'Toronto',
      province: 'ON',
      postalCode: null,
      latitude: 43.6532,
      longitude: -79.3832,
      phone: row.business_phone ? row.business_phone.trim() : null,
      email: null,
      website: null,
      categories: row.category ? [row.category.trim()] : ['Commercial Municipal License'],
      sourceObservedAt: observedAt,
      rawPayload: {
        licence_no: row.licence_no,
        category: row.category,
        operating_name: row.operating_name,
        client_name: row.client_name,
        business_phone: row.business_phone,
        address,
        ward: row.ward,
        issued_date: row.issued_date,
        last_record_update: row.last_record_update,
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

export const torontoLicencesAdapter = new TorontoLicencesAdapter();
