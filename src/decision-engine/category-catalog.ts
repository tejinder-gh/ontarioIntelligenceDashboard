import type { OperatingFormat, OwnershipType } from './types.js';

export interface CategoryOperatingScenario {
  key: string;
  label: string;
  format: OperatingFormat;
  ownership: OwnershipType;
  investmentCapital: number;
  workingCapital: number;
  targetUnitRevenue: number;
  benchmarkDailyVolume?: number;
  operationalDailyCapacity?: number;
  rationale: string;
}

export interface CategoryProfile {
  categoryId: string;
  canonicalName: string;
  naicsCode: string;
  naicsTitle: string;
  volumeUnit: string;
  unitRevenueLabel: string;
  benchmarkUnitRevenue: number;
  periodType?: 'DAY' | 'MONTH';
  annualOperatingPeriods?: number;
  operationalDailyCapacity?: number;
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

export const PIZZA_STORE_PROFILE: CategoryProfile = {
  categoryId: 'pizza_store',
  canonicalName: 'Pizza Store / Pizzeria',
  naicsCode: '722513',
  naicsTitle: 'Limited-service eating places',
  volumeUnit: 'daily orders',
  unitRevenueLabel: 'Average Order Value (AOV)',
  benchmarkUnitRevenue: 28.5,
  periodType: 'DAY',
  annualOperatingPeriods: 360,
  operationalDailyCapacity: 240,
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
      benchmarkDailyVolume: 65,
      operationalDailyCapacity: 240,
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
      benchmarkDailyVolume: 85,
      operationalDailyCapacity: 260,
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
      benchmarkDailyVolume: 80,
      operationalDailyCapacity: 220,
      rationale: 'Targets affluent demographics and active daytime footfall with higher-margin beverage pairings, gourmet toppings, and dual lunch/dinner dayparts.'
    }
  ]
};

export const RETAIL_SHIPPING_COUNTER_PROFILE: CategoryProfile = {
  categoryId: 'retail_shipping_counter',
  canonicalName: 'Retail Shipping & Business Service Counter',
  naicsCode: '561431',
  naicsTitle: 'Business service centres (private mailboxes, packing, courier shipping)',
  volumeUnit: 'daily shipments / parcel drop-offs',
  unitRevenueLabel: 'Average Transaction Value (Shipment / Service)',
  benchmarkUnitRevenue: 22.5,
  periodType: 'DAY',
  annualOperatingPeriods: 312,
  operationalDailyCapacity: 350,
  cogsRatio: 0.22,
  variableLaborRatio: 0.26,
  channelOrCommissionRatio: 0.08,
  fixedMonthlyOverhead: 3400,
  targetPropertyType: 'RETAIL_STRIP_PLAZA',
  typicalSqftMin: 1100,
  typicalSqftMax: 1800,
  requiredZoningClass: 'Commercial Retail C1 / C2 (Personal & Business Services Permitted)',
  essentialInfrastructure: [
    'Retail service counter with integrated certified shipping scale and parcel intake bay',
    'Secure back-of-house locked parcel holding cage / sorting shelving',
    'High-speed business fiber broadband and commercial thermal label printing stations',
    'Barrier-free front entrance with direct curb-level customer parking for parcel loading'
  ],
  primaryDemandDrivers: [
    'Local SMB and home-based enterprise density requiring daily parcel dispatch',
    'E-commerce customer returns and package drop-off footfall',
    'Retail plaza anchoring with high-frequency supermarket or banking adjacency'
  ],
  scenarios: [
    {
      key: 'independent_pack_and_ship',
      label: 'Scenario A: Independent Pack & Ship Counter',
      format: 'TAKEOUT_DELIVERY',
      ownership: 'INDEPENDENT',
      investmentCapital: 175000,
      workingCapital: 35000,
      targetUnitRevenue: 22.5,
      benchmarkDailyVolume: 90,
      operationalDailyCapacity: 350,
      rationale: 'Multi-carrier relationships (Canpar, Purolator, DHL, FedEx) with custom crating, mailbox rentals, and print services.'
    },
    {
      key: 'franchise_business_centre',
      label: 'Scenario B: Turnkey Courier & Print Franchise',
      format: 'TAKEOUT_DELIVERY',
      ownership: 'FRANCHISE',
      investmentCapital: 265000,
      workingCapital: 45000,
      targetUnitRevenue: 24.0,
      benchmarkDailyVolume: 135,
      operationalDailyCapacity: 400,
      rationale: 'National brand footprint (e.g. UPS Store archetype) with corporate carrier account agreements and national drop-off contracts.'
    }
  ]
};

export const LOGISTICS_WAREHOUSE_PROFILE: CategoryProfile = {
  categoryId: 'logistics_warehouse',
  canonicalName: 'Freight Depot & Logistics Distribution Hub',
  naicsCode: '484110',
  naicsTitle: 'General freight trucking, local & courier distribution',
  volumeUnit: 'daily dispatches / parcels',
  unitRevenueLabel: 'Revenue per Waybill / Dispatch',
  benchmarkUnitRevenue: 28.0,
  cogsRatio: 0.19,
  variableLaborRatio: 0.36,
  channelOrCommissionRatio: 0.04,
  fixedMonthlyOverhead: 5200,
  targetPropertyType: 'INDUSTRIAL',
  typicalSqftMin: 4500,
  typicalSqftMax: 12000,
  requiredZoningClass: 'E1 / E2 Employment Industrial (Courier Depot, Warehousing, & Freight permitted)',
  essentialInfrastructure: [
    'Grade-level and dock-height overhead roll-up doors (minimum 14-ft clearance)',
    '18-ft+ clear ceiling height for modular pallet racking and automated sorting conveyors',
    'Reinforced concrete industrial slab capacity (300+ lbs/sqft)',
    'Truck turning aprons and designated parking stalls for 24-ft straight trucks and courier vans',
    'Heavy 3-phase 400A electrical service for charging commercial fleet vans and battery forklifts'
  ],
  primaryDemandDrivers: [
    'Local B2B enterprise density and commercial industrial clusters',
    'Arterial highway connectivity to 400-series corridors (QEW, 401, 403, 407)',
    'Regional e-commerce last-mile parcel routing and corporate logistics contracts'
  ],
  scenarios: [
    {
      key: 'independent_courier_depot',
      label: 'Scenario A: Independent Last-Mile Courier Depot',
      format: 'TAKEOUT_DELIVERY',
      ownership: 'INDEPENDENT',
      investmentCapital: 285000,
      workingCapital: 60000,
      targetUnitRevenue: 28.0,
      rationale: 'Optimized for localized B2B parcel routes, same-day delivery fleets, and scheduled e-commerce merchant pickups.'
    },
    {
      key: 'ecommerce_cross_dock',
      label: 'Scenario B: E-Commerce Micro-Fulfillment & Cross-Dock',
      format: 'GHOST_KITCHEN',
      ownership: 'INDEPENDENT',
      investmentCapital: 380000,
      workingCapital: 75000,
      targetUnitRevenue: 32.0,
      rationale: 'Focuses on multi-tenant brand warehousing, SKU inventory pick-and-pack, and high-velocity freight sorting.'
    }
  ]
};

export const CHILD_DAYCARE_PROFILE: CategoryProfile = {
  categoryId: 'child_daycare',
  canonicalName: 'Licensed Child Daycare Centre',
  naicsCode: '624410',
  naicsTitle: 'Child day-care services',
  volumeUnit: 'licensed full-time children',
  unitRevenueLabel: 'Monthly Tuition per Child',
  benchmarkUnitRevenue: 1250.0,
  periodType: 'MONTH',
  annualOperatingPeriods: 12,
  operationalDailyCapacity: 50,
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
      benchmarkDailyVolume: 48,
      operationalDailyCapacity: 50,
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
      benchmarkDailyVolume: 60,
      operationalDailyCapacity: 64,
      rationale: 'Premium curriculum commanding above-average tuition and corporate employer partnership subsidies.'
    }
  ]
};
