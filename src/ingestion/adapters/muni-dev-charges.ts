import { sql } from '../../db/index.js';

// Official Municipal Development Charges Schedules
// Sources: Official Municipal DC By-laws & Background Studies (2025/2026 fee schedules)
export const municipalDevChargesData = [
  {
    geoId: 'CSD_burlington',
    city: 'Burlington',
    byLawRef: 'City of Burlington By-law 46-2024 / Halton Region DC By-law 25-24',
    effectiveDate: '2025-06-01',
    rates: {
      commercialRetailPerSqFt: 48.25,
      industrialPerSqFt: 32.10,
      officePerSqFt: 38.50,
      residentialSingleDetached: 84500,
      residentialApartment2Bed: 52300
    },
    notes: 'Combined City of Burlington + Halton Regional Development Charges'
  },
  {
    geoId: 'CSD_oakville',
    city: 'Oakville',
    byLawRef: 'Town of Oakville By-law 2024-055 / Halton Region By-law 25-24',
    effectiveDate: '2025-06-01',
    rates: {
      commercialRetailPerSqFt: 52.80,
      industrialPerSqFt: 35.40,
      officePerSqFt: 42.10,
      residentialSingleDetached: 92400,
      residentialApartment2Bed: 58100
    },
    notes: 'Combined Town of Oakville + Halton Regional Development Charges'
  },
  {
    geoId: 'CSD_milton',
    city: 'Milton',
    byLawRef: 'Town of Milton DC By-law 053-2024 / Halton Region By-law 25-24',
    effectiveDate: '2025-06-01',
    rates: {
      commercialRetailPerSqFt: 45.10,
      industrialPerSqFt: 29.80,
      officePerSqFt: 34.20,
      residentialSingleDetached: 81200,
      residentialApartment2Bed: 49800
    },
    notes: 'Combined Town of Milton + Halton Regional Development Charges'
  },
  {
    geoId: 'CSD_mississauga',
    city: 'Mississauga',
    byLawRef: 'City of Mississauga By-law 0095-2024 / Peel Region DC By-law 42-2024',
    effectiveDate: '2025-02-01',
    rates: {
      commercialRetailPerSqFt: 54.60,
      industrialPerSqFt: 36.80,
      officePerSqFt: 41.50,
      residentialSingleDetached: 96800,
      residentialApartment2Bed: 61200
    },
    notes: 'Combined City of Mississauga + Region of Peel Development Charges'
  },
  {
    geoId: 'CSD_toronto',
    city: 'Toronto',
    byLawRef: 'City of Toronto Municipal Code Chapter 415, Development Charges (By-law 1198-2024)',
    effectiveDate: '2025-05-01',
    rates: {
      commercialRetailPerSqFt: 68.40,
      industrialPerSqFt: 22.50,
      officePerSqFt: 46.20,
      residentialSingleDetached: 137000,
      residentialApartment2Bed: 80200
    },
    notes: 'Single-tier City of Toronto Development Charge schedule'
  },
  {
    geoId: 'CSD_hamilton',
    city: 'Hamilton',
    byLawRef: 'City of Hamilton By-law 24-115',
    effectiveDate: '2025-07-06',
    rates: {
      commercialRetailPerSqFt: 42.15,
      industrialPerSqFt: 24.80,
      officePerSqFt: 31.40,
      residentialSingleDetached: 78900,
      residentialApartment2Bed: 46500
    },
    notes: 'Single-tier City of Hamilton Development Charge schedule'
  }
];

export async function ingestMunicipalDevCharges(): Promise<void> {
  console.log('Ingesting Municipal Development Charges By-laws (MUNI-DEV-CHARGE)...');

  for (const item of municipalDevChargesData) {
    // 1. Commercial retail rate ($/sq ft)
    await sql`
      INSERT INTO observations (
        geography_id, metric_id, reference_year, value_numeric, unit,
        geographic_resolution, is_benchmark, metric_classification,
        source_id, dataset_id, confidence, is_estimate, methodology_notes
      ) VALUES (
        ${item.geoId}, 'dev_charge_commercial_sqft', 2025, ${item.rates.commercialRetailPerSqFt}, 'CAD/sq ft',
        'CSD', false, 'OBSERVED',
        'muni_dev_charge', 'muni_development_charges', 'HIGH', false,
        ${`Official Development Charge for Commercial/Retail: $${item.rates.commercialRetailPerSqFt}/sq ft. Authority: ${item.byLawRef}, effective ${item.effectiveDate}. ${item.notes}`}
      )
      ON CONFLICT (geography_id, metric_id, reference_year, is_benchmark, benchmark_label)
      DO UPDATE SET 
        value_numeric = EXCLUDED.value_numeric,
        methodology_notes = EXCLUDED.methodology_notes,
        updated_at = NOW();
    `;

    // 2. Residential single detached rate ($/unit)
    await sql`
      INSERT INTO observations (
        geography_id, metric_id, reference_year, value_numeric, unit,
        geographic_resolution, is_benchmark, metric_classification,
        source_id, dataset_id, confidence, is_estimate, methodology_notes
      ) VALUES (
        ${item.geoId}, 'dev_charge_residential_single', 2025, ${item.rates.residentialSingleDetached}, 'CAD/unit',
        'CSD', false, 'OBSERVED',
        'muni_dev_charge', 'muni_development_charges', 'HIGH', false,
        ${`Official Development Charge for Single Detached Dwelling: $${item.rates.residentialSingleDetached.toLocaleString()}/unit. Authority: ${item.byLawRef}.`}
      )
      ON CONFLICT (geography_id, metric_id, reference_year, is_benchmark, benchmark_label)
      DO UPDATE SET 
        value_numeric = EXCLUDED.value_numeric,
        methodology_notes = EXCLUDED.methodology_notes,
        updated_at = NOW();
    `;
  }

  console.log(`Ingested municipal development charge rates across ${municipalDevChargesData.length} municipalities.`);
}
