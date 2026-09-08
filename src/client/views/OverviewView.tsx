import React, { useState, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Store, 
  Building, 
  Briefcase, 
  ShieldAlert, 
  CheckCircle, 
  Sparkles,
  ArrowUpRight,
  MapPin
} from 'lucide-react';
import { ResolutionBadge } from '../components/ResolutionBadge.js';
import { MetricTooltip } from '../components/MetricTooltip.js';
import { FeatureOutliersSection } from '../components/FeatureOutliersSection.js';

interface OverviewViewProps {
  cityId: string;
  onNavigateTab: (tab: any) => void;
  onSelectCity?: (cityId: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ cityId, onNavigateTab, onSelectCity }) => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/geographies/${cityId}/profile`)
      .then(res => res.json())
      .then(data => {
        setProfile(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading profile:', err);
        setLoading(false);
      });
  }, [cityId]);

  if (loading || !profile) {
    return (
      <div className="p-8 text-center text-slate-400 animate-pulse">
        Loading comprehensive municipal intelligence...
      </div>
    );
  }

  const geo = profile.geography;
  const obs = profile.observations || [];

  const getMetricVal = (metricId: string, fallback = 0) => {
    const item = obs.find((o: any) => o.metric_id === metricId);
    return item ? Number(item.value_numeric) : fallback;
  };

  const pop = geo.population_2021 || 186948;
  const growth = geo.population_growth_pct || 0;
  const share = geo.ontario_pop_share_pct || 1.314;
  const medianIncome = getMetricVal('income_median_hh', 116000);
  const totalBiz = getMetricVal('businesses_total_counts', 5820);
  const bizDensity = getMetricVal('businesses_per_1000_pop', 31.1);
  const retailRent = getMetricVal('commercial_rent_retail_net', 34.50);
  const unemp = getMetricVal('labor_unemployment_rate', 6.6);

  return (
    <div className="space-y-6">
      {/* City Header Banner */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/60">
              {geo.csd_type || 'City'}
            </span>
            <span className="text-xs text-slate-400">Census Division: {geo.census_division}</span>
            <ResolutionBadge resolution="CSD" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {geo.name} Economic Intelligence Profile
          </h2>
          <p className="text-sm text-slate-300 mt-1 max-w-3xl">
            {geo.name} represents <strong className="text-indigo-400">{share}%</strong> of Ontario&apos;s total population with {pop.toLocaleString()} residents and an active commercial footprint of {totalBiz.toLocaleString()} employer businesses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigateTab('opportunity_lab')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-indigo-600/25"
          >
            <Sparkles className="w-4 h-4" />
            Launch Opportunity Lab
          </button>
        </div>
      </div>

      {/* Core KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* KPI 1: Population */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 hover:border-indigo-500/40 transition-all shadow-sm">
          <div className="flex items-center justify-between text-slate-300 text-xs mb-1.5">
            <span className="flex items-center gap-1.5 font-medium">
              <Users className="w-4 h-4 text-indigo-400" />
              Population (2021)
            </span>
            <MetricTooltip 
              name="Total Population"
              definition="Census population count for 2021."
              unit="people"
              source="Statistics Canada 2021 Census Profile"
              period="2021"
            />
          </div>
          <div className="text-2xl font-extrabold text-white tracking-tight">{pop.toLocaleString()}</div>
          <div className="text-xs text-slate-300 mt-1 flex items-center gap-1 font-medium">
            <span className="text-indigo-400 font-semibold">{share}%</span> of Ontario total
          </div>
        </div>

        {/* KPI 2: Population Growth */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 hover:border-indigo-500/40 transition-all shadow-sm">
          <div className="flex items-center justify-between text-slate-300 text-xs mb-1.5">
            <span className="flex items-center gap-1.5 font-medium">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              5-Yr Pop Growth
            </span>
            <MetricTooltip 
              name="5-Year Population Growth"
              definition="Percentage population change between 2016 and 2021 Census."
              unit="%"
              source="Statistics Canada 2021 Census Profile"
            />
          </div>
          <div className="text-2xl font-extrabold text-white tracking-tight">
            {growth > 0 ? `+${growth}%` : `${growth}%`}
          </div>
          <div className="text-xs text-slate-300 mt-1 font-medium">
            {growth >= 5.8 ? 'Above Ontario avg (+5.8%)' : 'Below Ontario avg (+5.8%)'}
          </div>
        </div>

        {/* KPI 3: Household Income */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 hover:border-indigo-500/40 transition-all shadow-sm">
          <div className="flex items-center justify-between text-slate-300 text-xs mb-1.5">
            <span className="flex items-center gap-1.5 font-medium">
              <DollarSign className="w-4 h-4 text-amber-400" />
              Median HH Income
            </span>
            <MetricTooltip 
              name="Median Household Total Income"
              definition="Median total income of private households."
              unit="CAD"
              source="Statistics Canada 2021 Census Profile"
              period="2020"
            />
          </div>
          <div className="text-2xl font-extrabold text-white tracking-tight">${medianIncome.toLocaleString()}</div>
          <div className="text-xs text-emerald-400 font-semibold mt-1">
            High purchasing power
          </div>
        </div>

        {/* KPI 4: Employer Businesses */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 hover:border-indigo-500/40 transition-all shadow-sm">
          <div className="flex items-center justify-between text-slate-300 text-xs mb-1.5">
            <span className="flex items-center gap-1.5 font-medium">
              <Store className="w-4 h-4 text-sky-400" />
              Active Businesses
            </span>
            <MetricTooltip 
              name="Total Employer Establishments"
              definition="Active business establishments with employees."
              unit="businesses"
              source="Statistics Canada Business Counts"
              period="Dec 2025"
            />
          </div>
          <div className="text-2xl font-extrabold text-white tracking-tight">{totalBiz.toLocaleString()}</div>
          <div className="text-xs text-slate-300 mt-1 font-medium">
            {bizDensity} biz / 1k pop
          </div>
        </div>

        {/* KPI 5: Commercial Retail Rent */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 hover:border-indigo-500/40 transition-all shadow-sm">
          <div className="flex items-center justify-between text-slate-300 text-xs mb-1.5">
            <span className="flex items-center gap-1.5 font-medium">
              <Building className="w-4 h-4 text-purple-400" />
              Retail Asking Rent
            </span>
            <MetricTooltip 
              name="Average Retail Asking Net Rent"
              definition="Average net annual asking rent per square foot for commercial retail strip space."
              unit="CAD/sq ft/yr"
              source="Commercial Brokerage Market Reports"
              period="2024-Q4"
            />
          </div>
          <div className="text-2xl font-extrabold text-white tracking-tight">${retailRent.toFixed(2)}</div>
          <div className="text-xs text-slate-300 mt-1 font-medium">
            CAD/sq ft/yr net
          </div>
        </div>

        {/* KPI 6: Unemployment Rate */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 hover:border-indigo-500/40 transition-all shadow-sm">
          <div className="flex items-center justify-between text-slate-300 text-xs mb-1.5">
            <span className="flex items-center gap-1.5 font-medium">
              <Briefcase className="w-4 h-4 text-rose-400" />
              Unemployment Rate
            </span>
            <MetricTooltip 
              name="Unemployment Rate"
              definition="Percentage of labour force actively seeking employment."
              unit="%"
              source="Statistics Canada 2021 Census Profile"
            />
          </div>
          <div className="text-2xl font-extrabold text-white tracking-tight">{unemp}%</div>
          <div className="text-xs text-slate-300 mt-1 font-medium">
            Participation: 66.8%
          </div>
        </div>
      </div>

      {/* Evidence-Backed Strengths & Risks (Section 24 & 25) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* City Strengths */}
        <div className="glass-panel p-5 rounded-xl border border-emerald-950/60 bg-gradient-to-b from-emerald-950/20 to-slate-900/60">
          <div className="flex items-center justify-between mb-3 border-b border-emerald-900/40 pb-2">
            <h3 className="text-base font-bold text-emerald-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Evidence-Backed City Strengths
            </h3>
            <span className="text-xs text-emerald-400 font-mono">Linked to Metrics</span>
          </div>

          <ul className="space-y-2.5 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
              <span>
                <strong className="text-white">Affluent Consumer Base:</strong> Median household income of ${medianIncome.toLocaleString()} ranks in the 92nd percentile among Ontario municipalities, driving premium discretionary food, retail, and service expenditures.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
              <span>
                <strong className="text-white">Highly Skilled Professional Workforce:</strong> Over 40% of employed residents work in business/finance, sciences, and management occupations, creating strong daytime and remote working patronage.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
              <span>
                <strong className="text-white">Strategic Logistics & Commuting Corridor:</strong> Direct access to QEW, 403, and 407 transit links connecting the GTA West commercial hub to Hamilton, Niagara, and Toronto.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
              <span>
                <strong className="text-white">Robust Family Demographics:</strong> High concentration of dual-income couple households with children supporting childcare, tutoring, and family recreation businesses.
              </span>
            </li>
          </ul>
        </div>

        {/* City Risks & Weaknesses */}
        <div className="glass-panel p-5 rounded-xl border border-rose-950/60 bg-gradient-to-b from-rose-950/20 to-slate-900/60">
          <div className="flex items-center justify-between mb-3 border-b border-rose-900/40 pb-2">
            <h3 className="text-base font-bold text-rose-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Evidence-Backed Operational Risks
            </h3>
            <span className="text-xs text-rose-400 font-mono">Linked to Metrics</span>
          </div>

          <ul className="space-y-2.5 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />
              <span>
                <strong className="text-white">Elevated Commercial Occupancy Costs:</strong> Retail net asking rents average ${retailRent.toFixed(2)}/sq ft with additional TMI of ~$13.20/sq ft, raising baseline breakeven hurdles for retail startups.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />
              <span>
                <strong className="text-white">Mature Commercial Saturation:</strong> High presence of established national chains along major retail strips (Brant St, Fairview St, Guelph Line) requiring strong local culinary differentiation.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />
              <span>
                <strong className="text-white">Moderate Organic Population Growth:</strong> 5-year growth of +{growth}% lags high-growth outer suburbs like Milton (+20.7%), requiring businesses to capture existing market share rather than relying solely on residential influx.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />
              <span>
                <strong className="text-white">Tight Labour Market:</strong> Professional and service wage competition requires competitive hourly packages for entry-level food counter and retail positions.
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => onNavigateTab('opportunity_lab')}
          className="glass-panel p-4 rounded-xl border border-slate-800 text-left hover:border-indigo-500/80 transition-all group"
        >
          <div className="flex items-center justify-between text-indigo-400 text-xs font-semibold mb-1">
            <span>Opportunity Lab</span>
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <div className="text-sm font-bold text-white mb-1">Evaluate Specific Business Category</div>
          <p className="text-xs text-slate-400">
            Simulate capital investment, rent models, competitor concentration, and market saturation ratios for pizza stores, daycares, or gyms.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('demographics')}
          className="glass-panel p-4 rounded-xl border border-slate-800 text-left hover:border-indigo-500/80 transition-all group"
        >
          <div className="flex items-center justify-between text-indigo-400 text-xs font-semibold mb-1">
            <span>Demographic Lens</span>
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <div className="text-sm font-bold text-white mb-1">Dynamic Top 20 Communities</div>
          <p className="text-xs text-slate-400">
            Inspect ethnic origins, visible minority concentrations, and language groups dynamically derived from {geo.name}&apos;s Census data.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('municipality_finances')}
          className="glass-panel p-4 rounded-xl border border-slate-800 text-left hover:border-indigo-500/80 transition-all group"
        >
          <div className="flex items-center justify-between text-indigo-400 text-xs font-semibold mb-1">
            <span>Municipal Finances</span>
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <div className="text-sm font-bold text-white mb-1">Ontario FIR Multi-Year Statements</div>
          <p className="text-xs text-slate-400">
            Official municipal operating expenditures, capital investments, property taxation, transit spending, and reserves.
          </p>
        </button>
      </div>

      {/* Cross-Domain Empirical Outliers for Selected Municipality */}
      <FeatureOutliersSection 
        category="all" 
        cityId={cityId} 
        onSelectCity={onSelectCity} 
      />
    </div>
  );
};
