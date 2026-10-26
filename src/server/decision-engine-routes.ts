import { Router, type Response } from 'express';
import { sql } from '../db/index.js';
import { DecisionInquirySchema } from '../decision-engine/types.js';
import { runDecisionEngine, replayDecisionRun } from '../decision-engine/engine.js';
import { OPERATING_SCENARIOS } from '../decision-engine/decision-modeler.js';
import { evaluateSourceRegistry } from '../decision-engine/source-evaluator.js';
import { requireAuth } from './auth.js';
import { ensureWorkspaceAccess, verifyWorkspaceMembership } from './workspace-auth.js';

export const decisionEngineRouter = Router();

const sanitizeError = (res: Response, logPrefix: string, err: unknown) => {
  console.error(`[Decision Engine API] ${logPrefix}:`, err);
  const msg = err instanceof Error ? err.message : 'Internal error executing decision engine pipeline';
  res.status(500).json({ success: false, error: msg });
};

function extractWorkspaceId(req: { headers: Record<string, string | string[] | undefined>; query: Record<string, unknown>; body?: Record<string, unknown> }, fallbackUserWs: string): string {
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
  return fallbackUserWs;
}

// 1. Run Decision Engine Analysis (Authenticated & Workspace Authorized)
decisionEngineRouter.post('/analyze', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const workspaceId = extractWorkspaceId(req, `ws_${userId}`);

    // Verify workspace authorization in database (rejects spoofed victim workspace IDs)
    const access = await ensureWorkspaceAccess(userId, workspaceId);
    if (!access.allowed) {
      res.status(403).json({ success: false, error: access.reason });
      return;
    }

    const rawBody = {
      ...req.body,
      workspaceId,
      userId
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

// 2. Pre-Configured Operating Scenarios (Public Metadata)
decisionEngineRouter.get('/scenarios', (_req, res) => {
  res.json({ success: true, data: OPERATING_SCENARIOS });
});

// 3. Audited Data Source Registry (Public Metadata)
decisionEngineRouter.get('/sources', async (_req, res) => {
  try {
    const sources = await evaluateSourceRegistry();
    res.json({ success: true, count: sources.length, data: sources });
  } catch (err: unknown) {
    sanitizeError(res, 'Error retrieving source registry', err);
  }
});

// 4. List Saved Auditable Runs with Workspace Membership Verification
decisionEngineRouter.get('/runs', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const workspaceId = extractWorkspaceId(req, `ws_${userId}`);

    // Read-only membership verification: strictly prevents DB mutations on GET
    const isPersonalWs = workspaceId === `ws_${userId}` || workspaceId === `workspace_${userId}`;
    const isMember = isPersonalWs || await verifyWorkspaceMembership(userId, workspaceId);
    if (!isMember) {
      res.status(403).json({
        success: false,
        error: `Access denied: User does not have authorized membership in workspace '${workspaceId}'`
      });
      return;
    }

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

// 5. Get Single Versioned Run by ID with Workspace Membership Verification
decisionEngineRouter.get('/runs/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const runId = Array.isArray(req.params.id) ? req.params.id[0]! : (req.params.id || '');
    const [anyRun] = await sql`
      SELECT id, workspace_id FROM decision_engine_runs WHERE id = ${runId};
    `;

    if (!anyRun) {
      res.status(404).json({ success: false, error: 'Decision run snapshot not found' });
      return;
    }

    const isMember = await verifyWorkspaceMembership(userId, anyRun.workspace_id);
    if (!isMember) {
      res.status(403).json({
        success: false,
        error: 'Access denied: You do not have membership in the workspace owning this decision run'
      });
      return;
    }

    const [run] = await sql`
      SELECT * FROM decision_engine_runs WHERE id = ${runId} AND workspace_id = ${anyRun.workspace_id};
    `;

    res.json({ success: true, data: run });
  } catch (err: unknown) {
    sanitizeError(res, 'Error fetching decision run snapshot', err);
  }
});

// 6. Replay Saved Run Reproducibly with Workspace Membership Verification
decisionEngineRouter.post('/runs/:id/replay', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const runId = Array.isArray(req.params.id) ? req.params.id[0]! : (req.params.id || '');
    const [anyRun] = await sql`
      SELECT id, workspace_id FROM decision_engine_runs WHERE id = ${runId};
    `;

    if (!anyRun) {
      res.status(404).json({ success: false, error: 'Decision run snapshot not found' });
      return;
    }

    const isMember = await verifyWorkspaceMembership(userId, anyRun.workspace_id);
    if (!isMember) {
      res.status(403).json({
        success: false,
        error: 'Access denied: You do not have membership in the workspace owning this decision run'
      });
      return;
    }

    const replayed = await replayDecisionRun(runId, anyRun.workspace_id);
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
