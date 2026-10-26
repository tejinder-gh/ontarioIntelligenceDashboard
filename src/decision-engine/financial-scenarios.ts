import type {
  DecisionModel,
  FinancialBand,
  FinancialEconomics,
  FunnelCandidate,
} from './types.js';

export function calculateFinancialEconomics(
  candidate: FunnelCandidate,
  model: DecisionModel
): FinancialEconomics {
  const sqft = candidate.squareFootage || 1400;
  const grossRentAnnual = sqft * candidate.commercialGrossRentSqft;
  const monthlyRent = candidate.monthlyRent || (grossRentAnnual / 12);
  const annualRent = monthlyRent * 12;

  // Initial Capital Breakdown
  const equipment = model.format === 'TAKEOUT_DELIVERY' ? 85000 : 120000;
  const leaseholdImprovements = model.format === 'TAKEOUT_DELIVERY' ? 65000 : 95000;
  const initialInventory = 15000;
  const rentDeposit = monthlyRent * 3; // First, last, and security
  const buildoutEquipmentCapEx = equipment + leaseholdImprovements + initialInventory + rentDeposit;
  const workingCapitalBuffer = model.workingCapital;
  const totalInitialCapital = buildoutEquipmentCapEx + workingCapitalBuffer;

  const aov = model.targetPricePointAov;

  // Fixed Monthly Operating Expenses (Excluding Food & Labor)
  // Utilities ($1,100), Insurance ($450), POS/Tech/Telecom ($600), Maintenance & Misc ($650)
  const fixedUtilitiesTechAnnual = (1100 + 450 + 600 + 650) * 12;

  // Helper for computing financial bands
  function buildBand(dailyOrders: number, deliveryShare: number, foodCostPct: number, laborCostPct: number): FinancialBand {
    const annualRevenue = dailyOrders * aov * 360;
    const foodCostCogs = annualRevenue * foodCostPct;
    const laborCost = annualRevenue * laborCostPct;
    const occupancyCostRent = annualRent;
    
    // Delivery commission: Third party platforms take ~24% on delivery orders
    const deliveryCommissions = (annualRevenue * deliveryShare) * 0.24;
    
    // Franchise royalty if franchise model
    const royaltyCost = model.ownership === 'FRANCHISE' ? annualRevenue * 0.055 : 0;
    
    const operatingExpenses = fixedUtilitiesTechAnnual + royaltyCost;
    const totalExpenses = foodCostCogs + laborCost + occupancyCostRent + deliveryCommissions + operatingExpenses;
    const netOperatingIncome = annualRevenue - totalExpenses;
    
    // Owner Cash Flow: If full-time operator, includes owner-manager draw
    const ownerCashFlow = netOperatingIncome;
    
    const paybackMonths = ownerCashFlow > 0 
      ? Math.max(6, Math.round((totalInitialCapital / ownerCashFlow) * 12))
      : 999;

    return {
      dailyOrders,
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

  // Conservative (P20): Slower ramp, higher delivery dependence, slightly higher food waste
  const conservative = buildBand(
    Math.round(model.minDailyOrdersNeeded * 0.82), // 82% of target volume
    0.65, // 65% delivery orders
    0.32, // 32% food cost
    0.31  // 31% labor
  );

  // Base Case (P50): Target operating model
  const baseCase = buildBand(
    model.minDailyOrdersNeeded,
    0.48, // 48% delivery orders
    0.29, // 29% food cost
    0.28  // 28% labor
  );

  // Optimistic (P80): Mature operating cadence, strong direct/pickup volume
  const optimistic = buildBand(
    Math.round(model.minDailyOrdersNeeded * 1.30), // 130% of target volume
    0.35, // 35% delivery orders (65% pickup/direct, zero commission)
    0.27, // 27% food cost
    0.25  // 25% labor
  );

  // Deterministic Break-Even Calculation
  // Contribution Margin = 1 - (Food Cost 29% + Delivery Commission Blend 11.5% + Variable Labor 14%) = 45.5%
  const contributionMarginRatio = 0.455;
  const fixedAnnualCosts = annualRent + fixedUtilitiesTechAnnual + (model.ownerInvolvement === 'INVESTOR' ? 55000 : 0);
  const breakEvenAnnualRevenue = fixedAnnualCosts / contributionMarginRatio;
  const breakEvenMonthlyRevenue = Math.round(breakEvenAnnualRevenue / 12);
  const breakEvenDailyOrders = Math.ceil(breakEvenAnnualRevenue / (aov * 360));

  return {
    totalInitialCapital: Math.round(totalInitialCapital),
    buildoutEquipmentCapEx: Math.round(buildoutEquipmentCapEx),
    workingCapitalBuffer: Math.round(workingCapitalBuffer),
    breakEvenDailyOrders,
    breakEvenMonthlyRevenue,
    bands: {
      conservative,
      baseCase,
      optimistic
    }
  };
}
