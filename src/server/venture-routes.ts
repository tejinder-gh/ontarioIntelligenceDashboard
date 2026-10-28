import { Router, Request, Response } from 'express';
import { sql } from '../db/index.js';
import { ventureRegistry } from '../ventures/registry.js';
import { marketingOutreachModule } from '../ventures/modules/marketing/index.js';
import { acuityGateway } from '../integrations/acuity.js';
import { caslEngine } from '../compliance/casl.js';
import { durableQueue } from '../jobs/queue.js';

export const ventureRouter = Router();

// 1. List Registered Venture Modules
ventureRouter.get('/modules', async (_req: Request, res: Response) => {
  try {
    await ventureRegistry.syncWithDatabase();
    const modules = ventureRegistry.listModules().map((m) => ({
      id: m.id,
      name: m.name,
      version: m.version,
      description: m.description,
      supportedWorkflows: m.supportedWorkflows,
    }));
    res.json({ success: true, modules });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Qualify Business Against Venture Module
ventureRouter.post('/qualify', async (req: Request, res: Response) => {
  try {
    const { venture_id = 'marketing_outreach', business_id } = req.body;
    const mod = ventureRegistry.get(venture_id);
    if (!mod) {
      return res.status(404).json({ success: false, error: `Venture module '${venture_id}' not found.` });
    }

    const [biz] = await sql`
      SELECT id, name, category_id, city, 'ON' as province, phone, email, website, is_chain, quality_score, tags
      FROM businesses
      WHERE id = ${business_id};
    `;

    if (!biz) {
      return res.status(404).json({ success: false, error: 'Business location not found.' });
    }

    const qualification = mod.qualifyBusiness({
      id: biz.id,
      name: biz.name,
      categoryId: biz.category_id,
      city: biz.city,
      province: biz.province,
      phone: biz.phone,
      email: biz.email,
      website: biz.website,
      isChain: biz.is_chain,
      qualityScore: Number(biz.quality_score),
      tags: biz.tags || {},
    });

    // Record or update venture_targets association
    await sql`
      INSERT INTO venture_targets (
        id, venture_id, business_id, qualification_status,
        qualification_score, qualification_hypotheses, opportunity_signals, enriched_at
      ) VALUES (
        ${`tgt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`},
        ${venture_id}, ${business_id},
        ${qualification.isQualified ? 'QUALIFIED' : 'DISQUALIFIED'},
        ${qualification.score},
        ${JSON.stringify(qualification.hypotheses)}::jsonb,
        ${JSON.stringify(qualification.signals)}::jsonb,
        NOW()
      )
      ON CONFLICT (venture_id, business_id) DO UPDATE SET
        qualification_status = EXCLUDED.qualification_status,
        qualification_score = EXCLUDED.qualification_score,
        qualification_hypotheses = EXCLUDED.qualification_hypotheses,
        opportunity_signals = EXCLUDED.opportunity_signals,
        enriched_at = NOW();
    `;

    res.json({ success: true, qualification });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Campaigns List
ventureRouter.get('/campaigns', async (_req: Request, res: Response) => {
  try {
    const campaigns = await sql`
      SELECT 
        c.*,
        (SELECT count(*) FROM outreach_messages m WHERE m.campaign_id = c.id) as total_messages,
        (SELECT count(*) FROM outreach_messages m WHERE m.campaign_id = c.id AND m.dispatch_status = 'DELIVERED') as delivered_messages
      FROM outreach_campaigns c
      ORDER BY c.created_at DESC;
    `;
    res.json({ success: true, campaigns });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Create Campaign
ventureRouter.post('/campaigns', async (req: Request, res: Response) => {
  try {
    const {
      name,
      targetCategories = [],
      targetCities = [],
      offeringTopic = 'Commercial Opportunity Analysis',
      senderOrganization = 'Ontario Commercial Intelligence',
      senderAddress = '100 King St W, Suite 5600, Toronto, ON M5X 1C9',
      senderContact = 'compliance@intelligence.ontario.ca',
      dailySendCap = 50,
      budgetCapCad = 0.0,
    } = req.body;

    const campaignId = await marketingOutreachModule.createCampaign({
      name,
      targetCategories,
      targetCities,
      offeringTopic,
      senderOrganization,
      senderAddress,
      senderContact,
      dailySendCap: Number(dailySendCap),
      budgetCapCad: Number(budgetCapCad),
    });

    res.json({ success: true, campaignId });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Campaign Activation Gate (Approve)
ventureRouter.post('/campaigns/:id/approve', async (req: Request, res: Response) => {
  try {
    const campaignId = String(req.params.id);
    const { approvedBy = 'CHIEF_COMPLIANCE_OFFICER', executionMode = 'DRY_RUN' } = req.body;
    await marketingOutreachModule.approveCampaign(campaignId, approvedBy, executionMode);
    res.json({ success: true, message: `Campaign approved in ${executionMode} mode.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Campaign Dry-Run Execution
ventureRouter.post('/campaigns/:id/dry-run', async (req: Request, res: Response) => {
  try {
    const campaignId = String(req.params.id);
    const { maxTargets = 25 } = req.body;
    const result = await marketingOutreachModule.executeDryRunSequence(campaignId, Number(maxTargets));
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Toggle Kill Switch
ventureRouter.post('/campaigns/:id/kill-switch', async (req: Request, res: Response) => {
  try {
    const campaignId = String(req.params.id);
    const { active = true } = req.body;
    await marketingOutreachModule.toggleKillSwitch(campaignId, Boolean(active));
    res.json({ success: true, killSwitchActive: Boolean(active) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Stage Acuity Voice Job
ventureRouter.post('/voice-jobs', async (req: Request, res: Response) => {
  try {
    const { campaignId, businessId, targetPhone, leadName, businessName } = req.body;
    const response = await acuityGateway.stageVoiceCallJob({
      campaignId,
      businessId,
      targetPhone,
      leadName,
      businessName,
    });
    res.json({ success: true, ...response });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. CASL Opt-Out / Unsubscribe
ventureRouter.post('/suppression', async (req: Request, res: Response) => {
  try {
    const { channelType = 'EMAIL', channelValue, reason = 'UNSUBSCRIBE_REQUEST', campaignId } = req.body;
    if (!channelValue) {
      return res.status(400).json({ success: false, error: 'Channel value is required.' });
    }
    await caslEngine.recordOptOut(channelType, channelValue, reason, campaignId);
    res.json({ success: true, message: 'Address successfully added to suppression ledger.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Durable Queue Stats
ventureRouter.get('/jobs/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await durableQueue.getStats();
    res.json({ success: true, stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
