import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  ArrowUpDown, 
  ArrowUp,
  ArrowDown,
  Filter, 
  TrendingUp, 
  AlertTriangle, 
  ExternalLink,
  ChevronRight,
  Search,
  Layers,
  Building,
  DollarSign,
  Users,
  Briefcase,
  Home,
  FileSpreadsheet
} from 'lucide-react';
import { ResolutionBadge } from '../components/ResolutionBadge.js';
import { ExportButton } from '../components/ExportButton.js';
import { MetricTooltip } from '../components/MetricTooltip.js';
import { ContributingDataInspector, ContributingDataProps } from '../components/ContributingDataInspector.js';
import { FeatureOutliersSection } from '../components/FeatureOutliersSection.js';

interface CityRankingsViewProps {
  onSelectCity: (cityId: string) => void;
}

export type RankingTemplate = 'Financial' | 'Demographics' | 'Business' | 'Labour' | 'Housing' | 'Municipality' | 'All';

interface MetricOption {
  id: string;
  label: string;
  unit: string;
  template: RankingTemplate;
  description: string;
}

const METRIC_OPTIONS: MetricOption[] = [
  // Financial
  { id: 'income_median_hh', label: 'Median Household Total Income', unit: '$', template: 'Financial', description: 'StatCan 2021 Census median total annual household income' },
  { id: 'income_average_hh', label: 'Average Household Total Income', unit: '$', template: 'Financial', description: 'StatCan 2021 Census mean total annual household income' },
  { id: 'income_after_tax_median_hh', label: 'Median After-Tax Household Income', unit: '$', template: 'Financial', description: 'StatCan 2021 Census median disposable after-tax income' },
  // Demographics
  { id: 'pop_total', label: 'Total 2021 Census Population', unit: 'residents', template: 'Demographics', description: 'Mandatory Census of Population municipal count' },
  { id: 'pop_growth_5yr', label: '5-Year Population Growth Rate', unit: '%', template: 'Demographics', description: 'Demographic change between 2016 and 2021' },
  { id: 'pop_density', label: 'Population Density', unit: 'people/km²', template: 'Demographics', description: 'Inhabitants per square kilometer of land area' },
  // Business
  { id: 'businesses_per_1000_pop', label: 'Business Density (per 1k pop)', unit: 'biz/1k', template: 'Business', description: 'Active employer business establishments per 1,000 residents' },
  { id: 'businesses_total_counts', label: 'Total Business Establishments', unit: 'biz', template: 'Business', description: 'Canadian Business Counts employer establishments' },
  // Labour
  { id: 'labor_unemployment_rate', label: 'Unemployment Rate', unit: '%', template: 'Labour', description: 'Labour force actively looking for work' },
  { id: 'labor_participation_rate', label: 'Labour Participation Rate', unit: '%', template: 'Labour', description: 'Share of working-age population in labour force' },
  // Housing
  { id: 'shelter_cost_median_rent', label: 'Median Monthly Tenant Rent', unit: '$/mo', template: 'Housing', description: 'Median gross monthly shelter payment for tenant households' },
  { id: 'shelter_cost_median_owner', label: 'Median Monthly Owner Cost', unit: '$/mo', template: 'Housing', description: 'Median monthly mortgage, property tax, and utility payments' },
  { id: 'dwelling_value_average', label: 'Average Dwelling Value', unit: '$', template: 'Housing', description: 'Census expected market valuation of private dwellings' },
  { id: 'prop_multi_owner_pct', label: 'Multi-Property Ownership Share', unit: '%', template: 'Housing', description: 'StatCan CHSP share of property owners owning 2+ properties' },
  // Municipality
  { id: 'municipal_operating_budget', label: 'Municipal Operating Expenditures', unit: '$', template: 'Municipality', description: 'Audited MMAH Financial Information Return annual operating spend' },
  { id: 'municipal_capital_expenditures', label: 'Municipal Capital Expenditures', unit: '$', template: 'Municipality', description: 'Audited infrastructure, transit, and capital investment' },
  { id: 'municipal_taxation_revenue', label: 'Municipal Property Tax Revenue', unit: '$', template: 'Municipality', description: 'Audited property taxation collected by local government' }
];

const TEMPLATE_CONFIG: Record<RankingTemplate, { label: string; icon: React.ReactNode; defaultMetric: string }> = {
  Financial: { label: 'Financial & Income', icon: <DollarSign className="w-3.5 h-3.5 text-emerald-400" />, defaultMetric: 'income_median_hh' },
  Demographics: { label: 'Demographics & Growth', icon: <Users className="w-3.5 h-3.5 text-indigo-400" />, defaultMetric: 'pop_total' },
  Business: { label: 'Business & Economy', icon: <Building className="w-3.5 h-3.5 text-sky-400" />, defaultMetric: 'businesses_per_1000_pop' },
  Labour: { label: 'Workforce & Labour', icon: <Briefcase className="w-3.5 h-3.5 text-rose-400" />, defaultMetric: 'labor_unemployment_rate' },
  Housing: { label: 'Housing & Rent', icon: <Home className="w-3.5 h-3.5 text-amber-400" />, defaultMetric: 'shelter_cost_median_rent' },
  Municipality: { label: 'Municipal Finances', icon: <FileSpreadsheet className="w-3.5 h-3.5 text-purple-400" />, defaultMetric: 'municipal_operating_budget' },
  All: { label: 'All Indicators', icon: <Layers className="w-3.5 h-3.5 text-cyan-400" />, defaultMetric: 'income_median_hh' }
};

type SortField = 'rank' | 'name' | 'population' | 'value' | 'percentile' | 'zscore';

export const CityRankingsView: React.FC<CityRankingsViewProps> = ({ onSelectCity }) => {
  const [activeTemplate, setActiveTemplate] = useState<RankingTemplate>('Financial');
  const [selectedMetric, setSelectedMetric] = useState<string>('income_median_hh');
  const [minPop, setMinPop] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [rowLimit, setRowLimit] = useState<number>(20); // Default to Top 20 per Requirement 14
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [contributingData, setContributingData] = useState<ContributingDataProps | null>(null);

  // Handle template selection
  const handleSelectTemplate = (tpl: RankingTemplate) => {
    setActiveTemplate(tpl);
    const config = TEMPLATE_CONFIG[tpl];
    if (tpl !== 'All') {
      setSelectedMetric(config.defaultMetric);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetch(`/api/rankings?metric=${selectedMetric}`)
      .then(res => res.json())
      .then(data => {
        setRankings(data.rankings || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching rankings:', err);
        setLoading(false);
      });
  }, [selectedMetric]);

  const activeMetricObj = METRIC_OPTIONS.find(m => m.id === selectedMetric) || METRIC_OPTIONS[0];

  // Available metrics filtered by current template
  const filteredMetricOptions = useMemo(() => {
    if (activeTemplate === 'All') return METRIC_OPTIONS;
    return METRIC_OPTIONS.filter(m => m.template === activeTemplate);
  }, [activeTemplate]);

  // Clickable row inspector
  const handleSelectRankingRow = (r: any) => {
    const valFormatted = activeMetricObj.unit === '$' 
      ? `$${Number(r.value_numeric).toLocaleString()}`
      : `${Number(r.value_numeric).toLocaleString()} ${activeMetricObj.unit}`;

    const pRank = Number(r.percentile_rank || 50);
    const zScore = Number(r.z_score || 0);
    const isTopQuartile = pRank >= 75;
    const isBottomQuartile = pRank <= 25;

    let metricInsight = '';
    let metricStrat = '';
    let metricRisk = '';

    if (selectedMetric === 'income_median_hh') {
      metricInsight = isTopQuartile
        ? `${r.city_name} ranks in the top quartile for median household income, providing superior purchasing power for discretionary retail, specialty dining, and private consumer services.`
        : isBottomQuartile
        ? `Household income is below the provincial midpoint; enterprise models should prioritize value pricing, essential service offerings, or high-volume models.`
        : `Moderate purchasing power consistent with provincial norms; consumer spending balances essential household needs with selective discretionary activity.`;
      metricStrat = isTopQuartile
        ? `Capitalize on high discretionary income with premium brand tiering, upscale tenant curation, and lifestyle service offerings.`
        : `Optimize pricing structures to emphasize consumer value and affordability.`;
      metricRisk = isTopQuartile
        ? `Higher local commercial real estate rents and wage expectations may compress operating margins if pricing does not reflect local premium capacity.`
        : `Discretionary consumer demand may be sensitive to inflationary pressures and macro interest rate cycles.`;
    } else if (selectedMetric === 'businesses_per_1000_pop') {
      metricInsight = isTopQuartile
        ? `Elevated commercial density (${valFormatted}) indicates an established entrepreneurial cluster with high B2B networking potential, but intense retail competition.`
        : isBottomQuartile
        ? `Low commercial enterprise density indicates potential undersupply and market gaps across primary retail and community service categories.`
        : `Commercial enterprise density aligns with standard Ontario municipal development averages.`;
      metricStrat = isTopQuartile
        ? `Differentiate sharply through specialized value propositions or niche B2B services rather than head-to-head generalist competition.`
        : `Target first-mover advantages in underserved retail and everyday essential service categories.`;
      metricRisk = isTopQuartile
        ? `Heightened saturation and employee recruitment competition between local commercial employers.`
        : `Verify whether low density reflects low regulatory support or geographic zoning constraints.`;
    } else if (selectedMetric === 'population_growth_pct' || selectedMetric === 'pop_growth_5yr') {
      metricInsight = isTopQuartile
        ? `Rapid demographic expansion (${valFormatted}) drives escalating demand for new residential construction, commercial services, and public infrastructure.`
        : `Demographic trajectory is steady; business growth depends primarily on capturing market share from incumbents rather than relying solely on raw population expansion.`;
      metricStrat = isTopQuartile
        ? `Secure commercial footprint ahead of anticipated multi-year subdivision buildouts to capture incoming new resident market share.`
        : `Focus on customer retention, loyalty programs, and high-frequency recurring patronage.`;
      metricRisk = isTopQuartile
        ? `Municipal permitting bottlenecks, utility connection delays, and escalating land acquisition costs in rapidly expanding growth zones.`
        : `Stagnant local customer pool requires expanding delivery radius or offering regional service lines.`;
    } else if (selectedMetric === 'labor_unemployment_rate') {
      metricInsight = Number(r.value_numeric) <= 5.0
        ? `Tight labor market (${valFormatted}) signifies robust employment but creates recruitment challenges and upward wage competition.`
        : `Higher available labor pool provides commercial operators with ready workforce availability and lower entry wage pressure.`;
      metricStrat = Number(r.value_numeric) <= 5.0
        ? `Invest in employee retention programs, competitive benefit packages, and operational automation.`
        : `Partner with regional workforce development boards to recruit and train local talent.`;
      metricRisk = Number(r.value_numeric) <= 5.0
        ? `Staff shortages or high turnover risks during peak operational hours.`
        : `Macro consumer spending in the municipality may be constrained by local employment friction.`;
    } else {
      metricInsight = `${r.city_name} stands at percentile ${pRank}% (Rank #${r.ontario_rank || 'N/A'}) with a z-score of ${zScore > 0 ? `+${zScore}` : zScore}.`;
      metricStrat = `Benchmark performance against neighboring peer municipalities to identify operational cost advantages or tax efficiencies.`;
      metricRisk = `Evaluate municipal capital levies, tax ratios, and municipal debt servicing ratios before making long-term capital commitments.`;
    }

    setContributingData({
      title: `${r.city_name} — Rank #${r.ontario_rank || 'N/A'} in Ontario`,
      category: 'Cross-Municipal League Table',
      metricLabel: activeMetricObj.label,
      metricName: activeMetricObj.label,
      value: valFormatted,
      metricValue: valFormatted,
      unit: activeMetricObj.unit,
      provenance: {
        sourceName: 'Statistics Canada / Ontario MMAH FIR Audits',
        datasetCode: 'LEAGUE_RANKING_2021',
        referencePeriod: '2021 Census / 2023-2024 Audits',
        resolution: 'CSD',
        confidence: 'OFFICIAL_CENSUS',
        sourceUrl: 'https://www12.statcan.gc.ca/'
      },
      contributingDrivers: [
        {
          label: 'Provincial Percentile Rank',
          value: `Top ${(100 - Number(r.percentile_rank || 0)).toFixed(1)}% (Percentile: ${r.percentile_rank}%)`,
          description: `Ranks higher than ${r.percentile_rank}% of evaluated Ontario Census Subdivisions.`
        },
        {
          label: 'Gaussian Z-Score Divergence',
          value: `z = ${r.z_score !== null ? (r.z_score > 0 ? `+${r.z_score}` : r.z_score) : '0.00'}`,
          description: 'Standard deviations away from the population-weighted provincial benchmark mean.'
        },
        {
          label: 'Outlier Anomaly Status',
          value: r.is_outlier ? 'Statistical Outlier (|z| ≥ 2.0 or Tukey IQR)' : 'Within Standard Bounds',
          description: r.outlier_reason || 'Metric falls within normal provincial distribution bounds.'
        },
        {
          label: 'CSD Population Base',
          value: `${Number(r.population_2021 || 0).toLocaleString()} residents`,
          description: `Official 2021 Census of Population count for ${r.city_name}.`
        }
      ],
      decisionImplications: [
        {
          heading: 'Provincial Decile Standing',
          insight: metricInsight,
          impact: isTopQuartile ? 'positive' : isBottomQuartile ? 'warning' : 'neutral'
        },
        {
          heading: 'Statistical Divergence Impact',
          insight: Math.abs(zScore) >= 2.0
            ? `At z = ${zScore > 0 ? `+${zScore}` : zScore}, this municipality exhibits significant statistical divergence from the Ontario peer distribution, warranting localized operational modeling.`
            : `Metric distribution follows standard provincial gaussian trends within 1-2 standard deviations.`,
          impact: Math.abs(zScore) >= 2.0 ? 'warning' : 'positive'
        }
      ],
      strategicRecommendations: [
        metricStrat,
        `Compare ${r.city_name} against neighboring municipalities in the same economic region to evaluate regional catchment dynamics.`
      ],
      riskMitigations: [
        metricRisk,
        `Verify local zoning by-laws and commercial property tax mill rates before committing capital expenditures.`
      ],
      actionLink: {
        label: `Open ${r.city_name} Complete Intelligence Profile`,
        onClick: () => {
          onSelectCity(r.geography_id);
          setContributingData(null);
        }
      },
      methodologyNote: 'Rankings are computed dynamically using standard rank algorithms with tie-breaking and percentile rank formulas. Outliers are validated against Tukey IQR 1.5x interquartile ranges.',
      onClose: () => setContributingData(null)
    });
  };

  // Toggle sort field or direction
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'name' || field === 'rank');
    }
  };

  // Filtering by pop, search, and sorting
  const processedRankings = useMemo(() => {
    let result = rankings.filter(r => {
      const pop = Number(r.population_2021 || 0);
      if (pop < minPop) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = r.city_name?.toLowerCase().includes(q);
        const matchesDiv = r.census_division?.toLowerCase().includes(q);
        const matchesType = r.csd_type?.toLowerCase().includes(q);
        if (!matchesName && !matchesDiv && !matchesType) return false;
      }
      return true;
    });

    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'rank':
          cmp = (a.ontario_rank || 9999) - (b.ontario_rank || 9999);
          break;
        case 'name':
          cmp = (a.city_name || '').localeCompare(b.city_name || '');
          break;
        case 'population':
          cmp = Number(a.population_2021 || 0) - Number(b.population_2021 || 0);
          break;
        case 'value':
          cmp = Number(a.value_numeric || 0) - Number(b.value_numeric || 0);
          break;
        case 'percentile':
          cmp = Number(a.percentile_rank || 0) - Number(b.percentile_rank || 0);
          break;
        case 'zscore':
          cmp = Number(a.z_score || 0) - Number(b.z_score || 0);
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [rankings, minPop, searchQuery, sortField, sortAsc]);

  // Display limited subset according to rowLimit
  const displayedRankings = useMemo(() => {
    if (rowLimit >= 444) return processedRankings;
    return processedRankings.slice(0, rowLimit);
  }, [processedRankings, rowLimit]);

  const exportData = processedRankings.map(r => ({
    Rank: r.ontario_rank || 'N/A',
    Municipality: r.city_name,
    Type: r.csd_type || 'CSD',
    'Census Division': r.census_division || 'Ontario',
    Population: Number(r.population_2021 || 0),
    Metric: activeMetricObj.label,
    Value: Number(r.value_numeric || 0),
    Unit: activeMetricObj.unit,
    'Percentile Rank (%)': r.percentile_rank,
    'Z-Score': r.z_score,
    'Outlier Status': r.is_outlier ? 'Outlier' : 'Normal',
    'Outlier Reason': r.outlier_reason || ''
  }));

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60 inline ml-1" />;
    }
    return sortAsc 
      ? <ArrowUp className="w-3 h-3 text-indigo-400 inline ml-1" />
      : <ArrowDown className="w-3 h-3 text-indigo-400 inline ml-1" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/60 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              Section 14: Comprehensive Ontario League Table
            </span>
            <ResolutionBadge resolution="CSD" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Ontario Municipal League Table & Comparative Rankings
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Empirically ranks all 444 Ontario Census Subdivisions across key economic indicators. Incorporates Gaussian z-scores, percentile ranks, and Tukey IQR statistical outlier boundary detection.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExportButton 
            data={exportData} 
            filename={`ontario_league_table_${selectedMetric}`} 
            label={`Export Data (${processedRankings.length} CSDs)`} 
          />
        </div>
      </div>

      {/* Contributing Data Inspector */}
      {contributingData && (
        <ContributingDataInspector {...contributingData} />
      )}

      {/* Template Selection Tabs (Requirement 14) */}
      <div className="glass-panel p-2 rounded-xl border border-slate-800 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {(Object.keys(TEMPLATE_CONFIG) as RankingTemplate[]).map(tpl => {
            const isSelected = activeTemplate === tpl;
            const config = TEMPLATE_CONFIG[tpl];
            return (
              <button
                key={tpl}
                type="button"
                onClick={() => handleSelectTemplate(tpl)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                  isSelected 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {config.icon}
                <span>{config.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Control Filters & Search Bar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        {/* Metric Selector & Search */}
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-300">Metric:</label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 font-medium"
            >
              {filteredMetricOptions.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Quick Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search city, county, or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-white text-xs rounded-lg pl-8 pr-3 py-1.5 w-full focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Population Thresholds & Row Limits */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Min Population */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-400">Min Pop:</span>
            {[
              { label: 'All', value: 0 },
              { label: '> 25k', value: 25000 },
              { label: '> 50k', value: 50000 },
              { label: '> 100k', value: 100000 }
            ].map(btn => (
              <button
                key={btn.value}
                type="button"
                onClick={() => setMinPop(btn.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  minPop === btn.value
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* View Limit Selector (Top 20 default vs All 444) */}
          <div className="flex items-center gap-1.5 border-l border-slate-800 pl-4">
            <span className="text-xs font-semibold text-slate-400">Show:</span>
            {[
              { label: 'Top 20', value: 20 },
              { label: 'Top 50', value: 50 },
              { label: 'Top 100', value: 100 },
              { label: 'All 444', value: 444 }
            ].map(lim => (
              <button
                key={lim.value}
                type="button"
                onClick={() => setRowLimit(lim.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  rowLimit === lim.value
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {lim.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Indicator Summary Banner */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>
          Showing <strong className="text-white">{displayedRankings.length}</strong> of{' '}
          <strong className="text-white">{processedRankings.length}</strong> matching municipalities{' '}
          (Total evaluated: {rankings.length})
        </span>
        <span className="text-slate-500 italic">
          {activeMetricObj.description}
        </span>
      </div>

      {/* League Table */}
      <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse">
            Computing statewide percentiles and ranking distribution across all 444 Ontario municipalities...
          </div>
        ) : displayedRankings.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            No municipalities match the selected population and search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider border-b border-slate-800 select-none">
                <tr>
                  <th 
                    className="py-3 px-4 w-16 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('rank')}
                  >
                    Rank {renderSortIndicator('rank')}
                  </th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    Municipality (Click to Inspect) {renderSortIndicator('name')}
                  </th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Census Division</th>
                  <th 
                    className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('population')}
                  >
                    Population (2021) {renderSortIndicator('population')}
                  </th>
                  <th 
                    className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('value')}
                  >
                    {activeMetricObj.label} {renderSortIndicator('value')}
                  </th>
                  <th 
                    className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('percentile')}
                  >
                    Percentile {renderSortIndicator('percentile')}
                  </th>
                  <th 
                    className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('zscore')}
                  >
                    Z-Score {renderSortIndicator('zscore')}
                  </th>
                  <th className="py-3 px-4 text-center">Outlier</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {displayedRankings.map((r, idx) => {
                  const rank = r.ontario_rank || idx + 1;
                  const isTop3 = rank <= 3;
                  const isOutlier = r.is_outlier;

                  return (
                    <tr 
                      key={r.geography_id} 
                      onClick={() => handleSelectRankingRow(r)}
                      className="hover:bg-slate-800/60 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          rank === 1 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                          rank === 2 ? 'bg-slate-300/20 text-slate-200 border border-slate-400/40' :
                          rank === 3 ? 'bg-amber-700/20 text-amber-500 border border-amber-700/40' :
                          'text-slate-400'
                        }`}>
                          {rank}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-1.5">
                        {r.city_name}
                      </td>
                      <td className="py-3 px-4 text-slate-400">{r.csd_type || 'CSD'}</td>
                      <td className="py-3 px-4 text-slate-400">{r.census_division || 'Ontario'}</td>
                      <td className="py-3 px-4 text-right">{Number(r.population_2021 || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-bold text-indigo-300">
                        {activeMetricObj.unit === '$' 
                          ? `$${Number(r.value_numeric).toLocaleString()}`
                          : `${Number(r.value_numeric).toLocaleString()} ${activeMetricObj.unit}`}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        <span className="text-emerald-400">{r.percentile_rank}%</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">
                        {r.z_score !== null ? (r.z_score > 0 ? `+${r.z_score}` : r.z_score) : '0.00'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isOutlier ? (
                          <span 
                            title={r.outlier_reason}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-950/90 text-rose-300 border border-rose-700/60"
                          >
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            Outlier
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCity(r.geography_id);
                          }}
                          className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
                        >
                          View Profile
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Feature Outliers Section */}
      <FeatureOutliersSection 
        category="all" 
        onSelectCity={onSelectCity} 
      />
    </div>
  );
};
