import { Router, type Response } from 'express';
import { vcIntelligenceService } from '../analytics/vc-intelligence-service.js';

export const vcRouter = Router();

const sanitizeError = (res: Response, logPrefix: string, err: unknown) => {
  console.error(`[VC API] ${logPrefix}:`, err);
  res.status(500).json({ success: false, error: 'Internal server error while querying venture capital telemetry' });
};

// 1. Ecosystem Overview & Macro Telemetry
vcRouter.get('/summary', async (_req, res) => {
  try {
    const summary = await vcIntelligenceService.getEcosystemSummary();
    res.json({ success: true, data: summary });
  } catch (err: unknown) {
    sanitizeError(res, 'Error fetching VC ecosystem summary', err);
  }
});

// 2. Institutional VC Firms Directory with Filters
vcRouter.get('/firms', async (req, res) => {
  try {
    const { stage, sector, country, query } = req.query;
    const firms = await vcIntelligenceService.getFirms({
      stage: stage as string,
      sector: sector as string,
      country: country as string,
      query: query as string,
    });
    res.json({ success: true, count: firms.length, data: firms });
  } catch (err: unknown) {
    sanitizeError(res, 'Error fetching VC firms', err);
  }
});

// 3. Single Firm Dossier
vcRouter.get('/firms/:id', async (req, res) => {
  try {
    const firm = await vcIntelligenceService.getFirmDetails(req.params.id);
    if (!firm) {
      res.status(404).json({ success: false, error: 'Firm not found' });
      return;
    }
    res.json({ success: true, data: firm });
  } catch (err: unknown) {
    sanitizeError(res, 'Error fetching firm details', err);
  }
});

// 4. Portfolio Deals & Rounds Ledger
vcRouter.get('/deals', async (req, res) => {
  try {
    const { companyId, stage, country } = req.query;
    const deals = await vcIntelligenceService.getDeals({
      companyId: companyId as string,
      stage: stage as string,
      country: country as string,
    });
    res.json({ success: true, count: deals.length, data: deals });
  } catch (err: unknown) {
    sanitizeError(res, 'Error fetching VC deals', err);
  }
});

// 5. Taxonomy & Sector Breakdown
vcRouter.get('/sectors', async (_req, res) => {
  try {
    const sectors = await vcIntelligenceService.getSectors();
    res.json({ success: true, count: sectors.length, data: sectors });
  } catch (err: unknown) {
    sanitizeError(res, 'Error fetching VC sectors', err);
  }
});

// 6. Multi-Factor Investor Matching & Fit Scoring Engine
vcRouter.post('/fit-score', async (req, res) => {
  try {
    const input = req.body || {};
    const matches = await vcIntelligenceService.calculateInvestorFit(input);
    res.json({
      success: true,
      input,
      totalEvaluated: matches.length,
      topMatches: matches.slice(0, 10),
      allMatches: matches,
    });
  } catch (err: unknown) {
    sanitizeError(res, 'Error calculating investor fit', err);
  }
});

// 7. Syndication Network & LP Commitments Graph
vcRouter.get('/syndication', async (_req, res) => {
  try {
    const graph = await vcIntelligenceService.getSyndicationGraph();
    res.json({ success: true, data: graph });
  } catch (err: unknown) {
    sanitizeError(res, 'Error fetching syndication graph', err);
  }
});

// 8. Market Activity Signals Telemetry
vcRouter.get('/signals', async (_req, res) => {
  try {
    const signals = await vcIntelligenceService.getSignals();
    res.json({ success: true, count: signals.length, data: signals });
  } catch (err: unknown) {
    sanitizeError(res, 'Error fetching investor signals', err);
  }
});

// 9. Regional Venture Capital Availability for an Ontario City
vcRouter.get('/regional/:city', async (req, res) => {
  try {
    const regional = await vcIntelligenceService.getRegionalVCSummary(req.params.city);
    res.json({ success: true, data: regional });
  } catch (err: unknown) {
    sanitizeError(res, 'Error fetching regional VC summary', err);
  }
});
