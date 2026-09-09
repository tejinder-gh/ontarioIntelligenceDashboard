import { describe, it, expect, beforeAll } from 'bun:test';
import { app } from '../src/server/app.js';

describe('Location Feasibility Dossier API (CPO-1, CFO-1, T-008)', () => {
  let server: any;
  let baseUrl: string;

  beforeAll(async () => {
    server = app.listen(0);
    const port = (server.address() as any).port;
    baseUrl = `http://localhost:${port}`;
  });

  it('generates an authoritative feasibility dossier for Burlington pizza store', async () => {
    const res = await fetch(`${baseUrl}/api/dossier/CSD_burlington/pizza_store`);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();

    const d = json.data;
    expect(d.status).toBe('VERIFIED_AUTHORITATIVE');
    expect(d.geography.name).toBe('Burlington');
    expect(d.category.id).toBe('pizza_store');

    // Demographics
    expect(d.demographics.population).toBe(186948);
    expect(d.demographics.medianHouseholdIncome).toBeGreaterThan(0);

    // Business Counts Table 33-10-1097-01
    expect(d.businessCountsTable33).toBeDefined();
    expect(d.businessCountsTable33.total_establishments).toBeGreaterThan(0);

    // Unit Economics
    expect(d.unitEconomics).toBeDefined();
    expect(Number(d.unitEconomics.median_annual_revenue)).toBeGreaterThan(0);

    // Citations
    expect(Array.isArray(d.citations)).toBe(true);
    expect(d.citations.length).toBeGreaterThan(1);
  });

  it('returns 404 for unknown city or unknown category', async () => {
    const resCity = await fetch(`${baseUrl}/api/dossier/CSD_nonexistent_city/pizza_store`);
    expect(resCity.status).toBe(404);

    const resCat = await fetch(`${baseUrl}/api/dossier/CSD_burlington/unknown_category_xyz`);
    expect(resCat.status).toBe(404);
  });
});
