import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { app } from '../src/server/app.js';
import { vcIntelligenceService } from '../src/analytics/vc-intelligence-service.js';

describe('Venture Capital & Investor Intelligence Module Suite', () => {
  let server: any;
  let baseUrl: string;

  beforeAll(() => {
    server = app.listen(0);
    const port = (server.address() as any).port;
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(() => {
    if (server) server.close();
  });

  describe('1. Analytics Engine (vcIntelligenceService)', () => {
    it('getEcosystemSummary returns aggregate AUM and multi-dimensional distributions', async () => {
      const summary = await vcIntelligenceService.getEcosystemSummary();
      expect(summary).toBeDefined();
      expect(summary.totalFirms).toBeGreaterThanOrEqual(9);
      expect(summary.totalFunds).toBeGreaterThanOrEqual(10);
      expect(summary.totalCompanies).toBeGreaterThanOrEqual(10);
      expect(summary.totalAumUsd).toBeGreaterThan(150000000000); // > $150B
      expect(summary.totalValuationUsd).toBeGreaterThan(500000000000); // > $500B
      expect(summary.canadianFundingRaisedUsd).toBeGreaterThanOrEqual(500000000); // Cohere $500M
      expect(summary.stageDistribution.length).toBeGreaterThan(0);
      expect(summary.sectorDistribution.length).toBeGreaterThan(0);
      expect(summary.countryAllocation.length).toBeGreaterThanOrEqual(2); // Canada & US
    });

    it('getFirms supports filtering by stage, sector, country, and keyword query', async () => {
      // 1. All firms
      const allFirms = await vcIntelligenceService.getFirms();
      expect(allFirms.length).toBeGreaterThanOrEqual(9);

      // 2. Filter by country (Canada)
      const caFirms = await vcIntelligenceService.getFirms({ country: 'CA' });
      expect(caFirms.length).toBeGreaterThanOrEqual(3); // Inovia, Georgian, Version One, Radical, Golden, etc.
      const names = caFirms.map(f => f.name);
      expect(names).toContain('Inovia Capital');
      expect(names).toContain('Georgian');
      expect(names).toContain('Version One Ventures');
      expect(names).toContain('Radical Ventures');

      // 3. Filter by keyword query
      const sequoiaMatches = await vcIntelligenceService.getFirms({ query: 'Sequoia' });
      expect(sequoiaMatches.length).toBe(1);
      expect(sequoiaMatches[0].name).toBe('Sequoia Capital');

      // 4. Filter by sector
      const aiFirms = await vcIntelligenceService.getFirms({ sector: 'Artificial Intelligence' });
      expect(aiFirms.length).toBeGreaterThanOrEqual(3);
    });

    it('getFirmDetails returns enriched dossier with funds, team, and theses', async () => {
      const inovia = await vcIntelligenceService.getFirmDetails('Inovia Capital');
      expect(inovia).toBeDefined();
      expect(inovia?.name).toBe('Inovia Capital');
      expect(inovia?.city).toBe('Montreal');
      expect(inovia?.funds.length).toBeGreaterThanOrEqual(1);
      expect(inovia?.partners.length).toBeGreaterThanOrEqual(1);
      expect(inovia?.investments.length).toBeGreaterThanOrEqual(1);
      expect(inovia?.investments[0].company_name).toBe('Cohere');
    });

    it('getDeals returns portfolio rounds with post-money valuations and lead investors', async () => {
      const deals = await vcIntelligenceService.getDeals();
      expect(deals.length).toBeGreaterThanOrEqual(4);

      const cohereRound = deals.find(d => d.company_name === 'Cohere');
      expect(cohereRound).toBeDefined();
      expect(cohereRound?.round_type).toBe('series_d_plus');
      expect(Number(cohereRound?.amount_raised)).toBe(500000000);
      expect(Number(cohereRound?.post_money_valuation)).toBe(5500000000);

      const openaiRound = deals.find(d => d.company_name === 'OpenAI');
      expect(openaiRound).toBeDefined();
      expect(Number(openaiRound?.amount_raised)).toBe(6600000000);
      expect(Number(openaiRound?.post_money_valuation)).toBe(157000000000);
    });

    it('calculateInvestorFit generates ranked multi-factor scores with explainable rationales', async () => {
      const matches = await vcIntelligenceService.calculateInvestorFit({
        sector: 'Artificial Intelligence',
        stage: 'series_a',
        targetCheckSize: 15000000,
        countryCode: 'CA',
        stateProvince: 'ON',
      });

      expect(matches.length).toBeGreaterThanOrEqual(9);
      const topMatch = matches[0];
      expect(topMatch.overallScore).toBeGreaterThanOrEqual(80);
      expect(topMatch.components.sectorFit).toBeGreaterThanOrEqual(85);
      expect(topMatch.components.stageFit).toBeGreaterThanOrEqual(75);
      expect(topMatch.reasons.length).toBeGreaterThan(0);
    });

    it('getSyndicationGraph returns co-investor ties, LP commitments, and notable exits', async () => {
      const graph = await vcIntelligenceService.getSyndicationGraph();
      expect(graph.relationships.length).toBeGreaterThanOrEqual(2);
      expect(graph.commitments.length).toBeGreaterThanOrEqual(1);
      expect(graph.commitments[0].lp_name).toContain('CDPQ');
      expect(graph.exits.length).toBeGreaterThanOrEqual(2);
      const exitTickers = graph.exits.map(e => e.ticker);
      expect(exitTickers).toContain('ABNB');
      expect(exitTickers).toContain('SNOW');
    });
  });

  describe('2. REST API Endpoints (/api/vc/*)', () => {
    it('GET /api/vc/summary returns 200 OK with complete JSON telemetry', async () => {
      const res = await fetch(`${baseUrl}/api/vc/summary`);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.totalFirms).toBeGreaterThanOrEqual(9);
      expect(json.data.totalAumUsd).toBeGreaterThan(0);
    });

    it('GET /api/vc/firms returns 200 OK and responds to query filters', async () => {
      const res = await fetch(`${baseUrl}/api/vc/firms?country=CA`);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.count).toBeGreaterThanOrEqual(3);
    });

    it('GET /api/vc/deals returns 200 OK with portfolio ledger', async () => {
      const res = await fetch(`${baseUrl}/api/vc/deals`);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(4);
    });

    it('POST /api/vc/fit-score computes fit matches and returns top rankings', async () => {
      const res = await fetch(`${baseUrl}/api/vc/fit-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sector: 'Enterprise Software',
          stage: 'growth',
          targetCheckSize: 40000000,
          countryCode: 'CA',
        }),
      });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.totalEvaluated).toBeGreaterThanOrEqual(9);
      expect(json.topMatches.length).toBeGreaterThan(0);
      expect(json.topMatches[0].overallScore).toBeGreaterThan(50);
    });

    it('GET /api/vc/signals returns 200 OK with observed activity telemetry', async () => {
      const res = await fetch(`${baseUrl}/api/vc/signals`);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(2);
    });

    it('GET /api/vc/regional/Toronto returns 200 OK with regional corridor insights', async () => {
      const res = await fetch(`${baseUrl}/api/vc/regional/Toronto`);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.city).toBe('Toronto');
      expect(json.data.activeDomesticInvestors).toBeGreaterThanOrEqual(3);
    });
  });
});
