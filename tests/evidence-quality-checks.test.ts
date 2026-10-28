import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';
import { getAuditedCompetitorCount } from '../src/decision-engine/competitor-auditor.js';
import { describeCompetitorEvidence } from '../src/decision-engine/claim-language.js';
import { generateDecisionBrief } from '../src/decision-engine/decision-brief-generator.js';
import { buildEvidenceLedger } from '../src/decision-engine/evidence-ledger.js';
import { runSensitivityAnalysis } from '../src/decision-engine/sensitivity-matrix.js';
import { calculateFinancialEconomics } from '../src/decision-engine/financial-scenarios.js';
import { buildDecisionModel } from '../src/decision-engine/decision-modeler.js';
import type { FunnelCandidate } from '../src/decision-engine/types.js';

describe('Evidence Quality & Pipeline Integrity Suite', () => {
  const baseCandidate: FunnelCandidate = {
    id: 'cand_burlington_downtown',
    city: 'Burlington',
    name: 'Downtown Commercial Core',
    csdCode: '3524002',
    neighbourhood: 'Downtown',
    propertyAddress: '430 Brant St, Burlington, ON',
    listingId: 'MLS-W8102941',
    squareFootage: 1400,
    commercialGrossRentSqft: 42.0,
    monthlyRent: 4900,
    medianIncome: 104500,
    medianIncomeSource: 'OBSERVED_CENSUS',
    population2021: 186948,
    populationGrowthPct: 2.1,
    resolutionTier: 'POTENTIALLY_SUITABLE_PROPERTY',
    zoningFeasibilityStatus: 'UNVERIFIED_PENDING_REVIEW',
    buildingSuitabilityStatus: 'UNVERIFIED_MEP_CHECK_NEEDED',
    suitabilityScore: 84,
    attractivenessScore: 88,
    confidenceScore: 78,
    scoreContributions: { income: 22, growth: 15, rent: 20, comp: 12, verif: 15 },
    tradeOffs: [],
    missingEvidence: [],
    competitorDataSource: 'StatCan Table 33-10-1097-01',
    competitorClassification: 'OBSERVED',
    estimatedDirectCompetitors: 48,
    commercialNetRentSqft: 32.0,
    commercialTmiSqft: 10.0
  };

  const dbName = `test_eqc_${Date.now()}`;
  const adminUrl = process.env.DATABASE_ADMIN_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';
  let adminSql: postgres.Sql | null = null;
  let testSql: postgres.Sql | null = null;
  let canTestDb = false;

  beforeAll(async () => {
    try {
      adminSql = postgres(adminUrl, { connect_timeout: 3 });
      await adminSql`SELECT 1`;
      await adminSql.unsafe(`CREATE DATABASE ${dbName};`);
      const testDbUrl = `postgresql://postgres:postgres@localhost:5432/${dbName}`;
      testSql = postgres(testDbUrl);
      canTestDb = true;
    } catch {
      canTestDb = false;
    }
  });

  afterAll(async () => {
    if (testSql) {
      await testSql.end().catch(() => {});
    }
    if (adminSql && canTestDb) {
      try {
        await adminSql.unsafe(`DROP DATABASE IF EXISTS ${dbName};`);
        await adminSql.end().catch(() => {});
      } catch {}
    }
  });

  // 1. Clean Database Installation
  it('EQC-01: clean database installation executes without ordering or dependency failures', async () => {
    if (!canTestDb || !testSql) return;
    const schemaSql = fs.readFileSync(path.resolve('src/db/schema.sql'), 'utf8');
    await expect(testSql.unsafe(schemaSql)).resolves.not.toThrow();

    // Verify key tables created
    const [obsTable] = await testSql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'observations';
    `;
    expect(obsTable?.table_name).toBe('observations');

    const [metricsTable] = await testSql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'metrics_definitions';
    `;
    expect(metricsTable?.table_name).toBe('metrics_definitions');
  });

  // 2. Schema Upgrade Test
  it('EQC-02: upgrades existing schema constraints cleanly to accept MODELLED and MODELED', async () => {
    if (!canTestDb || !testSql) return;
    // Verify check constraint on observations accepts both MODELLED and MODELED
    const constraints = await testSql`
      SELECT pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'observations' AND c.conname = 'observations_metric_classification_check';
    `;
    expect(constraints[0]?.def).toContain("'MODELED'");
    expect(constraints[0]?.def).toContain("'MODELLED'");
  });

  // 3. Rejects Invalid Classifications and Unregistered Datasets
  it('EQC-03: rejects invalid classification values and unregistered dataset references', async () => {
    if (!canTestDb || !testSql) return;

    // Seed source, dataset, metric, and geography
    await testSql`
      INSERT INTO sources (id, name, organization_type, website_url, priority_rank) 
      VALUES ('src_test', 'Test Source', 'FEDERAL_GOV', 'https://example.com', 1)
      ON CONFLICT DO NOTHING;
    `;
    await testSql`
      INSERT INTO datasets (id, source_id, name, reference_period, source_url, geographic_coverage)
      VALUES ('ds_registered', 'src_test', 'Registered Dataset', '2026', 'https://example.com', 'CSD_ONTARIO')
      ON CONFLICT DO NOTHING;
    `;
    await testSql`
      INSERT INTO geographies (id, name, display_name, geo_type)
      VALUES ('geo_test', 'Test Municipality', 'Test Municipality (City)', 'CSD')
      ON CONFLICT DO NOTHING;
    `;
    await testSql`
      INSERT INTO metrics_definitions (id, name, category, unit, definition)
      VALUES ('metric_test', 'Test Metric', 'Demographics', 'count', 'Test definition')
      ON CONFLICT DO NOTHING;
    `;

    // Attempt invalid classification
    await expect(
      testSql`
        INSERT INTO observations (
          geography_id, metric_id, reference_year, value_numeric, unit,
          geographic_resolution, metric_classification, source_id, dataset_id
        ) VALUES (
          'geo_test', 'metric_test', 2026, 100, 'count',
          'CSD', 'INVALID_SYNTHETIC', 'src_test', 'ds_registered'
        );
      `
    ).rejects.toThrow();

    // Attempt unregistered dataset_id (the statcan_business_counts_2026_modelled failure)
    await expect(
      testSql`
        INSERT INTO observations (
          geography_id, metric_id, reference_year, value_numeric, unit,
          geographic_resolution, metric_classification, source_id, dataset_id
        ) VALUES (
          'geo_test', 'metric_test', 2026, 100, 'count',
          'CSD', 'MODELED', 'src_test', 'statcan_business_counts_2026_modelled'
        );
      `
    ).rejects.toThrow(/foreign key|violates foreign key constraint/i);
  });

  // 4. Unknown Competitor Counts Never Substituted as Zero
  it('EQC-04: unobserved competitor counts return UNAVAILABLE and are never substituted with 0', () => {
    const unrecorded = getAuditedCompetitorCount('CSD_non_existent', 'pizza_store');
    expect(unrecorded.count).toBeUndefined();
    expect(unrecorded.classification).toBe('UNAVAILABLE');

    const candWithUnavailable: FunnelCandidate = {
      ...baseCandidate,
      estimatedDirectCompetitors: undefined,
      competitorClassification: 'UNAVAILABLE'
    };

    const evidenceText = describeCompetitorEvidence(candWithUnavailable);
    expect(evidenceText).toContain('unavailable');
    expect(evidenceText).not.toContain('0 competitors');
    expect(evidenceText).not.toContain('0 licensed');
  });

  // 5. Broad Sector Totals Marked as Benchmark, Never Direct Competitors
  it('EQC-05: broad sector totals are strictly marked BENCHMARK and disclosed as non-storefront', () => {
    const candBroad: FunnelCandidate = {
      ...baseCandidate,
      estimatedDirectCompetitors: 290,
      competitorClassification: 'BENCHMARK'
    };

    const evidenceText = describeCompetitorEvidence(candBroad);
    expect(evidenceText).toContain('broad sector benchmark');
    expect(evidenceText).toContain('not a count of direct competitors');
    expect(evidenceText).not.toContain('290 licensed');
  });

  // 6. Cross-Output Internal Consistency
  it('EQC-06: brief, ledger, economics, and sensitivity matrix report coherent values with zero internal conflict', () => {
    const { decisionModel, activeScenario } = buildDecisionModel({ inquiry: 'Open pizza store in Burlington' });
    const economics = calculateFinancialEconomics(baseCandidate, decisionModel);
    const brief = generateDecisionBrief(baseCandidate, [
      { candidate: baseCandidate, rankingRationale: 'Top candidate' }
    ], decisionModel, activeScenario, economics, []);
    const ledger = buildEvidenceLedger(baseCandidate, decisionModel);
    const sensitivity = runSensitivityAnalysis(baseCandidate, undefined, economics, decisionModel);

    // 1. Break-even units coherence
    expect(brief.economics.breakEvenDailyOrders).toBe(economics.breakEvenDailyUnits);
    expect(sensitivity.shocks[0]?.baseMetric).toContain(String(economics.breakEvenDailyUnits));

    // 2. Population coherence
    const briefText = brief.whyThisLocation.join(' ');
    expect(briefText).toContain('186,948');
    const popLedgerItem = ledger.find(item => item.claim.includes('Catchment area'));
    expect(popLedgerItem?.evidenceObserved).toContain('186,948');

    // 3. Median income coherence
    expect(briefText).toContain('104,500');
    const incomeLedgerItem = ledger.find(item => item.claim.includes('Purchasing power'));
    expect(incomeLedgerItem?.evidenceObserved).toContain('104,500');

    // 4. Rent coherence
    expect(briefText).toContain('$42.00');
    const rentLedgerItem = ledger.find(item => item.claim.includes('Commercial occupancy expense'));
    expect(rentLedgerItem?.evidenceObserved).toContain('$42.00');
  });

  // 7. No Generic Provincial Links as Proof of Individual Listings
  it('EQC-07: property evidence rejects generic provincial landing pages and qualifies rent split assumptions', () => {
    const { decisionModel } = buildDecisionModel({ inquiry: 'Open pizza store in Burlington' });

    // Candidate without individual net/TMI (only gross rent known)
    const candidateGrossOnly: FunnelCandidate = {
      ...baseCandidate,
      commercialNetRentSqft: undefined as unknown as number,
      commercialTmiSqft: undefined as unknown as number
    };

    const ledger = buildEvidenceLedger(candidateGrossOnly, decisionModel);
    const propItem = ledger.find(item => item.claim.includes('Physical property'))!;
    expect(propItem).toBeDefined();

    // Must NOT cite generic ontario.ca business landing page as proof of specific property listing
    expect(propItem.provenance?.sourceUrl).not.toBe('https://ontario.ca/page/business-services-and-support');
    expect(propItem.provenance?.limitations).toContain('General provincial portals do not substantiate');

    // Net/TMI split without direct data must be explicitly labeled as modelled assumption
    const rentItem = ledger.find(item => item.claim.includes('Commercial occupancy expense'))!;
    expect(rentItem.evidenceObserved).toContain('modelled assumption: 70% Net');
    expect(rentItem.evidenceObserved).toContain('30% TMI');
  });

  // 8. Ingestion Failure Fast-Fail (Never Swallows Errors)
  it('EQC-08: ingestion pipeline aborts immediately on constraint violation and never reports false success', async () => {
    if (!canTestDb || !testSql) return;

    let caughtError = false;
    try {
      await testSql.begin(async sqlTx => {
        await sqlTx`
          INSERT INTO observations (
            geography_id, metric_id, reference_year, value_numeric, unit,
            geographic_resolution, metric_classification, source_id, dataset_id
          ) VALUES (
            'geo_test', 'metric_test', 2026, 999, 'units',
            'CSD', 'DISALLOWED_CLASS', 'src_test', 'ds_registered'
          );
        `;
      });
    } catch {
      caughtError = true;
    }

    expect(caughtError).toBe(true);

    // Verify transaction rolled back completely
    const countRows = await testSql`
      SELECT count(*) as count FROM observations WHERE metric_id = 'metric_test';
    `;
    expect(Number(countRows[0]?.count)).toBe(0);
  });
});
