import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import type { Server } from 'http';
import { sql } from '../src/db/index.js';
import { app } from '../src/server/app.js';
import { verifyWorkspaceMembership } from '../src/server/workspace-auth.js';

describe('Decision Engine Adversarial HTTP Authorization & Workspace Isolation', () => {
  let server: Server;
  let port: number;

  beforeAll(async () => {
    server = app.listen(0);
    port = (server.address() as any).port;
  });

  afterAll(async () => {
    server.close();
  });

  it('rejects unauthenticated POST /api/engine/analyze with 401', async () => {
    const res = await fetch(`http://localhost:${port}/api/engine/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inquiry: 'Open pizza store in Burlington' })
    });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('rejects authenticated caller attempting to take over arbitrary foreign workspace with 403', async () => {
    const legitUserId = '33333333-3333-4333-8333-333333333333';
    const foreignWsId = 'ws_foreign_corporate_vault';
    const legitToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600 * 1000);

    await sql`INSERT INTO users (id, email) VALUES (${legitUserId}, 'user.legit@example.com') ON CONFLICT (id) DO NOTHING;`;
    await sql`
      INSERT INTO auth_tokens (token, user_id, expires_at, used)
      VALUES (${legitToken}, ${legitUserId}, ${expiresAt}, FALSE)
      ON CONFLICT (token) DO NOTHING;
    `;
    await sql`DELETE FROM workspace_memberships WHERE workspace_id = ${foreignWsId};`;

    // Legitimate user attempts to specify a foreign/unassigned workspace
    const res = await fetch(`http://localhost:${port}/api/engine/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${legitToken}`
      },
      body: JSON.stringify({
        inquiry: 'Open a pizza store in Burlington',
        workspaceId: foreignWsId
      })
    });

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain('Access denied');

    // Assert fail-closed: no membership row was created for foreignWsId
    const isMember = await verifyWorkspaceMembership(legitUserId, foreignWsId);
    expect(isMember).toBe(false);
  });

  it('GET /api/engine/runs is strictly read-only and never mutates workspace_memberships', async () => {
    const callerUserId = '44444444-4444-4444-8444-444444444444';
    const unassignedWsId = 'ws_unassigned_read_attempt';
    const callerToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600 * 1000);

    await sql`INSERT INTO users (id, email) VALUES (${callerUserId}, 'caller.reader@example.com') ON CONFLICT (id) DO NOTHING;`;
    await sql`
      INSERT INTO auth_tokens (token, user_id, expires_at, used)
      VALUES (${callerToken}, ${callerUserId}, ${expiresAt}, FALSE)
      ON CONFLICT (token) DO NOTHING;
    `;
    await sql`DELETE FROM workspace_memberships WHERE workspace_id = ${unassignedWsId};`;

    const initialRows = await sql`SELECT COUNT(*)::int as count FROM workspace_memberships WHERE workspace_id = ${unassignedWsId};`;
    expect(initialRows[0]?.count).toBe(0);

    const res = await fetch(`http://localhost:${port}/api/engine/runs?workspaceId=${unassignedWsId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${callerToken}` }
    });

    expect(res.status).toBe(403);

    const finalRows = await sql`SELECT COUNT(*)::int as count FROM workspace_memberships WHERE workspace_id = ${unassignedWsId};`;
    expect(finalRows[0]?.count).toBe(0);
  });
});
