import type { EvidenceClassification } from './types.js';

export interface MetricProvenance {
  metricKey: string;
  metricName: string;
  sourceName: string;
  sourceUrl: string;
  datasetId: string;
  recordIdentifier?: string;
  observationPeriod: string;
  retrievalTimestamp: string;
  geographyId: string;
  geographyName: string;
  geographyResolution: 'CSD' | 'CMA' | 'PROVINCE' | 'PROPERTY_ADDRESS';
  units: string;
  originalValue: number | string;
  transformation: string;
  evidenceClassification: EvidenceClassification | 'UNVERIFIED_ASSUMPTION';
  limitations: string;
  geographicFitValid: boolean;
}

export function buildMetricProvenance(params: {
  metricKey: string;
  metricName: string;
  sourceName: string;
  sourceUrl: string;
  datasetId: string;
  recordIdentifier?: string;
  observationPeriod: string;
  geographyId: string;
  geographyName: string;
  geographyResolution: 'CSD' | 'CMA' | 'PROVINCE' | 'PROPERTY_ADDRESS';
  units: string;
  originalValue: number | string;
  transformation: string;
  evidenceClassification: EvidenceClassification | 'UNVERIFIED_ASSUMPTION';
  limitations: string;
  claimRequiresAddressLevel?: boolean;
  retrievalTimestamp?: string;
}): MetricProvenance {
  // Enforce boundary rule: City/CSD data cannot be used as an address-level claim without explicit marking
  const geographicFitValid = !(params.claimRequiresAddressLevel && params.geographyResolution !== 'PROPERTY_ADDRESS');

  return {
    metricKey: params.metricKey,
    metricName: params.metricName,
    sourceName: params.sourceName,
    sourceUrl: params.sourceUrl,
    datasetId: params.datasetId,
    recordIdentifier: params.recordIdentifier,
    observationPeriod: params.observationPeriod,
    retrievalTimestamp: params.retrievalTimestamp || new Date().toISOString(),
    geographyId: params.geographyId,
    geographyName: params.geographyName,
    geographyResolution: params.geographyResolution,
    units: params.units,
    originalValue: params.originalValue,
    transformation: params.transformation,
    evidenceClassification: params.evidenceClassification,
    limitations: params.limitations,
    geographicFitValid
  };
}
