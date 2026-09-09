import { describe, it, expect, beforeAll } from 'bun:test';
import { app } from '../src/server/app.js';
import { ingestOsmBusinesses } from '../src/ingestion/adapters/osm-businesses.js';

describe('T-020 — Commercial Competition Analysis & Micro-Location Footprint (Requirement 18)', () => {
  let server: any;
  let baseUrl: string;

  beforeAll(async () => {
    await ingestOsmBusinesses();
    server = app.listen(0);
    const port = (server.address() as any).port;
    baseUrl = `http://localhost:${port}`;
  });

  it('AC1: /api/opportunity/business-detail returns enriched competitors with OSM provenance', async () => {
    const res = await fetch(`${baseUrl}/api/opportunity/business-detail?cityId=CSD_burlington&categoryId=pizza_store`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.cityId).toBe('CSD_burlington');
    expect(data.categoryId).toBe('pizza_store');
    expect(Array.isArray(data.competitorLocations)).toBe(true);
    expect(data.competitorLocations.length).toBeGreaterThanOrEqual(10);

    // Verify OSM provenance & element ID
    const sample = data.competitorLocations[0];
    expect(sample.source_type).toBe('OSM_LISTED');
    expect(sample.source_element_id).toBeDefined();
    expect(sample.latitude).toBeDefined();
    expect(sample.longitude).toBeDefined();
  });

  it('AC2: calculates empirical competitor density per 10,000 and population per competitor', async () => {
    const res = await fetch(`${baseUrl}/api/opportunity/business-detail?cityId=CSD_burlington&categoryId=pizza_store`);
    const data = await res.json();

    expect(data.summary).toBeDefined();
    expect(data.summary.totalCompetitors).toBeGreaterThanOrEqual(10);
    expect(data.summary.competitorsPer10k).toBeGreaterThan(0);
    expect(data.summary.populationPerCompetitor).toBeGreaterThan(5000);
  });

  it('AC3: separates chain vs independent operators with authentic proportions', async () => {
    const res = await fetch(`${baseUrl}/api/opportunity/business-detail?cityId=CSD_burlington&categoryId=pizza_store`);
    const data = await res.json();

    const { chainCount, independentCount, chainSharePct, totalCompetitors } = data.summary;
    expect(chainCount + independentCount).toBe(totalCompetitors);
    expect(chainSharePct).toBeGreaterThan(0);
    expect(chainSharePct).toBeLessThan(100);

    // Verify independent stores have is_chain = false
    const sonOfPeach = data.competitorLocations.find((c: any) => c.name.includes('Son of a Peach'));
    expect(sonOfPeach).toBeDefined();
    expect(sonOfPeach.is_chain).toBe(false);

    // Verify chain stores have brand_name
    const blaze = data.competitorLocations.find((c: any) => c.name.includes('Blaze'));
    expect(blaze).toBeDefined();
    expect(blaze.is_chain).toBe(true);
    expect(blaze.brand_name).toBe('Blaze Pizza');
  });

  it('AC4: joins independent review metrics and computes review concentration', async () => {
    const res = await fetch(`${baseUrl}/api/opportunity/business-detail?cityId=CSD_burlington&categoryId=pizza_store`);
    const data = await res.json();

    expect(data.summary.hasReviewData).toBe(true);
    expect(data.summary.averageRating).toBeGreaterThanOrEqual(3.5);
    expect(data.summary.totalReviews).toBeGreaterThan(500);
    expect(data.summary.reviewConcentrationPct).toBeGreaterThan(0);

    const sonOfPeach = data.competitorLocations.find((c: any) => c.name.includes('Son of a Peach'));
    expect(sonOfPeach.rating).toBeGreaterThanOrEqual(4.5);
    expect(sonOfPeach.review_count).toBeGreaterThan(500);
  });

  it('AC5: identifies commercial spatial clustering corridors', async () => {
    const res = await fetch(`${baseUrl}/api/opportunity/business-detail?cityId=CSD_burlington&categoryId=pizza_store`);
    const data = await res.json();

    expect(Array.isArray(data.spatialClusters)).toBe(true);
    expect(data.spatialClusters.length).toBeGreaterThan(0);

    const downtownCluster = data.spatialClusters.find((cl: any) => cl.corridor.includes('Downtown'));
    expect(downtownCluster).toBeDefined();
    expect(downtownCluster.count).toBeGreaterThanOrEqual(2);
  });

  it('AC6: provides outgoing links to Google Maps, Yelp, and official websites without violating provider terms', async () => {
    const res = await fetch(`${baseUrl}/api/opportunity/business-detail?cityId=CSD_burlington&categoryId=pizza_store`);
    const data = await res.json();

    const sample = data.competitorLocations[0];
    expect(sample.directLinks).toBeDefined();
    expect(sample.directLinks.googleMapsUrl).toContain('google.com/maps/search');
    expect(sample.directLinks.yelpUrl).toContain('yelp.com/search');
    expect(sample.directLinks.websiteUrl).toBeDefined();
    expect(sample.directLinks.osmUrl).toContain('openstreetmap.org');

    server.close();
  });
});
