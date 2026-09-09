import { describe, it, expect } from 'bun:test';
import { app } from '../src/server/app.js';

describe('T-018 — Comparable Cities & Market Gap Engine (Requirements 35 & 36)', () => {
  it('AC1: /api/geographies/:id/similar returns top 5 comparable peer municipalities with compatibility scores', async () => {
    const server = app.listen(0);
    const port = (server.address() as any).port;

    try {
      const res = await fetch(`http://localhost:${port}/api/geographies/CSD_burlington/similar`);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.target).toBeDefined();
      expect(data.target.id).toBe('CSD_burlington');
      expect(Array.isArray(data.similar)).toBe(true);
      expect(data.similar.length).toBe(5);

      // Verify similarity score format (0 to 100)
      for (const peer of data.similar) {
        expect(peer.similarityScore).toBeGreaterThan(0);
        expect(peer.similarityScore).toBeLessThanOrEqual(100);
        expect(peer.id).not.toBe('CSD_burlington');
        expect(Array.isArray(peer.sharedStrengths)).toBe(true);
      }
    } finally {
      server.close();
    }
  });

  it('AC2: supports dynamic weights for multi-dimensional similarity ranking', async () => {
    const server = app.listen(0);
    const port = (server.address() as any).port;

    try {
      // Prioritize income heavily
      const resHighIncome = await fetch(`http://localhost:${port}/api/geographies/CSD_burlington/similar?income=5.0&population=0.1`);
      expect(resHighIncome.status).toBe(200);
      const dataHighIncome = await resHighIncome.json();

      expect(dataHighIncome.weights.income).toBe(5.0);
      expect(dataHighIncome.weights.population).toBe(0.1);

      // Prioritize population heavily
      const resHighPop = await fetch(`http://localhost:${port}/api/geographies/CSD_burlington/similar?income=0.1&population=5.0`);
      expect(resHighPop.status).toBe(200);
      const dataHighPop = await resHighPop.json();

      expect(dataHighPop.weights.population).toBe(5.0);
    } finally {
      server.close();
    }
  });

  it('AC3: calculates empirical market-gap deltas against the comparable peer median cohort', async () => {
    const server = app.listen(0);
    const port = (server.address() as any).port;

    try {
      const res = await fetch(`http://localhost:${port}/api/geographies/CSD_burlington/similar`);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.marketGapAnalysis).toBeDefined();
      const gap = data.marketGapAnalysis;

      expect(gap.cohortAverages).toBeDefined();
      expect(gap.cohortAverages.medianIncome).toBeGreaterThan(0);
      expect(gap.cohortAverages.businessDensity).toBeGreaterThan(0);

      expect(gap.deltas).toBeDefined();
      expect(typeof gap.deltas.incomeSpreadCad).toBe('number');
      expect(typeof gap.deltas.businessDensityGapPer10k).toBe('number');
    } finally {
      server.close();
    }
  });

  it('AC4: enforces Requirement 36 guardrail against false opportunity conclusions', async () => {
    const server = app.listen(0);
    const port = (server.address() as any).port;

    try {
      const res = await fetch(`http://localhost:${port}/api/geographies/CSD_burlington/similar`);
      expect(res.status).toBe(200);
      const data = await res.json();

      // Mandate #36: Low business density must never be equated to guaranteed opportunity without alternative explanations
      expect(Array.isArray(data.marketGapAnalysis.alternativeExplanations)).toBe(true);
      expect(data.marketGapAnalysis.alternativeExplanations.length).toBeGreaterThanOrEqual(3);

      const explanationsText = data.marketGapAnalysis.alternativeExplanations.join(' ');
      expect(explanationsText.toLowerCase()).toContain('zoning');
      expect(explanationsText.toLowerCase()).toContain('rent');
    } finally {
      server.close();
    }
  });
});
