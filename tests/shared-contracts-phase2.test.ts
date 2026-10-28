import { describe, it, expect } from 'vitest';
import { buildDecisionModel } from '../src/decision-engine/decision-modeler.js';
import { calculateFinancialEconomics } from '../src/decision-engine/financial-scenarios.js';
import { runSensitivityAnalysis } from '../src/decision-engine/sensitivity-matrix.js';
import type { FunnelCandidate } from '../src/decision-engine/types.js';

describe('Phase 2 — Shared Analytical Contracts & Financial Economics', () => {
  const samplePizzaCandidate: FunnelCandidate = {
    id: 'cand_milton_core',
    name: 'Milton Downtown Core',
    resolutionTier: 'POTENTIALLY_SUITABLE_PROPERTY',
    parentGeoId: 'CSD_milton',
    city: 'Milton',
    population2021: 132979,
    populationGrowthPct: 4.8,
    medianIncome: 112000,
    medianIncomeSource: 'OBSERVED_CENSUS',
    annualFoodAwayExpenditure: 3800,
    commercialNetRentSqft: 32.0,
    commercialTmiSqft: 12.0,
    commercialGrossRentSqft: 44.0,
    monthlyRent: 4766,
    squareFootage: 1300,
    estimatedDirectCompetitors: 11,
    competitorDataSource: 'StatCan Table 33-10-1097-01',
    competitorClassification: 'OBSERVED',
    attractivenessScore: 84,
    confidenceScore: 86,
    suitabilityScore: 85,
    zoningFeasibilityStatus: 'VERIFIED_COMPLIANT',
    buildingSuitabilityStatus: 'VERIFIED_COMPLIANT'
  };

  const sampleDaycareCandidate: FunnelCandidate = {
    id: 'cand_oakville_daycare',
    name: 'Oakville Family Corridor',
    resolutionTier: 'POTENTIALLY_SUITABLE_PROPERTY',
    parentGeoId: 'CSD_oakville',
    city: 'Oakville',
    population2021: 213759,
    populationGrowthPct: 3.2,
    medianIncome: 130000,
    medianIncomeSource: 'OBSERVED_CENSUS',
    commercialNetRentSqft: 28.0,
    commercialTmiSqft: 10.0,
    commercialGrossRentSqft: 38.0,
    monthlyRent: 9500,
    squareFootage: 3000,
    estimatedDirectCompetitors: 6,
    competitorDataSource: 'StatCan Table 33-10-1097-01',
    competitorClassification: 'OBSERVED',
    attractivenessScore: 90,
    confidenceScore: 88,
    suitabilityScore: 89,
    zoningFeasibilityStatus: 'VERIFIED_COMPLIANT',
    buildingSuitabilityStatus: 'VERIFIED_COMPLIANT'
  };

  // Requirement 5: Changing the income goal CANNOT increase estimated market demand
  it('guarantees that increasing income goal never increases estimated market demand', () => {
    const { decisionModel: lowGoalModel } = buildDecisionModel({
      inquiry: 'Open quick-service pizza store in Milton',
      categoryId: 'pizza_store',
      desiredDiscretionaryIncome: 50000
    });

    const { decisionModel: highGoalModel } = buildDecisionModel({
      inquiry: 'Open quick-service pizza store in Milton',
      categoryId: 'pizza_store',
      desiredDiscretionaryIncome: 250000
    });

    const lowGoalEcon = calculateFinancialEconomics(samplePizzaCandidate, lowGoalModel);
    const highGoalEcon = calculateFinancialEconomics(samplePizzaCandidate, highGoalModel);

    // Invariant: Market demand scenarios must remain strictly identical
    expect(lowGoalEcon.bands.baseCase.dailyOrders).toBe(highGoalEcon.bands.baseCase.dailyOrders);
    expect(lowGoalEcon.bands.baseCase.annualRevenue).toBe(highGoalEcon.bands.baseCase.annualRevenue);
    expect(lowGoalEcon.bands.conservative.annualRevenue).toBe(highGoalEcon.bands.conservative.annualRevenue);
    expect(lowGoalEcon.bands.optimistic.annualRevenue).toBe(highGoalEcon.bands.optimistic.annualRevenue);

    // But REQUIRED sales to achieve the income goal must be properly differentiated
    expect(lowGoalEcon.requiredSalesForIncomeGoal).toBeDefined();
    expect(highGoalEcon.requiredSalesForIncomeGoal).toBeDefined();
    expect(highGoalEcon.requiredSalesForIncomeGoal!.requiredUnitsPerPeriod)
      .toBeGreaterThan(lowGoalEcon.requiredSalesForIncomeGoal!.requiredUnitsPerPeriod);
    expect(highGoalEcon.requiredSalesForIncomeGoal!.goalVolumeGap)
      .toBeGreaterThan(lowGoalEcon.requiredSalesForIncomeGoal!.goalVolumeGap);
  });

  // Requirement 6: Category-Appropriate Units and Calendars (Child Daycare)
  it('applies category-appropriate monthly units and 12-month calendar for child daycare', () => {
    const { decisionModel } = buildDecisionModel({
      inquiry: 'Open child daycare centre in Oakville',
      categoryId: 'child_daycare',
      desiredDiscretionaryIncome: 90000
    });

    expect(decisionModel.periodType).toBe('MONTH');
    expect(decisionModel.annualOperatingPeriods).toBe(12);

    const daycareEcon = calculateFinancialEconomics(sampleDaycareCandidate, decisionModel);
    expect(daycareEcon.periodType).toBe('MONTH');
    expect(daycareEcon.annualOperatingPeriods).toBe(12);

    // 48 licensed children @ $1,250/child/month * 12 months = $720,000 annual revenue
    // Previously buggy code multiplied by 360 days yielding $21.6M
    expect(daycareEcon.bands.baseCase.dailyOrders).toBe(48);
    expect(daycareEcon.bands.baseCase.annualRevenue).toBe(720000);
    expect(daycareEcon.bands.baseCase.annualRevenue).toBeLessThan(1000000);

    // Break-even is expressed in licensed children spaces per month (should be between 20 and 50)
    expect(daycareEcon.breakEvenDailyUnits).toBeGreaterThan(15);
    expect(daycareEcon.breakEvenDailyUnits).toBeLessThanOrEqual(50);
  });

  // Category-Appropriate Calendar for Retail Shipping (312 operating days, closed Sundays)
  it('applies 312 operating days calendar for retail shipping counter', () => {
    const { decisionModel } = buildDecisionModel({
      inquiry: 'Open retail shipping and parcel counter in Mississauga',
      categoryId: 'retail_shipping_counter'
    });

    expect(decisionModel.periodType).toBe('DAY');
    expect(decisionModel.annualOperatingPeriods).toBe(312);

    const shippingCandidate: FunnelCandidate = {
      ...samplePizzaCandidate,
      squareFootage: 900,
      monthlyRent: 3300
    };

    const shippingEcon = calculateFinancialEconomics(shippingCandidate, decisionModel);
    expect(shippingEcon.annualOperatingPeriods).toBe(312);

    // 90 daily shipments @ $22.50 AOV * 312 days = $631,800 annual revenue
    expect(shippingEcon.bands.baseCase.dailyOrders).toBe(90);
    expect(shippingEcon.bands.baseCase.annualRevenue).toBe(90 * 22.5 * 312);
  });

  // Requirement 5: Operational Capacity Limits and Goal Feasibility
  it('identifies when an income goal requires volume exceeding operational capacity ceiling', () => {
    const { decisionModel } = buildDecisionModel({
      inquiry: 'Open child daycare centre',
      categoryId: 'child_daycare',
      desiredDiscretionaryIncome: 800000 // Unrealistic goal for a single 50-space daycare
    });

    const daycareEcon = calculateFinancialEconomics(sampleDaycareCandidate, decisionModel);
    expect(daycareEcon.operationalCapacity).toBeDefined();
    expect(daycareEcon.operationalCapacity!.unitCapacity).toBe(50); // 50-space capacity ceiling

    expect(daycareEcon.requiredSalesForIncomeGoal).toBeDefined();
    expect(daycareEcon.requiredSalesForIncomeGoal!.isGoalAchievableWithinCapacity).toBe(false);
    expect(daycareEcon.requiredSalesForIncomeGoal!.requiredUnitsPerPeriod).toBeGreaterThan(50);
  });

  // Requirement 6: Acquisition vs Greenfield Capital Separation
  it('unambiguously defines available capital versus working-capital buffer in business acquisition', () => {
    const { decisionModel } = buildDecisionModel({
      inquiry: 'Acquire existing pizza store in Milton',
      investmentCapital: 250000,
      workingCapital: 40000
    });

    const acquisitionCandidate: FunnelCandidate = {
      ...samplePizzaCandidate,
      askingPrice: 180000
    };

    const greenfieldCandidate: FunnelCandidate = {
      ...samplePizzaCandidate,
      askingPrice: undefined
    };

    const acqEcon = calculateFinancialEconomics(acquisitionCandidate, decisionModel);
    const greenEcon = calculateFinancialEconomics(greenfieldCandidate, decisionModel);

    expect(acqEcon.isAcquisition).toBe(true);
    expect(acqEcon.acquisitionCost).toBe(180000);
    expect(acqEcon.workingCapitalBuffer).toBe(40000);
    // Acquisition buildout capEx is refresh/rebrand + security deposit, much lower than greenfield equipment buildout
    expect(acqEcon.buildoutEquipmentCapEx).toBeLessThan(greenEcon.buildoutEquipmentCapEx);
  });

  // Requirement 6: Franchise Royalties and Investor Management Fees
  it('consistently applies franchise royalties and investor management fees across all bands', () => {
    const { decisionModel: franchiseModel } = buildDecisionModel({
      inquiry: 'Open franchise pizza store as hands-off investor',
      ownership: 'FRANCHISE',
      ownerInvolvement: 'INVESTOR'
    });

    const { decisionModel: indepModel } = buildDecisionModel({
      inquiry: 'Open independent pizza store as owner-operator',
      ownership: 'INDEPENDENT',
      ownerInvolvement: 'FULL_TIME_OPERATOR'
    });

    const franchiseEcon = calculateFinancialEconomics(samplePizzaCandidate, franchiseModel);
    const indepEcon = calculateFinancialEconomics(samplePizzaCandidate, indepModel);

    // Investor model adds $55,000 management fee to operating expenses
    expect(franchiseEcon.bands.baseCase.operatingExpenses)
      .toBeGreaterThan(indepEcon.bands.baseCase.operatingExpenses);

    // Franchise royalty + investor fee increases break-even units
    expect(franchiseEcon.breakEvenDailyUnits).toBeGreaterThan(indepEcon.breakEvenDailyUnits);
  });

  // Requirement 6: Sensitivity Crossover Distinguishes Cash Flow from Ranking
  it('distinguishes net cash flow crossover from multi-factor ranking in sensitivity analysis', () => {
    const { decisionModel } = buildDecisionModel({ inquiry: 'Open pizza store' });
    const runnerCandidate: FunnelCandidate = {
      ...samplePizzaCandidate,
      id: 'cand_runner',
      commercialGrossRentSqft: 38.0,
      monthlyRent: 4100
    };

    const economics = calculateFinancialEconomics(samplePizzaCandidate, decisionModel);
    const { switchingConditions } = runSensitivityAnalysis(
      samplePizzaCandidate,
      runnerCandidate,
      economics,
      decisionModel
    );

    const volumeSwitch = switchingConditions.find(s => s.formulaTrigger.includes('Operating Volume') || s.formulaTrigger.includes('Daily Volume'));
    expect(volumeSwitch).toBeDefined();
    expect(volumeSwitch!.conditionStatement).toContain('profit crossover');
    expect(volumeSwitch!.conditionStatement).toContain('multi-factor');
  });
});
