import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LAUNCH_CATALOG } from '../src/launch/catalog.js';
import { evaluateLaunchDecision } from '../src/launch/decision.js';
import type { LaunchCheckState, LaunchEvidence, LaunchWorkspace } from '../src/launch/contracts.js';
import {
  createLaunchEvidence,
  deleteLaunchEvidence,
  getLaunchCatalog,
  getLaunchGate,
  listLaunchWorkspaces,
  updateLaunchCheck,
  updateLaunchEvidence,
} from '../src/client/utils/launch-api.js';
import { LaunchReadinessView } from '../src/client/views/LaunchReadinessView.js';

const checkDefinition = LAUNCH_CATALOG[0];
const workspaceId = '11111111-1111-4111-8111-111111111111';
const evidenceId = '22222222-2222-4222-8222-222222222222';

const newWorkspace = (): LaunchWorkspace => ({
  id: workspaceId,
  name: 'Burlington pilot',
  municipality: 'Burlington',
  industry: 'Food service',
  createdAt: '2026-09-09T12:00:00.000Z',
  updatedAt: '2026-09-09T12:00:00.000Z',
  checks: [{
    id: checkDefinition.id,
    applicability: 'applicable',
    completion: 'incomplete',
    blocker: 'none',
    evidenceIds: [],
  }],
  evidence: [],
});

const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('launch-readiness client integration', () => {
  it('renders an accessible initial loading state and exposes sidebar/deep-link wiring', () => {
    const markup = renderToStaticMarkup(<LaunchReadinessView />);
    expect(markup).toContain('role="status"');
    expect(markup).toContain('Loading launch readiness');

    const appSource = readFileSync(new URL('../src/client/App.tsx', import.meta.url), 'utf8');
    const sidebarSource = readFileSync(new URL('../src/client/components/Sidebar.tsx', import.meta.url), 'utf8');
    expect(appSource).toContain("'launch-readiness': 'launch_readiness'");
    expect(appSource).toContain('<LaunchReadinessView workspaceId={launchWorkspaceId} />');
    expect(sidebarSource).toContain("id: 'launch_readiness'");
  });

  it('surfaces an API failure and succeeds when the same initial request is retried', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ error: 'Launch readiness is temporarily unavailable' }, 503))
      .mockResolvedValueOnce(json({ data: [checkDefinition] }));

    await expect(getLaunchCatalog()).rejects.toThrow('Launch readiness is temporarily unavailable');
    await expect(getLaunchCatalog()).resolves.toEqual([checkDefinition]);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/api/launch/catalog', '/api/launch/catalog']);
  });

  it('edits a check, adds/edits/deletes evidence, and refreshes gate reasons after every save', async () => {
    let workspace = newWorkspace();
    const gateSnapshots: string[][] = [];

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      expect(url.startsWith('/api/launch/')).toBe(true);
      const method = init?.method ?? 'GET';

      if (url === '/api/launch/catalog' && method === 'GET') return json({ data: [checkDefinition] });
      if (url === '/api/launch/workspaces' && method === 'GET') return json({ data: [workspace] });
      if (url === `/api/launch/workspaces/${workspaceId}/gate` && method === 'GET') {
        const gate = evaluateLaunchDecision(workspace.checks, workspace.evidence, [checkDefinition]);
        gateSnapshots.push(gate.reasons.map(reason => reason.code));
        return json(gate);
      }
      if (url === `/api/launch/workspaces/${workspaceId}/checks/${checkDefinition.id}` && method === 'PATCH') {
        const patch = JSON.parse(String(init?.body)) as Partial<LaunchCheckState>;
        workspace = { ...workspace, checks: workspace.checks.map(check => check.id === checkDefinition.id ? { ...check, ...patch } : check) };
        return json(workspace);
      }
      if (url === `/api/launch/workspaces/${workspaceId}/evidence` && method === 'POST') {
        const input = JSON.parse(String(init?.body)) as Pick<LaunchEvidence, 'checkId' | 'title' | 'sourceUrl' | 'sourcePublisher'>;
        const reference: LaunchEvidence = { ...input, id: evidenceId, recordedAt: '2026-09-09T12:05:00.000Z', kind: 'user_recorded_reference' };
        workspace = {
          ...workspace,
          evidence: [reference],
          checks: workspace.checks.map(check => check.id === input.checkId ? { ...check, evidenceIds: [reference.id] } : check),
        };
        return json(workspace, 201);
      }
      if (url === `/api/launch/workspaces/${workspaceId}/evidence/${evidenceId}` && method === 'PATCH') {
        const patch = JSON.parse(String(init?.body)) as Partial<LaunchEvidence>;
        workspace = { ...workspace, evidence: workspace.evidence.map(item => item.id === evidenceId ? { ...item, ...patch } : item) };
        return json(workspace);
      }
      if (url === `/api/launch/workspaces/${workspaceId}/evidence/${evidenceId}` && method === 'DELETE') {
        workspace = {
          ...workspace,
          evidence: [],
          checks: workspace.checks.map(check => ({ ...check, evidenceIds: check.evidenceIds.filter(id => id !== evidenceId) })),
        };
        return json(workspace);
      }
      return json({ error: `Unhandled mocked request: ${method} ${url}` }, 500);
    });

    const [catalog, workspaces] = await Promise.all([getLaunchCatalog(), listLaunchWorkspaces()]);
    expect(catalog).toEqual([checkDefinition]);
    expect(workspaces).toEqual([workspace]);
    expect((await getLaunchGate(workspaceId)).reasons.map(reason => reason.code)).toEqual([
      'INCOMPLETE_CHECK',
      'MISSING_REQUIRED_EVIDENCE',
    ]);

    workspace = await updateLaunchCheck(workspaceId, checkDefinition.id, { completion: 'complete' });
    expect(workspace.checks[0].completion).toBe('complete');
    expect((await getLaunchGate(workspaceId)).reasons.map(reason => reason.code)).toEqual(['MISSING_REQUIRED_EVIDENCE']);

    workspace = await createLaunchEvidence(workspaceId, {
      checkId: checkDefinition.id,
      title: 'Ontario business guidance',
      sourcePublisher: 'Government of Ontario',
      sourceUrl: 'https://www.ontario.ca/page/business-and-economy',
    });
    expect(workspace.evidence[0].title).toBe('Ontario business guidance');
    expect(await getLaunchGate(workspaceId)).toMatchObject({ status: 'CONDITIONAL_GO', reasons: [] });

    workspace = await updateLaunchEvidence(workspaceId, evidenceId, { title: 'Updated Ontario guidance' });
    expect(workspace.evidence[0].title).toBe('Updated Ontario guidance');
    expect(await getLaunchGate(workspaceId)).toMatchObject({ status: 'CONDITIONAL_GO', reasons: [] });

    workspace = (await deleteLaunchEvidence(workspaceId, evidenceId))!;
    expect(workspace.evidence).toEqual([]);
    expect((await getLaunchGate(workspaceId)).reasons.map(reason => reason.code)).toEqual(['MISSING_REQUIRED_EVIDENCE']);

    expect(gateSnapshots).toEqual([
      ['INCOMPLETE_CHECK', 'MISSING_REQUIRED_EVIDENCE'],
      ['MISSING_REQUIRED_EVIDENCE'],
      [],
      [],
      ['MISSING_REQUIRED_EVIDENCE'],
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(11);
  });
});
