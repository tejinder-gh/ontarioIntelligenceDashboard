import { sql } from '../db/index.js';

export interface WorkspaceAccessResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Checks if a user has an explicit membership record in workspace_memberships
 */
export async function verifyWorkspaceMembership(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const [membership] = await sql<{ workspace_id: string; user_id: string }[]>`
    SELECT workspace_id, user_id 
    FROM workspace_memberships 
    WHERE user_id = ${userId} AND workspace_id = ${workspaceId}
    LIMIT 1;
  `;
  return Boolean(membership);
}

/**
 * Validates workspace access and prevents multi-tenant crossover:
 * 1. If user is an existing member -> Allowed.
 * 2. If workspace is personal workspace (ws_${userId}) -> Auto-provisions and allows.
 * 3. Any other arbitrary workspaceId where user is not an existing member -> Denied (403, fail closed).
 */
export async function ensureWorkspaceAccess(
  userId: string,
  workspaceId: string
): Promise<WorkspaceAccessResult> {
  // 1. Existing membership check
  const isMember = await verifyWorkspaceMembership(userId, workspaceId);
  if (isMember) {
    return { allowed: true };
  }

  // 2. Personal default workspace: permit automatic initialization for the user's own workspace
  if (workspaceId === `ws_${userId}` || workspaceId === `workspace_${userId}`) {
    await sql`
      INSERT INTO workspace_memberships (workspace_id, user_id, role)
      VALUES (${workspaceId}, ${userId}, 'OWNER')
      ON CONFLICT (workspace_id, user_id) DO NOTHING;
    `;
    return { allowed: true };
  }

  // 3. Fail closed: reject arbitrary foreign/unassigned workspace IDs
  return {
    allowed: false,
    reason: `Access denied: User does not have authorized membership in workspace '${workspaceId}'`
  };
}

/**
 * Explicitly provisions a new workspace for a user under unique constraint
 */
export async function createWorkspace(
  userId: string,
  workspaceId: string
): Promise<WorkspaceAccessResult> {
  const [existingTenant] = await sql<{ user_id: string }[]>`
    SELECT user_id FROM workspace_memberships WHERE workspace_id = ${workspaceId} LIMIT 1;
  `;
  if (existingTenant) {
    if (existingTenant.user_id === userId) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `Access denied: Workspace '${workspaceId}' is already registered to another tenant.`
    };
  }

  await sql`
    INSERT INTO workspace_memberships (workspace_id, user_id, role)
    VALUES (${workspaceId}, ${userId}, 'OWNER')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
  `;
  return { allowed: true };
}

/**
 * Backfills legacy runs so historic workspace owners retain legitimate access
 */
export async function backfillLegacyWorkspaceMemberships(): Promise<number> {
  try {
    const result = await sql`
      INSERT INTO workspace_memberships (workspace_id, user_id, role)
      SELECT DISTINCT r.workspace_id, r.user_id, 'OWNER'
      FROM decision_engine_runs r
      JOIN users u ON u.id = r.user_id
      WHERE r.workspace_id IS NOT NULL AND r.user_id IS NOT NULL
      ON CONFLICT (workspace_id, user_id) DO NOTHING;
    `;
    return result.count ?? 0;
  } catch (err) {
    console.warn('[Workspace Auth] Backfill legacy memberships notice:', err);
    return 0;
  }
}
