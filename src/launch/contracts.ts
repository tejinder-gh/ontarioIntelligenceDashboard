/** Planning metadata only. Do not add financial amounts, identity/account numbers,
 * credentials, document bodies, or uploads. Free text must be non-sensitive. */
export type LaunchApplicability = 'unknown' | 'applicable' | 'not_applicable';
export type LaunchCompletion = 'incomplete' | 'complete';
export type LaunchBlocker = 'none' | 'unresolved' | 'resolved';
export type LaunchCategory =
  | 'business_structure' | 'registration' | 'municipal' | 'industry'
  | 'tax' | 'employer' | 'insurance' | 'privacy' | 'operations';

export interface LaunchSource {
  title: string;
  publisher: string;
  url: string;
  /** Static discovery links have not been reviewed for this launch. */
  verifiedAt: null;
}

export interface LaunchCatalogCheck {
  /** Durable identifier; independent of array order and display text. */
  id: string;
  title: string;
  category: LaunchCategory;
  label: 'candidate' | 'verify';
  guidance: string;
  applicabilityGuidance: string;
  defaultApplicability: LaunchApplicability;
  evidenceRequired: boolean;
  sources: readonly LaunchSource[];
}

export interface LaunchCheckState {
  /** Same stable ID as its catalog check. */
  id: string;
  applicability: LaunchApplicability;
  completion: LaunchCompletion;
  blocker: LaunchBlocker;
  evidenceIds: string[];
}

/** A user-recorded reference, never verified proof or an uploaded document. */
export interface LaunchEvidence {
  id: string;
  checkId: string;
  title: string;
  sourceUrl: string;
  sourcePublisher: string;
  recordedAt: string;
  kind: 'user_recorded_reference';
}

export interface LaunchWorkspace {
  id: string;
  name: string;
  municipality: string;
  industry: string;
  createdAt: string;
  updatedAt: string;
  checks: LaunchCheckState[];
  evidence: LaunchEvidence[];
}

export type LaunchDecisionStatus = 'NO_GO' | 'VERIFY' | 'CONDITIONAL_GO';
export type LaunchDecisionReasonCode =
  | 'UNRESOLVED_BLOCKER' | 'UNKNOWN_APPLICABILITY'
  | 'INCOMPLETE_CHECK' | 'MISSING_REQUIRED_EVIDENCE';

export interface LaunchDecisionReason {
  code: LaunchDecisionReasonCode;
  checkId: string;
  message: string;
}

export interface LaunchDecision {
  status: LaunchDecisionStatus;
  reasons: LaunchDecisionReason[];
  notice: string;
}

export const LAUNCH_PLANNING_NOTICE =
  'Planning aid only, not legal, tax, licensing, financial, or launch approval. '
  + 'Catalog entries are candidates to verify; evidence is a user-recorded reference, not verified proof. '
  + 'Confirm current requirements with the responsible authority or qualified adviser.';

export const LAUNCH_PRIVACY_NOTICE =
  'Store only non-sensitive planning labels and public source references. '
  + 'Do not enter financial amounts, identity or account numbers, credentials, personal details, or document contents.';
