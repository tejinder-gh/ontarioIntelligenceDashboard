import { z } from 'zod';

export type OperatingFormat = 'TAKEOUT_DELIVERY' | 'FAST_CASUAL' | 'DINE_IN' | 'GHOST_KITCHEN';
export type OwnershipType = 'INDEPENDENT' | 'FRANCHISE';
export type OwnerInvolvement = 'FULL_TIME_OPERATOR' | 'SEMI_ABSENTEE' | 'INVESTOR';
export type ResolutionTier = 'PROSPECTIVE_MARKET' | 'PROMISING_NEIGHBOURHOOD' | 'POTENTIALLY_SUITABLE_PROPERTY' | 'FEASIBILITY_VERIFIED_PROPERTY';
export type EvidenceClassification = 'OBSERVED' | 'AUDITED' | 'BENCHMARK' | 'DERIVED' | 'UNAVAILABLE';
export type HypothesisStatus = 'SUPPORTED' | 'CONTRADICTED' | 'INCONCLUSIVE';
export type RecommendationOutcome = 'PROCEED_WITH_VERIFICATION' | 'DO_NOT_PROCEED' | 'INVESTIGATE_ALTERNATIVE';

export const DecisionInquirySchema = z.object({
  inquiry: z.string().min(3),
  categoryId: z.string().default('pizza_store'),
  format: z.enum(['TAKEOUT_DELIVERY', 'FAST_CASUAL', 'DINE_IN', 'GHOST_KITCHEN']).optional(),
  ownership: z.enum(['INDEPENDENT', 'FRANCHISE']).optional(),
  investmentCapital: z.number().positive().optional(),
  workingCapital: z.number().positive().optional(),
  targetPricePointAov: z.number().positive().optional(),
  ownerInvolvement: z.enum(['FULL_TIME_OPERATOR', 'SEMI_ABSENTEE', 'INVESTOR']).optional(),
  targetRegions: z.array(z.string()).optional(),
  targetTimelineMonths: z.number().int().positive().optional(),
  desiredDiscretionaryIncome: z.number().positive().optional(),
  selectedScenarioKey: z.string().optional()
});

export type DecisionInquiry = z.infer<typeof DecisionInquirySchema>;

export interface DecisionModel {
  categoryId: string;
  categoryName: string;
  format: OperatingFormat;
  ownership: OwnershipType;
  investmentCapital: number;
  workingCapital: number;
  totalRequiredCapital: number;
  targetPricePointAov: number;
  ownerInvolvement: OwnerInvolvement;
  geographicScope: string;
  targetTimelineMonths: number;
  desiredAnnualIncome: number;
  minDailyOrdersNeeded: number;
  minCatchmentHouseholds: number;
  maxGrossRentPctRevenue: number;
  unspecifiedPreferencesExplored: string[];
}

export interface OperatingScenario {
  key: string;
  label: string;
  format: OperatingFormat;
  ownership: OwnershipType;
  investmentCapital: number;
  workingCapital: number;
  targetAov: number;
  rationale: string;
}

export interface FunnelCandidate {
  id: string;
  name: string;
  resolutionTier: ResolutionTier;
  parentGeoId: string;
  city: string;
  neighbourhood?: string;
  propertyAddress?: string;
  population2021: number;
  populationGrowthPct: number;
  medianIncome: number;
  annualFoodAwayExpenditure: number;
  commercialNetRentSqft: number;
  commercialTmiSqft: number;
  commercialGrossRentSqft: number;
  estimatedDirectCompetitors: number;
  suitabilityScore: number;
  confidenceScore: number;
  listingId?: number;
  askingPrice?: number;
  monthlyRent?: number;
  squareFootage?: number;
  isFranchiseListing?: boolean;
}

export interface GeographicFunnelResult {
  scopeSummary: string;
  totalMarketsScreened: number;
  screenedExclusionsCount: number;
  stoppingCriteria: string[];
  stages: {
    province: { name: string; totalCsds: number };
    screenedMarkets: Array<{ id: string; name: string; pass: boolean; reason: string }>;
    neighbourhoodNodes: Array<{ id: string; name: string; city: string; anchorType: string }>;
    candidateProperties: Array<{ address: string; city: string; squareFootage: number; monthlyRent: number; resolution: ResolutionTier }>;
  };
  shortlistedCandidates: FunnelCandidate[];
}

export interface BusinessHypothesis {
  id: string;
  title: string;
  statement: string;
  evidenceFor: Array<{ fact: string; metricValue: string | number; sourceId: string; classification: EvidenceClassification }>;
  evidenceAgainst: Array<{ fact: string; metricValue: string | number; sourceId: string; classification: EvidenceClassification }>;
  alternativeExplanation: string;
  status: HypothesisStatus;
  confidenceWeight: number;
}

export interface EvidenceRecordItem {
  claim: string;
  evidenceObserved: string;
  calculationMethod: string;
  classification: EvidenceClassification;
  uncertaintyEstimate: string;
  decisionImplication: string;
  verificationSource: string;
}

export interface FinancialBand {
  dailyOrders: number;
  annualRevenue: number;
  foodCostCogs: number;
  laborCost: number;
  occupancyCostRent: number;
  deliveryCommissions: number;
  operatingExpenses: number;
  netOperatingIncome: number;
  ownerCashFlow: number;
  paybackMonths: number;
}

export interface FinancialEconomics {
  totalInitialCapital: number;
  buildoutEquipmentCapEx: number;
  workingCapitalBuffer: number;
  breakEvenDailyOrders: number;
  breakEvenMonthlyRevenue: number;
  bands: {
    conservative: FinancialBand;
    baseCase: FinancialBand;
    optimistic: FinancialBand;
  };
}

export interface SensitivityShock {
  parameter: string;
  shockApplied: string;
  baseMetric: string;
  shockedMetric: string;
  impactOnViability: string;
  resilienceRating: 'ROBUST' | 'SENSITIVE' | 'VULNERABLE';
}

export interface SwitchingCondition {
  conditionStatement: string;
  formulaTrigger: string;
  switchingThresholdValue: number | string;
  alternativeTarget: string;
}

export interface MaterialUnknown {
  rank: number;
  title: string;
  category: 'ZONING' | 'BUILDING_SERVICES' | 'LEASE_TERMS' | 'CATCHMENT_ACCESS';
  potentialImpact: string;
  authoritativeSource: string;
  retrievalStatus: 'ONLINE_VERIFIED' | 'LOCAL_ARCHIVE_NEEDED' | 'FIELD_INSPECTION_REQUIRED';
  fieldCheckProtocol: string;
}

export interface CandidateComparison {
  candidate: FunnelCandidate;
  rank: number;
  whyItFits: string;
  strongestSupportingEvidence: string[];
  mainDisadvantages: string[];
  contradictoryEvidence: string[];
  scenarioEconomics: {
    breakEvenDailyOrders: number;
    baseAnnualNetIncome: number;
    conservativeAnnualNetIncome: number;
  };
  keyUnknowns: string[];
  rankingRationale: string;
  nextVerificationStep: string;
}

export interface DecisionBrief {
  recommendation: {
    marketOrLocation: string;
    resolutionTier: ResolutionTier;
    operatingFormat: OperatingFormat;
    ownershipModel: OwnershipType;
    outcome: RecommendationOutcome;
    summaryHeadline: string;
  };
  whyThisLocation: string[];
  whyNotAlternatives: Array<{ candidateName: string; tradeOffReason: string }>;
  economics: {
    requiredCapital: number;
    breakEvenDailyOrders: number;
    baseNetIncome: number;
    scenarioRanges: string;
  };
  whatCouldMakeThisWrong: string[];
  beforeCommitting: string[];
  sources: Array<{ name: string; friendlyCode: string; coverage: string; limitations: string }>;
}

export interface DecisionEngineResult {
  runId: string;
  version: string;
  timestamp: string;
  decisionModel: DecisionModel;
  activeScenario: OperatingScenario;
  geographicFunnel: GeographicFunnelResult;
  hypotheses: BusinessHypothesis[];
  evidenceLedger: EvidenceRecordItem[];
  rankedAlternatives: CandidateComparison[];
  financialEconomics: FinancialEconomics;
  sensitivityShocks: SensitivityShock[];
  switchingConditions: SwitchingCondition[];
  materialUnknowns: MaterialUnknown[];
  decisionBrief: DecisionBrief;
}
