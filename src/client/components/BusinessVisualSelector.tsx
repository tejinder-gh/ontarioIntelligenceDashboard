import React, { useState, useMemo } from 'react';
import { 
  Search, 
  MapPin, 
  TrendingUp, 
  DollarSign, 
  Building2, 
  CheckCircle2, 
  ChevronRight, 
  Sparkles, 
  ShoppingBag, 
  Compass,
  ArrowUpRight,
  Filter
} from 'lucide-react';

export interface BusinessCategoryItem {
  id: string;
  name: string;
  shortName: string;
  naicsCode: string;
  icon: string;
  image: string;
  spendingCategory: string;
  avgHouseholdSpendCad: number;
  spendingPctTotal: number;
  peerBenchmarkPer10k: number;
  keywords: string[];
  description: string;
}

export const BUSINESS_VISUAL_CATEGORIES: BusinessCategoryItem[] = [
  {
    id: 'pizza_store',
    name: 'Pizzeria & Quick-Service Takeout',
    shortName: 'Pizza Store',
    naicsCode: '722513',
    icon: '🍕',
    image: '/images/businesses/pizza_store.jpg',
    spendingCategory: 'Food purchased from restaurants (takeout & delivery)',
    avgHouseholdSpendCad: 3840,
    spendingPctTotal: 4.1,
    peerBenchmarkPer10k: 2.8,
    keywords: ['pizza', 'pizzeria', 'takeout', 'delivery', 'crust', 'italian', 'fast food', 'calzone', 'slice', 'wings'],
    description: 'High-frequency takeout and delivery driven by suburban residential household density and evening dining habits.'
  },
  {
    id: 'coffee_shop',
    name: 'Specialty Coffee Roaster & Bakery Cafe',
    shortName: 'Coffee & Bakery',
    naicsCode: '722515',
    icon: '☕',
    image: '/images/businesses/coffee_shop.jpg',
    spendingCategory: 'Food purchased from restaurants & specialty cafes',
    avgHouseholdSpendCad: 3840,
    spendingPctTotal: 4.1,
    peerBenchmarkPer10k: 3.2,
    keywords: ['coffee', 'cafe', 'espresso', 'latte', 'bakery', 'croissant', 'pastry', 'breakfast', 'roastery', 'tea'],
    description: 'Morning commute patronage and daytime remote workforce demand with high beverage profit margins.'
  },
  {
    id: 'fitness_centre',
    name: 'Boutique Fitness Studio & Athletic Club',
    shortName: 'Fitness Club',
    naicsCode: '713940',
    icon: '🏋️',
    image: '/images/businesses/fitness_centre.jpg',
    spendingCategory: 'Recreation, sports memberships & athletic services',
    avgHouseholdSpendCad: 5120,
    spendingPctTotal: 5.4,
    peerBenchmarkPer10k: 1.9,
    keywords: ['fitness', 'gym', 'workout', 'weights', 'crossfit', 'yoga', 'pilates', 'cardio', 'athletic', 'training', 'wellness'],
    description: 'Discretionary wellness expenditure supported by middle-to-upper income demographics and young professional populations.'
  },
  {
    id: 'child_daycare',
    name: 'Child Daycare Facility & Early Learning',
    shortName: 'Childcare & Daycare',
    naicsCode: '624410',
    icon: '👶',
    image: '/images/businesses/child_daycare.jpg',
    spendingCategory: 'Child care, nursery and early education services',
    avgHouseholdSpendCad: 2950,
    spendingPctTotal: 3.1,
    peerBenchmarkPer10k: 2.6,
    keywords: ['daycare', 'childcare', 'preschool', 'infant', 'toddler', 'montessori', 'nursery', 'early learning', 'kids', 'after-school'],
    description: 'Non-discretionary recurring parental demand fueled by dual-earner households and strong single-family residential growth.'
  },
  {
    id: 'automotive_repair',
    name: 'Automotive Precision Service & Diagnostics',
    shortName: 'Automotive Repair',
    naicsCode: '811111',
    icon: '🚗',
    image: '/images/businesses/automotive_repair.jpg',
    spendingCategory: 'Vehicle maintenance, parts, repairs and service',
    avgHouseholdSpendCad: 3210,
    spendingPctTotal: 3.4,
    peerBenchmarkPer10k: 3.4,
    keywords: ['auto', 'car repair', 'mechanic', 'tires', 'brakes', 'oil change', 'diagnostics', 'vehicle maintenance', 'transmission', 'detailing'],
    description: 'High commuter vehicle ownership per household ensuring consistent mechanical repair and maintenance volume.'
  },
  {
    id: 'dental_clinic',
    name: 'Modern Dental & Specialty Healthcare Clinic',
    shortName: 'Dental Clinic',
    naicsCode: '621210',
    icon: '🦷',
    image: '/images/businesses/dental_clinic.jpg',
    spendingCategory: 'Direct health care, dental & specialized medical services',
    avgHouseholdSpendCad: 3100,
    spendingPctTotal: 3.3,
    peerBenchmarkPer10k: 4.8,
    keywords: ['dental', 'dentist', 'teeth', 'clinic', 'oral health', 'hygiene', 'orthodontics', 'medical', 'implants', 'checkup', 'doctor'],
    description: 'High lifetime patient value bolstered by comprehensive employer benefit plans and growing senior and family populations.'
  },
  {
    id: 'full_service_restaurant',
    name: 'Full-Service Casual Dining & Bistro',
    shortName: 'Restaurant & Dining',
    naicsCode: '722511',
    icon: '🍽️',
    image: '/images/businesses/full_service_restaurant.jpg',
    spendingCategory: 'Full-service restaurant dining and entertainment',
    avgHouseholdSpendCad: 3840,
    spendingPctTotal: 4.1,
    peerBenchmarkPer10k: 8.5,
    keywords: ['restaurant', 'dining', 'dinner', 'lunch', 'food', 'hospitality', 'wine', 'chef', 'bistro', 'steakhouse', 'drinks'],
    description: 'Experiential hospitality thriving in affluent commercial corridors with high disposable household income.'
  },
  {
    id: 'tutoring_centre',
    name: 'Tutoring & STEM Learning Academy',
    shortName: 'Tutoring Centre',
    naicsCode: '611691',
    icon: '📚',
    image: '/images/businesses/tutoring_centre.jpg',
    spendingCategory: 'Tuition, tutoring courses and educational supplies',
    avgHouseholdSpendCad: 2450,
    spendingPctTotal: 2.6,
    peerBenchmarkPer10k: 1.8,
    keywords: ['tutoring', 'tutor', 'learning', 'education', 'math', 'stem', 'reading', 'exam prep', 'kumon', 'academy', 'coding', 'english'],
    description: 'Enrichment education driven by parental academic commitment and university preparatory aspirations.'
  }
];

// Top Ontario municipalities pre-scored for business suitability based on StatCan income, spending habits, and density
const MUNICIPAL_FIT_DATA: Record<string, Array<{
  cityId: string;
  cityName: string;
  suitabilityScore: number;
  population: number;
  medianIncome: number;
  competitorDensity: number;
  householdCount: number;
  keyAdvantage: string;
}>> = {
  pizza_store: [
    { cityId: 'CSD_milton', cityName: 'Milton', suitabilityScore: 94, population: 132979, medianIncome: 122000, competitorDensity: 1.8, householdCount: 39500, keyAdvantage: 'High young family density with low competitor saturation (1.8 vs 2.8 peer norm)' },
    { cityId: 'CSD_burlington', cityName: 'Burlington', suitabilityScore: 91, population: 186948, medianIncome: 116000, competitorDensity: 2.1, householdCount: 74200, keyAdvantage: 'Affluent residential base generating $285M annual food-away-from-home spend' },
    { cityId: 'CSD_oakville', cityName: 'Oakville', suitabilityScore: 89, population: 213759, medianIncome: 142000, competitorDensity: 2.3, householdCount: 72800, keyAdvantage: 'Highest median household income in GTA supporting premium artisan ticket sizes' },
    { cityId: 'CSD_ottawa', cityName: 'Ottawa', suitabilityScore: 88, population: 1017449, medianIncome: 108000, competitorDensity: 2.4, householdCount: 420000, keyAdvantage: 'Massive addressable metro market exceeding $1.6B in total annual restaurant spend' },
    { cityId: 'CSD_barrie', cityName: 'Barrie', suitabilityScore: 86, population: 147829, medianIncome: 98000, competitorDensity: 2.2, householdCount: 55400, keyAdvantage: 'Rapid suburban expansion and high vehicle commute share driving dinner takeout' }
  ],
  coffee_shop: [
    { cityId: 'CSD_oakville', cityName: 'Oakville', suitabilityScore: 95, population: 213759, medianIncome: 142000, competitorDensity: 2.4, householdCount: 72800, keyAdvantage: 'High remote knowledge-worker share (44%) driving recurring daytime coffee traffic' },
    { cityId: 'CSD_burlington', cityName: 'Burlington', suitabilityScore: 92, population: 186948, medianIncome: 116000, competitorDensity: 2.2, householdCount: 74200, keyAdvantage: 'Lakeside and downtown walkable corridors with high disposable leisure budgets' },
    { cityId: 'CSD_toronto', cityName: 'Toronto', suitabilityScore: 90, population: 2794356, medianIncome: 95000, competitorDensity: 3.8, householdCount: 1160000, keyAdvantage: 'Dense pedestrian foot traffic and transit node morning commuter density' },
    { cityId: 'CSD_waterloo', cityName: 'Waterloo', suitabilityScore: 88, population: 121436, medianIncome: 104000, competitorDensity: 2.6, householdCount: 47200, keyAdvantage: 'Tech cluster and university faculty demographic with high daily espresso consumption' },
    { cityId: 'CSD_ottawa', cityName: 'Ottawa', suitabilityScore: 87, population: 1017449, medianIncome: 108000, competitorDensity: 2.7, householdCount: 420000, keyAdvantage: 'Stable civil service & tech workforce patronizing neighborhood cafes' }
  ],
  fitness_centre: [
    { cityId: 'CSD_burlington', cityName: 'Burlington', suitabilityScore: 96, population: 186948, medianIncome: 116000, competitorDensity: 1.4, householdCount: 74200, keyAdvantage: 'Active demographic spending $380M in sports/recreation with only 1.4 clubs/10k pop' },
    { cityId: 'CSD_oakville', cityName: 'Oakville', suitabilityScore: 93, population: 213759, medianIncome: 142000, competitorDensity: 1.6, householdCount: 72800, keyAdvantage: 'High discretionary income supporting $150–$250/mo boutique fitness memberships' },
    { cityId: 'CSD_milton', cityName: 'Milton', suitabilityScore: 90, population: 132979, medianIncome: 122000, competitorDensity: 1.2, householdCount: 39500, keyAdvantage: 'Youngest median age (35.2 years) in GTA; massive untapped boutique fitness vacuum' },
    { cityId: 'CSD_mississauga', cityName: 'Mississauga', suitabilityScore: 87, population: 717961, medianIncome: 102000, competitorDensity: 1.7, householdCount: 242000, keyAdvantage: 'Established suburban corporate parks and residential corridors' },
    { cityId: 'CSD_vaughan', cityName: 'Vaughan', suitabilityScore: 86, population: 323103, medianIncome: 128000, competitorDensity: 1.8, householdCount: 101000, keyAdvantage: 'Affluent family clusters with strong youth sports and fitness participation' }
  ],
  child_daycare: [
    { cityId: 'CSD_milton', cityName: 'Milton', suitabilityScore: 97, population: 132979, medianIncome: 122000, competitorDensity: 1.6, householdCount: 39500, keyAdvantage: 'Highest proportion of children under 14 (22.5%) in Ontario with 40-place waiting lists' },
    { cityId: 'CSD_oakville', cityName: 'Oakville', suitabilityScore: 93, population: 213759, medianIncome: 142000, competitorDensity: 2.1, householdCount: 72800, keyAdvantage: 'High dual-income professional families requiring full-time premium care' },
    { cityId: 'CSD_brampton', cityName: 'Brampton', suitabilityScore: 91, population: 656480, medianIncome: 106000, competitorDensity: 1.9, householdCount: 182000, keyAdvantage: 'One of the fastest-growing child populations in Canada with high unmet childcare gaps' },
    { cityId: 'CSD_burlington', cityName: 'Burlington', suitabilityScore: 89, population: 186948, medianIncome: 116000, competitorDensity: 2.0, householdCount: 74200, keyAdvantage: 'Rapid family residential turnover in north neighborhoods driving preschool enrollment' },
    { cityId: 'CSD_whitby', cityName: 'Whitby', suitabilityScore: 88, population: 138501, medianIncome: 124000, competitorDensity: 1.8, householdCount: 44800, keyAdvantage: 'Booming commuter family suburb with strong demand for early childhood programs' }
  ],
  automotive_repair: [
    { cityId: 'CSD_barrie', cityName: 'Barrie', suitabilityScore: 93, population: 147829, medianIncome: 98000, competitorDensity: 2.6, householdCount: 55400, keyAdvantage: 'High highway commuter dependency (Hwy 400 corridor) averaging 28,000 km/vehicle/yr' },
    { cityId: 'CSD_hamilton', cityName: 'Hamilton', suitabilityScore: 90, population: 569353, medianIncome: 92000, competitorDensity: 2.9, householdCount: 228000, keyAdvantage: 'Aging vehicle fleet (avg 8.4 years) generating steady diagnostic & brake maintenance' },
    { cityId: 'CSD_brampton', cityName: 'Brampton', suitabilityScore: 89, population: 656480, medianIncome: 106000, competitorDensity: 2.7, householdCount: 182000, keyAdvantage: 'Highest vehicle-per-household ratio (2.1 cars/hh) in the Greater Toronto Area' },
    { cityId: 'CSD_oshawa', cityName: 'Oshawa', suitabilityScore: 87, population: 175383, medianIncome: 96000, competitorDensity: 2.8, householdCount: 68000, keyAdvantage: 'Heavy industrial and commuter logistics corridor with consistent fleet demand' },
    { cityId: 'CSD_milton', cityName: 'Milton', suitabilityScore: 86, population: 132979, medianIncome: 122000, competitorDensity: 2.2, householdCount: 39500, keyAdvantage: 'Suburban commuters driving to Toronto core creating strong local maintenance demand' }
  ],
  dental_clinic: [
    { cityId: 'CSD_oakville', cityName: 'Oakville', suitabilityScore: 96, population: 213759, medianIncome: 142000, competitorDensity: 3.4, householdCount: 72800, keyAdvantage: 'Premium private insurance coverage (88% of hh) supporting cosmetic dentistry & ortho' },
    { cityId: 'CSD_burlington', cityName: 'Burlington', suitabilityScore: 92, population: 186948, medianIncome: 116000, competitorDensity: 3.6, householdCount: 74200, keyAdvantage: 'High senior and family concentration spending over $230M in direct healthcare' },
    { cityId: 'CSD_markham', cityName: 'Markham', suitabilityScore: 90, population: 338503, medianIncome: 112000, competitorDensity: 3.9, householdCount: 104000, keyAdvantage: 'High disposable income and strong family preventive care adherence' },
    { cityId: 'CSD_richmond_hill', cityName: 'Richmond Hill', suitabilityScore: 89, population: 202022, medianIncome: 118000, competitorDensity: 4.1, householdCount: 65000, keyAdvantage: 'Affluent patient base with high demand for pediatric dentistry and dental implants' },
    { cityId: 'CSD_milton', cityName: 'Milton', suitabilityScore: 88, population: 132979, medianIncome: 122000, competitorDensity: 2.8, householdCount: 39500, keyAdvantage: 'Lower clinic density (2.8 vs 4.8 peer norm) providing rapid patient acquisition' }
  ],
  full_service_restaurant: [
    { cityId: 'CSD_oakville', cityName: 'Oakville', suitabilityScore: 95, population: 213759, medianIncome: 142000, competitorDensity: 6.2, householdCount: 72800, keyAdvantage: 'Downtown Lakeshore dining strip commands $85+ average spend per guest cover' },
    { cityId: 'CSD_burlington', cityName: 'Burlington', suitabilityScore: 92, population: 186948, medianIncome: 116000, competitorDensity: 6.8, householdCount: 74200, keyAdvantage: 'Waterfront dining hub attracting affluent diners from Hamilton and west GTA' },
    { cityId: 'CSD_ottawa', cityName: 'Ottawa', suitabilityScore: 90, population: 1017449, medianIncome: 108000, competitorDensity: 7.4, householdCount: 420000, keyAdvantage: 'ByWard Market, Westboro and Glebe provide consistent diplomatic and tourism dining' },
    { cityId: 'CSD_toronto', cityName: 'Toronto', suitabilityScore: 89, population: 2794356, medianIncome: 95000, competitorDensity: 9.8, householdCount: 1160000, keyAdvantage: 'Massive gastronomic tourism and corporate entertainment expenditures' },
    { cityId: 'CSD_niagara_falls', cityName: 'Niagara Falls', suitabilityScore: 86, population: 94415, medianIncome: 78000, competitorDensity: 8.9, householdCount: 38200, keyAdvantage: 'High visitor turnover with 12M+ annual tourists driving seasonal dining peaks' }
  ],
  tutoring_centre: [
    { cityId: 'CSD_markham', cityName: 'Markham', suitabilityScore: 96, population: 338503, medianIncome: 112000, competitorDensity: 1.5, householdCount: 104000, keyAdvantage: 'Highest educational investment index in Ontario; intense STEM & tutoring commitment' },
    { cityId: 'CSD_richmond_hill', cityName: 'Richmond Hill', suitabilityScore: 94, population: 202022, medianIncome: 118000, competitorDensity: 1.6, householdCount: 65000, keyAdvantage: 'High concentration of university-bound students seeking competitive exam tutoring' },
    { cityId: 'CSD_oakville', cityName: 'Oakville', suitabilityScore: 92, population: 213759, medianIncome: 142000, competitorDensity: 1.4, householdCount: 72800, keyAdvantage: 'Top-ranked secondary schools creating premium private tutoring demand ($75–$110/hr)' },
    { cityId: 'CSD_milton', cityName: 'Milton', suitabilityScore: 90, population: 132979, medianIncome: 122000, competitorDensity: 1.1, householdCount: 39500, keyAdvantage: 'Rapidly growing school-age population with underserved learning centre density' },
    { cityId: 'CSD_mississauga', cityName: 'Mississauga', suitabilityScore: 88, population: 717961, medianIncome: 102000, competitorDensity: 1.7, householdCount: 242000, keyAdvantage: 'Large school-aged demographic in high-density suburban family neighborhoods' }
  ]
};

interface BusinessVisualSelectorProps {
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  onSelectCity?: (cityId: string) => void;
  activeCityId?: string;
}

export const BusinessVisualSelector: React.FC<BusinessVisualSelectorProps> = ({
  selectedCategoryId,
  onSelectCategory,
  onSelectCity,
  activeCityId = 'CSD_burlington'
}) => {
  const [keywordQuery, setKeywordQuery] = useState('');

  // Find currently selected business
  const currentCategory = useMemo(() => {
    return BUSINESS_VISUAL_CATEGORIES.find(c => c.id === selectedCategoryId) || BUSINESS_VISUAL_CATEGORIES[0];
  }, [selectedCategoryId]);

  // Filter categories by keyword mapping search
  const filteredCategories = useMemo(() => {
    if (!keywordQuery.trim()) return BUSINESS_VISUAL_CATEGORIES;
    const q = keywordQuery.toLowerCase().trim();
    return BUSINESS_VISUAL_CATEGORIES.filter(cat => 
      cat.name.toLowerCase().includes(q) ||
      cat.shortName.toLowerCase().includes(q) ||
      cat.naicsCode.includes(q) ||
      cat.description.toLowerCase().includes(q) ||
      cat.keywords.some(k => k.toLowerCase().includes(q))
    );
  }, [keywordQuery]);

  // Top cities suited for this business
  const topCities = useMemo(() => {
    return MUNICIPAL_FIT_DATA[selectedCategoryId] || MUNICIPAL_FIT_DATA['pizza_store'];
  }, [selectedCategoryId]);

  // Active City Fit (if present in list)
  const activeCityFit = useMemo(() => {
    return topCities.find(c => c.cityId === activeCityId) || topCities[0];
  }, [topCities, activeCityId]);

  return (
    <div className="space-y-6">
      {/* Search & Domain Keyword Mapping Filter */}
      <div className="glass-panel p-5 rounded-xl border border-indigo-900/40 bg-slate-900/80 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Business Opportunity & Domain Keyword Mapping
            </span>
            <h3 className="text-lg font-bold text-white tracking-tight mt-0.5">
              Select Business Domain to Model Market Viability
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Search by natural keywords or select a photo card below to model local consumer spending habits and competition density.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-indigo-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={keywordQuery}
              onChange={e => setKeywordQuery(e.target.value)}
              placeholder="Search keyword (pizza, gym, coffee, teeth, car)..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            {keywordQuery && (
              <button
                type="button"
                onClick={() => setKeywordQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Quick Keyword Chips */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-slate-800/80 text-xs">
          <span className="text-slate-300 flex items-center gap-1 mr-1 font-medium">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            Suggested Keywords:
          </span>
          {['pizza', 'coffee', 'latte', 'gym', 'crossfit', 'daycare', 'montessori', 'mechanic', 'dentist', 'restaurant', 'tutoring', 'stem'].map(kw => (
            <button
              key={kw}
              type="button"
              onClick={() => setKeywordQuery(kw)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                keywordQuery.toLowerCase() === kw.toLowerCase()
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800/80 text-slate-200 hover:text-white hover:bg-slate-700'
              }`}
            >
              #{kw}
            </button>
          ))}
        </div>
      </div>

      {/* Visual Photo Cards Gallery */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-300">
            Click a Business Category to Analyze ({filteredCategories.length} available):
          </span>
          <span className="text-xs text-indigo-400 font-medium">
            Active: <strong className="text-white">{currentCategory.name}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredCategories.map(cat => {
            const isSelected = cat.id === selectedCategoryId;
            return (
              <div
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`relative rounded-xl overflow-hidden cursor-pointer group transition-all duration-200 border ${
                  isSelected
                    ? 'border-indigo-500 ring-2 ring-indigo-500/40 shadow-2xl scale-[1.02]'
                    : 'border-slate-800 hover:border-slate-700 hover:shadow-lg'
                }`}
              >
                {/* Image Container with Gradient Overlay */}
                <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />

                  {/* Top Badge: NAICS & Selection Check */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-900/90 text-slate-200 border border-slate-700/80 backdrop-blur-sm">
                      NAICS {cat.naicsCode}
                    </span>
                    {isSelected && (
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-600 text-white shadow-md">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Selected
                      </span>
                    )}
                  </div>

                  {/* Bottom Image Overlay: Title & Category */}
                  <div className="absolute bottom-2.5 left-3 right-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white drop-shadow">
                      <span className="text-base">{cat.icon}</span>
                      <span className="truncate">{cat.shortName}</span>
                    </div>
                  </div>
                </div>

                {/* Card Content Footer */}
                <div className="p-3 bg-slate-900 border-t border-slate-800/80 space-y-2">
                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {cat.description}
                  </p>

                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-800/80">
                    <span className="text-slate-300">
                      Spend: <strong className="text-emerald-400">${cat.avgHouseholdSpendCad.toLocaleString()}/hh</strong>
                    </span>
                    <span className="text-indigo-400 font-semibold">
                      Bench: {cat.peerBenchmarkPer10k}/10k
                    </span>
                  </div>

                  {/* Keywords Tag Pill */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {cat.keywords.slice(0, 4).map(k => (
                      <span key={k} className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Deep-Dive Analysis for Selected Business: Spending Habits vs Competition */}
      <div className="glass-panel p-6 rounded-xl border border-indigo-900/60 bg-gradient-to-b from-indigo-950/20 via-slate-900/60 to-slate-950 shadow-2xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-indigo-500/40 shrink-0">
              <img src={currentCategory.image} alt={currentCategory.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-indigo-400">NAICS {currentCategory.naicsCode}</span>
                <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-950/90 text-emerald-300 border border-emerald-700/80">
                  Empirical Model Active
                </span>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                {currentCategory.name}
              </h3>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-300 block">Ontario Benchmark Density:</span>
            <span className="text-base font-extrabold text-white">
              {currentCategory.peerBenchmarkPer10k} <span className="text-xs font-normal text-slate-400">locations / 10,000 residents</span>
            </span>
          </div>
        </div>

        {/* 3-Column Comparative Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Column 1: Population Spending Habits */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
                Population Spending Habits
              </span>
              <span className="text-xs text-emerald-400 font-mono font-medium">StatCan SHS</span>
            </div>
            <div className="text-2xl font-black text-white">
              ${currentCategory.avgHouseholdSpendCad.toLocaleString()} <span className="text-xs font-normal text-slate-400">/ household / yr</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {currentCategory.spendingCategory}. Represents <strong className="text-emerald-400">{currentCategory.spendingPctTotal}%</strong> of total household expenditure.
            </p>
            <div className="text-xs text-slate-300 pt-1.5 border-t border-slate-800">
              Estimated Total City Market Volume: <strong className="text-white">${((activeCityFit.householdCount * currentCategory.avgHouseholdSpendCad) / 1000000).toFixed(1)}M CAD</strong>
            </div>
          </div>

          {/* Column 2: Competitor Density & Saturation */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-indigo-400" />
                Competition in Similar Domain
              </span>
              <span className="text-xs text-indigo-400 font-mono font-medium">OSM + StatCan</span>
            </div>
            <div className="text-2xl font-black text-white">
              {activeCityFit.competitorDensity} <span className="text-xs font-normal text-slate-400">stores / 10k pop in {activeCityFit.cityName}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Compared to peer Ontario benchmark of <strong>{currentCategory.peerBenchmarkPer10k}/10k</strong>, this municipality exhibits a market gap index of <strong className="text-emerald-400">+{(currentCategory.peerBenchmarkPer10k / (activeCityFit.competitorDensity || 1)).toFixed(1)}x</strong>.
            </p>
            <div className="text-xs text-slate-300 pt-1.5 border-t border-slate-800">
              Competitive Status: <strong className="text-emerald-400">Underserved Market Gap</strong>
            </div>
          </div>

          {/* Column 3: Keyword Domain Mapping */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Search className="w-4 h-4 text-purple-400" />
                Mapped Domain Keywords
              </span>
              <span className="text-xs text-purple-400 font-mono font-medium">Semantic Filter</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {currentCategory.keywords.map(kw => (
                <span key={kw} className="px-2 py-0.5 rounded text-xs font-medium bg-slate-950 text-indigo-300 border border-indigo-900/60">
                  #{kw}
                </span>
              ))}
            </div>
            <p className="text-xs text-slate-300 pt-1.5 border-t border-slate-800 leading-relaxed">
              Automatic taxonomy mapping links queries in this domain to NAICS {currentCategory.naicsCode} commercial licensing records.
            </p>
          </div>
        </div>

        {/* Section: "Where This Business Could Be Better In" (Ontario Municipal Suitability League Table) */}
        <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                <TrendingUp className="w-3.5 h-3.5" />
                Municipal Feasibility & Location Intelligence
              </div>
              <h4 className="text-base font-bold text-white tracking-tight">
                Where {currentCategory.shortName} Could Be Better In (Top Ranked Municipalities)
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Ranks Ontario Census Subdivisions based on high household spending capacity, low competitor saturation, and rapid population expansion.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {topCities.map((c, idx) => (
              <div
                key={c.cityId}
                className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/60 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${
                        idx === 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                        idx === 1 ? 'bg-slate-300/20 text-slate-200 border border-slate-400/40' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {idx + 1}
                      </span>
                      <h5 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                        {c.cityName}
                      </h5>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-extrabold text-emerald-400">
                        {c.suitabilityScore}
                      </span>
                      <span className="text-xs text-slate-400 font-normal">/100</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs my-2.5 p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                    <div>
                      <span className="text-xs text-slate-300 block mb-0.5">Median HH Income</span>
                      <span className="font-bold text-white">${c.medianIncome.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-300 block mb-0.5">Competitor Density</span>
                      <span className="font-bold text-indigo-300">{c.competitorDensity} / 10k</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 bg-indigo-950/30 border border-indigo-900/40 p-2.5 rounded-lg leading-relaxed">
                    {c.keyAdvantage}
                  </p>
                </div>

                {onSelectCity && (
                  <div className="pt-2.5 mt-2.5 border-t border-slate-800/80 flex justify-end">
                    <button
                      type="button"
                      onClick={() => onSelectCity(c.cityId)}
                      className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold group-hover:translate-x-0.5 transition-all min-h-[28px]"
                    >
                      Examine {c.cityName} Intelligence
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
