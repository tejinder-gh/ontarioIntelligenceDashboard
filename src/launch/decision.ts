import { LAUNCH_CATALOG } from './catalog.js';
import { LAUNCH_PLANNING_NOTICE } from './contracts.js';
import type { LaunchCatalogCheck, LaunchCheckState, LaunchDecision, LaunchDecisionReason, LaunchEvidence } from './contracts.js';

/** Pure gate: no clock, network access, mutation, or inference of legal approval. */
export function evaluateLaunchDecision(
  checks: readonly LaunchCheckState[],
  evidence: readonly LaunchEvidence[],
  catalog: readonly LaunchCatalogCheck[] = LAUNCH_CATALOG,
): LaunchDecision {
  const reasons: LaunchDecisionReason[] = [];
  // Include saved IDs even if a future catalog removes them, so blockers cannot disappear.
  const ids = [...new Set([...catalog.map(item => item.id), ...checks.map(item => item.id)])].sort();
  for (const id of ids) {
    const definition = catalog.find(item => item.id === id);
    const states = checks.filter(item => item.id === id);
    if (!states.length) {
      reasons.push({ code: 'UNKNOWN_APPLICABILITY', checkId: id, message: 'This check has no recorded applicability.' });
      continue;
    }
    // Conservatively inspect duplicate saved rows; none can mask an unresolved blocker.
    for (const state of states) {
      if (state.applicability === 'not_applicable') continue;
      if (state.applicability === 'unknown') {
        reasons.push({ code: 'UNKNOWN_APPLICABILITY', checkId: id, message: 'Confirm whether this check applies.' });
        continue;
      }
      if (state.blocker === 'unresolved') {
        reasons.push({ code: 'UNRESOLVED_BLOCKER', checkId: id, message: 'Resolve the applicable blocker before proceeding.' });
      }
      if (state.completion !== 'complete') {
        reasons.push({ code: 'INCOMPLETE_CHECK', checkId: id, message: 'Complete this applicable check.' });
      }
      const hasReference = evidence.some(item =>
        state.evidenceIds.includes(item.id) && item.checkId === id
        && item.kind === 'user_recorded_reference' && item.title.trim()
        && item.sourceUrl.trim() && item.sourcePublisher.trim() && item.recordedAt.trim());
      if ((definition?.evidenceRequired ?? true) && !hasReference) {
        reasons.push({ code: 'MISSING_REQUIRED_EVIDENCE', checkId: id, message: 'Associate an existing user-recorded source reference with this check.' });
      }
    }
  }
  const uniqueReasons = [...new Map(reasons.map(reason => [`${reason.checkId}:${reason.code}`, reason])).values()]
    .sort((a, b) => a.checkId < b.checkId ? -1 : a.checkId > b.checkId ? 1 : a.code < b.code ? -1 : a.code > b.code ? 1 : 0);
  return {
    status: uniqueReasons.some(reason => reason.code === 'UNRESOLVED_BLOCKER') ? 'NO_GO'
      : uniqueReasons.length ? 'VERIFY' : 'CONDITIONAL_GO',
    reasons: uniqueReasons,
    notice: LAUNCH_PLANNING_NOTICE,
  };
}
