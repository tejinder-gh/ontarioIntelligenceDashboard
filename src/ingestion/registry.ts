import { sql } from '../db/index.js';

export interface SourceDefinition {
  id: string;
  friendlyCode: string;
  name: string;
  organizationType: string;
  officialDatasetId: string;
  websiteUrl: string;
  officialPublisher?: string;
  doi?: string;
  frequency: string;
  supportedGeography: string;
  licenceRules: string;
  cachePolicy: string;
  priorityRank: number;
}

export const AUTHORITATIVE_SOURCES: SourceDefinition[] = [
  // 1. GEO-ONT-MUN
  {
    id: 'geo_ont_mun',
    friendlyCode: 'GEO-ONT-MUN',
    name: 'Government of Ontario — List of Ontario Municipalities',
    organizationType: 'PROVINCIAL_GOV',
    officialDatasetId: 'MMAH-MUN-REG-2026',
    officialPublisher: 'Government of Ontario / Ministry of Municipal Affairs and Housing (MMAH)',
    websiteUrl: 'https://data.ontario.ca/dataset/municipalities',
    frequency: 'ANNUAL',
    supportedGeography: 'CSD',
    licenceRules: 'Open Government Licence – Ontario',
    cachePolicy: 'Annual check around municipal boundary reviews; 444 municipal entities (upper, lower, single tier)',
    priorityRank: 1
  },
  // 2. GEO-SGC21
  {
    id: 'geo_sgc21',
    friendlyCode: 'GEO-SGC21',
    name: 'Statistics Canada — Standard Geographical Classification (SGC) 2021',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '12-571-X2021001',
    officialPublisher: 'Statistics Canada',
    doi: '10.25318/12571x-eng',
    websiteUrl: 'https://www.statcan.gc.ca/en/subjects/standard/sgc/2021/index',
    frequency: 'QUENQUENNIAL',
    supportedGeography: 'CANADA',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Persist by SGC vintage; quinquennial check; canonical hierarchy (Province, CD, CSD)',
    priorityRank: 1
  },
  // 3. GEO-BOUNDARY
  {
    id: 'geo_boundary',
    friendlyCode: 'GEO-BOUNDARY',
    name: 'Statistics Canada — Census Subdivision Boundary Files',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '92-162-X',
    officialPublisher: 'Statistics Canada',
    websiteUrl: 'https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/index2021-eng.cfm',
    frequency: 'QUENQUENNIAL',
    supportedGeography: 'CSD',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Retain 2021 boundaries when joining 2021 Census data; never join different vintages silently',
    priorityRank: 1
  },
  // 4. DEM-CEN21
  {
    id: 'dem_cen21',
    friendlyCode: 'DEM-CEN21',
    name: 'Statistics Canada — 2021 Census of Population — Census Profile',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '98-316-X2021001',
    officialPublisher: 'Statistics Canada',
    doi: '10.25318/98316x-eng',
    websiteUrl: 'https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/index.cfm',
    frequency: 'QUENQUENNIAL',
    supportedGeography: 'CSD',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Persist version; never overwrite temporal snapshot; preserve 2021 reference period in 2026',
    priorityRank: 1
  },
  // 5. POP-CSD-EST
  {
    id: 'pop_csd_est',
    friendlyCode: 'POP-CSD-EST',
    name: 'Statistics Canada — Population estimates, July 1, by CSD, 2021 boundaries',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '17-10-0155-01',
    officialPublisher: 'Statistics Canada',
    doi: '10.25318/1710015501-eng',
    websiteUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1710015501',
    frequency: 'ANNUAL',
    supportedGeography: 'CSD',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Annual release check (Q1); keep Census counts and population estimates as separate metric types',
    priorityRank: 1
  },
  // 6. POP-CSD-PROJ
  {
    id: 'pop_csd_proj',
    friendlyCode: 'POP-CSD-PROJ',
    name: 'Statistics Canada / Ontario MoF — Projected population for CD and CSD',
    organizationType: 'PROVINCIAL_GOV',
    officialDatasetId: '17-10-0162-01',
    officialPublisher: 'Statistics Canada / Ontario Ministry of Finance',
    doi: '10.25318/1710016201-eng',
    websiteUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1710016201',
    frequency: 'ANNUAL',
    supportedGeography: 'CD',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Scenario models only (M1, M2, High, Low); show projection year and uncertainty warning',
    priorityRank: 2
  },
  // 7. DEM-ETHNIC-AGE
  {
    id: 'dem_ethnic_age',
    friendlyCode: 'DEM-ETHNIC-AGE',
    name: 'Statistics Canada — Ethnic or cultural origin by gender and age (CSD 5,000+)',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '98-10-0358-01',
    officialPublisher: 'Statistics Canada',
    doi: '10.25318/9810035801-eng',
    websiteUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810035801',
    frequency: 'QUENQUENNIAL',
    supportedGeography: 'CSD',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Persist 2021 Census baseline; ethnic origin is ancestry, separate from visible minority/citizenship',
    priorityRank: 2
  },
  // 8. DEM-VM-INCOME-CSD
  {
    id: 'dem_vm_income_csd',
    friendlyCode: 'DEM-VM-INCOME-CSD',
    name: 'Statistics Canada — Visible Minority & Income Statistics by CSD 5,000+',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '98-10-0440-01',
    officialPublisher: 'Statistics Canada',
    doi: '10.25318/9810044001-eng',
    websiteUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810044001',
    frequency: 'QUENQUENNIAL',
    supportedGeography: 'CSD',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Quinquennial Census baseline; do NOT relabel visible minority as ethnic origin',
    priorityRank: 2
  },
  // 9. DEM-VM-LABOUR-CSD
  {
    id: 'dem_vm_labour_csd',
    friendlyCode: 'DEM-VM-LABOUR-CSD',
    name: 'Statistics Canada — Visible Minority & Labour Market by CSD 5,000+',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '98-10-0436-01',
    officialPublisher: 'Statistics Canada',
    doi: '10.25318/9810043601-eng',
    websiteUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810043601',
    frequency: 'QUENQUENNIAL',
    supportedGeography: 'CSD',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Quinquennial Census baseline',
    priorityRank: 2
  },
  // 10. BUS-CNT-CSD
  {
    id: 'bus_cnt_csd',
    friendlyCode: 'BUS-CNT-CSD',
    name: 'Statistics Canada — Canadian Business Counts with Employees by CSD (June 2026)',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '33-10-1176-01',
    officialPublisher: 'Statistics Canada',
    doi: '10.25318/3310117601-eng',
    websiteUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3310117601',
    frequency: 'SEMI_ANNUAL',
    supportedGeography: 'CSD',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Semi-annual check; Table 33-10-1176-01 supersedes 33-10-1097-01 while preserving lineage',
    priorityRank: 1
  },
  // 11. BUS-CNT-NONEMP
  {
    id: 'bus_cnt_nonemp',
    friendlyCode: 'BUS-CNT-NONEMP',
    name: 'Statistics Canada — Canadian Business Counts without Employees (June 2026)',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '33-10-1175-01',
    officialPublisher: 'Statistics Canada',
    doi: '10.25318/3310117501-eng',
    websiteUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3310117501',
    frequency: 'SEMI_ANNUAL',
    supportedGeography: 'PROVINCE',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Canada/Province only; strictly prohibited from allocating down to CSD',
    priorityRank: 3
  },
  // 12. TAX-NAICS22
  {
    id: 'tax_naics22',
    friendlyCode: 'TAX-NAICS22',
    name: 'Statistics Canada — North American Industry Classification System (NAICS) Canada 2022 v1.0',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '12-501-X2022001',
    officialPublisher: 'Statistics Canada',
    websiteUrl: 'https://www.statcan.gc.ca/en/subjects/standard/naics/2022/index',
    frequency: 'QUENQUENNIAL',
    supportedGeography: 'CANADA',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Canonical industry taxonomy layer; build synonyms above NAICS',
    priorityRank: 1
  },
  // 13. TAX-NOC21
  {
    id: 'tax_noc21',
    friendlyCode: 'TAX-NOC21',
    name: 'Statistics Canada / ESDC — National Occupational Classification (NOC) 2021 v1.0',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '12-583-X2021001',
    officialPublisher: 'Statistics Canada & Employment and Social Development Canada',
    websiteUrl: 'https://www.statcan.gc.ca/en/subjects/standard/noc/2021/index',
    frequency: 'QUENQUENNIAL',
    supportedGeography: 'CANADA',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Canonical occupation hierarchy; map colloquial titles onto NOC',
    priorityRank: 1
  },
  // 14. LAB-CMA
  {
    id: 'lab_cma',
    friendlyCode: 'LAB-CMA',
    name: 'Statistics Canada — Employment characteristics by CMA, annual',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '14-10-0468-01',
    officialPublisher: 'Statistics Canada',
    doi: '10.25318/1410046801-eng',
    websiteUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410046801',
    frequency: 'ANNUAL',
    supportedGeography: 'CMA',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Annual; always label CMA statistics as CMA benchmarks',
    priorityRank: 2
  },
  // 15. LAB-CMA-IND
  {
    id: 'lab_cma_ind',
    friendlyCode: 'LAB-CMA-IND',
    name: 'Statistics Canada — Employment by industry and CMA, annual',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '14-10-0468-02',
    officialPublisher: 'Statistics Canada',
    doi: '10.25318/1410046802-eng',
    websiteUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410046802',
    frequency: 'ANNUAL',
    supportedGeography: 'CMA',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Annual release; CMA benchmark only',
    priorityRank: 2
  },
  // 16. LAB-CMA-OCC
  {
    id: 'lab_cma_occ',
    friendlyCode: 'LAB-CMA-OCC',
    name: 'Statistics Canada — Employment by occupation and CMA, annual',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '14-10-0468-03',
    officialPublisher: 'Statistics Canada',
    doi: '10.25318/1410046803-eng',
    websiteUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410046803',
    frequency: 'ANNUAL',
    supportedGeography: 'CMA',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Annual release; CMA benchmark only',
    priorityRank: 2
  },
  // 17. LAB-CMA-CORE
  {
    id: 'lab_cma_core',
    friendlyCode: 'LAB-CMA-CORE',
    name: 'Statistics Canada — Labour force characteristics by CMA, annual',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '14-10-0461-01',
    officialPublisher: 'Statistics Canada',
    doi: '10.25318/1410046101-eng',
    websiteUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410046101',
    frequency: 'ANNUAL',
    supportedGeography: 'CMA',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Annual LFS benchmark',
    priorityRank: 2
  },
  // 18. LAB-WAGE
  {
    id: 'lab_wage',
    friendlyCode: 'LAB-WAGE',
    name: 'Government of Canada Job Bank — Wages by Occupation and Region',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: 'JOBBANK-WAGE-2025',
    officialPublisher: 'Employment and Social Development Canada / Job Bank',
    websiteUrl: 'https://www.jobbank.gc.ca/trend-analysis/search-wages',
    frequency: 'ANNUAL',
    supportedGeography: 'ECONOMIC_REGION',
    licenceRules: 'Open Government Licence – Canada',
    cachePolicy: 'Annual refresh; store methodology flag; do NOT claim regional wage is municipal wage',
    priorityRank: 2
  },
  // 19. SPEND-SHS
  {
    id: 'spend_shs',
    friendlyCode: 'SPEND-SHS',
    name: 'Statistics Canada — Survey of Household Spending (SHS) 2023',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '11-10-0222-01',
    officialPublisher: 'Statistics Canada',
    doi: '10.25318/1110022201-eng',
    websiteUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1110022201',
    frequency: 'BIENNIAL',
    supportedGeography: 'PROVINCE',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Biennial release; strictly Provincial/CMA benchmark; localized models must be stored as MODELED ESTIMATE',
    priorityRank: 2
  },
  // 20. WEALTH-SFS
  {
    id: 'wealth_sfs',
    friendlyCode: 'WEALTH-SFS',
    name: 'Statistics Canada — Survey of Financial Security (SFS) 2023',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '11-10-0049-01',
    officialPublisher: 'Statistics Canada',
    doi: '10.25318/1110004901-eng',
    websiteUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1110004901',
    frequency: 'TRIENNIAL',
    supportedGeography: 'PROVINCE',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Triennial release; strictly Provincial/CMA benchmark; never relabel as municipal net worth',
    priorityRank: 2
  },
  // 21. RENT-CMHC
  {
    id: 'rent_cmhc',
    friendlyCode: 'RENT-CMHC',
    name: 'Canada Mortgage and Housing Corporation (CMHC) — Rental Market Survey 2025',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: 'CMHC-RMS-2025',
    officialPublisher: 'Canada Mortgage and Housing Corporation (CMHC)',
    websiteUrl: 'https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/housing-data/data-tables/rental-market',
    frequency: 'ANNUAL',
    supportedGeography: 'CSD',
    licenceRules: 'CMHC Open Data Licence',
    cachePolicy: 'Annual release (January); check more frequently around expected release period; preserve yearly snapshots',
    priorityRank: 1
  },
  // 22. PROP-MULTI-OWNER
  {
    id: 'prop_multi_owner',
    friendlyCode: 'PROP-MULTI-OWNER',
    name: 'Statistics Canada — Residential Property Ownership (Single vs Multiple)',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '46-10-0096-01',
    officialPublisher: 'Statistics Canada (CHSP)',
    doi: '10.25318/4610009601-eng',
    websiteUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=4610009601',
    frequency: 'ANNUAL',
    supportedGeography: 'CSD',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Annual CHSP release; multi-property ownership analysis',
    priorityRank: 2
  },
  // 23. PROP-OWNER-FAMILY
  {
    id: 'prop_owner_family',
    friendlyCode: 'PROP-OWNER-FAMILY',
    name: 'Statistics Canada — Residential Property Owners and Family Characteristics',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '46-10-0097-01',
    officialPublisher: 'Statistics Canada (CHSP)',
    doi: '10.25318/4610009701-eng',
    websiteUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=4610009701',
    frequency: 'ANNUAL',
    supportedGeography: 'CSD',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Annual CHSP release; do not substitute for household dwelling stock',
    priorityRank: 2
  },
  // 24. FUEL-RETAIL
  {
    id: 'fuel_retail',
    friendlyCode: 'FUEL-RETAIL',
    name: 'Statistics Canada — Monthly Average Retail Prices for Gasoline',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '18-10-0001-01',
    officialPublisher: 'Statistics Canada',
    doi: '10.25318/1810000101-eng',
    websiteUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810000101',
    frequency: 'MONTHLY',
    supportedGeography: 'CMA',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Monthly refresh; calculate delta vs Toronto; ensure identical fuel product and reference month',
    priorityRank: 1
  },
  // 25. MUNI-FIR
  {
    id: 'muni_fir',
    friendlyCode: 'MUNI-FIR',
    name: 'Ontario Ministry of Municipal Affairs and Housing — Financial Information Return (FIR)',
    organizationType: 'PROVINCIAL_GOV',
    officialDatasetId: 'FIR-MYC-2024',
    officialPublisher: 'Ontario Ministry of Municipal Affairs and Housing',
    websiteUrl: 'https://efis.fma.csc.gov.on.ca/fir/MultiYearReport/MYCIndex.html',
    frequency: 'ANNUAL',
    supportedGeography: 'CSD',
    licenceRules: 'Open Government Licence – Ontario',
    cachePolicy: 'Check monthly for newer reporting years; never overwrite previous annual FIR data',
    priorityRank: 1
  },
  // 26. MUNI-BUDGET-CURRENT
  {
    id: 'muni_budget_current',
    friendlyCode: 'MUNI-BUDGET-CURRENT',
    name: 'Municipal Official Websites — Approved Budgets & Capital Plans',
    organizationType: 'MUNICIPAL_GOV',
    officialDatasetId: 'MUNI-BUDGET-2026',
    officialPublisher: 'Official Municipal Treasuries and Council Archives',
    websiteUrl: 'https://www.ontario.ca/page/municipal-budgets',
    frequency: 'ANNUAL',
    supportedGeography: 'CSD',
    licenceRules: 'Official Municipal Public Documentation',
    cachePolicy: 'Check monthly during budget season (Q1), quarterly otherwise; store official document URL',
    priorityRank: 1
  },
  // 27. MUNI-OFFICIAL-PLAN
  {
    id: 'muni_official_plan',
    friendlyCode: 'MUNI-OFFICIAL-PLAN',
    name: 'Municipal Official Plans, Secondary Plans & Growth Strategies',
    organizationType: 'MUNICIPAL_GOV',
    officialDatasetId: 'MUNI-OP-2026',
    officialPublisher: 'Municipal Planning Divisions / Ontario Provincial Planning Statement 2024',
    websiteUrl: 'https://www.ontario.ca/page/official-plans',
    frequency: 'QUARTERLY',
    supportedGeography: 'CSD',
    licenceRules: 'Official Municipal Planning Documentation',
    cachePolicy: 'Check quarterly; preserve amendment history; contextualize with PPS 2024 (Oct 2024)',
    priorityRank: 2
  },
  // 28. MUNI-DEV-CHARGE
  {
    id: 'muni_dev_charge',
    friendlyCode: 'MUNI-DEV-CHARGE',
    name: 'Municipal Development Charges By-laws & Fee Schedules',
    organizationType: 'MUNICIPAL_GOV',
    officialDatasetId: 'MUNI-DC-2026',
    officialPublisher: 'Ontario Municipal Treasuries & Planning Services',
    websiteUrl: 'https://www.ontario.ca/document/development-charges-guide',
    frequency: 'ANNUAL',
    supportedGeography: 'CSD',
    licenceRules: 'Official Municipal Public Documentation',
    cachePolicy: 'Check annually post-by-law review; record effective date, category, unit, rate, by-law',
    priorityRank: 2
  },
  // 29. BUILD-INVEST
  {
    id: 'build_invest',
    friendlyCode: 'BUILD-INVEST',
    name: 'Statistics Canada — Investment in Building Construction',
    organizationType: 'FEDERAL_GOV',
    officialDatasetId: '34-10-0293-01',
    officialPublisher: 'Statistics Canada',
    doi: '10.25318/3410029301-eng',
    websiteUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3410029301',
    frequency: 'MONTHLY',
    supportedGeography: 'CMA',
    licenceRules: 'Statistics Canada Open Licence',
    cachePolicy: 'Monthly release; never downgrade CMA data into municipality data silently',
    priorityRank: 2
  },
  // 30. CRE-LISTING-DDF
  {
    id: 'cre_listing_ddf',
    friendlyCode: 'CRE-LISTING-DDF',
    name: 'CREA REALTOR.ca Data Distribution Facility (DDF Web API)',
    organizationType: 'REGULATORY_FILING',
    officialDatasetId: 'CREA-DDF-API',
    officialPublisher: 'Canadian Real Estate Association (CREA)',
    websiteUrl: 'https://www.crea.ca/technology-solutions/crea-ddf/',
    frequency: 'DAILY',
    supportedGeography: 'CSD',
    licenceRules: 'CREA DDF Permitted Use & Terms; 24-hr refresh required; asking price != sale price',
    cachePolicy: 'Daily refresh; never treat asking price as completed transaction price',
    priorityRank: 2
  },
  // 31. CRE-MARKET
  {
    id: 'cre_market',
    friendlyCode: 'CRE-MARKET',
    name: 'Institutional Commercial Real Estate Market Reports (CBRE / Colliers / JLL / Cushman)',
    organizationType: 'COMMERCIAL_RESEARCH',
    officialDatasetId: 'CRE-REP-2026',
    officialPublisher: 'Institutional Commercial Real Estate Research Firms',
    websiteUrl: 'https://www.collierscanada.com/en-ca/research',
    frequency: 'QUARTERLY',
    supportedGeography: 'CMA',
    licenceRules: 'Public Institutional Research; do not attribute GTA benchmark as Burlington-specific unless submarket exists',
    cachePolicy: 'Quarterly update',
    priorityRank: 3
  },
  // 32. BIZ-OSM
  {
    id: 'biz_osm',
    friendlyCode: 'BIZ-OSM',
    name: 'OpenStreetMap Contributors — Commercial Entities',
    organizationType: 'OPEN_DATA',
    officialDatasetId: 'OSM-OVERPASS-ON',
    officialPublisher: 'OpenStreetMap Foundation & Contributors',
    websiteUrl: 'https://www.openstreetmap.org',
    frequency: 'MONTHLY',
    supportedGeography: 'CSD',
    licenceRules: 'Open Database License (ODbL); call them OSM-listed businesses, not verified active directory',
    cachePolicy: 'Monthly refresh; persist node IDs and coordinates; do not mix Google data into OSM',
    priorityRank: 4
  },
  // 33. BIZ-GOOGLE
  {
    id: 'biz_google',
    friendlyCode: 'BIZ-GOOGLE',
    name: 'Google Places API (Configured Provider)',
    organizationType: 'COMMERCIAL_API',
    officialDatasetId: 'GOOGLE-PLACES-API',
    officialPublisher: 'Google LLC / Google Maps Platform',
    websiteUrl: 'https://developers.google.com/maps/documentation/places/web-service',
    frequency: 'ON_DEMAND',
    supportedGeography: 'CSD',
    licenceRules: 'Google Maps Platform Terms; Place IDs permanently persisted; other content cached only per terms',
    cachePolicy: 'Comply with Google storage restrictions; do NOT use as unrestricted historical warehouse',
    priorityRank: 3
  },
  // 34. BIZ-YELP
  {
    id: 'biz_yelp',
    friendlyCode: 'BIZ-YELP',
    name: 'Yelp Fusion API (Configured Provider)',
    organizationType: 'COMMERCIAL_API',
    officialDatasetId: 'YELP-FUSION-API',
    officialPublisher: 'Yelp Inc.',
    websiteUrl: 'https://www.yelp.com/fusion',
    frequency: 'ON_DEMAND',
    supportedGeography: 'CSD',
    licenceRules: 'Yelp Fusion API Terms; 24-hour cache limit; Yelp Business IDs may be persisted',
    cachePolicy: '24-hour transient caching',
    priorityRank: 3
  },
  // 35. BIZ-FOR-SALE
  {
    id: 'biz_for_sale',
    friendlyCode: 'BIZ-FOR-SALE',
    name: 'Commercial Business-for-Sale Marketplaces & Resale Filings',
    organizationType: 'COMMERCIAL_RESEARCH',
    officialDatasetId: 'BIZ-SALE-MKT-2026',
    officialPublisher: 'Commercial Brokerages & Marketplace Disclosures',
    websiteUrl: 'https://www.sedarplus.ca',
    frequency: 'DAILY',
    supportedGeography: 'CSD',
    licenceRules: 'Marketplace evidence, not government transaction data; separate listing status',
    cachePolicy: 'Daily scan; never infer removed = sold or asking price = sale price',
    priorityRank: 4
  }
];

export async function initializeRegistries(): Promise<void> {
  console.log(`Initializing Centralized Authoritative Sources Registry (${AUTHORITATIVE_SOURCES.length} sources)...`);

  // Ensure tables and columns exist even if migration hasn't been executed
  await sql.unsafe(`
    ALTER TABLE sources ADD COLUMN IF NOT EXISTS official_publisher VARCHAR(255);
    ALTER TABLE sources ADD COLUMN IF NOT EXISTS doi VARCHAR(128);
    ALTER TABLE datasets ADD COLUMN IF NOT EXISTS doi VARCHAR(128);
    ALTER TABLE datasets ADD COLUMN IF NOT EXISTS official_publisher VARCHAR(255);
    ALTER TABLE datasets ADD COLUMN IF NOT EXISTS classification VARCHAR(32) DEFAULT 'OBSERVED';
    ALTER TABLE datasets ADD COLUMN IF NOT EXISTS checksum VARCHAR(128);
    ALTER TABLE datasets ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

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

    CREATE TABLE IF NOT EXISTS dataset_capabilities (
        id SERIAL PRIMARY KEY,
        dataset_id VARCHAR(128) NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
        source_id VARCHAR(64) NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
        attribute_group VARCHAR(64) NOT NULL,
        capability_name VARCHAR(128) NOT NULL,
        is_provided BOOLEAN NOT NULL DEFAULT TRUE,
        supported_resolutions TEXT[] DEFAULT ARRAY[]::TEXT[],
        notes TEXT,
        constraints TEXT,
        UNIQUE(dataset_id, attribute_group, capability_name)
    );

    CREATE TABLE IF NOT EXISTS dataset_geographies (
        id SERIAL PRIMARY KEY,
        dataset_id VARCHAR(128) NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
        geographic_resolution VARCHAR(32) NOT NULL,
        notes TEXT,
        UNIQUE(dataset_id, geographic_resolution)
    );

    CREATE TABLE IF NOT EXISTS dataset_refresh_policies (
        id SERIAL PRIMARY KEY,
        dataset_id VARCHAR(128) NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
        source_id VARCHAR(64) NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
        frequency VARCHAR(32) NOT NULL,
        stale_after_days INTEGER NOT NULL DEFAULT 365,
        check_cadence VARCHAR(64) NOT NULL,
        policy_description TEXT NOT NULL,
        next_check_expected DATE,
        UNIQUE(dataset_id)
    );

    CREATE TABLE IF NOT EXISTS dataset_licence_rules (
        id SERIAL PRIMARY KEY,
        dataset_id VARCHAR(128) NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
        source_id VARCHAR(64) NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
        licence_name VARCHAR(255) NOT NULL,
        licence_url TEXT,
        permissions_summary TEXT,
        restrictions_summary TEXT,
        max_cache_duration_hours INTEGER,
        can_persist_identifiers_only BOOLEAN DEFAULT FALSE,
        attribution_required BOOLEAN DEFAULT FALSE,
        attribution_text TEXT,
        UNIQUE(dataset_id)
    );

    CREATE TABLE IF NOT EXISTS dataset_dependencies (
        id SERIAL PRIMARY KEY,
        dependent_dataset_id VARCHAR(128) NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
        prerequisite_dataset_id VARCHAR(128) NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
        dependency_type VARCHAR(64) NOT NULL,
        notes TEXT,
        UNIQUE(dependent_dataset_id, prerequisite_dataset_id, dependency_type)
    );

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
  `);

  // 1. Authoritative Sources Table
  for (const src of AUTHORITATIVE_SOURCES) {
    await sql`
      INSERT INTO sources (
        id, friendly_code, name, organization_type, official_dataset_id, 
        website_url, official_publisher, doi, frequency, supported_geography, 
        licence_rules, cache_policy, priority_rank, is_authoritative
      )
      VALUES (
        ${src.id}, ${src.friendlyCode}, ${src.name}, ${src.organizationType}, ${src.officialDatasetId},
        ${src.websiteUrl}, ${src.officialPublisher || null}, ${src.doi || null}, ${src.frequency}, ${src.supportedGeography}, 
        ${src.licenceRules}, ${src.cachePolicy}, ${src.priorityRank}, true
      )
      ON CONFLICT (id) DO UPDATE SET 
        friendly_code = EXCLUDED.friendly_code,
        name = EXCLUDED.name,
        organization_type = EXCLUDED.organization_type,
        official_dataset_id = EXCLUDED.official_dataset_id,
        website_url = EXCLUDED.website_url,
        official_publisher = EXCLUDED.official_publisher,
        doi = EXCLUDED.doi,
        frequency = EXCLUDED.frequency,
        supported_geography = EXCLUDED.supported_geography,
        licence_rules = EXCLUDED.licence_rules,
        cache_policy = EXCLUDED.cache_policy,
        priority_rank = EXCLUDED.priority_rank;
    `;
  }

  // 2. Legacy source_capabilities table (keeps existing suite passing)
  console.log('Initializing Source Capabilities Registry...');
  const capabilities = [
    { sourceId: 'dem_cen21', attributeGroup: 'demographics', isAuthorized: true, supportedResolutions: ['PROVINCE', 'CMA', 'CD', 'CSD'], notes: 'Authoritative 2021 Census profiles' },
    { sourceId: 'dem_cen21', attributeGroup: 'household_income', isAuthorized: true, supportedResolutions: ['PROVINCE', 'CMA', 'CD', 'CSD'], notes: 'Census income distributions' },
    { sourceId: 'dem_cen21', attributeGroup: 'housing_stock', isAuthorized: true, supportedResolutions: ['PROVINCE', 'CMA', 'CD', 'CSD'], notes: 'Dwelling structure and tenure' },
    { sourceId: 'dem_cen21', attributeGroup: 'live_competitors', isAuthorized: false, supportedResolutions: [], notes: 'StatCan Census does not track physical competitor locations' },
    { sourceId: 'dem_cen21', attributeGroup: 'ratings', isAuthorized: false, supportedResolutions: [], notes: 'StatCan Census does not publish business reviews or ratings' },
    { sourceId: 'pop_csd_est', attributeGroup: 'annual_population_estimates', isAuthorized: true, supportedResolutions: ['PROVINCE', 'CMA', 'CD', 'CSD'], notes: 'Annual July 1 population estimates' },
    { sourceId: 'bus_cnt_csd', attributeGroup: 'business_counts', isAuthorized: true, supportedResolutions: ['PROVINCE', 'CMA', 'CSD'], notes: 'Canadian Business Counts by employee band' },
    { sourceId: 'bus_cnt_csd', attributeGroup: 'live_competitors', isAuthorized: false, supportedResolutions: [], notes: 'Business Counts table does not supply individual merchant names/addresses' },
    { sourceId: 'bus_cnt_nonemp', attributeGroup: 'non_employer_counts', isAuthorized: true, supportedResolutions: ['CANADA', 'PROVINCE'], notes: 'Canadian Business Counts without employees' },
    { sourceId: 'bus_cnt_nonemp', attributeGroup: 'csd_business_counts', isAuthorized: false, supportedResolutions: [], notes: 'Table 33-10-1175 is published at Province/Canada only; never allocate to CSD' },
    { sourceId: 'spend_shs', attributeGroup: 'household_spending', isAuthorized: true, supportedResolutions: ['PROVINCE', 'CMA'], notes: 'Survey of Household Spending: strictly Provincial & CMA resolution' },
    { sourceId: 'spend_shs', attributeGroup: 'csd_observed_spending', isAuthorized: false, supportedResolutions: [], notes: 'SHS sample size restricts direct CSD municipality reporting' },
    { sourceId: 'wealth_sfs', attributeGroup: 'net_worth', isAuthorized: true, supportedResolutions: ['PROVINCE', 'CMA'], notes: 'Survey of Financial Security: strictly Provincial/CMA benchmark' },
    { sourceId: 'wealth_sfs', attributeGroup: 'csd_observed_wealth', isAuthorized: false, supportedResolutions: [], notes: 'SFS does not publish municipal CSD resolution' },
    { sourceId: 'fuel_retail', attributeGroup: 'gas_prices', isAuthorized: true, supportedResolutions: ['PROVINCE', 'CMA', 'CSD'], notes: 'Monthly retail pump prices by geography' },
    { sourceId: 'muni_fir', attributeGroup: 'municipal_finances', isAuthorized: true, supportedResolutions: ['CSD'], notes: 'Official Financial Information Return multi-year statements' },
    { sourceId: 'rent_cmhc', attributeGroup: 'rental_market', isAuthorized: true, supportedResolutions: ['PROVINCE', 'CMA', 'CSD'], notes: 'CMHC Rental Market Survey vacancy and rent rates' },
    { sourceId: 'rent_cmhc', attributeGroup: 'commercial_rent', isAuthorized: false, supportedResolutions: [], notes: 'CMHC only monitors residential rental markets' },
    { sourceId: 'prop_multi_owner', attributeGroup: 'property_ownership', isAuthorized: true, supportedResolutions: ['PROVINCE', 'CMA', 'CSD'], notes: 'CHSP residential property ownership concentration' },
    { sourceId: 'biz_osm', attributeGroup: 'business_locations', isAuthorized: true, supportedResolutions: ['CSD'], notes: 'OSM-listed business locations; not verified complete active directory' },
    { sourceId: 'biz_osm', attributeGroup: 'ratings', isAuthorized: false, supportedResolutions: [], notes: 'OSM does not provide ratings or reviews' },
    { sourceId: 'biz_osm', attributeGroup: 'revenues', isAuthorized: false, supportedResolutions: [], notes: 'OSM does not track commercial revenues' },
    { sourceId: 'biz_google', attributeGroup: 'ratings', isAuthorized: true, supportedResolutions: ['CSD'], notes: 'Live ratings and review counts' },
    { sourceId: 'biz_google', attributeGroup: 'unrestricted_historical_warehouse', isAuthorized: false, supportedResolutions: [], notes: 'Google terms forbid permanent indefinite storage of Places content' },
    { sourceId: 'biz_google', attributeGroup: 'place_warehouse', isAuthorized: false, supportedResolutions: [], notes: 'Google Places API terms prohibit permanent warehousing of merchant places without real-time refreshes' }
  ];

  for (const cap of capabilities) {
    await sql`
      INSERT INTO source_capabilities (source_id, attribute_group, is_authorized, supported_resolutions, notes)
      VALUES (${cap.sourceId}, ${cap.attributeGroup}, ${cap.isAuthorized}, ${cap.supportedResolutions}, ${cap.notes})
      ON CONFLICT (source_id, attribute_group) DO UPDATE SET
        is_authorized = EXCLUDED.is_authorized,
        supported_resolutions = EXCLUDED.supported_resolutions,
        notes = EXCLUDED.notes;
    `;
  }

  // 3. Datasets Registry (Section 40)
  console.log('Initializing Centralized Datasets Registry...');
  const datasetsToRegister = [
    // Census Profile 2021
    {
      id: 'statcan_census_profile_2021',
      sourceId: 'dem_cen21',
      name: 'Census Profile, 2021 Census of Population',
      datasetCode: '98-316-X2021001',
      referencePeriod: '2021',
      releaseDate: '2022-02-09',
      sourceUrl: 'https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/index.cfm',
      doi: '10.25318/98316x-eng',
      officialPublisher: 'Statistics Canada',
      geographicCoverage: 'CSD_ONTARIO',
      naicsVersion: '2022 v1.0',
      updateFrequency: 'QUENQUENNIAL',
      classification: 'OBSERVED',
      supersedingDatasetId: null,
      staleAfterDays: 1825,
      isCurrent: true
    },
    // SGC 2021
    {
      id: 'statcan_sgc_2021',
      sourceId: 'geo_sgc21',
      name: 'Standard Geographical Classification (SGC) 2021',
      datasetCode: '12-571-X2021001',
      referencePeriod: '2021',
      releaseDate: '2021-11-17',
      sourceUrl: 'https://www.statcan.gc.ca/en/subjects/standard/sgc/2021/index',
      doi: '10.25318/12571x-eng',
      officialPublisher: 'Statistics Canada',
      geographicCoverage: 'CANADA',
      naicsVersion: null,
      updateFrequency: 'QUENQUENNIAL',
      classification: 'OBSERVED',
      supersedingDatasetId: null,
      staleAfterDays: 1825,
      isCurrent: true
    },
    // Boundary Files
    {
      id: 'statcan_csd_boundaries_2021',
      sourceId: 'geo_boundary',
      name: 'Census Subdivision Boundary Files, 2021 Census',
      datasetCode: '92-162-X',
      referencePeriod: '2021',
      releaseDate: '2022-02-09',
      sourceUrl: 'https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/index2021-eng.cfm',
      doi: null,
      officialPublisher: 'Statistics Canada',
      geographicCoverage: 'CSD_ONTARIO',
      naicsVersion: null,
      updateFrequency: 'QUENQUENNIAL',
      classification: 'OBSERVED',
      supersedingDatasetId: null,
      staleAfterDays: 1825,
      isCurrent: true
    },
    // Population Estimates CSD
    {
      id: 'statcan_population_estimates_csd',
      sourceId: 'pop_csd_est',
      name: 'Population estimates, July 1, by Census Subdivision, 2021 boundaries',
      datasetCode: '17-10-0155-01',
      referencePeriod: 'July 1, 2024',
      releaseDate: '2025-01-15',
      sourceUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1710015501',
      doi: '10.25318/1710015501-eng',
      officialPublisher: 'Statistics Canada',
      geographicCoverage: 'CSD_ONTARIO',
      naicsVersion: null,
      updateFrequency: 'ANNUAL',
      classification: 'OBSERVED',
      supersedingDatasetId: null,
      staleAfterDays: 365,
      isCurrent: true
    },
    // Population Projections CSD
    {
      id: 'statcan_population_projections_csd',
      sourceId: 'pop_csd_proj',
      name: 'Projected population for census divisions and census subdivisions, 2021 boundaries',
      datasetCode: '17-10-0162-01',
      referencePeriod: '2025-2046',
      releaseDate: '2025-03-01',
      sourceUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1710016201',
      doi: '10.25318/1710016201-eng',
      officialPublisher: 'Statistics Canada / Ontario MoF',
      geographicCoverage: 'CD_ONTARIO',
      naicsVersion: null,
      updateFrequency: 'ANNUAL',
      classification: 'MODELED',
      supersedingDatasetId: null,
      staleAfterDays: 365,
      isCurrent: true
    },
    // Ethnic & Cultural Origin by Age
    {
      id: 'statcan_census_ethnic_age',
      sourceId: 'dem_ethnic_age',
      name: 'Ethnic or cultural origin by gender and age: CSD with population 5,000+',
      datasetCode: '98-10-0358-01',
      referencePeriod: '2021',
      releaseDate: '2022-10-26',
      sourceUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810035801',
      doi: '10.25318/9810035801-eng',
      officialPublisher: 'Statistics Canada',
      geographicCoverage: 'CSD_ONTARIO',
      naicsVersion: null,
      updateFrequency: 'QUENQUENNIAL',
      classification: 'OBSERVED',
      supersedingDatasetId: null,
      staleAfterDays: 1825,
      isCurrent: true
    },
    // Visible Minority Employment Income
    {
      id: 'statcan_census_vm_income',
      sourceId: 'dem_vm_income_csd',
      name: 'Employment income statistics by visible minority, highest education and immigrant status (CSD 5,000+)',
      datasetCode: '98-10-0440-01',
      referencePeriod: '2020-2021',
      releaseDate: '2022-11-30',
      sourceUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810044001',
      doi: '10.25318/9810044001-eng',
      officialPublisher: 'Statistics Canada',
      geographicCoverage: 'CSD_ONTARIO',
      naicsVersion: null,
      updateFrequency: 'QUENQUENNIAL',
      classification: 'OBSERVED',
      supersedingDatasetId: null,
      staleAfterDays: 1825,
      isCurrent: true
    },
    // Visible Minority Labour Profile
    {
      id: 'statcan_census_vm_labour',
      sourceId: 'dem_vm_labour_csd',
      name: 'Visible minority and labour force characteristics: CSD with population 5,000+',
      datasetCode: '98-10-0436-01',
      referencePeriod: '2021',
      releaseDate: '2022-11-30',
      sourceUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810043601',
      doi: '10.25318/9810043601-eng',
      officialPublisher: 'Statistics Canada',
      geographicCoverage: 'CSD_ONTARIO',
      naicsVersion: null,
      updateFrequency: 'QUENQUENNIAL',
      classification: 'OBSERVED',
      supersedingDatasetId: null,
      staleAfterDays: 1825,
      isCurrent: true
    },
    // Canadian Business Counts (June 2026 - Current superseding release)
    {
      id: 'statcan_business_counts_2026_06',
      sourceId: 'bus_cnt_csd',
      name: 'Canadian Business Counts, with employees, census metropolitan areas and census subdivisions, June 2026',
      datasetCode: '33-10-1176-01',
      referencePeriod: 'June 2026',
      releaseDate: '2026-08-14',
      sourceUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3310117601',
      doi: '10.25318/3310117601-eng',
      officialPublisher: 'Statistics Canada',
      geographicCoverage: 'CSD_ONTARIO',
      naicsVersion: '2022 v1.0',
      updateFrequency: 'SEMI_ANNUAL',
      classification: 'OBSERVED',
      supersedingDatasetId: null,
      staleAfterDays: 180,
      isCurrent: true
    },
    // Canadian Business Counts (Dec 2025 - Superseded, retained for historical lineage)
    {
      id: 'statcan_business_counts_2025_12',
      sourceId: 'bus_cnt_csd',
      name: 'Canadian Business Counts, with employees, census metropolitan areas and census subdivisions, December 2025',
      datasetCode: '33-10-1097-01',
      referencePeriod: 'December 2025',
      releaseDate: '2026-03-04',
      sourceUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3310109701',
      doi: '10.25318/3310109701-eng',
      officialPublisher: 'Statistics Canada',
      geographicCoverage: 'CSD_ONTARIO',
      naicsVersion: '2022 v1.0',
      updateFrequency: 'SEMI_ANNUAL',
      classification: 'OBSERVED',
      supersedingDatasetId: 'statcan_business_counts_2026_06',
      staleAfterDays: 180,
      isCurrent: false
    },
    // Canadian Business Counts without Employees (June 2026 - Canada/Province only)
    {
      id: 'statcan_business_counts_nonemp_2026_06',
      sourceId: 'bus_cnt_nonemp',
      name: 'Canadian Business Counts, without employees, June 2026',
      datasetCode: '33-10-1175-01',
      referencePeriod: 'June 2026',
      releaseDate: '2026-08-14',
      sourceUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3310117501',
      doi: '10.25318/3310117501-eng',
      officialPublisher: 'Statistics Canada',
      geographicCoverage: 'PROVINCE_ONTARIO',
      naicsVersion: '2022 v1.0',
      updateFrequency: 'SEMI_ANNUAL',
      classification: 'BENCHMARK',
      supersedingDatasetId: null,
      staleAfterDays: 180,
      isCurrent: true
    },
    // NAICS 2022
    {
      id: 'statcan_naics_2022',
      sourceId: 'tax_naics22',
      name: 'North American Industry Classification System (NAICS) Canada 2022 v1.0',
      datasetCode: '12-501-X2022001',
      referencePeriod: '2022 v1.0',
      releaseDate: '2022-01-01',
      sourceUrl: 'https://www.statcan.gc.ca/en/subjects/standard/naics/2022/index',
      doi: null,
      officialPublisher: 'Statistics Canada',
      geographicCoverage: 'CANADA',
      naicsVersion: '2022 v1.0',
      updateFrequency: 'QUENQUENNIAL',
      classification: 'OBSERVED',
      supersedingDatasetId: null,
      staleAfterDays: 1825,
      isCurrent: true
    },
    // NOC 2021
    {
      id: 'statcan_noc_2021',
      sourceId: 'tax_noc21',
      name: 'National Occupational Classification (NOC) 2021 Version 1.0',
      datasetCode: '12-583-X2021001',
      referencePeriod: '2021 v1.0',
      releaseDate: '2021-11-17',
      sourceUrl: 'https://www.statcan.gc.ca/en/subjects/standard/noc/2021/index',
      doi: null,
      officialPublisher: 'Statistics Canada / ESDC',
      geographicCoverage: 'CANADA',
      naicsVersion: null,
      updateFrequency: 'QUENQUENNIAL',
      classification: 'OBSERVED',
      supersedingDatasetId: null,
      staleAfterDays: 1825,
      isCurrent: true
    },
    // LFS CMA
    {
      id: 'statcan_lfs_cma_emp',
      sourceId: 'lab_cma',
      name: 'Employment characteristics by census metropolitan area, annual',
      datasetCode: '14-10-0468-01',
      referencePeriod: '2025',
      releaseDate: '2026-01-20',
      sourceUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410046801',
      doi: '10.25318/1410046801-eng',
      officialPublisher: 'Statistics Canada',
      geographicCoverage: 'CMA_ONTARIO',
      naicsVersion: null,
      updateFrequency: 'ANNUAL',
      classification: 'BENCHMARK',
      supersedingDatasetId: null,
      staleAfterDays: 365,
      isCurrent: true
    },
    // Job Bank Wages
    {
      id: 'jobbank_wages_2025',
      sourceId: 'lab_wage',
      name: 'Job Bank Wages by Occupation and Region (NOC 2021)',
      datasetCode: 'JOBBANK-WAGE-2025',
      referencePeriod: '2025',
      releaseDate: '2025-11-15',
      sourceUrl: 'https://www.jobbank.gc.ca/trend-analysis/search-wages',
      doi: null,
      officialPublisher: 'Government of Canada Job Bank / ESDC',
      geographicCoverage: 'ECONOMIC_REGION',
      naicsVersion: null,
      updateFrequency: 'ANNUAL',
      classification: 'BENCHMARK',
      supersedingDatasetId: null,
      staleAfterDays: 365,
      isCurrent: true
    },
    // Retail Gasoline Prices
    {
      id: 'statcan_gasoline_retail_prices',
      sourceId: 'fuel_retail',
      name: 'Monthly average retail prices for gasoline and fuel by selected geography',
      datasetCode: '18-10-0001-01',
      referencePeriod: 'August 2026',
      releaseDate: '2026-08-20',
      sourceUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810000101',
      doi: '10.25318/1810000101-eng',
      officialPublisher: 'Statistics Canada',
      geographicCoverage: 'CMA_ONTARIO',
      naicsVersion: null,
      updateFrequency: 'MONTHLY',
      classification: 'OBSERVED',
      supersedingDatasetId: null,
      staleAfterDays: 30,
      isCurrent: true
    },
    // CMHC RMS 2025
    {
      id: 'cmhc_rental_market_survey_2025',
      sourceId: 'rent_cmhc',
      name: 'CMHC Rental Market Survey 2025 — Vacancy Rates & Average Rent',
      datasetCode: 'CMHC-RMS-2025',
      referencePeriod: '2025',
      releaseDate: '2026-01-28',
      sourceUrl: 'https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/housing-data/data-tables/rental-market',
      doi: null,
      officialPublisher: 'Canada Mortgage and Housing Corporation (CMHC)',
      geographicCoverage: 'CSD_ONTARIO',
      naicsVersion: null,
      updateFrequency: 'ANNUAL',
      classification: 'OBSERVED',
      supersedingDatasetId: null,
      staleAfterDays: 365,
      isCurrent: true
    },
    // Property Ownership Multi-Property
    {
      id: 'statcan_property_ownership_multi',
      sourceId: 'prop_multi_owner',
      name: 'Residential Property Owners by Number of Properties Owned',
      datasetCode: '46-10-0096-01',
      referencePeriod: '2023',
      releaseDate: '2024-11-12',
      sourceUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=4610009601',
      doi: '10.25318/4610009601-eng',
      officialPublisher: 'Statistics Canada (CHSP)',
      geographicCoverage: 'CSD_ONTARIO',
      naicsVersion: null,
      updateFrequency: 'ANNUAL',
      classification: 'OBSERVED',
      supersedingDatasetId: null,
      staleAfterDays: 365,
      isCurrent: true
    },
    // Ontario Municipalities Registry
    {
      id: 'ontario_municipalities_registry',
      sourceId: 'geo_ont_mun',
      name: 'List of Ontario Municipalities',
      datasetCode: 'MMAH-MUN-REG-2026',
      referencePeriod: '2026',
      releaseDate: '2026-05-26',
      sourceUrl: 'https://data.ontario.ca/dataset/municipalities',
      doi: null,
      officialPublisher: 'Government of Ontario (MMAH)',
      geographicCoverage: 'CSD_ONTARIO',
      naicsVersion: null,
      updateFrequency: 'ANNUAL',
      classification: 'OBSERVED',
      supersedingDatasetId: null,
      staleAfterDays: 365,
      isCurrent: true
    },
    // Ontario FIR Multi-Year
    {
      id: 'ontario_fir_multiyear',
      sourceId: 'muni_fir',
      name: 'Financial Information Return (FIR) Multi-Year Reports',
      datasetCode: 'FIR-2023-2024',
      referencePeriod: '2023-2024',
      releaseDate: '2025-10-01',
      sourceUrl: 'https://efis.fma.csc.gov.on.ca/fir/MultiYearReport/MYCIndex.html',
      doi: null,
      officialPublisher: 'Ontario Ministry of Municipal Affairs and Housing',
      geographicCoverage: 'CSD_ONTARIO',
      naicsVersion: null,
      updateFrequency: 'ANNUAL',
      classification: 'OBSERVED',
      supersedingDatasetId: null,
      staleAfterDays: 365,
      isCurrent: true
    },
    // Survey of Household Spending (SHS)
    {
      id: 'statcan_household_spending_shs',
      sourceId: 'spend_shs',
      name: 'Survey of Household Spending, Detailed Expenditures',
      datasetCode: '11-10-0222-01',
      referencePeriod: '2023-2024',
      releaseDate: '2025-05-21',
      sourceUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1110022201',
      doi: '10.25318/1110022201-eng',
      officialPublisher: 'Statistics Canada',
      geographicCoverage: 'PROVINCE_ONTARIO',
      naicsVersion: null,
      updateFrequency: 'BIENNIAL',
      classification: 'BENCHMARK',
      supersedingDatasetId: null,
      staleAfterDays: 730,
      isCurrent: true
    },
    // Survey of Financial Security (SFS)
    {
      id: 'statcan_financial_security_sfs',
      sourceId: 'wealth_sfs',
      name: 'Survey of Financial Security, Assets and Debts',
      datasetCode: '11-10-0049-01',
      referencePeriod: '2023',
      releaseDate: '2024-10-29',
      sourceUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1110004901',
      doi: '10.25318/1110004901-eng',
      officialPublisher: 'Statistics Canada',
      geographicCoverage: 'PROVINCE_ONTARIO',
      naicsVersion: null,
      updateFrequency: 'TRIENNIAL',
      classification: 'BENCHMARK',
      supersedingDatasetId: null,
      staleAfterDays: 1095,
      isCurrent: true
    },
    // OpenStreetMap Commercial Entities
    {
      id: 'osm_business_entities',
      sourceId: 'biz_osm',
      name: 'OpenStreetMap Ontario Commercial Entities',
      datasetCode: 'OSM-OVERPASS-ON',
      referencePeriod: '2026-Q1',
      releaseDate: '2026-01-15',
      sourceUrl: 'https://overpass-api.de/api/interpreter',
      doi: null,
      officialPublisher: 'OpenStreetMap Foundation & Contributors',
      geographicCoverage: 'CSD_ONTARIO',
      naicsVersion: null,
      updateFrequency: 'MONTHLY',
      classification: 'OBSERVED',
      supersedingDatasetId: null,
      staleAfterDays: 30,
      isCurrent: true
    },
    // Commercial Listings & CRE Benchmarks
    {
      id: 'commercial_listings_benchmarks',
      sourceId: 'cre_market',
      name: 'Institutional Commercial Market Snapshots & Retail Leasing Benchmarks',
      datasetCode: 'CRE-REP-2026',
      referencePeriod: '2025-2026',
      releaseDate: '2026-02-01',
      sourceUrl: 'https://www.collierscanada.com/en-ca/research',
      doi: null,
      officialPublisher: 'CBRE / Colliers / JLL / Cushman & Wakefield',
      geographicCoverage: 'CMA_ONTARIO',
      naicsVersion: '2022 v1.0',
      updateFrequency: 'QUARTERLY',
      classification: 'BENCHMARK',
      supersedingDatasetId: null,
      staleAfterDays: 90,
      isCurrent: true
    },
    // CREA DDF Listings API Boundary
    {
      id: 'crea_ddf_listings',
      sourceId: 'cre_listing_ddf',
      name: 'CREA REALTOR.ca Data Distribution Facility Commercial Feed',
      datasetCode: 'CREA-DDF-API',
      referencePeriod: 'Daily Live Feed',
      releaseDate: '2026-09-01',
      sourceUrl: 'https://www.crea.ca/technology-solutions/crea-ddf/',
      doi: null,
      officialPublisher: 'Canadian Real Estate Association (CREA)',
      geographicCoverage: 'CSD_ONTARIO',
      naicsVersion: null,
      updateFrequency: 'DAILY',
      classification: 'OBSERVED',
      supersedingDatasetId: null,
      staleAfterDays: 1,
      isCurrent: true
    },
    // Municipal Official Plans
    {
      id: 'muni_official_plans',
      sourceId: 'muni_official_plan',
      name: 'Municipal Official Plans, Secondary Plans & Strategic Growth Initiatives',
      datasetCode: 'MUNI-OP-2026',
      referencePeriod: '2024-2026',
      releaseDate: '2026-01-01',
      sourceUrl: 'https://www.ontario.ca/page/official-plans',
      doi: null,
      officialPublisher: 'Ontario Municipalities Planning Departments',
      geographicCoverage: 'CSD_ONTARIO',
      naicsVersion: null,
      updateFrequency: 'QUARTERLY',
      classification: 'OBSERVED',
      supersedingDatasetId: null,
      staleAfterDays: 90,
      isCurrent: true
    },
    // Municipal Development Charges
    {
      id: 'muni_development_charges',
      sourceId: 'muni_dev_charge',
      name: 'Municipal Development Charges By-laws and Rates Schedule',
      datasetCode: 'MUNI-DC-2026',
      referencePeriod: '2025-2026',
      releaseDate: '2026-01-01',
      sourceUrl: 'https://www.ontario.ca/document/development-charges-guide',
      doi: null,
      officialPublisher: 'Municipal Treasuries and Planning Services',
      geographicCoverage: 'CSD_ONTARIO',
      naicsVersion: null,
      updateFrequency: 'ANNUAL',
      classification: 'OBSERVED',
      supersedingDatasetId: null,
      staleAfterDays: 365,
      isCurrent: true
    },
    // Investment in Building Construction
    {
      id: 'statcan_building_investments',
      sourceId: 'build_invest',
      name: 'Investment in Building Construction by selected CMA',
      datasetCode: '34-10-0293-01',
      referencePeriod: 'June 2026',
      releaseDate: '2026-08-15',
      sourceUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3410029301',
      doi: '10.25318/3410029301-eng',
      officialPublisher: 'Statistics Canada',
      geographicCoverage: 'CMA_ONTARIO',
      naicsVersion: null,
      updateFrequency: 'MONTHLY',
      classification: 'OBSERVED',
      supersedingDatasetId: null,
      staleAfterDays: 30,
      isCurrent: true
    }
  ];

  for (const ds of datasetsToRegister) {
    await sql`
      INSERT INTO datasets (
        id, source_id, name, dataset_code, reference_period, release_date,
        source_url, doi, official_publisher, geographic_coverage, naics_version,
        update_frequency, classification, superseding_dataset_id, stale_after_days, is_current
      )
      VALUES (
        ${ds.id}, ${ds.sourceId}, ${ds.name}, ${ds.datasetCode}, ${ds.referencePeriod}, ${ds.releaseDate},
        ${ds.sourceUrl}, ${ds.doi}, ${ds.officialPublisher}, ${ds.geographicCoverage}, ${ds.naicsVersion},
        ${ds.updateFrequency}, ${ds.classification}, ${ds.supersedingDatasetId}, ${ds.staleAfterDays}, ${ds.isCurrent}
      )
      ON CONFLICT (id) DO UPDATE SET
        source_id = EXCLUDED.source_id,
        name = EXCLUDED.name,
        dataset_code = EXCLUDED.dataset_code,
        reference_period = EXCLUDED.reference_period,
        release_date = EXCLUDED.release_date,
        source_url = EXCLUDED.source_url,
        doi = EXCLUDED.doi,
        official_publisher = EXCLUDED.official_publisher,
        classification = EXCLUDED.classification,
        superseding_dataset_id = EXCLUDED.superseding_dataset_id,
        is_current = EXCLUDED.is_current,
        updated_at = NOW();
    `;
  }

  // 4. Dataset Capabilities Registry (Granular Positive & Negative enforcement per Section 40)
  console.log('Initializing Granular Dataset Capabilities Registry...');
  const datasetCapabilities = [
    // DEM-CEN21 (statcan_census_profile_2021)
    { datasetId: 'statcan_census_profile_2021', sourceId: 'dem_cen21', attributeGroup: 'demographics', capabilityName: 'Municipal Demographics Profile', isProvided: true, supportedResolutions: ['PROVINCE', 'CMA', 'CD', 'CSD'], notes: 'Canonical 2021 Census population, age, and household characteristics' },
    { datasetId: 'statcan_census_profile_2021', sourceId: 'dem_cen21', attributeGroup: 'household_income', capabilityName: 'Household Income Distribution', isProvided: true, supportedResolutions: ['PROVINCE', 'CMA', 'CD', 'CSD'], notes: 'Median and average after-tax income distributions' },
    { datasetId: 'statcan_census_profile_2021', sourceId: 'dem_cen21', attributeGroup: 'housing_stock', capabilityName: 'Dwelling Tenure & Structural Stock', isProvided: true, supportedResolutions: ['PROVINCE', 'CMA', 'CD', 'CSD'], notes: 'Owner vs renter tenure and structural dwelling types' },
    { datasetId: 'statcan_census_profile_2021', sourceId: 'dem_cen21', attributeGroup: 'live_competitors', capabilityName: 'Active Merchant Locations', isProvided: false, supportedResolutions: [], notes: 'Statistics Canada Census does not monitor individual merchant addresses or store fronts' },
    { datasetId: 'statcan_census_profile_2021', sourceId: 'dem_cen21', attributeGroup: 'business_counts', capabilityName: 'Live Business Entity Counts', isProvided: false, supportedResolutions: [], notes: 'Census of Population cannot provide live business entity counts; use Canadian Business Counts (Table 33-10-1176-01)' },
    { datasetId: 'statcan_census_profile_2021', sourceId: 'dem_cen21', attributeGroup: 'gas_prices', capabilityName: 'Current Fuel Pump Prices', isProvided: false, supportedResolutions: [], notes: 'Census profile does not report retail commodities or gasoline pump prices' },

    // BUS-CNT-CSD (statcan_business_counts_2026_06)
    { datasetId: 'statcan_business_counts_2026_06', sourceId: 'bus_cnt_csd', attributeGroup: 'business_counts', capabilityName: 'Employer Business Counts by Size Band', isProvided: true, supportedResolutions: ['PROVINCE', 'CMA', 'CSD'], notes: 'Active business counts with employees by NAICS sector and employee-size band' },
    { datasetId: 'statcan_business_counts_2026_06', sourceId: 'bus_cnt_csd', attributeGroup: 'live_competitors', capabilityName: 'Merchant Physical Footprints', isProvided: false, supportedResolutions: [], notes: 'Business Counts table publishes statistical aggregates, not individual merchant locations' },

    // BUS-CNT-NONEMP (statcan_business_counts_nonemp_2026_06)
    { datasetId: 'statcan_business_counts_nonemp_2026_06', sourceId: 'bus_cnt_nonemp', attributeGroup: 'non_employer_counts', capabilityName: 'Provincial Non-Employer Counts', isProvided: true, supportedResolutions: ['CANADA', 'PROVINCE'], notes: 'Businesses without employees (owner-operated) at Province and Canada levels' },
    { datasetId: 'statcan_business_counts_nonemp_2026_06', sourceId: 'bus_cnt_nonemp', attributeGroup: 'household_spending', capabilityName: 'Municipal Observed Non-Employer Counts', isProvided: false, supportedResolutions: [], notes: 'Statistics Canada Table 33-10-1175 is published at Canada/Province only; never allocate to CSD' },

    // SPEND-SHS (statcan_household_spending_shs)
    { datasetId: 'statcan_household_spending_shs', sourceId: 'spend_shs', attributeGroup: 'household_spending', capabilityName: 'Ontario Household Spending Benchmark', isProvided: true, supportedResolutions: ['PROVINCE', 'CMA'], notes: 'Survey of Household Spending averages for food, shelter, recreation, transport', constraints: 'PR_35' },
    { datasetId: 'statcan_household_spending_shs', sourceId: 'spend_shs', attributeGroup: 'spending_category', capabilityName: 'Spending Category Distributions', isProvided: true, supportedResolutions: ['PROVINCE', 'CMA'], notes: 'Ontario and CMA household expenditure category benchmarks', constraints: 'PR_35' },
    { datasetId: 'statcan_household_spending_shs', sourceId: 'spend_shs', attributeGroup: 'csd_observed_spending', capabilityName: 'Municipal Observed Spending', isProvided: false, supportedResolutions: [], notes: 'SHS survey sample size limits CSD municipal reporting. Localized estimates must be marked MODELED ESTIMATE.' },

    // WEALTH-SFS (statcan_financial_security_sfs)
    { datasetId: 'statcan_financial_security_sfs', sourceId: 'wealth_sfs', attributeGroup: 'net_worth', capabilityName: 'Provincial & CMA Wealth Benchmarks', isProvided: true, supportedResolutions: ['PROVINCE', 'CMA'], notes: 'Median and mean assets, debts, and net worth for economic families' },
    { datasetId: 'statcan_financial_security_sfs', sourceId: 'wealth_sfs', attributeGroup: 'csd_observed_wealth', capabilityName: 'Municipal Observed Wealth', isProvided: false, supportedResolutions: [], notes: 'SFS sample does not support municipal CSD net worth reporting' },

    // BIZ-GOOGLE (google_places_api)
    { datasetId: 'osm_business_entities', sourceId: 'biz_osm', attributeGroup: 'business_locations', capabilityName: 'OSM-listed Commercial POIs', isProvided: true, supportedResolutions: ['CSD'], notes: 'OSM-listed business locations; not verified complete active directory' },
    { datasetId: 'osm_business_entities', sourceId: 'biz_osm', attributeGroup: 'revenues', capabilityName: 'Merchant Financial Statements', isProvided: false, supportedResolutions: [], notes: 'OSM does not track commercial revenues or financial disclosures' },
    { datasetId: 'osm_business_entities', sourceId: 'biz_osm', attributeGroup: 'ratings', capabilityName: 'Customer Ratings', isProvided: false, supportedResolutions: [], notes: 'OSM does not catalogue customer ratings or reviews' },
    { datasetId: 'osm_business_entities', sourceId: 'biz_osm', attributeGroup: 'place_warehouse', capabilityName: 'Permanent Place Data Warehousing', isProvided: false, supportedResolutions: [], notes: 'Commercial API terms prohibit permanent warehousing of merchant places without real-time refreshes' }
  ];

  for (const cap of datasetCapabilities) {
    await sql`
      INSERT INTO dataset_capabilities (
        dataset_id, source_id, attribute_group, capability_name, is_provided, supported_resolutions, notes, constraints
      )
      VALUES (
        ${cap.datasetId}, ${cap.sourceId}, ${cap.attributeGroup}, ${cap.capabilityName},
        ${cap.isProvided}, ${cap.supportedResolutions}, ${cap.notes}, ${(cap as any).constraints || null}
      )
      ON CONFLICT (dataset_id, attribute_group, capability_name) DO UPDATE SET
        is_provided = EXCLUDED.is_provided,
        supported_resolutions = EXCLUDED.supported_resolutions,
        notes = EXCLUDED.notes,
        constraints = EXCLUDED.constraints;
    `;
  }

  // 5. Dataset Refresh Policies (Section 34)
  console.log('Initializing Dataset Refresh Policies Registry...');
  const refreshPolicies = [
    { datasetId: 'statcan_census_profile_2021', sourceId: 'dem_cen21', frequency: 'QUENQUENNIAL', staleAfterDays: 1825, checkCadence: 'Quinquennial release check', policyDescription: 'Persist indefinitely by version; do not re-download unless revised or successor census profile published.' },
    { datasetId: 'statcan_population_estimates_csd', sourceId: 'pop_csd_est', frequency: 'ANNUAL', staleAfterDays: 365, checkCadence: 'Monthly metadata check', policyDescription: 'Check source monthly; ingest new annual reference period when published; preserve historical years.' },
    { datasetId: 'statcan_population_projections_csd', sourceId: 'pop_csd_proj', frequency: 'ANNUAL', staleAfterDays: 365, checkCadence: 'Quarterly check', policyDescription: 'Version-based scenario projection model; check quarterly; retain previous projection vintages.' },
    { datasetId: 'statcan_business_counts_2026_06', sourceId: 'bus_cnt_csd', frequency: 'SEMI_ANNUAL', staleAfterDays: 180, checkCadence: 'Monthly metadata check', policyDescription: 'Check source monthly; ingest June & December releases; recompute per-capita business density metrics.' },
    { datasetId: 'statcan_gasoline_retail_prices', sourceId: 'fuel_retail', frequency: 'MONTHLY', staleAfterDays: 30, checkCadence: 'Monthly post-release check', policyDescription: 'Refresh monthly following Statistics Canada release; calculate delta vs Toronto; persist monthly observations.' },
    { datasetId: 'statcan_household_spending_shs', sourceId: 'spend_shs', frequency: 'BIENNIAL', staleAfterDays: 730, checkCadence: 'Biennial survey cycle check', policyDescription: 'Metadata/version based; ingest new reference period; strictly Provincial/CMA benchmark.' },
    { datasetId: 'statcan_financial_security_sfs', sourceId: 'wealth_sfs', frequency: 'TRIENNIAL', staleAfterDays: 1095, checkCadence: 'Triennial survey cycle check', policyDescription: 'Occasional product release; version based; strictly Provincial/CMA benchmark.' },
    { datasetId: 'cmhc_rental_market_survey_2025', sourceId: 'rent_cmhc', frequency: 'ANNUAL', staleAfterDays: 365, checkCadence: 'Annual January release check', policyDescription: 'Version-based; check more frequently around expected January release; preserve yearly snapshots.' },
    { datasetId: 'ontario_fir_multiyear', sourceId: 'muni_fir', frequency: 'ANNUAL', staleAfterDays: 365, checkCadence: 'Monthly check post-October', policyDescription: 'Check monthly for newer reporting years; never overwrite prior annual FIR statements.' },
    { datasetId: 'osm_business_entities', sourceId: 'biz_osm', frequency: 'MONTHLY', staleAfterDays: 30, checkCadence: 'Monthly scan', policyDescription: 'Refresh approximately monthly for Ontario municipalities; preserve OSM source IDs and coordinates.' },
    { datasetId: 'crea_ddf_listings', sourceId: 'cre_listing_ddf', frequency: 'DAILY', staleAfterDays: 1, checkCadence: 'Daily 24-hour sync', policyDescription: 'CREA requires daily 24-hr refresh; detect new, removed, price changes; separate asking from sold.' }
  ];

  for (const pol of refreshPolicies) {
    await sql`
      INSERT INTO dataset_refresh_policies (
        dataset_id, source_id, frequency, stale_after_days, check_cadence, policy_description
      )
      VALUES (
        ${pol.datasetId}, ${pol.sourceId}, ${pol.frequency}, ${pol.staleAfterDays}, ${pol.checkCadence}, ${pol.policyDescription}
      )
      ON CONFLICT (dataset_id) DO UPDATE SET
        frequency = EXCLUDED.frequency,
        stale_after_days = EXCLUDED.stale_after_days,
        check_cadence = EXCLUDED.check_cadence,
        policy_description = EXCLUDED.policy_description;
    `;
  }

  // 6. Dataset Licence Rules (Section 40)
  console.log('Initializing Dataset Licence Rules Registry...');
  const licenceRules = [
    { datasetId: 'statcan_census_profile_2021', sourceId: 'dem_cen21', licenceName: 'Statistics Canada Open Licence', licenceUrl: 'https://www.statcan.gc.ca/en/reference/licence', permissionsSummary: 'Permits worldwide, royalty-free, non-exclusive use, reproduction and adaptation.', restrictionsSummary: 'Must retain Statistics Canada attribution; do not misrepresent data as official endorsement.', maxCacheDurationHours: null, canPersistIdentifiersOnly: false, attributionRequired: true, attributionText: 'Source: Statistics Canada, 2021 Census of Population Profile (Catalogue 98-316-X2021001).' },
    { datasetId: 'statcan_business_counts_2026_06', sourceId: 'bus_cnt_csd', licenceName: 'Statistics Canada Open Licence', licenceUrl: 'https://www.statcan.gc.ca/en/reference/licence', permissionsSummary: 'Permits analytical storage and aggregation.', restrictionsSummary: 'Do not de-anonymize or link to identify private businesses.', maxCacheDurationHours: null, canPersistIdentifiersOnly: false, attributionRequired: true, attributionText: 'Source: Statistics Canada Table 33-10-1176-01 (June 2026).' },
    { datasetId: 'ontario_municipalities_registry', sourceId: 'geo_ont_mun', licenceName: 'Open Government Licence – Ontario', licenceUrl: 'https://www.ontario.ca/page/open-government-licence-ontario', permissionsSummary: 'Free to copy, publish, translate, adapt and commercialize.', restrictionsSummary: 'Acknowledge source; do not use Ontario coat of arms or imply provincial endorsement.', maxCacheDurationHours: null, canPersistIdentifiersOnly: false, attributionRequired: true, attributionText: 'Contains information licensed under the Open Government Licence – Ontario.' },
    { datasetId: 'osm_business_entities', sourceId: 'biz_osm', licenceName: 'Open Database License (ODbL) 1.0', licenceUrl: 'https://opendatacommons.org/licenses/odbl/', permissionsSummary: 'Free to share, create, and adapt open database.', restrictionsSummary: 'Attribution required; share-alike on derivative databases; call them OSM-listed businesses; do not mix Google data into OSM.', maxCacheDurationHours: null, canPersistIdentifiersOnly: false, attributionRequired: true, attributionText: '© OpenStreetMap contributors (ODbL).' },
    { datasetId: 'crea_ddf_listings', sourceId: 'cre_listing_ddf', licenceName: 'CREA DDF Permitted Website Rules', licenceUrl: 'https://www.crea.ca/technology-solutions/crea-ddf/', permissionsSummary: 'Authorized live display of MLS® listings for registered participants.', restrictionsSummary: '24-hour refresh mandatory; show broker attribution; asking price cannot be displayed as sold price.', maxCacheDurationHours: 24, canPersistIdentifiersOnly: false, attributionRequired: true, attributionText: 'Listing data supplied by CREA DDF®.' }
  ];

  for (const lr of licenceRules) {
    await sql`
      INSERT INTO dataset_licence_rules (
        dataset_id, source_id, licence_name, licence_url, permissions_summary,
        restrictions_summary, max_cache_duration_hours, can_persist_identifiers_only,
        attribution_required, attribution_text
      )
      VALUES (
        ${lr.datasetId}, ${lr.sourceId}, ${lr.licenceName}, ${lr.licenceUrl}, ${lr.permissionsSummary},
        ${lr.restrictionsSummary}, ${lr.maxCacheDurationHours}, ${lr.canPersistIdentifiersOnly},
        ${lr.attributionRequired}, ${lr.attributionText}
      )
      ON CONFLICT (dataset_id) DO UPDATE SET
        licence_name = EXCLUDED.licence_name,
        licence_url = EXCLUDED.licence_url,
        permissions_summary = EXCLUDED.permissions_summary,
        restrictions_summary = EXCLUDED.restrictions_summary,
        max_cache_duration_hours = EXCLUDED.max_cache_duration_hours,
        can_persist_identifiers_only = EXCLUDED.can_persist_identifiers_only,
        attribution_required = EXCLUDED.attribution_required,
        attribution_text = EXCLUDED.attribution_text;
    `;
  }

  // 7. Dataset Dependencies (Section 40)
  console.log('Initializing Dataset Dependencies Registry...');
  const dependencies = [
    { dependentDatasetId: 'statcan_business_counts_2026_06', prerequisiteDatasetId: 'statcan_naics_2022', dependencyType: 'TAXONOMY', notes: 'Business counts map to NAICS 2022 classification structure' },
    { dependentDatasetId: 'statcan_census_profile_2021', prerequisiteDatasetId: 'statcan_sgc_2021', dependencyType: 'GEOGRAPHY_PARENT', notes: 'Census profile CSD geometries join via SGC 2021 codes' },
    { dependentDatasetId: 'statcan_population_estimates_csd', prerequisiteDatasetId: 'statcan_census_profile_2021', dependencyType: 'BENCHMARK_BASE', notes: 'Annual July 1 postcensal estimates use Census 2021 as benchmark base' },
    { dependentDatasetId: 'statcan_business_counts_2025_12', prerequisiteDatasetId: 'statcan_business_counts_2026_06', dependencyType: 'SUPERSESSION', notes: 'Table 33-10-1097-01 is superseded by Table 33-10-1176-01' }
  ];

  for (const dep of dependencies) {
    await sql`
      INSERT INTO dataset_dependencies (
        dependent_dataset_id, prerequisite_dataset_id, dependency_type, notes
      )
      VALUES (
        ${dep.dependentDatasetId}, ${dep.prerequisiteDatasetId}, ${dep.dependencyType}, ${dep.notes}
      )
      ON CONFLICT (dependent_dataset_id, prerequisite_dataset_id, dependency_type) DO UPDATE SET
        notes = EXCLUDED.notes;
    `;
  }

  // 8. Metrics Definitions with Explicit Classifications (Section 37 & 40)
  console.log('Initializing Metrics Definitions with Explicit Classifications...');
  await sql`
    INSERT INTO metrics_definitions (id, name, category, subcategory, unit, default_classification, definition, formula, preferred_aggregation, geographic_scope_supported, limitations)
    VALUES
      ('pop_total', 'Total Population', 'Demographics', 'Population', 'people', 'OBSERVED', 'Total population counted in the Census of Population for private and collective dwellings.', 'StatCan Census Profile Characteristic 1', 'SUM', 'CSD_AND_ABOVE', 'Confidentiality adjustments applied to small areas.'),
      ('pop_estimate_current', 'Estimated Current Population', 'Demographics', 'Population', 'people', 'OBSERVED', 'Annual July 1 postcensal population estimate by Census Subdivision.', 'StatCan Table 17-10-0155-01', 'SUM', 'CSD_AND_ABOVE', 'Postcensal estimates; revised as subsequent census benchmarks appear.'),
      ('pop_growth_5yr', 'Population Growth (5-Year)', 'Demographics', 'Population', '%', 'DERIVED', 'Percentage population change between 2016 and 2021 Census.', '((Pop 2021 - Pop 2016) / Pop 2016) * 100', 'MEAN', 'CSD_AND_ABOVE', 'Boundary adjustments may affect historical comparisons.'),
      ('pop_density', 'Population Density', 'Demographics', 'Population', 'people/sq km', 'DERIVED', 'Number of residents per square kilometre of land area.', 'Pop 2021 / Land Area sq km', 'WEIGHTED_AVG', 'CSD_AND_ABOVE', 'Rural areas within municipal boundaries dilute core urban density.'),
      ('pop_share_ontario', 'Share of Ontario Population', 'Demographics', 'Population', '%', 'DERIVED', 'Percentage of total Ontario population residing in the municipality.', '(Municipality Pop / Ontario Pop) * 100', 'SUM', 'CSD_AND_ABOVE', 'Directly computed from compatible 2021 Census reference period.'),
      ('pop_projected_2031', 'Projected Population (2031)', 'Demographics', 'Population', 'people', 'MODELED', 'Projected population based on M1 medium growth scenario from Statistics Canada / Ontario MoF Table 17-10-0162-01.', 'Demographic component projection model (fertility, mortality, migration)', 'SUM', 'CD_AND_ABOVE', 'Projection scenario model; not guaranteed forecast.'),
      ('income_median_hh', 'Median Household Total Income', 'Financial', 'Income', 'CAD', 'OBSERVED', 'Median total income of private households in 2020.', 'StatCan Census Profile Characteristic 70', 'MEDIAN', 'CSD_AND_ABOVE', 'Income reflects calendar year 2020.'),
      ('income_average_hh', 'Average Household Total Income', 'Financial', 'Income', 'CAD', 'OBSERVED', 'Mean total income of private households in 2020.', 'StatCan Census Profile Characteristic 69', 'MEAN', 'CSD_AND_ABOVE', 'Sensitive to high-income outliers.'),
      ('income_after_tax_median_hh', 'Median After-Tax Household Income', 'Financial', 'Income', 'CAD', 'OBSERVED', 'Median after-tax income of private households in 2020.', 'StatCan Census Profile Characteristic 73', 'MEDIAN', 'CSD_AND_ABOVE', 'Reflects taxes paid and transfers received.'),
      ('shelter_cost_median_rent', 'Median Monthly Shelter Cost (Tenants)', 'Financial', 'Housing', 'CAD/month', 'OBSERVED', 'Median monthly rent and utilities paid by tenant households.', 'StatCan Census Profile Housing Characteristic', 'MEDIAN', 'CSD_AND_ABOVE', 'Includes subsidized housing units.'),
      ('shelter_cost_median_owner', 'Median Monthly Owner Major Payments', 'Financial', 'Housing', 'CAD/month', 'OBSERVED', 'Median monthly mortgage, property taxes, and condo fees for owners.', 'StatCan Census Profile Housing Characteristic', 'MEDIAN', 'CSD_AND_ABOVE', 'Excludes homes owned without mortgage.'),
      ('dwelling_value_average', 'Average Value of Dwellings', 'Financial', 'Housing', 'CAD', 'OBSERVED', 'Average estimated market value of owner-occupied private dwellings.', 'StatCan Census Profile Housing Characteristic', 'MEAN', 'CSD_AND_ABOVE', 'Self-reported by owner occupants at Census date.'),
      ('labor_participation_rate', 'Labour Force Participation Rate', 'Workforce', 'Labour', '%', 'OBSERVED', 'Total labour force expressed as a percentage of the population aged 15 and over.', '(Labour Force / Pop 15+) * 100', 'WEIGHTED_AVG', 'CSD_AND_ABOVE', 'Excludes institutional residents.'),
      ('labor_unemployment_rate', 'Unemployment Rate', 'Workforce', 'Labour', '%', 'OBSERVED', 'Unemployed persons expressed as a percentage of the total labour force.', '(Unemployed / Labour Force) * 100', 'WEIGHTED_AVG', 'CSD_AND_ABOVE', 'Based on census week employment status.'),
      ('labor_cma_unemployment_rate', 'CMA Unemployment Rate', 'Workforce', 'Labour', '%', 'BENCHMARK', 'Labour Force Survey annual unemployment rate by Census Metropolitan Area.', 'Unemployed / Labour Force * 100', 'WEIGHTED_AVG', 'PROVINCE_AND_CMA_ONLY', 'CMA benchmark only; municipal LFS resolution unavailable.'),
      ('labor_cma_employment', 'CMA Total Employment', 'Workforce', 'Labour', 'people', 'BENCHMARK', 'Labour Force Survey annual employed persons count by Census Metropolitan Area.', 'LFS Annual Table 14-10-0468-01', 'SUM', 'PROVINCE_AND_CMA_ONLY', 'CMA benchmark only.'),
      ('spending_food_restaurant', 'Food Purchased from Restaurants', 'Spending', 'Consumer', 'CAD/year', 'BENCHMARK', 'Average annual household expenditure on restaurant food and takeout.', 'StatCan Survey of Household Spending Table 11-10-0222-01', 'MEAN', 'PROVINCE_AND_CMA_ONLY', 'Survey sample size limits CSD municipal reporting. Displayed as CMA/Provincial benchmark.'),
      ('spending_shelter_total', 'Total Shelter Expenditure', 'Spending', 'Consumer', 'CAD/year', 'BENCHMARK', 'Average annual household expenditure on principal accommodation.', 'StatCan Survey of Household Spending Table 11-10-0222-01', 'MEAN', 'PROVINCE_AND_CMA_ONLY', 'Provincial/CMA benchmark; municipal data unavailable.'),
      ('net_worth_median_family', 'Median Family Net Worth', 'Financial', 'Wealth', 'CAD', 'BENCHMARK', 'Median total assets minus total debts of economic family units.', 'StatCan Survey of Financial Security Table 11-10-0016-01', 'MEDIAN', 'PROVINCE_AND_CMA_ONLY', 'Sample survey; municipal CSD resolution unavailable. Displayed as CMA/Provincial benchmark.'),
      ('net_worth_average_family', 'Average Family Net Worth', 'Financial', 'Wealth', 'CAD', 'BENCHMARK', 'Average total assets minus total debts of economic family units.', 'StatCan Survey of Financial Security Table 11-10-0016-01', 'MEAN', 'PROVINCE_AND_CMA_ONLY', 'Survey sample; not published at CSD municipal resolution.'),
      ('municipal_operating_budget', 'Municipal Operating Budget', 'Municipal', 'Budget', 'CAD', 'OBSERVED', 'Total annual municipal operating expenditures reported in Schedule 40 of Ontario FIR.', 'Ontario MMAH FIR Schedule 40 Line 9910 Column 1', 'SUM', 'CSD_AND_ABOVE', 'Represents lower-tier or single-tier municipal operations.'),
      ('municipal_capital_expenditures', 'Municipal Capital Expenditures', 'Municipal', 'Budget', 'CAD', 'OBSERVED', 'Total annual capital asset expenditures reported in Schedule 51 of Ontario FIR.', 'Ontario MMAH FIR Schedule 51 Line 9910 Column 1', 'SUM', 'CSD_AND_ABOVE', 'Lumpy year-over-year depending on major infrastructure cycles.'),
      ('municipal_taxation_revenue', 'Municipal Property Taxation Revenue', 'Municipal', 'Revenue', 'CAD', 'OBSERVED', 'Total property tax revenue collected for own municipal purposes.', 'Ontario MMAH FIR Schedule 10 Line 9910 Column 1', 'SUM', 'CSD_AND_ABOVE', 'Excludes taxes collected on behalf of school boards.'),
      ('businesses_total_counts', 'Total Employer Establishments', 'Businesses', 'Counts', 'businesses', 'OBSERVED', 'Active business locations with employees recorded in Canadian Business Counts.', 'StatCan Table 33-10-1176-01 June 2026', 'SUM', 'CSD_AND_ABOVE', 'Counts statistical locations; does not measure total employee headcount.'),
      ('businesses_per_1000_pop', 'Businesses per 1,000 Residents', 'Businesses', 'Density', 'businesses/1,000 pop', 'DERIVED', 'Ratio of active employer businesses to population.', '(Total Businesses / Pop) * 1000', 'MEAN', 'CSD_AND_ABOVE', 'Higher ratios indicate commercial hubs or employment centres.'),
      ('businesses_non_employer_counts', 'Total Non-Employer Businesses', 'Businesses', 'Counts', 'businesses', 'BENCHMARK', 'Businesses without employee payroll reported at Province and Canada levels (Table 33-10-1175-01). Prohibited from municipal allocation.', 'StatCan Table 33-10-1175-01 June 2026', 'SUM', 'PROVINCE_AND_CMA_ONLY', 'Published strictly at Provincial/National level.'),
      ('commercial_rent_retail_net', 'Average Retail Asking Net Rent', 'Commercial', 'Real Estate', 'CAD/sq ft/year', 'OBSERVED', 'Average net asking annual rent per square foot for commercial retail plazas.', 'Commercial Real Estate Brokerage Reports (CBRE/Colliers)', 'MEDIAN', 'CSD_AND_ABOVE', 'Triple net (NNN) asking rate; excludes TMI additional rent.'),
      ('commercial_retail_vacancy', 'Retail Commercial Vacancy Rate', 'Commercial', 'Real Estate', '%', 'OBSERVED', 'Percentage of available vacant retail square footage in the municipality.', 'Commercial Market Quarterly Survey', 'MEAN', 'CSD_AND_ABOVE', 'Varies significantly between prime retail corridors and secondary strips.'),
      ('fuel_price_gasoline', 'Retail Gasoline Pump Price', 'Commercial', 'Operating Cost', 'cents/litre', 'OBSERVED', 'Monthly average retail pump price for regular unleaded gasoline.', 'StatCan Table 18-10-0001-01', 'MEAN', 'CSD_AND_ABOVE', 'Monthly survey.'),
      ('fuel_gas_delta_to_toronto', 'Gas Price Delta vs Toronto Benchmark', 'Commercial', 'Operating Cost', 'cents/litre', 'DERIVED', 'Absolute difference in retail pump price compared to Toronto reference price for identical month.', 'City Price - Toronto Price', 'MEAN', 'CSD_AND_ABOVE', 'Negative indicates cheaper fuel than Toronto.'),
      ('prop_multi_owner_pct', 'Multiple-Property Owner Share', 'Housing', 'Ownership', '%', 'DERIVED', 'Percentage of residential property owners owning more than one residential property.', '(Multiple Property Owners / Total Owners) * 100', 'MEAN', 'CSD_AND_ABOVE', 'Covers private individual property owners; excludes corporate ownership.'),
      ('prop_total_owners', 'Total Residential Property Owners', 'Housing', 'Ownership', 'owners', 'OBSERVED', 'Count of residential property owners residing in the municipality.', 'StatCan Table 46-10-0096-01', 'SUM', 'CSD_AND_ABOVE', 'CHSP administrative tax data matching.'),
      ('rental_average_rent_2bed', 'CMHC Average 2-Bedroom Rent', 'Housing', 'Rental', 'CAD/month', 'OBSERVED', 'Average monthly rent for purpose-built 2-bedroom apartments in structures of 3+ units.', 'CMHC Rental Market Survey', 'MEAN', 'CSD_AND_ABOVE', 'Purpose-built rental universe; excludes secondary condominium rental market.'),
      ('rental_vacancy_rate', 'CMHC Rental Vacancy Rate', 'Housing', 'Rental', '%', 'OBSERVED', 'Percentage of purpose-built rental apartment units vacant and available for immediate occupancy.', 'CMHC Rental Market Survey', 'MEAN', 'CSD_AND_ABOVE', 'October survey reference period.'),
      ('construction_investment_monthly', 'Monthly Building Construction Investment', 'Commercial', 'Development', 'CAD millions/month', 'OBSERVED', 'Total investment in building construction (residential + non-residential) from StatCan Table 34-10-0293-01.', 'StatCan Table 34-10-0293-01', 'SUM', 'PROVINCE_AND_CMA_ONLY', 'Published at Province and CMA level.'),
      ('dev_charge_commercial_sqft', 'Commercial Development Charge', 'Municipal', 'Development Charges', 'CAD/sq ft', 'OBSERVED', 'Official municipal and regional development charge per square foot of gross floor area for commercial retail.', 'Municipal DC By-law Schedule', 'MEAN', 'CSD_AND_ABOVE', 'Specific to municipal by-law and category.'),
      ('dev_charge_residential_single', 'Residential Development Charge (Single Detached)', 'Municipal', 'Development Charges', 'CAD/unit', 'OBSERVED', 'Official municipal and regional development charge per single detached residential dwelling unit.', 'Municipal DC By-law Schedule', 'MEAN', 'CSD_AND_ABOVE', 'Specific to municipal by-law.')
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      unit = EXCLUDED.unit,
      default_classification = EXCLUDED.default_classification,
      definition = EXCLUDED.definition,
      formula = EXCLUDED.formula,
      limitations = EXCLUDED.limitations;
  `;

  console.log('Registries initialized successfully.');
}

/**
 * Programmatic capability checker checking both legacy and dataset-level tables.
 */
export async function checkSourceCapability(
  sourceFriendlyCode: string, 
  attributeGroup: string, 
  requestedResolution?: string
): Promise<{ authorized: boolean; reason?: string }> {
  const [source] = await sql`SELECT id, name, friendly_code FROM sources WHERE friendly_code = ${sourceFriendlyCode} OR id = ${sourceFriendlyCode};`;
  if (!source) {
    return { authorized: false, reason: `Unknown source code: '${sourceFriendlyCode}'` };
  }

  const [cap] = await sql`
    SELECT is_authorized, supported_resolutions, notes 
    FROM source_capabilities 
    WHERE source_id = ${source.id} AND attribute_group = ${attributeGroup};
  `;

  if (!cap) {
    return { authorized: false, reason: `No registered capability for source '${source.name}' and attribute '${attributeGroup}'` };
  }

  if (!cap.is_authorized) {
    return { authorized: false, reason: `Attribute '${attributeGroup}' is NOT authorized for source '${source.name}': ${cap.notes}` };
  }

  if (requestedResolution && cap.supported_resolutions && cap.supported_resolutions.length > 0) {
    if (!cap.supported_resolutions.includes(requestedResolution)) {
      return { 
        authorized: false, 
        reason: `Requested resolution '${requestedResolution}' is not supported by '${source.name}' (Supported: ${cap.supported_resolutions.join(', ')})` 
      };
    }
  }

  return { authorized: true };
}
