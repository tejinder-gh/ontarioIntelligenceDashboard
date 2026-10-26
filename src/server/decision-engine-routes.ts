import { Router, type Response } from 'express';
import { sql } from '../db/index.js';
import { DecisionInquirySchema } from '../decision-engine/types.js';
import { runDecisionEngine } from '../decision-engine/engine.js';
import { OPERATING_SCENARIOS } from '../decision-engine/decision-modeler.js';
import { evaluateSourceRegistry } from '../decision-engine/source-evaluator.js';

export const decisionEngineRouter = Router();

const sanitizeError = (res: Response, logPrefix: string, err: unknown) => {
  console.error(`[Decision Engine API] ${logPrefix}:`, err);
  const msg = err instanceof Error ? err.message : 'Internal error executing decision engine pipeline';
  res.status(500).json({ success: false, error: msg });
};

// 1. Run Decision Engine Analysis
decisionEngineRouter.post('/analyze', async (req, res) => {
  try {
    const parseResult = DecisionInquirySchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid decision inquiry payload',
        details: parseResult.error.issues
      });
      return;
    }

    const engineResult = await runDecisionEngine(parseResult.data);
    res.json({ success: true, data: engineResult });
  } catch (err: unknown) {
    sanitizeError(res, 'Error running decision analysis', err);
  }
});

// 2. Pre-Configured Operating Scenarios
decisionEngineRouter.get('/scenarios', (_req, res) => {
  res.json({ success: true, data: OPERATING_SCENARIOS });
});

// 3. Audited Data Source Registry
decisionEngineRouter.get('/sources', async (_req, res) => {
  try {
    const sources = await evaluateSourceRegistry();
    res.json({ success: true, count: sources.length, data: sources });
  } catch (err: unknown) {
    sanitizeError(res, 'Error retrieving source registry', err);
  }
});

// 4. List Recent Saved Auditable Runs
decisionEngineRouter.get('/runs', async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string || '20', 10)));
    const runs = await sql`
      SELECT 
        id, engine_version, category_id, inquiry_text, operating_format, 
        scenario_label, selected_candidate_id, recommendation_outcome, created_at
      FROM decision_engine_runs
      ORDER BY created_at DESC
      LIMIT ${limit};
    `;
    res.json({ success: true, count: runs.length, data: runs });
  } catch (err: unknown) {
    sanitizeError(res, 'Error fetching decision engine runs', err);
  }
});

// 5. Get Single Versioned Run by ID for Auditable Playback
decisionEngineRouter.get('/runs/:id', async (req, res) => {
  try {
    const [run] = await sql`
      SELECT * FROM decision_engine_runs WHERE id = ${req.params.id};
    `;
    if (!run) {
      res.status(404).json({ success: false, error: 'Decision run snapshot not found' });
      return;
    }
    res.json({ success: true, data: run });
  } catch (err: unknown) {
    sanitizeError(res, 'Error fetching decision run snapshot', err);
  }
});
