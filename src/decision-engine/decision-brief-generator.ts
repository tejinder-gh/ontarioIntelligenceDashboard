import type {
  CandidateComparison,
  DecisionBrief,
  DecisionModel,
  FinancialEconomics,
  FunnelCandidate,
  MaterialUnknown,
  OperatingScenario,
  RecommendationOutcome,
} from './types.js';
import { getCategoryProfile } from './category-profiles.js';

export function generateDecisionBrief(
  topCandidate: FunnelCandidate,
  alternatives: CandidateComparison[],
  model: DecisionModel,
  activeScenario: OperatingScenario,
  economics: FinancialEconomics,
  unknowns: MaterialUnknown[]
): DecisionBrief {
  const profile = getCategoryProfile(model.categoryId);
  const unitLabel = model.volumeUnit || profile.volumeUnit;
  const isIndustrial = model.categoryId === 'logistics_warehouse';

  // Feasibility Gate logic
  let outcome: RecommendationOutcome = 'PROCEED_WITH_VERIFICATION';
  let feasibilityGateNote = '';

  if (topCandidate.zoningFeasibilityStatus === 'DISALLOWED') {
    outcome = 'DO_NOT_PROCEED';
    feasibilityGateNote = 'FEASIBILITY GATE FAILED: Municipal planning or environmental zoning strictly prohibits requested operating format at this candidate location.';
  } else if (topCandidate.zoningFeasibilityStatus === 'UNVERIFIED_PENDING_REVIEW') {
    feasibilityGateNote = 'FEASIBILITY GATE ACTIVE: Commercial/industrial permitted use and physical utility capacity are unverified. No capital commitments permitted until official municipal zoning compliance certificate is issued.';
  } else {
    feasibilityGateNote = 'FEASIBILITY GATE VERIFIED: Municipal permitted use verified as-of-right for target NAICS classification.';
  }

  // Capital check
  if (model.investmentCapital < 100000 || !economics.breakEvenFeasible || economics.breakEvenDailyUnits > 250) {
    outcome = 'DO_NOT_PROCEED';
  }

  const headline = outcome === 'PROCEED_WITH_VERIFICATION'
    ? `Target ${topCandidate.name} (${topCandidate.city}) for ${activeScenario.label} under conditional due diligence.`
    : `DO NOT PROCEED: Investment capital buffer, contribution economics, or break-even volume exceeds viable thresholds.`;

  const whyThisLocation = [
    `Strong Macro Demographics & Market Base: ${topCandidate.city} combines a robust municipal population (${topCandidate.population2021.toLocaleString()}) with sustained growth (+${topCandidate.populationGrowthPct.toFixed(1)}%) and high median household income ($${topCandidate.medianIncome.toLocaleString()}).`,
    `Favorable Occupancy Economics: Benchmark ${isIndustrial ? 'industrial' : 'commercial retail'} lease rate of $${topCandidate.commercialGrossRentSqft.toFixed(2)}/sqft gross preserves sustainable operating margins.`,
    `Audited Competitive Density: ${topCandidate.estimatedDirectCompetitors} licensed NAICS ${model.naicsCode} establishments active in the municipality (StatCan Business Counts Table 33-10-1176-01), permitting strategic market differentiation.`,
    topCandidate.propertyAddress
      ? `Physical Premise Screening: Active listing #${topCandidate.listingId || 'N/A'} at ${topCandidate.propertyAddress} offers ${topCandidate.squareFootage || profile.typicalSqftMin} sqft footprint.`
      : `Neighbourhood-Level Resolution: Filtered to ${topCandidate.neighbourhood || topCandidate.city}; individual property leasehold selection pending broker RFP.`
  ];

  const whyNotAlternatives = alternatives.slice(1).map(alt => ({
    candidateName: `${alt.candidate.name} (${alt.candidate.city})`,
    tradeOffReason: alt.rankingRationale
  }));

  const whatCouldMakeThisWrong = [
    `Intermediary Channel Cannibalization: Excessive reliance on third-party brokerages or digital aggregators can compress net operating margin by >$15,000 annually.`,
    `Undisclosed Tenant Infrastructure Upgrades: ${profile.essentialInfrastructure[0] || 'Mechanical systems'} can trigger unexpected capital expenditure during fit-out.`,
    `Competitive Ingress: Local incumbents may possess established contract relationships or generational customer loyalty requiring sustained marketing spend to penetrate.`,
    `Macroeconomic Discretionary Compression: Elevated interest rates or inflation could slow discretionary consumer demand or corporate logistics spending.`
  ];

  if (model.categoryLimitations) {
    whatCouldMakeThisWrong.push(`Category Coverage Limitation: ${model.categoryLimitations}`);
  }

  const beforeCommitting = [
    `Execute Official Municipal Zoning Check: Confirm NAICS ${model.naicsCode} permitted as-of-right under ${profile.requiredZoningClass}.`,
    `Perform Professional MEP Engineering Audit: Verify on-site capacity for ${profile.essentialInfrastructure.slice(0, 2).join(' and ')}.`,
    `Negotiate Lease Protection Terms: Insist on a minimum 90-day fixturing period, CAM controllable escalation caps (<= 5%/yr), and personal guarantee burn-off clauses.`,
    `Verify Field Logistics / Site Access: Conduct physical inspection during peak operating hours to audit ingress, loading zones, and arterial traffic flow.`
  ];

  const sources = [
    {
      name: 'Statistics Canada Census Profile (2021)',
      friendlyCode: 'DEM-CEN21',
      coverage: 'Complete Ontario Census Subdivisions (CSDs)',
      limitations: 'Official baseline updated quinquennially; municipal population counts do not measure localized micro-corridor foot traffic.'
    },
    {
      name: 'Statistics Canada Canadian Business Counts (June 2026)',
      friendlyCode: 'BUS-CNT-CSD',
      coverage: `Registered commercial establishments under NAICS ${model.naicsCode}`,
      limitations: 'Captures formal employer entities with active CRA payroll accounts. Non-employer sole proprietorships not enumerated.'
    },
    {
      name: 'Statistics Canada Survey of Household Spending (Table 11-10-0222-01)',
      friendlyCode: 'EXP-SHS-CSD',
      coverage: 'Household income and discretionary expenditure baselines',
      limitations: 'Survey data aggregated at regional economic level; reflects consumer expenditure rather than B2B industrial procurement.'
    },
    {
      name: 'CBRE & Colliers Commercial Market Reports (Q4)',
      friendlyCode: 'CRE-BENCHMARK-GTA',
      coverage: 'Prevailing gross and net asking lease rates by municipality and property classification',
      limitations: 'Submarket averages. Specific tenant lease contracts require site-specific TI allowances, escalations, and CAM audit.'
    }
  ];

  return {
    recommendation: {
      marketOrLocation: topCandidate.propertyAddress 
        ? `${topCandidate.propertyAddress}, ${topCandidate.city}`
        : `${topCandidate.neighbourhood || 'Commercial Core'}, ${topCandidate.city}`,
      resolutionTier: topCandidate.resolutionTier,
      operatingFormat: model.format,
      ownershipModel: model.ownership,
      outcome,
      summaryHeadline: headline,
      feasibilityGateNote
    },
    whyThisLocation,
    whyNotAlternatives,
    economics: {
      requiredCapital: economics.totalInitialCapital,
      breakEvenDailyOrders: economics.breakEvenDailyUnits,
      breakEvenUnitsLabel: unitLabel,
      baseNetIncome: economics.bands.baseCase.netOperatingIncome,
      scenarioRanges: `Conservative: $${economics.bands.conservative.netOperatingIncome.toLocaleString()}/yr | Base Case: $${economics.bands.baseCase.netOperatingIncome.toLocaleString()}/yr | Optimistic: $${economics.bands.optimistic.netOperatingIncome.toLocaleString()}/yr`
    },
    whatCouldMakeThisWrong,
    beforeCommitting,
    sources
  };
}
