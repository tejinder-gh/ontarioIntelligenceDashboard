export interface DescriptiveStatistics {
  count: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  range: number;
  variance: number;
  stdDev: number;
  q1: number;
  q3: number;
  iqr: number;
  coeffOfVariation: number;
  skewness: number;
}

export function computeDescriptiveStatistics(values: number[]): DescriptiveStatistics {
  const valid = values.filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v));
  if (valid.length === 0) {
    throw new Error('Cannot compute descriptive statistics on empty or non-numeric dataset.');
  }

  const n = valid.length;
  const sorted = [...valid].sort((a, b) => a - b);

  // Min, Max, Range
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const range = max - min;

  // Mean
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;

  // Median
  const median = computePercentile(sorted, 50);

  // Quartiles (Q1 = 25th percentile, Q3 = 75th percentile)
  const q1 = computePercentile(sorted, 25);
  const q3 = computePercentile(sorted, 75);
  const iqr = q3 - q1;

  // Variance & Standard Deviation (Sample variance n - 1 if n > 1)
  const squaredDiffs = sorted.map(v => Math.pow(v - mean, 2));
  const variance = n > 1 ? squaredDiffs.reduce((acc, v) => acc + v, 0) / (n - 1) : 0;
  const stdDev = Math.sqrt(variance);

  // Coefficient of Variation (stdDev / mean)
  const coeffOfVariation = mean !== 0 ? stdDev / mean : 0;

  // Skewness (Sample Fisher-Pearson coefficient of skewness)
  let skewness = 0;
  if (n > 2 && stdDev > 0) {
    const cubedDiffs = sorted.map(v => Math.pow((v - mean) / stdDev, 3));
    const sumCubed = cubedDiffs.reduce((acc, v) => acc + v, 0);
    skewness = (n / ((n - 1) * (n - 2))) * sumCubed;
  }

  return {
    count: n,
    mean: parseFloat(mean.toFixed(4)),
    median: parseFloat(median.toFixed(4)),
    min: parseFloat(min.toFixed(4)),
    max: parseFloat(max.toFixed(4)),
    range: parseFloat(range.toFixed(4)),
    variance: parseFloat(variance.toFixed(4)),
    stdDev: parseFloat(stdDev.toFixed(4)),
    q1: parseFloat(q1.toFixed(4)),
    q3: parseFloat(q3.toFixed(4)),
    iqr: parseFloat(iqr.toFixed(4)),
    coeffOfVariation: parseFloat(coeffOfVariation.toFixed(4)),
    skewness: parseFloat(skewness.toFixed(4)),
  };
}

export function computePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;
  if (percentile <= 0) return sortedValues[0];
  if (percentile >= 100) return sortedValues[sortedValues.length - 1];

  const index = (percentile / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (lower === upper) return sortedValues[lower];
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

export function computeZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return parseFloat(((value - mean) / stdDev).toFixed(4));
}

export function computePercentileRank(value: number, allValues: number[]): number {
  const valid = allValues.filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v));
  if (valid.length === 0) return 50;
  const countBelow = valid.filter(v => v < value).length;
  const countEqual = valid.filter(v => v === value).length;
  const rank = ((countBelow + 0.5 * countEqual) / valid.length) * 100;
  return parseFloat(rank.toFixed(1));
}
