import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { sql } from '../../db/index.js';

export interface CsdEstimateRecord {
  dguid: string;
  geoName: string;
  cleanName: string;
  populationsByYear: { [year: number]: number };
}

export async function ingestStatCanEstimates(): Promise<number> {
  console.log('Ingesting Statistics Canada Table 17-10-0155-01 (Population Estimates by CSD)...');

  const csvPath = path.join(process.cwd(), 'scratch', '17100155.csv');
  if (!fs.existsSync(csvPath)) {
    console.log('Downloading StatCan Table 17-10-0155-01...');
    const url = 'https://www150.statcan.gc.ca/n1/tbl/csv/17100155-eng.zip';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching 17-10-0155-01`);
    const buffer = await res.arrayBuffer();
    const zipPath = path.join(process.cwd(), 'scratch', '17100155-eng.zip');
    fs.writeFileSync(zipPath, Buffer.from(buffer));
  }

  const rl = readline.createInterface({
    input: fs.createReadStream(csvPath),
    crlfDelay: Infinity
  });

  const csdMap = new Map<string, CsdEstimateRecord>();

  for await (const line of rl) {
    if (!line.includes('Ontario')) continue;
    const parts = line.split('\",\"').map(s => s.replace(/\"/g, ''));
    if (parts.length < 10) continue;

    const [refDate, geo, dguid, , , , , , , valStr] = parts;
    if (!dguid || !dguid.startsWith('2021A000535')) continue;

    const year = parseInt(refDate, 10);
    const pop = parseInt(valStr, 10);
    if (isNaN(year) || isNaN(pop)) continue;

    // Clean geo name: 'Burlington (CY), Ontario' -> 'Burlington'
    const match = geo.match(/^([^(]+)/);
    let clean = match ? match[1].trim() : geo;
    if (clean.includes('/')) {
      clean = clean.split('/')[0].trim();
    }

    if (!csdMap.has(dguid)) {
      csdMap.set(dguid, {
        dguid,
        geoName: geo,
        cleanName: clean,
        populationsByYear: {}
      });
    }

    csdMap.get(dguid)!.populationsByYear[year] = pop;
  }

  console.log(`Parsed ${csdMap.size} Ontario Census Subdivisions from Table 17-10-0155-01.`);

  // Load existing CSDs from geographies
  const dbGeos = await sql`
    SELECT id, dguid, name, csd_type, census_division FROM geographies WHERE geo_type = 'CSD';
  `;

  let matchedCount = 0;
  let obsInserted = 0;

  for (const g of dbGeos) {
    // Match by DGUID first, then by clean name
    let record: CsdEstimateRecord | undefined;
    if (g.dguid && csdMap.has(g.dguid)) {
      record = csdMap.get(g.dguid);
    } else {
      const gNorm = g.name.toLowerCase().trim();
      for (const [_, rec] of csdMap.entries()) {
        const rNorm = rec.cleanName.toLowerCase().trim();
        if (rNorm === gNorm || rNorm.replace(/[^a-z0-9]/g, '') === gNorm.replace(/[^a-z0-9]/g, '')) {
          record = rec;
          break;
        }
      }
    }

    if (!record) continue;
    matchedCount++;

    // Update DGUID on geography if not set
    if (!g.dguid && record.dguid) {
      try {
        await sql`
          UPDATE geographies 
          SET dguid = ${record.dguid} 
          WHERE id = ${g.id} AND dguid IS NULL;
        `;
      } catch (e) {
        // Skip duplicate dguid assignment
      }
    }

    // Insert annual population estimates into observation_history & latest into observations
    const years = Object.keys(record.populationsByYear).map(Number).sort();
    const latestYear = years[years.length - 1];
    const latestPop = record.populationsByYear[latestYear];

    if (latestPop && latestYear) {
      // 1. Current Estimate Observation
      await sql`
        INSERT INTO observations (
          geography_id, metric_id, reference_year, value_numeric, unit,
          geographic_resolution, is_benchmark, metric_classification,
          source_id, dataset_id, confidence, is_estimate, methodology_notes
        )
        VALUES (
          ${g.id}, 'pop_estimate_current', ${latestYear}, ${latestPop}, 'people',
          'CSD', false, 'OBSERVED', 'pop_csd_est', 'statcan_population_estimates_csd',
          'HIGH', true, 'StatCan Table 17-10-0155-01 annual postcensal estimate'
        )
        ON CONFLICT (geography_id, metric_id, reference_year, is_benchmark, benchmark_label)
        DO UPDATE SET
          value_numeric = EXCLUDED.value_numeric,
          metric_classification = EXCLUDED.metric_classification,
          updated_at = NOW();
      `;
      obsInserted++;

      // 2. Longitudinal History (Preserve past 5 years of estimates)
      for (const y of years.slice(-5)) {
        const popVal = record.populationsByYear[y];
        await sql`
          INSERT INTO observation_history (
            geography_id, metric_id, reference_year, vintage_date,
            recorded_value_numeric, dataset_id, change_type, audit_notes
          )
          VALUES (
            ${g.id}, 'pop_estimate_annual', ${y}, ${`${y}-07-01`},
            ${popVal}, 'statcan_population_estimates_csd', 'OBSERVED', 'StatCan annual July 1 estimate'
          )
          ON CONFLICT DO NOTHING;
        `;
      }
    }
  }

  console.log(`Matched ${matchedCount} / ${dbGeos.length} municipalities and inserted ${obsInserted} current population estimate observations.`);
  return obsInserted;
}
