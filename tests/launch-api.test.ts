import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';

// Stateful SQL boundary double: exercise routes, validation, repository mapping,
// reseeding and gate together, without requiring an external database service.
const db = vi.hoisted(() => {
  const workspaces = new Map<string, any>();
  const checks = new Map<string, any>();
  const evidence = new Map<string, any>();
  const statements: string[] = [];
  const query = async (strings: TemplateStringsArray, ...v: any[]) => {
    const q = strings.join('?').replace(/\s+/g, ' ').trim();
    statements.push(q);
    const now = new Date();
    if (q.startsWith('INSERT INTO launch_workspaces')) {
      workspaces.set(v[0], { id: v[0], name: v[1], municipality: v[2], industry: v[3], token_hash: v[4], created_at: now, updated_at: now }); return [];
    }
    if (q.startsWith('SELECT id, token_hash FROM launch_workspaces') || q.startsWith('SELECT id FROM launch_workspaces')) {
      return [...workspaces.values()];
    }
    if (q.startsWith('SELECT * FROM launch_workspaces')) return workspaces.has(v[0]) ? [workspaces.get(v[0])] : [];
    if (q.startsWith('UPDATE launch_workspaces SET name')) {
      Object.assign(workspaces.get(v[3]), { name: v[0], municipality: v[1], industry: v[2], updated_at: now }); return [];
    }
    if (q.startsWith('UPDATE launch_workspaces')) { workspaces.get(v[0]).updated_at = now; return []; }
    if (q.startsWith('DELETE FROM launch_workspaces')) {
      workspaces.delete(v[0]);
      for (const [key, row] of checks) if (row.workspace_id === v[0]) checks.delete(key);
      for (const [key, row] of evidence) if (row.workspace_id === v[0]) evidence.delete(key);
      return [];
    }
    if (q.startsWith('INSERT INTO launch_checks')) {
      const key = `${v[0]}:${v[1]}`;
      if (!checks.has(key)) checks.set(key, { workspace_id: v[0], id: v[1], applicability: v[2], completion: 'incomplete', blocker: 'none' });
      return [];
    }
    if (q.startsWith('SELECT * FROM launch_checks')) return [...checks.values()].filter(r => r.workspace_id === v[0] && (v.length === 1 || r.id === v[1]));
    if (q.startsWith('UPDATE launch_checks')) {
      Object.assign(checks.get(`${v[3]}:${v[4]}`), { applicability: v[0], completion: v[1], blocker: v[2] }); return [];
    }
    if (q.startsWith('INSERT INTO launch_evidence')) {
      evidence.set(v[0], { id: v[0], workspace_id: v[1], check_id: v[2], title: v[3], source_url: v[4], source_publisher: v[5], recorded_at: now, kind: 'user_recorded_reference' }); return [];
    }
    if (q.startsWith('SELECT * FROM launch_evidence')) return [...evidence.values()].filter(r => r.workspace_id === v[0] && (v.length === 1 || r.id === v[1]));
    if (q.startsWith('UPDATE launch_evidence')) {
      Object.assign(evidence.get(v[5]), { check_id: v[0], title: v[1], source_url: v[2], source_publisher: v[3] }); return [];
    }
    if (q.startsWith('DELETE FROM launch_evidence')) {
      const row = evidence.get(v[1]);
      if (!row || row.workspace_id !== v[0]) return [];
      evidence.delete(v[1]); return [{ id: v[1] }];
    }
    throw new Error(`Unexpected SQL: ${q}`);
  };
  return { workspaces, checks, evidence, statements, sql: Object.assign(query, { begin: (fn: any) => fn(query) }) };
});
vi.mock('../src/db/index.js', () => ({ sql: db.sql }));
import { launchRouter } from '../src/server/launch-routes.js';
import { LAUNCH_CATALOG } from '../src/launch/catalog.js';

const missing = '00000000-0000-4000-8000-000000000000';
const metadata = { name: 'Planning workspace', municipality: 'Burlington', industry: 'Software services' };
const reference = { checkId: LAUNCH_CATALOG[0].id, title: 'Public guidance', sourceUrl: 'https://www.ontario.ca/page/business-and-economy', sourcePublisher: 'Government of Ontario' };

async function request(path: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}) {
  // Run the real Express router without binding a sandbox-restricted socket.
  return new Promise<{ status: number; body: any }>((resolve, reject) => {
    let status = 200;
    const reqHeaders: Record<string, string> = { ...headers };
    const req = {
      method,
      url: path,
      originalUrl: path,
      body,
      headers: reqHeaders,
      header: (name: string) => reqHeaders[name.toLowerCase()],
    } as unknown as Request;
    const res = {
      status(value: number) { status = value; return this; },
      json(value: unknown) { resolve({ status, body: value }); return this; },
      end() { resolve({ status, body: null }); return this; },
    } as unknown as Response;
    (launchRouter as unknown as { handle: (req: Request, res: Response, next: (error?: unknown) => void) => void })
      .handle(req, res, error => error ? reject(error) : resolve({ status: 404, body: null }));
  });
}
async function create(token?: string) {
  const headers = token ? { 'x-workspace-token': token } : {};
  return (await request('/workspaces', 'POST', metadata, headers)).body;
}
beforeEach(() => { db.workspaces.clear(); db.checks.clear(); db.evidence.clear(); db.statements.length = 0; });

describe('launch API and persistence boundary', () => {
  it('creates, lists, reads, updates and deletes metadata with server IDs and timestamps', async () => {
    const created = await request('/workspaces', 'POST', metadata);
    expect(created.status).toBe(201);
    const workspace = created.body;
    expect(workspace.token).toBeDefined();
    const token = workspace.token;
    expect(workspace.checks).toHaveLength(LAUNCH_CATALOG.length);
    expect(Number.isNaN(Date.parse(workspace.createdAt))).toBe(false);
    expect((await request('/workspaces', 'GET', undefined, { 'x-workspace-token': token })).body.data).toHaveLength(1);
    expect((await request(`/workspaces/${workspace.id}`, 'GET', undefined, { 'x-workspace-token': token })).body.id).toBe(workspace.id);
    expect((await request(`/workspaces/${workspace.id}`, 'PATCH', { name: "A'; DROP TABLE launch_workspaces; --" }, { 'x-workspace-token': token })).body.name).toContain('DROP TABLE');
    expect(db.statements.every(q => !q.includes('DROP TABLE'))).toBe(true);
    expect((await request(`/workspaces/${workspace.id}`, 'DELETE', undefined, { 'x-workspace-token': token })).status).toBe(204);
    expect((await request(`/workspaces/${workspace.id}`, 'GET', undefined, { 'x-workspace-token': token })).status).toBe(404);
    expect(db.checks.size).toBe(0);
  });

  it('rejects cross-tenant workspace access attempts with HTTP 403 Forbidden', async () => {
    const workspace = await create();
    const authorizedToken = workspace.token;
    const path = `/workspaces/${workspace.id}`;

    // Missing token on protected workspace
    expect((await request(path, 'GET')).status).toBe(403);
    expect((await request(path, 'PATCH', { name: 'Compromised' })).status).toBe(403);
    expect((await request(path, 'DELETE')).status).toBe(403);

    // Invalid / wrong token
    expect((await request(path, 'GET', undefined, { 'x-workspace-token': 'wrong_token' })).status).toBe(403);
    expect((await request(path, 'PATCH', { name: 'Compromised' }, { 'x-workspace-token': 'wrong_token' })).status).toBe(403);

    // Authorized token succeeds
    expect((await request(path, 'GET', undefined, { 'x-workspace-token': authorizedToken })).status).toBe(200);
  });

  it('preserves edited statuses across catalog seeding and derives the gate from saved state', async () => {
    const workspace = await create();
    const token = workspace.token;
    const headers = { 'x-workspace-token': token };
    const path = `/workspaces/${workspace.id}`;
    expect((await request(`${path}/gate`, 'GET', undefined, headers)).body.status).toBe('VERIFY');
    for (const check of workspace.checks) await request(`${path}/checks/${check.id}`, 'PATCH', { applicability: 'not_applicable' }, headers);
    await request(`${path}/checks/${reference.checkId}`, 'PATCH', { applicability: 'applicable', completion: 'complete', blocker: 'unresolved' }, headers);
    expect((await request(`${path}/gate`, 'GET', undefined, headers)).body.status).toBe('NO_GO');
    expect((await request(path, 'GET', undefined, headers)).body.checks.find((c: any) => c.id === reference.checkId).completion).toBe('complete');
    await request(`${path}/checks/${reference.checkId}`, 'PATCH', { blocker: 'resolved' }, headers);
    expect((await request(`${path}/gate`, 'GET', undefined, headers)).body.status).toBe('VERIFY');
    const withRef = await request(`${path}/evidence`, 'POST', reference, headers);
    expect(withRef.status).toBe(201);
    const ref = withRef.body.evidence[0];
    expect(ref.kind).toBe('user_recorded_reference');
    expect(withRef.body.checks.find((c: any) => c.id === reference.checkId).evidenceIds).toEqual([ref.id]);
    expect((await request(`${path}/gate`, 'GET', undefined, headers)).body.status).toBe('CONDITIONAL_GO');
    const edited = await request(`${path}/evidence/${ref.id}`, 'PATCH', { title: 'Updated reference' }, headers);
    expect(edited.body.evidence[0].title).toBe('Updated reference');
    expect(edited.body.evidence[0].recordedAt).toBe(ref.recordedAt);
    expect((await request(`${path}/evidence/${ref.id}`, 'DELETE', undefined, headers)).body.evidence).toEqual([]);
    expect((await request(`${path}/gate`, 'GET', undefined, headers)).body.reasons.some((r: any) => r.code === 'MISSING_REQUIRED_EVIDENCE')).toBe(true);
    expect(db.statements.filter(q => q.startsWith('INSERT INTO launch_checks')).every(q => q.endsWith('ON CONFLICT (workspace_id, id) DO NOTHING'))).toBe(true);
  });
  it.each([null, [], {}, { ...metadata, money: 100 }, { ...metadata, name: 'x'.repeat(121) }, { ...metadata, industry: '' }, { ...metadata, createdAt: '2026-01-01' }])('rejects malformed or unknown workspace metadata: %j', async payload => {
    expect((await request('/workspaces', 'POST', payload)).status).toBe(400);
  });
  it.each(['javascript:alert(1)', 'file:///tmp/file', 'data:text/plain,test', 'ftp://example.com', 'https://user:pass@example.com', 'https://example.com/a b'])('rejects unsafe source URL %s', async sourceUrl => {
    const workspace = await create();
    const headers = { 'x-workspace-token': workspace.token };
    expect((await request(`/workspaces/${workspace.id}/evidence`, 'POST', { ...reference, sourceUrl }, headers)).status).toBe(400);
  });
  it('rejects IDs, enum values, unknown fields and missing/cross-workspace associations', async () => {
    const workspace = await create();
    const token = workspace.token;
    const headers = { 'x-workspace-token': token };
    const path = `/workspaces/${workspace.id}`;
    expect((await request('/workspaces/not-an-id')).status).toBe(400);
    expect((await request(`/workspaces/${missing}`, 'GET', undefined, headers)).status).toBe(404);
    expect((await request(`${path}/checks/does.not.exist`, 'PATCH', { completion: 'complete' }, headers)).status).toBe(404);
    expect((await request(`${path}/checks/${reference.checkId}`, 'PATCH', { completion: 'approved' }, headers)).status).toBe(400);
    expect((await request(`${path}/checks/${reference.checkId}`, 'PATCH', { evidenceIds: [missing] }, headers)).status).toBe(400);
    expect((await request(`${path}/evidence`, 'POST', { ...reference, checkId: 'does.not.exist' }, headers)).status).toBe(404);
    expect((await request(`${path}/evidence`, 'POST', { ...reference, recordedAt: '2026-01-01' }, headers)).status).toBe(400);
    expect((await request(`${path}/evidence/${missing}`, 'PATCH', { title: 'Missing' }, headers)).status).toBe(404);
    const evidence = (await request(`${path}/evidence`, 'POST', reference, headers)).body.evidence[0];
    const other = await create();
    const otherHeaders = { 'x-workspace-token': other.token };
    expect((await request(`/workspaces/${other.id}/evidence/${evidence.id}`, 'DELETE', undefined, otherHeaders)).status).toBe(404);
    expect((await request(`${path}/evidence/${evidence.id}`, 'PATCH', { checkId: 'does.not.exist' }, headers)).status).toBe(404);
    expect((await request(`${path}/evidence/${evidence.id}`, 'PATCH', {}, headers)).status).toBe(400);
  });
});
