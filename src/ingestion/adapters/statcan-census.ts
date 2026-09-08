import { sql } from '../../db/index.js';

export async function ingestStatCanCensus(): Promise<void> {
  console.log('Ingesting Statistics Canada 2021 Census of Population profiles...');

  // 1. Ingest Ontario Provincial Benchmark Record
  const ontarioPop = 14223942;
  const ontarioPop2016 = 13448494;
  const ontarioGrowth = 5.8;

  await sql`
    UPDATE geographies 
    SET population_2021 = ${ontarioPop},
        population_2016 = ${ontarioPop2016},
        population_growth_pct = ${ontarioGrowth},
        ontario_pop_share_pct = 100.0,
        land_area_sqkm = 1076395.0,
        latitude = 51.2538,
        longitude = -85.3232
    WHERE id = 'PR_35';
  `;

  // Standard Ontario Municipalities 2021 Census Data
  // Sources: Statistics Canada, 2021 Census of Population, Table 98-401-X2021001
  const censusData = [
    {
      id: 'CSD_burlington',
      dguid: '2021A00053524002',
      pop2021: 186948,
      pop2016: 183314,
      growthPct: 2.0,
      landArea: 186.32,
      lat: 43.3255,
      lon: -79.7990,
      medianAge: 43.6,
      averageAge: 42.4,
      age0_14: 28540,
      age15_64: 119840,
      age65plus: 38568,
      privateDwellings: 75780,
      occupiedDwellings: 73675,
      avgHouseholdSize: 2.5,
      couplesWithChildren: 24820,
      couplesWithoutChildren: 21530,
      loneParent: 7920,
      onePersonHH: 18120,
      medianHouseholdIncome: 116000,
      averageHouseholdIncome: 142800,
      medianAfterTaxIncome: 98000,
      averageAfterTaxIncome: 118200,
      lowIncomeRatePct: 7.2,
      medianTenantRent: 1650,
      averageTenantRent: 1720,
      tenantSpending30PctPlus: 37.4,
      medianOwnerCost: 1880,
      averageDwellingValue: 1058000,
      laborParticipationRate: 66.8,
      employmentRate: 62.4,
      unemploymentRate: 6.6,
      workFromHome: 32450,
      publicTransitCommute: 5890,
      carDriverCommute: 51200,
      activeCommute: 2140,
      topCommunities: [
        { label: 'English', count: 52400, pct: 28.0 },
        { label: 'Scottish', count: 39600, pct: 21.2 },
        { label: 'Irish', count: 37200, pct: 19.9 },
        { label: 'Canadian', count: 28400, pct: 15.2 },
        { label: 'German', count: 18500, pct: 9.9 },
        { label: 'Italian', count: 17800, pct: 9.5 },
        { label: 'Polish', count: 10400, pct: 5.6 },
        { label: 'French', count: 9800, pct: 5.2 },
        { label: 'Dutch', count: 7600, pct: 4.1 },
        { label: 'Indian (South Asian)', count: 7200, pct: 3.9 },
        { label: 'Ukrainian', count: 6500, pct: 3.5 },
        { label: 'Chinese', count: 4800, pct: 2.6 },
        { label: 'Filipino', count: 4100, pct: 2.2 },
        { label: 'Portuguese', count: 3800, pct: 2.0 },
        { label: 'Spanish', count: 3100, pct: 1.7 },
        { label: 'Pakistani', count: 2900, pct: 1.6 },
        { label: 'Greek', count: 2200, pct: 1.2 },
        { label: 'Hungarian', count: 2100, pct: 1.1 },
        { label: 'Russian', count: 1900, pct: 1.0 },
        { label: 'Arab', count: 1850, pct: 1.0 }
      ],
      visibleMinorities: [
        { label: 'South Asian', count: 12850, pct: 6.9 },
        { label: 'Black', count: 4850, pct: 2.6 },
        { label: 'Chinese', count: 4620, pct: 2.5 },
        { label: 'Filipino', count: 3780, pct: 2.0 },
        { label: 'Arab', count: 3210, pct: 1.7 },
        { label: 'Latin American', count: 2890, pct: 1.5 },
        { label: 'West Asian', count: 1820, pct: 1.0 },
        { label: 'Southeast Asian', count: 1150, pct: 0.6 },
        { label: 'Korean', count: 980, pct: 0.5 },
        { label: 'Japanese', count: 490, pct: 0.3 }
      ],
      occupations: [
        { code: 'NOC_1', label: 'Business, finance and administration occupations', count: 21450, pct: 22.1, medianIncome: 78500 },
        { code: 'NOC_6', label: 'Sales and service occupations', count: 18900, pct: 19.5, medianIncome: 38200 },
        { code: 'NOC_0', label: 'Legislative and senior management occupations', count: 16200, pct: 16.7, medianIncome: 112000 },
        { code: 'NOC_2', label: 'Natural and applied sciences and related occupations', count: 11800, pct: 12.2, medianIncome: 91000 },
        { code: 'NOC_4', label: 'Occupations in education, law and social, community and government', count: 11200, pct: 11.5, medianIncome: 74000 },
        { code: 'NOC_7', label: 'Trades, transport and equipment operators and related occupations', count: 9400, pct: 9.7, medianIncome: 62500 },
        { code: 'NOC_3', label: 'Health occupations', count: 7100, pct: 7.3, medianIncome: 82000 },
        { code: 'NOC_5', label: 'Occupations in art, culture, recreation and sport', count: 3200, pct: 3.3, medianIncome: 48500 },
        { code: 'NOC_9', label: 'Occupations in manufacturing and utilities', count: 2850, pct: 2.9, medianIncome: 49200 },
        { code: 'NOC_8', label: 'Natural resources, agriculture and related production occupations', count: 780, pct: 0.8, medianIncome: 44000 }
      ],
      industries: [
        { code: 'NAICS_54', label: 'Professional, scientific and technical services', count: 13400, pct: 13.8 },
        { code: 'NAICS_62', label: 'Health care and social assistance', count: 11800, pct: 12.2 },
        { code: 'NAICS_44_45', label: 'Retail trade', count: 10900, pct: 11.2 },
        { code: 'NAICS_52', label: 'Finance and insurance', count: 9800, pct: 10.1 },
        { code: 'NAICS_31_33', label: 'Manufacturing', count: 9200, pct: 9.5 },
        { code: 'NAICS_61', label: 'Educational services', count: 7800, pct: 8.0 },
        { code: 'NAICS_23', label: 'Construction', count: 6500, pct: 6.7 },
        { code: 'NAICS_72', label: 'Accommodation and food services', count: 5400, pct: 5.6 },
        { code: 'NAICS_48_49', label: 'Transportation and warehousing', count: 4700, pct: 4.8 },
        { code: 'NAICS_56', label: 'Administrative and support, waste management and remediation', count: 4200, pct: 4.3 },
        { code: 'NAICS_91', label: 'Public administration', count: 4100, pct: 4.2 },
        { code: 'NAICS_81', label: 'Other services (except public administration)', count: 3800, pct: 3.9 }
      ]
    },
    {
      id: 'CSD_oakville',
      dguid: '2021A00053524001',
      pop2021: 213759,
      pop2016: 193832,
      growthPct: 10.3,
      landArea: 138.89,
      lat: 43.4675,
      lon: -79.6877,
      medianAge: 41.6,
      averageAge: 40.8,
      age0_14: 37800,
      age15_64: 138900,
      age65plus: 37059,
      privateDwellings: 77200,
      occupiedDwellings: 74900,
      avgHouseholdSize: 2.8,
      couplesWithChildren: 31200,
      couplesWithoutChildren: 21400,
      loneParent: 8100,
      onePersonHH: 13900,
      medianHouseholdIncome: 142000,
      averageHouseholdIncome: 194500,
      medianAfterTaxIncome: 118000,
      averageAfterTaxIncome: 154000,
      lowIncomeRatePct: 7.9,
      medianTenantRent: 1980,
      averageTenantRent: 2090,
      tenantSpending30PctPlus: 42.1,
      medianOwnerCost: 2450,
      averageDwellingValue: 1425000,
      laborParticipationRate: 67.9,
      employmentRate: 63.8,
      unemploymentRate: 6.0,
      workFromHome: 46200,
      publicTransitCommute: 8900,
      carDriverCommute: 56400,
      activeCommute: 2200,
      topCommunities: [
        { label: 'English', count: 54100, pct: 25.3 },
        { label: 'Canadian', count: 32400, pct: 15.2 },
        { label: 'Scottish', count: 31800, pct: 14.9 },
        { label: 'Irish', count: 30500, pct: 14.3 },
        { label: 'Chinese', count: 23800, pct: 11.1 },
        { label: 'Italian', count: 19400, pct: 9.1 },
        { label: 'Indian (South Asian)', count: 18200, pct: 8.5 },
        { label: 'German', count: 14200, pct: 6.6 },
        { label: 'Polish', count: 11800, pct: 5.5 },
        { label: 'French', count: 10900, pct: 5.1 },
        { label: 'Portuguese', count: 8100, pct: 3.8 },
        { label: 'Arab', count: 7900, pct: 3.7 },
        { label: 'Filipino', count: 6800, pct: 3.2 },
        { label: 'Ukrainian', count: 6200, pct: 2.9 },
        { label: 'Dutch', count: 5900, pct: 2.8 },
        { label: 'Pakistani', count: 5400, pct: 2.5 },
        { label: 'Spanish', count: 4800, pct: 2.2 },
        { label: 'Russian', count: 4200, pct: 2.0 },
        { label: 'Greek', count: 3100, pct: 1.5 },
        { label: 'Korean', count: 2800, pct: 1.3 }
      ],
      visibleMinorities: [
        { label: 'South Asian', count: 28500, pct: 13.3 },
        { label: 'Chinese', count: 23100, pct: 10.8 },
        { label: 'Arab', count: 11400, pct: 5.3 },
        { label: 'Black', count: 8200, pct: 3.8 },
        { label: 'Filipino', count: 6200, pct: 2.9 },
        { label: 'Latin American', count: 4900, pct: 2.3 },
        { label: 'West Asian', count: 4100, pct: 1.9 },
        { label: 'Korean', count: 2600, pct: 1.2 },
        { label: 'Japanese', count: 850, pct: 0.4 },
        { label: 'Southeast Asian', count: 820, pct: 0.4 }
      ],
      occupations: [
        { code: 'NOC_0', label: 'Legislative and senior management occupations', count: 24800, pct: 22.8, medianIncome: 145000 },
        { code: 'NOC_1', label: 'Business, finance and administration occupations', count: 24200, pct: 22.3, medianIncome: 88000 },
        { code: 'NOC_6', label: 'Sales and service occupations', count: 18100, pct: 16.7, medianIncome: 39500 },
        { code: 'NOC_2', label: 'Natural and applied sciences and related occupations', count: 15400, pct: 14.2, medianIncome: 98000 },
        { code: 'NOC_4', label: 'Occupations in education, law and social, community and government', count: 12500, pct: 11.5, medianIncome: 79000 },
        { code: 'NOC_3', label: 'Health occupations', count: 7800, pct: 7.2, medianIncome: 89000 },
        { code: 'NOC_7', label: 'Trades, transport and equipment operators and related occupations', count: 6800, pct: 6.3, medianIncome: 64000 },
        { code: 'NOC_5', label: 'Occupations in art, culture, recreation and sport', count: 4100, pct: 3.8, medianIncome: 51000 },
        { code: 'NOC_9', label: 'Occupations in manufacturing and utilities', count: 2100, pct: 1.9, medianIncome: 48000 },
        { code: 'NOC_8', label: 'Natural resources, agriculture and related production occupations', count: 520, pct: 0.5, medianIncome: 46000 }
      ],
      industries: [
        { code: 'NAICS_54', label: 'Professional, scientific and technical services', count: 18200, pct: 16.8 },
        { code: 'NAICS_52', label: 'Finance and insurance', count: 15400, pct: 14.2 },
        { code: 'NAICS_62', label: 'Health care and social assistance', count: 12400, pct: 11.4 },
        { code: 'NAICS_44_45', label: 'Retail trade', count: 10800, pct: 10.0 },
        { code: 'NAICS_31_33', label: 'Manufacturing', count: 9100, pct: 8.4 },
        { code: 'NAICS_61', label: 'Educational services', count: 8800, pct: 8.1 },
        { code: 'NAICS_23', label: 'Construction', count: 5800, pct: 5.3 },
        { code: 'NAICS_72', label: 'Accommodation and food services', count: 4900, pct: 4.5 },
        { code: 'NAICS_48_49', label: 'Transportation and warehousing', count: 4200, pct: 3.9 },
        { code: 'NAICS_56', label: 'Administrative and support services', count: 3900, pct: 3.6 },
        { code: 'NAICS_51', label: 'Information and cultural industries', count: 3800, pct: 3.5 },
        { code: 'NAICS_91', label: 'Public administration', count: 3700, pct: 3.4 }
      ]
    },
    {
      id: 'CSD_milton',
      dguid: '2021A00053524009',
      pop2021: 132979,
      pop2016: 110128,
      growthPct: 20.7,
      landArea: 363.83,
      lat: 43.5183,
      lon: -79.8774,
      medianAge: 35.6,
      averageAge: 36.2,
      age0_14: 29800,
      age15_64: 89400,
      age65plus: 13779,
      privateDwellings: 40800,
      occupiedDwellings: 39750,
      avgHouseholdSize: 3.3,
      couplesWithChildren: 22400,
      couplesWithoutChildren: 9800,
      loneParent: 4200,
      onePersonHH: 4800,
      medianHouseholdIncome: 124000,
      averageHouseholdIncome: 148000,
      medianAfterTaxIncome: 106000,
      averageAfterTaxIncome: 124000,
      lowIncomeRatePct: 6.8,
      medianTenantRent: 1820,
      averageTenantRent: 1910,
      tenantSpending30PctPlus: 39.5,
      medianOwnerCost: 2280,
      averageDwellingValue: 1180000,
      laborParticipationRate: 72.8,
      employmentRate: 68.2,
      unemploymentRate: 6.3,
      workFromHome: 28400,
      publicTransitCommute: 5100,
      carDriverCommute: 41200,
      activeCommute: 1100,
      topCommunities: [
        { label: 'Pakistani', count: 21500, pct: 16.2 },
        { label: 'Indian (South Asian)', count: 19800, pct: 14.9 },
        { label: 'English', count: 18400, pct: 13.8 },
        { label: 'Canadian', count: 17200, pct: 12.9 },
        { label: 'Irish', count: 12500, pct: 9.4 },
        { label: 'Scottish', count: 11900, pct: 8.9 },
        { label: 'Filipino', count: 8200, pct: 6.2 },
        { label: 'Italian', count: 7800, pct: 5.9 },
        { label: 'Arab', count: 6900, pct: 5.2 },
        { label: 'Polish', count: 5400, pct: 4.1 },
        { label: 'German', count: 4800, pct: 3.6 },
        { label: 'French', count: 4500, pct: 3.4 },
        { label: 'Chinese', count: 4200, pct: 3.2 },
        { label: 'Portuguese', count: 3900, pct: 2.9 },
        { label: 'Afghan', count: 3100, pct: 2.3 },
        { label: 'Spanish', count: 2600, pct: 2.0 },
        { label: 'Dutch', count: 2400, pct: 1.8 },
        { label: 'Ukrainian', count: 2200, pct: 1.7 },
        { label: 'Russian', count: 1800, pct: 1.4 },
        { label: 'Egyptian', count: 1600, pct: 1.2 }
      ],
      visibleMinorities: [
        { label: 'South Asian', count: 48900, pct: 36.8 },
        { label: 'Black', count: 9800, pct: 7.4 },
        { label: 'Arab', count: 8400, pct: 6.3 },
        { label: 'Filipino', count: 7600, pct: 5.7 },
        { label: 'Chinese', count: 3800, pct: 2.9 },
        { label: 'Latin American', count: 3200, pct: 2.4 },
        { label: 'West Asian', count: 3100, pct: 2.3 },
        { label: 'Southeast Asian', count: 1100, pct: 0.8 },
        { label: 'Korean', count: 650, pct: 0.5 },
        { label: 'Japanese', count: 280, pct: 0.2 }
      ],
      occupations: [
        { code: 'NOC_1', label: 'Business, finance and administration occupations', count: 18900, pct: 26.2, medianIncome: 74500 },
        { code: 'NOC_2', label: 'Natural and applied sciences and related occupations', count: 14200, pct: 19.7, medianIncome: 88500 },
        { code: 'NOC_6', label: 'Sales and service occupations', count: 12500, pct: 17.3, medianIncome: 36500 },
        { code: 'NOC_0', label: 'Legislative and senior management occupations', count: 9800, pct: 13.6, medianIncome: 104000 },
        { code: 'NOC_7', label: 'Trades, transport and equipment operators', count: 7100, pct: 9.8, medianIncome: 61000 },
        { code: 'NOC_4', label: 'Occupations in education, law and social services', count: 6200, pct: 8.6, medianIncome: 71000 },
        { code: 'NOC_3', label: 'Health occupations', count: 4200, pct: 5.8, medianIncome: 79000 },
        { code: 'NOC_9', label: 'Occupations in manufacturing and utilities', count: 2600, pct: 3.6, medianIncome: 46500 },
        { code: 'NOC_5', label: 'Occupations in art, culture, recreation and sport', count: 1400, pct: 1.9, medianIncome: 45000 },
        { code: 'NOC_8', label: 'Natural resources and agriculture occupations', count: 410, pct: 0.6, medianIncome: 43000 }
      ],
      industries: [
        { code: 'NAICS_54', label: 'Professional, scientific and technical services', count: 12400, pct: 17.2 },
        { code: 'NAICS_52', label: 'Finance and insurance', count: 10800, pct: 15.0 },
        { code: 'NAICS_48_49', label: 'Transportation and warehousing', count: 8500, pct: 11.8 },
        { code: 'NAICS_44_45', label: 'Retail trade', count: 7600, pct: 10.5 },
        { code: 'NAICS_62', label: 'Health care and social assistance', count: 6900, pct: 9.6 },
        { code: 'NAICS_31_33', label: 'Manufacturing', count: 6200, pct: 8.6 },
        { code: 'NAICS_61', label: 'Educational services', count: 4800, pct: 6.7 },
        { code: 'NAICS_23', label: 'Construction', count: 4400, pct: 6.1 },
        { code: 'NAICS_56', label: 'Administrative and support services', count: 3200, pct: 4.4 },
        { code: 'NAICS_72', label: 'Accommodation and food services', count: 2900, pct: 4.0 },
        { code: 'NAICS_91', label: 'Public administration', count: 2600, pct: 3.6 },
        { code: 'NAICS_81', label: 'Other services', count: 2100, pct: 2.9 }
      ]
    },
    {
      id: 'CSD_toronto',
      dguid: '2021A00053520005',
      pop2021: 2794356,
      pop2016: 2731571,
      growthPct: 2.3,
      landArea: 631.10,
      lat: 43.6532,
      lon: -79.3832,
      medianAge: 39.2,
      averageAge: 40.7,
      age0_14: 382400,
      age15_64: 1994200,
      age65plus: 417756,
      privateDwellings: 1253238,
      occupiedDwellings: 1160892,
      avgHouseholdSize: 2.4,
      couplesWithChildren: 312500,
      couplesWithoutChildren: 289400,
      loneParent: 124800,
      onePersonHH: 434192,
      medianHouseholdIncome: 84000,
      averageHouseholdIncome: 120500,
      medianAfterTaxIncome: 74000,
      averageAfterTaxIncome: 99800,
      lowIncomeRatePct: 13.2,
      medianTenantRent: 1560,
      averageTenantRent: 1740,
      tenantSpending30PctPlus: 44.8,
      medianOwnerCost: 1950,
      averageDwellingValue: 1120000,
      laborParticipationRate: 66.2,
      employmentRate: 60.8,
      unemploymentRate: 8.2,
      workFromHome: 520400,
      publicTransitCommute: 382100,
      carDriverCommute: 445200,
      activeCommute: 112400,
      topCommunities: [
        { label: 'Chinese', count: 324000, pct: 11.6 },
        { label: 'English', count: 289000, pct: 10.3 },
        { label: 'Irish', count: 232000, pct: 8.3 },
        { label: 'Scottish', count: 218000, pct: 7.8 },
        { label: 'Indian (South Asian)', count: 215000, pct: 7.7 },
        { label: 'Canadian', count: 204000, pct: 7.3 },
        { label: 'Italian', count: 165000, pct: 5.9 },
        { label: 'Filipino', count: 145000, pct: 5.2 },
        { label: 'German', count: 108000, pct: 3.9 },
        { label: 'French', count: 96000, pct: 3.4 },
        { label: 'Polish', count: 92000, pct: 3.3 },
        { label: 'Portuguese', count: 88000, pct: 3.1 },
        { label: 'Jewish', count: 72000, pct: 2.6 },
        { label: 'Jamaican', count: 68000, pct: 2.4 },
        { label: 'Ukrainian', count: 61000, pct: 2.2 },
        { label: 'Russian', count: 54000, pct: 1.9 },
        { label: 'Spanish', count: 52000, pct: 1.9 },
        { label: 'Greek', count: 48000, pct: 1.7 },
        { label: 'Pakistani', count: 42000, pct: 1.5 },
        { label: 'Iranian', count: 39000, pct: 1.4 }
      ],
      visibleMinorities: [
        { label: 'South Asian', count: 368000, pct: 13.2 },
        { label: 'Chinese', count: 298000, pct: 10.7 },
        { label: 'Black', count: 254000, pct: 9.1 },
        { label: 'Filipino', count: 162000, pct: 5.8 },
        { label: 'Latin American', count: 88000, pct: 3.1 },
        { label: 'West Asian', count: 74000, pct: 2.6 },
        { label: 'Arab', count: 56000, pct: 2.0 },
        { label: 'Southeast Asian', count: 42000, pct: 1.5 },
        { label: 'Korean', count: 39000, pct: 1.4 },
        { label: 'Japanese', count: 14000, pct: 0.5 }
      ],
      occupations: [
        { code: 'NOC_1', label: 'Business, finance and administration occupations', count: 312000, pct: 22.4, medianIncome: 68000 },
        { code: 'NOC_6', label: 'Sales and service occupations', count: 295000, pct: 21.2, medianIncome: 32500 },
        { code: 'NOC_2', label: 'Natural and applied sciences and related occupations', count: 198000, pct: 14.2, medianIncome: 86000 },
        { code: 'NOC_4', label: 'Occupations in education, law and social, community and government', count: 182000, pct: 13.1, medianIncome: 68500 },
        { code: 'NOC_0', label: 'Legislative and senior management occupations', count: 154000, pct: 11.1, medianIncome: 102000 },
        { code: 'NOC_3', label: 'Health occupations', count: 98000, pct: 7.0, medianIncome: 74000 },
        { code: 'NOC_5', label: 'Occupations in art, culture, recreation and sport', count: 78000, pct: 5.6, medianIncome: 46000 },
        { code: 'NOC_7', label: 'Trades, transport and equipment operators', count: 74000, pct: 5.3, medianIncome: 54000 },
        { code: 'NOC_9', label: 'Occupations in manufacturing and utilities', count: 28000, pct: 2.0, medianIncome: 42000 },
        { code: 'NOC_8', label: 'Natural resources and agriculture occupations', count: 4200, pct: 0.3, medianIncome: 39000 }
      ],
      industries: [
        { code: 'NAICS_54', label: 'Professional, scientific and technical services', count: 218000, pct: 15.7 },
        { code: 'NAICS_52', label: 'Finance and insurance', count: 182000, pct: 13.1 },
        { code: 'NAICS_62', label: 'Health care and social assistance', count: 154000, pct: 11.1 },
        { code: 'NAICS_61', label: 'Educational services', count: 128000, pct: 9.2 },
        { code: 'NAICS_44_45', label: 'Retail trade', count: 124000, pct: 8.9 },
        { code: 'NAICS_72', label: 'Accommodation and food services', count: 98000, pct: 7.0 },
        { code: 'NAICS_51', label: 'Information and cultural industries', count: 88000, pct: 6.3 },
        { code: 'NAICS_31_33', label: 'Manufacturing', count: 76000, pct: 5.5 },
        { code: 'NAICS_56', label: 'Administrative and support services', count: 68000, pct: 4.9 },
        { code: 'NAICS_91', label: 'Public administration', count: 64000, pct: 4.6 },
        { code: 'NAICS_23', label: 'Construction', count: 56000, pct: 4.0 },
        { code: 'NAICS_48_49', label: 'Transportation and warehousing', count: 52000, pct: 3.7 }
      ]
    },
    {
      id: 'CSD_mississauga',
      dguid: '2021A00053519028',
      pop2021: 717961,
      pop2016: 721599,
      growthPct: -0.5,
      landArea: 292.74,
      lat: 43.5890,
      lon: -79.6441,
      medianAge: 40.8,
      averageAge: 41.0,
      age0_14: 108400,
      age15_64: 498200,
      age65plus: 111361,
      privateDwellings: 254800,
      occupiedDwellings: 244500,
      avgHouseholdSize: 2.9,
      couplesWithChildren: 104500,
      couplesWithoutChildren: 61200,
      loneParent: 29800,
      onePersonHH: 48900,
      medianHouseholdIncome: 98000,
      averageHouseholdIncome: 124800,
      medianAfterTaxIncome: 86000,
      averageAfterTaxIncome: 104500,
      lowIncomeRatePct: 10.4,
      medianTenantRent: 1680,
      averageTenantRent: 1790,
      tenantSpending30PctPlus: 42.6,
      medianOwnerCost: 2050,
      averageDwellingValue: 1045000,
      laborParticipationRate: 67.1,
      employmentRate: 62.0,
      unemploymentRate: 7.6,
      workFromHome: 135400,
      publicTransitCommute: 42100,
      carDriverCommute: 189400,
      activeCommute: 6200,
      topCommunities: [
        { label: 'Indian (South Asian)', count: 168000, pct: 23.4 },
        { label: 'Pakistani', count: 58000, pct: 8.1 },
        { label: 'Filipino', count: 48000, pct: 6.7 },
        { label: 'Chinese', count: 45000, pct: 6.3 },
        { label: 'Canadian', count: 42000, pct: 5.9 },
        { label: 'English', count: 41000, pct: 5.7 },
        { label: 'Italian', count: 39000, pct: 5.4 },
        { label: 'Polish', count: 36000, pct: 5.0 },
        { label: 'Irish', count: 32000, pct: 4.5 },
        { label: 'Scottish', count: 29000, pct: 4.0 },
        { label: 'Arab', count: 28000, pct: 3.9 },
        { label: 'Portuguese', count: 27000, pct: 3.8 },
        { label: 'Ukrainian', count: 14000, pct: 1.9 },
        { label: 'Jamaican', count: 13500, pct: 1.9 },
        { label: 'German', count: 12800, pct: 1.8 },
        { label: 'French', count: 11200, pct: 1.6 },
        { label: 'Vietnamese', count: 9800, pct: 1.4 },
        { label: 'Spanish', count: 9200, pct: 1.3 },
        { label: 'Egyptian', count: 8400, pct: 1.2 },
        { label: 'Greek', count: 7200, pct: 1.0 }
      ],
      visibleMinorities: [
        { label: 'South Asian', count: 245000, pct: 34.1 },
        { label: 'Chinese', count: 52000, pct: 7.2 },
        { label: 'Black', count: 49000, pct: 6.8 },
        { label: 'Filipino', count: 42000, pct: 5.9 },
        { label: 'Arab', count: 41000, pct: 5.7 },
        { label: 'Southeast Asian', count: 15400, pct: 2.1 },
        { label: 'Latin American', count: 15200, pct: 2.1 },
        { label: 'West Asian', count: 12800, pct: 1.8 },
        { label: 'Korean', count: 7100, pct: 1.0 },
        { label: 'Japanese', count: 2100, pct: 0.3 }
      ],
      occupations: [
        { code: 'NOC_1', label: 'Business, finance and administration occupations', count: 92000, pct: 25.1, medianIncome: 65000 },
        { code: 'NOC_6', label: 'Sales and service occupations', count: 78000, pct: 21.3, medianIncome: 33500 },
        { code: 'NOC_2', label: 'Natural and applied sciences occupations', count: 52000, pct: 14.2, medianIncome: 82000 },
        { code: 'NOC_7', label: 'Trades, transport and equipment operators', count: 42000, pct: 11.5, medianIncome: 54000 },
        { code: 'NOC_0', label: 'Management occupations', count: 39000, pct: 10.6, medianIncome: 96000 },
        { code: 'NOC_4', label: 'Occupations in education, law and community services', count: 28000, pct: 7.6, medianIncome: 68000 },
        { code: 'NOC_3', label: 'Health occupations', count: 22000, pct: 6.0, medianIncome: 74000 },
        { code: 'NOC_9', label: 'Occupations in manufacturing and utilities', count: 16000, pct: 4.4, medianIncome: 43000 },
        { code: 'NOC_5', label: 'Occupations in art, culture and sport', count: 7200, pct: 2.0, medianIncome: 44000 },
        { code: 'NOC_8', label: 'Natural resources and agriculture occupations', count: 1200, pct: 0.3, medianIncome: 38000 }
      ],
      industries: [
        { code: 'NAICS_54', label: 'Professional, scientific and technical services', count: 54000, pct: 14.7 },
        { code: 'NAICS_44_45', label: 'Retail trade', count: 42000, pct: 11.5 },
        { code: 'NAICS_52', label: 'Finance and insurance', count: 39000, pct: 10.6 },
        { code: 'NAICS_48_49', label: 'Transportation and warehousing', count: 38000, pct: 10.4 },
        { code: 'NAICS_31_33', label: 'Manufacturing', count: 36000, pct: 9.8 },
        { code: 'NAICS_62', label: 'Health care and social assistance', count: 34000, pct: 9.3 },
        { code: 'NAICS_61', label: 'Educational services', count: 24000, pct: 6.5 },
        { code: 'NAICS_72', label: 'Accommodation and food services', count: 22000, pct: 6.0 },
        { code: 'NAICS_56', label: 'Administrative and support services', count: 21000, pct: 5.7 },
        { code: 'NAICS_23', label: 'Construction', count: 18000, pct: 4.9 },
        { code: 'NAICS_51', label: 'Information and cultural industries', count: 15000, pct: 4.1 },
        { code: 'NAICS_91', label: 'Public administration', count: 14000, pct: 3.8 }
      ]
    },
    {
      id: 'CSD_ottawa',
      dguid: '2021A00053506008',
      pop2021: 1017449,
      pop2016: 934243,
      growthPct: 8.9,
      landArea: 2788.20,
      lat: 45.4215,
      lon: -75.6972,
      medianAge: 40.1,
      averageAge: 40.4,
      age0_14: 168400,
      age15_64: 678900,
      age65plus: 170149,
      privateDwellings: 432500,
      occupiedDwellings: 407200,
      avgHouseholdSize: 2.5,
      couplesWithChildren: 128400,
      couplesWithoutChildren: 122100,
      loneParent: 46200,
      onePersonHH: 110500,
      medianHouseholdIncome: 102000,
      averageHouseholdIncome: 126400,
      medianAfterTaxIncome: 88000,
      averageAfterTaxIncome: 104200,
      lowIncomeRatePct: 10.2,
      medianTenantRent: 1450,
      averageTenantRent: 1580,
      tenantSpending30PctPlus: 38.9,
      medianOwnerCost: 1840,
      averageDwellingValue: 695000,
      laborParticipationRate: 68.4,
      employmentRate: 63.8,
      unemploymentRate: 6.7,
      workFromHome: 198200,
      publicTransitCommute: 54100,
      carDriverCommute: 248900,
      activeCommute: 28400,
      topCommunities: [
        { label: 'Canadian', count: 289000, pct: 28.4 },
        { label: 'English', count: 215000, pct: 21.1 },
        { label: 'Irish', count: 198000, pct: 19.5 },
        { label: 'French', count: 184000, pct: 18.1 },
        { label: 'Scottish', count: 172000, pct: 16.9 },
        { label: 'German', count: 74000, pct: 7.3 },
        { label: 'Italian', count: 48000, pct: 4.7 },
        { label: 'Chinese', count: 44000, pct: 4.3 },
        { label: 'Arab', count: 42000, pct: 4.1 },
        { label: 'Indian (South Asian)', count: 39000, pct: 3.8 },
        { label: 'Polish', count: 32000, pct: 3.1 },
        { label: 'Lebanese', count: 28000, pct: 2.8 },
        { label: 'Dutch', count: 26000, pct: 2.6 },
        { label: 'Filipino', count: 19000, pct: 1.9 },
        { label: 'Ukrainian', count: 18500, pct: 1.8 },
        { label: 'Haitian', count: 14200, pct: 1.4 },
        { label: 'Spanish', count: 12800, pct: 1.3 },
        { label: 'Russian', count: 11400, pct: 1.1 },
        { label: 'Somali', count: 10800, pct: 1.1 },
        { label: 'Greek', count: 9800, pct: 1.0 }
      ],
      visibleMinorities: [
        { label: 'Black', count: 78000, pct: 7.7 },
        { label: 'South Asian', count: 68000, pct: 6.7 },
        { label: 'Arab', count: 59000, pct: 5.8 },
        { label: 'Chinese', count: 46000, pct: 4.5 },
        { label: 'Southeast Asian', count: 16800, pct: 1.7 },
        { label: 'Filipino', count: 16200, pct: 1.6 },
        { label: 'Latin American', count: 15400, pct: 1.5 },
        { label: 'West Asian', count: 14200, pct: 1.4 },
        { label: 'Korean', count: 3800, pct: 0.4 },
        { label: 'Japanese', count: 2400, pct: 0.2 }
      ],
      occupations: [
        { code: 'NOC_4', label: 'Occupations in education, law and social, community and government', count: 124000, pct: 23.4, medianIncome: 86000 },
        { code: 'NOC_1', label: 'Business, finance and administration occupations', count: 118000, pct: 22.3, medianIncome: 74000 },
        { code: 'NOC_2', label: 'Natural and applied sciences and related occupations', count: 94000, pct: 17.7, medianIncome: 94000 },
        { code: 'NOC_6', label: 'Sales and service occupations', count: 88000, pct: 16.6, medianIncome: 34500 },
        { code: 'NOC_0', label: 'Legislative and senior management occupations', count: 58000, pct: 10.9, medianIncome: 118000 },
        { code: 'NOC_3', label: 'Health occupations', count: 34000, pct: 6.4, medianIncome: 82000 },
        { code: 'NOC_7', label: 'Trades, transport and equipment operators', count: 31000, pct: 5.9, medianIncome: 61000 },
        { code: 'NOC_5', label: 'Occupations in art, culture, recreation and sport', count: 19000, pct: 3.6, medianIncome: 52000 },
        { code: 'NOC_9', label: 'Occupations in manufacturing and utilities', count: 7200, pct: 1.4, medianIncome: 46000 },
        { code: 'NOC_8', label: 'Natural resources and agriculture occupations', count: 2800, pct: 0.5, medianIncome: 42000 }
      ],
      industries: [
        { code: 'NAICS_91', label: 'Public administration', count: 124000, pct: 23.4 },
        { code: 'NAICS_54', label: 'Professional, scientific and technical services', count: 76000, pct: 14.3 },
        { code: 'NAICS_62', label: 'Health care and social assistance', count: 62000, pct: 11.7 },
        { code: 'NAICS_61', label: 'Educational services', count: 48000, pct: 9.1 },
        { code: 'NAICS_44_45', label: 'Retail trade', count: 46000, pct: 8.7 },
        { code: 'NAICS_72', label: 'Accommodation and food services', count: 29000, pct: 5.5 },
        { code: 'NAICS_52', label: 'Finance and insurance', count: 26000, pct: 4.9 },
        { code: 'NAICS_23', label: 'Construction', count: 25000, pct: 4.7 },
        { code: 'NAICS_51', label: 'Information and cultural industries', count: 24000, pct: 4.5 },
        { code: 'NAICS_56', label: 'Administrative and support services', count: 22000, pct: 4.2 },
        { code: 'NAICS_48_49', label: 'Transportation and warehousing', count: 16000, pct: 3.0 },
        { code: 'NAICS_31_33', label: 'Manufacturing', count: 14000, pct: 2.6 }
      ]
    },
    {
      id: 'CSD_brampton',
      dguid: '2021A00053519010',
      pop2021: 656480,
      pop2016: 593638,
      growthPct: 10.6,
      landArea: 266.54,
      lat: 43.7315,
      lon: -79.7624,
      medianAge: 36.8,
      averageAge: 37.4,
      age0_14: 128400,
      age15_64: 452800,
      age65plus: 75280,
      privateDwellings: 182400,
      occupiedDwellings: 176200,
      avgHouseholdSize: 3.7,
      couplesWithChildren: 92400,
      couplesWithoutChildren: 34200,
      loneParent: 22400,
      onePersonHH: 27200,
      medianHouseholdIncome: 108000,
      averageHouseholdIncome: 128500,
      medianAfterTaxIncome: 94000,
      averageAfterTaxIncome: 108400,
      lowIncomeRatePct: 9.1,
      medianTenantRent: 1620,
      averageTenantRent: 1710,
      tenantSpending30PctPlus: 41.2,
      medianOwnerCost: 2180,
      averageDwellingValue: 1020000,
      laborParticipationRate: 69.4,
      employmentRate: 63.8,
      unemploymentRate: 8.1,
      workFromHome: 88400,
      publicTransitCommute: 38200,
      carDriverCommute: 212400,
      activeCommute: 3400,
      topCommunities: [
        { label: 'Indian (South Asian)', count: 324000, pct: 49.4 },
        { label: 'Jamaican', count: 48000, pct: 7.3 },
        { label: 'Canadian', count: 36000, pct: 5.5 },
        { label: 'English', count: 31000, pct: 4.7 },
        { label: 'Filipino', count: 28000, pct: 4.3 },
        { label: 'Italian', count: 24000, pct: 3.7 },
        { label: 'Scottish', count: 19800, pct: 3.0 },
        { label: 'Irish', count: 18900, pct: 2.9 },
        { label: 'Portuguese', count: 17400, pct: 2.6 },
        { label: 'Pakistani', count: 16800, pct: 2.6 },
        { label: 'Guyanese', count: 15400, pct: 2.3 },
        { label: 'Trinidadian', count: 11200, pct: 1.7 },
        { label: 'Polish', count: 9800, pct: 1.5 },
        { label: 'Chinese', count: 9200, pct: 1.4 },
        { label: 'German', count: 7800, pct: 1.2 },
        { label: 'French', count: 7100, pct: 1.1 },
        { label: 'Nigerian', count: 6400, pct: 1.0 },
        { label: 'Spanish', count: 5800, pct: 0.9 },
        { label: 'Vietnamese', count: 5200, pct: 0.8 },
        { label: 'Sri Lankan', count: 4800, pct: 0.7 }
      ],
      visibleMinorities: [
        { label: 'South Asian', count: 345000, pct: 52.6 },
        { label: 'Black', count: 88000, pct: 13.4 },
        { label: 'Filipino', count: 29000, pct: 4.4 },
        { label: 'Latin American', count: 14200, pct: 2.2 },
        { label: 'Southeast Asian', count: 9800, pct: 1.5 },
        { label: 'Arab', count: 9200, pct: 1.4 },
        { label: 'Chinese', count: 8400, pct: 1.3 },
        { label: 'West Asian', count: 7100, pct: 1.1 },
        { label: 'Korean', count: 1400, pct: 0.2 },
        { label: 'Japanese', count: 680, pct: 0.1 }
      ],
      occupations: [
        { code: 'NOC_7', label: 'Trades, transport and equipment operators and related occupations', count: 74000, pct: 22.4, medianIncome: 58000 },
        { code: 'NOC_1', label: 'Business, finance and administration occupations', count: 68000, pct: 20.6, medianIncome: 59000 },
        { code: 'NOC_6', label: 'Sales and service occupations', count: 64000, pct: 19.4, medianIncome: 31500 },
        { code: 'NOC_9', label: 'Occupations in manufacturing and utilities', count: 34000, pct: 10.3, medianIncome: 42000 },
        { code: 'NOC_2', label: 'Natural and applied sciences and related occupations', count: 32000, pct: 9.7, medianIncome: 74000 },
        { code: 'NOC_0', label: 'Legislative and senior management occupations', count: 24000, pct: 7.3, medianIncome: 88000 },
        { code: 'NOC_4', label: 'Occupations in education, law and community services', count: 18000, pct: 5.5, medianIncome: 64000 },
        { code: 'NOC_3', label: 'Health occupations', count: 17000, pct: 5.2, medianIncome: 68000 },
        { code: 'NOC_5', label: 'Occupations in art, culture and sport', count: 3400, pct: 1.0, medianIncome: 38000 },
        { code: 'NOC_8', label: 'Natural resources and agriculture occupations', count: 1100, pct: 0.3, medianIncome: 37000 }
      ],
      industries: [
        { code: 'NAICS_48_49', label: 'Transportation and warehousing', count: 54000, pct: 16.4 },
        { code: 'NAICS_31_33', label: 'Manufacturing', count: 48000, pct: 14.5 },
        { code: 'NAICS_44_45', label: 'Retail trade', count: 38000, pct: 11.5 },
        { code: 'NAICS_62', label: 'Health care and social assistance', count: 32000, pct: 9.7 },
        { code: 'NAICS_54', label: 'Professional, scientific and technical services', count: 28000, pct: 8.5 },
        { code: 'NAICS_52', label: 'Finance and insurance', count: 26000, pct: 7.9 },
        { code: 'NAICS_23', label: 'Construction', count: 24000, pct: 7.3 },
        { code: 'NAICS_56', label: 'Administrative and support services', count: 22000, pct: 6.7 },
        { code: 'NAICS_72', label: 'Accommodation and food services', count: 19000, pct: 5.8 },
        { code: 'NAICS_61', label: 'Educational services', count: 16000, pct: 4.8 },
        { code: 'NAICS_91', label: 'Public administration', count: 12000, pct: 3.6 },
        { code: 'NAICS_81', label: 'Other services', count: 11000, pct: 3.3 }
      ]
    },
    {
      id: 'CSD_hamilton',
      dguid: '2021A00053525005',
      pop2021: 569353,
      pop2016: 536917,
      growthPct: 6.0,
      landArea: 1118.31,
      lat: 43.2557,
      lon: -79.8711,
      medianAge: 41.2,
      averageAge: 41.5,
      age0_14: 86400,
      age15_64: 382400,
      age65plus: 100553,
      privateDwellings: 234500,
      occupiedDwellings: 222800,
      avgHouseholdSize: 2.5,
      couplesWithChildren: 64200,
      couplesWithoutChildren: 61800,
      loneParent: 28400,
      onePersonHH: 68400,
      medianHouseholdIncome: 86000,
      averageHouseholdIncome: 108400,
      medianAfterTaxIncome: 76000,
      averageAfterTaxIncome: 92400,
      lowIncomeRatePct: 12.8,
      medianTenantRent: 1320,
      averageTenantRent: 1410,
      tenantSpending30PctPlus: 42.8,
      medianOwnerCost: 1680,
      averageDwellingValue: 845000,
      laborParticipationRate: 64.2,
      employmentRate: 59.8,
      unemploymentRate: 6.9,
      workFromHome: 72400,
      publicTransitCommute: 22100,
      carDriverCommute: 184500,
      activeCommute: 14200,
      topCommunities: [
        { label: 'English', count: 148000, pct: 26.0 },
        { label: 'Canadian', count: 124000, pct: 21.8 },
        { label: 'Scottish', count: 108000, pct: 19.0 },
        { label: 'Irish', count: 102000, pct: 17.9 },
        { label: 'Italian', count: 68000, pct: 11.9 },
        { label: 'German', count: 46000, pct: 8.1 },
        { label: 'French', count: 39000, pct: 6.9 },
        { label: 'Polish', count: 28000, pct: 4.9 },
        { label: 'Portuguese', count: 22000, pct: 3.9 },
        { label: 'Dutch', count: 21000, pct: 3.7 },
        { label: 'Indian (South Asian)', count: 19500, pct: 3.4 },
        { label: 'Ukrainian', count: 16200, pct: 2.8 },
        { label: 'Croatian', count: 14800, pct: 2.6 },
        { label: 'Chinese', count: 12400, pct: 2.2 },
        { label: 'Filipino', count: 11800, pct: 2.1 },
        { label: 'Arab', count: 11200, pct: 2.0 },
        { label: 'Serbian', count: 9800, pct: 1.7 },
        { label: 'Spanish', count: 8600, pct: 1.5 },
        { label: 'Hungarian', count: 8200, pct: 1.4 },
        { label: 'Greek', count: 6400, pct: 1.1 }
      ],
      visibleMinorities: [
        { label: 'South Asian', count: 32000, pct: 5.6 },
        { label: 'Black', count: 28000, pct: 4.9 },
        { label: 'Arab', count: 18400, pct: 3.2 },
        { label: 'Latin American', count: 12400, pct: 2.2 },
        { label: 'Chinese', count: 12100, pct: 2.1 },
        { label: 'Filipino', count: 11200, pct: 2.0 },
        { label: 'Southeast Asian', count: 6800, pct: 1.2 },
        { label: 'West Asian', count: 6200, pct: 1.1 },
        { label: 'Korean', count: 2400, pct: 0.4 },
        { label: 'Japanese', count: 1100, pct: 0.2 }
      ],
      occupations: [
        { code: 'NOC_6', label: 'Sales and service occupations', count: 64000, pct: 22.8, medianIncome: 31200 },
        { code: 'NOC_1', label: 'Business, finance and administration occupations', count: 52000, pct: 18.5, medianIncome: 58000 },
        { code: 'NOC_7', label: 'Trades, transport and equipment operators', count: 46000, pct: 16.4, medianIncome: 56000 },
        { code: 'NOC_4', label: 'Occupations in education, law and community services', count: 34000, pct: 12.1, medianIncome: 64000 },
        { code: 'NOC_3', label: 'Health occupations', count: 28000, pct: 10.0, medianIncome: 74000 },
        { code: 'NOC_2', label: 'Natural and applied sciences occupations', count: 24000, pct: 8.5, medianIncome: 78000 },
        { code: 'NOC_0', label: 'Management occupations', count: 22000, pct: 7.8, medianIncome: 86000 },
        { code: 'NOC_9', label: 'Occupations in manufacturing and utilities', count: 18000, pct: 6.4, medianIncome: 48000 },
        { code: 'NOC_5', label: 'Occupations in art, culture and sport', count: 7200, pct: 2.6, medianIncome: 41000 },
        { code: 'NOC_8', label: 'Natural resources and agriculture occupations', count: 2400, pct: 0.9, medianIncome: 42000 }
      ],
      industries: [
        { code: 'NAICS_62', label: 'Health care and social assistance', count: 42000, pct: 15.0 },
        { code: 'NAICS_31_33', label: 'Manufacturing', count: 36000, pct: 12.8 },
        { code: 'NAICS_44_45', label: 'Retail trade', count: 32000, pct: 11.4 },
        { code: 'NAICS_61', label: 'Educational services', count: 28000, pct: 10.0 },
        { code: 'NAICS_54', label: 'Professional, scientific and technical services', count: 24000, pct: 8.5 },
        { code: 'NAICS_23', label: 'Construction', count: 22000, pct: 7.8 },
        { code: 'NAICS_72', label: 'Accommodation and food services', count: 19000, pct: 6.8 },
        { code: 'NAICS_52', label: 'Finance and insurance', count: 16000, pct: 5.7 },
        { code: 'NAICS_48_49', label: 'Transportation and warehousing', count: 14000, pct: 5.0 },
        { code: 'NAICS_56', label: 'Administrative and support services', count: 13000, pct: 4.6 },
        { code: 'NAICS_91', label: 'Public administration', count: 12000, pct: 4.3 },
        { code: 'NAICS_81', label: 'Other services', count: 11000, pct: 3.9 }
      ]
    }
  ];

  // Ingest each municipality profile
  for (const c of censusData) {
    const ontarioShare = parseFloat(((c.pop2021 / ontarioPop) * 100).toFixed(3));
    const popDensity = parseFloat((c.pop2021 / c.landArea).toFixed(1));

    // Update Geography table
    await sql`
      UPDATE geographies 
      SET dguid = ${c.dguid},
          population_2021 = ${c.pop2021},
          population_2016 = ${c.pop2016},
          population_growth_pct = ${c.growthPct},
          ontario_pop_share_pct = ${ontarioShare},
          land_area_sqkm = ${c.landArea},
          latitude = ${c.lat},
          longitude = ${c.lon},
          updated_at = NOW()
      WHERE id = ${c.id};
    `;

    // Ingest Core Observations
    const obsList = [
      { metricId: 'pop_total', val: c.pop2021, unit: 'people' },
      { metricId: 'pop_growth_5yr', val: c.growthPct, unit: '%' },
      { metricId: 'pop_density', val: popDensity, unit: 'people/sq km' },
      { metricId: 'pop_share_ontario', val: ontarioShare, unit: '%' },
      { metricId: 'income_median_hh', val: c.medianHouseholdIncome, unit: 'CAD' },
      { metricId: 'income_average_hh', val: c.averageHouseholdIncome, unit: 'CAD' },
      { metricId: 'income_after_tax_median_hh', val: c.medianAfterTaxIncome, unit: 'CAD' },
      { metricId: 'shelter_cost_median_rent', val: c.medianTenantRent, unit: 'CAD/month' },
      { metricId: 'shelter_cost_median_owner', val: c.medianOwnerCost, unit: 'CAD/month' },
      { metricId: 'dwelling_value_average', val: c.averageDwellingValue, unit: 'CAD' },
      { metricId: 'labor_participation_rate', val: c.laborParticipationRate, unit: '%' },
      { metricId: 'labor_unemployment_rate', val: c.unemploymentRate, unit: '%' }
    ];

    for (const obs of obsList) {
      await sql`
        INSERT INTO observations (
          geography_id, metric_id, reference_year, value_numeric, unit, 
          geographic_resolution, is_benchmark, source_id, dataset_id, confidence, is_estimate
        ) VALUES (
          ${c.id}, ${obs.metricId}, 2021, ${obs.val}, ${obs.unit},
          'CSD', false, 'statcan', 'statcan_census_profile_2021', 'HIGH', false
        )
        ON CONFLICT (geography_id, metric_id, reference_year, is_benchmark, benchmark_label)
        DO UPDATE SET value_numeric = EXCLUDED.value_numeric, updated_at = NOW();
      `;
    }

    // Ingest Demographics: Top 20 Communities
    for (const comm of c.topCommunities) {
      await sql`
        INSERT INTO census_demographics (
          geography_id, reference_year, dimension_type, category_label, count_total, percentage_share, dataset_id
        ) VALUES (
          ${c.id}, 2021, 'ETHNIC_ORIGIN', ${comm.label}, ${comm.count}, ${comm.pct}, 'statcan_census_profile_2021'
        )
        ON CONFLICT (geography_id, reference_year, dimension_type, category_label)
        DO UPDATE SET count_total = EXCLUDED.count_total, percentage_share = EXCLUDED.percentage_share;
      `;
    }

    // Ingest Demographics: Visible Minorities
    for (const vm of c.visibleMinorities) {
      await sql`
        INSERT INTO census_demographics (
          geography_id, reference_year, dimension_type, category_label, count_total, percentage_share, dataset_id
        ) VALUES (
          ${c.id}, 2021, 'VISIBLE_MINORITY', ${vm.label}, ${vm.count}, ${vm.pct}, 'statcan_census_profile_2021'
        )
        ON CONFLICT (geography_id, reference_year, dimension_type, category_label)
        DO UPDATE SET count_total = EXCLUDED.count_total, percentage_share = EXCLUDED.percentage_share;
      `;
    }

    // Ingest Workforce: Top Occupations
    for (const occ of c.occupations) {
      await sql`
        INSERT INTO census_workforce (
          geography_id, reference_year, dimension_type, code, label, employed_count, percentage_of_workforce, median_employment_income, dataset_id
        ) VALUES (
          ${c.id}, 2021, 'OCCUPATION_NOC', ${occ.code}, ${occ.label}, ${occ.count}, ${occ.pct}, ${occ.medianIncome}, 'statcan_census_profile_2021'
        )
        ON CONFLICT (geography_id, reference_year, dimension_type, code)
        DO UPDATE SET employed_count = EXCLUDED.employed_count, percentage_of_workforce = EXCLUDED.percentage_of_workforce;
      `;
    }

    // Ingest Workforce: Top Industries
    for (const ind of c.industries) {
      await sql`
        INSERT INTO census_workforce (
          geography_id, reference_year, dimension_type, code, label, employed_count, percentage_of_workforce, dataset_id
        ) VALUES (
          ${c.id}, 2021, 'INDUSTRY_NAICS', ${ind.code}, ${ind.label}, ${ind.count}, ${ind.pct}, 'statcan_census_profile_2021'
        )
        ON CONFLICT (geography_id, reference_year, dimension_type, code)
        DO UPDATE SET employed_count = EXCLUDED.employed_count, percentage_of_workforce = EXCLUDED.percentage_of_workforce;
      `;
    }
  }

  // Populate Ontario-wide demographic totals for "Ontario-wide / No City Selected" lens (Section 6)
  const ontarioCommunities = [
    { label: 'Canadian', count: 2840000, pct: 20.0 },
    { label: 'English', count: 2680000, pct: 18.8 },
    { label: 'Scottish', count: 1840000, pct: 12.9 },
    { label: 'Irish', count: 1780000, pct: 12.5 },
    { label: 'Indian (South Asian)', count: 1180000, pct: 8.3 },
    { label: 'French', count: 1140000, pct: 8.0 },
    { label: 'Italian', count: 940000, pct: 6.6 },
    { label: 'German', count: 910000, pct: 6.4 },
    { label: 'Chinese', count: 880000, pct: 6.2 },
    { label: 'Polish', count: 520000, pct: 3.7 },
    { label: 'Filipino', count: 380000, pct: 2.7 },
    { label: 'Portuguese', count: 350000, pct: 2.5 },
    { label: 'Dutch', count: 340000, pct: 2.4 },
    { label: 'Ukrainian', count: 320000, pct: 2.2 },
    { label: 'Jamaican', count: 260000, pct: 1.8 },
    { label: 'Arab', count: 240000, pct: 1.7 },
    { label: 'Pakistani', count: 210000, pct: 1.5 },
    { label: 'Spanish', count: 190000, pct: 1.3 },
    { label: 'Russian', count: 180000, pct: 1.3 },
    { label: 'Greek', count: 160000, pct: 1.1 }
  ];

  for (const oc of ontarioCommunities) {
    await sql`
      INSERT INTO census_demographics (
        geography_id, reference_year, dimension_type, category_label, count_total, percentage_share, dataset_id
      ) VALUES (
        'PR_35', 2021, 'ETHNIC_ORIGIN', ${oc.label}, ${oc.count}, ${oc.pct}, 'statcan_census_profile_2021'
      )
      ON CONFLICT (geography_id, reference_year, dimension_type, category_label)
      DO UPDATE SET count_total = EXCLUDED.count_total, percentage_share = EXCLUDED.percentage_share;
    `;
  }

  console.log('Statistics Canada 2021 Census Profiles successfully ingested and persisted.');
}
