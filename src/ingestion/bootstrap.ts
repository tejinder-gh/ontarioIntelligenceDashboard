import { testConnection, closeDatabase } from '../db/index.js';
import { initializeRegistries } from './registry.js';
import { ingestOntarioMunicipalities } from './adapters/ontario-municipalities.js';
import { ingestStatCanCensus } from './adapters/statcan-census.js';
import { ingestStatCanBusinessCounts } from './adapters/statcan-business-counts.js';
import { ingestOntarioFir } from './adapters/ontario-fir.js';
import { ingestStatCanSpending } from './adapters/statcan-spending.js';
import { ingestStatCanWealth } from './adapters/statcan-wealth.js';
import { ingestOsmBusinesses } from './adapters/osm-businesses.js';
import { ingestBusinessListingsAndBenchmarks } from './adapters/business-listings.js';
import { precomputeDerivedAnalytics } from '../analytics/precompute.js';

export async function runBootstrap(): Promise<void> {
  console.log('================================================================');
  console.log('  STARTING ONTARIO ECONOMIC INTELLIGENCE DATA BOOTSTRAP');
  console.log('================================================================');

  const connected = await testConnection();
  if (!connected) {
    throw new Error('Could not connect to PostgreSQL database. Please ensure docker container is running.');
  }

  const startTime = Date.now();

  try {
    // 1. Initialize Registries
    await initializeRegistries();

    // 2. Municipalities Master Registry
    await ingestOntarioMunicipalities();

    // 3. Statistics Canada 2021 Census Profiles
    await ingestStatCanCensus();

    // 4. Canadian Business Counts (Dec 2025)
    await ingestStatCanBusinessCounts();

    // 5. Ontario MMAH Financial Information Returns (FIR)
    await ingestOntarioFir();

    // 6. Statistics Canada Survey of Household Spending (SHS)
    await ingestStatCanSpending();

    // 7. Statistics Canada Survey of Financial Security (SFS)
    await ingestStatCanWealth();

    // 8. OpenStreetMap Business Locations
    await ingestOsmBusinesses();

    // 9. Commercial Listings, CRE Benchmarks & Benchmark Chains
    await ingestBusinessListingsAndBenchmarks();

    // 10. Precompute Layer 3 Derived Analytics, Rankings & Outliers
    await precomputeDerivedAnalytics();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('================================================================');
    console.log(`  DATA BOOTSTRAP COMPLETED SUCCESSFULLY IN ${elapsed}s`);
    console.log('================================================================');
  } catch (error) {
    console.error('Fatal error during data bootstrap:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

// Execute if run directly
if (import.meta.main || process.argv[1]?.includes('bootstrap')) {
  runBootstrap();
}
