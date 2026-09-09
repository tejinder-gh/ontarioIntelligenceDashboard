import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { sql } from '../../db/index.js';

export interface PropertyOwnerRecord {
  dguid: string;
  geoName: string;
  year: number;
  totalOwners: number;
  singleOwners: number;
  multiOwners: number;
  multiOwnerPct: number;
}

export async function ingestStatCanPropertyOwners(): Promise<number> {
  console.log('Ingesting Statistics Canada Table 46-10-0096-01 (Residential Property Ownership Concentration)...');

  const csvPath = path.join(process.cwd(), 'scratch', '46100096.csv');
  if (!fs.existsSync(csvPath)) {
    console.log('Downloading StatCan Table 46-10-0096-01...');
    const url = 'https://www150.statcan.gc.ca/n1/tbl/csv/46100096-eng.zip';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching 46-10-0096-01`);
    const buffer = await res.arrayBuffer();
    const zipPath = path.join(process.cwd(), 'scratch', '46100096-eng.zip');
    fs.writeFileSync(zipPath, Buffer.from(buffer));
    // Unzip via node-friendly execution or child process
    const { execSync } = await import('node:child_process');
    execSync(`unzip -o "${zipPath}" -d "${path.join(process.cwd(), 'scratch')}"`);
  }

  const rl = readline.createInterface({
    input: fs.createReadStream(csvPath),
    crlfDelay: Infinity
  });

  // Map: `${dguid}_${year}` -> PropertyOwnerRecord
  const recordMap = new Map<string, {
    dguid: string;
    geoName: string;
    year: number;
    total: number;
    single: number;
    multi: number;
  }>();

  for await (const line of rl) {
    if (!line.includes('2021A000535') && !line.includes('2021A000235')) continue;
    if (!line.includes('Total, all owner-occupied property types')) continue;
    if (!line.includes('Total, all sex of property owner categories')) continue;
    if (!line.includes('Number of property owners')) continue;

    const parts = line.split('\",\"').map(s => s.replace(/\"/g, ''));
    if (parts.length < 14) continue;

    const [yearStr, geo, dguid, propType, numProp, sex, est, , , , , , , valStr] = parts;
    if (
      propType !== 'Total, all owner-occupied property types' ||
      sex !== 'Total, all sex of property owner categories' ||
      est !== 'Number of property owners'
    ) {
      continue;
    }

    const val = parseInt(valStr, 10);
    if (isNaN(val)) continue;
    const year = parseInt(yearStr, 10);
    if (isNaN(year)) continue;

    const key = `${dguid}_${year}`;
    if (!recordMap.has(key)) {
      recordMap.set(key, {
        dguid,
        geoName: geo,
        year,
        total: 0,
        single: 0,
        multi: 0
      });
    }

    const item = recordMap.get(key)!;
    if (numProp === 'Total, all number of properties owned categories') {
      item.total = val;
    } else if (numProp === 'Single-property owner') {
      item.single = val;
    } else if (numProp === 'Multiple-property owner') {
      item.multi = val;
    }
  }

  console.log(`Parsed ${recordMap.size} aggregate annual property ownership records from Table 46-10-0096-01.`);

  // Load geographies for DGUID matching
  const dbGeos = await sql`
    SELECT id, dguid, name, geo_type FROM geographies;
  `;
  const geoByDguid = new Map<string, typeof dbGeos[0]>();
  for (const g of dbGeos) {
    if (g.dguid) geoByDguid.set(g.dguid, g);
  }

  let insertedCount = 0;

  for (const [_, item] of recordMap.entries()) {
    if (item.total <= 0) continue;

    let targetGeoId: string | null = null;
    let isProvincialBenchmark = false;

    if (item.dguid === '2021A000235') {
      targetGeoId = 'PR_35';
      isProvincialBenchmark = true;
    } else if (geoByDguid.has(item.dguid)) {
      targetGeoId = geoByDguid.get(item.dguid)!.id;
    } else {
      // Fallback match on name
      const cleanName = item.geoName.split(',')[0].trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const g of dbGeos) {
        const gNorm = g.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (gNorm === cleanName || gNorm.includes(cleanName) || cleanName.includes(gNorm)) {
          targetGeoId = g.id;
          break;
        }
      }
    }

    if (!targetGeoId) continue;

    const multiPct = parseFloat(((item.multi / item.total) * 100).toFixed(2));

    // 1. Insert into property_ownership table
    await sql`
      INSERT INTO property_ownership (
        geography_id, reference_year, total_owners, single_property_owners,
        multi_property_owners, multi_property_owner_pct, source_id, dataset_id
      )
      VALUES (
        ${targetGeoId}, ${item.year}, ${item.total}, ${item.single},
        ${item.multi}, ${multiPct}, 'prop_multi_owner', 'statcan_property_ownership_multi'
      )
      ON CONFLICT (geography_id, reference_year)
      DO UPDATE SET
        total_owners = EXCLUDED.total_owners,
        single_property_owners = EXCLUDED.single_property_owners,
        multi_property_owners = EXCLUDED.multi_property_owners,
        multi_property_owner_pct = EXCLUDED.multi_property_owner_pct;
    `;

    // 2. Insert into observations table (latest year only)
    if (item.year === 2024) {
      const classification = isProvincialBenchmark ? 'BENCHMARK' : 'OBSERVED';
      const resolution = isProvincialBenchmark ? 'PROVINCE' : 'CSD';

      await sql`
        INSERT INTO observations (
          geography_id, metric_id, reference_year, value_numeric, unit,
          geographic_resolution, is_benchmark, metric_classification,
          source_id, dataset_id, confidence, is_estimate, methodology_notes
        )
        VALUES (
          ${targetGeoId}, 'prop_multi_owner_pct', 2024, ${multiPct}, '%',
          ${resolution}, ${isProvincialBenchmark}, ${classification},
          'prop_multi_owner', 'statcan_property_ownership_multi', 'HIGH', false,
          'StatCan CHSP Table 46-10-0096-01: Proportion of property owners owning multiple properties'
        )
        ON CONFLICT (geography_id, metric_id, reference_year, is_benchmark, benchmark_label)
        DO UPDATE SET
          value_numeric = EXCLUDED.value_numeric,
          metric_classification = EXCLUDED.metric_classification,
          updated_at = NOW();
      `;

      await sql`
        INSERT INTO observations (
          geography_id, metric_id, reference_year, value_numeric, unit,
          geographic_resolution, is_benchmark, metric_classification,
          source_id, dataset_id, confidence, is_estimate, methodology_notes
        )
        VALUES (
          ${targetGeoId}, 'prop_total_owners', 2024, ${item.total}, 'owners',
          ${resolution}, ${isProvincialBenchmark}, ${classification},
          'prop_multi_owner', 'statcan_property_ownership_multi', 'HIGH', false,
          'StatCan CHSP Table 46-10-0096-01: Total residential property owners'
        )
        ON CONFLICT (geography_id, metric_id, reference_year, is_benchmark, benchmark_label)
        DO UPDATE SET
          value_numeric = EXCLUDED.value_numeric,
          metric_classification = EXCLUDED.metric_classification,
          updated_at = NOW();
      `;
    }

    // 3. Longitudinal observation history
    await sql`
      INSERT INTO observation_history (
        geography_id, metric_id, reference_year, vintage_date,
        recorded_value_numeric, dataset_id, change_type, audit_notes
      )
      VALUES (
        ${targetGeoId}, 'prop_multi_owner_pct', ${item.year}, ${`${item.year}-11-01`},
        ${multiPct}, 'statcan_property_ownership_multi', 'OBSERVED', 'CHSP Table 46-10-0096-01 multi-property owner share'
      )
      ON CONFLICT DO NOTHING;
    `;

    insertedCount++;
  }

  console.log(`Successfully persisted ${insertedCount} property ownership records in property_ownership ledger.`);
  return insertedCount;
}
