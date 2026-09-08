export interface CityFeatureVector {
  geographyId: string;
  name: string;
  population: number;
  growthPct: number;
  medianIncome: number;
  medianAge: number;
  avgHouseholdSize: number;
  laborParticipation: number;
  businessDensity: number;
}

export interface SimilarityWeights {
  population?: number;
  growth?: number;
  income?: number;
  age?: number;
  householdSize?: number;
  workforce?: number;
  businessDensity?: number;
}

export interface CitySimilarityResult {
  geographyId: string;
  name: string;
  similarityScore: number; // 0 to 100%
  distance: number;
  keySharedAttributes: string[];
  divergentAttributes: string[];
}

export function computeCitySimilarity(
  targetCity: CityFeatureVector,
  candidateCities: CityFeatureVector[],
  weights: SimilarityWeights = {}
): CitySimilarityResult[] {
  const w = {
    population: weights.population ?? 1.0,
    growth: weights.growth ?? 1.5,
    income: weights.income ?? 2.0,
    age: weights.age ?? 1.0,
    householdSize: weights.householdSize ?? 1.0,
    workforce: weights.workforce ?? 1.2,
    businessDensity: weights.businessDensity ?? 1.5
  };

  // Find min/max for normalization (min-max feature scaling)
  const all = [targetCity, ...candidateCities];
  const bounds = {
    pop: { min: Math.min(...all.map(c => Math.log10(Math.max(c.population, 1000)))), max: Math.max(...all.map(c => Math.log10(c.population))) },
    growth: { min: Math.min(...all.map(c => c.growthPct)), max: Math.max(...all.map(c => c.growthPct)) },
    income: { min: Math.min(...all.map(c => c.medianIncome)), max: Math.max(...all.map(c => c.medianIncome)) },
    age: { min: Math.min(...all.map(c => c.medianAge)), max: Math.max(...all.map(c => c.medianAge)) },
    hhSize: { min: Math.min(...all.map(c => c.avgHouseholdSize)), max: Math.max(...all.map(c => c.avgHouseholdSize)) },
    workforce: { min: Math.min(...all.map(c => c.laborParticipation)), max: Math.max(...all.map(c => c.laborParticipation)) },
    bizDensity: { min: Math.min(...all.map(c => c.businessDensity)), max: Math.max(...all.map(c => c.businessDensity)) }
  };

  const normalize = (val: number, min: number, max: number) => (max > min ? (val - min) / (max - min) : 0.5);

  const targetNorm = {
    pop: normalize(Math.log10(Math.max(targetCity.population, 1000)), bounds.pop.min, bounds.pop.max),
    growth: normalize(targetCity.growthPct, bounds.growth.min, bounds.growth.max),
    income: normalize(targetCity.medianIncome, bounds.income.min, bounds.income.max),
    age: normalize(targetCity.medianAge, bounds.age.min, bounds.age.max),
    hhSize: normalize(targetCity.avgHouseholdSize, bounds.hhSize.min, bounds.hhSize.max),
    workforce: normalize(targetCity.laborParticipation, bounds.workforce.min, bounds.workforce.max),
    bizDensity: normalize(targetCity.businessDensity, bounds.bizDensity.min, bounds.bizDensity.max)
  };

  const results: CitySimilarityResult[] = [];

  for (const c of candidateCities) {
    if (c.geographyId === targetCity.geographyId) continue;

    const candNorm = {
      pop: normalize(Math.log10(Math.max(c.population, 1000)), bounds.pop.min, bounds.pop.max),
      growth: normalize(c.growthPct, bounds.growth.min, bounds.growth.max),
      income: normalize(c.medianIncome, bounds.income.min, bounds.income.max),
      age: normalize(c.medianAge, bounds.age.min, bounds.age.max),
      hhSize: normalize(c.avgHouseholdSize, bounds.hhSize.min, bounds.hhSize.max),
      workforce: normalize(c.laborParticipation, bounds.workforce.min, bounds.workforce.max),
      bizDensity: normalize(c.businessDensity, bounds.bizDensity.min, bounds.bizDensity.max)
    };

    // Weighted Euclidean Distance
    const sumSq =
      w.population * Math.pow(targetNorm.pop - candNorm.pop, 2) +
      w.growth * Math.pow(targetNorm.growth - candNorm.growth, 2) +
      w.income * Math.pow(targetNorm.income - candNorm.income, 2) +
      w.age * Math.pow(targetNorm.age - candNorm.age, 2) +
      w.householdSize * Math.pow(targetNorm.hhSize - candNorm.hhSize, 2) +
      w.workforce * Math.pow(targetNorm.workforce - candNorm.workforce, 2) +
      w.businessDensity * Math.pow(targetNorm.bizDensity - candNorm.bizDensity, 2);

    const totalWeight = w.population + w.growth + w.income + w.age + w.householdSize + w.workforce + w.businessDensity;
    const normDist = Math.sqrt(sumSq / totalWeight);

    // Similarity score (100% is identical)
    const simScore = Math.max(0, parseFloat(((1 - normDist) * 100).toFixed(1)));

    // Identify shared vs divergent drivers
    const shared: string[] = [];
    const divergent: string[] = [];

    if (Math.abs(targetCity.medianIncome - c.medianIncome) / targetCity.medianIncome < 0.15) {
      shared.push(`Comparable household income ($${c.medianIncome.toLocaleString()})`);
    } else {
      divergent.push(`Income differential (${c.medianIncome > targetCity.medianIncome ? 'higher' : 'lower'} by $${Math.abs(c.medianIncome - targetCity.medianIncome).toLocaleString()})`);
    }

    if (Math.abs(targetCity.growthPct - c.growthPct) < 3.0) {
      shared.push(`Similar growth trajectory (${c.growthPct > 0 ? '+' : ''}${c.growthPct}% 5-yr)`);
    } else {
      divergent.push(`Growth divergence (${c.growthPct}% vs ${targetCity.growthPct}%)`);
    }

    if (Math.abs(targetCity.businessDensity - c.businessDensity) < 5.0) {
      shared.push(`Equivalent commercial density (${c.businessDensity} biz/1k pop)`);
    }

    results.push({
      geographyId: c.geographyId,
      name: c.name,
      similarityScore: simScore,
      distance: parseFloat(normDist.toFixed(4)),
      keySharedAttributes: shared,
      divergentAttributes: divergent
    });
  }

  return results.sort((a, b) => b.similarityScore - a.similarityScore);
}
