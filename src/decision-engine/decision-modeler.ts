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
  if (
    text.includes('warehouse') ||
    text.includes('logistics') ||
    text.includes('freight') ||
    text.includes('cross-dock') ||
    text.includes('cross dock') ||
    text.includes('distribution depot') ||
    text.includes('distribution centre') ||
    text.includes('distribution center') ||
    text.includes('3pl') ||
    text.includes('trucking')
  ) {
    return 'logistics_warehouse';
  }
  if (
    text.includes('shipping') ||
    text.includes('courier') ||
    text.includes('parcel') ||
    text.includes('pack and ship') ||
    text.includes('pack & ship') ||
    text.includes('mailbox') ||
    text.includes('ups store') ||
    text.includes('postnet')
  ) {
    return 'retail_shipping_counter';
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
  if (text.includes('retail') || text.includes('boutique') || (text.includes('store') && !text.includes('pizza'))) {
    return 'retail_store';
  }
  return 'pizza_store';
}

export function extractBudgetFromText(text: string): number | undefined {
  const prefixRegex = /(?:budget|capital|equity|invest(?:ment)?|savings|funds|have)\s*(?:of|is|around|approx|approximately|up to|about|=|:)?\s*\$?\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*(k|thousand|m|million|b|billion)?\b/i;
  const suffixRegex = /\$?\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*(k|thousand|m|million|b|billion)?\s*(?:dollar(?:s)?)?\s*(?:in\s+)?(?:budget|capital|equity|investment|funds|savings)\b/i;

  const match = text.match(prefixRegex) || text.match(suffixRegex);
  if (!match) return undefined;

  const rawNum = match[1]!.replace(/,/g, '');
  let val = parseFloat(rawNum);
  if (isNaN(val) || val <= 0) return undefined;

  const unit = match[2]?.toLowerCase();
  if (unit === 'k' || unit === 'thousand') {
    val *= 1000;
  } else if (unit === 'm' || unit === 'million') {
    val *= 1000000;
  } else if (unit === 'b' || unit === 'billion') {
    val *= 1000000000;
  }
  return Math.round(val);
}

export const MUNICIPALITY_GEO_ID_MAP: Record<string, string> = {
  'toronto': 'CSD_toronto',
  'mississauga': 'CSD_mississauga',
  'brampton': 'CSD_brampton',
  'hamilton': 'CSD_hamilton',
  'burlington': 'CSD_burlington',
  'oakville': 'CSD_oakville',
  'milton': 'CSD_milton',
  'vaughan': 'CSD_vaughan',
  'markham': 'CSD_markham',
  'richmond hill': 'CSD_richmond_hill',
  'ottawa': 'CSD_ottawa',
  'london': 'CSD_london',
  'kitchener': 'CSD_kitchener',
  'waterloo': 'CSD_waterloo',
  'cambridge': 'CSD_cambridge',
  'guelph': 'CSD_guelph',
  'barrie': 'CSD_barrie',
  'oshawa': 'CSD_oshawa',
  'whitby': 'CSD_whitby',
  'ajax': 'CSD_ajax',
  'pickering': 'CSD_pickering',
  'halton hills': 'CSD_halton_hills'
};

export function resolveGeographyIds(regions: string[]): string[] {
  const ids: string[] = [];
  for (const r of regions) {
    const trimmed = r.trim();
    if (trimmed.startsWith('CSD_')) {
      ids.push(trimmed);
      continue;
    }
    const mapped = MUNICIPALITY_GEO_ID_MAP[trimmed.toLowerCase()];
    if (mapped) {
      ids.push(mapped);
    }
  }
  return Array.from(new Set(ids));
}

export function extractLocationsFromText(text: string): string[] {
  const ONTARIO_MUNICIPALITIES = [
    'Toronto', 'Mississauga', 'Brampton', 'Hamilton', 'Burlington', 'Oakville', 'Milton',
    'Vaughan', 'Markham', 'Richmond Hill', 'Ottawa', 'London', 'Kitchener', 'Waterloo',
    'Cambridge', 'Guelph', 'Barrie', 'Oshawa', 'Whitby', 'Ajax', 'Pickering', 'Halton Hills'
  ];
  const found: string[] = [];
  for (const m of ONTARIO_MUNICIPALITIES) {
    const regex = new RegExp(`\\b${m}\\b`, 'i');
    if (regex.test(text)) {
      found.push(m);
    }
  }
  return found;
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

  const extractedBudget = !input.investmentCapital ? extractBudgetFromText(input.inquiry) : undefined;
  const investmentCapital = input.investmentCapital ?? (extractedBudget ?? selectedScenario.investmentCapital);
  if (!input.investmentCapital) {
    if (extractedBudget) {
      unspecifiedPreferences.push(`CapEx budget extracted from inquiry text ($${investmentCapital.toLocaleString()})`);
    } else {
      unspecifiedPreferences.push(`CapEx budget unprovided — defaulted to ${profile.canonicalName} benchmark ($${investmentCapital.toLocaleString()})`);
    }
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

  const extractedLocations = (!input.targetRegions || input.targetRegions.length === 0)
    ? extractLocationsFromText(input.inquiry)
    : [];
  const targetRegions = (input.targetRegions && input.targetRegions.length > 0)
    ? input.targetRegions
    : (extractedLocations.length > 0 ? extractedLocations : undefined);

  const allowedGeographyIds = targetRegions && targetRegions.length > 0
    ? resolveGeographyIds(targetRegions)
    : undefined;

  const geographicScope = targetRegions && targetRegions.length > 0
    ? targetRegions.join(', ')
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
  const isHeavyLogistics = categoryId === 'logistics_warehouse';
  const penetrationRate = isHeavyLogistics ? 0.08 : 0.04;
  const annualFrequency = isHeavyLogistics ? 18.0 : 4.5;
  const minCatchmentHouseholds = Math.round((annualUnitsNeeded / annualFrequency) / penetrationRate);

  const maxGrossRentPctRevenue = isHeavyLogistics ? 0.14 : 0.09;

  let categoryLimitations: string | undefined;
  if (
    profile.categoryId !== 'pizza_store' &&
    profile.categoryId !== 'logistics_warehouse' &&
    profile.categoryId !== 'retail_shipping_counter' &&
    profile.categoryId !== 'child_daycare'
  ) {
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
    allowedGeographyIds,
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
