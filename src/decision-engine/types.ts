import { z } from 'zod';
import type { MetricProvenance } from './provenance.js';

export type OperatingFormat = 'TAKEOUT_DELIVERY' | 'FAST_CASUAL' | 'DINE_IN' | 'GHOST_KITCHEN';
export type OwnershipType = 'INDEPENDENT' | 'FRANCHISE';
export type OwnerInvolvement = 'FULL_TIME_OPERATOR' | 'SEMI_ABSENTEE' | 'INVESTOR';
export type ResolutionTier = 'PROSPECTIVE_MARKET' | 'PROMISING_NEIGHBOURHOOD' | 'POTENTIALLY_SUITABLE_PROPERTY' | 'FEASIBILITY_VERIFIED_PROPERTY';
export type EvidenceClassification = 'OBSERVED' | 'AUDITED' | 'BENCHMARK' | 'DERIVED' | 'UNAVAILABLE' | 'UNVERIFIED' | 'UNVERIFIED_ASSUMPTION';
export type HypothesisStatus = 'SUPPORTED' | 'CONTRADICTED' | 'INCONCLUSIVE';
export type RecommendationOutcome = 'PROCEED_WITH_VERIFICATION' | 'DO_NOT_PROCEED' | 'INVESTIGATE_ALTERNATIVE' | 'INSUFFICIENT_EVIDENCE';
export type FeasibilityGateStatus = 'VERIFIED_PERMITTED' | 'UNVERIFIED_PENDING_REVIEW' | 'DISALLOWED';

export const DecisionInquirySchema = z.object({
  inquiry: z.string().min(3),
  categoryId: z.string().optional(),
  format: z.enum(['TAKEOUT_DELIVERY', 'FAST_CASUAL', 'DINE_IN', 'GHOST_KITCHEN']).optional(),
  ownership: z.enum(['INDEPENDENT', 'FRANCHISE']).optional(),
  investmentCapital: z.number().positive().optional(),
  workingCapital: z.number().positive().optional(),
  targetPricePointAov: z.number().positive().optional(),
  ownerInvolvement: z.enum(['FULL_TIME_OPERATOR', 'SEMI_ABSENTEE', 'INVESTOR']).optional(),
  targetRegions: z.array(z.string()).optional(),
  targetTimelineMonths: z.number().int().positive().optional(),
  desiredDiscretionaryIncome: z.number().positive().optional(),
  selectedScenarioKey: z.string().optional(),
  workspaceId: z.string().optional(),
  userId: z.string().optional()
});

export type DecisionInquiry = z.infer<typeof DecisionInquirySchema>;

export interface DecisionModel {
  categoryId: string;
  categoryName: string;
  naicsCode: string;
  naicsTitle: string;
  format: OperatingFormat;
  ownership: OwnershipType;
  investmentCapital: number;
  workingCapital: number;
  totalRequiredCapital: number;
  targetPricePointAov: number;
  unitRevenueLabel: string;
  volumeUnit: string;
  ownerInvolvement: OwnerInvolvement;
  geographicScope: string;
  targetTimelineMonths: number;
  desiredAnnualIncome: number;
  minDailyOrdersNeeded: number;
  benchmarkDailyVolume?: number;
  operationalDailyCapacity?: number;
  periodType?: 'DAY' | 'MONTH';
  annualOperatingPeriods?: number;
  requiredDailyUnitsForGoal?: number;
  minCatchmentHouseholds: number;
  maxGrossRentPctRevenue: number;
  unspecifiedPreferencesExplored: string[];
  allowedGeographyIds?: string[];
  categoryLimitations?: string;
}

export interface OperatingScenario {
  key: string;
  label: string;
  format: OperatingFormat;
  ownership: OwnershipType;
  investmentCapital: number;
  workingCapital: number;
  targetAov: number;
  benchmarkDailyVolume?: number;
  operationalDailyCapacity?: number;
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
  medianIncomeSource: 'OBSERVED_CENSUS' | 'IMPUTED_DEFAULT';
  annualFoodAwayExpenditure?: number;
  spendingSource?: 'OBSERVED_SURVEY' | 'BENCHMARK_PROVINCIAL';
  commercialNetRentSqft: number;
  commercialTmiSqft: number;
  commercialGrossRentSqft: number;
  estimatedDirectCompetitors?: number;
  competitorDataSource: string;
  competitorClassification: 'OBSERVED' | 'BENCHMARK' | 'UNAVAILABLE';
  attractivenessScore: number; // 0-100 market demand score
  confidenceScore: number;     // 0-100 evidence completeness (strictly separate)
  suitabilityScore: number;    // composite ranking score
  zoningFeasibilityStatus: FeasibilityGateStatus;
  listingId?: number | string;
  listingUrl?: string;
  askingPrice?: number;
  monthlyRent?: number;
  squareFootage?: number;
  isFranchiseListing?: boolean;
  isDemoFixture?: boolean;
  scoringVersion?: string;
  scoreContributions?: Record<string, number>;
  tradeOffs?: string[];
  missingEvidence?: string[];
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
  provenance?: MetricProvenance;
}

export interface FinancialBand {
  dailyOrders: number;
  dailyUnitVolume: number;
  periodUnitVolume?: number;
  periodType?: 'DAY' | 'MONTH';
  unitName: string;
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

export const FinancialBandSchema = z.object({
  dailyOrders: z.number(),
  dailyUnitVolume: z.number(),
  periodUnitVolume: z.number().optional(),
  periodType: z.enum(['DAY', 'MONTH']).optional(),
  unitName: z.string(),
  annualRevenue: z.number(),
  foodCostCogs: z.number(),
  laborCost: z.number(),
  occupancyCostRent: z.number(),
  deliveryCommissions: z.number(),
  operatingExpenses: z.number(),
  netOperatingIncome: z.number(),
  ownerCashFlow: z.number(),
  paybackMonths: z.number()
});

export const OperationalCapacitySchema = z.object({
  unitCapacity: z.number(),
  periodType: z.enum(['DAY', 'MONTH']),
  annualOperatingPeriods: z.number(),
  capacityUtilizationPct: z.number(),
  capacityCeilingExceeded: z.boolean(),
  notes: z.string().optional()
});

export type OperationalCapacity = z.infer<typeof OperationalCapacitySchema>;

export const RequiredSalesForGoalSchema = z.object({
  targetAnnualDiscretionaryIncome: z.number(),
  requiredUnitsPerPeriod: z.number(),
  requiredAnnualRevenue: z.number(),
  goalVolumeGap: z.number(),
  isGoalAchievableWithinCapacity: z.boolean(),
  interpretation: z.string()
});

export type RequiredSalesForGoal = z.infer<typeof RequiredSalesForGoalSchema>;

export const RequiredMarketCaptureSchema = z.object({
  annualDemandUnits: z.number(),
  periodDemandUnits: z.number(),
  tradeAreaExpenditurePool: z.number().optional(),
  estimatedMarketSharePct: z.number(),
  validationNeeded: z.string()
});

export type RequiredMarketCapture = z.infer<typeof RequiredMarketCaptureSchema>;

export const FinancialEconomicsSchema = z.object({
  totalInitialCapital: z.number().positive(),
  buildoutEquipmentCapEx: z.number(),
  acquisitionCost: z.number().optional(),
  isAcquisition: z.boolean(),
  workingCapitalBuffer: z.number(),
  fundingGap: z.number(),
  isFullyFunded: z.boolean(),
  breakEvenDailyOrders: z.number(),
  breakEvenDailyUnits: z.number(),
  breakEvenMonthlyRevenue: z.number(),
  breakEvenFeasible: z.boolean(),
  marginWarning: z.string().optional(),
  periodType: z.enum(['DAY', 'MONTH']).default('DAY'),
  annualOperatingPeriods: z.number().default(360),
  operationalCapacity: OperationalCapacitySchema.optional(),
  requiredSalesForIncomeGoal: RequiredSalesForGoalSchema.optional(),
  requiredMarketCapture: RequiredMarketCaptureSchema.optional(),
  bands: z.object({
    conservative: FinancialBandSchema,
    baseCase: FinancialBandSchema,
    optimistic: FinancialBandSchema
  })
});

export type FinancialEconomics = z.infer<typeof FinancialEconomicsSchema>;

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
  retrievalStatus: 'ONLINE_VERIFIED' | 'NOT_RETRIEVED' | 'LOCAL_ARCHIVE_NEEDED' | 'FIELD_INSPECTION_REQUIRED';
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
    feasibilityGateNote: string;
  };
  whyThisLocation: string[];
  whyNotAlternatives: Array<{ candidateName: string; tradeOffReason: string }>;
  economics: {
    requiredCapital: number;
    breakEvenDailyOrders: number;
    breakEvenUnitsLabel: string;
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
  workspaceId: string;
  userId?: string;
  decisionModel: DecisionModel;
  activeScenario: OperatingScenario;
  geographicFunnel: GeographicFunnelResult;
  hypotheses: BusinessHypothesis[];
  evidenceLedger: EvidenceRecordItem[];
  provenanceLedger: MetricProvenance[];
  rankedAlternatives: CandidateComparison[];
  financialEconomics: FinancialEconomics;
  sensitivityShocks: SensitivityShock[];
  switchingConditions: SwitchingCondition[];
  materialUnknowns: MaterialUnknown[];
  decisionBrief: DecisionBrief;
}
