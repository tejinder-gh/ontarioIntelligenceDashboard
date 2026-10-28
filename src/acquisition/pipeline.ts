import crypto from 'node:crypto';
import { sql } from '../db/index.js';
import { placesAdapter } from './adapters/places-adapter.js';
import { torontoLicencesAdapter } from './adapters/toronto-licences-adapter.js';
import { entityResolver } from '../resolution/entity-resolver.js';
import { ensureSourcesAndDatasets } from './init-sources.js';
import type { IngestionRunReport } from './types.js';

export async function runHaltonAcquisition(options?: {
  limit?: number;
  cities?: string[];
}): Promise<IngestionRunReport> {
  const startedAt = new Date().toISOString();
  const startTime = Date.now();
  const limit = options?.limit || 600;
  const targetCities = options?.cities || ['Burlington', 'Oakville', 'Milton', 'Halton Hills'];

  await ensureSourcesAndDatasets();

  // Create formal ingestion run record
  const [runRecord] = await sql<{ id: number }[]>`
    INSERT INTO ingestion_runs (
      dataset_id, start_time, status, rows_fetched, rows_inserted, rows_updated
    ) VALUES (
      'foursquare_overture_places', NOW(), 'IN_PROGRESS', 0, 0, 0
    )
    RETURNING id;
  `;
  const runId = runRecord.id;

  console.log(`[Acquisition Pipeline] Starting Halton Region proof run (Run ID #${runId})...`);

  // Fetch real records from Foursquare/Overture database
  const records = await placesAdapter.fetchRecords({
    cities: targetCities,
    limit,
  });

  let canonicalCreated = 0;
  let canonicalUpdated = 0;
  let duplicateMatches = 0;
  const haltonCounts = {
    burlington: 0,
    oakville: 0,
    milton: 0,
    haltonHills: 0,
  };

  for (const record of records) {
    const cityName = record.city.toLowerCase();
    if (cityName.includes('burlington')) haltonCounts.burlington++;
    else if (cityName.includes('oakville')) haltonCounts.oakville++;
    else if (cityName.includes('milton')) haltonCounts.milton++;
    else if (cityName.includes('halton hills') || cityName.includes('georgetown') || cityName.includes('acton')) {
      haltonCounts.haltonHills++;
    }

    const res = await entityResolver.resolveAndPersist(record, String(runId));
    if (res.isNew) {
      canonicalCreated++;
    } else {
      canonicalUpdated++;
      if (res.matchType === 'STRONG_IDENTITY_MATCH') {
        duplicateMatches++;
      }
    }
  }

  const durationMs = Date.now() - startTime;
  const completedAt = new Date().toISOString();

  // Update ingestion run completion
  await sql`
    UPDATE ingestion_runs SET
      end_time = NOW(),
      status = 'COMPLETED',
      rows_fetched = ${records.length},
      rows_inserted = ${canonicalCreated},
      rows_updated = ${canonicalUpdated}
    WHERE id = ${runId};
  `;

  console.log(
    `[Acquisition Pipeline] Halton proof run completed in ${(durationMs / 1000).toFixed(2)}s: ` +
    `${records.length} observed, ${canonicalCreated} canonical created, ${canonicalUpdated} updated, ` +
    `${duplicateMatches} duplicates reconciled.`
  );

  return {
    runId: String(runId),
    sourceId: 'foursquare_overture_places',
    scope: 'HALTON_REGION',
    startedAt,
    completedAt,
    durationMs,
    totalObserved: records.length,
    canonicalCreated,
    canonicalUpdated,
    duplicateMatches,
    rejectedInvalid: 0,
    haltonCounts,
  };
}

export async function runTorontoLicencesAcquisition(limit: number = 200): Promise<IngestionRunReport> {
  const startedAt = new Date().toISOString();
  const startTime = Date.now();

  await ensureSourcesAndDatasets();

  const [runRecord] = await sql<{ id: number }[]>`
    INSERT INTO ingestion_runs (
      dataset_id, start_time, status, rows_fetched, rows_inserted, rows_updated
    ) VALUES (
      'toronto_open_data_licences', NOW(), 'IN_PROGRESS', 0, 0, 0
    )
    RETURNING id;
  `;
  const runId = runRecord.id;

  const records = await torontoLicencesAdapter.fetchRecords({ limit });
  let canonicalCreated = 0;
  let canonicalUpdated = 0;

  for (const record of records) {
    const res = await entityResolver.resolveAndPersist(record, String(runId));
    if (res.isNew) canonicalCreated++;
    else canonicalUpdated++;
  }

  const durationMs = Date.now() - startTime;
  const completedAt = new Date().toISOString();

  await sql`
    UPDATE ingestion_runs SET
      end_time = NOW(),
      status = 'COMPLETED',
      rows_fetched = ${records.length},
      rows_inserted = ${canonicalCreated},
      rows_updated = ${canonicalUpdated}
    WHERE id = ${runId};
  `;

  return {
    runId: String(runId),
    sourceId: 'toronto_open_data_licences',
    scope: 'TORONTO_MUNICIPAL',
    startedAt,
    completedAt,
    durationMs,
    totalObserved: records.length,
    canonicalCreated,
    canonicalUpdated,
    duplicateMatches: 0,
    rejectedInvalid: 0,
    haltonCounts: { burlington: 0, oakville: 0, milton: 0, haltonHills: 0 },
  };
}
