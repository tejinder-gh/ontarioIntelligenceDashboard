/**
 * Category Mapper
 * Maps raw source category descriptors to canonical NAICS business_categories.
 */

interface CategoryRule {
  categoryId: string;
  keywords: string[];
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    categoryId: 'pizza_store',
    keywords: ['pizza', 'pizzeria', 'slice shop', 'takeout pizza'],
  },
  {
    categoryId: 'coffee_shop',
    keywords: ['coffee', 'cafe', 'espresso', 'roastery', 'tea shop', 'bakery and cafe'],
  },
  {
    categoryId: 'full_service_restaurant',
    keywords: ['restaurant', 'dining', 'bistro', 'grill', 'pub', 'tavern', 'eatery', 'steakhouse', 'sushi', 'diner'],
  },
  {
    categoryId: 'child_daycare',
    keywords: ['daycare', 'child care', 'preschool', 'nursery school', 'early learning', 'infant care'],
  },
  {
    categoryId: 'tutoring_center',
    keywords: ['tutoring', 'learning centre', 'kumon', 'math centre', 'reading centre', 'exam prep', 'music school'],
  },
  {
    categoryId: 'gym_fitness',
    keywords: ['gym', 'fitness', 'crossfit', 'yoga', 'pilates', 'martial arts', 'boxing', 'athletic club'],
  },
  {
    categoryId: 'automotive_repair',
    keywords: ['auto repair', 'mechanic', 'tire', 'brake', 'oil change', 'transmission', 'collision', 'muffler', 'auto service'],
  },
  {
    categoryId: 'car_detailing',
    keywords: ['car detailing', 'car wash', 'auto spa', 'window tinting', 'ceramic coating'],
  },
  {
    categoryId: 'grocery_supermarket',
    keywords: ['supermarket', 'grocery', 'produce market', 'butcher', 'bakery', 'fish market', 'food market'],
  },
  {
    categoryId: 'convenience_store',
    keywords: ['convenience store', 'corner store', 'variety store', 'bodega'],
  },
  {
    categoryId: 'medical_clinic',
    keywords: ['clinic', 'dental', 'dentist', 'medical', 'doctor', 'physician', 'chiropractor', 'physiotherapy', 'optometry'],
  },
  {
    categoryId: 'home_services',
    keywords: ['contracting', 'landscaping', 'plumbing', 'electrical', 'roofing', 'hvac', 'renovation', 'cleaning service', 'handyman'],
  },
  {
    categoryId: 'logistics_warehouse',
    keywords: ['warehouse', 'logistics', 'courier', 'freight', 'trucking', 'storage', 'fulfillment', 'distribution'],
  },
  {
    categoryId: 'professional_services',
    keywords: ['accounting', 'legal', 'lawyer', 'consulting', 'financial service', 'insurance', 'mortgage', 'broker', 'architect'],
  },
  {
    categoryId: 'retail_store',
    keywords: ['retail', 'boutique', 'clothing', 'apparel', 'hardware', 'florist', 'bookstore', 'jewelry', 'electronics', 'shop'],
  },
];

export function mapCategoriesToCanonical(categories: string[]): string {
  if (!categories || categories.length === 0) {
    return 'professional_services';
  }

  const combined = categories.join(' ').toLowerCase();

  for (const rule of CATEGORY_RULES) {
    for (const keyword of rule.keywords) {
      if (combined.includes(keyword)) {
        return rule.categoryId;
      }
    }
  }

  return 'professional_services';
}
