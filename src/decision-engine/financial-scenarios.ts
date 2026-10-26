import type {
  DecisionModel,
  FinancialBand,
  FinancialEconomics,
  FunnelCandidate,
} from './types.js';
import { getCategoryProfile } from './category-profiles.js';

export function calculateFinancialEconomics(
  candidate: FunnelCandidate,
  model: DecisionModel
): FinancialEconomics {
  const profile = getCategoryProfile(model.categoryId);
  const sqft = candidate.squareFootage || profile.typicalSqftMin;
  const grossRentAnnual = sqft * candidate.commercialGrossRentSqft;
  const monthlyRent = candidate.monthlyRent || (grossRentAnnual / 12);
  const annualRent = monthlyRent * 12;

  // Capital Expenditure & Setup
  const rentDeposit = monthlyRent * 3; // First, last, and damage security
  const fitoutMultiplier = model.categoryId === 'logistics_warehouse' ? 25 : 65; // Industrial vs Commercial retail fitout $/sqft
  const equipmentBase = model.categoryId === 'logistics_warehouse' ? 75000 : 95000;
  const buildoutEquipmentCapEx = (sqft * fitoutMultiplier) + equipmentBase + rentDeposit;
  const workingCapitalBuffer = model.workingCapital;
  const totalInitialCapital = buildoutEquipmentCapEx + workingCapitalBuffer;

  const aov = model.targetPricePointAov || profile.benchmarkUnitRevenue;
  const unitLabel = model.volumeUnit || profile.volumeUnit;

  // Fixed overhead: Utilities, property insurance, software/telecom, maintenance
  const fixedAnnualOverhead = profile.fixedMonthlyOverhead * 12;

  // Helper for computing financial bands
  function buildBand(
    unitsPerDay: number,
    channelPct: number,
    cogsPct: number,
    laborPct: number
  ): FinancialBand {
    const annualRevenue = unitsPerDay * aov * 360;
    const foodCostCogs = annualRevenue * cogsPct;
    const laborCost = annualRevenue * laborPct;
    const occupancyCostRent = annualRent;
    
    // Channel / commissions (third-party delivery apps or freight brokerage commissions)
    const deliveryCommissions = annualRevenue * channelPct;
    
    // Franchise royalty if franchise model
    const royaltyCost = model.ownership === 'FRANCHISE' ? annualRevenue * 0.055 : 0;
    
    const operatingExpenses = fixedAnnualOverhead + royaltyCost;
    const totalExpenses = foodCostCogs + laborCost + occupancyCostRent + deliveryCommissions + operatingExpenses;
    const netOperatingIncome = annualRevenue - totalExpenses;
    
    // Owner Cash Flow: If full-time operator, includes owner draw; debt service accounted if leveraged
    const ownerCashFlow = netOperatingIncome;
    
    const paybackMonths = ownerCashFlow > 0 
      ? Math.max(6, Math.round((totalInitialCapital / ownerCashFlow) * 12))
      : 999;

    return {
      dailyOrders: unitsPerDay,
      dailyUnitVolume: unitsPerDay,
      unitName: unitLabel,
      annualRevenue: Math.round(annualRevenue),
      foodCostCogs: Math.round(foodCostCogs),
      laborCost: Math.round(laborCost),
      occupancyCostRent: Math.round(occupancyCostRent),
      deliveryCommissions: Math.round(deliveryCommissions),
      operatingExpenses: Math.round(operatingExpenses),
      netOperatingIncome: Math.round(netOperatingIncome),
      ownerCashFlow: Math.round(ownerCashFlow),
      paybackMonths
    };
  }

  // Base variable cost ratios
  const baseCogs = profile.cogsRatio;
  const baseLabor = profile.variableLaborRatio;
  const baseChannel = profile.channelOrCommissionRatio;

  // 1. Conservative: Slower market penetration, higher channel/waste costs
  const conservative = buildBand(
    Math.round(model.minDailyOrdersNeeded * 0.80),
    baseChannel * 1.35,
    baseCogs + 0.03,
    baseLabor + 0.03
  );

  // 2. Base Case: Target operating model parameters
  const baseCase = buildBand(
    model.minDailyOrdersNeeded,
    baseChannel,
    baseCogs,
    baseLabor
  );

  // 3. Optimistic: High operational throughput, strong direct/repeat customer base
  const optimistic = buildBand(
    Math.round(model.minDailyOrdersNeeded * 1.30),
    baseChannel * 0.70,
    Math.max(0.12, baseCogs - 0.02),
    Math.max(0.18, baseLabor - 0.03)
  );

  // Deterministic Contribution Margin calculation
  const totalVariableCostRatio = baseCogs + baseLabor + baseChannel;
  const contributionMarginRatio = 1 - totalVariableCostRatio;

  const fixedAnnualCosts = annualRent + fixedAnnualOverhead + (model.ownerInvolvement === 'INVESTOR' ? 55000 : 0);

  // Handle zero/negative contribution margin boundary safely
  let breakEvenFeasible = true;
  let marginWarning: string | undefined;
  let breakEvenAnnualRevenue = 0;
  let breakEvenDailyUnits = 0;

  if (contributionMarginRatio <= 0.05) {
    breakEvenFeasible = false;
    marginWarning = `Variable costs (${(totalVariableCostRatio * 100).toFixed(1)}%) leave insufficient contribution margin (${(contributionMarginRatio * 100).toFixed(1)}%). Break-even cannot be reached under current unit cost structure.`;
    breakEvenDailyUnits = 999999;
  } else {
    breakEvenAnnualRevenue = fixedAnnualCosts / contributionMarginRatio;
    breakEvenDailyUnits = Math.ceil(breakEvenAnnualRevenue / (aov * 360));
  }

  const breakEvenMonthlyRevenue = Math.round(breakEvenAnnualRevenue / 12);

  return {
    totalInitialCapital: Math.round(totalInitialCapital),
    buildoutEquipmentCapEx: Math.round(buildoutEquipmentCapEx),
    workingCapitalBuffer: Math.round(workingCapitalBuffer),
    breakEvenDailyOrders: breakEvenDailyUnits,
    breakEvenDailyUnits,
    breakEvenMonthlyRevenue,
    breakEvenFeasible,
    marginWarning,
    bands: {
      conservative,
      baseCase,
      optimistic
    }
  };
}
