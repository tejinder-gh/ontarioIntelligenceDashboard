import { testConnection, closeDatabase } from '../db/index.js';
import { ingestStatCanFuel } from './adapters/statcan-fuel.js';
import { syncCreaDdfListings } from './adapters/crea-ddf.js';
import { precomputeDerivedAnalytics } from '../analytics/precompute.js';

export interface SyncResult {
  success: boolean;
  timestamp: string;
  durationMs: number;
  stagesCompleted: string[];
  errors: Array<{ stage: string; error: string }>;
}

/**
 * Periodic Dynamic Data Synchronization Pipeline
 * 
 * Target for `bun run data:sync`.
 * Refreshes dynamic retail fuel telemetry, verifies CREA DDF status,
 * and recomputes derived municipal analytics and rankings.
 */
export async function runDataSync(): Promise<SyncResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  const stagesCompleted: string[] = [];
  const errors: Array<{ stage: string; error: string }> = [];

  console.log('================================================================');
  console.log(`  STARTING ONTARIO INTELLIGENCE DATA SYNC [${timestamp}]`);
  console.log('================================================================');

  const connected = await testConnection();
  if (!connected) {
    throw new Error('Database connection failed. Ensure PostgreSQL container is running.');
  }

  // Stage 1: StatCan Fuel Pricing & Delta Engine
  try {
    console.log('[Sync Stage 1/3] Refreshing StatCan retail gasoline pricing...');
    await ingestStatCanFuel();
    stagesCompleted.push('statcan_fuel');
  } catch (err: any) {
    console.error('[Sync Error] Failed to refresh StatCan fuel telemetry:', err.message);
    errors.push({ stage: 'statcan_fuel', error: err.message });
  }

  // Stage 2: CREA DDF Listings Boundary Lifecycle Check
  try {
    console.log('[Sync Stage 2/3] Verifying CREA DDF listing status and connectivity...');
    await syncCreaDdfListings();
    stagesCompleted.push('crea_ddf_status');
  } catch (err: any) {
    console.error('[Sync Error] Failed to verify CREA DDF boundary:', err.message);
    errors.push({ stage: 'crea_ddf_status', error: err.message });
  }

  // Stage 3: Precompute Derived Analytics & Rankings
  try {
    console.log('[Sync Stage 3/3] Recomputing derived municipal analytics and rank percentiles...');
    await precomputeDerivedAnalytics();
    stagesCompleted.push('derived_analytics');
  } catch (err: any) {
    console.error('[Sync Error] Failed to precompute derived analytics:', err.message);
    errors.push({ stage: 'derived_analytics', error: err.message });
  }

  const durationMs = Date.now() - startTime;
  const success = errors.length === 0;

  console.log('================================================================');
  console.log(`  DATA SYNC ${success ? 'COMPLETED' : 'COMPLETED WITH WARNINGS'} IN ${(durationMs / 1000).toFixed(2)}s`);
  console.log(`  Stages Completed: ${stagesCompleted.join(', ')}`);
  if (errors.length > 0) {
    console.warn(`  Errors: ${JSON.stringify(errors)}`);
  }
  console.log('================================================================');

  return {
    success,
    timestamp,
    durationMs,
    stagesCompleted,
    errors
  };
}

// Direct CLI invocation
if (import.meta.main || process.argv[1]?.endsWith('sync.ts')) {
  runDataSync()
    .then(async (result) => {
      await closeDatabase();
      process.exit(result.success ? 0 : 1);
    })
    .catch(async (err) => {
      console.error('[Fatal Sync Failure]', err);
      await closeDatabase();
      process.exit(1);
    });
}
