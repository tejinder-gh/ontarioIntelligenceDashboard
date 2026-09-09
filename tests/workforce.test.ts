import { describe, it, expect, beforeAll } from 'bun:test';
import { app } from '../src/server/app.js';

describe('T-021 — Workforce Module Deepening & Occupational Location Quotient (Requirement 23)', () => {
  let server: any;
  let baseUrl: string;

  beforeAll(() => {
    server = app.listen(0);
    const port = (server.address() as any).port;
    baseUrl = `http://localhost:${port}`;
  });

  it('AC1: /api/geographies/:id/workforce returns authentic NOC occupations and NAICS industries', async () => {
    const res = await fetch(`${baseUrl}/api/geographies/CSD_burlington/workforce`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.geographyId).toBe('CSD_burlington');
    expect(data.participationRate).toBeGreaterThan(60);
    expect(data.unemploymentRate).toBeGreaterThan(3);
    expect(Array.isArray(data.topOccupations)).toBe(true);
    expect(Array.isArray(data.topIndustries)).toBe(true);
    expect(data.topOccupations.length).toBeGreaterThanOrEqual(8);
    expect(data.topIndustries.length).toBeGreaterThanOrEqual(8);
  });

  it('AC2: calculates empirical Location Quotient (LQ) against Ontario benchmark (PR_35)', async () => {
    const res = await fetch(`${baseUrl}/api/geographies/CSD_burlington/workforce`);
    const data = await res.json();

    expect(data.summary).toBeDefined();
    expect(data.summary.hasBenchmarkAvailable).toBe(true);

    const occ = data.topOccupations[0];
    expect(occ.locationQuotient).toBeDefined();
    expect(occ.locationQuotient).toBeGreaterThan(0);
    expect(occ.ontarioBenchmarkPct).toBeDefined();
    expect(occ.ontarioBenchmarkPct).toBeGreaterThan(0);
    expect(occ.concentrationStatus).toBeDefined();

    // Verify mathematical relation: LQ = localPct / benchmarkPct
    const expectedLQ = Number((occ.percentage_of_workforce / occ.ontarioBenchmarkPct).toFixed(2));
    expect(occ.locationQuotient).toBe(expectedLQ);
  });

  it('AC3: identifies specialized talent clusters (LQ >= 1.20)', async () => {
    const res = await fetch(`${baseUrl}/api/geographies/CSD_burlington/workforce`);
    const data = await res.json();

    const clusters = data.topOccupations.filter((o: any) => o.locationQuotient >= 1.20);
    expect(clusters.length).toBeGreaterThan(0);
    expect(clusters.every((c: any) => c.concentrationStatus === 'HIGH_CONCENTRATION')).toBe(true);
  });

  it('AC4: returns median employment income and calculates wage delta vs Ontario benchmark', async () => {
    const res = await fetch(`${baseUrl}/api/geographies/CSD_burlington/workforce`);
    const data = await res.json();

    const trades = data.topOccupations.find((o: any) => o.code === 'NOC_7');
    expect(trades).toBeDefined();
    expect(trades.median_employment_income).toBeGreaterThan(50000);
    expect(trades.ontarioMedianIncome).toBeDefined();
    expect(trades.wageDeltaVsBenchmark).toBeDefined();

    // Verify delta calculation
    expect(trades.wageDeltaVsBenchmark).toBe(trades.median_employment_income - trades.ontarioMedianIncome);
  });

  it('AC5: supports search query filtering by occupation or industry keyword', async () => {
    const res = await fetch(`${baseUrl}/api/geographies/CSD_burlington/workforce?search=health`);
    const data = await res.json();

    expect(data.topOccupations.length).toBeGreaterThan(0);
    expect(data.topOccupations.every((o: any) => o.label.toLowerCase().includes('health') || o.code.toLowerCase().includes('health'))).toBe(true);

    server.close();
  });
});
