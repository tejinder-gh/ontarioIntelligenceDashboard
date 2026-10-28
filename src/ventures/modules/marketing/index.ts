import crypto from 'node:crypto';
import { sql } from '../../../db/index.js';
import type {
  VentureModuleContract,
  VentureQualificationResult,
  VentureQualificationHypothesis,
} from '../../types.js';
import { caslEngine } from '../../../compliance/casl.js';

export interface CampaignConfig {
  name: string;
  targetCategories: string[];
  targetCities: string[];
  offeringTopic: string;
  senderOrganization: string;
  senderAddress: string;
  senderContact: string;
  dailySendCap?: number;
  budgetCapCad?: number;
}

export class MarketingOutreachModule implements VentureModuleContract {
  readonly id = 'marketing_outreach';
  readonly name = 'Marketing & Outreach Automation';
  readonly version = '1.0.0';
  readonly description = 'Discovers, qualifies, scores, and sequences evidence-grounded B2B outreach campaigns with strict CASL compliance.';
  readonly supportedWorkflows = [
    'QUALIFICATION',
    'AUDIENCE_SEGMENTATION',
    'CAMPAIGN_APPROVAL_GATE',
    'DRY_RUN_SIMULATION',
    'DISPATCH_TRACKING',
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
    let score = 30.0;

    // Contactability evidence
    if (business.email) {
      score += 25.0;
      hypotheses.push({
        code: 'ELECTRONIC_CONTACT_ESTABLISHED',
        statement: 'Verified corporate email channel available for electronic correspondence.',
        evidenceFields: ['email'],
        confidence: 0.90,
      });
    }

    if (business.phone) {
      score += 15.0;
      hypotheses.push({
        code: 'TELEPHONE_CONTACT_ESTABLISHED',
        statement: 'Active commercial phone line available for voice follow-up.',
        evidenceFields: ['phone'],
        confidence: 0.85,
      });
    }

    // High engagement commercial categories (restaurants, automotive, gyms, healthcare)
    const activeCategories = [
      'pizza_store',
      'full_service_restaurant',
      'coffee_shop',
      'automotive_repair',
      'gym_fitness',
      'home_services',
    ];

    if (activeCategories.includes(business.categoryId)) {
      score += 20.0;
      hypotheses.push({
        code: 'HIGH_ENGAGEMENT_CATEGORY',
        statement: 'Local service format benefiting from localized marketing automation.',
        evidenceFields: ['category_id'],
        confidence: 0.80,
      });
    }

    if (!business.website) {
      score += 10.0;
      hypotheses.push({
        code: 'DIGITAL_GAP_OPPORTUNITY',
        statement: 'Business lacks dedicated modern web portal; prime opportunity for digital expansion.',
        evidenceFields: ['website'],
        confidence: 0.75,
      });
    }

    const priorityTier =
      score >= 75 ? 'TIER_1_IMMEDIATE' : score >= 50 ? 'TIER_2_PROSPECT' : 'TIER_3_NURTURE';

    return {
      isQualified: score >= 50,
      score: Math.min(100.0, score),
      hypotheses,
      signals: {
        hasEmail: Boolean(business.email),
        hasPhone: Boolean(business.phone),
        hasWebsite: Boolean(business.website),
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
      metrics.fitScore * 0.40 +
      metrics.contactabilityScore * 0.40 +
      metrics.marketUrgencyScore * 0.20
    );
  }

  async createCampaign(config: CampaignConfig): Promise<string> {
    const campaignId = `camp_${crypto.randomUUID()}`;
    await sql`
      INSERT INTO outreach_campaigns (
        id, venture_id, name, execution_mode, target_criteria,
        daily_send_cap, budget_cap_cad, sender_identity, compliance_basis,
        approval_status, kill_switch_active
      ) VALUES (
        ${campaignId}, ${this.id}, ${config.name}, 'DRY_RUN',
        ${JSON.stringify({
          categories: config.targetCategories,
          cities: config.targetCities,
          offeringTopic: config.offeringTopic,
          senderAddress: config.senderAddress,
          senderContact: config.senderContact,
        })}::jsonb,
        ${config.dailySendCap || 50}, ${config.budgetCapCad || 0.0},
        ${config.senderOrganization}, 'CASL_B2B_RELEVANT', 'PENDING', false
      );
    `;
    return campaignId;
  }

  async approveCampaign(
    campaignId: string,
    approvedBy: string,
    executionMode: 'DRY_RUN' | 'APPROVED_ACTIVE' = 'DRY_RUN'
  ): Promise<void> {
    await sql`
      UPDATE outreach_campaigns SET
        approval_status = 'APPROVED',
        approved_by = ${approvedBy},
        approved_at = NOW(),
        execution_mode = ${executionMode}
      WHERE id = ${campaignId};
    `;
  }

  async executeDryRunSequence(campaignId: string, maxTargets: number = 25): Promise<{
    evaluated: number;
    dispatchedDryRun: number;
    suppressed: number;
    eligibleRatePct: number;
  }> {
    const [campaign] = await sql<{
      id: string;
      name: string;
      target_criteria: any;
      sender_identity: string;
      kill_switch_active: boolean;
    }[]>`
      SELECT id, name, target_criteria, sender_identity, kill_switch_active
      FROM outreach_campaigns
      WHERE id = ${campaignId};
    `;

    if (!campaign) throw new Error('Campaign not found.');
    if (campaign.kill_switch_active) throw new Error('Campaign is blocked by kill switch.');

    const criteria = campaign.target_criteria || {};
    const targetCities: string[] = criteria.cities || [];

    // Query qualified businesses matching criteria
    const targets = await sql<{
      id: string;
      name: string;
      category_id: string;
      city: string;
      email: string | null;
      phone: string | null;
    }[]>`
      SELECT id, name, category_id, city, email, phone
      FROM businesses
      WHERE (email IS NOT NULL OR phone IS NOT NULL)
        AND (${targetCities.length === 0} OR city = ANY(${targetCities}))
      LIMIT ${maxTargets};
    `;

    let dispatchedDryRun = 0;
    let suppressed = 0;

    for (const target of targets) {
      const recipientAddress = target.email || target.phone || '';
      const channel = target.email ? 'EMAIL' : 'SMS';

      const caslCheck = await caslEngine.evaluateEligibility({
        recipientAddress,
        channelType: channel,
        recipientBusinessCategory: target.category_id,
        offeringTopic: criteria.offeringTopic || 'Commercial Partnership & Intelligence',
        senderOrganization: campaign.sender_identity || 'Ontario Intelligence Ventures',
        senderAddress: criteria.senderAddress || '100 King St W, Toronto, ON M5X 1A9',
        senderContact: criteria.senderContact || 'contact@intelligence.ontario.ca',
        campaignId,
      });

      if (!caslCheck.isEligible) {
        suppressed++;
        continue;
      }

      const bodyText = 
        `Hello ${target.name} team,\n\n` +
        `We are researching commercial growth indicators for ${target.category_id} businesses in ${target.city}. ` +
        `We identified an opportunity regarding ${criteria.offeringTopic || 'operational scaling'}.\n` +
        caslCheck.mandatoryFooterText;

      const messageId = `msg_${crypto.randomUUID()}`;
      await sql`
        INSERT INTO outreach_messages (
          id, campaign_id, business_id, channel, recipient_address,
          subject, body_text, is_dry_run, dispatch_status, provider_message_id,
          casl_exemption_record, dispatched_at
        ) VALUES (
          ${messageId}, ${campaignId}, ${target.id}, ${channel}, ${recipientAddress},
          ${`Opportunity Research: ${target.name}`}, ${bodyText}, true,
          'DELIVERED', ${`mock_prov_${messageId.slice(0, 16)}`},
          ${JSON.stringify({
            basis: caslCheck.consentBasis,
            evidence: caslCheck.evidenceNotes,
          })}::jsonb,
          NOW()
        );
      `;
      dispatchedDryRun++;
    }

    return {
      evaluated: targets.length,
      dispatchedDryRun,
      suppressed,
      eligibleRatePct: targets.length > 0 
        ? Math.round((dispatchedDryRun / targets.length) * 100) 
        : 0,
    };
  }

  async toggleKillSwitch(campaignId: string, active: boolean): Promise<void> {
    await sql`
      UPDATE outreach_campaigns SET kill_switch_active = ${active}
      WHERE id = ${campaignId};
    `;
  }
}

export const marketingOutreachModule = new MarketingOutreachModule();
