import type {
  VentureModuleContract,
  VentureQualificationResult,
  VentureQualificationHypothesis,
} from '../../types.js';

export class BusinessAcquisitionModule implements VentureModuleContract {
  readonly id = 'business_acquisition';
  readonly name = 'Business Acquisition Intelligence';
  readonly version = '1.0.0';
  readonly description = 'Identifies succession, acquisition, and rollover prospects among established independent Ontario commercial operations.';
  readonly supportedWorkflows = [
    'QUALIFICATION',
    'OWNERSHIP_SUCCESSION_ANALYSIS',
    'VALUATION_BENCHMARKING',
    'CONFIDENTIAL_PROSPECT_LIST',
  ];

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
  }): VentureQualificationResult {
    const hypotheses: VentureQualificationHypothesis[] = [];
    let score = 40.0;

    // Disqualify franchise chains
    if (business.isChain) {
      return {
        isQualified: false,
        score: 0.0,
        hypotheses: [
          {
            code: 'FRANCHISE_CHAIN_EXCLUSION',
            statement: 'Corporate franchise or multi-location chain not suitable for independent acquisition.',
            evidenceFields: ['is_chain'],
            confidence: 1.0,
          },
        ],
        signals: { reason: 'is_chain' },
        priorityTier: 'DISQUALIFIED',
      };
    }

    // Independent commercial establishment
    score += 20.0;
    hypotheses.push({
      code: 'INDEPENDENT_PROPRIETORSHIP',
      statement: 'Independent single-unit commercial enterprise with localized market equity.',
      evidenceFields: ['is_chain', 'brand_name'],
      confidence: 0.85,
    });

    // Established phone presence
    if (business.phone) {
      score += 15.0;
      hypotheses.push({
        code: 'COMMERCIAL_CONTACTABILITY',
        statement: 'Direct operational telephone line confirmed for confidential owner outreach.',
        evidenceFields: ['phone'],
        confidence: 0.90,
      });
    }

    // Target cashflow sectors (automotive repair, daycare, trade services, healthcare)
    const primeSectors = [
      'automotive_repair',
      'car_detailing',
      'child_daycare',
      'medical_clinic',
      'home_services',
    ];
    if (primeSectors.includes(business.categoryId)) {
      score += 25.0;
      hypotheses.push({
        code: 'RESILIENT_CASHFLOW_SECTOR',
        statement: 'Essential local services sector with high customer switching costs and recurring cashflow.',
        evidenceFields: ['category_id'],
        confidence: 0.95,
      });
    }

    const priorityTier =
      score >= 80 ? 'TIER_1_IMMEDIATE' : score >= 60 ? 'TIER_2_PROSPECT' : 'TIER_3_NURTURE';

    return {
      isQualified: score >= 60,
      score: Math.min(100.0, score),
      hypotheses,
      signals: {
        category: business.categoryId,
        location: `${business.city}, ${business.province}`,
        digitalFootprint: Boolean(business.website),
      },
      priorityTier,
    };
  }

  calculateOpportunityScore(metrics: {
    fitScore: number;
    contactabilityScore: number;
    marketUrgencyScore: number;
  }): number {
    return Math.round(
      metrics.fitScore * 0.45 +
      metrics.contactabilityScore * 0.30 +
      metrics.marketUrgencyScore * 0.25
    );
  }
}

export const businessAcquisitionModule = new BusinessAcquisitionModule();
