import { describe, it, expect, beforeAll } from 'bun:test';
import { app } from '../src/server/app.js';

describe('T-024 — Empirical Data Coverage Engine (Requirement 38)', () => {
  let server: any;
  let baseUrl: string;

  beforeAll(async () => {
    server = app.listen(0);
    const port = (server.address() as any).port;
    baseUrl = `http://localhost:${port}`;
  });

  it('AC1: /api/geographies/:id/coverage returns empirical coverage across all 8 mandatory dimensions', async () => {
    const res = await fetch(`${baseUrl}/api/geographies/CSD_burlington/coverage`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.geographyId).toBe('CSD_burlington');
    expect(data.cityName).toBe('Burlington');
    expect(data.overallCoveragePct).toBeGreaterThan(0);
    expect(['HIGH', 'MEDIUM', 'LOW']).toContain(data.overallConfidence);

    // Verify all 8 dimensions are present
    const { dimensions } = data;
    expect(dimensions).toBeDefined();
    expect(typeof dimensions.population).toBe('number');
    expect(typeof dimensions.demographics).toBe('number');
    expect(typeof dimensions.income).toBe('number');
    expect(typeof dimensions.workforce).toBe('number');
    expect(typeof dimensions.municipalFinance).toBe('number');
    expect(typeof dimensions.commercialRent).toBe('number');
    expect(typeof dimensions.competitorRatings).toBe('number');
    expect(typeof dimensions.confirmedSales).toBe('number');

    // Population should be 100% since Census and POP-CSD-EST are ingested
    expect(dimensions.population).toBe(100);
  });

  it('AC2: returns detailed metrics array with human-readable labels and authoritative sources', async () => {
    const res = await fetch(`${baseUrl}/api/geographies/CSD_burlington/coverage`);
    const data = await res.json();

    expect(Array.isArray(data.metrics)).toBe(true);
    expect(data.metrics.length).toBe(8);

    const keys = data.metrics.map((m: any) => m.key);
    expect(keys).toContain('population');
    expect(keys).toContain('demographics');
    expect(keys).toContain('income');
    expect(keys).toContain('workforce');
    expect(keys).toContain('municipal_finance');
    expect(keys).toContain('commercial_rent');
    expect(keys).toContain('competitor_ratings');
    expect(keys).toContain('confirmed_sales');

    for (const m of data.metrics) {
      expect(m.label).toBeDefined();
      expect(typeof m.pct).toBe('number');
      expect(m.source).toBeDefined();
    }
  });

  it('AC3: honors authenticity rule: confirmed sales transaction coverage reflects audited closings, never simulated asking prices', async () => {
    const res = await fetch(`${baseUrl}/api/geographies/CSD_burlington/coverage`);
    const data = await res.json();

    // Confirmed sales should be strictly audited deeds, not inflated by unverified asking listings
    expect(data.dimensions.confirmedSales).toBeLessThanOrEqual(50);
    expect(data.auditNotice).toContain('Asking prices and simulated estimates are never treated as verified observations');
  });

  it('AC4: supports case-insensitive city name lookup in coverage API', async () => {
    const res = await fetch(`${baseUrl}/api/geographies/burlington/coverage`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.cityName).toBe('Burlington');
  });

  it('AC5: returns 404 for non-existent geography', async () => {
    const res = await fetch(`${baseUrl}/api/geographies/CSD_nonexistent_place/coverage`);
    expect(res.status).toBe(404);
  });
});
