/**
 * Source Acquisition & Registry Contracts
 * Standard interface for all Canadian business data source adapters.
 */

export type SourceLicenseType = 
  | 'OPEN_GOVERNMENT_CANADA'
  | 'ONTARIO_OPEN_DATA'
  | 'MUNICIPAL_OPEN_DATA'
  | 'OVERTURE_ODBL'
  | 'COMMERCIAL_LICENSED'
  | 'PUBLIC_REGISTRY';

export interface SourceMetadata {
  sourceId: string;
  publisher: string;
  description: string;
  license: SourceLicenseType;
  commercialUseAllowed: boolean;
  marketingPermitted: boolean;
  geographicScope: 'MUNICIPAL' | 'REGIONAL' | 'PROVINCIAL' | 'NATIONAL';
  supportedProvinces: string[];
  updateFrequencyDays: number;
}

export interface RawSourceRecord {
  sourceId: string;
  sourceRecordId: string;
  name: string;
  brandName?: string | null;
  isChain?: boolean;
  address?: string | null;
  city: string;
  province: string;
  postalCode?: string | null;
  latitude: number | null;
  longitude: number | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  categories: string[];
  naicsCode?: string | null;
  sourceObservedAt: Date;
  rawPayload: Record<string, unknown>;
}

export interface IngestionFilter {
  province?: string;
  region?: string;
  cities?: string[];
  categories?: string[];
  limit?: number;
  offset?: number;
}

export interface IngestionRunReport {
  runId: string;
  sourceId: string;
  scope: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  totalObserved: number;
  canonicalCreated: number;
  canonicalUpdated: number;
  duplicateMatches: number;
  rejectedInvalid: number;
  haltonCounts: {
    burlington: number;
    oakville: number;
    milton: number;
    haltonHills: number;
  };
}

export interface SourceAdapter {
  readonly metadata: SourceMetadata;
  fetchRecords(filter?: IngestionFilter): Promise<RawSourceRecord[]>;
  testConnection(): Promise<boolean>;
}
