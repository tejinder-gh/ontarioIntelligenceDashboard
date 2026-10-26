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
 * 2. If workspace has other members and user is not one of them -> Denied (403).
 * 3. If workspace is brand new (no existing members) -> Grants OWNER role to caller.
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

  // 2. Multi-tenant boundary check: check if workspace belongs to another tenant
  const [existingTenant] = await sql<{ user_id: string }[]>`
    SELECT user_id 
    FROM workspace_memberships 
    WHERE workspace_id = ${workspaceId} 
    LIMIT 1;
  `;

  if (existingTenant) {
    return {
      allowed: false,
      reason: `Access denied: User is not authorized to access isolated workspace '${workspaceId}'`
    };
  }

  // 3. New workspace provisioned: register initial caller as OWNER
  await sql`
    INSERT INTO workspace_memberships (workspace_id, user_id, role)
    VALUES (${workspaceId}, ${userId}, 'OWNER')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
  `;

  return { allowed: true };
}
