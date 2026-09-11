import { randomUUID, randomBytes, createHash } from 'node:crypto';
import type { TransactionSql } from 'postgres';
import { sql } from '../db/index.js';
import { LAUNCH_CATALOG } from './catalog.js';
import type { LaunchCheckState, LaunchEvidence, LaunchWorkspace } from './contracts.js';

export type WorkspaceMetadata = Pick<LaunchWorkspace, 'name' | 'municipality' | 'industry'>;
export type EvidenceMetadata = Pick<LaunchEvidence, 'checkId' | 'title' | 'sourceUrl' | 'sourcePublisher'>;
export type CheckPatch = Partial<Pick<LaunchCheckState, 'applicability' | 'completion' | 'blocker'>>;
export class LaunchNotFound extends Error {}
export class LaunchForbidden extends Error {}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// All readers and writers lock the workspace to keep the gate's snapshot coherent.
async function lock(tx: TransactionSql, id: string, token?: string | null) {
  const [row] = await tx`SELECT * FROM launch_workspaces WHERE id = ${id} FOR UPDATE`;
  if (!row) throw new LaunchNotFound('Workspace not found');
  if (row.token_hash) {
    if (!token) throw new LaunchForbidden('Workspace authorization token required');
    const hash = hashToken(token);
    if (hash !== row.token_hash) throw new LaunchForbidden('Unauthorized workspace access');
  }
  return row;
}

async function seed(tx: TransactionSql, id: string) {
  for (const check of LAUNCH_CATALOG) {
    await tx`INSERT INTO launch_checks (workspace_id, id, applicability)
      VALUES (${id}, ${check.id}, ${check.defaultApplicability})
      ON CONFLICT (workspace_id, id) DO NOTHING`;
  }
}

const iso = (value: Date | string) => new Date(value).toISOString();

async function snapshot(tx: TransactionSql, id: string, token?: string | null): Promise<LaunchWorkspace> {
  const row = await lock(tx, id, token);
  await seed(tx, id);
  const checks = await tx`SELECT * FROM launch_checks WHERE workspace_id = ${id} ORDER BY id`;
  const refs = await tx`SELECT * FROM launch_evidence WHERE workspace_id = ${id} ORDER BY recorded_at, id`;
  const evidence: LaunchEvidence[] = refs.map(ref => ({ id: ref.id, checkId: ref.check_id,
    title: ref.title, sourceUrl: ref.source_url, sourcePublisher: ref.source_publisher,
    recordedAt: iso(ref.recorded_at), kind: ref.kind }));
  return { id: row.id, name: row.name, municipality: row.municipality, industry: row.industry,
    token: token || undefined,
    createdAt: iso(row.created_at), updatedAt: iso(row.updated_at), evidence,
    checks: checks.map(check => ({ id: check.id, applicability: check.applicability,
      completion: check.completion, blocker: check.blocker,
      evidenceIds: evidence.filter(ref => ref.checkId === check.id).map(ref => ref.id) })) };
}

async function touch(tx: TransactionSql, id: string) {
  await tx`UPDATE launch_workspaces SET updated_at = NOW() WHERE id = ${id}`;
}

export async function listWorkspaces(tokens?: string[]): Promise<LaunchWorkspace[]> {
  return sql.begin(async tx => {
    const validTokens = (tokens || []).filter(Boolean);
    let rows: any[] = [];
    if (validTokens.length === 0) {
      rows = await tx`SELECT id, token_hash FROM launch_workspaces WHERE token_hash IS NULL ORDER BY created_at, id`;
    } else {
      const hashes = validTokens.map(hashToken);
      rows = await tx`SELECT id, token_hash FROM launch_workspaces WHERE token_hash = ANY(${hashes}) OR token_hash IS NULL ORDER BY created_at, id`;
    }
    const workspaces: LaunchWorkspace[] = [];
    for (const row of rows) {
      const matchingToken = validTokens.find(t => hashToken(t) === row.token_hash);
      workspaces.push(await snapshot(tx, row.id, matchingToken));
    }
    return workspaces;
  });
}

export async function getWorkspace(id: string, token?: string | null): Promise<LaunchWorkspace> {
  return sql.begin(tx => snapshot(tx, id, token));
}

export async function createWorkspace(data: WorkspaceMetadata, token?: string): Promise<LaunchWorkspace> {
  return sql.begin(async tx => {
    const id = randomUUID();
    const resolvedToken = token || `ws_${randomBytes(18).toString('hex')}`;
    const tokenHash = hashToken(resolvedToken);
    await tx`INSERT INTO launch_workspaces (id, name, municipality, industry, token_hash)
      VALUES (${id}, ${data.name}, ${data.municipality}, ${data.industry}, ${tokenHash})`;
    const ws = await snapshot(tx, id, resolvedToken);
    return { ...ws, token: resolvedToken };
  });
}

export async function updateWorkspace(id: string, data: Partial<WorkspaceMetadata>, token?: string | null): Promise<LaunchWorkspace> {
  return sql.begin(async tx => {
    const current = await lock(tx, id, token);
    await tx`UPDATE launch_workspaces SET name = ${data.name ?? current.name},
      municipality = ${data.municipality ?? current.municipality}, industry = ${data.industry ?? current.industry},
      updated_at = NOW() WHERE id = ${id}`;
    return snapshot(tx, id, token);
  });
}

export async function deleteWorkspace(id: string, token?: string | null): Promise<void> {
  await sql.begin(async tx => {
    await lock(tx, id, token);
    await tx`DELETE FROM launch_workspaces WHERE id = ${id}`;
  });
}

export async function updateCheck(id: string, checkId: string, data: CheckPatch, token?: string | null): Promise<LaunchWorkspace> {
  return sql.begin(async tx => {
    await lock(tx, id, token);
    await seed(tx, id);
    const [current] = await tx`SELECT * FROM launch_checks WHERE workspace_id = ${id} AND id = ${checkId}`;
    if (!current) throw new LaunchNotFound('Check not found');
    await tx`UPDATE launch_checks SET applicability = ${data.applicability ?? current.applicability},
      completion = ${data.completion ?? current.completion}, blocker = ${data.blocker ?? current.blocker},
      updated_at = NOW() WHERE workspace_id = ${id} AND id = ${checkId}`;
    await touch(tx, id);
    return snapshot(tx, id, token);
  });
}

async function requireCheck(tx: TransactionSql, id: string, checkId: string) {
  const [row] = await tx`SELECT * FROM launch_checks WHERE workspace_id = ${id} AND id = ${checkId}`;
  if (!row) throw new LaunchNotFound('Associated check not found');
}

export async function createEvidence(id: string, data: EvidenceMetadata, token?: string | null): Promise<LaunchWorkspace> {
  return sql.begin(async tx => {
    await lock(tx, id, token);
    await seed(tx, id);
    await requireCheck(tx, id, data.checkId);
    await tx`INSERT INTO launch_evidence (id, workspace_id, check_id, title, source_url, source_publisher)
      VALUES (${randomUUID()}, ${id}, ${data.checkId}, ${data.title}, ${data.sourceUrl}, ${data.sourcePublisher})`;
    await touch(tx, id);
    return snapshot(tx, id, token);
  });
}

export async function updateEvidence(id: string, evidenceId: string, data: Partial<EvidenceMetadata>, token?: string | null): Promise<LaunchWorkspace> {
  return sql.begin(async tx => {
    await lock(tx, id, token);
    const [current] = await tx`SELECT * FROM launch_evidence WHERE workspace_id = ${id} AND id = ${evidenceId}`;
    if (!current) throw new LaunchNotFound('Evidence not found');
    const checkId = data.checkId ?? current.check_id;
    await requireCheck(tx, id, checkId);
    await tx`UPDATE launch_evidence SET check_id = ${checkId}, title = ${data.title ?? current.title},
      source_url = ${data.sourceUrl ?? current.source_url}, source_publisher = ${data.sourcePublisher ?? current.source_publisher},
      updated_at = NOW() WHERE workspace_id = ${id} AND id = ${evidenceId}`;
    await touch(tx, id);
    return snapshot(tx, id, token);
  });
}

export async function deleteEvidence(id: string, evidenceId: string, token?: string | null): Promise<LaunchWorkspace> {
  return sql.begin(async tx => {
    await lock(tx, id, token);
    const rows = await tx`DELETE FROM launch_evidence WHERE workspace_id = ${id} AND id = ${evidenceId} RETURNING id`;
    if (!rows.length) throw new LaunchNotFound('Evidence not found');
    await touch(tx, id);
    return snapshot(tx, id, token);
  });
}
