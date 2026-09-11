import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ExternalLink,
  Info,
  LoaderCircle,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import type {
  LaunchApplicability,
  LaunchCatalogCheck,
  LaunchCheckState,
  LaunchCompletion,
  LaunchDecision,
  LaunchEvidence,
  LaunchWorkspace,
} from '../../launch/contracts.js';
import {
  createLaunchEvidence,
  createLaunchWorkspace,
  deleteLaunchEvidence,
  getLaunchCatalog,
  getLaunchGate,
  getLaunchWorkspace,
  listLaunchWorkspaces,
  updateLaunchCheck,
  updateLaunchEvidence,
  type CreateLaunchWorkspaceInput,
  type LaunchEvidenceInput,
} from '../utils/launch-api.js';

interface LaunchReadinessViewProps {
  workspaceId?: string;
}

const emptyEvidence: LaunchEvidenceInput = {
  checkId: '',
  title: '',
  sourceUrl: '',
  sourcePublisher: '',
};

const inputClass = 'w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none';
const selectClass = 'rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none';

const checkState = (state: LaunchCheckState | undefined): LaunchCheckState => state ?? {
  id: '',
  applicability: 'unknown',
  completion: 'incomplete',
  blocker: 'none',
  evidenceIds: [],
};

const statusLabel = (status: LaunchDecision['status']): string => ({
  NO_GO: 'NO-GO',
  VERIFY: 'VERIFY',
  CONDITIONAL_GO: 'CONDITIONAL GO',
}[status]);

const statusClass = (status: LaunchDecision['status']): string => ({
  NO_GO: 'border-rose-800 bg-rose-950/60 text-rose-200',
  VERIFY: 'border-amber-800 bg-amber-950/60 text-amber-200',
  CONDITIONAL_GO: 'border-emerald-800 bg-emerald-950/60 text-emerald-200',
}[status]);

const humanize = (value: string): string => value.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\S/g, letter => letter.toUpperCase());

export const LaunchReadinessView: React.FC<LaunchReadinessViewProps> = ({ workspaceId }) => {
  const [catalog, setCatalog] = useState<LaunchCatalogCheck[]>([]);
  const [workspaces, setWorkspaces] = useState<LaunchWorkspace[]>([]);
  const [workspace, setWorkspace] = useState<LaunchWorkspace | null>(null);
  const [gate, setGate] = useState<LaunchDecision | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [newWorkspace, setNewWorkspace] = useState<CreateLaunchWorkspaceInput>({ name: '', municipality: '', industry: '' });
  const [newEvidence, setNewEvidence] = useState<LaunchEvidenceInput>(emptyEvidence);
  const [editingEvidenceId, setEditingEvidenceId] = useState<string | null>(null);
  const [editingEvidence, setEditingEvidence] = useState<LaunchEvidenceInput>(emptyEvidence);

  const loadGate = async (id: string): Promise<void> => {
    try {
      setGate(await getLaunchGate(id));
    } catch (cause) {
      setGate(null);
      throw cause;
    }
  };

  const loadWorkspace = async (id: string, known?: LaunchWorkspace): Promise<void> => {
    setLoadingWorkspace(true);
    setError(null);
    try {
      const next = known ?? await getLaunchWorkspace(id);
      setWorkspace(next);
      await loadGate(next.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load this workspace.');
    } finally {
      setLoadingWorkspace(false);
    }
  };

  const loadInitial = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const [nextCatalog, nextWorkspaces] = await Promise.all([getLaunchCatalog(), listLaunchWorkspaces()]);
      setCatalog(nextCatalog);
      setWorkspaces(nextWorkspaces);
      const selected = (workspaceId && nextWorkspaces.find(item => item.id === workspaceId)) || nextWorkspaces[0];
      if (selected) {
        await loadWorkspace(selected.id, selected);
      } else {
        setWorkspace(null);
        setGate(null);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load launch readiness.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInitial();
    // The optional workspace ID is the only external input to the initial load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const runMutation = async (key: string, operation: () => Promise<LaunchWorkspace | undefined>): Promise<void> => {
    if (!workspace) return;
    setPendingKey(key);
    setMutationError(null);
    try {
      const next = await operation();
      if (next) {
        setWorkspace(next);
        setWorkspaces(current => current.map(item => item.id === next.id ? next : item));
        await loadGate(next.id);
      } else {
        await loadWorkspace(workspace.id);
      }
    } catch (cause) {
      setMutationError(cause instanceof Error ? cause.message : 'The change could not be saved.');
    } finally {
      setPendingKey(null);
    }
  };

  const handleCreateWorkspace = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!newWorkspace.name.trim() || !newWorkspace.municipality.trim() || !newWorkspace.industry.trim()) return;
    setPendingKey('workspace:create');
    setMutationError(null);
    try {
      const created = await createLaunchWorkspace({
        name: newWorkspace.name.trim(),
        municipality: newWorkspace.municipality.trim(),
        industry: newWorkspace.industry.trim(),
      });
      setWorkspaces(current => [...current, created]);
      setNewWorkspace({ name: '', municipality: '', industry: '' });
      await loadWorkspace(created.id, created);
    } catch (cause) {
      setMutationError(cause instanceof Error ? cause.message : 'The workspace could not be created.');
    } finally {
      setPendingKey(null);
    }
  };

  const handleCheckChange = (checkId: string, field: 'applicability' | 'completion' | 'blocker', value: string): void => {
    const input = field === 'applicability'
      ? { applicability: value as LaunchApplicability }
      : field === 'completion'
        ? { completion: value as LaunchCompletion }
        : { blocker: value as LaunchCheckState['blocker'] };
    void runMutation(`check:${checkId}:${field}`, () => updateLaunchCheck(workspace!.id, checkId, input));
  };

  const handleCreateEvidence = (event: React.FormEvent, checkId: string): void => {
    event.preventDefault();
    if (!workspace || !newEvidence.title.trim() || !newEvidence.sourceUrl.trim() || !newEvidence.sourcePublisher.trim()) return;
    void runMutation(`evidence:create:${checkId}`, () => createLaunchEvidence(workspace!.id, {
      ...newEvidence,
      checkId,
      title: newEvidence.title.trim(),
      sourceUrl: newEvidence.sourceUrl.trim(),
      sourcePublisher: newEvidence.sourcePublisher.trim(),
    }));
    setNewEvidence(emptyEvidence);
  };

  const beginEvidenceEdit = (evidence: LaunchEvidence): void => {
    setEditingEvidenceId(evidence.id);
    setEditingEvidence({ checkId: evidence.checkId, title: evidence.title, sourceUrl: evidence.sourceUrl, sourcePublisher: evidence.sourcePublisher });
  };

  const handleSaveEvidence = (event: React.FormEvent, evidenceId: string): void => {
    event.preventDefault();
    if (!workspace || !editingEvidence.title.trim() || !editingEvidence.sourceUrl.trim() || !editingEvidence.sourcePublisher.trim()) return;
    void runMutation(`evidence:edit:${evidenceId}`, () => updateLaunchEvidence(workspace!.id, evidenceId, {
      title: editingEvidence.title.trim(),
      sourceUrl: editingEvidence.sourceUrl.trim(),
      sourcePublisher: editingEvidence.sourcePublisher.trim(),
    }));
    setEditingEvidenceId(null);
  };

  const checkRows = useMemo(() => {
    const stateById = new Map((workspace?.checks ?? []).map(item => [item.id, item]));
    const knownIds = new Set(catalog.map(item => item.id));
    const rows = catalog.map(item => ({ definition: item, state: stateById.get(item.id) }));
    (workspace?.checks ?? []).filter(item => !knownIds.has(item.id)).forEach(item => {
      rows.push({
        definition: {
          id: item.id,
          title: `Saved check: ${item.id}`,
          category: 'operations',
          label: 'verify',
          guidance: 'This saved check is not present in the current catalog. Verify its scope before relying on it.',
          applicabilityGuidance: 'No current catalog applicability guidance is available.',
          defaultApplicability: 'unknown',
          evidenceRequired: true,
          sources: [],
        },
        state: item,
      });
    });
    return rows;
  }, [catalog, workspace]);

  const evidenceFor = (state: LaunchCheckState | undefined): LaunchEvidence[] => {
    if (!workspace || !state) return [];
    return workspace.evidence.filter(item => state.evidenceIds.includes(item.id) && item.checkId === state.id);
  };

  if (loading) {
    return <div className="glass-panel flex items-center justify-center gap-2 rounded-xl border border-slate-800 p-12 text-sm text-slate-400" role="status"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading launch readiness…</div>;
  }

  return (
    <div className="space-y-6">
      <header className="glass-panel rounded-xl border border-slate-800 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-300"><ShieldCheck className="h-4 w-4" /> Launch readiness</div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Source-linked launch checklist</h2>
            <p className="mt-2 text-sm text-slate-400">A metadata-only planning workspace for recording checks, public guidance links and user evidence. The gate and reasons below are calculated by the server.</p>
          </div>
          <button type="button" onClick={() => void loadInitial()} disabled={loading || loadingWorkspace || Boolean(pendingKey)} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw className="h-4 w-4" /> Refresh</button>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-900/80 bg-amber-950/30 p-3 text-xs text-amber-100"><Info className="mt-0.5 h-4 w-4 shrink-0" /><span>{'Planning aid only. Sources and user evidence are not independently verified. Never enter sensitive personal or financial information, identity or account numbers, credentials, document contents or uploads.'}</span></div>
      </header>

      {error && <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-900 bg-rose-950/40 p-4 text-sm text-rose-200" role="alert"><span>{error}</span><button type="button" onClick={() => void loadInitial()} className="inline-flex items-center gap-1 rounded-md border border-rose-800 px-2 py-1 hover:bg-rose-900/60"><RefreshCw className="h-3.5 w-3.5" /> Retry</button></div>}
      {mutationError && <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-900 bg-rose-950/40 p-3 text-sm text-rose-200" role="alert"><span>{mutationError}</span><button type="button" aria-label="Dismiss save error" onClick={() => setMutationError(null)}><X className="h-4 w-4" /></button></div>}

      <section className="glass-panel rounded-xl border border-slate-800 p-5" aria-labelledby="workspace-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 id="workspace-heading" className="text-lg font-semibold text-white">Workspace</h3><p className="text-xs text-slate-500">Bounded metadata only: a label, municipality and industry.</p></div>{workspace && loadingWorkspace && <LoaderCircle className="h-4 w-4 animate-spin text-slate-400" aria-label="Loading workspace" />}</div>
        {workspaces.length > 0 && <label className="mb-4 block max-w-xl text-sm text-slate-300">Select workspace<select aria-label="Select launch workspace" className={`${selectClass} mt-1 block w-full`} value={workspace?.id ?? ''} onChange={event => { const selected = workspaces.find(item => item.id === event.target.value); if (selected) void loadWorkspace(selected.id, selected); }} disabled={Boolean(pendingKey) || loadingWorkspace}><option value="" disabled>Select a workspace</option>{workspaces.map(item => <option key={item.id} value={item.id}>{item.name} · {item.municipality} · {item.industry}</option>)}</select></label>}
        {!workspace && <form onSubmit={handleCreateWorkspace} className="grid gap-3 md:grid-cols-4" aria-label="Create launch workspace"><label className="text-sm text-slate-300">Workspace label<input className={`${inputClass} mt-1`} maxLength={80} required value={newWorkspace.name} onChange={event => setNewWorkspace(current => ({ ...current, name: event.target.value }))} placeholder="Example: Burlington pilot" /></label><label className="text-sm text-slate-300">Municipality<input className={`${inputClass} mt-1`} maxLength={80} required value={newWorkspace.municipality} onChange={event => setNewWorkspace(current => ({ ...current, municipality: event.target.value }))} placeholder="Example: Burlington" /></label><label className="text-sm text-slate-300">Industry label<input className={`${inputClass} mt-1`} maxLength={100} required value={newWorkspace.industry} onChange={event => setNewWorkspace(current => ({ ...current, industry: event.target.value }))} placeholder="Example: food service" /></label><button type="submit" disabled={pendingKey === 'workspace:create'} className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-4 w-4" /> Create workspace</button></form>}
        {workspace && <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-3"><div><span className="block text-xs uppercase tracking-wide text-slate-500">Label</span>{workspace.name}</div><div><span className="block text-xs uppercase tracking-wide text-slate-500">Municipality</span>{workspace.municipality}</div><div><span className="block text-xs uppercase tracking-wide text-slate-500">Industry</span>{workspace.industry}</div></div>}
      </section>

      {!workspace && !error && <div className="glass-panel rounded-xl border border-slate-800 p-10 text-center text-sm text-slate-400">Create a workspace to start recording launch checks. No documents or sensitive details are required.</div>}

      {workspace && gate && <section className={`rounded-xl border p-5 ${statusClass(gate.status)}`} aria-labelledby="gate-heading"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider"><ShieldCheck className="h-4 w-4" /> Server-derived gate</div><h3 id="gate-heading" className="text-2xl font-bold">{statusLabel(gate.status)}</h3></div><span className="rounded-full border px-3 py-1 text-xs font-semibold">{gate.reasons.length} reason{gate.reasons.length === 1 ? '' : 's'}</span></div><p className="mt-3 text-sm opacity-90">{gate.notice}</p>{gate.reasons.length > 0 ? <div className="mt-4 space-y-2" aria-label="Gate reasons">{gate.reasons.map(reason => <div key={`${reason.checkId}:${reason.code}`} className="flex items-start gap-2 rounded-lg bg-black/15 p-3 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span><strong>{checkRows.find(row => row.definition.id === reason.checkId)?.definition.title ?? reason.checkId}</strong><span className="ml-2 opacity-80">{reason.message}</span></span></div>)}</div> : <div className="mt-4 flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4" /> No unresolved gate reasons recorded.</div>}</section>}

      {workspace && <section className="space-y-4" aria-labelledby="checks-heading"><div className="flex items-end justify-between gap-3"><div><h3 id="checks-heading" className="text-xl font-semibold text-white">Checklist and evidence ledger</h3><p className="text-sm text-slate-400">Set applicability and completion explicitly; the server gate remains conservative.</p></div><span className="text-xs text-slate-500">{checkRows.length} checks · {workspace.evidence.length} references</span></div>{checkRows.length === 0 && <div className="glass-panel rounded-xl border border-slate-800 p-8 text-center text-sm text-slate-400">No catalog checks are available. Retry to reload the checklist.</div>}{checkRows.map(({ definition, state }) => { const current = checkState(state); const evidence = evidenceFor(state); return <article key={definition.id} className="glass-panel rounded-xl border border-slate-800 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="mb-1 flex flex-wrap items-center gap-2"><span className={`rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${definition.label === 'candidate' ? 'border-sky-800 bg-sky-950/50 text-sky-300' : 'border-indigo-800 bg-indigo-950/50 text-indigo-300'}`}>{definition.label}</span><span className="text-xs uppercase tracking-wide text-slate-500">{humanize(definition.category)}</span></div><h4 className="text-base font-semibold text-white">{definition.title}</h4><p className="mt-1 text-sm text-slate-400">{definition.guidance}</p><p className="mt-1 text-xs text-slate-500"><strong className="text-slate-400">Applicability:</strong> {definition.applicabilityGuidance}</p></div><div className="grid gap-2 sm:grid-cols-3"><label className="text-xs text-slate-400">Applies<select aria-label={`${definition.title} applicability`} className={`${selectClass} mt-1`} value={current.applicability} disabled={pendingKey?.startsWith(`check:${definition.id}:`) ?? false} onChange={event => handleCheckChange(definition.id, 'applicability', event.target.value)}><option value="unknown">Unknown</option><option value="applicable">Applicable</option><option value="not_applicable">Not applicable</option></select></label><label className="text-xs text-slate-400">Completion<select aria-label={`${definition.title} completion`} className={`${selectClass} mt-1`} value={current.completion} disabled={pendingKey?.startsWith(`check:${definition.id}:`) ?? false} onChange={event => handleCheckChange(definition.id, 'completion', event.target.value)}><option value="incomplete">Incomplete</option><option value="complete">Complete</option></select></label><label className="text-xs text-slate-400">Blocker<select aria-label={`${definition.title} blocker`} className={`${selectClass} mt-1`} value={current.blocker} disabled={pendingKey?.startsWith(`check:${definition.id}:`) ?? false} onChange={event => handleCheckChange(definition.id, 'blocker', event.target.value)}><option value="none">None</option><option value="unresolved">Unresolved</option><option value="resolved">Resolved</option></select></label></div></div>
          {definition.sources.length > 0 && <div className="mt-4 border-t border-slate-800 pt-4"><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400"><ExternalLink className="h-3.5 w-3.5" /> Official guidance links <span className="font-normal normal-case text-slate-500">(candidate sources to verify)</span></div><div className="flex flex-wrap gap-2">{definition.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-xs text-indigo-300 hover:border-indigo-500 hover:text-indigo-200">{source.title} · {source.publisher}<ExternalLink className="h-3 w-3" /></a>)}</div></div>}
          <div className="mt-4 border-t border-slate-800 pt-4"><div className="mb-3 flex items-center justify-between gap-3"><div><h5 className="text-sm font-semibold text-slate-200">User-recorded evidence</h5><p className="text-xs text-slate-500">Public source references only; these are not independently verified proof.</p></div><span className="text-xs text-slate-500">{evidence.length} linked</span></div>{evidence.length > 0 && <div className="mb-3 space-y-2">{evidence.map(item => editingEvidenceId === item.id ? <form key={item.id} onSubmit={event => handleSaveEvidence(event, item.id)} className="grid gap-2 rounded-lg border border-indigo-800/70 bg-indigo-950/20 p-3 md:grid-cols-4"><label className="text-xs text-slate-400">Title<input className={`${inputClass} mt-1`} required maxLength={160} value={editingEvidence.title} onChange={event => setEditingEvidence(current => ({ ...current, title: event.target.value }))} /></label><label className="text-xs text-slate-400">Publisher<input className={`${inputClass} mt-1`} required maxLength={120} value={editingEvidence.sourcePublisher} onChange={event => setEditingEvidence(current => ({ ...current, sourcePublisher: event.target.value }))} /></label><label className="text-xs text-slate-400">Public URL<input className={`${inputClass} mt-1`} required type="url" maxLength={500} value={editingEvidence.sourceUrl} onChange={event => setEditingEvidence(current => ({ ...current, sourceUrl: event.target.value }))} /></label><div className="flex items-end gap-2"><button type="submit" disabled={pendingKey === `evidence:edit:${item.id}`} className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Save className="h-3.5 w-3.5" /> Save</button><button type="button" onClick={() => setEditingEvidenceId(null)} className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-300"><X className="h-3.5 w-3.5" /> Cancel</button></div></form> : <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/40 p-3"><div className="min-w-0"><div className="text-sm text-slate-200">{item.title}</div><div className="text-xs text-slate-500">{item.sourcePublisher} · <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-300 hover:underline">{item.sourceUrl}</a></div><div className="mt-1 text-[11px] text-amber-300">User-recorded reference · not independently verified</div></div><div className="flex items-center gap-2"><button type="button" disabled={Boolean(pendingKey)} onClick={() => beginEvidenceEdit(item)} className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50">Edit</button><button type="button" disabled={Boolean(pendingKey)} onClick={() => { if (window.confirm('Delete this user-recorded reference?')) void runMutation(`evidence:delete:${item.id}`, () => deleteLaunchEvidence(workspace.id, item.id)); }} className="inline-flex items-center gap-1 rounded-md border border-rose-900 px-2 py-1 text-xs text-rose-300 hover:bg-rose-950/40 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /> Delete</button></div></div>)}</div>}
            <form onSubmit={event => handleCreateEvidence(event, definition.id)} className="grid gap-2 md:grid-cols-4" aria-label={`Add evidence to ${definition.title}`}><label className="text-xs text-slate-400">Title<input className={`${inputClass} mt-1`} required maxLength={160} value={newEvidence.checkId === definition.id ? newEvidence.title : ''} onChange={event => setNewEvidence(current => ({ ...current, checkId: definition.id, title: event.target.value }))} placeholder="What the reference covers" /></label><label className="text-xs text-slate-400">Publisher<input className={`${inputClass} mt-1`} required maxLength={120} value={newEvidence.checkId === definition.id ? newEvidence.sourcePublisher : ''} onChange={event => setNewEvidence(current => ({ ...current, checkId: definition.id, sourcePublisher: event.target.value }))} placeholder="Public authority or publisher" /></label><label className="text-xs text-slate-400">Public URL<input className={`${inputClass} mt-1`} required type="url" maxLength={500} value={newEvidence.checkId === definition.id ? newEvidence.sourceUrl : ''} onChange={event => setNewEvidence(current => ({ ...current, checkId: definition.id, sourceUrl: event.target.value }))} placeholder="https://…" /></label><div className="flex items-end"><button type="submit" disabled={pendingKey === `evidence:create:${definition.id}`} className="inline-flex items-center gap-2 rounded-lg border border-indigo-700 px-3 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-950/50 disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-3.5 w-3.5" /> Add reference</button></div></form>
          </div>
        </article>; })}</section>}

      <footer className="flex items-start gap-2 border-t border-slate-800 pt-4 text-xs text-slate-500"><Info className="mt-0.5 h-4 w-4 shrink-0" /><p>Sources, applicability choices and user-recorded references are planning inputs. Confirm current requirements with the responsible authority or a qualified adviser before acting; this view does not grant legal, tax, licensing, financial or launch approval.</p></footer>
    </div>
  );
};
