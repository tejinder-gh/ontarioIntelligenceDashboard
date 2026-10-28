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
    keywords: [
      'coffee', 'cafe', 'espresso', 'roastery', 'tea shop', 'bakery and cafe', 
      'curb lane cafe', 'sidewalk cafe', 'tea house', 'bubble tea', 'patisserie', 'coffee bar'
    ],
  },
  {
    categoryId: 'full_service_restaurant',
    keywords: [
      'restaurant', 'dining', 'bistro', 'grill', 'pub', 'tavern', 'eatery', 'steakhouse', 
      'sushi', 'diner', 'eating or drinking', 'eating/drinking', 'food establishment', 
      'take-out or retail food', 'shawarma', 'burger', 'bar and grill', 'sports bar', 
      'trattoria', 'curry', 'tandoori', 'ramen', 'noodle', 'bbq', 'picanha', 'billiards and bar'
    ],
  },
  {
    categoryId: 'child_daycare',
    keywords: ['daycare', 'child care', 'preschool', 'nursery school', 'early learning', 'infant care'],
  },
  {
    categoryId: 'tutoring_center',
    keywords: ['tutoring', 'learning centre', 'kumon', 'math centre', 'reading centre', 'exam prep', 'music school', 'driving school'],
  },
  {
    categoryId: 'gym_fitness',
    keywords: ['gym', 'fitness', 'crossfit', 'yoga', 'pilates', 'martial arts', 'boxing', 'athletic club', 'swim school'],
  },
  {
    categoryId: 'automotive_repair',
    keywords: [
      'auto repair', 'mechanic', 'tire', 'brake', 'oil change', 'transmission', 
      'collision', 'muffler', 'auto service', 'public garage', 'automotive', 'garage'
    ],
  },
  {
    categoryId: 'car_detailing',
    keywords: ['car detailing', 'car wash', 'auto spa', 'window tinting', 'ceramic coating'],
  },
  {
    categoryId: 'grocery_supermarket',
    keywords: [
      'supermarket', 'grocery', 'produce market', 'butcher', 'bakery', 
      'fish market', 'food market', 'fruit market', 'bazar', 'halal meat', 'grocer'
    ],
  },
  {
    categoryId: 'convenience_store',
    keywords: ['convenience store', 'corner store', 'variety store', 'bodega', 'convenience', 'variety'],
  },
  {
    categoryId: 'medical_clinic',
    keywords: [
      'clinic', 'dental', 'dentist', 'medical', 'doctor', 'physician', 
      'chiropractor', 'physiotherapy', 'optometry', 'holistic centre', 'wellness'
    ],
  },
  {
    categoryId: 'home_services',
    keywords: [
      'contracting', 'landscaping', 'plumbing', 'electrical', 'roofing', 'hvac', 
      'renovation', 'renovator', 'cleaning service', 'handyman', 'plumbing contractor', 
      'heating contractor', 'building renovator'
    ],
  },
  {
    categoryId: 'logistics_warehouse',
    keywords: [
      'warehouse', 'logistics', 'courier', 'freight', 'trucking', 'storage', 
      'fulfillment', 'distribution', 'purolator', 'fedex', 'ups'
    ],
  },
  {
    categoryId: 'professional_services',
    keywords: [
      'accounting', 'legal', 'lawyer', 'consulting', 'financial service', 
      'insurance', 'mortgage', 'broker', 'architect', 'advertising agency', 
      'tech solutions', 'design studio', 'photography'
    ],
  },
  {
    categoryId: 'retail_store',
    keywords: [
      'retail', 'boutique', 'clothing', 'apparel', 'hardware', 'florist', 
      'bookstore', 'jewelry', 'electronics', 'shop', 'personal services', 
      'laundry premises', 'dry cleaner', 'hair salon', 'barbershop', 'beauty salon', 
      'nail salon', 'vapour', 'second hand', 'salvage'
    ],
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

/**
 * Validates whether a venue is a non-commercial entity (public park, transit infrastructure,
 * municipal administrative boundary, public school, or cemetery) that must not leak into
 * the commercial businesses operating directory.
 */
export function isNonCommercialEntity(name: string, categories: string[] = []): boolean {
  const trimmedName = name.trim();
  const lowerName = trimmedName.toLowerCase();

  // Category based filtering
  for (const cat of categories) {
    const lcat = cat.toLowerCase();
    if (
      lcat.includes('landmarks and outdoors > park') ||
      lcat.includes('landmarks and outdoors > states and municipalities') ||
      lcat.includes('landmarks and outdoors > neighborhood') ||
      lcat.includes('landmarks and outdoors > scenic lookout') ||
      lcat.includes('landmarks and outdoors > nature reserve') ||
      lcat.includes('landmarks and outdoors > trail') ||
      lcat.includes('travel and transportation > transport hub') ||
      lcat.includes('travel and transportation > platform') ||
      lcat.includes('community and government > education > primary and secondary school') ||
      lcat.includes('community and government > cemetery') ||
      lcat.includes('community and government > city hall') ||
      lcat.includes('community and government > government building')
    ) {
      return true;
    }
  }

  // Name based filtering - Administrative & Geographic
  if (
    /^city of\b/i.test(trimmedName) ||
    /^town of\b/i.test(trimmedName) ||
    /^region of\b/i.test(trimmedName) ||
    /^municipality of\b/i.test(trimmedName) ||
    /, ontario$/i.test(trimmedName) ||
    ['aldershot', 'palmer', 'downtown london', 'headon forest neighbourhood', 'parkway forest', 'mary allen neighbourhood'].includes(lowerName)
  ) {
    return true;
  }

  // Transit infrastructure
  if (
    /subway station$/i.test(trimmedName) ||
    /go station$/i.test(trimmedName) ||
    /transit station$/i.test(trimmedName) ||
    /carpool lot$/i.test(trimmedName) ||
    /bus terminal$/i.test(trimmedName)
  ) {
    return true;
  }

  // Public schools & institutions
  if (
    /public school$/i.test(trimmedName) ||
    /high school$/i.test(trimmedName) ||
    /secondary school$/i.test(trimmedName) ||
    /elementary school$/i.test(trimmedName) ||
    /public library$/i.test(trimmedName) ||
    /court of justice$/i.test(trimmedName)
  ) {
    return true;
  }

  // Natural landmarks & public parks
  const isParkPattern = 
    / park$/i.test(trimmedName) ||
    / park east$/i.test(trimmedName) ||
    / park west$/i.test(trimmedName) ||
    / trail$/i.test(trimmedName) ||
    / cemetery$/i.test(trimmedName) ||
    / resevoir$/i.test(trimmedName) ||
    / reservoir$/i.test(trimmedName) ||
    / healing garden$/i.test(trimmedName) ||
    / creek$/i.test(trimmedName) ||
    / playground$/i.test(trimmedName) ||
    / dog park$/i.test(trimmedName) ||
    / provincial park$/i.test(trimmedName);

  if (isParkPattern) {
    const commercialKeywords = [
      'fitness', 'gym', 'auto', 'plaza', 'dent', 'clinic', 'retail', 'storage', 
      'hotel', 'inn', 'suites', 'salon', 'market', 'variety', 'design', 
      'logistics', 'pharmacy', 'foods', 'tire', 'cafe', 'restaurant', 'coffee',
      'sports bar', 'bistro', 'grill', 'pub', 'law', 'consult', 'cleaners'
    ];
    const hasCommercialKeyword = commercialKeywords.some(kw => lowerName.includes(kw));
    if (!hasCommercialKeyword) {
      return true;
    }
  }

  return false;
}

