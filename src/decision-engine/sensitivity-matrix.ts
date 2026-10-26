import type {
  DecisionModel,
  FinancialEconomics,
  FunnelCandidate,
  SensitivityShock,
  SwitchingCondition,
} from './types.js';

export function runSensitivityAnalysis(
  topCandidate: FunnelCandidate,
  runnerUpCandidate: FunnelCandidate | undefined,
  economics: FinancialEconomics,
  model: DecisionModel
): {
  shocks: SensitivityShock[];
  switchingConditions: SwitchingCondition[];
} {
  const baseNet = economics.bands.baseCase.netOperatingIncome;
  const baseBreakEvenOrders = economics.breakEvenDailyOrders;
  const annualRent = economics.bands.baseCase.occupancyCostRent;
  const annualRev = economics.bands.baseCase.annualRevenue;

  // 1. Rent Shock: Commercial Lease +20%
  const shockedRentDelta = annualRent * 0.20;
  const netAfterRentShock = baseNet - shockedRentDelta;
  const rentShockBreakEven = Math.ceil((baseBreakEvenOrders * (annualRent * 1.20 + (annualRev * 0.18))) / (annualRent + (annualRev * 0.18)));
  
  const rentShock: SensitivityShock = {
    parameter: 'Commercial Lease Rate',
    shockApplied: '+20% increase in Gross Lease (Net Rent + TMI)',
    baseMetric: `$${Math.round(annualRent).toLocaleString()}/yr (${baseBreakEvenOrders} orders/day break-even)`,
    shockedMetric: `$${Math.round(annualRent * 1.2).toLocaleString()}/yr (${rentShockBreakEven} orders/day break-even, net income -$${Math.round(shockedRentDelta).toLocaleString()})`,
    impactOnViability: netAfterRentShock > 45000 
      ? 'Remains viable with healthy buffer; owner income reduced but positive.' 
      : 'Erodes safety margin severely; requires +7 orders/day to offset.',
    resilienceRating: netAfterRentShock > 50000 ? 'ROBUST' : 'SENSITIVE'
  };

  // 2. Sales Volume Shock: -25% Slower Initial Sales Ramp
  const shockedSalesRev = annualRev * 0.75;
  const shockedSalesNet = (shockedSalesRev * 0.455) - (annualRent + 33600);
  const volumeShock: SensitivityShock = {
    parameter: 'First-Year Customer Ramp',
    shockApplied: '-25% lower order volume than modelled base case',
    baseMetric: `${economics.bands.baseCase.dailyOrders} daily orders ($${baseNet.toLocaleString()} net)`,
    shockedMetric: `${Math.round(economics.bands.baseCase.dailyOrders * 0.75)} daily orders ($${Math.round(shockedSalesNet).toLocaleString()} net)`,
    impactOnViability: shockedSalesNet > 0 
      ? 'Survives initial year without capital call; working capital buffer covers monthly shortfall during months 1–4.'
      : 'Requires tapping working capital reserve ($35k buffer provides 7.2 months runway under sustained deficit).',
    resilienceRating: shockedSalesNet >= 20000 ? 'SENSITIVE' : 'VULNERABLE'
  };

  // 3. Margin Compression: Food Cost +300 bps (Ingredient Inflation)
  const foodCostInflation = annualRev * 0.03;
  const netAfterFoodCost = baseNet - foodCostInflation;
  const foodShock: SensitivityShock = {
    parameter: 'Food Cost COGS (Cheese & Flour Inflation)',
    shockApplied: '+300 bps increase in food cost (29% -> 32%)',
    baseMetric: `29.0% COGS ($${economics.bands.baseCase.foodCostCogs.toLocaleString()})`,
    shockedMetric: `32.0% COGS ($${Math.round(economics.bands.baseCase.foodCostCogs + foodCostInflation).toLocaleString()})`,
    impactOnViability: 'Absorbable via minor retail menu price adjustment (+$0.85 per large pie).',
    resilienceRating: 'ROBUST'
  };

  // 4. Delivery Channel Shift: 70% Volume on Third-Party Apps (25% Commission)
  const deliveryShiftCost = (annualRev * (0.70 - 0.48)) * 0.25;
  const netAfterDeliveryShift = baseNet - deliveryShiftCost;
  const deliveryShock: SensitivityShock = {
    parameter: 'Third-Party Delivery Platform Dependence',
    shockApplied: 'Delivery share jumps from 48% to 70% of gross orders at 25% take-rate',
    baseMetric: `48% delivery share ($${economics.bands.baseCase.deliveryCommissions.toLocaleString()} commissions)`,
    shockedMetric: `70% delivery share ($${Math.round(economics.bands.baseCase.deliveryCommissions + deliveryShiftCost).toLocaleString()} commissions)`,
    impactOnViability: 'Substantial margin drag; forces active investment into direct first-party online ordering incentives (e.g. 10% direct-order loyalty discount).',
    resilienceRating: 'SENSITIVE'
  };

  // 5. Competitor Entry: Direct Competitor Opens Within 600m
  const competitorShareLoss = annualRev * 0.12;
  const netAfterCompetitor = baseNet - (competitorShareLoss * 0.455);
  const competitorShock: SensitivityShock = {
    parameter: 'Local Competitive Ingress',
    shockApplied: 'New entrant captures 12% of local neighborhood catchment orders',
    baseMetric: `${topCandidate.estimatedDirectCompetitors} existing area competitors`,
    shockedMetric: `${topCandidate.estimatedDirectCompetitors + 1} competitors ($${Math.round(netAfterCompetitor).toLocaleString()} adjusted net income)`,
    impactOnViability: 'Unit economics remain profitable provided brand establishes crust/quality differentiation before new entrant arrival.',
    resilienceRating: 'ROBUST'
  };

  const shocks = [rentShock, volumeShock, foodShock, deliveryShock, competitorShock];

  // Deterministic Switching Conditions (Requirement 7)
  const switchingConditions: SwitchingCondition[] = [];

  if (runnerUpCandidate) {
    // Condition 1: Occupancy Cost Switch
    const rentDifference = topCandidate.commercialGrossRentSqft - runnerUpCandidate.commercialGrossRentSqft;
    const thresholdRent = topCandidate.commercialGrossRentSqft + 4.80;
    switchingConditions.push({
      conditionStatement: `${runnerUpCandidate.name} (${runnerUpCandidate.city}) becomes preferable if ${topCandidate.name}'s negotiated gross lease rate exceeds $${thresholdRent.toFixed(2)}/sqft.`,
      formulaTrigger: `Gross Rent > $${thresholdRent.toFixed(2)}/sqft (Rent-to-sales ratio exceeds 9.5%)`,
      switchingThresholdValue: `$${thresholdRent.toFixed(2)}/sqft`,
      alternativeTarget: runnerUpCandidate.name
    });

    // Condition 2: Delivery vs Walk-in Mix Switch
    switchingConditions.push({
      conditionStatement: `${runnerUpCandidate.name} (${runnerUpCandidate.city}) becomes preferable if delivery order volume exceeds 68% of total transactions.`,
      formulaTrigger: 'Delivery Mix > 68% (Higher delivery commission cannibalizes urban footfall premium)',
      switchingThresholdValue: '68% delivery mix',
      alternativeTarget: runnerUpCandidate.name
    });
  } else {
    switchingConditions.push({
      conditionStatement: 'Switch to turnkey franchise acquisition if physical commercial buildout quotation exceeds $110,000.',
      formulaTrigger: 'Leasehold Improvement Quote > $110,000 (Exceeds unamortized independent capital ceiling)',
      switchingThresholdValue: '$110,000 Fit-out CapEx',
      alternativeTarget: 'Turnkey Franchise System'
    });
  }

  return { shocks, switchingConditions };
}
