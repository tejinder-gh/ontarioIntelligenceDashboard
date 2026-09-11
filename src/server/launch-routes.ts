import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { LAUNCH_CATALOG } from '../launch/catalog.js';
import { evaluateLaunchDecision } from '../launch/decision.js';
import * as repo from '../launch/repository.js';

const text = (max: number) => z.string().trim().min(1).max(max).refine(value => !/[\u0000-\u001f\u007f]/.test(value), 'Control characters are not allowed');
const metadata = z.object({ name: text(120), municipality: text(120), industry: text(160) }).strict();
const checkId = z.string().max(100).regex(/^[a-z][a-z0-9_.-]*$/);
const sourceUrl = text(2048).refine(value => {
  try {
    const parsed = new URL(value);
    return /^https?:\/\//.test(value) && ['http:', 'https:'].includes(parsed.protocol)
      && !!parsed.hostname && !parsed.username && !parsed.password && !/\s|\\/.test(value);
  } catch { return false; }
}, 'Use a public HTTP or HTTPS source URL without credentials');
const evidence = z.object({ checkId, title: text(200), sourceUrl, sourcePublisher: text(160) }).strict();
const check = z.object({ applicability: z.enum(['unknown', 'applicable', 'not_applicable']).optional(),
  completion: z.enum(['incomplete', 'complete']).optional(), blocker: z.enum(['none', 'unresolved', 'resolved']).optional(),
}).strict();
const nonempty = <T extends z.ZodType>(schema: T) => schema.refine(value => Object.keys(value as object).length > 0, 'Provide at least one field');
const uuid = z.uuid();
const id = (req: Request) => uuid.parse(req.params.id);
const referenceId = (req: Request) => uuid.parse(req.params.evidenceId);
const handle = (handler: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => { void handler(req, res).catch(next); };

export const launchRouter = Router();
launchRouter.get('/catalog', (_req, res) => res.json({ data: LAUNCH_CATALOG }));
launchRouter.get('/workspaces', handle(async (_req, res) => res.json({ data: await repo.listWorkspaces() })));
launchRouter.post('/workspaces', handle(async (req, res) => res.status(201).json(await repo.createWorkspace(metadata.parse(req.body)))));
launchRouter.get('/workspaces/:id', handle(async (req, res) => res.json(await repo.getWorkspace(id(req)))));
launchRouter.patch('/workspaces/:id', handle(async (req, res) => res.json(await repo.updateWorkspace(id(req), nonempty(metadata.partial()).parse(req.body)))));
launchRouter.delete('/workspaces/:id', handle(async (req, res) => { await repo.deleteWorkspace(id(req)); res.status(204).end(); }));
launchRouter.get('/workspaces/:id/gate', handle(async (req, res) => {
  const workspace = await repo.getWorkspace(id(req));
  return res.json(evaluateLaunchDecision(workspace.checks, workspace.evidence));
}));
launchRouter.patch('/workspaces/:id/checks/:checkId', handle(async (req, res) =>
  res.json(await repo.updateCheck(id(req), checkId.parse(req.params.checkId), nonempty(check).parse(req.body)))));
launchRouter.post('/workspaces/:id/evidence', handle(async (req, res) =>
  res.status(201).json(await repo.createEvidence(id(req), evidence.parse(req.body)))));
launchRouter.patch('/workspaces/:id/evidence/:evidenceId', handle(async (req, res) =>
  res.json(await repo.updateEvidence(id(req), referenceId(req), nonempty(evidence.partial()).parse(req.body)))));
launchRouter.delete('/workspaces/:id/evidence/:evidenceId', handle(async (req, res) =>
  res.json(await repo.deleteEvidence(id(req), referenceId(req)))));
launchRouter.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid launch metadata', fields: error.issues.map(issue => issue.path.join('.')) });
  if (error instanceof repo.LaunchNotFound) return res.status(404).json({ error: error.message });
  // Do not echo database errors or submitted metadata into responses or logs.
  return res.status(500).json({ error: 'Launch workspace could not be saved or loaded' });
});
