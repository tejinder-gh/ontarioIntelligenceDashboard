import { describe, it, expect } from 'vitest';
import { 
  computeDescriptiveStatistics, 
  computePercentile, 
  computeZScore, 
  computePercentileRank 
} from '../src/analytics/statistics.js';
import { detectOutliersIQR, detectOutliersZScore } from '../src/analytics/outliers.js';

describe('Statistical Analytics Engine', () => {
  const dataset = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  it('calculates exact mean, median, min, max, and range', () => {
    const stats = computeDescriptiveStatistics(dataset);
    expect(stats.count).toBe(10);
    expect(stats.mean).toBe(55);
    expect(stats.median).toBe(55);
    expect(stats.min).toBe(10);
    expect(stats.max).toBe(100);
    expect(stats.range).toBe(90);
  });

  it('calculates quartiles and IQR correctly', () => {
    const stats = computeDescriptiveStatistics(dataset);
    expect(stats.q1).toBe(32.5);
    expect(stats.q3).toBe(77.5);
    expect(stats.iqr).toBe(45);
  });

  it('computes sample variance and standard deviation', () => {
    const stats = computeDescriptiveStatistics(dataset);
    // Sample variance for [10..100 step 10] is 916.6667
    expect(stats.variance).toBeCloseTo(916.6667, 1);
    expect(stats.stdDev).toBeCloseTo(30.2765, 1);
  });

  it('computes z-score accurately', () => {
    const mean = 55;
    const stdDev = 30.2765;
    const z100 = computeZScore(100, mean, stdDev);
    const z10 = computeZScore(10, mean, stdDev);
    const z55 = computeZScore(55, mean, stdDev);

    expect(z100).toBeCloseTo(1.4863, 2);
    expect(z10).toBeCloseTo(-1.4863, 2);
    expect(z55).toBe(0);
  });

  it('computes percentile ranks', () => {
    expect(computePercentileRank(55, dataset)).toBe(50);
    expect(computePercentileRank(100, dataset)).toBe(95);
    expect(computePercentileRank(10, dataset)).toBe(5);
  });

  it('detects outliers using IQR and Z-Score methods', () => {
    const dataWithOutlier = [10, 12, 11, 13, 12, 14, 11, 12, 100]; // 100 is extreme outlier
    const stats = computeDescriptiveStatistics(dataWithOutlier);
    
    const iqrResult = detectOutliersIQR(100, stats.q1, stats.q3, stats.iqr);
    expect(iqrResult.isOutlier).toBe(true);
    expect(iqrResult.method).toBe('IQR');

    const zResult = detectOutliersZScore(100, stats.mean, stats.stdDev, 2.0);
    expect(zResult.isOutlier).toBe(true);
    expect(zResult.method).toBe('Z_SCORE');

    // Normal point should not be outlier
    const normalIqr = detectOutliersIQR(12, stats.q1, stats.q3, stats.iqr);
    expect(normalIqr.isOutlier).toBe(false);
  });
});
