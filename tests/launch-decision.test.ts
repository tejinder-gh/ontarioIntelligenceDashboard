import { describe, expect, it } from 'vitest';
import { LAUNCH_CATALOG, createLaunchChecks } from '../src/launch/catalog';
import { evaluateLaunchDecision } from '../src/launch/decision';
import type { LaunchCatalogCheck, LaunchCheckState, LaunchEvidence, LaunchWorkspace } from '../src/launch/contracts';

const catalog = LAUNCH_CATALOG.slice(0, 2);
function complete(): { checks: LaunchCheckState[]; evidence: LaunchEvidence[] } {
  return {
    checks: createLaunchChecks(catalog).map(check => ({ ...check, completion: 'complete', evidenceIds: [`ref:${check.id}`] })),
    evidence: catalog.map(check => ({ id: `ref:${check.id}`, checkId: check.id, title: 'User recorded review reference',
      sourceUrl: check.sources[0].url, sourcePublisher: check.sources[0].publisher,
      recordedAt: '2026-01-01T00:00:00.000Z', kind: 'user_recorded_reference' })),
  };
}

describe('launch decision gate', () => {
  it('returns NO_GO for an applicable unresolved blocker, ahead of verification issues', () => {
    const { checks, evidence } = complete();
    checks[0].blocker = 'unresolved';
    checks[1].completion = 'incomplete';
    const result = evaluateLaunchDecision(checks, evidence, catalog);
    expect(result.status).toBe('NO_GO');
    expect(result.reasons.some(r => r.code === 'UNRESOLVED_BLOCKER')).toBe(true);
  });
  it('returns VERIFY for incomplete applicable checks', () => {
    const { checks, evidence } = complete();
    checks[0].completion = 'incomplete';
    expect(evaluateLaunchDecision(checks, evidence, catalog).reasons.map(r => r.code)).toEqual(['INCOMPLETE_CHECK']);
  });
  it('returns VERIFY for unknown applicability even with an unresolved potential blocker', () => {
    const { checks, evidence } = complete();
    checks[0].applicability = 'unknown';
    checks[0].blocker = 'unresolved';
    expect(evaluateLaunchDecision(checks, evidence, catalog).status).toBe('VERIFY');
  });
  it('returns VERIFY for missing required evidence and for deleted evidence', () => {
    const { checks, evidence } = complete();
    expect(evaluateLaunchDecision(checks, [], catalog).status).toBe('VERIFY');
    const result = evaluateLaunchDecision(checks, evidence.slice(1), catalog);
    expect(result.reasons).toEqual([{ code: 'MISSING_REQUIRED_EVIDENCE', checkId: checks[0].id,
      message: 'Associate an existing user-recorded source reference with this check.' }]);
  });
  it('rejects evidence associated with the wrong check or missing source metadata', () => {
    const { checks, evidence } = complete();
    evidence[0].checkId = checks[1].id;
    expect(evaluateLaunchDecision(checks, evidence, catalog).status).toBe('VERIFY');
    evidence[0].checkId = checks[0].id;
    evidence[0].sourceUrl = '';
    expect(evaluateLaunchDecision(checks, evidence, catalog).status).toBe('VERIFY');
  });
  it('returns CONDITIONAL_GO for completed checks with recorded references and states its limits', () => {
    const { checks, evidence } = complete();
    checks[0].blocker = 'resolved';
    expect(evaluateLaunchDecision(checks, evidence, catalog)).toMatchObject({ status: 'CONDITIONAL_GO', reasons: [] });
    expect(evaluateLaunchDecision(checks, evidence, catalog).notice).toContain('not verified proof');
    expect(evaluateLaunchDecision(checks, evidence, catalog).notice).toContain('launch approval');
  });
  it('ignores nonapplicable checks, including completion, blockers and evidence requirements', () => {
    const { checks } = complete();
    checks.forEach(check => { check.applicability = 'not_applicable'; check.completion = 'incomplete'; check.blocker = 'unresolved'; });
    expect(evaluateLaunchDecision(checks, [], catalog).status).toBe('CONDITIONAL_GO');
  });
  it('requires verification for missing catalog checks', () => {
    expect(evaluateLaunchDecision([], [], catalog).reasons.map(r => r.code)).toEqual(['UNKNOWN_APPLICABILITY', 'UNKNOWN_APPLICABILITY']);
  });
  it('has deterministic ordering independent of input order and does not mutate inputs', () => {
    const checks = createLaunchChecks(catalog);
    const before = JSON.stringify(checks);
    const first = evaluateLaunchDecision(checks, [], catalog);
    const second = evaluateLaunchDecision([...checks].reverse(), [], [...catalog].reverse());
    expect(first).toEqual(second);
    expect(JSON.stringify(checks)).toBe(before);
    expect(first.reasons.map(r => `${r.checkId}:${r.code}`)).toEqual(first.reasons.map(r => `${r.checkId}:${r.code}`).sort());
  });
  it('does not lose saved blockers when catalog entries disappear or duplicate rows exist', () => {
    const { checks, evidence } = complete();
    const blocked = { ...checks[0], blocker: 'unresolved' as const };
    expect(evaluateLaunchDecision([blocked, ...checks], evidence, []).status).toBe('NO_GO');
    expect(evaluateLaunchDecision([...checks, blocked], evidence, []).status).toBe('NO_GO');
  });
});

describe('launch catalog and privacy contracts', () => {
  it('has stable unique IDs, candidate/verify labels and unverified official source references', () => {
    expect(LAUNCH_CATALOG.map(c => c.id)).toEqual([
      'on.business.structure', 'on.registration.business', 'on.municipal.permits', 'on.municipal.premises',
      'on.industry.licensing', 'on.industry.product_safety', 'on.tax.accounts', 'on.tax.sales',
      'on.employer.payroll', 'on.employer.standards', 'on.employer.wsib', 'on.insurance.coverage',
      'on.privacy.customer_data', 'on.operations.records',
    ]);
    expect(new Set(LAUNCH_CATALOG.map(c => c.id)).size).toBe(LAUNCH_CATALOG.length);
    for (const check of LAUNCH_CATALOG) {
      expect(['candidate', 'verify']).toContain(check.label);
      expect(check.applicabilityGuidance.length).toBeGreaterThan(0);
      expect(check.sources.length).toBeGreaterThan(0);
      for (const source of check.sources) {
        const url = new URL(source.url);
        expect(url.protocol).toBe('https:');
        expect(['www.ontario.ca', 'www.canada.ca', 'bizpal.ca', 'www.wsib.ca', 'www.fsrao.ca', 'www.priv.gc.ca', 'crtc.gc.ca']).toContain(url.hostname);
        expect(source.verifiedAt).toBeNull();
      }
    }
  });
  it('keeps workspace/evidence contracts restricted to planning metadata', () => {
    // Exact key allowlists fail type checking if prohibited fields are added later.
    const workspaceKeys: Record<keyof LaunchWorkspace, true> = {
      id: true, name: true, municipality: true, industry: true, createdAt: true, updatedAt: true, checks: true, evidence: true,
    };
    const evidenceKeys: Record<keyof LaunchEvidence, true> = {
      id: true, checkId: true, title: true, sourceUrl: true, sourcePublisher: true, recordedAt: true, kind: true,
    };
    expect(Object.keys(workspaceKeys)).toHaveLength(8);
    expect(Object.keys(evidenceKeys)).toHaveLength(7);
    const check: LaunchCatalogCheck = catalog[0];
    expect(check.sources[0].verifiedAt).toBeNull();
  });
});
