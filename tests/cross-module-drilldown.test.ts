import { describe, it, expect, beforeAll } from 'bun:test';
import { app } from '../src/server/app.js';

describe('T-025 — Cross-Module Drill-Down Architecture & Generational Age Cohorts (Requirements 8 & 33)', () => {
  let server: any;
  let baseUrl: string;

  beforeAll(async () => {
    server = app.listen(0);
    const port = (server.address() as any).port;
    baseUrl = `http://localhost:${port}`;
  });

  it('AC1: /api/geographies/:id/age-profile returns authentic 9 statutory Census age cohorts with counts and percentages', async () => {
    const res = await fetch(`${baseUrl}/api/geographies/CSD_burlington/age-profile`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.geographyId).toBe('CSD_burlington');
    expect(data.cityName).toBe('Burlington');
    expect(Array.isArray(data.cohorts)).toBe(true);
    expect(data.cohorts.length).toBe(9);

    const labels = data.cohorts.map((c: any) => c.label);
    expect(labels).toContain('0 to 14 years');
    expect(labels).toContain('15 to 19 years');
    expect(labels).toContain('20 to 24 years');
    expect(labels).toContain('25 to 34 years');
    expect(labels).toContain('35 to 44 years');
    expect(labels).toContain('45 to 54 years');
    expect(labels).toContain('55 to 64 years');
    expect(labels).toContain('65 to 74 years');
    expect(labels).toContain('75 years and over');

    // Verify 25-34 years cohort (Requirement 33 drill-down target)
    const cohort2534 = data.cohorts.find((c: any) => c.label === '25 to 34 years');
    expect(cohort2534).toBeDefined();
    expect(cohort2534.count).toBeGreaterThan(20000);
    expect(cohort2534.percentage).toBeGreaterThan(10);
    expect(cohort2534.classification).toBe('OBSERVED');
    expect(cohort2534.source).toContain('Statistics Canada 2021 Census Profile');
  });

  it('AC2: calculates working age, youth, and senior aggregates alongside Ontario provincial benchmarks', async () => {
    const res = await fetch(`${baseUrl}/api/geographies/CSD_burlington/age-profile`);
    const data = await res.json();

    expect(data.dominantCohort).toBeDefined();
    expect(data.dominantCohort.label).toBeDefined();

    expect(data.workingAge).toBeDefined();
    expect(data.workingAge.count).toBeGreaterThan(80000);
    expect(data.workingAge.percentage).toBeGreaterThan(50);

    expect(data.seniors).toBeDefined();
    expect(data.seniors.count).toBeGreaterThan(20000);

    expect(data.youth).toBeDefined();
    expect(data.youth.count).toBeGreaterThan(25000);

    // Verify delta against Ontario benchmark
    const cohort = data.cohorts[0];
    expect(cohort.ontarioBenchmarkPct).toBeGreaterThan(0);
    expect(typeof cohort.deltaPct).toBe('number');
  });

  it('AC3: /api/geographies/:id/demographics returns housingStock and ageCohorts alongside ethnocultural communities', async () => {
    const res = await fetch(`${baseUrl}/api/geographies/CSD_burlington/demographics`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(Array.isArray(data.top20Communities)).toBe(true);
    expect(data.top20Communities.length).toBeGreaterThanOrEqual(15);

    expect(Array.isArray(data.visibleMinorities)).toBe(true);
    expect(data.visibleMinorities.length).toBeGreaterThanOrEqual(8);

    // Verify South Asian (Requirement 33 drill-down target)
    const southAsian = data.visibleMinorities.find((vm: any) => vm.category_label === 'South Asian');
    expect(southAsian).toBeDefined();
    expect(Number(southAsian.count_total)).toBeGreaterThan(10000);

    expect(Array.isArray(data.ageCohorts)).toBe(true);
    expect(data.ageCohorts.length).toBe(9);

    expect(Array.isArray(data.housingStock)).toBe(true);
    expect(data.housingStock.length).toBeGreaterThanOrEqual(5);
  });

  it('AC4: supports Ontario-wide benchmark (PR_35) with authentic provincial totals', async () => {
    const res = await fetch(`${baseUrl}/api/geographies/PR_35/demographics`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.top20Communities.length).toBe(20);
    expect(data.visibleMinorities.length).toBe(10);
    expect(data.ageCohorts.length).toBe(9);
    expect(data.housingStock.length).toBe(6);

    // Verify Ontario Canadian & South Asian populations
    const canadian = data.top20Communities.find((c: any) => c.category_label === 'Canadian');
    expect(canadian).toBeDefined();
    expect(Number(canadian.count_total)).toBeGreaterThanOrEqual(2800000);

    const southAsian = data.visibleMinorities.find((vm: any) => vm.category_label === 'South Asian');
    expect(southAsian).toBeDefined();
    expect(Number(southAsian.count_total)).toBeGreaterThanOrEqual(1500000);
  });

  it('AC5: returns 404 for non-existent geography in age-profile', async () => {
    const res = await fetch(`${baseUrl}/api/geographies/CSD_nonexistent_zone/age-profile`);
    expect(res.status).toBe(404);
  });
});
