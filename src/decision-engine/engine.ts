import { createHash } from 'crypto';
import { sql } from '../db/index.js';
import {
  FinancialEconomicsSchema,
  type CandidateComparison,
  type DecisionBrief,
  type DecisionEngineResult,
  type DecisionInquiry,
  type DecisionModel,
  type EvidenceRecordItem,
  type FinancialEconomics,
  type FunnelCandidate,
  type RecommendationOutcome,
} from './types.js';
import type { MetricProvenance } from './provenance.js';
import { buildDecisionModel } from './decision-modeler.js';
import { executeStagedFunnel } from './staged-funnel.js';
import { evaluateBusinessHypotheses } from './hypothesis-evaluator.js';
import { buildEvidenceLedger } from './evidence-ledger.js';
import { calculateFinancialEconomics } from './financial-scenarios.js';
import { runSensitivityAnalysis } from './sensitivity-matrix.js';
import { prioritizeMaterialUnknowns } from './unknowns-priority.js';
import { generateDecisionBrief } from './decision-brief-generator.js';
import { getCategoryProfile } from './category-profiles.js';

export const ENGINE_VERSION = '2.0.0';

export async function runDecisionEngine(inquiry: DecisionInquiry): Promise<DecisionEngineResult> {
  const timestamp = new Date().toISOString();
  const runId = `run_${createHash('md5').update(`${inquiry.inquiry}_${timestamp}`).digest('hex').substring(0, 12)}`;
  const workspaceId = inquiry.workspaceId || 'workspace_default';
  const userId = inquiry.userId || 'analyst_default';

  // 1. Build Decision Model & Selected Scenario
  const { decisionModel, activeScenario } = buildDecisionModel(inquiry);
  const profile = getCategoryProfile(decisionModel.categoryId);

  // 2. Execute Staged Geographic Search Funnel
  const geographicFunnel = await executeStagedFunnel(decisionModel);
  const candidates = geographicFunnel.shortlistedCandidates;

  if (candidates.length === 0) {
    const outcome: RecommendationOutcome = 'DO_NOT_PROCEED';
    const decisionBrief: DecisionBrief = {
      recommendation: {
        marketOrLocation: decisionModel.geographicScope,
        resolutionTier: 'PROSPECTIVE_MARKET',
        operatingFormat: decisionModel.format,
        ownershipModel: decisionModel.ownership,
        outcome,
        summaryHeadline: `INSUFFICIENT EVIDENCE / NO QUALIFIED CANDIDATES: Zero candidate locations qualified in ${decisionModel.geographicScope} for ${decisionModel.categoryName}.`,
        feasibilityGateNote: 'FEASIBILITY GATE FAILED: Candidate markets failed demographic density, income viability, or commercial lease affordability screening criteria. Demarcated fail-closed state strictly prevents un-screened property recommendation.'
      },
      whyThisLocation: [],
      whyNotAlternatives: geographicFunnel.stages.screenedMarkets.map(m => ({
        candidateName: m.name,
        tradeOffReason: m.reason
      })),
      economics: {
        requiredCapital: decisionModel.totalRequiredCapital,
        breakEvenDailyOrders: decisionModel.minDailyOrdersNeeded,
        breakEvenUnitsLabel: decisionModel.volumeUnit,
        baseNetIncome: 0,
        scenarioRanges: 'Unviable under current geographic or category constraints'
      },
      whatCouldMakeThisWrong: [
        'Geographic filter strictly constrained to markets lacking necessary population threshold',
        'Commercial lease asking rates or available space in target municipality do not support business model',
        'Underlying demographic data may be unobserved for small non-census rural subdivisions'
      ],
      beforeCommitting: [
        'Widen target geographic regions to adjacent Census Subdivisions',
        'Review alternative operating formats (e.g. ghost kitchen or mobile delivery) to lower occupancy burden',
        'Commission a localized foot-traffic intercept and traffic study before signing any commercial lease'
      ],
      sources: [
        {
          name: 'Statistics Canada Census Profile (2021)',
          friendlyCode: 'DEM-CEN21',
          coverage: 'Complete Ontario Census Subdivisions (CSDs)',
          limitations: 'Official baseline updated quinquennially.'
        }
      ]
    };

    const emptyEconomics: FinancialEconomics = {
      totalInitialCapital: decisionModel.totalRequiredCapital,
      buildoutEquipmentCapEx: 0,
      isAcquisition: false,
      workingCapitalBuffer: decisionModel.workingCapital,
      fundingGap: 0,
      isFullyFunded: true,
      breakEvenDailyOrders: decisionModel.minDailyOrdersNeeded,
      breakEvenDailyUnits: decisionModel.minDailyOrdersNeeded,
      breakEvenMonthlyRevenue: 0,
      breakEvenFeasible: false,
      marginWarning: 'No candidate passed geographic screening criteria.',
      periodType: decisionModel.periodType || 'DAY',
      annualOperatingPeriods: decisionModel.annualOperatingPeriods || 360,
      bands: {
        conservative: {
          dailyOrders: 0, dailyUnitVolume: 0, unitName: decisionModel.volumeUnit,
          annualRevenue: 0, foodCostCogs: 0, laborCost: 0, occupancyCostRent: 0,
          deliveryCommissions: 0, operatingExpenses: 0, netOperatingIncome: 0,
          ownerCashFlow: 0, paybackMonths: 999
        },
        baseCase: {
          dailyOrders: 0, dailyUnitVolume: 0, unitName: decisionModel.volumeUnit,
          annualRevenue: 0, foodCostCogs: 0, laborCost: 0, occupancyCostRent: 0,
          deliveryCommissions: 0, operatingExpenses: 0, netOperatingIncome: 0,
          ownerCashFlow: 0, paybackMonths: 999
        },
        optimistic: {
          dailyOrders: 0, dailyUnitVolume: 0, unitName: decisionModel.volumeUnit,
          annualRevenue: 0, foodCostCogs: 0, laborCost: 0, occupancyCostRent: 0,
          deliveryCommissions: 0, operatingExpenses: 0, netOperatingIncome: 0,
          ownerCashFlow: 0, paybackMonths: 999
        }
      }
    };

    const isUuid = (val: string | undefined): boolean => 
      Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val));
    const dbUserId: string | null = (inquiry.userId && isUuid(inquiry.userId)) ? inquiry.userId : null;

    try {
      await sql`
        INSERT INTO decision_engine_runs (
          id, engine_version, category_id, inquiry_text, operating_format, 
          scenario_label, selected_candidate_id, recommendation_outcome,
          decision_model_snapshot, funnel_snapshot, hypotheses_snapshot,
          evidence_snapshot, alternatives_snapshot, sensitivity_snapshot,
          financial_snapshot, decision_brief, workspace_id, user_id
        ) VALUES (
          ${runId},
          ${ENGINE_VERSION},
          ${decisionModel.categoryId},
          ${inquiry.inquiry},
          ${decisionModel.format},
          ${activeScenario.label},
          'NO_CANDIDATE_QUALIFIED',
          ${outcome},
          ${sql.json(decisionModel as any)},
          ${sql.json(geographicFunnel as any)},
          ${sql.json([])},
          ${sql.json([])},
          ${sql.json([])},
          ${sql.json([])},
          ${sql.json(emptyEconomics as any)},
          ${sql.json(decisionBrief as any)},
          ${workspaceId},
          ${dbUserId}
        );
      `;
    } catch (dbErr) {
      console.warn('[DecisionEngine] Failed to persist unviable run to PostgreSQL:', dbErr);
    }

    return {
      runId,
      version: ENGINE_VERSION,
      timestamp,
      workspaceId,
      userId,
      decisionModel,
      activeScenario,
      geographicFunnel,
      hypotheses: [],
      evidenceLedger: [],
      provenanceLedger: [],
      rankedAlternatives: [],
      financialEconomics: emptyEconomics,
      sensitivityShocks: [],
      switchingConditions: [],
      materialUnknowns: [],
      decisionBrief
    };
  }

  const topCandidate = candidates[0]!;
  const runnerUp = candidates[1];

  // 3. Financial Economics Calculation
  const financialEconomics = calculateFinancialEconomics(topCandidate, decisionModel);

  // 4. Test Business Hypotheses (H1 - H5)
  const hypotheses = evaluateBusinessHypotheses(topCandidate, decisionModel);

  // 5. Build Auditable Evidence Record & Provenance Ledger
  const evidenceLedger = buildEvidenceLedger(topCandidate, decisionModel);
  const provenanceLedger = evidenceLedger.flatMap(e => e.provenance ? [e.provenance] : []);

  // 6. Compare Real Alternatives with Category-Specific Drivers
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
        : `$${Math.abs(rentDelta).toFixed(2)}/sqft lower lease rate but lower localized density`;
      rankingRationale = `Rank #${idx + 1}: ${rentDesc}; requires higher volume capture to match Rank #1 net profitability.`;
    }

    return {
      candidate: cand,
      rank: idx + 1,
      whyItFits: `${cand.city} demonstrates ${cand.populationGrowthPct > 0 ? 'expanding' : 'stable'} demand suitable for a ${decisionModel.format.toLowerCase().replace('_', ' ')} format.`,
      strongestSupportingEvidence: [
        `Median after-tax income: $${cand.medianIncome.toLocaleString()}`,
        `Gross commercial lease benchmark: $${cand.commercialGrossRentSqft.toFixed(2)}/sqft`,
        `Premises: ${cand.propertyAddress || cand.neighbourhood || 'Commercial Hub'} (${cand.squareFootage || profile.typicalSqftMin} sqft)`
      ],
      mainDisadvantages: [
        idx === 1 ? 'Higher initial rent burden or suburban commuter outflow' : 'Lower foot-traffic pedestrian density during weekday hours'
      ],
      contradictoryEvidence: [
        `${cand.estimatedDirectCompetitors} licensed NAICS ${decisionModel.naicsCode} competitors in municipality`
      ],
      scenarioEconomics: {
        breakEvenDailyOrders: candEconomics.breakEvenDailyUnits,
        baseAnnualNetIncome: candEconomics.bands.baseCase.netOperatingIncome,
        conservativeAnnualNetIncome: candEconomics.bands.conservative.netOperatingIncome
      },
      keyUnknowns: [
        `Zoning permitted use certification for ${profile.canonicalName}`,
        profile.essentialInfrastructure[0] || 'Electrical / Mechanical service load'
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
  const materialUnknowns = prioritizeMaterialUnknowns(topCandidate, decisionModel.categoryId);

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
    workspaceId,
    userId,
    decisionModel,
    activeScenario,
    geographicFunnel,
    hypotheses,
    evidenceLedger,
    provenanceLedger,
    rankedAlternatives,
    financialEconomics,
    sensitivityShocks,
    switchingConditions,
    materialUnknowns,
    decisionBrief
  };

  // 10. Persist Versioned Run to PostgreSQL with Workspace Isolation
  const isUuid = (val: string | undefined): boolean => 
    Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val));
  const dbUserId: string | null = (inquiry.userId && isUuid(inquiry.userId)) ? inquiry.userId : null;

  try {
    await sql`
      INSERT INTO decision_engine_runs (
        id, engine_version, category_id, inquiry_text, operating_format, 
        scenario_label, selected_candidate_id, recommendation_outcome,
        decision_model_snapshot, funnel_snapshot, hypotheses_snapshot,
        evidence_snapshot, alternatives_snapshot, sensitivity_snapshot,
        financial_snapshot, decision_brief, workspace_id, user_id
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
        ${JSON.stringify(financialEconomics)},
        ${JSON.stringify(decisionBrief)},
        ${workspaceId},
        ${dbUserId}
      );
    `;
  } catch (dbErr) {
    console.error(`[Decision Engine] Error persisting run snapshot ${runId}:`, dbErr);
    throw new Error(`Database persistence failure for run ${runId}: ${dbErr instanceof Error ? dbErr.message : String(dbErr)}`);
  }

  return result;
}

export async function replayDecisionRun(runId: string, workspaceId: string): Promise<DecisionEngineResult> {
  const rows = await sql`
    SELECT * FROM decision_engine_runs 
    WHERE id = ${runId} AND workspace_id = ${workspaceId}
    LIMIT 1;
  `;

  if (rows.length === 0) {
    throw new Error(`Run ${runId} not found or unauthorized access for workspace ${workspaceId}`);
  }

  const row = rows[0]!;

  // Strict snapshot integrity validation: reject corrupted/incomplete records
  if (!row.decision_model_snapshot || !row.alternatives_snapshot || !row.funnel_snapshot) {
    throw new Error(`Malformed snapshot for run ${runId}: missing essential decision or alternatives payload`);
  }

  // Reject legacy records without financial_snapshot: do not claim recalculation under current constants is immutable
  if (!row.financial_snapshot) {
    throw new Error(`Unsupported legacy run snapshot for run ${runId}: record was created under legacy engine version ${row.engine_version} before immutable financial snapshots were versioned.`);
  }

  const parseJson = (val: unknown, fieldName: string) => {
    if (!val) return null;
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { throw new Error(`Malformed JSON in snapshot field '${fieldName}' for run ${runId}`); }
    }
    return val;
  };

  const decisionModel = parseJson(row.decision_model_snapshot, 'decision_model_snapshot') as DecisionModel;
  if (!decisionModel || !decisionModel.categoryId) {
    throw new Error(`Corrupted decision model snapshot for run ${runId}`);
  }

  const alternatives = parseJson(row.alternatives_snapshot, 'alternatives_snapshot') as CandidateComparison[];
  if (!Array.isArray(alternatives) || alternatives.length === 0) {
    throw new Error(`Corrupted alternatives snapshot for run ${runId}: empty candidate array`);
  }
  const topCandidate = alternatives[0]?.candidate;

  // Validate financial snapshot with strict Zod schema; reject {} and malformed records
  const rawFinancial = parseJson(row.financial_snapshot, 'financial_snapshot');
  const parsedEconomics = FinancialEconomicsSchema.safeParse(rawFinancial);
  if (!parsedEconomics.success) {
    throw new Error(`Corrupted financial snapshot for run ${runId}: schema validation failed (${parsedEconomics.error.issues.map(i => i.path.join('.') + ': ' + i.message).join('; ')})`);
  }
  const financialEconomics = parsedEconomics.data;

  const evidenceLedger = (parseJson(row.evidence_snapshot, 'evidence_snapshot') as EvidenceRecordItem[]) || [];
  const provenanceLedger: MetricProvenance[] = Array.isArray(evidenceLedger)
    ? evidenceLedger.flatMap(e => e.provenance ? [e.provenance] : [])
    : [];
  const sensitivitySnapshot = (parseJson(row.sensitivity_snapshot, 'sensitivity_snapshot') as any) || {};

  return {
    runId: row.id,
    version: row.engine_version,
    timestamp: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    workspaceId: row.workspace_id,
    userId: row.user_id,
    decisionModel,
    activeScenario: {
      key: 'replayed_scenario',
      label: row.scenario_label,
      format: row.operating_format,
      ownership: decisionModel.ownership || 'INDEPENDENT',
      investmentCapital: decisionModel.investmentCapital,
      workingCapital: decisionModel.workingCapital,
      targetAov: decisionModel.targetPricePointAov,
      rationale: 'Replayed from immutable run snapshot'
    },
    geographicFunnel: parseJson(row.funnel_snapshot, 'funnel_snapshot'),
    hypotheses: parseJson(row.hypotheses_snapshot, 'hypotheses_snapshot'),
    evidenceLedger,
    provenanceLedger,
    rankedAlternatives: alternatives,
    financialEconomics,
    sensitivityShocks: sensitivitySnapshot.sensitivityShocks || [],
    switchingConditions: sensitivitySnapshot.switchingConditions || [],
    materialUnknowns: topCandidate ? prioritizeMaterialUnknowns(topCandidate, decisionModel.categoryId) : [],
    decisionBrief: parseJson(row.decision_brief, 'decision_brief')
  };
}
