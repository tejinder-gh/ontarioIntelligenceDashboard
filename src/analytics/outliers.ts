import { computeDescriptiveStatistics, computeZScore, computePercentileRank } from './statistics.js';

export interface OutlierResult {
  geographyId: string;
  geographyName: string;
  metricId: string;
  metricName: string;
  value: number;
  unit: string;
  isOutlier: boolean;
  outlierType: 'HIGH' | 'LOW' | 'NONE';
  zScore: number;
  percentileRank: number;
  iqrBounds: { lower: number; upper: number };
  explanation: string;
}

export function detectOutliersIQR(value: number, q1: number, q3: number, iqr: number): { isOutlier: boolean; method: string } {
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;
  return {
    isOutlier: value < lower || value > upper,
    method: 'IQR'
  };
}

export function detectOutliersZScore(value: number, mean: number, stdDev: number, threshold = 2.0): { isOutlier: boolean; method: string } {
  const z = stdDev > 0 ? (value - mean) / stdDev : 0;
  return {
    isOutlier: Math.abs(z) >= threshold,
    method: 'Z_SCORE'
  };
}

export function detectOutliersForMetric(
  metricId: string,
  metricName: string,
  unit: string,
  cityObservations: Array<{ geographyId: string; geographyName: string; value: number }>
): OutlierResult[] {
  const values = cityObservations.map(c => c.value);
  if (values.length < 3) {
    return cityObservations.map(c => ({
      geographyId: c.geographyId,
      geographyName: c.geographyName,
      metricId,
      metricName,
      value: c.value,
      unit,
      isOutlier: false,
      outlierType: 'NONE',
      zScore: 0,
      percentileRank: 50,
      iqrBounds: { lower: c.value, upper: c.value },
      explanation: 'Insufficient sample size to compute statistically valid outlier bounds.'
    }));
  }

  const stats = computeDescriptiveStatistics(values);
  const lowerBound = stats.q1 - 1.5 * stats.iqr;
  const upperBound = stats.q3 + 1.5 * stats.iqr;

  return cityObservations.map(c => {
    const z = computeZScore(c.value, stats.mean, stats.stdDev);
    const pRank = computePercentileRank(c.value, values);

    const isHighOutlier = c.value > upperBound || z >= 2.0;
    const isLowOutlier = c.value < lowerBound || z <= -2.0;
    const isOutlier = isHighOutlier || isLowOutlier;

    let outlierType: 'HIGH' | 'LOW' | 'NONE' = 'NONE';
    let explanation = `${c.geographyName} is within typical municipal distribution bounds for ${metricName.toLowerCase()} (z-score: ${z > 0 ? '+' : ''}${z.toFixed(2)}, ${pRank}th percentile).`;

    if (isHighOutlier) {
      outlierType = 'HIGH';
      explanation = `${c.geographyName} is an upper statistical outlier with ${metricName.toLowerCase()} of ${c.value.toLocaleString()} ${unit}. It ranks in the ${pRank}th percentile with a z-score of +${z.toFixed(2)}, exceeding the statistical benchmark upper threshold of ${upperBound.toLocaleString()} ${unit}.`;
    } else if (isLowOutlier) {
      outlierType = 'LOW';
      explanation = `${c.geographyName} is a lower statistical outlier with ${metricName.toLowerCase()} of ${c.value.toLocaleString()} ${unit}. It ranks in the ${pRank}th percentile with a z-score of ${z.toFixed(2)}, falling below the lower IQR threshold of ${lowerBound.toLocaleString()} ${unit}.`;
    }

    return {
      geographyId: c.geographyId,
      geographyName: c.geographyName,
      metricId,
      metricName,
      value: c.value,
      unit,
      isOutlier,
      outlierType,
      zScore: z,
      percentileRank: pRank,
      iqrBounds: { lower: parseFloat(lowerBound.toFixed(2)), upper: parseFloat(upperBound.toFixed(2)) },
      explanation
    };
  });
}
