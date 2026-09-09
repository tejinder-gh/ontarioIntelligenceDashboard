import { sql } from '../db/index.js';

export interface BusinessCategoryInfo {
  id: string;
  displayName: string;
  naicsSectorCode: string;
  naicsSectorName: string;
  naicsSubsectorCode: string;
  naicsCode: string;
  naicsTitle: string;
  description?: string;
  typicalSqft?: number;
  typicalCapexMin?: number;
  typicalCapexMax?: number;
  aliases: string[];
}

export interface CategorySuggestion {
  categoryId: string;
  displayName: string;
  matchedTerm: string;
  matchType: 'CANONICAL' | 'ALIAS' | 'SYNONYM' | 'NAICS';
  naicsCode: string;
  naicsTitle: string;
  score: number;
}

// Initial taxonomy aliases and synonyms seed definition
export const INITIAL_TAXONOMY_MAP: {
  [categoryId: string]: {
    synonyms: string[];
    osmTags?: string[];
    googleTypes?: string[];
    yelpCategories?: string[];
  };
} = {
  pizza_store: {
    synonyms: [
      'pizza', 'pizzeria', 'pizza restaurant', 'pizza shop', 'pizza parlor',
      'slice shop', 'pizza delivery', 'takeout pizza', 'wood-fired pizza', 'pie'
    ],
    osmTags: ['cuisine=pizza'],
    googleTypes: ['pizza_restaurant', 'meal_takeaway'],
    yelpCategories: ['pizza']
  },
  automotive_repair: {
    synonyms: [
      'mechanic', 'auto repair', 'vehicle maintenance', 'auto service centre',
      'car repair', 'brake service', 'oil change', 'transmission repair',
      'muffler shop', 'tire shop', 'auto garage', 'wheel alignment'
    ],
    osmTags: ['shop=car_repair'],
    googleTypes: ['car_repair'],
    yelpCategories: ['autorepair']
  },
  coffee_shop: {
    synonyms: [
      'coffee', 'cafe', 'coffee shop', 'espresso bar', 'coffee house',
      'tea shop', 'bakery cafe', 'specialty coffee', 'roastery', 'latte'
    ],
    osmTags: ['amenity=cafe'],
    googleTypes: ['cafe', 'coffee_shop'],
    yelpCategories: ['coffee', 'cafes']
  },
  child_daycare: {
    synonyms: [
      'daycare', 'child care', 'preschool', 'childcare', 'nursery school',
      'early learning', 'infant care', 'toddler care', 'after school care', 'day nursery'
    ],
    osmTags: ['amenity=childcare', 'amenity=kindergarten'],
    googleTypes: ['child_care_agency', 'preschool'],
    yelpCategories: ['childcare']
  },
  gym_fitness: {
    synonyms: [
      'gym', 'fitness', 'fitness centre', 'health club', 'workout',
      'personal training', 'crossfit', 'yoga studio', 'pilates', 'martial arts', 'boxing gym'
    ],
    osmTags: ['leisure=fitness_centre'],
    googleTypes: ['gym'],
    yelpCategories: ['gyms', 'fitness']
  },
  full_service_restaurant: {
    synonyms: [
      'restaurant', 'dining', 'bistro', 'eatery', 'bar and grill',
      'steakhouse', 'pub', 'diner', 'fine dining', 'family restaurant'
    ],
    osmTags: ['amenity=restaurant'],
    googleTypes: ['restaurant'],
    yelpCategories: ['restaurants']
  },
  convenience_store: {
    synonyms: [
      'convenience store', 'corner store', 'variety store', 'bodega',
      'mini mart', 'tuck shop', 'kiosk', 'newsagent'
    ],
    osmTags: ['shop=convenience'],
    googleTypes: ['convenience_store'],
    yelpCategories: ['convenience']
  },
  tutoring_center: {
    synonyms: [
      'tutoring', 'tutor', 'learning centre', 'math tutor', 'reading clinic',
      'test prep', 'exam preparation', 'kumon', 'after school learning', 'stem academy'
    ],
    osmTags: ['amenity=tutoring'],
    googleTypes: ['tutoring_service'],
    yelpCategories: ['tutoring']
  },
  car_detailing: {
    synonyms: [
      'car wash', 'detailing', 'auto detailing', 'car spa',
      'ceramic coating', 'window tinting', 'interior cleaning', 'vehicle wash'
    ],
    osmTags: ['amenity=car_wash'],
    googleTypes: ['car_wash'],
    yelpCategories: ['carwash']
  },
  medical_clinic: {
    synonyms: [
      'doctor', 'physician', 'medical clinic', 'walk in clinic', 'family doctor',
      'dentist', 'dental clinic', 'physiotherapy', 'chiropractor', 'optometrist', 'health clinic'
    ],
    osmTags: ['amenity=clinic', 'amenity=doctors', 'amenity=dentist'],
    googleTypes: ['doctor', 'dentist'],
    yelpCategories: ['physicians', 'dentists']
  },
  professional_services: {
    synonyms: [
      'accountant', 'cpa', 'accounting', 'bookkeeping', 'tax preparation',
      'lawyer', 'law firm', 'attorney', 'legal services', 'notary', 'financial advisor'
    ],
    osmTags: ['office=lawyer', 'office=accountant'],
    googleTypes: ['accounting', 'lawyer'],
    yelpCategories: ['accountants', 'lawyers']
  },
  grocery_supermarket: {
    synonyms: [
      'grocery', 'supermarket', 'food market', 'produce store',
      'butcher shop', 'bakery', 'organic grocery', 'ethnic grocery', 'greengrocer'
    ],
    osmTags: ['shop=supermarket'],
    googleTypes: ['supermarket', 'grocery_or_supermarket'],
    yelpCategories: ['grocery']
  },
  home_services: {
    synonyms: [
      'landscaping', 'lawn care', 'snow removal', 'gardening', 'tree service',
      'plumber', 'plumbing', 'electrician', 'roofing', 'handyman', 'contractor'
    ],
    osmTags: ['shop=trade'],
    googleTypes: ['plumber', 'electrician', 'roofing_contractor'],
    yelpCategories: ['landscaping', 'plumbing']
  },
  logistics_warehouse: {
    synonyms: [
      'warehouse', 'logistics', 'freight', 'courier', 'shipping',
      'storage', 'distribution centre', 'last mile delivery', 'trucking', 'fulfillment'
    ],
    osmTags: ['building=warehouse'],
    googleTypes: ['storage'],
    yelpCategories: ['couriers']
  },
  retail_store: {
    synonyms: [
      'retail', 'boutique', 'gift shop', 'clothing store', 'shoe store',
      'bookstore', 'florist', 'hobby shop', 'jeweller', 'specialty store'
    ],
    osmTags: ['shop=clothes', 'shop=gift'],
    googleTypes: ['clothing_store', 'store'],
    yelpCategories: ['fashion']
  }
};

/**
 * Seeds or refreshes category aliases and synonyms into the persistent database.
 */
export async function seedTaxonomyAliases(): Promise<number> {
  console.log('Seeding canonical business category aliases and synonym taxonomy...');

  let count = 0;
  for (const [categoryId, mapping] of Object.entries(INITIAL_TAXONOMY_MAP)) {
    // 1. Verify category exists in business_categories
    const [cat] = await sql`SELECT id, display_name, naics_code FROM business_categories WHERE id = ${categoryId};`;
    if (!cat) continue;

    // 2. Canonical self-reference
    await sql`
      INSERT INTO category_aliases (category_id, alias_term, match_type, provider_name, confidence_weight)
      VALUES (${categoryId}, ${cat.display_name.toLowerCase()}, 'CANONICAL', 'INTERNAL', 1.0)
      ON CONFLICT DO NOTHING;
    `;
    count++;

    // 3. NAICS code reference
    if (cat.naics_code) {
      await sql`
        INSERT INTO category_aliases (category_id, alias_term, match_type, provider_name, confidence_weight)
        VALUES (${categoryId}, ${cat.naics_code}, 'NAICS', 'STATCAN', 1.0)
        ON CONFLICT DO NOTHING;
      `;
      count++;
    }

    // 4. Synonyms
    for (const syn of mapping.synonyms) {
      await sql`
        INSERT INTO category_aliases (category_id, alias_term, match_type, provider_name, confidence_weight)
        VALUES (${categoryId}, ${syn.toLowerCase().trim()}, 'SYNONYM', 'INTERNAL', 0.9)
        ON CONFLICT DO NOTHING;
      `;
      count++;
    }

    // 5. Provider mappings (OSM, Google, Yelp)
    if (mapping.osmTags) {
      for (const tag of mapping.osmTags) {
        await sql`
          INSERT INTO category_aliases (category_id, alias_term, match_type, provider_name, confidence_weight)
          VALUES (${categoryId}, ${tag.toLowerCase()}, 'PROVIDER_MAPPING', 'OSM', 0.85)
          ON CONFLICT DO NOTHING;
        `;
        count++;
      }
    }

    if (mapping.googleTypes) {
      for (const gType of mapping.googleTypes) {
        await sql`
          INSERT INTO category_aliases (category_id, alias_term, match_type, provider_name, confidence_weight)
          VALUES (${categoryId}, ${gType.toLowerCase()}, 'PROVIDER_MAPPING', 'GOOGLE', 0.85)
          ON CONFLICT DO NOTHING;
        `;
        count++;
      }
    }

    if (mapping.yelpCategories) {
      for (const yCat of mapping.yelpCategories) {
        await sql`
          INSERT INTO category_aliases (category_id, alias_term, match_type, provider_name, confidence_weight)
          VALUES (${categoryId}, ${yCat.toLowerCase()}, 'PROVIDER_MAPPING', 'YELP', 0.85)
          ON CONFLICT DO NOTHING;
        `;
        count++;
      }
    }
  }

  console.log(`Persisted ${count} category aliases across 15 business categories.`);
  return count;
}

/**
 * Searches business categories using free-text autocomplete across canonical names,
 * synonyms, aliases, and NAICS codes.
 */
export async function searchCategories(query: string, limit: number = 10): Promise<CategorySuggestion[]> {
  const clean = query.toLowerCase().trim();
  if (!clean) {
    // Return default top categories
    const top = await sql`
      SELECT id, display_name, naics_code, naics_title
      FROM business_categories
      ORDER BY id ASC
      LIMIT ${limit};
    `;
    return top.map(t => ({
      categoryId: t.id,
      displayName: t.display_name,
      matchedTerm: t.display_name,
      matchType: 'CANONICAL',
      naicsCode: t.naics_code,
      naicsTitle: t.naics_title,
      score: 1.0
    }));
  }

  // Query category_aliases and business_categories
  const results = await sql`
    WITH matches AS (
      -- Exact / Prefix match on canonical display name or id
      SELECT 
        bc.id as category_id,
        bc.display_name,
        bc.naics_code,
        bc.naics_title,
        bc.display_name as matched_term,
        'CANONICAL' as match_type,
        CASE 
          WHEN LOWER(bc.id) = ${clean} OR LOWER(bc.display_name) = ${clean} THEN 100.0
          WHEN LOWER(bc.display_name) LIKE ${clean + '%'} THEN 90.0
          WHEN LOWER(bc.display_name) LIKE ${'%' + clean + '%'} THEN 80.0
          ELSE 70.0
        END as base_score
      FROM business_categories bc
      WHERE LOWER(bc.id) LIKE ${'%' + clean + '%'}
         OR LOWER(bc.display_name) LIKE ${'%' + clean + '%'}
         OR bc.naics_code LIKE ${clean + '%'}
         OR LOWER(bc.naics_title) LIKE ${'%' + clean + '%'}

      UNION ALL

      -- Match on alias / synonym / provider mappings
      SELECT 
        bc.id as category_id,
        bc.display_name,
        bc.naics_code,
        bc.naics_title,
        ca.alias_term as matched_term,
        ca.match_type,
        CASE 
          WHEN LOWER(ca.alias_term) = ${clean} THEN 95.0
          WHEN LOWER(ca.alias_term) LIKE ${clean + '%'} THEN 85.0
          ELSE 75.0
        END * ca.confidence_weight as base_score
      FROM category_aliases ca
      JOIN business_categories bc ON bc.id = ca.category_id
      WHERE LOWER(ca.alias_term) LIKE ${'%' + clean + '%'}
    )
    SELECT DISTINCT ON (category_id)
      category_id,
      display_name,
      matched_term,
      match_type,
      naics_code,
      naics_title,
      base_score as score
    FROM matches
    ORDER BY category_id, score DESC
    LIMIT ${limit};
  `;

  // Sort final results by score descending
  return results
    .map(r => ({
      categoryId: r.category_id,
      displayName: r.display_name,
      matchedTerm: r.matched_term,
      matchType: r.match_type as any,
      naicsCode: r.naics_code,
      naicsTitle: r.naics_title,
      score: Number(r.score)
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Resolves a query or slug to the single best matching canonical category.
 */
export async function resolveCategory(query: string): Promise<BusinessCategoryInfo | null> {
  const clean = query.toLowerCase().trim().replace(/[-_]/g, ' ');
  const rawId = query.toLowerCase().trim().replace(/[\s-]/g, '_');

  // 1. Direct ID match
  const [direct] = await sql`
    SELECT id, display_name, naics_sector_code, naics_sector_name,
           naics_subsector_code, naics_code, naics_title, description,
           typical_sqft, typical_capex_min, typical_capex_max
    FROM business_categories
    WHERE id = ${rawId} OR id = ${query};
  `;

  if (direct) {
    const aliases = await sql`
      SELECT alias_term FROM category_aliases WHERE category_id = ${direct.id} AND match_type = 'SYNONYM';
    `;
    return {
      id: direct.id,
      displayName: direct.display_name,
      naicsSectorCode: direct.naics_sector_code,
      naicsSectorName: direct.naics_sector_name,
      naicsSubsectorCode: direct.naics_subsector_code,
      naicsCode: direct.naics_code,
      naicsTitle: direct.naics_title,
      description: direct.description,
      typicalSqft: direct.typical_sqft,
      typicalCapexMin: direct.typical_capex_min ? Number(direct.typical_capex_min) : undefined,
      typicalCapexMax: direct.typical_capex_max ? Number(direct.typical_capex_max) : undefined,
      aliases: aliases.map(a => a.alias_term)
    };
  }

  // 2. Search best match
  const suggestions = await searchCategories(clean, 1);
  if (suggestions.length === 0) return null;

  return resolveCategory(suggestions[0].categoryId);
}

/**
 * Returns all registered categories with their aliases and details.
 */
export async function getAllCategories(): Promise<BusinessCategoryInfo[]> {
  const cats = await sql`
    SELECT bc.id, bc.display_name, bc.naics_sector_code, bc.naics_sector_name,
           bc.naics_subsector_code, bc.naics_code, bc.naics_title, bc.description,
           bc.typical_sqft, bc.typical_capex_min, bc.typical_capex_max,
           COALESCE(
             array_agg(ca.alias_term) FILTER (WHERE ca.alias_term IS NOT NULL AND ca.match_type = 'SYNONYM'), 
             '{}'
           ) as aliases
    FROM business_categories bc
    LEFT JOIN category_aliases ca ON ca.category_id = bc.id
    GROUP BY bc.id, bc.display_name, bc.naics_sector_code, bc.naics_sector_name,
             bc.naics_subsector_code, bc.naics_code, bc.naics_title, bc.description,
             bc.typical_sqft, bc.typical_capex_min, bc.typical_capex_max
    ORDER BY bc.id ASC;
  `;

  return cats.map(c => ({
    id: c.id,
    displayName: c.display_name,
    naicsSectorCode: c.naics_sector_code,
    naicsSectorName: c.naics_sector_name,
    naicsSubsectorCode: c.naics_subsector_code,
    naicsCode: c.naics_code,
    naicsTitle: c.naics_title,
    description: c.description,
    typicalSqft: c.typical_sqft,
    typicalCapexMin: c.typical_capex_min ? Number(c.typical_capex_min) : undefined,
    typicalCapexMax: c.typical_capex_max ? Number(c.typical_capex_max) : undefined,
    aliases: c.aliases || []
  }));
}
