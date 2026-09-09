export type GeographicResolution = 
  | 'CANADA' 
  | 'PROVINCE' 
  | 'CMA' 
  | 'CA' 
  | 'CD' 
  | 'CSD' 
  | 'DA' 
  | 'NEIGHBOURHOOD';

export type MunicipalTier = 
  | 'SINGLE_TIER' 
  | 'UPPER_TIER' 
  | 'LOWER_TIER' 
  | 'UNORGANIZED';

export type MetricClassification = 
  | 'OBSERVED' 
  | 'BENCHMARK' 
  | 'DERIVED' 
  | 'MODELED';

export interface GeographyRecord {
  id: string;
  dguid?: string;
  name: string;
  displayName: string;
  geoType: GeographicResolution;
  csdType?: string;
  municipalTier?: MunicipalTier | null;
  censusDivision?: string;
  censusDivisionId?: string | null;
  cmaId?: string | null;
  parentId?: string | null;
  landAreaSqkm?: number;
  latitude?: number;
  longitude?: number;
  population2021?: number;
  population2016?: number;
  populationGrowthPct?: number;
  ontarioPopSharePct?: number;
}

export interface DatasetMetadata {
  id: string;
  sourceId: string;
  name: string;
  datasetCode: string;
  referencePeriod: string;
  releaseDate?: string;
  sourceUrl: string;
  geographicCoverage: string;
  naicsVersion?: string;
  updateFrequency: string;
  staleAfterDays: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recordsChecked: number;
}

export interface NormalizedObservation {
  geographyId: string;
  metricId: string;
  referenceYear: number;
  valueNumeric: number | null;
  valueText?: string;
  unit: string;
  geographicResolution: GeographicResolution;
  isBenchmark: boolean;
  benchmarkLabel?: string;
  metricClassification?: MetricClassification;
  sourceId: string;
  datasetId: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'BENCHMARK';
  isEstimate: boolean;
  methodologyNotes?: string;
  vintageDate?: string;
  effectiveDate?: string;
  revisionNumber?: number;
  isSuperseded?: boolean;
}

export interface ObservationHistoryRecord {
  id?: number;
  observationId?: number;
  geographyId: string;
  metricId: string;
  referenceYear: number;
  vintageDate: string;
  recordedValueNumeric: number | null;
  recordedValueText?: string;
  datasetId: string;
  changeType: 'OBSERVED' | 'REVISED' | 'SUPERSEDED';
  validFrom: string;
  validTo?: string;
  auditNotes?: string;
}

export interface NormalizedDemographic {
  geographyId: string;
  referenceYear: number;
  dimensionType: 'ETHNIC_ORIGIN' | 'VISIBLE_MINORITY' | 'MOTHER_TONGUE' | 'AGE_GROUP' | 'HOUSEHOLD_TYPE';
  categoryCode?: string;
  categoryLabel: string;
  countTotal: number;
  countMen?: number;
  countWomen?: number;
  percentageShare?: number;
  datasetId: string;
}

export interface NormalizedWorkforce {
  geographyId: string;
  referenceYear: number;
  dimensionType: 'OCCUPATION_NOC' | 'INDUSTRY_NAICS' | 'COMMUTE_MODE';
  code: string;
  label: string;
  employedCount: number;
  percentageOfWorkforce?: number;
  medianEmploymentIncome?: number;
  averageEmploymentIncome?: number;
  datasetId: string;
}

export interface NormalizedMunicipalFinance {
  geographyId: string;
  fiscalYear: number;
  scheduleCode: string;
  accountCategory: string;
  amountDollars: number;
  pctOfTotalBudget?: number;
  perCapitaDollars?: number;
  datasetId: string;
}

export interface NormalizedBatch {
  observations: NormalizedObservation[];
  demographics?: NormalizedDemographic[];
  workforce?: NormalizedWorkforce[];
  municipalFinances?: NormalizedMunicipalFinance[];
  rawPayloads?: Array<{
    externalRecordId: string;
    payload: any;
  }>;
}

export interface PersistResult {
  rowsInserted: number;
  rowsUpdated: number;
  rowsRejected: number;
  success: boolean;
}

export interface DataSourceAdapter {
  id: string;
  sourceId: string;
  datasetId: string;
  discover(): Promise<DatasetMetadata>;
  fetch(params?: any): Promise<any>;
  validate(raw: any): Promise<ValidationResult>;
  normalize(raw: any): Promise<NormalizedBatch>;
  persist(normalized: NormalizedBatch, runId: number): Promise<PersistResult>;
  shouldRefresh(existing?: any): Promise<boolean>;
}
