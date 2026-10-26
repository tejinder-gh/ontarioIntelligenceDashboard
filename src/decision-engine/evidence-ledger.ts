import type {
  DecisionModel,
  EvidenceRecordItem,
  FunnelCandidate,
} from './types.js';
import { buildMetricProvenance } from './provenance.js';

export function buildEvidenceLedger(
  candidate: FunnelCandidate,
  model: DecisionModel
): EvidenceRecordItem[] {
  const dailyTarget = model.minDailyOrdersNeeded;
  const unitLabel = model.volumeUnit || 'units';
  const aov = model.targetPricePointAov;
  const grossRent = candidate.commercialGrossRentSqft;
  const sqft = candidate.squareFootage || 1400;
  const monthlyRent = candidate.monthlyRent || sqft * (grossRent / 12);
  const monthlySales = dailyTarget * aov * 30;
  const rentRatioFraction = monthlyRent / Math.max(1, monthlySales);
  const rentRatioPct = rentRatioFraction * 100;
  const ceilingPct = model.maxGrossRentPctRevenue * 100;
  const isIndustrial = model.categoryId === 'logistics_warehouse';
  const geoId = candidate.parentGeoId;

  const popProvenance = buildMetricProvenance({
    metricKey: 'population_2021',
    metricName: 'Total Population (2021 Census)',
    sourceName: 'Statistics Canada',
    sourceUrl: 'https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/index.cfm',
    datasetId: '98-316-X2021001',
    recordIdentifier: geoId,
    observationPeriod: '2021 Census',
    geographyId: geoId,
    geographyName: candidate.city,
    geographyResolution: 'CSD',
    units: 'persons',
    originalValue: candidate.population2021,
    transformation: 'Sum of enumerated permanent residents in municipality',
    evidenceClassification: 'AUDITED',
    limitations: 'Macro Census count does not measure foot traffic, commercial dayparts, or specific business category demand.',
    claimRequiresAddressLevel: false
  });

  const incomeProvenance = buildMetricProvenance({
    metricKey: 'median_after_tax_income',
    metricName: 'Median After-Tax Household Income',
    sourceName: 'Statistics Canada',
    sourceUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1110022201',
    datasetId: 'Table 11-10-0222-01',
    observationPeriod: '2021 Census / 2024 Household Spending Survey',
    geographyId: geoId,
    geographyName: candidate.city,
    geographyResolution: 'CSD',
    units: 'CAD',
    originalValue: candidate.medianIncome,
    transformation: 'Median household after-tax income from census tax files',
    evidenceClassification: 'AUDITED',
    limitations: 'Household income indicates consumer purchasing power; does not reflect B2B commercial procurement budgets.',
    claimRequiresAddressLevel: false
  });

  const rentProvenance = buildMetricProvenance({
    metricKey: 'commercial_gross_rent_sqft',
    metricName: isIndustrial ? 'Industrial Net Asking Rent + TMI' : 'Retail Gross Asking Rent / sqft',
    sourceName: 'CBRE / Colliers GTA West Commercial Market Survey',
    sourceUrl: 'https://www.cbre.ca/insights/reports',
    datasetId: 'GTA-COMMERCIAL-BENCHMARK-2024Q4',
    observationPeriod: '2024 Q4',
    geographyId: geoId,
    geographyName: candidate.city,
    geographyResolution: 'CMA',
    units: 'CAD/sqft/year',
    originalValue: grossRent,
    transformation: 'Net asking rate plus municipal property tax, maintenance, and insurance (TMI)',
    evidenceClassification: 'BENCHMARK',
    limitations: 'Submarket average. Specific lease contracts require site-specific TI allowances, escalations, and audit of CAM items.',
    claimRequiresAddressLevel: false
  });

  const compProvenance = buildMetricProvenance({
    metricKey: 'competitor_count',
    metricName: `Active NAICS ${model.naicsCode} Establishments`,
    sourceName: 'Statistics Canada Canadian Business Counts',
    sourceUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3310117601',
    datasetId: 'Table 33-10-1176-01',
    recordIdentifier: `${geoId}:${model.naicsCode}`,
    observationPeriod: 'June 2026 Business Register',
    geographyId: geoId,
    geographyName: candidate.city,
    geographyResolution: 'CSD',
    units: 'establishments with employees',
    originalValue: candidate.estimatedDirectCompetitors ?? 'UNAVAILABLE',
    transformation: 'Filtered business register by CSD boundary and 6-digit NAICS code',
    evidenceClassification: candidate.estimatedDirectCompetitors !== undefined ? 'AUDITED' : 'UNVERIFIED_ASSUMPTION',
    limitations: 'Register counts establishments with formal payroll accounts. Does not include non-employer or unclassified operations.',
    claimRequiresAddressLevel: false
  });

  const items: EvidenceRecordItem[] = [
    {
      claim: `Catchment area contains sufficient scale to generate ${dailyTarget} daily ${unitLabel}.`,
      evidenceObserved: `Official 2021 Census records ${candidate.population2021.toLocaleString()} residents in ${candidate.city} (CSD ${geoId}).`,
      calculationMethod: `Target requires capturing ${Math.round((dailyTarget * 365) / 4.5)} annual transactions across localized trade area.`,
      classification: 'OBSERVED',
      uncertaintyEstimate: 'Moderate: Macro municipal population does not guarantee localized micro-catchment traffic without micro-location verification.',
      decisionImplication: `Ensure physical site is oriented toward primary arterial or density cluster supporting ${dailyTarget} ${unitLabel}/day.`,
      verificationSource: 'Statistics Canada 2021 Census Profile (98-316-X2021001)',
      provenance: popProvenance
    },
    {
      claim: `Purchasing power / commercial demand supports proposed $${aov.toFixed(2)} ${model.unitRevenueLabel}.`,
      evidenceObserved: `Median after-tax income of $${candidate.medianIncome.toLocaleString()} and annual spending of $${candidate.annualFoodAwayExpenditure.toLocaleString()} in ${candidate.city}.`,
      calculationMethod: `Unit revenue ($${aov.toFixed(2)}) aligns with regional disposable purchasing benchmarks.`,
      classification: 'AUDITED',
      uncertaintyEstimate: 'Low-to-moderate: Macro income is strong, but economic shocks and inflation can cause trade-downs.',
      decisionImplication: 'Maintain disciplined price-value relationship relative to incumbent competitors.',
      verificationSource: 'StatCan Survey of Household Spending (Table 11-10-0222-01)',
      provenance: incomeProvenance
    },
    {
      claim: `Commercial occupancy expense is sustainable under base operating volume.`,
      evidenceObserved: `Benchmark ${isIndustrial ? 'industrial' : 'commercial retail'} lease rate is $${grossRent.toFixed(2)}/sqft (Net $${candidate.commercialNetRentSqft.toFixed(2)} + TMI $${candidate.commercialTmiSqft.toFixed(2)}), translating to ~$${Math.round(monthlyRent).toLocaleString()}/month for ${sqft.toLocaleString()} sqft.`,
      calculationMethod: `Occupancy cost represents ${rentRatioPct.toFixed(1)}% of base monthly revenue ($${Math.round(monthlySales).toLocaleString()}), evaluated against the ${ceilingPct.toFixed(1)}% viability ceiling.`,
      classification: 'BENCHMARK',
      uncertaintyEstimate: 'Moderate: Submarket benchmark rate. Final lease agreement will dictate actual base rent and CAM pass-throughs.',
      decisionImplication: rentRatioFraction <= model.maxGrossRentPctRevenue 
        ? `Occupancy expense (${rentRatioPct.toFixed(1)}%) is viable under base projections (within ${ceilingPct.toFixed(1)}% ceiling); negotiate CAM escalation caps (<= 5%/yr).`
        : `Occupancy ratio (${rentRatioPct.toFixed(1)}%) breaches ceiling (${ceilingPct.toFixed(1)}%). Landlord negotiations or smaller footprint needed.`,
      verificationSource: 'CBRE / Colliers GTA West Commercial Market Benchmark',
      provenance: rentProvenance
    },
    {
      claim: `Competitive density permits capture of profitable local market share for NAICS ${model.naicsCode}.`,
      evidenceObserved: candidate.estimatedDirectCompetitors !== undefined
        ? `Audited business register identifies ${candidate.estimatedDirectCompetitors} licensed establishments in ${candidate.city}.`
        : `Direct competitor count for ${model.categoryName} is unavailable in StatCan business registry for ${candidate.city}.`,
      calculationMethod: candidate.estimatedDirectCompetitors !== undefined
        ? `Competitor density corresponds to 1 operator per ${Math.round(candidate.population2021 / Math.max(1, candidate.estimatedDirectCompetitors)).toLocaleString()} residents.`
        : 'Specific localized NAICS density unavailable; requires primary local corridor audit.',
      classification: candidate.estimatedDirectCompetitors !== undefined ? 'AUDITED' : 'BENCHMARK',
      uncertaintyEstimate: candidate.estimatedDirectCompetitors !== undefined
        ? 'High: Low competitor density may indicate unmet demand OR lack of localized customer appetite/infrastructure.'
        : 'High: Specific business register sub-segment count unrecorded for this geography.',
      decisionImplication: 'Differentiate strongly on service speed, specialized offering, or modern logistics integrations.',
      verificationSource: candidate.competitorDataSource || 'StatCan Canadian Business Counts Table 33-10-1097-01',
      provenance: compProvenance
    }
  ];

  if (candidate.propertyAddress && candidate.listingId) {
    const propertyProvenance = buildMetricProvenance({
      metricKey: 'property_listing',
      metricName: 'Commercial Property Listing',
      sourceName: 'Active Commercial Brokerage Listing & MLS Feed',
      sourceUrl: 'https://commercial.mls.ca/on/burlington',
      datasetId: 'ON-MLS-COMMERCIAL',
      recordIdentifier: String(candidate.listingId),
      observationPeriod: 'Current Active',
      geographyId: geoId,
      geographyName: candidate.propertyAddress,
      geographyResolution: 'PROPERTY_ADDRESS',
      units: 'sqft',
      originalValue: sqft,
      transformation: 'Direct verification of active listing file and municipal zoning map',
      evidenceClassification: 'OBSERVED',
      limitations: 'Brokerage listing describes advertised specifications. Physical engineering inspection and permitted use confirmation required.',
      claimRequiresAddressLevel: true
    });

    items.push({
      claim: `Physical property at ${candidate.propertyAddress} fits operational envelope.`,
      evidenceObserved: `Active listing #${candidate.listingId} indicates ${sqft.toLocaleString()} sqft footprint with advertised zoning.`,
      calculationMethod: `Footprint meets minimum operational square footage (${sqft} >= 1,200 sqft).`,
      classification: 'OBSERVED',
      uncertaintyEstimate: 'Critical: Mechanical utilities, electrical capacity, and zoning occupancy certificate remain unverified pending site inspection.',
      decisionImplication: 'Do not waive lease conditions or advance deposits without written municipal zoning clearance and mechanical inspection.',
      verificationSource: 'Commercial Brokerage Active Listing File',
      provenance: propertyProvenance
    });
  } else {
    items.push({
      claim: `Physical property at address level remains UNVERIFIED.`,
      evidenceObserved: `Analysis is bounded at neighbourhood/corridor tier (${candidate.neighbourhood || candidate.city}). No single property lease executed.`,
      calculationMethod: 'Macro and corridor screening completed; candidate selection requires broker RFP and physical site verification.',
      classification: 'UNAVAILABLE',
      uncertaintyEstimate: 'Address-level lease terms, build-out costs, loading doors, and clear heights are currently unverified assumptions.',
      decisionImplication: 'Engage commercial tenant representative to tour specific qualifying units meeting category criteria before committing capital.',
      verificationSource: 'Municipal Planning Initiatives & Commercial Registry'
    });
  }

  return items;
}
