import { testConnection, closeDatabase } from '../db/index.js';
import { initializeRegistries } from './registry.js';
import { ingestOntarioMunicipalities } from './adapters/ontario-municipalities.js';
import { ingestStatCanCensus } from './adapters/statcan-census.js';
import { ingestStatCanEstimates } from './adapters/statcan-estimates.js';
import { ingestStatCanFuel } from './adapters/statcan-fuel.js';
import { ingestStatCanBusinessCounts } from './adapters/statcan-business-counts.js';
import { ingestOntarioFir } from './adapters/ontario-fir.js';
import { ingestStatCanSpending } from './adapters/statcan-spending.js';
import { ingestStatCanWealth } from './adapters/statcan-wealth.js';
import { ingestStatCanPropertyOwners } from './adapters/statcan-property-owner.js';
import { ingestCmhcRentalMarket } from './adapters/cmhc-rental.js';
import { ingestOsmBusinesses } from './adapters/osm-businesses.js';
import { ingestBusinessListingsAndBenchmarks } from './adapters/business-listings.js';
import { ingestMunicipalOfficialPlans } from './adapters/muni-official-plans.js';
import { ingestStatCanProjections } from './adapters/statcan-projections.js';
import { ingestStatCanLfsCma } from './adapters/statcan-lfs-cma.js';
import { ingestBuildingInvestments } from './adapters/building-investments.js';
import { ingestMunicipalDevCharges } from './adapters/muni-dev-charges.js';
import { syncCreaDdfListings } from './adapters/crea-ddf.js';
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

    // 4. Statistics Canada Population Estimates (POP-CSD-EST Table 17-10-0155-01)
    await ingestStatCanEstimates();

    // 5. Retail Gasoline Pricing & Delta Engine (FUEL-RETAIL Table 18-10-0001-01)
    await ingestStatCanFuel();

    // 6. Canadian Business Counts (June 2026 Table 33-10-1176-01 & Dec 2025 Table 33-10-1097-01)
    await ingestStatCanBusinessCounts();

    // 7. Population Projections (POP-CSD-PROJ Table 17-10-0162-01)
    await ingestStatCanProjections();

    // 8. Labour Force Survey by CMA (LAB-CMA Tables 14-10-0468-01, 14-10-0461-01)
    await ingestStatCanLfsCma();

    // 9. Ontario MMAH Financial Information Returns (FIR)
    await ingestOntarioFir();

    // 10. Statistics Canada Survey of Household Spending (SHS)
    await ingestStatCanSpending();

    // 11. Statistics Canada Survey of Financial Security (SFS)
    await ingestStatCanWealth();

    // 12. Statistics Canada Residential Property Ownership (Table 46-10-0096-01)
    await ingestStatCanPropertyOwners();

    // 13. CMHC Rental Market Survey (RMS) Indicators
    await ingestCmhcRentalMarket();

    // 14. Investment in Building Construction (BUILD-INVEST Table 34-10-0293-01)
    await ingestBuildingInvestments();

    // 15. Municipal Development Charges By-laws (MUNI-DEV-CHARGE)
    await ingestMunicipalDevCharges();

    // 16. CREA DDF Listings Boundary Verification (CRE-LISTING-DDF)
    await syncCreaDdfListings();

    // 17. OpenStreetMap Business Locations
    await ingestOsmBusinesses();

    // 18. Commercial Listings, CRE Benchmarks & Benchmark Chains
    await ingestBusinessListingsAndBenchmarks();

    // 19. Municipal Official Plans & Strategic Growth Initiatives (Requirement 13)
    await ingestMunicipalOfficialPlans();

    // 20. Precompute Layer 3 Derived Analytics, Rankings & Outliers
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
