import type {
  DecisionInquiry,
  DecisionModel,
  OperatingFormat,
  OperatingScenario,
  OwnershipType,
  OwnerInvolvement,
} from './types.js';
import { getCategoryProfile } from './category-profiles.js';

export function resolveCategoryIdFromInquiry(inquiry: string, explicitCategory?: string): string {
  if (explicitCategory && explicitCategory.trim()) {
    return explicitCategory.trim().toLowerCase();
  }
  const text = inquiry.toLowerCase();
  if (text.includes('shipping') || text.includes('courier') || text.includes('logistics') || text.includes('parcel') || text.includes('freight') || text.includes('warehouse')) {
    return 'logistics_warehouse';
  }
  if (text.includes('daycare') || text.includes('childcare') || text.includes('preschool') || text.includes('infant')) {
    return 'child_daycare';
  }
  if (text.includes('coffee') || text.includes('cafe')) {
    return 'coffee_shop';
  }
  if (text.includes('gym') || text.includes('fitness')) {
    return 'gym_fitness';
  }
  if (text.includes('retail') || text.includes('boutique') || text.includes('store') && !text.includes('pizza')) {
    return 'retail_store';
  }
  return 'pizza_store';
}

export function buildDecisionModel(input: DecisionInquiry): {
  decisionModel: DecisionModel;
  activeScenario: OperatingScenario;
  allScenarios: OperatingScenario[];
} {
  const categoryId = resolveCategoryIdFromInquiry(input.inquiry, input.categoryId);
  const profile = getCategoryProfile(categoryId);

  const allScenarios: OperatingScenario[] = profile.scenarios.map(s => ({
    key: s.key,
    label: s.label,
    format: s.format,
    ownership: s.ownership,
    investmentCapital: s.investmentCapital,
    workingCapital: s.workingCapital,
    targetAov: s.targetUnitRevenue,
    rationale: s.rationale
  }));

  const selectedScenario = allScenarios.find(s => s.key === input.selectedScenarioKey) || allScenarios[0]!;

  const unspecifiedPreferences: string[] = [];

  const format: OperatingFormat = input.format ?? (() => {
    unspecifiedPreferences.push(`Operating format unprovided — default modelled under ${selectedScenario.label}`);
    return selectedScenario.format;
  })();

  const ownership: OwnershipType = input.ownership ?? (() => {
    unspecifiedPreferences.push(`Ownership structure unprovided — default modelled under ${selectedScenario.ownership}`);
    return selectedScenario.ownership;
  })();

  const investmentCapital = input.investmentCapital ?? selectedScenario.investmentCapital;
  if (!input.investmentCapital) {
    unspecifiedPreferences.push(`CapEx budget unprovided — defaulted to ${profile.canonicalName} benchmark ($${investmentCapital.toLocaleString()})`);
  }

  const workingCapital = input.workingCapital ?? selectedScenario.workingCapital;
  if (!input.workingCapital) {
    unspecifiedPreferences.push(`Working capital buffer unprovided — defaulted to 3 months operating reserves ($${workingCapital.toLocaleString()})`);
  }

  const targetPricePointAov = input.targetPricePointAov ?? selectedScenario.targetAov;
  if (!input.targetPricePointAov) {
    unspecifiedPreferences.push(`${profile.unitRevenueLabel} unprovided — modelled at $${targetPricePointAov.toFixed(2)} based on format benchmark`);
  }

  const ownerInvolvement: OwnerInvolvement = input.ownerInvolvement ?? 'FULL_TIME_OPERATOR';
  if (!input.ownerInvolvement) {
    unspecifiedPreferences.push('Owner role unprovided — assumed Full-Time Operator (eliminates external general manager salary in year 1)');
  }

  const desiredAnnualIncome = input.desiredDiscretionaryIncome ?? 85000;
  const targetTimelineMonths = input.targetTimelineMonths ?? 6;
  const geographicScope = input.targetRegions && input.targetRegions.length > 0
    ? input.targetRegions.join(', ')
    : 'Ontario Growth Corridors (GTA West & Golden Horseshoe Core)';

  // Deterministic Break-Even Unit Volume
  const monthlyProfitTarget = desiredAnnualIncome / 12;
  const variableMarginRatio = Math.max(0.05, 1 - profile.cogsRatio - profile.variableLaborRatio - profile.channelOrCommissionRatio);
  const contributionPerUnit = targetPricePointAov * variableMarginRatio;
  const minDailyOrdersNeeded = contributionPerUnit > 0
    ? Math.ceil((profile.fixedMonthlyOverhead + 4800 + monthlyProfitTarget) / (contributionPerUnit * 30))
    : 999;

  // Minimum Catchment Scale based on category archetype
  const annualUnitsNeeded = minDailyOrdersNeeded * 365;
  const penetrationRate = categoryId === 'logistics_warehouse' ? 0.08 : 0.04;
  const annualFrequency = categoryId === 'logistics_warehouse' ? 18.0 : 4.5;
  const minCatchmentHouseholds = Math.round((annualUnitsNeeded / annualFrequency) / penetrationRate);

  const maxGrossRentPctRevenue = categoryId === 'logistics_warehouse' ? 0.14 : 0.09;

  let categoryLimitations: string | undefined;
  if (profile.categoryId !== 'pizza_store' && profile.categoryId !== 'logistics_warehouse' && profile.categoryId !== 'child_daycare') {
    categoryLimitations = `Note on ${profile.canonicalName}: Detailed localized unit transaction benchmarks are generalized from provincial commercial retail baselines. Full engineering specifications require tailored commercial site audits.`;
  }

  const decisionModel: DecisionModel = {
    categoryId: profile.categoryId,
    categoryName: profile.canonicalName,
    naicsCode: profile.naicsCode,
    naicsTitle: profile.naicsTitle,
    format,
    ownership,
    investmentCapital,
    workingCapital,
    totalRequiredCapital: investmentCapital + workingCapital,
    targetPricePointAov,
    unitRevenueLabel: profile.unitRevenueLabel,
    volumeUnit: profile.volumeUnit,
    ownerInvolvement,
    geographicScope,
    targetTimelineMonths,
    desiredAnnualIncome,
    minDailyOrdersNeeded,
    minCatchmentHouseholds,
    maxGrossRentPctRevenue,
    unspecifiedPreferencesExplored: unspecifiedPreferences,
    categoryLimitations
  };

  return {
    decisionModel,
    activeScenario: selectedScenario,
    allScenarios
  };
}

export const OPERATING_SCENARIOS: OperatingScenario[] = getCategoryProfile('pizza_store').scenarios.map(s => ({
  key: s.key,
  label: s.label,
  format: s.format,
  ownership: s.ownership,
  investmentCapital: s.investmentCapital,
  workingCapital: s.workingCapital,
  targetAov: s.targetUnitRevenue,
  rationale: s.rationale
}));
