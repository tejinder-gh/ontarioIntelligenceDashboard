import type { OperatingFormat, OwnershipType } from './types.js';

export interface CategoryOperatingScenario {
  key: string;
  label: string;
  format: OperatingFormat;
  ownership: OwnershipType;
  investmentCapital: number;
  workingCapital: number;
  targetUnitRevenue: number;
  rationale: string;
}

export interface CategoryProfile {
  categoryId: string;
  canonicalName: string;
  naicsCode: string;
  naicsTitle: string;
  volumeUnit: string; // e.g. "orders", "parcels / dispatches", "clients", "memberships"
  unitRevenueLabel: string; // e.g. "Average Order Value (AOV)", "Revenue per Dispatch", "Monthly Fee"
  benchmarkUnitRevenue: number;
  cogsRatio: number;
  variableLaborRatio: number;
  channelOrCommissionRatio: number;
  fixedMonthlyOverhead: number;
  targetPropertyType: 'RETAIL_STRIP_PLAZA' | 'RETAIL_STREETFRONT' | 'COMMERCIAL_OFFICE' | 'INDUSTRIAL';
  typicalSqftMin: number;
  typicalSqftMax: number;
  requiredZoningClass: string;
  essentialInfrastructure: string[];
  primaryDemandDrivers: string[];
  scenarios: CategoryOperatingScenario[];
}

export const CATEGORY_PROFILES: Record<string, CategoryProfile> = {
  pizza_store: {
    categoryId: 'pizza_store',
    canonicalName: 'Pizza Store / Pizzeria',
    naicsCode: '722513',
    naicsTitle: 'Limited-service eating places',
    volumeUnit: 'daily orders',
    unitRevenueLabel: 'Average Order Value (AOV)',
    benchmarkUnitRevenue: 28.5,
    cogsRatio: 0.29,
    variableLaborRatio: 0.28,
    channelOrCommissionRatio: 0.12,
    fixedMonthlyOverhead: 3200,
    targetPropertyType: 'RETAIL_STRIP_PLAZA',
    typicalSqftMin: 1100,
    typicalSqftMax: 1600,
    requiredZoningClass: 'C2 Commercial Eating Establishment (Takeout & Delivery permitted)',
    essentialInfrastructure: [
      'Type 1 commercial ventilation hood with rooftop grease duct chase',
      '200A 3-phase electrical panel',
      '1.5-inch natural gas service line',
      'Commercial grease interceptor'
    ],
    primaryDemandDrivers: [
      'Residential household density within 3.5 km delivery radius',
      'Evening dinner and weekend family sports flow',
      'Food away from home discretionary dining spend'
    ],
    scenarios: [
      {
        key: 'lean_takeout_delivery',
        label: 'Scenario A: Lean Takeout & Delivery (Independent)',
        format: 'TAKEOUT_DELIVERY',
        ownership: 'INDEPENDENT',
        investmentCapital: 195000,
        workingCapital: 35000,
        targetUnitRevenue: 28.5,
        rationale: 'Minimizes front-of-house square footage (1,100–1,400 sqft) and fit-out capital while prioritizing 3.5 km delivery catchment density and digital ordering.'
      },
      {
        key: 'turnkey_franchise',
        label: 'Scenario B: Turnkey Franchise Acquisition',
        format: 'TAKEOUT_DELIVERY',
        ownership: 'FRANCHISE',
        investmentCapital: 320000,
        workingCapital: 45000,
        targetUnitRevenue: 26.0,
        rationale: 'Leverages established regional brand loyalty and standardized supply chains, balanced against franchise fee and 5.5% ongoing royalty burden.'
      },
      {
        key: 'artisan_fast_casual',
        label: 'Scenario C: Artisan Fast-Casual & Slice Bar',
        format: 'FAST_CASUAL',
        ownership: 'INDEPENDENT',
        investmentCapital: 275000,
        workingCapital: 50000,
        targetUnitRevenue: 34.0,
        rationale: 'Targets affluent demographics and active daytime footfall with higher-margin beverage pairings, gourmet toppings, and dual lunch/dinner dayparts.'
      }
    ]
  },

  logistics_warehouse: {
    categoryId: 'logistics_warehouse',
    canonicalName: 'Shipping & Courier Centre / Logistics Hub',
    naicsCode: '484110',
    naicsTitle: 'General freight trucking, local & courier distribution',
    volumeUnit: 'daily dispatches / parcels',
    unitRevenueLabel: 'Revenue per Waybill / Dispatch',
    benchmarkUnitRevenue: 19.5,
    cogsRatio: 0.19,
    variableLaborRatio: 0.36,
    channelOrCommissionRatio: 0.04,
    fixedMonthlyOverhead: 4200,
    targetPropertyType: 'INDUSTRIAL',
    typicalSqftMin: 3500,
    typicalSqftMax: 8000,
    requiredZoningClass: 'E1 / E2 Employment Industrial (Courier Depot, Warehousing, & Freight permitted)',
    essentialInfrastructure: [
      'Grade-level or dock-height overhead roll-up doors (minimum 12-ft clearance)',
      '18-ft+ clear ceiling height for modular pallet racking and automated sorting',
      'Reinforced concrete slab capacity (250+ lbs/sqft)',
      'Turning radius and designated stalls for 24-ft straight trucks and courier vans',
      'Heavy 3-phase 400A electrical service for charging fleet vans and sorting conveyors'
    ],
    primaryDemandDrivers: [
      'Local B2B enterprise density and commercial industrial clusters',
      'Arterial access to 400-series highway corridors (QEW, 401, 403, 407)',
      'E-commerce return volume and regional wholesale order fulfillment'
    ],
    scenarios: [
      {
        key: 'independent_courier_depot',
        label: 'Scenario A: Independent Last-Mile Courier Depot',
        format: 'TAKEOUT_DELIVERY',
        ownership: 'INDEPENDENT',
        investmentCapital: 245000,
        workingCapital: 50000,
        targetUnitRevenue: 19.5,
        rationale: 'Optimized for local B2B parcel routes, same-day medical/legal couriers, and scheduled e-commerce merchant dispatch.'
      },
      {
        key: 'authorized_shipping_franchise',
        label: 'Scenario B: Turnkey Packaging & Freight Franchise Hub',
        format: 'FAST_CASUAL',
        ownership: 'FRANCHISE',
        investmentCapital: 360000,
        workingCapital: 60000,
        targetUnitRevenue: 24.0,
        rationale: 'Combines walk-in retail shipping/printing counters with rear warehousing for palletized LTL (less-than-truckload) commercial freight.'
      },
      {
        key: 'ecommerce_micro_fulfillment',
        label: 'Scenario C: E-Commerce Micro-Fulfillment & Pick-Pack',
        format: 'GHOST_KITCHEN',
        ownership: 'INDEPENDENT',
        investmentCapital: 310000,
        workingCapital: 55000,
        targetUnitRevenue: 22.5,
        rationale: 'Focuses on multi-tenant brand warehousing, SKU inventory pick-and-pack, and regional carrier cross-docking.'
      }
    ]
  },

  child_daycare: {
    categoryId: 'child_daycare',
    canonicalName: 'Licensed Child Daycare Centre',
    naicsCode: '624410',
    naicsTitle: 'Child day-care services',
    volumeUnit: 'licensed full-time children',
    unitRevenueLabel: 'Monthly Tuition per Child',
    benchmarkUnitRevenue: 1250.0,
    cogsRatio: 0.12,
    variableLaborRatio: 0.48,
    channelOrCommissionRatio: 0.02,
    fixedMonthlyOverhead: 3800,
    targetPropertyType: 'COMMERCIAL_OFFICE',
    typicalSqftMin: 3500,
    typicalSqftMax: 6500,
    requiredZoningClass: 'Institutional / Commercial (Child Care and Early Years Act permitted)',
    essentialInfrastructure: [
      'Dedicated fenced outdoor play area (minimum 60 sqft per child)',
      'Direct ground-level egress without stairwells',
      'Child-height plumbing fixtures and handwashing sinks in every classroom',
      'Fire suppression sprinkler system conforming to Ontario Building Code Group B Div 2'
    ],
    primaryDemandDrivers: [
      'Preschool population (ages 0–4) in surrounding 5 km radius',
      'Dual-income household ratio and employment participation',
      'Transit proximity (commuter GO stations or arterial road)'
    ],
    scenarios: [
      {
        key: 'community_licensed_daycare',
        label: 'Scenario A: Licensed Infant & Toddler Centre (48 Spaces)',
        format: 'DINE_IN',
        ownership: 'INDEPENDENT',
        investmentCapital: 380000,
        workingCapital: 70000,
        targetUnitRevenue: 1250.0,
        rationale: 'Captures urgent infant/toddler waitlist demand with CWELCC subsidized funding integration.'
      },
      {
        key: 'montessori_preschool_franchise',
        label: 'Scenario B: Turnkey Montessori Early Learning Franchise',
        format: 'DINE_IN',
        ownership: 'FRANCHISE',
        investmentCapital: 520000,
        workingCapital: 85000,
        targetUnitRevenue: 1450.0,
        rationale: 'Premium curriculum commanding above-average tuition and corporate employer partnership subsidies.'
      }
    ]
  }
};

export function getCategoryProfile(categoryId: string): CategoryProfile {
  const norm = categoryId.toLowerCase().trim();
  if (norm.includes('logistics') || norm.includes('shipping') || norm.includes('courier') || norm.includes('warehouse')) {
    return CATEGORY_PROFILES['logistics_warehouse']!;
  }
  if (norm.includes('daycare') || norm.includes('childcare') || norm.includes('preschool')) {
    return CATEGORY_PROFILES['child_daycare']!;
  }
  if (CATEGORY_PROFILES[norm]) {
    return CATEGORY_PROFILES[norm]!;
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
