import { describe, it, expect } from 'vitest';
import { runWorkflowA, runWorkflowB } from '../src/analytics/opportunity-engine.js';

describe('Opportunity Analytics Engine', () => {
  it('runs Workflow A ("I know the business") and ranks municipalities', async () => {
    const results = await runWorkflowA('pizza_store', {
      demandWeight: 0.35,
      competitionWeight: 0.30,
      purchasingPowerWeight: 0.20,
      growthWeight: 0.15
    });

    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);

    const topCity = results[0];
    expect(topCity.rank).toBe(1);
    expect(topCity.opportunityScore).toBeGreaterThanOrEqual(0);
    expect(topCity.opportunityScore).toBeLessThanOrEqual(100);
    expect(topCity.scoreComponents).toHaveProperty('demandScore');
    expect(topCity.scoreComponents).toHaveProperty('competitionScore');
    expect(topCity.scoreComponents).toHaveProperty('purchasingPowerScore');
    expect(topCity.scoreComponents).toHaveProperty('growthScore');
    expect(topCity.evidenceSummary).toContain(topCity.cityName);
  });

  it('runs Workflow B ("I know the city") and produces ranked business recommendations for Burlington', async () => {
    const recommendations = await runWorkflowB('CSD_burlington');

    expect(recommendations).toBeDefined();
    expect(recommendations.length).toBeGreaterThan(0);

    const topRec = recommendations[0];
    expect(topRec).toHaveProperty('categoryId');
    expect(topRec).toHaveProperty('categoryName');
    expect(topRec).toHaveProperty('naicsCode');
    expect(topRec).toHaveProperty('gapIndex');
    expect(topRec).toHaveProperty('opportunityScore');
    expect(topRec).toHaveProperty('estimatedAnnualRevenueCAD');
    expect(topRec.estimatedAnnualRevenueCAD.median).toBeGreaterThan(0);
  });
});
