import type { FunnelCandidate } from './types.js';

export function describeCompetitorEvidence(candidate: FunnelCandidate): string {
  const count = candidate.estimatedDirectCompetitors;
  if (candidate.competitorClassification === 'UNAVAILABLE' || count == null) {
    return 'Direct competitor count is unavailable; local competition requires independent verification.';
  }
  if (candidate.competitorClassification === 'BENCHMARK') {
    return `The available broad sector benchmark is ${count} establishments; it is not a count of direct competitors.`;
  }
  return `The available category count is ${count} establishments; it is not a verified count of active direct competitors.`;
}
