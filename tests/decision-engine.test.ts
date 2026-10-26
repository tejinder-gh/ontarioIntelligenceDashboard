import { describe, it, expect } from 'vitest';
import { buildDecisionModel, OPERATING_SCENARIOS } from '../src/decision-engine/decision-modeler.js';
import { executeStagedFunnel } from '../src/decision-engine/staged-funnel.js';
import { evaluateBusinessHypotheses } from '../src/decision-engine/hypothesis-evaluator.js';
import { buildEvidenceLedger } from '../src/decision-engine/evidence-ledger.js';
import { calculateFinancialEconomics } from '../src/decision-engine/financial-scenarios.js';
import { runSensitivityAnalysis } from '../src/decision-engine/sensitivity-matrix.js';
import { prioritizeMaterialUnknowns } from '../src/decision-engine/unknowns-priority.js';
import { generateDecisionBrief } from '../src/decision-engine/decision-brief-generator.js';
import { runDecisionEngine } from '../src/decision-engine/engine.js';
import { evaluateSourceRegistry } from '../src/decision-engine/source-evaluator.js';

describe('Intelligent Research & Decision Engine Suite', () => {
  // 1. Turn Request into Decision Model (Requirement 1)
  it('R1: builds structured decision model and explores labelled scenarios without inventing preferences', () => {
    const { decisionModel, activeScenario, allScenarios } = buildDecisionModel({
      inquiry: 'I want to open a pizza store. I am flexible about location.'
    });

    expect(allScenarios.length).toBeGreaterThanOrEqual(3);
    expect(decisionModel.categoryId).toBe('pizza_store');
    expect(decisionModel.minDailyOrdersNeeded).toBeGreaterThan(0);
    expect(decisionModel.minCatchmentHouseholds).toBeGreaterThan(1000);
    expect(decisionModel.unspecifiedPreferencesExplored.length).toBeGreaterThan(0);
    expect(activeScenario.key).toBe('lean_takeout_delivery');
  });

  // 2. Search from Broad Markets to Specific Properties (Requirement 2)
  it('R2: executes staged geographic funnel and maintains resolution tier demarcations', async () => {
    const { decisionModel } = buildDecisionModel({ inquiry: 'Open pizza store' });
    const funnel = await executeStagedFunnel(decisionModel);

    expect(funnel.totalMarketsScreened).toBeGreaterThanOrEqual(400);
    expect(funnel.stages.screenedMarkets.length).toBeGreaterThan(0);
    expect(funnel.shortlistedCandidates.length).toBeGreaterThan(0);
    expect(funnel.stoppingCriteria.length).toBeGreaterThanOrEqual(3);

    // Verify candidate property has specific resolution tier
    const topCand = funnel.shortlistedCandidates[0]!;
    expect(topCand.resolutionTier).toBe('POTENTIALLY_SUITABLE_PROPERTY');
    expect(topCand.commercialGrossRentSqft).toBeGreaterThan(0);
  });

  // 3. Test Business Hypotheses & Counter-Arguments (Requirement 3)
  it('R3: evaluates H1-H5 with evidence FOR, evidence AGAINST, and alternative explanations', async () => {
    const { decisionModel } = buildDecisionModel({ inquiry: 'Open pizza store' });
    const funnel = await executeStagedFunnel(decisionModel);
    const topCand = funnel.shortlistedCandidates[0]!;

    const hypotheses = evaluateBusinessHypotheses(topCand, decisionModel);
    expect(hypotheses.length).toBe(5);

    for (const h of hypotheses) {
      expect(h.evidenceFor.length).toBeGreaterThan(0);
      expect(h.evidenceAgainst.length).toBeGreaterThan(0);
      expect(h.alternativeExplanation).toBeTruthy();
      expect(['SUPPORTED', 'CONTRADICTED', 'INCONCLUSIVE']).toContain(h.status);
    }
  });

  // 4. Discover and Evaluate Data Sources (Requirement 4)
  it('R4: audits source registry with questions, authority rank, and coverage limitations', async () => {
    const sources = await evaluateSourceRegistry();
    expect(sources.length).toBeGreaterThan(0);

    const first = sources[0]!;
    expect(first.provider).toBeTruthy();
    expect(first.officialDatasetCode).toBeTruthy();
    expect(first.coverageGapsAndLimitations).toBeTruthy();
  });

  // 5. Build Auditable Evidence Record (Requirement 5)
  it('R5: links Claim to Evidence, Calculation, Uncertainty, and Decision Implication', async () => {
    const { decisionModel } = buildDecisionModel({ inquiry: 'Open pizza store' });
    const funnel = await executeStagedFunnel(decisionModel);
    const topCand = funnel.shortlistedCandidates[0]!;

    const ledger = buildEvidenceLedger(topCand, decisionModel);
    expect(ledger.length).toBeGreaterThanOrEqual(4);

    for (const item of ledger) {
      expect(item.claim).toBeTruthy();
      expect(item.evidenceObserved).toBeTruthy();
      expect(item.calculationMethod).toBeTruthy();
      expect(item.uncertaintyEstimate).toBeTruthy();
      expect(item.decisionImplication).toBeTruthy();
      expect(['OBSERVED', 'AUDITED', 'BENCHMARK', 'DERIVED']).toContain(item.classification);
    }
  });

  // 6. Compare Real Alternatives & Financials (Requirement 6)
  it('R6: produces deterministic financial bands and ranked alternatives', async () => {
    const { decisionModel } = buildDecisionModel({ inquiry: 'Open pizza store' });
    const funnel = await executeStagedFunnel(decisionModel);
    const topCand = funnel.shortlistedCandidates[0]!;

    const economics = calculateFinancialEconomics(topCand, decisionModel);
    expect(economics.totalInitialCapital).toBeGreaterThan(100000);
    expect(economics.breakEvenDailyOrders).toBeGreaterThan(0);
    expect(economics.bands.baseCase.annualRevenue).toBeGreaterThan(economics.bands.conservative.annualRevenue);
    expect(economics.bands.optimistic.annualRevenue).toBeGreaterThan(economics.bands.baseCase.annualRevenue);
  });

  // 7. Sensitivity Shocks & Deterministic Switching Conditions (Requirement 7)
  it('R7: tests 5 sensitivity shocks and calculates exact switching thresholds', async () => {
    const { decisionModel } = buildDecisionModel({ inquiry: 'Open pizza store' });
    const funnel = await executeStagedFunnel(decisionModel);
    const topCand = funnel.shortlistedCandidates[0]!;
    const runnerUp = funnel.shortlistedCandidates[1];
    const economics = calculateFinancialEconomics(topCand, decisionModel);

    const { shocks, switchingConditions } = runSensitivityAnalysis(topCand, runnerUp, economics, decisionModel);
    expect(shocks.length).toBe(5);
    expect(switchingConditions.length).toBeGreaterThan(0);

    const firstCond = switchingConditions[0]!;
    expect(firstCond.conditionStatement).toBeTruthy();
    expect(firstCond.formulaTrigger).toBeTruthy();
    expect(firstCond.switchingThresholdValue).toBeTruthy();
  });

  // 8. Material Unknowns Prioritization (Requirement 8)
  it('R8: ranks unknowns by impact and outlines practical field check protocols', async () => {
    const { decisionModel } = buildDecisionModel({ inquiry: 'Open pizza store' });
    const funnel = await executeStagedFunnel(decisionModel);
    const topCand = funnel.shortlistedCandidates[0]!;

    const unknowns = prioritizeMaterialUnknowns(topCand);
    expect(unknowns.length).toBeGreaterThanOrEqual(4);
    expect(unknowns[0]!.rank).toBe(1);
    expect(unknowns[0]!.category).toBe('ZONING');
    expect(unknowns[0]!.fieldCheckProtocol).toContain('Zoning Compliance Letter');
  });

  // 9. Structured 7-Section Decision Brief (Requirement 9)
  it('R9: synthesizes the complete 7-section executive decision brief', async () => {
    const { decisionModel, activeScenario } = buildDecisionModel({ inquiry: 'Open pizza store' });
    const funnel = await executeStagedFunnel(decisionModel);
    const topCand = funnel.shortlistedCandidates[0]!;
    const economics = calculateFinancialEconomics(topCand, decisionModel);
    const unknowns = prioritizeMaterialUnknowns(topCand);

    const brief = generateDecisionBrief(topCand, [], decisionModel, activeScenario, economics, unknowns);
    expect(brief.recommendation.summaryHeadline).toBeTruthy();
    expect(brief.whyThisLocation.length).toBeGreaterThan(0);
    expect(brief.economics.breakEvenDailyOrders).toBeGreaterThan(0);
    expect(brief.whatCouldMakeThisWrong.length).toBeGreaterThan(0);
    expect(brief.beforeCommitting.length).toBeGreaterThan(0);
    expect(brief.sources.length).toBeGreaterThan(0);
  });

  // 10. End-to-End Engine & Snapshot Persistence (Requirement 10)
  it('R10: runs master engine and records versioned snapshot in database', async () => {
    const result = await runDecisionEngine({
      inquiry: 'I want to open a pizza store. I am flexible about location.'
    });

    expect(result.runId).toMatch(/^run_/);
    expect(result.version).toBe('2.0.0');
    expect(result.decisionModel).toBeDefined();
    expect(result.geographicFunnel.shortlistedCandidates.length).toBeGreaterThan(0);
    expect(result.hypotheses.length).toBe(5);
    expect(result.evidenceLedger.length).toBeGreaterThan(0);
    expect(result.rankedAlternatives.length).toBeGreaterThan(0);
    expect(result.sensitivityShocks.length).toBe(5);
    expect(result.switchingConditions.length).toBeGreaterThan(0);
    expect(result.materialUnknowns.length).toBeGreaterThan(0);
    expect(result.decisionBrief).toBeDefined();
  });
});
