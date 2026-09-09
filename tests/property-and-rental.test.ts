import { describe, it, expect } from 'bun:test';
import { sql } from '../src/db/index.js';
import { app } from '../src/server/app.js';

describe('T-014 — Residential Property Ownership & CMHC Rental Market Suite', () => {
  it('AC1: verifies property_ownership records authentic CHSP multi-property owner concentration', async () => {
    const [burlington] = await sql`
      SELECT reference_year, total_owners, single_property_owners, multi_property_owners, multi_property_owner_pct, source_id
      FROM property_ownership
      WHERE geography_id = 'CSD_burlington' AND reference_year = 2024;
    `;

    expect(burlington).toBeDefined();
    expect(Number(burlington.total_owners)).toBe(88805);
    expect(Number(burlington.single_property_owners)).toBe(74960);
    expect(Number(burlington.multi_property_owners)).toBe(13845);
    expect(Number(burlington.multi_property_owner_pct)).toBeCloseTo(15.59, 2);
    expect(burlington.source_id).toBe('prop_multi_owner');

    // Verify provincial benchmark exists
    const [ontario] = await sql`
      SELECT total_owners, multi_property_owner_pct
      FROM property_ownership
      WHERE geography_id = 'PR_35' AND reference_year = 2024;
    `;
    expect(ontario).toBeDefined();
    expect(Number(ontario.total_owners)).toBeGreaterThan(5000000);
    expect(Number(ontario.multi_property_owner_pct)).toBeCloseTo(17.24, 2);
  });

  it('AC2: preserves multi-year longitudinal history without destructive overwriting', async () => {
    const years = await sql`
      SELECT reference_year, multi_property_owner_pct
      FROM property_ownership
      WHERE geography_id = 'CSD_burlington'
      ORDER BY reference_year ASC;
    `;

    expect(years.length).toBe(3);
    expect(years.map(y => y.reference_year)).toEqual([2022, 2023, 2024]);
    // 2022: 14.58%, 2023: 15.25%, 2024: 15.59%
    expect(Number(years[0].multi_property_owner_pct)).toBeCloseTo(14.58, 2);
    expect(Number(years[2].multi_property_owner_pct)).toBeCloseTo(15.59, 2);
  });

  it('AC3: verifies CMHC rental market indicators for primary rental centres', async () => {
    const [burlRental] = await sql`
      SELECT average_rent_cad, median_rent_cad, vacancy_rate_pct, rent_2bed_cad, rental_universe, turnover_rate_pct, source_id
      FROM rental_market
      WHERE geography_id = 'CSD_burlington' AND reference_year = 2024;
    `;

    expect(burlRental).toBeDefined();
    expect(Number(burlRental.average_rent_cad)).toBe(2120);
    expect(Number(burlRental.median_rent_cad)).toBe(2010);
    expect(Number(burlRental.vacancy_rate_pct)).toBe(1.8);
    expect(Number(burlRental.rent_2bed_cad)).toBe(2120);
    expect(Number(burlRental.rental_universe)).toBe(11450);
    expect(burlRental.source_id).toBe('rent_cmhc');

    // Verify Toronto vacancy rate
    const [torontoRental] = await sql`
      SELECT vacancy_rate_pct, average_rent_cad
      FROM rental_market
      WHERE geography_id = 'CSD_toronto' AND reference_year = 2024;
    `;
    expect(torontoRental).toBeDefined();
    expect(Number(torontoRental.vacancy_rate_pct)).toBe(1.5);
    expect(Number(torontoRental.average_rent_cad)).toBe(2185);
  });

  it('AC4: /api/geographies/:id/housing-rental endpoint returns authentic indicators with benchmarks', async () => {
    const server = app.listen(0);
    const port = (server.address() as any).port;

    try {
      const res = await fetch(`http://localhost:${port}/api/geographies/CSD_burlington/housing-rental`);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.hasObservedPropertyOwnership).toBe(true);
      expect(json.hasObservedRentalMarket).toBe(true);

      // Property ownership check
      expect(json.propertyOwnership.latest.totalOwners).toBe(88805);
      expect(json.propertyOwnership.latest.multiPropertyOwnerPct).toBeCloseTo(15.59, 2);
      expect(json.propertyOwnership.benchmark.multiPropertyOwnerPct).toBeCloseTo(17.24, 2);
      expect(json.propertyOwnership.source.friendlyCode).toBe('PROP-MULTI-OWNER');

      // Rental market check
      expect(json.rentalMarket.latest.averageRentCad).toBe(2120);
      expect(json.rentalMarket.latest.vacancyRatePct).toBe(1.8);
      expect(json.rentalMarket.benchmark.vacancyRatePct).toBe(2.1);
      expect(json.rentalMarket.source.friendlyCode).toBe('RENT-CMHC');

      // Housing stock breakdown check
      expect(json.housingStock.length).toBeGreaterThanOrEqual(5);
      const singleDetached = json.housingStock.find((h: any) => h.label.includes('Single-detached'));
      expect(singleDetached).toBeDefined();
    } finally {
      server.close();
    }
  });

  it('AC5: supplies 7 diagnostic fields for NotEnoughData when geography lacks primary survey', async () => {
    const server = app.listen(0);
    const port = (server.address() as any).port;

    try {
      // Query a geography that doesn't have a CMHC primary rental survey
      const res = await fetch(`http://localhost:${port}/api/geographies/CSD_nonexistent_rental/housing-rental`);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.hasObservedRentalMarket).toBe(false);
      expect(json.rentalMarket.diagnostics).toBeDefined();
      expect(json.rentalMarket.diagnostics.requestedMetric).toContain('Rental');
      expect(json.rentalMarket.diagnostics.nearestAvailableGeography).toContain('Benchmark');
      expect(json.rentalMarket.diagnostics.sourcesChecked.length).toBeGreaterThanOrEqual(2);
      expect(json.rentalMarket.diagnostics.isUpstreamMissing).toBe(true);
      expect(json.rentalMarket.diagnostics.benchmarkAvailable).toBeDefined();
    } finally {
      server.close();
    }
  });
});
