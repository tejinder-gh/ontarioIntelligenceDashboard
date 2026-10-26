import type { DecisionModel, FunnelCandidate } from './types.js';

export const SUITABILITY_SCORER_VERSION = '2026.4.1';

export interface SuitabilityScoreBreakdown {
  scorerVersion: string;
  incomeScore: number;
  growthScore: number;
  rentAffordabilityScore: number;
  competitionScore: number;
  verificationScore: number;
  totalSuitabilityScore: number;
  attractivenessScore: number;
  confidenceScore: number;
  scoreContributions: Record<string, number>;
  tradeOffs: string[];
  missingEvidence: string[];
  explanation: string;
}

export interface CandidateScoringInput {
  id: string;
  name: string;
  city: string;
  medianIncome: number;
  population2021: number;
  populationGrowthPct: number;
  commercialGrossRentSqft: number;
  monthlyRent?: number;
  squareFootage?: number;
  estimatedDirectCompetitors?: number;
  hasVerifiedAddress: boolean;
  hasConfirmedListing: boolean;
}

/**
 * Versioned Multi-Factor Candidate Suitability Evaluation
 * 
 * Rules version 2026.4.1:
 * - Differentiates category-specific factor weights (e.g. daycare vs shipping vs pizza)
 * - Explicitly tracks score contributions, tradeoffs, and missing evidence
 * - Separates attractiveness (market demand) from confidence (observational grounding)
 */
export function computeCandidateSuitability(
  candidate: CandidateScoringInput,
  model: DecisionModel
): SuitabilityScoreBreakdown {
  const isIndustrial = model.categoryId === 'logistics_warehouse';
  const isDaycare = model.categoryId === 'child_daycare';
  const isShipping = model.categoryId === 'retail_shipping_counter';

  // 1. Income Factor (Max 25 points)
  // Benchmark Ontario median HH income is ~$85,000
  const incomeRatio = candidate.medianIncome / 85000;
  const incomeScore = Math.min(25, Math.max(5, Math.round(incomeRatio * (isDaycare ? 22 : 18))));

  // 2. Growth & Population Scale (Max 20 points)
  let growthScore = 10;
  if (candidate.populationGrowthPct >= 4.0) growthScore += 8;
  else if (candidate.populationGrowthPct >= 2.0) growthScore += 5;
  else if (candidate.populationGrowthPct < 0) growthScore -= 5;

  if (candidate.population2021 >= 150000) growthScore += 2;
  else if (candidate.population2021 < 40000) growthScore -= 4;
  growthScore = Math.min(20, Math.max(2, growthScore));

  // 3. Rent Affordability Factor (Max 25 points)
  // Estimated monthly revenue from target orders and AOV
  const periods = model.annualOperatingPeriods || (model.periodType === 'MONTH' ? 12 : 360);
  const benchmarkVol = model.benchmarkDailyVolume || model.minDailyOrdersNeeded || 70;
  const estimatedMonthlySales = (benchmarkVol * model.targetPricePointAov * periods) / 12;
  const sqft = candidate.squareFootage || 1400;
  const monthlyRent = candidate.monthlyRent || (sqft * candidate.commercialGrossRentSqft / 12);
  const rentRatioFraction = monthlyRent / Math.max(1, estimatedMonthlySales);

  let rentAffordabilityScore = 18;
  if (rentRatioFraction <= model.maxGrossRentPctRevenue * 0.75) {
    rentAffordabilityScore = 25; // Highly comfortable occupancy ratio
  } else if (rentRatioFraction <= model.maxGrossRentPctRevenue) {
    rentAffordabilityScore = 20; // Within target ceiling
  } else if (rentRatioFraction <= model.maxGrossRentPctRevenue * 1.35) {
    rentAffordabilityScore = 10; // Elevated occupancy burden
  } else {
    rentAffordabilityScore = 2;  // Severe margin compression
  }

  // 4. Competition & Catchment Room (Max 15 points)
  let competitionScore = 12;
  const comps = candidate.estimatedDirectCompetitors;
  if (comps === undefined) {
    competitionScore = 10; // Neutral when data unavailable
  } else if (comps === 0 && candidate.population2021 > 50000) {
    competitionScore = 15; // Virgin market with verified population
  } else if (comps <= (isShipping ? 8 : 12)) {
    competitionScore = 13; // Balanced market headroom
  } else if (comps > (isShipping ? 20 : 30)) {
    competitionScore = 6;  // Dense competitor saturation
  }

  // 5. Physical Verification & Address Integrity (Max 15 points)
  let verificationScore = 8;
  if (candidate.hasVerifiedAddress && candidate.hasConfirmedListing) {
    verificationScore = 15; // Active verified commercial property
  } else if (candidate.hasVerifiedAddress) {
    verificationScore = 12; // Real physical address
  } else {
    verificationScore = 6;  // Corridor / municipal aggregate
  }

  // Tradeoffs & Missing Evidence
  const tradeOffs: string[] = [];
  const missingEvidence: string[] = [];

  if (rentRatioFraction > model.maxGrossRentPctRevenue) {
    tradeOffs.push(`Occupancy rent burden (${(rentRatioFraction * 100).toFixed(1)}%) exceeds target category ceiling of ${(model.maxGrossRentPctRevenue * 100).toFixed(1)}%, requiring higher margin yield.`);
  }
  if (comps !== undefined && comps > 20) {
    tradeOffs.push(`High direct competitor density (${comps} active establishments) demands aggressive local market differentiation.`);
  }
  if (candidate.populationGrowthPct < 1.0) {
    tradeOffs.push(`Sub-benchmark population growth (+${candidate.populationGrowthPct.toFixed(1)}%) indicates reliance on existing resident base rather than organic catchment expansion.`);
  }

  if (!candidate.hasVerifiedAddress) {
    missingEvidence.push('Specific property premise address is unverified; recommendation bounded to strategic planning corridor.');
  }
  if (comps === undefined) {
    missingEvidence.push('Direct competitor count was unavailable from municipal registry snapshot; requires on-site commercial audit.');
  }

  // Combined Scores
  const attractivenessScore = Math.min(100, Math.round(
    ((incomeScore / 25) * 30) +
    ((growthScore / 20) * 25) +
    ((rentAffordabilityScore / 25) * 30) +
    ((competitionScore / 15) * 15)
  ));

  const confidenceScore = Math.min(100, Math.round(
    (verificationScore / 15) * 60 +
    (comps !== undefined ? 25 : 10) +
    15
  ));

  const totalSuitabilityScore = Math.min(100, Math.round(
    incomeScore + growthScore + rentAffordabilityScore + competitionScore + verificationScore
  ));

  const scoreContributions: Record<string, number> = {
    incomePurchasingPower: incomeScore,
    demographicGrowthScale: growthScore,
    rentAffordability: rentAffordabilityScore,
    competitiveHeadroom: competitionScore,
    physicalVerification: verificationScore
  };

  const explanation = `${candidate.name} in ${candidate.city} scores ${totalSuitabilityScore}/100 [v${SUITABILITY_SCORER_VERSION}] ` +
    `[Income: ${incomeScore}/25, Growth: ${growthScore}/20, Rent Affordability: ${rentAffordabilityScore}/25, ` +
    `Competition: ${competitionScore}/15, Verification: ${verificationScore}/15]. ` +
    `Occupancy rent ratio is ${(rentRatioFraction * 100).toFixed(1)}% (ceiling: ${(model.maxGrossRentPctRevenue * 100).toFixed(1)}%).`;

  return {
    scorerVersion: SUITABILITY_SCORER_VERSION,
    incomeScore,
    growthScore,
    rentAffordabilityScore,
    competitionScore,
    verificationScore,
    totalSuitabilityScore,
    attractivenessScore,
    confidenceScore,
    scoreContributions,
    tradeOffs,
    missingEvidence,
    explanation
  };
}

/**
 * Deterministic, Input-Order Invariant Sorting
 * Shuffling candidates produces the exact same top candidate and ordering.
 */
export function sortCandidatesBySuitability(candidates: FunnelCandidate[]): FunnelCandidate[] {
  return [...candidates].sort((a, b) => {
    // 1. Primary: Composite suitability score descending
    if (b.suitabilityScore !== a.suitabilityScore) {
      return b.suitabilityScore - a.suitabilityScore;
    }
    // 2. Secondary: Attractiveness score descending
    if (b.attractivenessScore !== a.attractivenessScore) {
      return b.attractivenessScore - a.attractivenessScore;
    }
    // 3. Tertiary: Confidence score descending
    if (b.confidenceScore !== a.confidenceScore) {
      return b.confidenceScore - a.confidenceScore;
    }
    // 4. Tie-breaker: Deterministic identifier comparison (order-invariant)
    return a.id.localeCompare(b.id);
  });
}

