import { describe, it, expect } from 'bun:test';
import { sql } from '../src/db/index.js';
import { app } from '../src/server/app.js';
import { ingestMunicipalOfficialPlans } from '../src/ingestion/adapters/muni-official-plans.js';

describe('T-017 — Municipal Expansion & Official Plans (Requirement 13)', () => {
  it('AC1: municipal_planning_initiatives table exists and contains authentic records', async () => {
    await ingestMunicipalOfficialPlans();

    const countRes = await sql`
      SELECT COUNT(*)::int as cnt FROM municipal_planning_initiatives;
    `;
    expect(countRes[0].cnt).toBeGreaterThanOrEqual(10);
  });

  it('AC2: verifies Burlington official plan initiatives with source documents and page references', async () => {
    const burlPlans = await sql`
      SELECT * FROM municipal_planning_initiatives
      WHERE geography_id = 'CSD_burlington'
      ORDER BY target_completion_year ASC;
    `;

    expect(burlPlans.length).toBeGreaterThanOrEqual(4);
    
    // Verify Fairview GO MTSA
    const fairview = burlPlans.find(p => p.title.includes('Fairview GO'));
    expect(fairview).toBeDefined();
    expect(fairview.initiative_category).toBe('INTENSIFICATION_AREA');
    expect(Number(fairview.housing_units_targeted)).toBe(7500);
    expect(fairview.source_document).toContain('City of Burlington Official Plan');
    expect(fairview.source_page_ref).toContain('Section 8.1.1');

    // Verify Alton North Industrial Expansion
    const alton = burlPlans.find(p => p.title.includes('Alton North'));
    expect(alton).toBeDefined();
    expect(alton.initiative_category).toBe('INDUSTRIAL_EXPANSION');
    expect(Number(alton.commercial_sqft_targeted)).toBe(1800000);
  });

  it('AC3: verifies multi-city coverage across GTA and major Ontario hubs', async () => {
    const geos = await sql`
      SELECT DISTINCT geography_id FROM municipal_planning_initiatives;
    `;
    const geoIds = geos.map(g => g.geography_id);
    expect(geoIds).toContain('CSD_burlington');
    expect(geoIds).toContain('CSD_oakville');
    expect(geoIds).toContain('CSD_milton');
    expect(geoIds).toContain('CSD_toronto');
    expect(geoIds).toContain('CSD_mississauga');
    expect(geoIds).toContain('CSD_ottawa');
  });

  it('AC4: /api/geographies/:id/planning-initiatives returns structured summary and filtered initiatives', async () => {
    const server = app.listen(0);
    const port = (server.address() as any).port;

    try {
      const res = await fetch(`http://localhost:${port}/api/geographies/CSD_burlington/planning-initiatives`);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.cityId).toBe('CSD_burlington');
      expect(data.summary).toBeDefined();
      expect(data.summary.totalInitiatives).toBeGreaterThanOrEqual(4);
      expect(data.summary.totalResidentialUnitsPlanned).toBeGreaterThan(5000);
      expect(Array.isArray(data.initiatives)).toBe(true);
      expect(data.initiatives.length).toBeGreaterThanOrEqual(4);

      // Filter query param check
      const filterRes = await fetch(`http://localhost:${port}/api/geographies/CSD_burlington/planning-initiatives?category=INTENSIFICATION_AREA`);
      expect(filterRes.status).toBe(200);
      const filterData = await filterRes.json();
      expect(filterData.initiatives.every((i: any) => i.initiative_category === 'INTENSIFICATION_AREA')).toBe(true);
    } finally {
      server.close();
    }
  });

  it('AC5: returns appropriate empty state for un-ingested small CSDs without throwing', async () => {
    const server = app.listen(0);
    const port = (server.address() as any).port;

    try {
      const res = await fetch(`http://localhost:${port}/api/geographies/CSD_3501005/planning-initiatives`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.summary.totalInitiatives).toBe(0);
      expect(data.initiatives.length).toBe(0);
    } finally {
      server.close();
    }
  });
});
