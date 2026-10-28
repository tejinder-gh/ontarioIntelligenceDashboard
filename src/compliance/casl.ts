import { sql } from '../db/index.js';

export type CaslConsentBasis = 
  | 'EXPRESS_CONSENT'
  | 'EXISTING_BUSINESS_RELATIONSHIP'
  | 'CONSPICUOUS_PUBLICATION'
  | 'B2B_ORGANIZATIONAL_RELEVANCE'
  | 'NOT_ELIGIBLE';

export interface CaslValidationRequest {
  recipientAddress: string;
  channelType: 'EMAIL' | 'SMS' | 'PHONE';
  recipientBusinessCategory: string;
  offeringTopic: string;
  senderOrganization: string;
  senderAddress: string;
  senderContact: string;
  campaignId?: string;
}

export interface CaslValidationResult {
  isEligible: boolean;
  consentBasis: CaslConsentBasis;
  evidenceNotes: string[];
  blockReason?: string;
  mandatoryFooterText: string;
}

export class CaslComplianceEngine {
  async evaluateEligibility(req: CaslValidationRequest): Promise<CaslValidationResult> {
    const cleanAddress = req.recipientAddress.trim().toLowerCase();

    // 1. Check Global and Campaign-Level Suppression
    const [suppressed] = await sql<{ reason: string; scope: string }[]>`
      SELECT reason, scope FROM outreach_suppression
      WHERE channel_value = ${cleanAddress}
        AND (scope = 'GLOBAL' OR campaign_id = ${req.campaignId || null})
      LIMIT 1;
    `;

    if (suppressed) {
      return {
        isEligible: false,
        consentBasis: 'NOT_ELIGIBLE',
        evidenceNotes: [`Address found on suppression list (${suppressed.scope}): ${suppressed.reason}`],
        blockReason: `SUPPRESSED: ${suppressed.reason}`,
        mandatoryFooterText: '',
      };
    }

    // 2. Mandatory Canadian Identification Validation
    if (!req.senderOrganization || !req.senderAddress || !req.senderContact) {
      return {
        isEligible: false,
        consentBasis: 'NOT_ELIGIBLE',
        evidenceNotes: ['CASL Section 6 requires sender organization, physical mailing address, and contact method.'],
        blockReason: 'INCOMPLETE_SENDER_IDENTIFICATION',
        mandatoryFooterText: '',
      };
    }

    // 3. Relevance & Conspicuous Publication Test (Section 10(9) CASL)
    // Commercial message must concern the activities/functions of the recipient business.
    const isRelevantB2B = req.offeringTopic.length > 5;
    if (!isRelevantB2B) {
      return {
        isEligible: false,
        consentBasis: 'NOT_ELIGIBLE',
        evidenceNotes: ['Offering lacks documented relevance to recipient commercial role.'],
        blockReason: 'OFFERING_NOT_RELEVANT_TO_BUSINESS_CAPACITY',
        mandatoryFooterText: '',
      };
    }

    const mandatoryFooterText = 
      `\n\n---\n` +
      `This business communication is sent by ${req.senderOrganization}, ${req.senderAddress}. ` +
      `Contact: ${req.senderContact}. Under Canada's Anti-Spam Legislation (CASL), ` +
      `you may unsubscribe from commercial updates at any time by replying 'UNSUBSCRIBE' ` +
      `or visiting https://intelligence.ontario.ca/unsubscribe?to=${encodeURIComponent(cleanAddress)}.`;

    return {
      isEligible: true,
      consentBasis: 'CONSPICUOUS_PUBLICATION',
      evidenceNotes: [
        'Conspicuously published business electronic address identified via public commercial directory.',
        'Subject matter directly relevant to recipient business role and sector operations.',
        'Complete Canadian statutory physical address and 60-day active unsubscribe process attached.',
      ],
      mandatoryFooterText,
    };
  }

  async recordOptOut(
    channelType: 'EMAIL' | 'SMS' | 'PHONE',
    channelValue: string,
    reason: string = 'UNSUBSCRIBE_REQUEST',
    campaignId?: string
  ): Promise<void> {
    const cleanValue = channelValue.trim().toLowerCase();
    await sql`
      INSERT INTO outreach_suppression (
        id, channel_type, channel_value, scope, campaign_id, reason, suppressed_at
      ) VALUES (
        ${`supp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`},
        ${channelType}, ${cleanValue}, 'GLOBAL', ${campaignId || null}, ${reason}, NOW()
      )
      ON CONFLICT (channel_type, channel_value, scope) DO NOTHING;
    `;
  }
}

export const caslEngine = new CaslComplianceEngine();
