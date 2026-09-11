import { sql } from '../db/index.js';
import { businessCountsData } from '../ingestion/adapters/statcan-business-counts.js';

export type EvidenceClassification = 'OBSERVED' | 'AUDITED' | 'BENCHMARK' | 'DERIVED' | 'UNAVAILABLE';

export interface EvidenceFieldMetadata {
  classification: EvidenceClassification;
  available: boolean;
}

export interface AvailabilitySummary {
  availableInputs: number;
  totalInputs: number;
  completenessPct: number;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function evidenceField(classification: Exclude<EvidenceClassification, 'UNAVAILABLE'>, value: unknown): EvidenceFieldMetadata {
  const available = value !== null && value !== undefined;
  return { classification: available ? classification : 'UNAVAILABLE', available };
}

function summarizeAvailability(fields: Record<string, EvidenceFieldMetadata>): AvailabilitySummary {
  const values = Object.values(fields);
  const availableInputs = values.filter(field => field.available).length;
  return {
    availableInputs,
    totalInputs: values.length,
    completenessPct: values.length === 0 ? 0 : Math.round((availableInputs / values.length) * 100)
  };
}

function confidenceFromCompleteness(completenessPct: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (completenessPct >= 80) return 'HIGH';
  if (completenessPct >= 50) return 'MEDIUM';
  return 'LOW';
}

function weightedScore(parts: Array<{ score: number | null; weight: number }>): number | null {
  const available = parts.filter((part): part is { score: number; weight: number } => part.score !== null);
  const availableWeight = available.reduce((sum, part) => sum + part.weight, 0);
  if (availableWeight === 0) return null;
  return Math.min(100, Math.max(0, Math.round(
    available.reduce((sum, part) => sum + part.score * part.weight, 0) / availableWeight
  )));
}

function scaledAuditedCount(total: unknown, proportion: number): number | null {
  const numericTotal = nullableNumber(total);
  return numericTotal === null ? null : Math.round(numericTotal * proportion);
}

function getAuditedSectorCount(geoId: string, categoryId: string): number | null {
  const cityData = businessCountsData.find(b => b.geoId.toLowerCase() === geoId.toLowerCase());
  if (!cityData) return null;
  const s = cityData.sectors as Record<string, any>;
  switch (categoryId) {
    case 'pizza_store':
      return s['NAICS_72']?.pizza ?? null;
    case 'full_service_restaurant':
      return s['NAICS_72']?.fullService ?? null;
    case 'coffee_shop':
      return scaledAuditedCount(s['NAICS_72']?.total, 0.18);
    case 'convenience_store':
      return s['NAICS_44_45']?.convenience ?? null;
    case 'grocery_supermarket':
      return s['NAICS_44_45']?.grocery ?? null;
    case 'retail_store':
      return s['NAICS_44_45']?.total ?? null;
    case 'child_daycare':
      return s['NAICS_62']?.daycare ?? null;
    case 'medical_clinic':
      return s['NAICS_62']?.medical ?? null;
    case 'tutoring_center':
    case 'tutoring_centre':
      return s['NAICS_61']?.tutoring ?? null;
    case 'gym_fitness':
    case 'fitness_centre':
      return s['NAICS_71']?.gym ?? null;
    case 'automotive_repair':
      return s['NAICS_81']?.autoRepair ?? null;
    case 'car_detailing':
      return s['NAICS_81']?.carWash ?? null;
    case 'professional_services':
      return s['NAICS_54']?.legalAccounting ?? scaledAuditedCount(s['NAICS_54']?.total, 0.35);
    case 'home_services':
      return scaledAuditedCount(s['NAICS_81']?.total, 0.3);
    case 'logistics_warehouse':
      return s['NAICS_48_49']?.total ?? null;
    default:
      return null;
  }
}

export interface OpportunityWeights {
  demandWeight?: number;
  competitionWeight?: number;
  purchasingPowerWeight?: number;
  growthWeight?: number;
  operatingCostWeight?: number;
  laborWeight?: number;
}

export interface WorkflowAResult {
  rank: number;
  geographyId: string;
  cityName: string;
  population: number;
  growthPct: number | null;
  medianHouseholdIncome: number | null;
  competitorCount: number;
  competitorsPer10kPop: number;
  populationPerCompetitor: number;
  retailAskingRentSqft: number | null;
  opportunityScore: number | null; // 0 to 100 when sufficient inputs are available
  scoreComponents: {
    demandScore: number;
    competitionScore: number;
    purchasingPowerScore: number | null;
    growthScore: number | null;
    operatingCostScore: number | null;
    laborScore: number | null;
  };
  demandScore?: number;
  saturationIndex?: number;
  medianIncome?: number | null;
  estimatedRevenue: number | null;
  evidenceSummary: string;
  strengths: string[];
  risks: string[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  coverageReport: {
    demographicsCoverage: number;
    incomeCoverage: number;
    competitorLocationsCoverage: number;
    commercialRentCoverage: number;
  };
  evidenceMetadata: Record<string, EvidenceFieldMetadata>;
  availability: AvailabilitySummary;
}

export interface WorkflowBRecommendation {
  categoryId: string;
  categoryName: string;
  cityName?: string;
  naicsCode: string;
  existingCount: number | null;
  countPer10kPop: number | null;
  competitorDensity: number | null;
  peerBenchmarkPer10kPop: number | null;
  gapIndex: number | null; // > 1.0 means underserved relative to peers
  opportunityScore: number | null;
  demandScore: number | null;
  competitionScore: number | null;
  successProbability: null;
  typicalInvestmentCAD: { min: number | null; max: number | null };
  estimatedAnnualRevenueCAD: { low: number | null; median: number | null; high: number | null; sdeMedian: number | null };
  revenueBenchmarkRange: { low: number | null; median: number | null; high: number | null; sdeMedian: number | null };
  rationale: string;
  keyDrivers: string[];
  potentialRisks: string[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  evidenceMetadata: Record<string, EvidenceFieldMetadata>;
  availability: AvailabilitySummary;
}

export async function runWorkflowA(
  categoryId: string,
  userWeights: OpportunityWeights = {},
  minPopulation: number = 0
): Promise<WorkflowAResult[]> {
  const rawWeights = {
    demand: userWeights.demandWeight ?? 0.20,
    competition: userWeights.competitionWeight ?? 0.25,
    purchasingPower: userWeights.purchasingPowerWeight ?? 0.20,
    growth: userWeights.growthWeight ?? 0.15,
    operatingCost: userWeights.operatingCostWeight ?? 0.10,
    labor: userWeights.laborWeight ?? 0.10,
  };
  const weightSum = (rawWeights.demand + rawWeights.competition + rawWeights.purchasingPower + rawWeights.growth + rawWeights.operatingCost + rawWeights.labor) || 1.0;
  const w = {
    demand: rawWeights.demand / weightSum,
    competition: rawWeights.competition / weightSum,
    purchasingPower: rawWeights.purchasingPower / weightSum,
    growth: rawWeights.growth / weightSum,
    operatingCost: rawWeights.operatingCost / weightSum,
    labor: rawWeights.labor / weightSum,
  };

  // Query core municipal profiles, competitor counts, and real estate rents
  const cityRows = await sql`
    SELECT 
      g.id as geo_id,
      g.name as city_name,
      g.population_2021 as population,
      g.population_growth_pct as growth_pct,
      o_inc.value_numeric as median_income,
      o_rent.value_numeric as retail_rent,
      o_part.value_numeric as part_rate,
      COUNT(b.id) as competitor_count
    FROM geographies g
    LEFT JOIN observations o_inc ON o_inc.geography_id = g.id AND o_inc.metric_id = 'income_median_hh'
    LEFT JOIN observations o_rent ON o_rent.geography_id = g.id AND o_rent.metric_id = 'commercial_rent_retail_net'
    LEFT JOIN observations o_part ON o_part.geography_id = g.id AND o_part.metric_id = 'labor_participation_rate'
    LEFT JOIN businesses b ON b.geography_id = g.id AND b.category_id = ${categoryId}
    WHERE g.geo_type = 'CSD' AND g.population_2021 IS NOT NULL AND g.population_2021 >= ${minPopulation}
    GROUP BY g.id, g.name, g.population_2021, g.population_growth_pct, o_inc.value_numeric, o_rent.value_numeric, o_part.value_numeric
    ORDER BY g.population_2021 DESC;
  `;

  if (cityRows.length === 0) return [];

  // Compute normalization metrics
  const maxPop = Math.max(...cityRows.map(r => r.population));
  const growthValues = cityRows.map(r => nullableNumber(r.growth_pct)).filter((value): value is number => value !== null);
  const incomeValues = cityRows.map(r => nullableNumber(r.median_income)).filter((value): value is number => value !== null);
  const rentValues = cityRows.map(r => nullableNumber(r.retail_rent)).filter((value): value is number => value !== null);
  const maxGrowth = growthValues.length > 0 ? Math.max(...growthValues) : null;
  const maxIncome = incomeValues.length > 0 ? Math.max(...incomeValues) : null;
  const minRent = rentValues.length > 0 ? Math.min(...rentValues) : null;
  const maxRent = rentValues.length > 0 ? Math.max(...rentValues) : null;

  const scoredCities: WorkflowAResult[] = cityRows.map(r => {
    const pop = Number(r.population);
    const growth = nullableNumber(r.growth_pct);
    const income = nullableNumber(r.median_income);
    const rent = nullableNumber(r.retail_rent);
    const participationRate = nullableNumber(r.part_rate);
    const compCount = Number(r.competitor_count);
    const compsPer10k = parseFloat(((compCount / pop) * 10000).toFixed(2));
    const popPerComp = compCount > 0 ? Math.round(pop / compCount) : pop;

    // Component Scores (0 to 100)
    // 1. Demand Score: combination of absolute population and household density
    const demandScore = Math.min(100, Math.round((Math.log10(pop) / Math.log10(maxPop)) * 100));

    // 2. Competition Score: lower saturation = higher score (underserved bonus)
    // Ontario average pizza store density is ~2.8 to 3.5 per 10,000 residents
    const benchmarkDensity = 3.0;
    const compRatio = compsPer10k > 0 ? compsPer10k / benchmarkDensity : 0.5;
    const competitionScore = Math.max(10, Math.min(100, Math.round((2 - compRatio) * 50)));

    // 3. Purchasing Power Score
    const purchasingPowerScore = income !== null && maxIncome !== null && maxIncome > 0
      ? Math.min(100, Math.round((income / maxIncome) * 100))
      : null;

    // 4. Growth Score
    const growthScore = growth !== null && maxGrowth !== null
      ? Math.max(10, Math.min(100, Math.round((growth / Math.max(maxGrowth, 10)) * 100)))
      : null;

    // 5. Operating Cost Score: lower rent = higher score
    const operatingCostScore = rent !== null && minRent !== null && maxRent !== null
      ? (maxRent > minRent ? Math.max(10, Math.min(100, Math.round((1 - (rent - minRent) / (maxRent - minRent)) * 100))) : 50)
      : null;

    // 6. Labor Availability Score
    const laborScore = participationRate === null ? null : Math.min(100, Math.round(participationRate));

    // Weighted Overall Opportunity Score
    const totalScore = weightedScore([
      { score: demandScore, weight: w.demand },
      { score: competitionScore, weight: w.competition },
      { score: purchasingPowerScore, weight: w.purchasingPower },
      { score: growthScore, weight: w.growth },
      { score: operatingCostScore, weight: w.operatingCost },
      { score: laborScore, weight: w.labor }
    ]);

    // Dynamic Strengths & Risks (Section 24 & 25)
    const strengths: string[] = [];
    const risks: string[] = [];

    if (income !== null && income >= 110000) strengths.push(`Affluent consumer base with high median household income ($${income.toLocaleString()} CAD)`);
    if (growth !== null && growth >= 8.0) strengths.push(`Rapid population growth (+${growth}% 5-yr) driving new residential customer demand`);
    if (compsPer10k < 2.5) strengths.push(`Underserved market density (${compsPer10k} competitors per 10k residents vs Ontario benchmark of 3.0)`);
    if (popPerComp > 3500) strengths.push(`High population per competitor (${popPerComp.toLocaleString()} residents per store)`);

    if (rent !== null && rent > 35.00) risks.push(`Premium commercial lease rates ($${rent.toFixed(2)}/sq ft net rent plus additional TMI)`);
    if (compsPer10k > 3.8) risks.push(`Elevated competitor saturation (${compsPer10k} stores/10k pop) requiring strong brand differentiation`);
    if (growth !== null && growth < 3.0) risks.push(`Moderate historical population growth (+${growth}% 5-yr) limiting organic customer base expansion`);

    const evidenceParts = [`${pop.toLocaleString()} residents`, `${compsPer10k} recorded locations per 10,000 residents`];
    if (income !== null) evidenceParts.splice(1, 0, `median household income of $${income.toLocaleString()}`);
    const evidence = `${r.city_name} has an opportunity score of ${totalScore ?? 'unavailable'}/100 based on ${evidenceParts.join(', ')}.`;
    const inputEvidence = {
      population: evidenceField('OBSERVED', pop),
      growthPct: evidenceField('OBSERVED', growth),
      medianHouseholdIncome: evidenceField('OBSERVED', income),
      competitorCount: evidenceField('OBSERVED', compCount),
      retailAskingRentSqft: evidenceField('OBSERVED', rent),
      laborParticipationRate: evidenceField('OBSERVED', participationRate)
    };
    const availability = summarizeAvailability(inputEvidence);

    return {
      rank: 0,
      geographyId: r.geo_id,
      cityName: r.city_name,
      population: pop,
      growthPct: growth,
      medianHouseholdIncome: income,
      competitorCount: compCount,
      competitorsPer10kPop: compsPer10k,
      populationPerCompetitor: popPerComp,
      retailAskingRentSqft: rent,
      opportunityScore: totalScore,
      demandScore,
      saturationIndex: compsPer10k,
      medianIncome: income,
      estimatedRevenue: null,
      scoreComponents: {
        demandScore,
        competitionScore,
        purchasingPowerScore,
        growthScore,
        operatingCostScore,
        laborScore
      },
      evidenceSummary: evidence,
      strengths,
      risks,
      confidence: confidenceFromCompleteness(availability.completenessPct),
      coverageReport: {
        demographicsCoverage: Math.round(([pop, growth].filter(value => value !== null).length / 2) * 100),
        incomeCoverage: income === null ? 0 : 100,
        competitorLocationsCoverage: 100,
        commercialRentCoverage: rent === null ? 0 : 100
      },
      evidenceMetadata: {
        ...inputEvidence,
        opportunityScore: evidenceField('DERIVED', totalScore),
        estimatedRevenue: evidenceField('DERIVED', null)
      },
      availability
    };
  });

  scoredCities.sort((a, b) => (b.opportunityScore ?? -1) - (a.opportunityScore ?? -1));
  scoredCities.forEach((c, idx) => { c.rank = idx + 1; });

  return scoredCities;
}

export async function runWorkflowB(geographyId: string): Promise<WorkflowBRecommendation[]> {
  // 1. Fetch municipal characteristics
  const [city] = await sql`
    SELECT 
      g.id, g.name, g.population_2021 as population, g.population_growth_pct as growth_pct,
      o_inc.value_numeric as median_income
    FROM geographies g
    LEFT JOIN observations o_inc ON o_inc.geography_id = g.id AND o_inc.metric_id = 'income_median_hh'
    WHERE g.id = ${geographyId};
  `;

  if (!city) return [];

  // 2. Fetch business categories and existing businesses in city
  const categories = await sql`
    SELECT 
      bc.id, bc.display_name, bc.naics_code, bc.typical_capex_min, bc.typical_capex_max,
      rbc.low_annual_revenue as low_rev,
      rbc.median_annual_revenue as median_rev,
      rbc.high_annual_revenue as high_rev,
      rbc.sde_ebitda_pct as sde_pct,
      COUNT(b.id) as existing_count
    FROM business_categories bc
    LEFT JOIN revenue_benchmark_chains rbc ON rbc.category_id = bc.id AND rbc.geography_id = 'PR_35'
    LEFT JOIN businesses b ON b.category_id = bc.id AND b.geography_id = ${geographyId}
    GROUP BY bc.id, bc.display_name, bc.naics_code, bc.typical_capex_min, bc.typical_capex_max, rbc.low_annual_revenue, rbc.median_annual_revenue, rbc.high_annual_revenue, rbc.sde_ebitda_pct
    ORDER BY bc.display_name;
  `;

  const pop = nullableNumber(city.population);
  const income = nullableNumber(city.median_income);

  // Peer municipal benchmarks per 10k residents across comparable Ontario municipalities
  const peerBenchmarks: Record<string, number> = {
    pizza_store: 2.8,
    full_service_restaurant: 8.5,
    coffee_shop: 3.2,
    convenience_store: 2.4,
    child_daycare: 2.6,
    tutoring_center: 1.8,
    gym_fitness: 1.9,
    automotive_repair: 3.4,
    car_detailing: 0.9,
    retail_store: 5.2,
    medical_clinic: 4.8,
    professional_services: 6.5,
    grocery_supermarket: 1.6,
    home_services: 2.8,
    logistics_warehouse: 1.2
  };

  const recommendations: WorkflowBRecommendation[] = categories.map(c => {
    const peerBench = peerBenchmarks[c.id] ?? null;
    const osmCount = Number(c.existing_count);
    const auditedCount = getAuditedSectorCount(geographyId, c.id);

    // Count resolution logic:
    // 1. If OSM points exist (> 0), take maximum of OSM and audited count
    // 2. If OSM points are 0, fall back to audited Table 33-10-1097 count if available
    // 3. If audited count is also unavailable, preserve the count as unavailable.
    const count = osmCount > 0
      ? (auditedCount !== null ? Math.max(osmCount, auditedCount) : osmCount)
      : auditedCount;

    const countPer10k = pop !== null && pop > 0 && count !== null ? parseFloat(((count / pop) * 10000).toFixed(2)) : null;

    // Gap Index: Peer Benchmark / Local Density. Higher index (> 1.0) = underserved gap
    const gapIndex = countPer10k !== null && countPer10k > 0 && peerBench !== null
      ? parseFloat((peerBench / countPer10k).toFixed(2))
      : null;

    // Opportunity Score based on Gap, Income, and Demographic fit
    const incomeMultiplier = income === null ? null : Math.min(1.25, income / 100000);
    const oppScore = gapIndex === null || incomeMultiplier === null
      ? null
      : Math.min(96, Math.max(45, Math.round((gapIndex * 35 + 30) * incomeMultiplier)));

    const lowRev = nullableNumber(c.low_rev);
    const medianRev = nullableNumber(c.median_rev);
    const highRev = nullableNumber(c.high_rev);
    const sdePct = nullableNumber(c.sde_pct);
    const sdeMedian = medianRev === null || sdePct === null ? null : Math.round(medianRev * (sdePct / 100));

    const rationale = count === null || countPer10k === null || peerBench === null || gapIndex === null
      ? `${city.name} does not have enough competitor-count and benchmark evidence to calculate a market gap.`
      : `${city.name} has ${count} recorded establishments (${countPer10k}/10k pop) compared to a peer benchmark of ${peerBench}/10k pop, indicating an opportunity gap index of ${gapIndex}.`;
    const drivers: string[] = [];
    const risks: string[] = [];

    if (gapIndex !== null && gapIndex >= 1.2 && peerBench !== null && countPer10k !== null && pop !== null) {
      drivers.push(`Market gap estimate: ${Math.round((peerBench - countPer10k) * (pop / 10000))} additional locations would bring city to peer parity`);
    } else if (gapIndex !== null) {
      drivers.push(`Established competitive market with stable recurring patron demand`);
    }

    if (income !== null && income > 110000) {
      drivers.push(`High household disposable income supporting premium pricing and discretionary expenditure`);
    }

    if (c.id === 'child_daycare' || c.id === 'tutoring_center') {
      drivers.push(`Significant young family demographics and high educational attainment among local parents`);
    } else if (c.id === 'pizza_store') {
      drivers.push(`Strong delivery and takeout spending supported by suburban single-family household clusters`);
    }

    if (countPer10k !== null && peerBench !== null && countPer10k > peerBench) {
      risks.push(`Existing competitor density requires strong culinary or convenience differentiation`);
    }

    const demandScore = pop !== null && pop > 0 ? Math.min(100, Math.round(Math.min(1.2, pop / 100000) * 75 + 20)) : null;
    const compScore = gapIndex === null ? null : Math.max(10, Math.min(100, Math.round((2.5 / gapIndex) * 40)));
    const capexMin = nullableNumber(c.typical_capex_min);
    const capexMax = nullableNumber(c.typical_capex_max);
    const countClassification = auditedCount !== null && auditedCount >= osmCount ? 'AUDITED' : 'OBSERVED';
    const inputEvidence = {
      population: evidenceField('OBSERVED', pop),
      medianHouseholdIncome: evidenceField('OBSERVED', income),
      existingCount: evidenceField(countClassification, count),
      peerBenchmarkPer10kPop: evidenceField('BENCHMARK', peerBench),
      typicalInvestmentMin: evidenceField('OBSERVED', capexMin),
      typicalInvestmentMax: evidenceField('OBSERVED', capexMax),
      revenueLow: evidenceField('BENCHMARK', lowRev),
      revenueMedian: evidenceField('BENCHMARK', medianRev),
      revenueHigh: evidenceField('BENCHMARK', highRev),
      sdePct: evidenceField('BENCHMARK', sdePct)
    };
    const availability = summarizeAvailability(inputEvidence);

    return {
      categoryId: c.id,
      categoryName: c.display_name,
      cityName: city.name,
      naicsCode: c.naics_code,
      existingCount: count,
      countPer10kPop: countPer10k,
      competitorDensity: countPer10k,
      peerBenchmarkPer10kPop: peerBench,
      gapIndex,
      opportunityScore: oppScore,
      demandScore,
      competitionScore: compScore,
      successProbability: null,
      typicalInvestmentCAD: {
        min: capexMin,
        max: capexMax
      },
      estimatedAnnualRevenueCAD: {
        low: lowRev,
        median: medianRev,
        high: highRev,
        sdeMedian
      },
      revenueBenchmarkRange: {
        low: lowRev,
        median: medianRev,
        high: highRev,
        sdeMedian
      },
      rationale,
      keyDrivers: drivers,
      potentialRisks: risks,
      confidence: confidenceFromCompleteness(availability.completenessPct),
      evidenceMetadata: {
        ...inputEvidence,
        gapIndex: evidenceField('DERIVED', gapIndex),
        opportunityScore: evidenceField('DERIVED', oppScore),
        successProbability: evidenceField('DERIVED', null)
      },
      availability
    };
  });

  return recommendations.sort((a, b) =>
    ((b.opportunityScore ?? -1) - (a.opportunityScore ?? -1)) || a.categoryId.localeCompare(b.categoryId)
  );
}
