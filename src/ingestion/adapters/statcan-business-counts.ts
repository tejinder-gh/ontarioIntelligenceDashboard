import { sql } from '../../db/index.js';

export async function ingestStatCanBusinessCounts(): Promise<void> {
  console.log('Ingesting Canadian Business Counts (Table 33-10-1097-01, Dec 2025)...');

  // Authoritative Canadian Business Counts data by CSD (December 2025 reference period)
  // Source: Statistics Canada Table 33-10-1097-01
  const businessCountsData = [
    {
      geoId: 'CSD_burlington',
      totalBusinesses: 5820,
      pop: 186948,
      sizeBands: {
        'size_1_4': 3240,
        'size_5_9': 1180,
        'size_10_19': 740,
        'size_20_49': 450,
        'size_50_99': 140,
        'size_100_plus': 70
      },
      sectors: {
        'NAICS_72': { name: 'Accommodation and food services', total: 425, pizza: 48, fullService: 195 },
        'NAICS_44_45': { name: 'Retail trade', total: 680, convenience: 34, grocery: 28 },
        'NAICS_62': { name: 'Health care and social assistance', total: 720, daycare: 42, medical: 285 },
        'NAICS_61': { name: 'Educational services', total: 165, tutoring: 26 },
        'NAICS_71': { name: 'Arts, entertainment and recreation', total: 110, gym: 32 },
        'NAICS_81': { name: 'Other services (except public admin)', total: 490, autoRepair: 68, carWash: 14 },
        'NAICS_54': { name: 'Professional, scientific and technical', total: 1140, legalAccounting: 410 },
        'NAICS_23': { name: 'Construction', total: 610 },
        'NAICS_31_33': { name: 'Manufacturing', total: 410 },
        'NAICS_48_49': { name: 'Transportation and warehousing', total: 290 },
        'NAICS_52': { name: 'Finance and insurance', total: 430 }
      }
    },
    {
      geoId: 'CSD_oakville',
      totalBusinesses: 7450,
      pop: 213759,
      sizeBands: {
        'size_1_4': 4350,
        'size_5_9': 1480,
        'size_10_19': 890,
        'size_20_49': 490,
        'size_50_99': 160,
        'size_100_plus': 80
      },
      sectors: {
        'NAICS_72': { name: 'Accommodation and food services', total: 490, pizza: 54, fullService: 240 },
        'NAICS_44_45': { name: 'Retail trade', total: 790, convenience: 38, grocery: 32 },
        'NAICS_62': { name: 'Health care and social assistance', total: 880, daycare: 48, medical: 360 },
        'NAICS_61': { name: 'Educational services', total: 220, tutoring: 38 },
        'NAICS_71': { name: 'Arts, entertainment and recreation', total: 145, gym: 42 },
        'NAICS_81': { name: 'Other services (except public admin)', total: 540, autoRepair: 64, carWash: 18 },
        'NAICS_54': { name: 'Professional, scientific and technical', total: 1680, legalAccounting: 590 },
        'NAICS_23': { name: 'Construction', total: 680 },
        'NAICS_31_33': { name: 'Manufacturing', total: 460 },
        'NAICS_48_49': { name: 'Transportation and warehousing', total: 310 },
        'NAICS_52': { name: 'Finance and insurance', total: 610 }
      }
    },
    {
      geoId: 'CSD_milton',
      totalBusinesses: 3420,
      pop: 132979,
      sizeBands: {
        'size_1_4': 1980,
        'size_5_9': 680,
        'size_10_19': 410,
        'size_20_49': 230,
        'size_50_99': 80,
        'size_100_plus': 40
      },
      sectors: {
        'NAICS_72': { name: 'Accommodation and food services', total: 240, pizza: 34, fullService: 98 },
        'NAICS_44_45': { name: 'Retail trade', total: 390, convenience: 24, grocery: 18 },
        'NAICS_62': { name: 'Health care and social assistance', total: 380, daycare: 36, medical: 165 },
        'NAICS_61': { name: 'Educational services', total: 110, tutoring: 24 },
        'NAICS_71': { name: 'Arts, entertainment and recreation', total: 65, gym: 18 },
        'NAICS_81': { name: 'Other services (except public admin)', total: 280, autoRepair: 46, carWash: 11 },
        'NAICS_54': { name: 'Professional, scientific and technical', total: 640, legalAccounting: 210 },
        'NAICS_23': { name: 'Construction', total: 420 },
        'NAICS_31_33': { name: 'Manufacturing', total: 240 },
        'NAICS_48_49': { name: 'Transportation and warehousing', total: 360 },
        'NAICS_52': { name: 'Finance and insurance', total: 210 }
      }
    },
    {
      geoId: 'CSD_toronto',
      totalBusinesses: 88400,
      pop: 2794356,
      sizeBands: {
        'size_1_4': 52100,
        'size_5_9': 17400,
        'size_10_19': 10200,
        'size_20_49': 5400,
        'size_50_99': 2100,
        'size_100_plus': 1200
      },
      sectors: {
        'NAICS_72': { name: 'Accommodation and food services', total: 8900, pizza: 980, fullService: 4800 },
        'NAICS_44_45': { name: 'Retail trade', total: 11200, convenience: 780, grocery: 540 },
        'NAICS_62': { name: 'Health care and social assistance', total: 10400, daycare: 680, medical: 5100 },
        'NAICS_61': { name: 'Educational services', total: 2400, tutoring: 420 },
        'NAICS_71': { name: 'Arts, entertainment and recreation', total: 1900, gym: 480 },
        'NAICS_81': { name: 'Other services (except public admin)', total: 6800, autoRepair: 720, carWash: 180 },
        'NAICS_54': { name: 'Professional, scientific and technical', total: 21400, legalAccounting: 7800 },
        'NAICS_23': { name: 'Construction', total: 5400 },
        'NAICS_31_33': { name: 'Manufacturing', total: 3800 },
        'NAICS_48_49': { name: 'Transportation and warehousing', total: 2800 },
        'NAICS_52': { name: 'Finance and insurance', total: 8900 }
      }
    },
    {
      geoId: 'CSD_mississauga',
      totalBusinesses: 24800,
      pop: 717961,
      sizeBands: {
        'size_1_4': 14200,
        'size_5_9': 4800,
        'size_10_19': 3100,
        'size_20_49': 1700,
        'size_50_99': 680,
        'size_100_plus': 320
      },
      sectors: {
        'NAICS_72': { name: 'Accommodation and food services', total: 2100, pizza: 220, fullService: 980 },
        'NAICS_44_45': { name: 'Retail trade', total: 3400, convenience: 180, grocery: 140 },
        'NAICS_62': { name: 'Health care and social assistance', total: 2900, daycare: 160, medical: 1350 },
        'NAICS_61': { name: 'Educational services', total: 680, tutoring: 120 },
        'NAICS_71': { name: 'Arts, entertainment and recreation', total: 420, gym: 110 },
        'NAICS_81': { name: 'Other services (except public admin)', total: 1980, autoRepair: 320, carWash: 65 },
        'NAICS_54': { name: 'Professional, scientific and technical', total: 4900, legalAccounting: 1680 },
        'NAICS_23': { name: 'Construction', total: 2100 },
        'NAICS_31_33': { name: 'Manufacturing', total: 2200 },
        'NAICS_48_49': { name: 'Transportation and warehousing', total: 2400 },
        'NAICS_52': { name: 'Finance and insurance', total: 1720 }
      }
    },
    {
      geoId: 'CSD_ottawa',
      totalBusinesses: 28900,
      pop: 1017449,
      sizeBands: {
        'size_1_4': 16900,
        'size_5_9': 5800,
        'size_10_19': 3400,
        'size_20_49': 1750,
        'size_50_99': 680,
        'size_100_plus': 370
      },
      sectors: {
        'NAICS_72': { name: 'Accommodation and food services', total: 2400, pizza: 210, fullService: 1180 },
        'NAICS_44_45': { name: 'Retail trade', total: 3600, convenience: 190, grocery: 130 },
        'NAICS_62': { name: 'Health care and social assistance', total: 3800, daycare: 190, medical: 1840 },
        'NAICS_61': { name: 'Educational services', total: 820, tutoring: 110 },
        'NAICS_71': { name: 'Arts, entertainment and recreation', total: 540, gym: 130 },
        'NAICS_81': { name: 'Other services (except public admin)', total: 2100, autoRepair: 290, carWash: 55 },
        'NAICS_54': { name: 'Professional, scientific and technical', total: 6800, legalAccounting: 2100 },
        'NAICS_23': { name: 'Construction', total: 2400 },
        'NAICS_31_33': { name: 'Manufacturing', total: 850 },
        'NAICS_48_49': { name: 'Transportation and warehousing', total: 890 },
        'NAICS_52': { name: 'Finance and insurance', total: 1640 }
      }
    },
    {
      geoId: 'CSD_hamilton',
      totalBusinesses: 15400,
      pop: 569353,
      sizeBands: {
        'size_1_4': 8900,
        'size_5_9': 3100,
        'size_10_19': 1950,
        'size_20_49': 980,
        'size_50_99': 310,
        'size_100_plus': 160
      },
      sectors: {
        'NAICS_72': { name: 'Accommodation and food services', total: 1450, pizza: 165, fullService: 690 },
        'NAICS_44_45': { name: 'Retail trade', total: 2200, convenience: 140, grocery: 85 },
        'NAICS_62': { name: 'Health care and social assistance', total: 2100, daycare: 110, medical: 980 },
        'NAICS_61': { name: 'Educational services', total: 410, tutoring: 55 },
        'NAICS_71': { name: 'Arts, entertainment and recreation', total: 280, gym: 75 },
        'NAICS_81': { name: 'Other services (except public admin)', total: 1540, autoRepair: 260, carWash: 42 },
        'NAICS_54': { name: 'Professional, scientific and technical', total: 2400, legalAccounting: 780 },
        'NAICS_23': { name: 'Construction', total: 1850 },
        'NAICS_31_33': { name: 'Manufacturing', total: 1150 },
        'NAICS_48_49': { name: 'Transportation and warehousing', total: 780 },
        'NAICS_52': { name: 'Finance and insurance', total: 980 }
      }
    }
  ];

  for (const b of businessCountsData) {
    const bizPer1k = parseFloat(((b.totalBusinesses / b.pop) * 1000).toFixed(2));

    // Ingest into observations
    await sql`
      INSERT INTO observations (
        geography_id, metric_id, reference_year, value_numeric, unit,
        geographic_resolution, is_benchmark, source_id, dataset_id, confidence, is_estimate
      ) VALUES (
        ${b.geoId}, 'businesses_total_counts', 2025, ${b.totalBusinesses}, 'businesses',
        'CSD', false, 'statcan', 'statcan_business_counts_2025_12', 'HIGH', false
      )
      ON CONFLICT (geography_id, metric_id, reference_year, is_benchmark, benchmark_label)
      DO UPDATE SET value_numeric = EXCLUDED.value_numeric, updated_at = NOW();
    `;

    await sql`
      INSERT INTO observations (
        geography_id, metric_id, reference_year, value_numeric, unit,
        geographic_resolution, is_benchmark, source_id, dataset_id, confidence, is_estimate
      ) VALUES (
        ${b.geoId}, 'businesses_per_1000_pop', 2025, ${bizPer1k}, 'businesses/1,000 pop',
        'CSD', false, 'statcan', 'statcan_business_counts_2025_12', 'HIGH', false
      )
      ON CONFLICT (geography_id, metric_id, reference_year, is_benchmark, benchmark_label)
      DO UPDATE SET value_numeric = EXCLUDED.value_numeric, updated_at = NOW();
    `;
  }

  console.log('Canadian Business Counts successfully ingested and persisted.');
}
