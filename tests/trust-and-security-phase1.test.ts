import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import type { Server } from 'http';
import { sql } from '../src/db/index.js';
import { app } from '../src/server/app.js';
import { syncCreaDdfListings } from '../src/ingestion/adapters/crea-ddf.js';
import { createWorkspace, ensureWorkspaceAccess, verifyWorkspaceMembership } from '../src/server/workspace-auth.js';
import { backfillLegacyLaunchWorkspaceTokens } from '../src/launch/repository.js';

describe('Phase 1 — Establish Trust, Honest Ingestion Status & Close Security Gaps', () => {
  let server: Server;
  let port: number;
  let baseUrl: string;

  beforeAll(async () => {
    server = app.listen(0);
    port = (server.address() as any).port;
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    server.close();
  });

  describe('1. CREA DDF Boundary & Zero False-Success Invariant', () => {
    it('returns UNCONFIGURED and does not report refresh when credentials are missing', async () => {
      const result = await syncCreaDdfListings({ apiKey: undefined, clientId: undefined });
      expect(result.status).toBe('UNCONFIGURED');
      expect(result.configured).toBe(false);
      expect(result.connected).toBe(false);
      expect(result.retrieved).toBe(false);
      expect(result.validated).toBe(false);
      expect(result.ingested).toBe(false);
      expect(result.listingsProcessed).toBe(0);
      expect(result.message).toContain('not configured');
    });

    it('returns VALIDATION_FAILED and reports HTTP failure when credentials are rejected', async () => {
      const mockFetch = (async () => {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          statusText: 'Unauthorized',
          headers: { 'Content-Type': 'application/json' }
        });
      }) as unknown as typeof fetch;

      const result = await syncCreaDdfListings(
        { apiKey: 'bad_key', clientId: 'bad_client', endpointUrl: 'https://api.crea.ca/ddf/v1' },
        mockFetch
      );

      expect(result.status).toBe('VALIDATION_FAILED');
      expect(result.configured).toBe(true);
      expect(result.connected).toBe(true);
      expect(result.retrieved).toBe(false);
      expect(result.validated).toBe(false);
      expect(result.ingested).toBe(false);
      expect(result.httpStatus).toBe(401);
      expect(result.failureReason).toContain('401');
      expect(result.message).toContain('Listings were NOT refreshed');
    });

    it('returns VALIDATION_FAILED when payload does not match expected listings schema', async () => {
      const mockFetch = (async () => {
        return new Response(JSON.stringify({ unexpected: 'malformed_payload' }), {
          status: 200,
          statusText: 'OK',
          headers: { 'Content-Type': 'application/json' }
        });
      }) as unknown as typeof fetch;

      const result = await syncCreaDdfListings(
        { apiKey: 'test_key', clientId: 'test_client', endpointUrl: 'https://api.crea.ca/ddf/v1' },
        mockFetch
      );

      expect(result.status).toBe('VALIDATION_FAILED');
      expect(result.configured).toBe(true);
      expect(result.connected).toBe(true);
      expect(result.retrieved).toBe(true);
      expect(result.validated).toBe(false);
      expect(result.message).toContain('Listings were NOT refreshed');
    });

    it('returns INGESTION_COMPLETED only when HTTP succeeds and listings schema is valid', async () => {
      const mockFetch = (async () => {
        return new Response(JSON.stringify({
          value: [
            { ListingKey: 'MLS_001', ListPrice: 450000, City: 'Burlington' },
            { ListingKey: 'MLS_002', ListPrice: 320000, City: 'Oakville' }
          ]
        }), {
          status: 200,
          statusText: 'OK',
          headers: { 'Content-Type': 'application/json' }
        });
      }) as unknown as typeof fetch;

      const result = await syncCreaDdfListings(
        { apiKey: 'valid_key', clientId: 'valid_client', endpointUrl: 'https://api.crea.ca/ddf/v1' },
        mockFetch
      );

      expect(result.status).toBe('INGESTION_COMPLETED');
      expect(result.configured).toBe(true);
      expect(result.connected).toBe(true);
      expect(result.retrieved).toBe(true);
      expect(result.validated).toBe(true);
      expect(result.ingested).toBe(true);
      expect(result.listingsProcessed).toBe(2);
      expect(result.lastVerifiedAt).toBeDefined();
    });
  });

  describe('2. Authentication, Token Purpose Separation & Atomic Exchange', () => {
    const testUserId = '44444444-4444-4444-8444-444444444444';
    const testEmail = 'phase1.trust.test@example.com';

    beforeAll(async () => {
      await sql`DELETE FROM auth_tokens WHERE user_id = ${testUserId};`;
      await sql`DELETE FROM users WHERE id = ${testUserId} OR email = ${testEmail};`;
      await sql`INSERT INTO users (id, email) VALUES (${testUserId}, ${testEmail});`;
    });

    afterAll(async () => {
      await sql`DELETE FROM auth_tokens WHERE user_id = ${testUserId};`;
      await sql`DELETE FROM users WHERE id = ${testUserId};`;
    });

    it('POST /api/auth/login issues token with explicit MAGIC_LINK token_type', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail })
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      const [tokenRow] = await sql<{ token_type: string; used: boolean }[]>`
        SELECT token_type, used FROM auth_tokens WHERE user_id = ${testUserId} ORDER BY created_at DESC LIMIT 1;
      `;
      expect(tokenRow.token_type).toBe('MAGIC_LINK');
      expect(tokenRow.used).toBe(false);
    });

    it('rejects using a MAGIC_LINK token directly as a Bearer session token in requireAuth', async () => {
      const rawMagicToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await sql`
        INSERT INTO auth_tokens (token, user_id, expires_at, used, token_type)
        VALUES (${rawMagicToken}, ${testUserId}, ${expiresAt}, FALSE, 'MAGIC_LINK');
      `;

      // Attempt to access protected endpoint directly with magic link token
      const res = await fetch(`${baseUrl}/api/user/dossiers`, {
        headers: { Authorization: `Bearer ${rawMagicToken}` }
      });

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('magic-link tokens cannot be used as session bearer tokens');
    });

    it('atomically exchanges magic-link token for session token and prevents concurrent double-redemption', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await sql`
        INSERT INTO auth_tokens (token, user_id, expires_at, used, token_type)
        VALUES (${token}, ${testUserId}, ${expiresAt}, FALSE, 'MAGIC_LINK');
      `;

      // Run two verify requests concurrently
      const [res1, res2] = await Promise.all([
        fetch(`${baseUrl}/api/auth/verify?token=${token}`),
        fetch(`${baseUrl}/api/auth/verify?token=${token}`)
      ]);

      const results = [
        { status: res1.status, json: await res1.json() },
        { status: res2.status, json: await res2.json() }
      ];

      const successCount = results.filter(r => r.status === 200 && r.json.success).length;
      const failCount = results.filter(r => r.status === 401 && !r.json.success).length;

      // Exactly ONE request must succeed; the other must fail due to atomic CAS
      expect(successCount).toBe(1);
      expect(failCount).toBe(1);

      const successful = results.find(r => r.status === 200)!;
      expect(successful.json.sessionToken).toBeDefined();

      // Check session token in database has token_type = 'SESSION'
      const [sessionRec] = await sql<{ token_type: string; used: boolean }[]>`
        SELECT token_type, used FROM auth_tokens WHERE token = ${successful.json.sessionToken};
      `;
      expect(sessionRec.token_type).toBe('SESSION');
      expect(sessionRec.used).toBe(false);
    });

    it('revokes session token on POST /api/auth/logout and denies subsequent access', async () => {
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 3600 * 1000);

      await sql`
        INSERT INTO auth_tokens (token, user_id, expires_at, used, token_type)
        VALUES (${sessionToken}, ${testUserId}, ${expiresAt}, FALSE, 'SESSION');
      `;

      // 1. Session is initially active
      const beforeRes = await fetch(`${baseUrl}/api/user/dossiers`, {
        headers: { Authorization: `Bearer ${sessionToken}` }
      });
      expect(beforeRes.status).toBe(200);

      // 2. Logout revokes token
      const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` }
      });
      expect(logoutRes.status).toBe(200);

      // 3. Subsequent request with revoked token is denied
      const afterRes = await fetch(`${baseUrl}/api/user/dossiers`, {
        headers: { Authorization: `Bearer ${sessionToken}` }
      });
      expect(afterRes.status).toBe(401);
      const json = await afterRes.json();
      expect(json.error).toContain('revoked');
    });
  });

  describe('3. Launch Workspaces & Legacy Private Records Isolation', () => {
    it('unauthenticated GET /api/launch/workspaces fails closed and returns empty list', async () => {
      const res = await fetch(`${baseUrl}/api/launch/workspaces`);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toEqual([]);
    });

    it('rejects unauthenticated access or foreign tokens on protected launch workspace with 403', async () => {
      // Create isolated workspace with known token
      const createRes = await fetch(`${baseUrl}/api/launch/workspaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Private Security Workspace',
          municipality: 'Burlington',
          industry: 'Commercial Retail'
        })
      });
      expect(createRes.status).toBe(201);
      const created = await createRes.json();
      const wsId = created.id;
      const validToken = created.token;

      // Access with no token fails with 403
      const noTokenRes = await fetch(`${baseUrl}/api/launch/workspaces/${wsId}`);
      expect(noTokenRes.status).toBe(403);

      // Access with foreign token fails with 403
      const foreignRes = await fetch(`${baseUrl}/api/launch/workspaces/${wsId}`, {
        headers: { 'x-workspace-token': 'ws_foreign_attacker_token_12345' }
      });
      expect(foreignRes.status).toBe(403);

      // Access with valid token succeeds
      const validRes = await fetch(`${baseUrl}/api/launch/workspaces/${wsId}`, {
        headers: { 'x-workspace-token': validToken }
      });
      expect(validRes.status).toBe(200);

      // Clean up
      await fetch(`${baseUrl}/api/launch/workspaces/${wsId}`, {
        method: 'DELETE',
        headers: { 'x-workspace-token': validToken }
      });
    });

    it('backfillLegacyLaunchWorkspaceTokens migrates un-tokened legacy rows so they fail closed', async () => {
      const legacyId = crypto.randomUUID();
      await sql`
        INSERT INTO launch_workspaces (id, name, municipality, industry, token_hash)
        VALUES (${legacyId}, 'Legacy Unprotected', 'Burlington', 'Food Service', NULL);
      `;

      // Backfill assigns secure cryptographic token hashes
      const count = await backfillLegacyLaunchWorkspaceTokens();
      expect(count).toBeGreaterThanOrEqual(1);

      const [migrated] = await sql<{ token_hash: string | null }[]>`
        SELECT token_hash FROM launch_workspaces WHERE id = ${legacyId};
      `;
      expect(migrated.token_hash).not.toBeNull();

      // Clean up
      await sql`DELETE FROM launch_workspaces WHERE id = ${legacyId};`;
    });
  });

  describe('4. Workspace Authorization & Takeover Prevention', () => {
    it('prevents attacker from creating ownership over an existing workspace', async () => {
      const ownerId = crypto.randomUUID();
      const attackerId = crypto.randomUUID();
      const wsId = `ws_vault_${crypto.randomBytes(6).toString('hex')}`;

      await sql`INSERT INTO users (id, email) VALUES (${ownerId}, ${'owner_' + ownerId + '@corp.com'}) ON CONFLICT (id) DO NOTHING;`;
      await sql`INSERT INTO users (id, email) VALUES (${attackerId}, ${'attacker_' + attackerId + '@dark.com'}) ON CONFLICT (id) DO NOTHING;`;
      await sql`DELETE FROM workspace_memberships WHERE workspace_id = ${wsId};`;

      // 1. Legit owner creates workspace
      const ownerAccess = await createWorkspace(ownerId, wsId);
      expect(ownerAccess.allowed).toBe(true);

      // 2. Attacker attempts to create or take over same workspace
      const attackerAccess = await createWorkspace(attackerId, wsId);
      expect(attackerAccess.allowed).toBe(false);
      expect(attackerAccess.reason).toContain('already registered to another tenant');

      // 3. Ensure attacker cannot access via ensureWorkspaceAccess
      const accessCheck = await ensureWorkspaceAccess(attackerId, wsId);
      expect(accessCheck.allowed).toBe(false);
      expect(accessCheck.reason).toContain('Access denied');

      // Clean up
      await sql`DELETE FROM workspace_memberships WHERE workspace_id = ${wsId};`;
      await sql`DELETE FROM users WHERE id IN (${ownerId}, ${attackerId});`;
    });
  });
});
