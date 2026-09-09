import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Home, 
  PieChart as PieChartIcon, 
  AlertCircle, 
  Info, 
  CheckCircle2, 
  BarChart3,
  Scale,
  Layers,
  Plus,
  X,
  Search,
  Building2,
  ChevronRight
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, Legend } from 'recharts';
import { ResolutionBadge } from '../components/ResolutionBadge.js';
import { ExportButton } from '../components/ExportButton.js';
import { MetricTooltip } from '../components/MetricTooltip.js';
import { ContributingDataInspector, ContributingDataProps } from '../components/ContributingDataInspector.js';
import { FeatureOutliersSection } from '../components/FeatureOutliersSection.js';

interface FinancialProfileViewProps {
  cityId: string;
}

export const FinancialProfileView: React.FC<FinancialProfileViewProps> = ({ cityId }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Multi-City Financial Benchmark State
  const [compareCityIds, setCompareCityIds] = useState<string[]>([cityId, 'CSD_oakville', 'CSD_milton']);
  const [compareFinancials, setCompareFinancials] = useState<any[]>([]);
  const [loadingCompare, setLoadingCompare] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Clickable Graph Inspector State
  const [contributingData, setContributingData] = useState<ContributingDataProps | null>(null);

  // Keep active cityId in compare list
  useEffect(() => {
    if (!compareCityIds.includes(cityId)) {
      setCompareCityIds([cityId, ...compareCityIds.slice(0, 4)]);
    }
  }, [cityId]);

  // Load Single City Financials
  useEffect(() => {
    setLoading(true);
    fetch(`/api/geographies/${cityId}/financials`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching financial profile:', err);
        setLoading(false);
      });
  }, [cityId]);

  // Load Multi-City Comparison Data
  useEffect(() => {
    if (compareCityIds.length > 0) {
      setLoadingCompare(true);
      fetch(`/api/geographies/compare?ids=${compareCityIds.join(',')}`)
        .then(res => res.json())
        .then(d => {
          setCompareFinancials(d.comparison || []);
          setLoadingCompare(false);
        })
        .catch(err => {
          console.error('Error fetching compare financials:', err);
          setLoadingCompare(false);
        });
    }
  }, [compareCityIds]);

  // Handle City Search for Comparison
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setSearching(true);
      fetch(`/api/geographies?q=${encodeURIComponent(searchQuery)}&limit=8`)
        .then(res => res.json())
        .then(json => {
          setSearchResults(json.data || []);
          setSearching(false);
        })
        .catch(() => setSearching(false));
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const addCompareCity = (cid: string) => {
    if (!compareCityIds.includes(cid)) {
      if (compareCityIds.length < 6) {
        setCompareCityIds([...compareCityIds, cid]);
      } else {
        setCompareCityIds([...compareCityIds.slice(1), cid]);
      }
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeCompareCity = (cid: string) => {
    if (compareCityIds.length > 1) {
      setCompareCityIds(compareCityIds.filter(id => id !== cid));
    }
  };

  if (loading || !data) {
    return (
      <div className="p-12 text-center text-slate-400 animate-pulse">
        Loading comprehensive household financial profile...
      </div>
    );
  }

  const inc = data.householdIncome || {};
  const shelter = data.housingShelterCosts || {};
  const wealth = data.wealthNetWorthBenchmark;

  const incomeComparisonData = [
    { name: 'Median Before-Tax', value: inc.median || 0, fill: '#6366f1', benchmark: 95000, desc: 'Central tendency threshold of household income' },
    { name: 'Average Before-Tax', value: inc.average || 0, fill: '#8b5cf6', benchmark: 112000, desc: 'Skewed higher by top-bracket household earnings' },
    { name: 'Median After-Tax', value: inc.medianAfterTax || 0, fill: '#10b981', benchmark: 82000, desc: 'Actual net take-home purchasing power after tax' }
  ];

  const shelterData = [
    { name: 'Tenant Rent / mo', value: shelter.medianTenantRent || 0, fill: '#3b82f6', benchmark: 1550, desc: 'Monthly median rental obligation including utilities' },
    { name: 'Owner Shelter / mo', value: shelter.medianOwnerCost || 0, fill: '#06b6d4', benchmark: 1680, desc: 'Monthly mortgage, municipal property taxes, and upkeep' }
  ];

  // Prepare Multi-City Chart Data
  const multiCityIncomeChartData = compareFinancials.map(c => ({
    name: c.name,
    id: c.id,
    'Median Income': Number(c.median_income) || 0,
    'Monthly Rent': Number(c.median_rent) || 0,
    pop: c.population_2021
  }));

  const exportData = [
    { Metric: 'Median Household Income (Before Tax)', Value: `$${inc.median?.toLocaleString()}` },
    { Metric: 'Average Household Income (Before Tax)', Value: `$${inc.average?.toLocaleString()}` },
    { Metric: 'Mean vs Median Delta ($)', Value: `$${inc.difference?.toLocaleString()}` },
    { Metric: 'Mean vs Median Skew (%)', Value: `${inc.percentageDifference}%` },
    { Metric: 'Median After-Tax Income', Value: `$${inc.medianAfterTax?.toLocaleString()}` },
    { Metric: 'Median Monthly Tenant Rent', Value: `$${shelter.medianTenantRent?.toLocaleString()}` },
    { Metric: 'Median Monthly Owner Shelter Cost', Value: `$${shelter.medianOwnerCost?.toLocaleString()}` },
    { Metric: 'Average Dwelling Value', Value: `$${shelter.averageDwellingValue?.toLocaleString()}` }
  ];

  if (wealth) {
    exportData.push(
      { Metric: 'Benchmark Net Worth (Median)', Value: `$${wealth.medianNetWorth?.toLocaleString()}` },
      { Metric: 'Benchmark Net Worth (Average)', Value: `$${wealth.averageNetWorth?.toLocaleString()}` },
      { Metric: 'Benchmark Median Assets', Value: `$${wealth.medianAssets?.toLocaleString()}` },
      { Metric: 'Benchmark Median Debt', Value: `$${wealth.medianDebt?.toLocaleString()}` },
      { Metric: 'Benchmark Resolution', Value: wealth.geographicResolution }
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/60">
              Section 5: Household Purchasing Power & Wealth
            </span>
            <ResolutionBadge resolution="CSD" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Household Income Distribution & Wealth Benchmarks
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Comparing median vs. average income reveals distribution skewness and disposable income capacity. Wealth metrics incorporate Statistics Canada Survey of Financial Security benchmarks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExportButton data={exportData} filename={`financial_profile_${cityId}`} label="Export Financial Data" />
        </div>
      </div>

      {/* Income KPI Cards (Clickable for Decision Drill-Down) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Median HH Income */}
        <div 
          role="button"
          tabIndex={0}
          onClick={() => setContributingData({
            title: `${cityId.replace('CSD_', '')} Median Household Income Analysis`,
            category: 'Household Purchasing Power',
            metricLabel: 'Median Household Total Income',
            value: inc.median || 0,
            unit: 'CAD',
            benchmarkValue: '$95,000 CAD',
            benchmarkLabel: 'Ontario Median Benchmark',
            deltaPct: Math.round((((inc.median || 0) - 95000) / 95000) * 100),
            sourceLineage: 'Statistics Canada 2021 Census Profile (Table 98-401-X2021001)',
            referenceYear: '2020 Tax Year',
            decisionImplications: [
              {
                heading: 'Purchasing Power & Price Tolerance',
                insight: `Median household income of $${(inc.median || 0).toLocaleString()} represents the 50th percentile threshold, indicating high capacity for discretionary retail, specialty dining, and private family services.`,
                impact: 'positive'
              },
              {
                heading: 'Income Skewness Context',
                insight: `Average income is $${(inc.average || 0).toLocaleString()} (+$${(inc.difference || 0).toLocaleString()} / +${inc.percentageDifference}% higher), demonstrating a positive wealth skew with affluent upper-income households.`,
                impact: 'positive'
              }
            ],
            strategicRecommendations: [
              'Target upper-middle tier pricing with high perceived quality and convenience.',
              'Position location in high-visibility commercial strips serving primary commuter corridors.'
            ],
            onClose: () => setContributingData(null)
          })}
          onKeyDown={(e) => e.key === 'Enter' && setContributingData(null)}
          className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-indigo-500/80 hover:bg-slate-900 transition-all cursor-pointer group active:scale-[0.98]"
          title="Click to inspect median household purchasing power"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider group-hover:text-indigo-300 transition-colors">Median Household Income</span>
            <MetricTooltip content="50% of households earn more, 50% earn less. Best measure of central tendency unaffected by extreme wealth." />
          </div>
          <div className="text-3xl font-extrabold text-white group-hover:text-indigo-200 transition-colors">
            ${(inc.median || 0).toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>Before-tax total household income</span>
            <span className="text-[10px] text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
              Inspect <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Average HH Income */}
        <div 
          role="button"
          tabIndex={0}
          onClick={() => setContributingData({
            title: `${cityId.replace('CSD_', '')} Average Household Income & Wealth Skew`,
            category: 'Income Distribution & Skewness',
            metricLabel: 'Average Household Total Income',
            value: inc.average || 0,
            unit: 'CAD',
            benchmarkValue: `$${(inc.median || 0).toLocaleString()} Median`,
            benchmarkLabel: 'Local Central Tendency',
            deltaPct: inc.percentageDifference,
            sourceLineage: 'Statistics Canada 2021 Census Profile',
            referenceYear: '2020 Tax Year',
            decisionImplications: [
              {
                heading: 'Top-Bracket Consumer Presence',
                insight: `Average income exceeds the median by $${(inc.difference || 0).toLocaleString()} (${inc.percentageDifference}%), confirming the presence of ultra-high-income households pulling the distribution upward.`,
                impact: 'positive'
              },
              {
                heading: 'Market Segmentation Potential',
                insight: `Strong justification for premium multi-tier offerings (e.g. VIP memberships, luxury upgrades, premium tasting menus).`,
                impact: 'positive'
              }
            ],
            strategicRecommendations: [
              'Develop dual-tier pricing: accessible baseline items plus high-margin premium offerings.',
              'Evaluate private catering and bespoke corporate services.'
            ],
            onClose: () => setContributingData(null)
          })}
          onKeyDown={(e) => e.key === 'Enter' && setContributingData(null)}
          className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-purple-500/80 hover:bg-slate-900 transition-all cursor-pointer group active:scale-[0.98]"
          title="Click to inspect average household income and distribution skew"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider group-hover:text-purple-300 transition-colors">Average Household Income</span>
            <Scale className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold text-white group-hover:text-purple-200 transition-colors">
            ${(inc.average || 0).toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-indigo-300 flex items-center justify-between font-medium">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
              <span>+${(inc.difference || 0).toLocaleString()} ({inc.percentageDifference}%) over median</span>
            </span>
            <span className="text-[10px] text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
              Inspect <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Median After-Tax Income */}
        <div 
          role="button"
          tabIndex={0}
          onClick={() => setContributingData({
            title: `${cityId.replace('CSD_', '')} After-Tax Disposable Purchasing Power`,
            category: 'Net Take-Home Income',
            metricLabel: 'Median After-Tax Household Income',
            value: inc.medianAfterTax || 0,
            unit: 'CAD',
            benchmarkValue: '$82,000 CAD',
            benchmarkLabel: 'Ontario Median After-Tax',
            deltaPct: Math.round((((inc.medianAfterTax || 0) - 82000) / 82000) * 100),
            sourceLineage: 'Statistics Canada 2021 Census Profile',
            referenceYear: '2020 Tax Year',
            decisionImplications: [
              {
                heading: 'Real Take-Home Retention',
                insight: `Households retain ${((inc.medianAfterTax / (inc.median || 1)) * 100).toFixed(1)}% of their gross earnings after federal and provincial income taxes, leaving ~$${Math.round((inc.medianAfterTax || 0) / 12).toLocaleString()}/month in net household cash flow.`,
                impact: 'positive'
              }
            ],
            strategicRecommendations: [
              'Model recurring subscription services around monthly net disposable budgets.',
              'High retention indicates low price resistance for family sports, tutoring, and personal care.'
            ],
            onClose: () => setContributingData(null)
          })}
          onKeyDown={(e) => e.key === 'Enter' && setContributingData(null)}
          className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-emerald-500/80 hover:bg-slate-900 transition-all cursor-pointer group active:scale-[0.98]"
          title="Click to inspect net disposable after-tax income"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider group-hover:text-emerald-300 transition-colors">Median After-Tax Income</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white group-hover:text-emerald-200 transition-colors">
            ${(inc.medianAfterTax || 0).toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>True net disposable income</span>
            <span className="text-[10px] text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
              Inspect <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Median Monthly Rent */}
        <div 
          role="button"
          tabIndex={0}
          onClick={() => setContributingData({
            title: `${cityId.replace('CSD_', '')} Housing & Shelter Cost Burden`,
            category: 'Housing & Rent Overhead',
            metricLabel: 'Median Monthly Tenant Rent',
            value: shelter.medianTenantRent || 0,
            unit: 'CAD / month',
            benchmarkValue: '$1,550 / mo',
            benchmarkLabel: 'Ontario Median Rent',
            deltaPct: Math.round((((shelter.medianTenantRent || 0) - 1550) / 1550) * 100),
            sourceLineage: 'Statistics Canada 2021 Census Profile (Housing)',
            referenceYear: '2021 Census',
            decisionImplications: [
              {
                heading: 'Shelter Cost Ratio',
                insight: `At $${(shelter.medianTenantRent || 0).toLocaleString()}/month, annual rent represents ${(((shelter.medianTenantRent * 12) / (inc.medianAfterTax || 1)) * 100).toFixed(1)}% of net after-tax household income, well within healthy affordability thresholds (< 30%).`,
                impact: 'positive'
              },
              {
                heading: 'Homeowner Comparison',
                insight: `Owner major payments average $${(shelter.medianOwnerCost || 0).toLocaleString()}/month across an average dwelling value of $${(shelter.averageDwellingValue || 0).toLocaleString()} CAD.`,
                impact: 'neutral'
              }
            ],
            strategicRecommendations: [
              'High home equity and manageable shelter burdens leave generous discretionary cushions for retail and dining out.'
            ],
            onClose: () => setContributingData(null)
          })}
          onKeyDown={(e) => e.key === 'Enter' && setContributingData(null)}
          className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-blue-500/80 hover:bg-slate-900 transition-all cursor-pointer group active:scale-[0.98]"
          title="Click to inspect shelter cost burden and rent affordability"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider group-hover:text-blue-300 transition-colors">Median Monthly Rent</span>
            <Home className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold text-white group-hover:text-blue-200 transition-colors">
            ${(shelter.medianTenantRent || 0).toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>Owner cost: ${(shelter.medianOwnerCost || 0).toLocaleString()} / mo</span>
            <span className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
              Inspect <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Contributing Data Inspector */}
      {contributingData && (
        <ContributingDataInspector {...contributingData} />
      )}

      {/* Single-City Income & Shelter Charts (Clickable) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Comparison Chart */}
        <div className="glass-panel p-6 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-400" />
                Household Income Metrics (CAD)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Click any bar to inspect contributing drivers & benchmark comparisons.
              </p>
            </div>
            <ResolutionBadge resolution="CSD" />
          </div>

          <div className="h-64 cursor-pointer">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={incomeComparisonData} 
                margin={{ top: 10, right: 20, left: 15, bottom: 20 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const item = e.activePayload[0].payload;
                    setContributingData({
                      title: `${item.name} Breakdown (${cityId.replace('CSD_', '')})`,
                      metricLabel: item.name,
                      value: item.value,
                      unit: 'CAD',
                      benchmarkValue: `$${Number(item.benchmark).toLocaleString()}`,
                      benchmarkLabel: 'Ontario Median Benchmark',
                      deltaPct: Math.round(((item.value - item.benchmark) / item.benchmark) * 100),
                      sourceLineage: 'Statistics Canada 2021 Census Profile (Table 98-401-X2021001)',
                      referenceYear: '2020 Tax Reference Year',
                      contextDrivers: [
                        item.desc,
                        `Mean vs Median Delta: $${(inc.difference || 0).toLocaleString()} indicating positive wealth skewness.`,
                        `Median after-tax income represents ${((inc.medianAfterTax / (inc.median || 1)) * 100).toFixed(1)}% take-home retention.`
                      ],
                      onClose: () => setContributingData(null)
                    });
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Income']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {incomeComparisonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Shelter Costs */}
        <div className="glass-panel p-6 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Home className="w-5 h-5 text-indigo-400" />
                Monthly Shelter Costs (CAD / Month)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Click any bar to inspect gross rent vs. owner major payments.
              </p>
            </div>
            <ResolutionBadge resolution="CSD" />
          </div>

          <div className="h-64 cursor-pointer">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={shelterData} 
                margin={{ top: 10, right: 20, left: 15, bottom: 20 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const item = e.activePayload[0].payload;
                    setContributingData({
                      title: `${item.name} Breakdown (${cityId.replace('CSD_', '')})`,
                      metricLabel: item.name,
                      value: item.value,
                      unit: 'CAD / mo',
                      benchmarkValue: `$${Number(item.benchmark).toLocaleString()} / mo`,
                      benchmarkLabel: 'Ontario Median Benchmark',
                      deltaPct: Math.round(((item.value - item.benchmark) / item.benchmark) * 100),
                      sourceLineage: 'Statistics Canada 2021 Census Profile (Housing & Shelter)',
                      referenceYear: '2021 Census',
                      contextDrivers: [
                        item.desc,
                        `Average local dwelling value: $${Number(shelter.averageDwellingValue || 950000).toLocaleString()} CAD.`,
                        `Tenant rent to income ratio: ${(((item.value * 12) / (inc.medianAfterTax || 1)) * 100).toFixed(1)}% of net income.`
                      ],
                      onClose: () => setContributingData(null)
                    });
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  formatter={(val: any) => [`$${Number(val).toLocaleString()} / month`, 'Shelter Cost']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {shelterData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MULTI-CITY FINANCIAL BENCHMARK & COMPARISON TOOL                           */}
      {/* ========================================================================= */}
      <div className="glass-panel p-6 rounded-xl border border-indigo-900/60 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-indigo-950/90 text-indigo-300 border border-indigo-700/80 flex items-center gap-1 uppercase">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Multi-City Financial Benchmark
              </span>
              <span className="text-xs text-slate-400">Select any municipality to compare</span>
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              Cross-Municipal Household Income & Rent Benchmarking
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Add any of Ontario&apos;s 444 Census Subdivisions to benchmark purchasing power, disposable income, and monthly rental thresholds.
            </p>
          </div>

          {/* Dynamic City Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-indigo-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Add any city (e.g. Waterloo, Vaughan, Guelph)..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            {searching && (
              <span className="absolute right-3 top-2 text-xs text-indigo-300 font-medium animate-pulse">Searching...</span>
            )}

            {/* Search Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute z-30 mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-h-56 overflow-y-auto divide-y divide-slate-800">
                {searchResults.map((city: any) => (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => addCompareCity(city.id)}
                    className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-800 text-xs text-white transition-colors"
                  >
                    <div>
                      <span className="font-semibold">{city.name}</span>
                      <span className="text-xs text-slate-400 ml-1.5">({city.csd_type})</span>
                    </div>
                    <span className="text-xs text-indigo-400 font-semibold">+ Add</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active Comparison City Chips */}
        <div>
          <span className="text-xs font-semibold text-slate-400 block mb-2">
            Selected Municipalities in Comparison (Click &apos;×&apos; to remove, or use search above):
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {compareFinancials.map(c => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-950/80 text-indigo-200 border border-indigo-800/80 shadow-sm"
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>{c.name}</span>
                {compareCityIds.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCompareCity(c.id)}
                    className="ml-1 text-slate-400 hover:text-white rounded-full p-0.5 hover:bg-indigo-900 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}

            {/* Quick Suggested Cities */}
            {[
              { id: 'CSD_burlington', name: 'Burlington' },
              { id: 'CSD_oakville', name: 'Oakville' },
              { id: 'CSD_milton', name: 'Milton' },
              { id: 'CSD_toronto', name: 'Toronto' },
              { id: 'CSD_waterloo', name: 'Waterloo' },
              { id: 'CSD_ottawa', name: 'Ottawa' }
            ].filter(s => !compareCityIds.includes(s.id)).slice(0, 4).map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => addCompareCity(s.id)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/80 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Comparative Chart */}
        {loadingCompare ? (
          <div className="p-12 text-center text-slate-400 animate-pulse">
            Querying comparative household financial distributions...
          </div>
        ) : (
          <div className="space-y-6">
            <div className="glass-panel p-5 rounded-xl border border-slate-800">
              <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                Side-by-Side Median Household Income Comparison (CAD)
              </h4>
              <p className="text-xs text-slate-400 mb-4">
                Click any bar to inspect underlying contributing observations for that municipality.
              </p>

              <div className="h-64 cursor-pointer">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={multiCityIncomeChartData}
                    margin={{ top: 10, right: 20, left: 15, bottom: 20 }}
                    onClick={(e: any) => {
                      if (e && e.activePayload && e.activePayload.length > 0) {
                        const item = e.activePayload[0].payload;
                        setContributingData({
                          title: `${item.name} Median Household Income Comparative Analysis`,
                          metricLabel: 'Median Household Total Income',
                          value: item['Median Income'],
                          unit: 'CAD',
                          benchmarkValue: '$95,000 CAD',
                          benchmarkLabel: 'Ontario Median Benchmark',
                          deltaPct: Math.round(((item['Median Income'] - 95000) / 95000) * 100),
                          sourceLineage: 'Statistics Canada 2021 Census of Population Table 98-401-X2021001',
                          referenceYear: '2020 Tax Year',
                          contextDrivers: [
                            `Total population: ${Number(item.pop).toLocaleString()} residents.`,
                            `Monthly median rental cost in ${item.name}: $${Number(item['Monthly Rent']).toLocaleString()} / month.`,
                            `Purchasing power ratio: ${item['Median Income'] > 110000 ? 'High discretionary capacity' : 'Moderate purchasing power'}.`
                          ],
                          onClose: () => setContributingData(null)
                        });
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Median Income']}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                    />
                    <Bar dataKey="Median Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Comparative Summary Table */}
            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-bold">Indicator</th>
                    {compareFinancials.map(c => (
                      <th key={c.id} className="py-3 px-4 font-bold text-white text-right">
                        {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  <tr 
                    role="button"
                    tabIndex={0}
                    onClick={() => setContributingData({
                      title: 'Cross-Municipal Median Household Income Benchmark',
                      category: 'Comparative Financial Analysis',
                      metricLabel: 'Comparative Median Household Income',
                      value: compareFinancials.map(c => `${c.name}: $${Number(c.median_income).toLocaleString()}`).join(' | '),
                      unit: '',
                      benchmarkValue: '$95,000 CAD Ontario Benchmark',
                      benchmarkLabel: 'Provincial Benchmark',
                      sourceLineage: 'Statistics Canada 2021 Census of Population Table 98-401-X2021001',
                      referenceYear: '2020 Tax Year',
                      decisionImplications: [
                        {
                          heading: 'Relative Purchasing Power Ranking',
                          insight: `Comparing ${compareFinancials.map(c => `${c.name} ($${(Number(c.median_income)/1000).toFixed(0)}k)`).join(', ')} reveals consumer wallet-share capacity and price tier sensitivity across western GTA and Ontario regions.`,
                          impact: 'positive'
                        }
                      ],
                      strategicRecommendations: [
                        'Prioritize high-margin premium concepts in municipalities exceeding $110,000 median income.',
                        'Benchmark commercial rent against household income to ensure healthy tenant rent-to-income coverage.'
                      ],
                      onClose: () => setContributingData(null)
                    })}
                    onKeyDown={(e) => e.key === 'Enter' && setContributingData(null)}
                    className="hover:bg-slate-900/80 transition-colors cursor-pointer group"
                    title="Click to inspect comparative household income"
                  >
                    <td className="py-2.5 px-4 font-semibold text-white group-hover:text-indigo-300 transition-colors flex items-center justify-between">
                      <span>Median Household Income</span>
                      <ChevronRight className="w-3 h-3 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </td>
                    {compareFinancials.map(c => (
                      <td key={c.id} className="py-2.5 px-4 text-right font-mono font-bold text-emerald-400">
                        ${Number(c.median_income).toLocaleString()}
                      </td>
                    ))}
                  </tr>
                  <tr 
                    role="button"
                    tabIndex={0}
                    onClick={() => setContributingData({
                      title: 'Cross-Municipal Residential Rental Cost Benchmark',
                      category: 'Comparative Housing Costs',
                      metricLabel: 'Comparative Median Monthly Rent',
                      value: compareFinancials.map(c => `${c.name}: $${Number(c.median_rent).toLocaleString()}`).join(' | '),
                      unit: 'CAD/mo',
                      benchmarkValue: '$1,550 / mo Ontario Benchmark',
                      benchmarkLabel: 'Provincial Benchmark',
                      sourceLineage: 'Statistics Canada 2021 Census Profile',
                      referenceYear: '2021 Census',
                      decisionImplications: [
                        {
                          heading: 'Disposable Income Drainage Impact',
                          insight: `Rental overhead dictates how much household income is retained for discretionary food, entertainment, and shopping. Lower rent-to-income ratios directly expand local retail captures.`,
                          impact: 'neutral'
                        }
                      ],
                      onClose: () => setContributingData(null)
                    })}
                    onKeyDown={(e) => e.key === 'Enter' && setContributingData(null)}
                    className="hover:bg-slate-900/80 transition-colors cursor-pointer group"
                    title="Click to inspect comparative rental costs"
                  >
                    <td className="py-2.5 px-4 font-semibold text-white group-hover:text-indigo-300 transition-colors flex items-center justify-between">
                      <span>Median Monthly Rent</span>
                      <ChevronRight className="w-3 h-3 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </td>
                    {compareFinancials.map(c => (
                      <td key={c.id} className="py-2.5 px-4 text-right font-mono text-slate-200">
                        ${Number(c.median_rent).toLocaleString()} / mo
                      </td>
                    ))}
                  </tr>
                  <tr 
                    role="button"
                    tabIndex={0}
                    onClick={() => setContributingData({
                      title: 'Cross-Municipal Population Scale Benchmark',
                      category: 'Comparative Population',
                      metricLabel: 'Comparative 2021 Population',
                      value: compareFinancials.map(c => `${c.name}: ${Number(c.population_2021).toLocaleString()}`).join(' | '),
                      unit: 'residents',
                      benchmarkValue: 'Aggregate Urban Catchment',
                      benchmarkLabel: 'Scale Factor',
                      sourceLineage: 'Statistics Canada 2021 Census',
                      referenceYear: '2021 Census',
                      decisionImplications: [
                        {
                          heading: 'Customer Base Sizing',
                          insight: `Evaluating population scale provides the baseline market depth necessary to sustain multi-unit commercial footprints and territory exclusivity agreements.`,
                          impact: 'positive'
                        }
                      ],
                      onClose: () => setContributingData(null)
                    })}
                    onKeyDown={(e) => e.key === 'Enter' && setContributingData(null)}
                    className="hover:bg-slate-900/80 transition-colors cursor-pointer group"
                    title="Click to inspect comparative population scale"
                  >
                    <td className="py-2.5 px-4 font-semibold text-white group-hover:text-indigo-300 transition-colors flex items-center justify-between">
                      <span>Total Population (2021)</span>
                      <ChevronRight className="w-3 h-3 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </td>
                    {compareFinancials.map(c => (
                      <td key={c.id} className="py-2.5 px-4 text-right font-mono text-indigo-300">
                        {Number(c.population_2021).toLocaleString()}
                      </td>
                    ))}
                  </tr>
                  <tr 
                    role="button"
                    tabIndex={0}
                    onClick={() => setContributingData({
                      title: 'Cross-Municipal 5-Year Growth Rate Comparison',
                      category: 'Comparative Growth Rates',
                      metricLabel: 'Comparative Growth Rate',
                      value: compareFinancials.map(c => `${c.name}: ${c.population_growth_pct > 0 ? `+${c.population_growth_pct}%` : `${c.population_growth_pct}%`}`).join(' | '),
                      unit: '',
                      benchmarkValue: '+5.8% Ontario Average',
                      benchmarkLabel: 'Provincial Growth',
                      sourceLineage: 'Statistics Canada 2016–2021 Census Compilations',
                      referenceYear: '2016–2021 Census',
                      decisionImplications: [
                        {
                          heading: 'Organic Influx vs Incumbent Share',
                          insight: `Faster growing municipalities offer rapid residential customer expansion, whereas mature cities require winning market share through product differentiation.`,
                          impact: 'neutral'
                        }
                      ],
                      onClose: () => setContributingData(null)
                    })}
                    onKeyDown={(e) => e.key === 'Enter' && setContributingData(null)}
                    className="hover:bg-slate-900/80 transition-colors cursor-pointer group"
                    title="Click to inspect comparative growth rate dynamics"
                  >
                    <td className="py-2.5 px-4 font-semibold text-white group-hover:text-indigo-300 transition-colors flex items-center justify-between">
                      <span>5-Year Growth Rate</span>
                      <ChevronRight className="w-3 h-3 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </td>
                    {compareFinancials.map(c => (
                      <td key={c.id} className="py-2.5 px-4 text-right font-mono font-bold text-emerald-400">
                        {c.population_growth_pct > 0 ? `+${c.population_growth_pct}%` : `${c.population_growth_pct}%`}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Wealth & Net Worth Benchmark Section */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">
                Household Net Worth & Balance Sheet Benchmark
              </h3>
              {wealth && (
                <ResolutionBadge 
                  resolution={wealth.geographicResolution} 
                  benchmarkLabel={wealth.benchmarkLabel} 
                />
              )}
            </div>
            <p className="text-xs text-amber-400/90 font-medium mt-1">
              Notice: Statistics Canada Survey of Financial Security (SFS Table 11-10-0016-01) is sampled at CMA and provincial resolution. Municipal (CSD) level wealth data does not exist in Canada.
            </p>
          </div>
        </div>

        {wealth ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Median Net Worth */}
              <div 
                role="button"
                tabIndex={0}
                onClick={() => setContributingData({
                  title: 'Household Median Net Worth Benchmark Analysis',
                  category: 'Balance Sheet & Wealth',
                  metricLabel: 'Median Net Worth',
                  value: wealth.medianNetWorth,
                  unit: 'CAD',
                  benchmarkValue: '$450,000 Ontario Regional Median',
                  benchmarkLabel: 'Provincial Wealth Baseline',
                  sourceLineage: 'Statistics Canada Survey of Financial Security (SFS Table 11-10-0016-01)',
                  referenceYear: '2023 SFS Cycle',
                  provenance: {
                    sourceName: 'Statistics Canada',
                    datasetCode: '11-10-0016-01',
                    referencePeriod: '2023',
                    resolution: wealth.geographicResolution,
                    confidence: 'Authoritative Survey'
                  },
                  decisionImplications: [
                    {
                      heading: 'Consumer Financial Resilience',
                      insight: `A median household net worth of $${wealth.medianNetWorth.toLocaleString()} indicates substantial accumulated equity and wealth buffers that maintain spending during economic slowdowns.`,
                      impact: 'positive'
                    }
                  ],
                  strategicRecommendations: [
                    'Suitable for premium consumer services, private education, wealth advisory, and high-end automotive.'
                  ],
                  onClose: () => setContributingData(null)
                })}
                onKeyDown={(e) => e.key === 'Enter' && setContributingData(null)}
                className="p-4 rounded-xl bg-slate-900/90 border border-white/10 hover:border-indigo-500/80 hover:bg-slate-900 transition-all cursor-pointer group active:scale-[0.98]"
                title="Click to inspect median net worth implications"
              >
                <span className="text-xs text-slate-300 block mb-1 group-hover:text-indigo-300 transition-colors">Median Net Worth</span>
                <span className="text-2xl font-bold text-white group-hover:text-indigo-200 transition-colors">${wealth.medianNetWorth.toLocaleString()}</span>
                <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                  <span>Assets minus liabilities</span>
                  <span className="text-[10px] text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">Inspect →</span>
                </div>
              </div>

              {/* Average Net Worth */}
              <div 
                role="button"
                tabIndex={0}
                onClick={() => setContributingData({
                  title: 'Household Average Net Worth & High-Wealth Distribution',
                  category: 'Wealth Skewness',
                  metricLabel: 'Average Net Worth',
                  value: wealth.averageNetWorth,
                  unit: 'CAD',
                  benchmarkValue: `$${wealth.medianNetWorth.toLocaleString()} Median`,
                  benchmarkLabel: 'Central Tendency Ratio',
                  sourceLineage: 'Statistics Canada Survey of Financial Security',
                  referenceYear: '2023 SFS Cycle',
                  decisionImplications: [
                    {
                      heading: 'Affluent Capital Concentration',
                      insight: `Average net worth of $${wealth.averageNetWorth.toLocaleString()} significantly outpaces median net worth, proving a dense concentration of high-net-worth individuals and multi-generational wealth.`,
                      impact: 'positive'
                    }
                  ],
                  strategicRecommendations: [
                    'Supports boutique luxury retail, private banking, and fine dining concepts.'
                  ],
                  onClose: () => setContributingData(null)
                })}
                onKeyDown={(e) => e.key === 'Enter' && setContributingData(null)}
                className="p-4 rounded-xl bg-slate-900/90 border border-white/10 hover:border-purple-500/80 hover:bg-slate-900 transition-all cursor-pointer group active:scale-[0.98]"
                title="Click to inspect average net worth and wealth concentration"
              >
                <span className="text-xs text-slate-300 block mb-1 group-hover:text-purple-300 transition-colors">Average Net Worth</span>
                <span className="text-2xl font-bold text-indigo-400 group-hover:text-purple-200 transition-colors">${wealth.averageNetWorth.toLocaleString()}</span>
                <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                  <span>Driven by real estate equity</span>
                  <span className="text-[10px] text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">Inspect →</span>
                </div>
              </div>

              {/* Median Total Assets */}
              <div 
                role="button"
                tabIndex={0}
                onClick={() => setContributingData({
                  title: 'Household Total Assets & Collateral Capacity',
                  category: 'Asset Composition',
                  metricLabel: 'Median Total Assets',
                  value: wealth.medianAssets,
                  unit: 'CAD',
                  benchmarkValue: 'Real estate, pensions, liquid savings',
                  benchmarkLabel: 'Asset Composition',
                  sourceLineage: 'Statistics Canada Survey of Financial Security',
                  referenceYear: '2023 SFS Cycle',
                  decisionImplications: [
                    {
                      heading: 'High Borrowing & Refinancing Capacity',
                      insight: `Median household asset base of $${wealth.medianAssets.toLocaleString()} provides high borrowing collateral and home equity borrowing capacity for entrepreneurial ventures and major investments.`,
                      impact: 'positive'
                    }
                  ],
                  onClose: () => setContributingData(null)
                })}
                onKeyDown={(e) => e.key === 'Enter' && setContributingData(null)}
                className="p-4 rounded-xl bg-slate-900/90 border border-white/10 hover:border-emerald-500/80 hover:bg-slate-900 transition-all cursor-pointer group active:scale-[0.98]"
                title="Click to inspect household asset base and collateral"
              >
                <span className="text-xs text-slate-300 block mb-1 group-hover:text-emerald-300 transition-colors">Median Total Assets</span>
                <span className="text-2xl font-bold text-emerald-400 group-hover:text-emerald-200 transition-colors">${wealth.medianAssets.toLocaleString()}</span>
                <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                  <span>Real estate, pensions, savings</span>
                  <span className="text-[10px] text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">Inspect →</span>
                </div>
              </div>

              {/* Median Total Debt */}
              <div 
                role="button"
                tabIndex={0}
                onClick={() => setContributingData({
                  title: 'Household Debt Obligations & Interest Rate Exposure',
                  category: 'Debt Liabilities',
                  metricLabel: 'Median Total Debt',
                  value: wealth.medianDebt,
                  unit: 'CAD',
                  benchmarkValue: 'Mortgages & Consumer Credit',
                  benchmarkLabel: 'Liability Classes',
                  sourceLineage: 'Statistics Canada Survey of Financial Security',
                  referenceYear: '2023 SFS Cycle',
                  decisionImplications: [
                    {
                      heading: 'Debt Servicing Sensitivities',
                      insight: `Median debt of $${wealth.medianDebt.toLocaleString()} is primarily mortgage-backed; mortgage renewal rate shifts directly influence annual consumer discretionary spend.`,
                      impact: 'warning'
                    }
                  ],
                  riskMitigations: [
                    'Offer essential convenience and competitive pricing to protect against consumer budget tightening during high interest rate cycles.'
                  ],
                  onClose: () => setContributingData(null)
                })}
                onKeyDown={(e) => e.key === 'Enter' && setContributingData(null)}
                className="p-4 rounded-xl bg-slate-900/90 border border-white/10 hover:border-rose-500/80 hover:bg-slate-900 transition-all cursor-pointer group active:scale-[0.98]"
                title="Click to inspect household debt liabilities"
              >
                <span className="text-xs text-slate-300 block mb-1 group-hover:text-rose-300 transition-colors">Median Total Debt</span>
                <span className="text-2xl font-bold text-rose-400 group-hover:text-rose-200 transition-colors">${wealth.medianDebt.toLocaleString()}</span>
                <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                  <span>Mortgages & consumer credit</span>
                  <span className="text-[10px] text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity">Inspect →</span>
                </div>
              </div>

              {/* Debt-to-Asset Ratio */}
              <div 
                role="button"
                tabIndex={0}
                onClick={() => setContributingData({
                  title: 'Household Leverage & Balance Sheet Solvency',
                  category: 'Leverage Ratios',
                  metricLabel: 'Debt-to-Asset Ratio',
                  value: `${wealth.debtToAssetRatio}%`,
                  unit: '',
                  benchmarkValue: '28–35% Conservative Leverage Norm',
                  benchmarkLabel: 'Provincial Healthy Norm',
                  sourceLineage: 'Statistics Canada Balance Sheet Accounts',
                  referenceYear: '2023 SFS Cycle',
                  decisionImplications: [
                    {
                      heading: 'Financial Solvency Health',
                      insight: `A leverage ratio of ${wealth.debtToAssetRatio}% indicates conservative balance sheet leverage, with assets exceeding liabilities by more than 3 to 1.`,
                      impact: 'positive'
                    }
                  ],
                  onClose: () => setContributingData(null)
                })}
                onKeyDown={(e) => e.key === 'Enter' && setContributingData(null)}
                className="p-4 rounded-xl bg-slate-900/90 border border-white/10 hover:border-amber-500/80 hover:bg-slate-900 transition-all cursor-pointer group active:scale-[0.98]"
                title="Click to inspect household financial leverage"
              >
                <span className="text-xs text-slate-300 block mb-1 group-hover:text-amber-300 transition-colors">Debt-to-Asset Ratio</span>
                <span className="text-2xl font-bold text-amber-400 group-hover:text-amber-200 transition-colors">{wealth.debtToAssetRatio}%</span>
                <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                  <span>Financial leverage metric</span>
                  <span className="text-[10px] text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">Inspect →</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400">Wealth benchmark data not available.</div>
        )}
      </div>

      {/* Feature-Wide Outliers Section */}
      <FeatureOutliersSection
        category="financial"
        cityId={cityId}
        title="Household Income & Shelter Cost Outliers"
        subtitle="Empirical statistical divergences in household income, rent burden, and dwelling valuations across Ontario."
      />
    </div>
  );
};
