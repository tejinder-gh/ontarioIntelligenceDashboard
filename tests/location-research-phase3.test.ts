import { describe, it, expect } from 'vitest';
import { runDecisionEngine } from '../src/decision-engine/engine.js';
import { buildDecisionModel } from '../src/decision-engine/decision-modeler.js';
import { executeStagedFunnel } from '../src/decision-engine/staged-funnel.js';
import { SUITABILITY_SCORER_VERSION } from '../src/decision-engine/suitability-scorer.js';

describe('Phase 3 — Bounded Location Research & Geographic Integrity', () => {
  // Requirement 7 & 8: Traceable Pizza Store Investigation
  it('executes a traceable pizza store investigation with distinct food & delivery economics', async () => {
    const result = await runDecisionEngine({
      inquiry: 'Open quick-service pizza store in Milton',
      categoryId: 'pizza_store',
      targetRegions: ['Milton'],
      investmentCapital: 260000,
      desiredDiscretionaryIncome: 85000
    });

    expect(result.decisionModel.categoryId).toBe('pizza_store');
    expect(result.decisionModel.naicsCode).toBe('722513');
    expect(result.decisionModel.annualOperatingPeriods).toBe(360);
    expect(result.decisionBrief.recommendation.outcome).toBe('PROCEED_WITH_VERIFICATION');

    // Traceability to canonical observations
    expect(result.evidenceLedger.length).toBeGreaterThanOrEqual(4);
    const statCanEv = result.evidenceLedger.find(e => e.provenance?.sourceName?.includes('Statistics Canada'));
    expect(statCanEv).toBeDefined();
    expect(statCanEv!.provenance?.sourceName).toContain('Statistics Canada');

    // Strict geographic boundary: Only Milton
    for (const alt of result.rankedAlternatives) {
      expect(alt.candidate.city).toBe('Milton');
    }
  });

  // Requirement 7 & 8: Traceable Retail Shipping Counter Investigation
  it('executes a traceable retail shipping counter investigation with distinct commercial service assumptions', async () => {
    const result = await runDecisionEngine({
      inquiry: 'Open retail shipping and parcel drop-off counter in Oakville',
      categoryId: 'retail_shipping_counter',
      targetRegions: ['Oakville'],
      investmentCapital: 250000,
      desiredDiscretionaryIncome: 75000
    });

    expect(result.decisionModel.categoryId).toBe('retail_shipping_counter');
    expect(result.decisionModel.naicsCode).toBe('561431');
    expect(result.decisionModel.annualOperatingPeriods).toBe(312); // 6 days/week, closed Sundays
    expect(result.decisionModel.targetPricePointAov).toBe(22.5);

    // Bounded to Oakville
    for (const alt of result.rankedAlternatives) {
      expect(alt.candidate.city).toBe('Oakville');
    }
  });

  // Requirement 8: User Geography Restrictions Bounded Through Every Stage (No Unrestricted Fallback)
  it('strictly bounds geographic evaluation to specified municipality and never falls back to unrestricted Ontario', async () => {
    const { decisionModel } = buildDecisionModel({
      inquiry: 'Open quick-service pizza store',
      categoryId: 'pizza_store',
      targetRegions: ['Burlington']
    });

    expect(decisionModel.allowedGeographyIds).toEqual(['CSD_burlington']);

    const funnel = await executeStagedFunnel(decisionModel);
    expect(funnel.stages.screenedMarkets.length).toBe(1);
    expect(funnel.stages.screenedMarkets[0]!.name).toBe('Burlington');

    for (const cand of funnel.shortlistedCandidates) {
      expect(cand.city).toBe('Burlington');
      expect(cand.parentGeoId).toBe('CSD_burlington');
    }
  });

  // Requirement 7 & 9: Honest Insufficient-Evidence / No-Recommendation Case
  it('returns an honest DO_NOT_PROCEED report when geographic screening yields zero viable candidates', async () => {
    // Non-existent or impossible municipality filter
    const result = await runDecisionEngine({
      inquiry: 'Open logistics warehouse in NonExistentTown',
      categoryId: 'logistics_warehouse',
      targetRegions: ['NonExistentTown']
    });

    // Does NOT throw; returns an honest insufficient-evidence decision report
    expect(result.decisionBrief.recommendation.outcome).toBe('DO_NOT_PROCEED');
    expect(result.decisionBrief.recommendation.summaryHeadline).toContain('INSUFFICIENT EVIDENCE / NO QUALIFIED CANDIDATES');
    expect(result.decisionBrief.recommendation.feasibilityGateNote).toContain('FEASIBILITY GATE FAILED');
    expect(result.rankedAlternatives).toHaveLength(0);
    expect(result.geographicFunnel.shortlistedCandidates).toHaveLength(0);
    expect(result.geographicFunnel.stoppingCriteria.length).toBeGreaterThan(0);
  });

  // Requirement 9: Explainable and Versioned Scoring Rules
  it('applies versioned scoring rules and explains score contributions, tradeoffs, and missing evidence', async () => {
    const { decisionModel } = buildDecisionModel({
      inquiry: 'Open pizza store in Milton',
      categoryId: 'pizza_store',
      targetRegions: ['Milton']
    });

    const funnel = await executeStagedFunnel(decisionModel);
    expect(funnel.shortlistedCandidates.length).toBeGreaterThan(0);

    const topCandidate = funnel.shortlistedCandidates[0]!;
    expect(topCandidate.scoringVersion).toBe(SUITABILITY_SCORER_VERSION);
    expect(topCandidate.scoreContributions).toBeDefined();
    expect(topCandidate.scoreContributions!.incomePurchasingPower).toBeGreaterThan(0);
    expect(topCandidate.scoreContributions!.rentAffordability).toBeGreaterThan(0);
    expect(topCandidate.scoreContributions!.physicalVerification).toBeGreaterThan(0);
    expect(topCandidate.tradeOffs).toBeDefined();
    expect(topCandidate.missingEvidence).toBeDefined();
  });
});
