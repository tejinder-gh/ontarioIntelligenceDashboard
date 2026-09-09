import { describe, it, expect } from 'bun:test';
import { sql } from '../src/db/index.js';

describe('T-010 — Dedicated "Not Enough Data" & Insight Request Persistence Engine Suite', () => {
  it('AC1 & AC2: persists an insight request into requested_insights', async () => {
    // Insert a test demand signal
    const testReq = {
      geographyId: 'CSD_waterloo',
      geographyName: 'Waterloo',
      metricId: 'commercial_rent_retail_net',
      metricName: 'Average Retail Asking Net Rent',
      module: 'RealEstate',
      businessCategory: 'pizza_store',
      userContext: 'Evaluating a franchise expansion in Uptown Waterloo',
      userEmail: 'investor@example.com'
    };

    // Clean up any test artifact first
    await sql`DELETE FROM requested_insights WHERE geography_id = 'CSD_waterloo' AND metric_id = 'commercial_rent_retail_net';`;

    const [created] = await sql`
      INSERT INTO requested_insights (
        geography_id, geography_name, metric_id, metric_name, module, 
        business_category, user_context, user_email
      )
      VALUES (
        ${testReq.geographyId}, ${testReq.geographyName}, ${testReq.metricId}, ${testReq.metricName}, ${testReq.module},
        ${testReq.businessCategory}, ${testReq.userContext}, ${testReq.userEmail}
      )
      RETURNING *;
    `;

    expect(created).toBeDefined();
    expect(created.geography_id).toBe('CSD_waterloo');
    expect(created.metric_id).toBe('commercial_rent_retail_net');
    expect(created.request_count).toBe(1);
    expect(created.status).toBe('PENDING');
  });

  it('AC2: increments request_count on repeat demand for identical insight', async () => {
    // Query existing record
    const [existing] = await sql`
      SELECT id, request_count 
      FROM requested_insights 
      WHERE geography_id = 'CSD_waterloo' AND metric_id = 'commercial_rent_retail_net';
    `;
    expect(existing).toBeDefined();

    // Increment request_count
    const [updated] = await sql`
      UPDATE requested_insights 
      SET request_count = request_count + 1,
          last_requested_at = NOW()
      WHERE id = ${existing.id}
      RETURNING *;
    `;

    expect(Number(updated.request_count)).toBe(2);
  });

  it('AC3: queries aggregate priorities to guide future upstream ingestion', async () => {
    const summary = await sql`
      SELECT module, count(*) as unique_requests, sum(request_count) as total_demand_signals
      FROM requested_insights
      GROUP BY module
      ORDER BY total_demand_signals DESC;
    `;

    expect(summary.length).toBeGreaterThan(0);
    const reSummary = summary.find(s => s.module === 'RealEstate');
    expect(reSummary).toBeDefined();
    expect(Number(reSummary.total_demand_signals)).toBeGreaterThanOrEqual(2);
  });
});
