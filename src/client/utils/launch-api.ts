import type {
  LaunchCatalogCheck,
  LaunchCheckState,
  LaunchDecision,
  LaunchEvidence,
  LaunchWorkspace,
} from '../../launch/contracts.js';

export interface CreateLaunchWorkspaceInput {
  name: string;
  municipality: string;
  industry: string;
}

export interface UpdateLaunchCheckInput {
  applicability?: LaunchCheckState['applicability'];
  completion?: LaunchCheckState['completion'];
  blocker?: LaunchCheckState['blocker'];
}

export interface LaunchEvidenceInput {
  checkId: string;
  title: string;
  sourceUrl: string;
  sourcePublisher: string;
}

export interface UpdateLaunchEvidenceInput {
  title?: string;
  sourceUrl?: string;
  sourcePublisher?: string;
}

const unwrapData = <T>(body: unknown): T => {
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as { data: T }).data;
  }
  return body as T;
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  if (response.status === 204) return undefined as T;

  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const message = body && typeof body === 'object' && 'error' in body
      ? String((body as { error: unknown }).error)
      : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return unwrapData<T>(body);
};

const workspacePath = (workspaceId: string): string =>
  `/api/launch/workspaces/${encodeURIComponent(workspaceId)}`;

export const listLaunchWorkspaces = (): Promise<LaunchWorkspace[]> =>
  request<LaunchWorkspace[]>('/api/launch/workspaces');

export const createLaunchWorkspace = (
  input: CreateLaunchWorkspaceInput,
): Promise<LaunchWorkspace> =>
  request<LaunchWorkspace>('/api/launch/workspaces', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const getLaunchWorkspace = (workspaceId: string): Promise<LaunchWorkspace> =>
  request<LaunchWorkspace>(workspacePath(workspaceId));

export const getLaunchCatalog = (): Promise<LaunchCatalogCheck[]> =>
  request<LaunchCatalogCheck[]>('/api/launch/catalog');

export const getLaunchGate = (workspaceId: string): Promise<LaunchDecision> =>
  request<LaunchDecision>(`${workspacePath(workspaceId)}/gate`);

export const updateLaunchCheck = (
  workspaceId: string,
  checkId: string,
  input: UpdateLaunchCheckInput,
): Promise<LaunchWorkspace> =>
  request<LaunchWorkspace>(`${workspacePath(workspaceId)}/checks/${encodeURIComponent(checkId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

export const createLaunchEvidence = (
  workspaceId: string,
  input: LaunchEvidenceInput,
): Promise<LaunchWorkspace> =>
  request<LaunchWorkspace>(`${workspacePath(workspaceId)}/evidence`, {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const updateLaunchEvidence = (
  workspaceId: string,
  evidenceId: string,
  input: UpdateLaunchEvidenceInput,
): Promise<LaunchWorkspace> =>
  request<LaunchWorkspace>(`${workspacePath(workspaceId)}/evidence/${encodeURIComponent(evidenceId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

export const deleteLaunchEvidence = (
  workspaceId: string,
  evidenceId: string,
): Promise<LaunchWorkspace | undefined> =>
  request<LaunchWorkspace | undefined>(`${workspacePath(workspaceId)}/evidence/${encodeURIComponent(evidenceId)}`, {
    method: 'DELETE',
  });

export type { LaunchEvidence };
