import { describe, it, expect } from 'bun:test';
import { sql } from '../src/db/index.js';
import { app } from '../src/server/app.js';
import { searchCategories, resolveCategory, getAllCategories } from '../src/analytics/taxonomy-service.js';

describe('T-016 — Dynamic Business Category Taxonomy & Autocomplete Suite', () => {
  it('AC1: category_aliases table contains rich synonym and provider mappings', async () => {
    const [countRow] = await sql`SELECT count(*) as count FROM category_aliases;`;
    expect(Number(countRow.count)).toBeGreaterThanOrEqual(100);

    const [mechanicAlias] = await sql`
      SELECT category_id, alias_term, match_type 
      FROM category_aliases 
      WHERE alias_term = 'mechanic';
    `;
    expect(mechanicAlias).toBeDefined();
    expect(mechanicAlias.category_id).toBe('automotive_repair');
    expect(mechanicAlias.match_type).toBe('SYNONYM');
  });

  it('AC2: searchCategories autocomplete fuzzy/prefix matches colloquial terms', async () => {
    // 1. "pizza" -> pizza_store
    const pizzaMatches = await searchCategories('pizza', 5);
    expect(pizzaMatches.length).toBeGreaterThan(0);
    expect(pizzaMatches[0].categoryId).toBe('pizza_store');

    // 2. "mechanic" -> automotive_repair
    const mechanicMatches = await searchCategories('mechanic', 5);
    expect(mechanicMatches.length).toBeGreaterThan(0);
    expect(mechanicMatches[0].categoryId).toBe('automotive_repair');
    expect(mechanicMatches[0].naicsCode).toBe('811111');

    // 3. "child care" -> child_daycare
    const daycareMatches = await searchCategories('child care', 5);
    expect(daycareMatches.length).toBeGreaterThan(0);
    expect(daycareMatches[0].categoryId).toBe('child_daycare');
  });

  it('AC3: resolveCategory reliably maps synonyms or IDs to canonical records', async () => {
    const direct = await resolveCategory('pizza_store');
    expect(direct).not.toBeNull();
    expect(direct?.id).toBe('pizza_store');
    expect(direct?.naicsCode).toBe('722513');

    const synonymResolved = await resolveCategory('mechanic');
    expect(synonymResolved).not.toBeNull();
    expect(synonymResolved?.id).toBe('automotive_repair');
    expect(synonymResolved?.displayName).toContain('Automotive');
  });

  it('AC4: taxonomy HTTP endpoints (/categories, /search, /resolve) respond with JSON', async () => {
    const server = app.listen(0);
    const port = (server.address() as any).port;

    try {
      // 1. /taxonomy/categories
      const catRes = await fetch(`http://localhost:${port}/api/taxonomy/categories`);
      expect(catRes.status).toBe(200);
      const catJson = await catRes.json();
      expect(catJson.categories.length).toBeGreaterThanOrEqual(15);

      // 2. /taxonomy/search
      const searchRes = await fetch(`http://localhost:${port}/api/taxonomy/search?q=coffee`);
      expect(searchRes.status).toBe(200);
      const searchJson = await searchRes.json();
      expect(searchJson.suggestions.length).toBeGreaterThan(0);
      expect(searchJson.suggestions[0].categoryId).toBe('coffee_shop');

      // 3. /taxonomy/resolve
      const resolveRes = await fetch(`http://localhost:${port}/api/taxonomy/resolve?q=mechanic`);
      expect(resolveRes.status).toBe(200);
      const resolveJson = await resolveRes.json();
      expect(resolveJson.resolved.id).toBe('automotive_repair');
    } finally {
      server.close();
    }
  });

  it('AC5: /opportunity/business-search accepts dynamic synonyms without hardcoding', async () => {
    const server = app.listen(0);
    const port = (server.address() as any).port;

    try {
      // Pass synonym 'mechanic' instead of canonical 'automotive_repair'
      const res = await fetch(`http://localhost:${port}/api/opportunity/business-search?category=mechanic&minPop=50000`);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.categoryId).toBe('automotive_repair');
      expect(json.categoryName).toContain('Automotive');
      expect(json.topCities.length).toBeGreaterThan(0);
      expect(json.topCities[0].opportunityScore).toBeDefined();
    } finally {
      server.close();
    }
  });
});
