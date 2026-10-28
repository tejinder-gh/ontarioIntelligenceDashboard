import type { SourceMetadata } from './types.js';

export const REGISTERED_SOURCES: Record<string, SourceMetadata> = {
  foursquare_overture_places: {
    sourceId: 'foursquare_overture_places',
    publisher: 'Overture Maps Foundation / Foursquare Open Places',
    description: 'High-precision geospatial places dataset across Canada covering 2.4M commercial locations.',
    license: 'OVERTURE_ODBL',
    commercialUseAllowed: true,
    marketingPermitted: false, // Explicit: Ingestion does not grant CASL marketing consent
    geographicScope: 'NATIONAL',
    supportedProvinces: ['ON', 'QC', 'BC', 'AB', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE', 'NT', 'YT', 'NU'],
    updateFrequencyDays: 30,
  },
  toronto_open_data_licences: {
    sourceId: 'toronto_open_data_licences',
    publisher: 'City of Toronto Open Data',
    description: 'Statutory municipal business licences and operating permits issued under Toronto Municipal Code.',
    license: 'MUNICIPAL_OPEN_DATA',
    commercialUseAllowed: true,
    marketingPermitted: false,
    geographicScope: 'MUNICIPAL',
    supportedProvinces: ['ON'],
    updateFrequencyDays: 14,
  },
  statcan_business_counts: {
    sourceId: 'statcan_business_counts',
    publisher: 'Statistics Canada',
    description: 'Canadian Business Counts by NAICS sector, employment size classes, and CSD geographies.',
    license: 'OPEN_GOVERNMENT_CANADA',
    commercialUseAllowed: true,
    marketingPermitted: false,
    geographicScope: 'NATIONAL',
    supportedProvinces: ['ON', 'QC', 'BC', 'AB', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE', 'NT', 'YT', 'NU'],
    updateFrequencyDays: 180,
  },
};
