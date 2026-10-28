export interface VentureQualificationHypothesis {
  code: string;
  statement: string;
  evidenceFields: string[];
  confidence: number;
}

export interface VentureQualificationResult {
  isQualified: boolean;
  score: number; // 0.0 - 100.0
  hypotheses: VentureQualificationHypothesis[];
  signals: Record<string, unknown>;
  priorityTier: 'TIER_1_IMMEDIATE' | 'TIER_2_PROSPECT' | 'TIER_3_NURTURE' | 'DISQUALIFIED';
}

export interface VentureModuleContract {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly supportedWorkflows: string[];

  qualifyBusiness(business: {
    id: string;
    name: string;
    categoryId: string;
    city: string;
    province: string;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    isChain?: boolean;
    qualityScore?: number;
    tags?: Record<string, unknown>;
  }): VentureQualificationResult;

  calculateOpportunityScore(metrics: {
    fitScore: number;
    contactabilityScore: number;
    marketUrgencyScore: number;
  }): number;
}
