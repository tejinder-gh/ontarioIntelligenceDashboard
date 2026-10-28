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

  // 1. Capital Expenditure: Separate Business Acquisition vs Greenfield Fit-Out
  const rentDeposit = monthlyRent * 3; // First, last, and damage security
  const isAcquisition = Boolean(candidate.askingPrice && candidate.askingPrice > 0);
  const acquisitionCost = isAcquisition ? Math.round(candidate.askingPrice!) : 0;

  let buildoutEquipmentCapEx: number;
  if (isAcquisition) {
    // Existing business purchase: equipment and leaseholds are included in asking price.
    // Tenant only incurs rebranding/refresh costs + rent deposit.
    const transitionRefresh = Math.min(25000, Math.round(sqft * 12));
    buildoutEquipmentCapEx = transitionRefresh + rentDeposit;
  } else {
    // Greenfield lease: full equipment procurement and leasehold buildout required.
    const fitoutMultiplier = model.categoryId === 'logistics_warehouse' ? 25 : 65;
    const equipmentBase = model.categoryId === 'logistics_warehouse' ? 75000 : 95000;
    buildoutEquipmentCapEx = (sqft * fitoutMultiplier) + equipmentBase + rentDeposit;
  }

  const workingCapitalBuffer = model.workingCapital;
  const totalInitialCapital = acquisitionCost + buildoutEquipmentCapEx + workingCapitalBuffer;
  const fundingGap = Math.max(0, totalInitialCapital - model.investmentCapital);
  const isFullyFunded = model.investmentCapital >= totalInitialCapital;

  const aov = model.targetPricePointAov || profile.benchmarkUnitRevenue;
  const unitLabel = model.volumeUnit || profile.volumeUnit;

  // 2. Unified Cost Model: Shared across scenarios, break-even, and sensitivity
  const isFranchise = model.ownership === 'FRANCHISE';
  const franchiseRoyaltyRatio = isFranchise ? 0.055 : 0;
  const isInvestor = model.ownerInvolvement === 'INVESTOR';
  const investorManagementFeeAnnual = isInvestor ? 55000 : 0;
  const fixedAnnualOverhead = profile.fixedMonthlyOverhead * 12;
  const fixedAnnualCosts = annualRent + fixedAnnualOverhead + investorManagementFeeAnnual;

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
    const deliveryCommissions = annualRevenue * channelPct;
    const franchiseRoyalty = annualRevenue * franchiseRoyaltyRatio;
    const operatingExpenses = fixedAnnualOverhead + investorManagementFeeAnnual;

    const totalExpenses = foodCostCogs + laborCost + occupancyCostRent + deliveryCommissions + franchiseRoyalty + operatingExpenses;
    const netOperatingIncome = annualRevenue - totalExpenses;
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

  // 1. Conservative: Slower ramp, higher delivery dependence/waste
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

  // 3. Optimistic: High operational throughput, strong direct capture
  const optimistic = buildBand(
    Math.round(model.minDailyOrdersNeeded * 1.30),
    baseChannel * 0.70,
    Math.max(0.12, baseCogs - 0.02),
    Math.max(0.18, baseLabor - 0.03)
  );

  // 3. Contribution Margin & Break-Even (Royalties & Investor Fees Unified)
  const totalVariableCostRatio = baseCogs + baseLabor + baseChannel + franchiseRoyaltyRatio;
  const contributionMarginRatio = 1 - totalVariableCostRatio;

  let breakEvenFeasible = true;
  let marginWarning: string | undefined;
  let breakEvenAnnualRevenue = 0;
  let breakEvenDailyUnits = 0;

  if (contributionMarginRatio <= 0.05) {
    breakEvenFeasible = false;
    marginWarning = `Variable costs (${(totalVariableCostRatio * 100).toFixed(1)}% including ${(franchiseRoyaltyRatio * 100).toFixed(1)}% royalty) leave non-viable contribution margin (${(contributionMarginRatio * 100).toFixed(1)}%). Break-even cannot be reached.`;
    breakEvenDailyUnits = 999999;
  } else {
    breakEvenAnnualRevenue = fixedAnnualCosts / contributionMarginRatio;
    breakEvenDailyUnits = Math.ceil(breakEvenAnnualRevenue / (aov * 360));
  }

  const breakEvenMonthlyRevenue = Math.round(breakEvenAnnualRevenue / 12);

  return {
    totalInitialCapital: Math.round(totalInitialCapital),
    buildoutEquipmentCapEx: Math.round(buildoutEquipmentCapEx),
    acquisitionCost: isAcquisition ? acquisitionCost : 0,
    isAcquisition,
    workingCapitalBuffer: Math.round(workingCapitalBuffer),
    fundingGap: Math.round(fundingGap),
    isFullyFunded,
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
