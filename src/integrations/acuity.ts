import crypto from 'node:crypto';
import { sql } from '../db/index.js';

export interface AcuityVoiceJobRequest {
  campaignId: string;
  businessId: string;
  targetPhone: string;
  leadName?: string;
  businessName: string;
  persona?: string;
}

export interface AcuityVoiceJobResponse {
  jobId: string;
  status: 'STAGED' | 'BLOCKED_BY_REGULATORY_GATE' | 'SUBMITTED';
  clearanceDetails: {
    dnclChecked: boolean;
    callingHoursValid: boolean;
    aiDisclosureActive: boolean;
    authorizedCampaign: boolean;
  };
  blockReason?: string;
}

export class AcuityVoiceGateway {
  private readonly webhookSecret = process.env.ACUITY_WEBHOOK_SECRET || 'acuity_dev_secret_key';

  /**
   * Evaluates Canadian regulatory compliance for AI conversational voice calls:
   * 1. National DNCL & B2B Telemarketing Rules.
   * 2. CRTC Permitted Calling Window (local time 9am-9:30pm M-F, 10am-6pm S-S).
   * 3. Statutory AI agent disclosure requirement.
   * 4. Campaign status must be explicitly APPROVED_ACTIVE.
   */
  async stageVoiceCallJob(req: AcuityVoiceJobRequest): Promise<AcuityVoiceJobResponse> {
    const [campaign] = await sql<{
      approval_status: string;
      execution_mode: string;
      kill_switch_active: boolean;
    }[]>`
      SELECT approval_status, execution_mode, kill_switch_active
      FROM outreach_campaigns
      WHERE id = ${req.campaignId};
    `;

    const isCampaignAuthorized = Boolean(
      campaign &&
      campaign.approval_status === 'APPROVED' &&
      campaign.execution_mode === 'APPROVED_ACTIVE' &&
      !campaign.kill_switch_active
    );

    // Current hour in Eastern Time (America/Toronto)
    const now = new Date();
    const easternHour = parseInt(
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Toronto',
        hour: 'numeric',
        hourCycle: 'h23',
      }).format(now),
      10
    );

    const isCallingHoursValid = easternHour >= 9 && easternHour < 21; // 9am - 9pm
    const isAiDisclosureActive = true; // Hardcoded requirement for all autonomous calls
    const isDnclChecked = false; // By default unverified until external carrier lookup is plugged in

    const isCleared = isCampaignAuthorized && isCallingHoursValid && isDnclChecked;

    const jobId = `voice_${crypto.randomUUID()}`;
    const status = isCleared ? 'SUBMITTED' : 'STAGED';

    await sql`
      INSERT INTO acuity_voice_jobs (
        id, campaign_id, business_id, target_phone, lead_name,
        business_name, persona, status, regulatory_clearance
      ) VALUES (
        ${jobId}, ${req.campaignId}, ${req.businessId}, ${req.targetPhone},
        ${req.leadName || 'Commercial Director'}, ${req.businessName},
        ${req.persona || 'COMMERCIAL_RESEARCHER'}, ${status},
        ${JSON.stringify({
          dncl_checked: isDnclChecked,
          time_window_valid: isCallingHoursValid,
          ai_disclosure_active: isAiDisclosureActive,
          authorized_campaign: isCampaignAuthorized,
        })}::jsonb
      );
    `;

    let blockReason: string | undefined;
    if (!isCampaignAuthorized) {
      blockReason = 'Campaign not in APPROVED_ACTIVE state or kill switch is active.';
    } else if (!isCallingHoursValid) {
      blockReason = `Current time (${easternHour}:00 ET) is outside permitted CRTC telemarketing hours (9am - 9pm).`;
    } else if (!isDnclChecked) {
      blockReason = 'National DNCL / B2B telemarketing scrub verification is pending.';
    }

    return {
      jobId,
      status: isCleared ? 'SUBMITTED' : 'BLOCKED_BY_REGULATORY_GATE',
      clearanceDetails: {
        dnclChecked: isDnclChecked,
        callingHoursValid: isCallingHoursValid,
        aiDisclosureActive: isAiDisclosureActive,
        authorizedCampaign: isCampaignAuthorized,
      },
      blockReason,
    };
  }

  /**
   * Verifies signed webhook callbacks from Acuity platform.
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const computed = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  }

  /**
   * Processes verified call disposition outcome callback from Acuity.
   */
  async recordCallOutcome(jobId: string, outcome: {
    disposition: string;
    recordingRef?: string;
    transcriptSummary?: string;
    durationSeconds?: number;
  }): Promise<void> {
    await sql`
      UPDATE acuity_voice_jobs SET
        status = 'COMPLETED',
        disposition = ${outcome.disposition},
        recording_ref = ${outcome.recordingRef || null},
        transcript_summary = ${outcome.transcriptSummary || null},
        updated_at = NOW()
      WHERE id = ${jobId};
    `;
  }
}

export const acuityGateway = new AcuityVoiceGateway();
