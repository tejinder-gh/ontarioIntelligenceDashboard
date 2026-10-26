import type {
  CategoryOperatingScenario,
  CategoryProfile,
} from './category-catalog.js';
import {
  CHILD_DAYCARE_PROFILE,
  LOGISTICS_WAREHOUSE_PROFILE,
  PIZZA_STORE_PROFILE,
  RETAIL_SHIPPING_COUNTER_PROFILE,
} from './category-catalog.js';

export type { CategoryOperatingScenario, CategoryProfile };

export const CATEGORY_PROFILES: Record<string, CategoryProfile> = {
  pizza_store: PIZZA_STORE_PROFILE,
  retail_shipping_counter: RETAIL_SHIPPING_COUNTER_PROFILE,
  logistics_warehouse: LOGISTICS_WAREHOUSE_PROFILE,
  child_daycare: CHILD_DAYCARE_PROFILE
};

export function getCategoryProfile(categoryId: string): CategoryProfile {
  const norm = categoryId.toLowerCase().trim();

  // 1. Direct match
  if (CATEGORY_PROFILES[norm]) {
    return CATEGORY_PROFILES[norm]!;
  }

  // 2. Industrial Freight / Logistics Warehouse vs Retail Shipping Storefront
  if (
    norm.includes('warehouse') ||
    norm.includes('freight') ||
    norm.includes('cross-dock') ||
    norm.includes('cross dock') ||
    norm.includes('distribution') ||
    norm.includes('3pl') ||
    norm.includes('trucking') ||
    norm.includes('depot')
  ) {
    return CATEGORY_PROFILES['logistics_warehouse']!;
  }

  if (
    norm.includes('shipping') ||
    norm.includes('courier') ||
    norm.includes('parcel') ||
    norm.includes('pack and ship') ||
    norm.includes('pack & ship') ||
    norm.includes('mailbox') ||
    norm.includes('postnet') ||
    norm.includes('ups store') ||
    norm.includes('drop-off')
  ) {
    return CATEGORY_PROFILES['retail_shipping_counter']!;
  }

  if (norm.includes('daycare') || norm.includes('childcare') || norm.includes('preschool') || norm.includes('infant')) {
    return CATEGORY_PROFILES['child_daycare']!;
  }

  if (norm.includes('pizza') || norm.includes('pizzeria')) {
    return CATEGORY_PROFILES['pizza_store']!;
  }

  // Fallback to generalized commercial retail profile with clear limitation disclosure
  return {
    categoryId: norm,
    canonicalName: norm.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    naicsCode: '452319',
    naicsTitle: 'General commercial enterprise',
    volumeUnit: 'daily transactions',
    unitRevenueLabel: 'Average Transaction Value',
    benchmarkUnitRevenue: 35.0,
    cogsRatio: 0.35,
    variableLaborRatio: 0.28,
    channelOrCommissionRatio: 0.05,
    fixedMonthlyOverhead: 3500,
    targetPropertyType: 'RETAIL_STRIP_PLAZA',
    typicalSqftMin: 1500,
    typicalSqftMax: 3000,
    requiredZoningClass: 'General Commercial C1 / C2',
    essentialInfrastructure: [
      'Standard retail commercial storefront',
      '100A–200A electrical panel',
      'Accessible barrier-free washroom'
    ],
    primaryDemandDrivers: [
      'General population density and commercial footfall',
      'Median household disposable income'
    ],
    scenarios: [
      {
        key: `${norm}_standard_independent`,
        label: `Scenario A: Standard Independent ${norm.replace(/_/g, ' ')}`,
        format: 'TAKEOUT_DELIVERY',
        ownership: 'INDEPENDENT',
        investmentCapital: 220000,
        workingCapital: 45000,
        targetUnitRevenue: 35.0,
        rationale: `General independent commercial business model for ${norm.replace(/_/g, ' ')}.`
      }
    ]
  };
}
