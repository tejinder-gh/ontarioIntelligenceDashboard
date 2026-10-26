import type {
  DecisionModel,
  FinancialEconomics,
  FunnelCandidate,
  SensitivityShock,
  SwitchingCondition,
} from './types.js';
import { getCategoryProfile } from './category-profiles.js';

export function runSensitivityAnalysis(
  topCandidate: FunnelCandidate,
  runnerUpCandidate: FunnelCandidate | undefined,
  economics: FinancialEconomics,
  model: DecisionModel
): {
  shocks: SensitivityShock[];
  switchingConditions: SwitchingCondition[];
} {
  const profile = getCategoryProfile(model.categoryId);
  const baseNet = economics.bands.baseCase.netOperatingIncome;
  const baseBreakEvenUnits = economics.breakEvenDailyUnits;
  const annualRent = economics.bands.baseCase.occupancyCostRent;
  const annualRev = economics.bands.baseCase.annualRevenue;
  const unitLabel = model.volumeUnit || profile.volumeUnit;
  const isIndustrial = model.categoryId === 'logistics_warehouse';

  // 1. Occupancy Cost Shock: Gross Lease / TMI +20%
  const shockedRentDelta = annualRent * 0.20;
  const netAfterRentShock = baseNet - shockedRentDelta;
  const rentShockBreakEven = Math.ceil(baseBreakEvenUnits * (annualRent * 1.20 + (annualRev * 0.18)) / Math.max(1, (annualRent + (annualRev * 0.18))));
  
  const rentShock: SensitivityShock = {
    parameter: isIndustrial ? 'Industrial Net Lease + TMI' : 'Commercial Retail Gross Lease Rate',
    shockApplied: '+20% increase in base rent or municipal property tax / CAM escalation',
    baseMetric: `$${Math.round(annualRent).toLocaleString()}/yr (${baseBreakEvenUnits} ${unitLabel}/day break-even)`,
    shockedMetric: `$${Math.round(annualRent * 1.2).toLocaleString()}/yr (${rentShockBreakEven} ${unitLabel}/day break-even, -$${Math.round(shockedRentDelta).toLocaleString()} net cash flow)`,
    impactOnViability: netAfterRentShock > 35000 
      ? 'Remains financially viable; operator cash flow reduced but comfortably covers debt service and operations.' 
      : 'Erodes safety buffer; requires active lease cap negotiation before signing offer to lease.',
    resilienceRating: netAfterRentShock > 45000 ? 'ROBUST' : 'SENSITIVE'
  };

  // 2. Volume Demand Ramp Shock: -25% Slower Initial Volume
  const shockedSalesRev = annualRev * 0.75;
  const shockedSalesNet = (shockedSalesRev * (1 - (profile.cogsRatio + profile.variableLaborRatio + profile.channelOrCommissionRatio))) - (annualRent + (profile.fixedMonthlyOverhead * 12));
  const volumeShock: SensitivityShock = {
    parameter: 'First-Year Customer Ramp / Volume',
    shockApplied: `-25% lower transaction throughput than modelled base case`,
    baseMetric: `${economics.bands.baseCase.dailyUnitVolume} ${unitLabel}/day ($${baseNet.toLocaleString()} net)`,
    shockedMetric: `${Math.round(economics.bands.baseCase.dailyUnitVolume * 0.75)} ${unitLabel}/day ($${Math.round(shockedSalesNet).toLocaleString()} net)`,
    impactOnViability: shockedSalesNet > 0 
      ? 'Survives initial ramp without cash call; working capital buffer covers early monthly cash flow deficit.'
      : `Deficit requires drawing from working capital ($${model.workingCapital.toLocaleString()} reserves sustain approx ${Math.max(1, Math.round((model.workingCapital / Math.abs(shockedSalesNet || 1)) * 12))} months runway).`,
    resilienceRating: shockedSalesNet >= 20000 ? 'SENSITIVE' : 'VULNERABLE'
  };

  // 3. Direct Cost Inflation (COGS / Consumables / Fuel / Supplies)
  const cogsInflation = annualRev * 0.03;
  const netAfterCogs = baseNet - cogsInflation;
  const cogsShock: SensitivityShock = {
    parameter: isIndustrial ? 'Fleet Fuel & Packaging Consumables' : 'Direct Product COGS / Ingredient Inflation',
    shockApplied: `+300 bps increase in direct materials (${(profile.cogsRatio * 100).toFixed(1)}% -> ${((profile.cogsRatio + 0.03) * 100).toFixed(1)}%)`,
    baseMetric: `${(profile.cogsRatio * 100).toFixed(1)}% COGS ($${economics.bands.baseCase.foodCostCogs.toLocaleString()})`,
    shockedMetric: `${((profile.cogsRatio + 0.03) * 100).toFixed(1)}% COGS ($${Math.round(economics.bands.baseCase.foodCostCogs + cogsInflation).toLocaleString()})`,
    impactOnViability: 'Absorbable through disciplined operational yield management or minor price indexation.',
    resilienceRating: 'ROBUST'
  };

  // 4. Channel Intermediation / Commission Shift
  const channelShiftDelta = annualRev * 0.10 * 0.20;
  const channelShock: SensitivityShock = {
    parameter: isIndustrial ? '3PL Freight Brokerage Commission Shift' : 'Third-Party Digital Ordering / Delivery Platform Fee',
    shockApplied: '10% shift in total volume from direct customer relationships to broker/app mediated channels',
    baseMetric: `$${economics.bands.baseCase.deliveryCommissions.toLocaleString()} channel expense`,
    shockedMetric: `$${Math.round(economics.bands.baseCase.deliveryCommissions + channelShiftDelta).toLocaleString()} channel expense`,
    impactOnViability: 'Substantial margin drag; prioritizes direct account sales and corporate contracts.',
    resilienceRating: 'SENSITIVE'
  };

  // 5. Direct Competitor Ingress
  const competitorShareLoss = annualRev * 0.10;
  const competitorNet = baseNet - (competitorShareLoss * 0.40);
  const compShock: SensitivityShock = {
    parameter: 'Local Competitive Ingress',
    shockApplied: 'New entrant establishes operations within primary catchment and captures 10% volume',
    baseMetric: `${topCandidate.estimatedDirectCompetitors} existing area competitors`,
    shockedMetric: `${topCandidate.estimatedDirectCompetitors + 1} competitors ($${Math.round(competitorNet).toLocaleString()} adjusted net income)`,
    impactOnViability: 'Remains viable provided brand establishes localized customer loyalty and service differentiation.',
    resilienceRating: 'ROBUST'
  };

  const shocks = [rentShock, volumeShock, cogsShock, channelShock, compShock];

  // Deterministic Switching Conditions from Candidate-Specific Economics
  const switchingConditions: SwitchingCondition[] = [];

  if (runnerUpCandidate) {
    const topSqft = topCandidate.squareFootage || profile.typicalSqftMin;
    const runnerSqft = runnerUpCandidate.squareFootage || profile.typicalSqftMin;
    const runnerRentAnnual = runnerSqft * runnerUpCandidate.commercialGrossRentSqft;
    const netIncomeDifference = Math.max(0, baseNet - (annualRev * 0.90 - runnerRentAnnual - (profile.fixedMonthlyOverhead * 12)));
    
    // Exact mathematical rent threshold where top candidate net income equals runner up net income
    const allowableRentIncrease = netIncomeDifference / Math.max(1, topSqft);
    const thresholdRentSqft = topCandidate.commercialGrossRentSqft + allowableRentIncrease;

    switchingConditions.push({
      conditionStatement: `${runnerUpCandidate.name} (${runnerUpCandidate.city}) ranks higher if ${topCandidate.name}'s negotiated lease rate exceeds $${thresholdRentSqft.toFixed(2)}/sqft gross.`,
      formulaTrigger: `Gross Lease Rate > $${thresholdRentSqft.toFixed(2)}/sqft (Net income advantage of $${Math.round(netIncomeDifference).toLocaleString()} is erased)`,
      switchingThresholdValue: `$${thresholdRentSqft.toFixed(2)}/sqft/yr`,
      alternativeTarget: runnerUpCandidate.name
    });

    switchingConditions.push({
      conditionStatement: `${runnerUpCandidate.name} (${runnerUpCandidate.city}) ranks higher if direct customer capture falls below 45% of total volume.`,
      formulaTrigger: 'Direct Capture < 45% (Intermediary commission burden eliminates location density premium)',
      switchingThresholdValue: '45% direct customer share',
      alternativeTarget: runnerUpCandidate.name
    });
  } else {
    const capitalCeiling = model.investmentCapital;
    switchingConditions.push({
      conditionStatement: `Alternative market investigation triggered if turnkey build-out quote exceeds $${capitalCeiling.toLocaleString()}.`,
      formulaTrigger: `Buildout CapEx > $${capitalCeiling.toLocaleString()} (Exceeds available equity buffer)`,
      switchingThresholdValue: `$${capitalCeiling.toLocaleString()} CapEx`,
      alternativeTarget: 'Adjacent Municipality or Turnkey Asset Acquisition'
    });
  }

  return { shocks, switchingConditions };
}
