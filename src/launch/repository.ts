import { randomUUID } from 'node:crypto';
import type { TransactionSql } from 'postgres';
import { sql } from '../db/index.js';
import { LAUNCH_CATALOG } from './catalog.js';
import type { LaunchCheckState, LaunchEvidence, LaunchWorkspace } from './contracts.js';

export type WorkspaceMetadata = Pick<LaunchWorkspace, 'name' | 'municipality' | 'industry'>;
export type EvidenceMetadata = Pick<LaunchEvidence, 'checkId' | 'title' | 'sourceUrl' | 'sourcePublisher'>;
export type CheckPatch = Partial<Pick<LaunchCheckState, 'applicability' | 'completion' | 'blocker'>>;
export class LaunchNotFound extends Error {}

// All readers and writers lock the workspace to keep the gate's snapshot coherent.
async function lock(tx: TransactionSql, id: string) {
  const [row] = await tx`SELECT * FROM launch_workspaces WHERE id = ${id} FOR UPDATE`;
  if (!row) throw new LaunchNotFound('Workspace not found');
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
async function snapshot(tx: TransactionSql, id: string): Promise<LaunchWorkspace> {
  const row = await lock(tx, id);
  await seed(tx, id);
  const checks = await tx`SELECT * FROM launch_checks WHERE workspace_id = ${id} ORDER BY id`;
  const refs = await tx`SELECT * FROM launch_evidence WHERE workspace_id = ${id} ORDER BY recorded_at, id`;
  const evidence: LaunchEvidence[] = refs.map(ref => ({ id: ref.id, checkId: ref.check_id,
    title: ref.title, sourceUrl: ref.source_url, sourcePublisher: ref.source_publisher,
    recordedAt: iso(ref.recorded_at), kind: ref.kind }));
  return { id: row.id, name: row.name, municipality: row.municipality, industry: row.industry,
    createdAt: iso(row.created_at), updatedAt: iso(row.updated_at), evidence,
    checks: checks.map(check => ({ id: check.id, applicability: check.applicability,
      completion: check.completion, blocker: check.blocker,
      evidenceIds: evidence.filter(ref => ref.checkId === check.id).map(ref => ref.id) })) };
}
async function touch(tx: TransactionSql, id: string) {
  await tx`UPDATE launch_workspaces SET updated_at = NOW() WHERE id = ${id}`;
}

export async function listWorkspaces(): Promise<LaunchWorkspace[]> {
  return sql.begin(async tx => {
    const rows = await tx`SELECT id FROM launch_workspaces ORDER BY created_at, id`;
    const workspaces: LaunchWorkspace[] = [];
    for (const row of rows) workspaces.push(await snapshot(tx, row.id));
    return workspaces;
  });
}
export async function getWorkspace(id: string): Promise<LaunchWorkspace> {
  return sql.begin(tx => snapshot(tx, id));
}
export async function createWorkspace(data: WorkspaceMetadata): Promise<LaunchWorkspace> {
  return sql.begin(async tx => {
    const id = randomUUID();
    await tx`INSERT INTO launch_workspaces (id, name, municipality, industry)
      VALUES (${id}, ${data.name}, ${data.municipality}, ${data.industry})`;
    return snapshot(tx, id);
  });
}
export async function updateWorkspace(id: string, data: Partial<WorkspaceMetadata>): Promise<LaunchWorkspace> {
  return sql.begin(async tx => {
    const current = await lock(tx, id);
    await tx`UPDATE launch_workspaces SET name = ${data.name ?? current.name},
      municipality = ${data.municipality ?? current.municipality}, industry = ${data.industry ?? current.industry},
      updated_at = NOW() WHERE id = ${id}`;
    return snapshot(tx, id);
  });
}
export async function deleteWorkspace(id: string): Promise<void> {
  await sql.begin(async tx => {
    await lock(tx, id);
    await tx`DELETE FROM launch_workspaces WHERE id = ${id}`;
  });
}
export async function updateCheck(id: string, checkId: string, data: CheckPatch): Promise<LaunchWorkspace> {
  return sql.begin(async tx => {
    await lock(tx, id);
    await seed(tx, id);
    const [current] = await tx`SELECT * FROM launch_checks WHERE workspace_id = ${id} AND id = ${checkId}`;
    if (!current) throw new LaunchNotFound('Check not found');
    await tx`UPDATE launch_checks SET applicability = ${data.applicability ?? current.applicability},
      completion = ${data.completion ?? current.completion}, blocker = ${data.blocker ?? current.blocker},
      updated_at = NOW() WHERE workspace_id = ${id} AND id = ${checkId}`;
    await touch(tx, id);
    return snapshot(tx, id);
  });
}
async function requireCheck(tx: TransactionSql, id: string, checkId: string) {
  const [row] = await tx`SELECT * FROM launch_checks WHERE workspace_id = ${id} AND id = ${checkId}`;
  if (!row) throw new LaunchNotFound('Associated check not found');
}
export async function createEvidence(id: string, data: EvidenceMetadata): Promise<LaunchWorkspace> {
  return sql.begin(async tx => {
    await lock(tx, id);
    await seed(tx, id);
    await requireCheck(tx, id, data.checkId);
    await tx`INSERT INTO launch_evidence (id, workspace_id, check_id, title, source_url, source_publisher)
      VALUES (${randomUUID()}, ${id}, ${data.checkId}, ${data.title}, ${data.sourceUrl}, ${data.sourcePublisher})`;
    await touch(tx, id);
    return snapshot(tx, id);
  });
}
export async function updateEvidence(id: string, evidenceId: string, data: Partial<EvidenceMetadata>): Promise<LaunchWorkspace> {
  return sql.begin(async tx => {
    await lock(tx, id);
    const [current] = await tx`SELECT * FROM launch_evidence WHERE workspace_id = ${id} AND id = ${evidenceId}`;
    if (!current) throw new LaunchNotFound('Evidence not found');
    const checkId = data.checkId ?? current.check_id;
    await requireCheck(tx, id, checkId);
    await tx`UPDATE launch_evidence SET check_id = ${checkId}, title = ${data.title ?? current.title},
      source_url = ${data.sourceUrl ?? current.source_url}, source_publisher = ${data.sourcePublisher ?? current.source_publisher},
      updated_at = NOW() WHERE workspace_id = ${id} AND id = ${evidenceId}`;
    await touch(tx, id);
    return snapshot(tx, id);
  });
}
export async function deleteEvidence(id: string, evidenceId: string): Promise<LaunchWorkspace> {
  return sql.begin(async tx => {
    await lock(tx, id);
    const rows = await tx`DELETE FROM launch_evidence WHERE workspace_id = ${id} AND id = ${evidenceId} RETURNING id`;
    if (!rows.length) throw new LaunchNotFound('Evidence not found');
    await touch(tx, id);
    return snapshot(tx, id);
  });
}
