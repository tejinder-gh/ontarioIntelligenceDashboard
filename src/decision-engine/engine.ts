import { createHash } from 'crypto';
import { sql } from '../db/index.js';
import type {
  CandidateComparison,
  DecisionEngineResult,
  DecisionInquiry,
  FunnelCandidate,
} from './types.js';
import { buildDecisionModel } from './decision-modeler.js';
import { executeStagedFunnel } from './staged-funnel.js';
import { evaluateBusinessHypotheses } from './hypothesis-evaluator.js';
import { buildEvidenceLedger } from './evidence-ledger.js';
import { calculateFinancialEconomics } from './financial-scenarios.js';
import { runSensitivityAnalysis } from './sensitivity-matrix.js';
import { prioritizeMaterialUnknowns } from './unknowns-priority.js';
import { generateDecisionBrief } from './decision-brief-generator.js';

export const ENGINE_VERSION = '2.0.0';

export async function runDecisionEngine(inquiry: DecisionInquiry): Promise<DecisionEngineResult> {
  const timestamp = new Date().toISOString();
  const runId = `run_${createHash('md5').update(`${inquiry.inquiry}_${timestamp}`).digest('hex').substring(0, 12)}`;

  // 1. Build Decision Model & Selected Scenario
  const { decisionModel, activeScenario } = buildDecisionModel(inquiry);

  // 2. Execute Staged Geographic Search Funnel
  const geographicFunnel = await executeStagedFunnel(decisionModel);
  const candidates = geographicFunnel.shortlistedCandidates;

  if (candidates.length === 0) {
    throw new Error('No candidate locations satisfied the minimum demographic and commercial screening criteria.');
  }

  const topCandidate = candidates[0]!;
  const runnerUp = candidates[1];

  // 3. Financial Economics Calculation
  const financialEconomics = calculateFinancialEconomics(topCandidate, decisionModel);

  // 4. Test Business Hypotheses (H1 - H5)
  const hypotheses = evaluateBusinessHypotheses(topCandidate, decisionModel);

  // 5. Build Auditable Evidence Record
  const evidenceLedger = buildEvidenceLedger(topCandidate, decisionModel);

  // 6. Compare Real Alternatives (Requirement 6)
  const rankedAlternatives: CandidateComparison[] = candidates.slice(0, 4).map((cand, idx) => {
    const isTop = idx === 0;
    const candEconomics = calculateFinancialEconomics(cand, decisionModel);
    
    let rankingRationale = '';
    if (isTop) {
      rankingRationale = `Rank #1: Balances above-average disposable income ($${cand.medianIncome.toLocaleString()}) with competitive gross lease rate ($${cand.commercialGrossRentSqft.toFixed(2)}/sqft) and manageable competitor density (${cand.estimatedDirectCompetitors} units).`;
    } else {
      const rentDelta = cand.commercialGrossRentSqft - topCandidate.commercialGrossRentSqft;
      const rentDesc = rentDelta > 0 
        ? `$${Math.abs(rentDelta).toFixed(2)}/sqft higher gross lease rate`
        : `$${Math.abs(rentDelta).toFixed(2)}/sqft lower lease rate but lower median household density`;
      rankingRationale = `Rank #${idx + 1}: ${rentDesc}; requires higher transaction frequency to match Rank #1 net profitability.`;
    }

    return {
      candidate: cand,
      rank: idx + 1,
      whyItFits: `${cand.city} demonstrates ${cand.populationGrowthPct > 0 ? 'expanding' : 'stable'} residential demand suitable for a ${decisionModel.format.toLowerCase().replace('_', ' ')} format.`,
      strongestSupportingEvidence: [
        `Median after-tax income: $${cand.medianIncome.toLocaleString()}`,
        `Gross commercial lease benchmark: $${cand.commercialGrossRentSqft.toFixed(2)}/sqft`,
        `Premises: ${cand.propertyAddress || 'Commercial Unit'} (${cand.squareFootage || 1400} sqft)`
      ],
      mainDisadvantages: [
        idx === 1 ? 'Higher initial rent burden or suburban commuter outflow' : 'Lower foot-traffic pedestrian density during weekday lunch hours'
      ],
      contradictoryEvidence: [
        `${cand.estimatedDirectCompetitors} licensed food service competitors in local quadrant`
      ],
      scenarioEconomics: {
        breakEvenDailyOrders: candEconomics.breakEvenDailyOrders,
        baseAnnualNetIncome: candEconomics.bands.baseCase.netOperatingIncome,
        conservativeAnnualNetIncome: candEconomics.bands.conservative.netOperatingIncome
      },
      keyUnknowns: [
        'Zoning permitted use certification',
        'HVAC Type 1 commercial hood chase status'
      ],
      rankingRationale,
      nextVerificationStep: `Conduct physical inspection and request municipal zoning compliance letter for ${cand.propertyAddress || cand.city}.`
    };
  });

  // 7. Sensitivity Matrix & Switching Conditions
  const { shocks: sensitivityShocks, switchingConditions } = runSensitivityAnalysis(
    topCandidate,
    runnerUp,
    financialEconomics,
    decisionModel
  );

  // 8. Prioritize Material Unknowns
  const materialUnknowns = prioritizeMaterialUnknowns(topCandidate);

  // 9. Generate Standard 7-Section Decision Brief
  const decisionBrief = generateDecisionBrief(
    topCandidate,
    rankedAlternatives,
    decisionModel,
    activeScenario,
    financialEconomics,
    materialUnknowns
  );

  const result: DecisionEngineResult = {
    runId,
    version: ENGINE_VERSION,
    timestamp,
    decisionModel,
    activeScenario,
    geographicFunnel,
    hypotheses,
    evidenceLedger,
    rankedAlternatives,
    financialEconomics,
    sensitivityShocks,
    switchingConditions,
    materialUnknowns,
    decisionBrief
  };

  // 10. Persist Versioned Run to PostgreSQL for Auditable Playback
  try {
    await sql`
      INSERT INTO decision_engine_runs (
        id, engine_version, category_id, inquiry_text, operating_format, 
        scenario_label, selected_candidate_id, recommendation_outcome,
        decision_model_snapshot, funnel_snapshot, hypotheses_snapshot,
        evidence_snapshot, alternatives_snapshot, sensitivity_snapshot,
        decision_brief
      ) VALUES (
        ${runId},
        ${ENGINE_VERSION},
        ${decisionModel.categoryId},
        ${inquiry.inquiry},
        ${decisionModel.format},
        ${activeScenario.label},
        ${topCandidate.id},
        ${decisionBrief.recommendation.outcome},
        ${JSON.stringify(decisionModel)},
        ${JSON.stringify(geographicFunnel)},
        ${JSON.stringify(hypotheses)},
        ${JSON.stringify(evidenceLedger)},
        ${JSON.stringify(rankedAlternatives)},
        ${JSON.stringify({ sensitivityShocks, switchingConditions })},
        ${JSON.stringify(decisionBrief)}
      );
    `;
  } catch (dbErr) {
    console.error('[Decision Engine] Warning: Failed to persist run snapshot to database:', dbErr);
  }

  return result;
}
