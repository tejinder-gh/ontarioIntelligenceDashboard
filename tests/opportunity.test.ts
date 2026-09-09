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

  it('runs Workflow B for Toronto and avoids 0-competitor hallucination using Table 33-10-1097 data', async () => {
    const recommendations = await runWorkflowB('CSD_toronto');

    expect(recommendations).toBeDefined();
    expect(recommendations.length).toBeGreaterThan(0);

    // Verify pizza stores in Toronto are NOT 0
    const pizzaRec = recommendations.find(r => r.categoryId === 'pizza_store');
    expect(pizzaRec).toBeDefined();
    expect(pizzaRec!.existingCount).toBeGreaterThan(0); // Should be 980 from Table 33-10-1097
    expect(pizzaRec!.gapIndex).not.toBe(2.5); // Must not be the blanket 2.5 fallback

    // Verify full service restaurants in Toronto are NOT 0
    const restRec = recommendations.find(r => r.categoryId === 'full_service_restaurant');
    expect(restRec).toBeDefined();
    expect(restRec!.existingCount).toBeGreaterThan(1000); // 4800 in Toronto
    expect(restRec!.gapIndex).toBeLessThan(1.0); // Saturated market (< 1.0)
  });

  it('runs Workflow A with all 6 transparent score components (Requirement 17)', async () => {
    const results = await runWorkflowA('pizza_store', {
      demandWeight: 0.25,
      competitionWeight: 0.25,
      purchasingPowerWeight: 0.20,
      growthWeight: 0.10,
      operatingCostWeight: 0.10,
      laborWeight: 0.10
    });

    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);

    const top = results[0];
    expect(top.scoreComponents).toBeDefined();
    expect(top.scoreComponents.demandScore).toBeGreaterThanOrEqual(0);
    expect(top.scoreComponents.competitionScore).toBeGreaterThanOrEqual(0);
    expect(top.scoreComponents.purchasingPowerScore).toBeGreaterThanOrEqual(0);
    expect(top.scoreComponents.growthScore).toBeGreaterThanOrEqual(0);
    expect(top.scoreComponents.operatingCostScore).toBeGreaterThanOrEqual(0);
    expect(top.scoreComponents.laborScore).toBeGreaterThanOrEqual(0);

    expect(top.opportunityScore).toBeGreaterThanOrEqual(0);
    expect(top.opportunityScore).toBeLessThanOrEqual(100);
  });
});
