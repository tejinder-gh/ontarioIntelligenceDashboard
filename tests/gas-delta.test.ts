import { describe, it, expect } from 'bun:test';
import { sql } from '../src/db/index.js';

describe('T-013 — Retail Fuel Pricing & Gas Price Delta Engine Suite', () => {
  it('AC1: persists monthly fuel prices with Toronto benchmark comparison', async () => {
    const rows = await sql`
      SELECT geography_id, reference_month, price_cents_per_litre, toronto_benchmark_cents, absolute_delta_cents, delta_pct
      FROM fuel_prices
      WHERE geography_id = 'CSD_burlington'
      ORDER BY reference_month DESC
      LIMIT 1;
    `;

    expect(rows.length).toBe(1);
    const latest = rows[0];
    expect(Number(latest.price_cents_per_litre)).toBeGreaterThan(100); // > $1.00/L
    expect(Number(latest.toronto_benchmark_cents)).toBeGreaterThan(100);
    expect(latest.reference_month).toBeDefined();
  });

  it('AC2: calculates exact mathematical delta and percentage vs Toronto', async () => {
    const [row] = await sql`
      SELECT price_cents_per_litre, toronto_benchmark_cents, absolute_delta_cents, delta_pct
      FROM fuel_prices
      WHERE geography_id = 'CSD_burlington'
      ORDER BY reference_month DESC
      LIMIT 1;
    `;

    const localPrice = Number(row.price_cents_per_litre);
    const torontoPrice = Number(row.toronto_benchmark_cents);
    const expectedDelta = parseFloat((localPrice - torontoPrice).toFixed(2));
    const expectedPct = parseFloat(((expectedDelta / torontoPrice) * 100).toFixed(2));

    expect(Number(row.absolute_delta_cents)).toBeCloseTo(expectedDelta, 2);
    expect(Number(row.delta_pct)).toBeCloseTo(expectedPct, 2);
  });

  it('AC3: covers all Ontario municipalities in the fuel_prices ledger', async () => {
    const [distinctGeos] = await sql`
      SELECT count(DISTINCT geography_id) as count FROM fuel_prices;
    `;

    expect(Number(distinctGeos.count)).toBeGreaterThanOrEqual(440);
  });
});
