import type {
  DecisionInquiry,
  DecisionModel,
  OperatingFormat,
  OperatingScenario,
  OwnershipType,
  OwnerInvolvement,
} from './types.js';

export const OPERATING_SCENARIOS: OperatingScenario[] = [
  {
    key: 'lean_takeout_delivery',
    label: 'Scenario A: Lean Takeout & Delivery (Independent)',
    format: 'TAKEOUT_DELIVERY',
    ownership: 'INDEPENDENT',
    investmentCapital: 195000,
    workingCapital: 35000,
    targetAov: 28.5,
    rationale: 'Minimizes front-of-house square footage (1,000–1,300 sq ft) and fit-out capital while prioritizing 3–5 km delivery catchment density and digital ordering.'
  },
  {
    key: 'turnkey_franchise',
    label: 'Scenario B: Turnkey Franchise Acquisition',
    format: 'TAKEOUT_DELIVERY',
    ownership: 'FRANCHISE',
    investmentCapital: 320000,
    workingCapital: 45000,
    targetAov: 26.0,
    rationale: 'Leverages established regional brand loyalty and standardized supply chains, balanced against franchise fee and 5–6% ongoing gross royalty burden.'
  },
  {
    key: 'artisan_fast_casual',
    label: 'Scenario C: Artisan Fast-Casual & Slice Bar',
    format: 'FAST_CASUAL',
    ownership: 'INDEPENDENT',
    investmentCapital: 275000,
    workingCapital: 50000,
    targetAov: 34.0,
    rationale: 'Targets affluent demographics and active daytime footfall with higher-margin beverage pairings, gourmet toppings, and dual lunch/dinner dayparts.'
  }
];

export function buildDecisionModel(input: DecisionInquiry): {
  decisionModel: DecisionModel;
  activeScenario: OperatingScenario;
  allScenarios: OperatingScenario[];
} {
  const selectedScenario = OPERATING_SCENARIOS.find(s => s.key === input.selectedScenarioKey) || OPERATING_SCENARIOS[0]!;

  const unspecifiedPreferences: string[] = [];

  const format: OperatingFormat = input.format ?? (() => {
    unspecifiedPreferences.push('Operating format unprovided — default modelled under ' + selectedScenario.label);
    return selectedScenario.format;
  })();

  const ownership: OwnershipType = input.ownership ?? (() => {
    unspecifiedPreferences.push('Ownership structure unprovided — default modelled under ' + selectedScenario.ownership);
    return selectedScenario.ownership;
  })();

  const investmentCapital = input.investmentCapital ?? selectedScenario.investmentCapital;
  if (!input.investmentCapital) {
    unspecifiedPreferences.push(`CapEx budget unprovided — defaulted to scenario standard ($${investmentCapital.toLocaleString()})`);
  }

  const workingCapital = input.workingCapital ?? selectedScenario.workingCapital;
  if (!input.workingCapital) {
    unspecifiedPreferences.push(`Working capital buffer unprovided — defaulted to 3 months reserves ($${workingCapital.toLocaleString()})`);
  }

  const targetPricePointAov = input.targetPricePointAov ?? selectedScenario.targetAov;
  if (!input.targetPricePointAov) {
    unspecifiedPreferences.push(`Average Order Value (AOV) unprovided — modelled at $${targetPricePointAov.toFixed(2)} based on format benchmark`);
  }

  const ownerInvolvement: OwnerInvolvement = input.ownerInvolvement ?? 'FULL_TIME_OPERATOR';
  if (!input.ownerInvolvement) {
    unspecifiedPreferences.push('Owner role unprovided — assumed Full-Time Operator (eliminating external general manager salary in year 1)');
  }

  const desiredAnnualIncome = input.desiredDiscretionaryIncome ?? 85000;
  const targetTimelineMonths = input.targetTimelineMonths ?? 6;
  const geographicScope = input.targetRegions && input.targetRegions.length > 0 
    ? input.targetRegions.join(', ') 
    : 'Ontario Core Growth Corridors (GTA West & Golden Horseshoe)';

  // Deterministic threshold formulations
  // Rule: Break-even daily orders = (Fixed monthly costs + owner min income / 12) / (AOV * Contribution Margin) / 30
  // Standard pizza contribution margin after food cost (30%) and delivery cut (avg 18%) is ~52%
  const approxFixedMonthly = 5200 + 4500 + 1200; // Rent + basic labor/manager + utilities/software
  const monthlyProfitTarget = desiredAnnualIncome / 12;
  const grossMarginPerOrder = targetPricePointAov * 0.52;
  const minDailyOrdersNeeded = Math.ceil((approxFixedMonthly + monthlyProfitTarget) / (grossMarginPerOrder * 30));

  // Minimum catchment: Assuming 1.8% annual household penetration, orders/day * 365 / orders_per_household (approx 4.5/yr)
  const annualOrdersNeeded = minDailyOrdersNeeded * 365;
  const minCatchmentHouseholds = Math.round((annualOrdersNeeded / 4.5) / 0.04); // 4% penetration
  const maxGrossRentPctRevenue = 0.09; // Maximum 9% gross rent to sales ratio for viability

  const decisionModel: DecisionModel = {
    categoryId: input.categoryId || 'pizza_store',
    categoryName: input.categoryId === 'pizza_store' ? 'Pizza & Italian Takeout' : input.categoryId,
    format,
    ownership,
    investmentCapital,
    workingCapital,
    totalRequiredCapital: investmentCapital + workingCapital,
    targetPricePointAov,
    ownerInvolvement,
    geographicScope,
    targetTimelineMonths,
    desiredAnnualIncome,
    minDailyOrdersNeeded,
    minCatchmentHouseholds,
    maxGrossRentPctRevenue,
    unspecifiedPreferencesExplored: unspecifiedPreferences
  };

  return {
    decisionModel,
    activeScenario: selectedScenario,
    allScenarios: OPERATING_SCENARIOS
  };
}
