import { describe, it, expect } from 'bun:test';
import { sql } from '../src/db/index.js';
import { app } from '../src/server/app.js';
import { ingestBusinessListingsAndBenchmarks } from '../src/ingestion/adapters/business-listings.js';

describe('T-019 — Dynamic Business Sales / Listings & Repeated Listing Intelligence (Requirements 24, 25, 26)', () => {
  it('AC1: populates diverse multi-category commercial listings without hardcoded pizza limitation', async () => {
    await ingestBusinessListingsAndBenchmarks();

    const categories = await sql`
      SELECT DISTINCT category_id FROM business_listings;
    `;
    const catIds = categories.map(c => c.category_id);
    expect(catIds.length).toBeGreaterThanOrEqual(6);
    expect(catIds).toContain('pizza_store');
    expect(catIds).toContain('child_daycare');
    expect(catIds).toContain('automotive_repair');
    expect(catIds).toContain('coffee_shop');
    expect(catIds).toContain('full_service_restaurant');
    expect(catIds).toContain('gym_fitness');
  });

  it('AC2: enforces strict asking price vs confirmed sale price separation (Requirement 24)', async () => {
    const activeListings = await sql`
      SELECT asking_price, confirmed_sale_price, status
      FROM business_listings
      WHERE status IN ('ACTIVE', 'RELISTED', 'PRICE_CHANGED');
    `;
    // Every active/relisted listing must have non-null asking price and strictly null confirmed sale price
    for (const l of activeListings) {
      expect(Number(l.asking_price)).toBeGreaterThan(0);
      expect(l.confirmed_sale_price).toBeNull();
    }

    const confirmedListings = await sql`
      SELECT asking_price, confirmed_sale_price, status
      FROM business_listings
      WHERE status = 'CONFIRMED_SOLD';
    `;
    expect(confirmedListings.length).toBeGreaterThanOrEqual(2);
    for (const l of confirmedListings) {
      expect(Number(l.confirmed_sale_price)).toBeGreaterThan(0);
    }
  });

  it('AC3: detects repeated listings with match confidence and links predecessor parent (Requirement 25)', async () => {
    const server = app.listen(0);
    const port = (server.address() as any).port;

    try {
      const res = await fetch(`http://localhost:${port}/api/business-listings?repeatedOnly=true`);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.listings.length).toBeGreaterThanOrEqual(1);
      const relisted = data.listings.find((l: any) => l.listing_uid === 'LIST_BURL_PIZZA_003');
      expect(relisted).toBeDefined();
      expect(relisted.status).toBe('RELISTED');
      expect(Number(relisted.match_confidence)).toBeCloseTo(0.92, 2);
      expect(relisted.repeated_parent_uid).toBe('LIST_BURL_PIZZA_002');
      expect(Number(relisted.previous_asking_price)).toBe(320000);
      expect(Number(relisted.asking_price)).toBe(285000);
    } finally {
      server.close();
    }
  });

  it('AC4: supports dynamic querying by categoryId, cityId, status, and price range', async () => {
    const server = app.listen(0);
    const port = (server.address() as any).port;

    try {
      // Filter by category
      const daycareRes = await fetch(`http://localhost:${port}/api/business-listings?categoryId=child_daycare`);
      const daycareData = await daycareRes.json();
      expect(daycareData.listings.every((l: any) => l.category_id === 'child_daycare')).toBe(true);

      // Filter by city
      const burlRes = await fetch(`http://localhost:${port}/api/business-listings?cityId=CSD_burlington`);
      const burlData = await burlRes.json();
      expect(burlData.listings.every((l: any) => l.geography_id === 'CSD_burlington')).toBe(true);

      // Filter by status
      const activeRes = await fetch(`http://localhost:${port}/api/business-listings?status=ACTIVE`);
      const activeData = await activeRes.json();
      expect(activeData.listings.every((l: any) => l.status === 'ACTIVE')).toBe(true);

      // Filter by price range
      const priceRes = await fetch(`http://localhost:${port}/api/business-listings?minPrice=300000&maxPrice=500000`);
      const priceData = await priceRes.json();
      for (const l of priceData.listings) {
        expect(Number(l.asking_price)).toBeGreaterThanOrEqual(300000);
        expect(Number(l.asking_price)).toBeLessThanOrEqual(500000);
      }
    } finally {
      server.close();
    }
  });

  it('AC5: tracks historical price reduction timeline events in business_listing_price_history (Requirement 26)', async () => {
    const server = app.listen(0);
    const port = (server.address() as any).port;

    try {
      const res = await fetch(`http://localhost:${port}/api/business-listings/LIST_BURL_DAYCARE_001/history`);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(Array.isArray(data.history)).toBe(true);
      expect(data.history.length).toBeGreaterThanOrEqual(2);

      const initialEvent = data.history.find((h: any) => h.event_type === 'INITIAL_LISTING');
      expect(initialEvent).toBeDefined();
      expect(Number(initialEvent.asking_price)).toBe(580000);

      const priceDropEvent = data.history.find((h: any) => h.event_type === 'PRICE_REDUCTION');
      expect(priceDropEvent).toBeDefined();
      expect(Number(priceDropEvent.asking_price)).toBe(519000);
    } finally {
      server.close();
    }
  });
});
