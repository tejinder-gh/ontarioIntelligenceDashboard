import { Router, type Response } from 'express';
import { sql } from '../db/index.js';
import { DecisionInquirySchema } from '../decision-engine/types.js';
import { runDecisionEngine, replayDecisionRun } from '../decision-engine/engine.js';
import { OPERATING_SCENARIOS } from '../decision-engine/decision-modeler.js';
import { evaluateSourceRegistry } from '../decision-engine/source-evaluator.js';

export const decisionEngineRouter = Router();

const sanitizeError = (res: Response, logPrefix: string, err: unknown) => {
  console.error(`[Decision Engine API] ${logPrefix}:`, err);
  const msg = err instanceof Error ? err.message : 'Internal error executing decision engine pipeline';
  res.status(500).json({ success: false, error: msg });
};

function extractWorkspaceId(req: { headers: Record<string, string | string[] | undefined>; query: Record<string, unknown>; body?: Record<string, unknown> }): string {
  const headerWs = req.headers['x-workspace-id'];
  if (typeof headerWs === 'string' && headerWs.trim().length > 0) {
    return headerWs.trim();
  }
  if (typeof req.query.workspaceId === 'string' && req.query.workspaceId.trim().length > 0) {
    return req.query.workspaceId.trim();
  }
  if (req.body && typeof req.body.workspaceId === 'string' && req.body.workspaceId.trim().length > 0) {
    return req.body.workspaceId.trim();
  }
  return 'workspace_default';
}

// 1. Run Decision Engine Analysis
decisionEngineRouter.post('/analyze', async (req, res) => {
  try {
    const workspaceId = extractWorkspaceId(req);
    const rawBody = {
      ...req.body,
      workspaceId: req.body?.workspaceId || workspaceId
    };

    const parseResult = DecisionInquirySchema.safeParse(rawBody);
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

// 4. List Saved Auditable Runs with Workspace Isolation
decisionEngineRouter.get('/runs', async (req, res) => {
  try {
    const workspaceId = extractWorkspaceId(req);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string || '20', 10)));
    const runs = await sql`
      SELECT 
        id, engine_version, category_id, inquiry_text, operating_format, 
        scenario_label, selected_candidate_id, recommendation_outcome, 
        workspace_id, user_id, created_at
      FROM decision_engine_runs
      WHERE workspace_id = ${workspaceId}
      ORDER BY created_at DESC
      LIMIT ${limit};
    `;
    res.json({ success: true, workspaceId, count: runs.length, data: runs });
  } catch (err: unknown) {
    sanitizeError(res, 'Error fetching decision engine runs', err);
  }
});

// 5. Get Single Versioned Run by ID with Workspace Isolation Verification
decisionEngineRouter.get('/runs/:id', async (req, res) => {
  try {
    const workspaceId = extractWorkspaceId(req);
    const [anyRun] = await sql`
      SELECT id, workspace_id FROM decision_engine_runs WHERE id = ${req.params.id};
    `;

    if (!anyRun) {
      res.status(404).json({ success: false, error: 'Decision run snapshot not found' });
      return;
    }

    if (anyRun.workspace_id !== workspaceId) {
      res.status(403).json({
        success: false,
        error: 'Access denied: Decision run belongs to an isolated workspace'
      });
      return;
    }

    const [run] = await sql`
      SELECT * FROM decision_engine_runs WHERE id = ${req.params.id} AND workspace_id = ${workspaceId};
    `;

    res.json({ success: true, data: run });
  } catch (err: unknown) {
    sanitizeError(res, 'Error fetching decision run snapshot', err);
  }
});

// 6. Replay Saved Run Reproducibly
decisionEngineRouter.post('/runs/:id/replay', async (req, res) => {
  try {
    const workspaceId = extractWorkspaceId(req);
    const replayed = await replayDecisionRun(req.params.id, workspaceId);
    res.json({ success: true, data: replayed });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error replaying run';
    if (msg.includes('Access denied') || msg.includes('unauthorized')) {
      res.status(403).json({ success: false, error: msg });
      return;
    }
    if (msg.includes('not found')) {
      res.status(404).json({ success: false, error: msg });
      return;
    }
    sanitizeError(res, 'Error replaying decision run', err);
  }
});
