import type {
  DecisionModel,
  FinancialBand,
  FinancialEconomics,
  FunnelCandidate,
  OperationalCapacity,
  RequiredSalesForGoal,
  RequiredMarketCapture,
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
  const periodType: 'DAY' | 'MONTH' = model.periodType || profile.periodType || 'DAY';
  const annualOperatingPeriods = model.annualOperatingPeriods || profile.annualOperatingPeriods || (periodType === 'MONTH' ? 12 : 360);

  // 2. Unified Cost Model: Shared across scenarios, break-even, and sensitivity
  const isFranchise = model.ownership === 'FRANCHISE';
  const franchiseRoyaltyRatio = isFranchise ? 0.055 : 0;
  const isInvestor = model.ownerInvolvement === 'INVESTOR';
  const investorManagementFeeAnnual = isInvestor ? 55000 : 0;
  const fixedAnnualOverhead = profile.fixedMonthlyOverhead * 12;
  const fixedAnnualCosts = annualRent + fixedAnnualOverhead + investorManagementFeeAnnual;

  // Helper for computing financial bands
  function buildBand(
    unitsPerPeriod: number,
    channelPct: number,
    cogsPct: number,
    laborPct: number
  ): FinancialBand {
    const annualRevenue = unitsPerPeriod * aov * annualOperatingPeriods;
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
      dailyOrders: unitsPerPeriod,
      dailyUnitVolume: unitsPerPeriod,
      periodUnitVolume: unitsPerPeriod,
      periodType,
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

  // 3. Demand Scenarios: Driven by Empirical Market Demand Benchmarks (NOT User Income Target)
  const empiricalBaseVolume = model.benchmarkDailyVolume ?? (periodType === 'MONTH' ? 48 : (profile.categoryId === 'retail_shipping_counter' ? 90 : 70));

  // 1. Conservative: Slower ramp, higher delivery dependence/waste
  const conservative = buildBand(
    Math.round(empiricalBaseVolume * 0.80),
    baseChannel * 1.35,
    baseCogs + 0.03,
    baseLabor + 0.03
  );

  // 2. Base Case: Empirical market throughput
  const baseCase = buildBand(
    empiricalBaseVolume,
    baseChannel,
    baseCogs,
    baseLabor
  );

  // 3. Optimistic: High operational throughput, strong direct capture
  const optimistic = buildBand(
    Math.round(empiricalBaseVolume * 1.25),
    baseChannel * 0.70,
    Math.max(0.12, baseCogs - 0.02),
    Math.max(0.18, baseLabor - 0.03)
  );

  // 4. Contribution Margin & Break-Even (Royalties & Investor Fees Unified)
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
    breakEvenDailyUnits = Math.ceil(breakEvenAnnualRevenue / (aov * annualOperatingPeriods));
  }

  const breakEvenMonthlyRevenue = Math.round(breakEvenAnnualRevenue / 12);

  // 5. Operational Capacity Modeling
  const unitCapacity = model.operationalDailyCapacity ?? profile.operationalDailyCapacity ?? (periodType === 'MONTH' ? 50 : 250);
  const capacityUtilizationPct = Math.round((empiricalBaseVolume / unitCapacity) * 100);
  const operationalCapacity: OperationalCapacity = {
    unitCapacity,
    periodType,
    annualOperatingPeriods,
    capacityUtilizationPct,
    capacityCeilingExceeded: empiricalBaseVolume > unitCapacity,
    notes: `Category operational capacity capped at ${unitCapacity} ${unitLabel}/${periodType.toLowerCase()} based on physical equipment and facility constraints.`
  };

  // 6. Required Sales Volume to achieve User's Income Goal (Modeled Separately from Demand)
  const targetIncome = Math.max(0, model.desiredAnnualIncome);
  const contributionPerUnit = aov * contributionMarginRatio;
  let requiredUnitsPerPeriod = 999999;
  let requiredAnnualRevenue = 999999999;
  let isGoalAchievableWithinCapacity = false;
  let goalVolumeGap = 0;
  let interpretation = '';

  if (contributionMarginRatio > 0.05) {
    requiredAnnualRevenue = Math.round((fixedAnnualCosts + targetIncome) / contributionMarginRatio);
    requiredUnitsPerPeriod = Math.ceil((fixedAnnualCosts + targetIncome) / (contributionPerUnit * annualOperatingPeriods));
    goalVolumeGap = requiredUnitsPerPeriod - empiricalBaseVolume;
    isGoalAchievableWithinCapacity = requiredUnitsPerPeriod <= unitCapacity;
    interpretation = goalVolumeGap > 0
      ? `Income goal ($${targetIncome.toLocaleString()}/yr) requires ${requiredUnitsPerPeriod} ${unitLabel}/${periodType.toLowerCase()}, which is ${goalVolumeGap} units higher than empirical market baseline (${empiricalBaseVolume} ${unitLabel}/${periodType.toLowerCase()}). High-capture market strategy or premium pricing needed.`
      : `Income goal ($${targetIncome.toLocaleString()}/yr) requires ${requiredUnitsPerPeriod} ${unitLabel}/${periodType.toLowerCase()}, which is comfortably supported within expected market baseline of ${empiricalBaseVolume} ${unitLabel}/${periodType.toLowerCase()}.`;
  } else {
    interpretation = 'Variable costs exceed sustainable threshold; income goal cannot be modeled with positive contribution margin.';
  }

  const requiredSalesForIncomeGoal: RequiredSalesForGoal = {
    targetAnnualDiscretionaryIncome: targetIncome,
    requiredUnitsPerPeriod,
    requiredAnnualRevenue,
    goalVolumeGap,
    isGoalAchievableWithinCapacity,
    interpretation
  };

  // 7. Required Market Capture Modeling
  const annualDemandUnits = empiricalBaseVolume * annualOperatingPeriods;
  const annualSpendingPool = candidate.annualFoodAwayExpenditure && candidate.population2021
    ? (candidate.annualFoodAwayExpenditure * (candidate.population2021 / 2.6))
    : undefined;
  const estimatedMarketSharePct = annualSpendingPool && annualSpendingPool > 0
    ? Math.min(100, Math.round(((annualDemandUnits * aov) / annualSpendingPool) * 1000) / 10)
    : 3.5;
  const requiredMarketCapture: RequiredMarketCapture = {
    annualDemandUnits,
    periodDemandUnits: empiricalBaseVolume,
    tradeAreaExpenditurePool: annualSpendingPool ? Math.round(annualSpendingPool) : undefined,
    estimatedMarketSharePct,
    validationNeeded: `Empirical volume (${empiricalBaseVolume} ${unitLabel}/${periodType.toLowerCase()}) assumes ${estimatedMarketSharePct.toFixed(1)}% capture of local category expenditure pool. Requires on-site foot-traffic intercepts and local competitor count validation.`
  };

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
    periodType,
    annualOperatingPeriods,
    operationalCapacity,
    requiredSalesForIncomeGoal,
    requiredMarketCapture,
    bands: {
      conservative,
      baseCase,
      optimistic
    }
  };
}
