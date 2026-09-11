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

const STORAGE_KEY = 'oei_launch_tokens';

export const getStoredTokens = (): Record<string, string> => {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveStoredToken = (workspaceId: string, token: string): void => {
  try {
    if (typeof localStorage === 'undefined') return;
    const tokens = getStoredTokens();
    tokens[workspaceId] = token;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  } catch {
    // Ignore localStorage errors
  }
};

export const removeStoredToken = (workspaceId: string): void => {
  try {
    if (typeof localStorage === 'undefined') return;
    const tokens = getStoredTokens();
    delete tokens[workspaceId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  } catch {
    // Ignore localStorage errors
  }
};

const getAuthHeaders = (workspaceId?: string): Record<string, string> => {
  const tokens = getStoredTokens();
  const headers: Record<string, string> = {};
  if (workspaceId && tokens[workspaceId]) {
    headers['X-Workspace-Token'] = tokens[workspaceId];
  } else {
    const allTokens = Object.values(tokens);
    if (allTokens.length > 0) {
      headers['X-Workspace-Token'] = allTokens.join(',');
    }
  }
  return headers;
};

const unwrapData = <T>(body: unknown): T => {
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as { data: T }).data;
  }
  return body as T;
};

const request = async <T>(path: string, init?: RequestInit, workspaceId?: string): Promise<T> => {
  const authHeaders = getAuthHeaders(workspaceId);
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...authHeaders,
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

export const createLaunchWorkspace = async (
  input: CreateLaunchWorkspaceInput,
): Promise<LaunchWorkspace> => {
  const ws = await request<LaunchWorkspace>('/api/launch/workspaces', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (ws.id && ws.token) {
    saveStoredToken(ws.id, ws.token);
  }
  return ws;
};

export const getLaunchWorkspace = (workspaceId: string): Promise<LaunchWorkspace> =>
  request<LaunchWorkspace>(workspacePath(workspaceId), undefined, workspaceId);

export const getLaunchCatalog = (): Promise<LaunchCatalogCheck[]> =>
  request<LaunchCatalogCheck[]>('/api/launch/catalog');

export const getLaunchGate = (workspaceId: string): Promise<LaunchDecision> =>
  request<LaunchDecision>(`${workspacePath(workspaceId)}/gate`, undefined, workspaceId);

export const updateLaunchCheck = (
  workspaceId: string,
  checkId: string,
  input: UpdateLaunchCheckInput,
): Promise<LaunchWorkspace> =>
  request<LaunchWorkspace>(`${workspacePath(workspaceId)}/checks/${encodeURIComponent(checkId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  }, workspaceId);

export const createLaunchEvidence = (
  workspaceId: string,
  input: LaunchEvidenceInput,
): Promise<LaunchWorkspace> =>
  request<LaunchWorkspace>(`${workspacePath(workspaceId)}/evidence`, {
    method: 'POST',
    body: JSON.stringify(input),
  }, workspaceId);

export const updateLaunchEvidence = (
  workspaceId: string,
  evidenceId: string,
  input: UpdateLaunchEvidenceInput,
): Promise<LaunchWorkspace> =>
  request<LaunchWorkspace>(`${workspacePath(workspaceId)}/evidence/${encodeURIComponent(evidenceId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  }, workspaceId);

export const deleteLaunchEvidence = (
  workspaceId: string,
  evidenceId: string,
): Promise<LaunchWorkspace | undefined> =>
  request<LaunchWorkspace | undefined>(`${workspacePath(workspaceId)}/evidence/${encodeURIComponent(evidenceId)}`, {
    method: 'DELETE',
  }, workspaceId);

export const deleteLaunchWorkspace = async (workspaceId: string): Promise<void> => {
  await request<void>(workspacePath(workspaceId), { method: 'DELETE' }, workspaceId);
  removeStoredToken(workspaceId);
};

export type { LaunchEvidence };
