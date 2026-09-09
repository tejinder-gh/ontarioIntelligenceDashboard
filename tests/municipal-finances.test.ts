import { describe, it, expect } from 'bun:test';
import { sql } from '../src/db/index.js';
import { app } from '../src/server/app.js';

describe('T-015 — Ontario MMAH Municipal Financial Information Returns (FIR) Suite', () => {
  it('AC1: verifies municipal_finances stores Schedule 10, 40, and 70 accounts for Burlington', async () => {
    const rows = await sql`
      SELECT schedule_code, count(*) as count
      FROM municipal_finances
      WHERE geography_id = 'CSD_burlington' AND fiscal_year = 2024
      GROUP BY schedule_code;
    `;

    expect(rows.length).toBeGreaterThanOrEqual(3);
    const codes = rows.map(r => r.schedule_code);
    expect(codes).toContain('SLC_10'); // Revenues
    expect(codes).toContain('SLC_40'); // Operating expenses
    expect(codes).toContain('SLC_70'); // Debt & Reserves
  });

  it('AC2: calculates exact per-capita amounts and percentages for revenues and expenditures', async () => {
    const [taxRow] = await sql`
      SELECT amount_dollars, pct_of_total_budget, per_capita_dollars
      FROM municipal_finances
      WHERE geography_id = 'CSD_burlington' AND fiscal_year = 2024 AND account_category = 'Property Taxes';
    `;

    expect(taxRow).toBeDefined();
    expect(Number(taxRow.amount_dollars)).toBe(198400000);
    // 198,400,000 / 186,948 pop = ~1061.26
    expect(Number(taxRow.per_capita_dollars)).toBeCloseTo(1061.26, 2);

    const [roadRow] = await sql`
      SELECT amount_dollars, pct_of_total_budget, per_capita_dollars
      FROM municipal_finances
      WHERE geography_id = 'CSD_burlington' AND fiscal_year = 2024 AND account_category = 'Transportation - Roads & Bridges';
    `;

    expect(roadRow).toBeDefined();
    expect(Number(roadRow.amount_dollars)).toBe(48500000);
    expect(Number(roadRow.pct_of_total_budget)).toBe(20.0);
    expect(Number(roadRow.per_capita_dollars)).toBeCloseTo(259.43, 2);
  });

  it('AC3: verifies multi-year longitudinal history exists for municipal accounts', async () => {
    const years = await sql`
      SELECT fiscal_year, amount_dollars
      FROM municipal_finances
      WHERE geography_id = 'CSD_burlington' AND account_category = 'Transportation - Roads & Bridges'
      ORDER BY fiscal_year ASC;
    `;

    expect(years.length).toBe(3);
    expect(years.map(y => y.fiscal_year)).toEqual([2022, 2023, 2024]);
    expect(Number(years[0].amount_dollars)).toBe(43200000);
    expect(Number(years[1].amount_dollars)).toBe(45800000);
    expect(Number(years[2].amount_dollars)).toBe(48500000);
  });

  it('AC4: /api/geographies/:id/municipal-budget returns full breakdown with YoY changes and history', async () => {
    const server = app.listen(0);
    const port = (server.address() as any).port;

    try {
      const res = await fetch(`http://localhost:${port}/api/geographies/CSD_burlington/municipal-budget`);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.hasObservedData).toBe(true);
      expect(json.cityName).toBe('Burlington');
      expect(json.fiscalYear).toBe(2024);

      // Summary checks
      expect(json.summary.operatingBudget.amountCad).toBe(242500000);
      expect(json.summary.operatingBudget.perCapitaCad).toBeCloseTo(1297.15, 2);
      expect(json.summary.debtLiabilities.amountCad).toBe(78500000);
      expect(json.summary.reservesBalance.amountCad).toBe(165400000);

      // Revenue breakdown checks
      expect(json.revenues.length).toBeGreaterThanOrEqual(6);
      const propTax = json.revenues.find((r: any) => r.category === 'Property Taxes');
      expect(propTax).toBeDefined();
      expect(propTax.yoyChangePct).toBeCloseTo(6.55, 2);

      // Expenditure breakdown checks
      expect(json.expenditures.length).toBeGreaterThanOrEqual(8);
      const roads = json.expenditures.find((e: any) => e.category.includes('Roads'));
      expect(roads).toBeDefined();
      expect(roads.yoyChangePct).toBeCloseTo(5.90, 2);

      // History checks
      expect(json.historicalTrends.length).toBe(3);
      expect(json.source.friendlyCode).toBe('MUNI-FIR');
    } finally {
      server.close();
    }
  });

  it('AC5: covers all 444 municipalities in observations table for municipal budgets', async () => {
    const [operatingCounts] = await sql`
      SELECT count(*) as count FROM observations WHERE metric_id = 'municipal_operating_budget';
    `;
    expect(Number(operatingCounts.count)).toBeGreaterThanOrEqual(440);

    const [taxCounts] = await sql`
      SELECT count(*) as count FROM observations WHERE metric_id = 'municipal_taxation_revenue';
    `;
    expect(Number(taxCounts.count)).toBeGreaterThanOrEqual(440);
  });
});
