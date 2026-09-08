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
  Building2
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

      {/* Income KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Median Household Income</span>
            <MetricTooltip content="50% of households earn more, 50% earn less. Best measure of central tendency unaffected by extreme wealth." />
          </div>
          <div className="text-3xl font-extrabold text-white">
            ${(inc.median || 0).toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Before-tax total household income (2020 tax year)
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Average Household Income</span>
            <Scale className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            ${(inc.average || 0).toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-indigo-300 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
            <span>+${(inc.difference || 0).toLocaleString()} ({inc.percentageDifference}%) over median</span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Median After-Tax Income</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            ${(inc.medianAfterTax || 0).toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            True net disposable income after federal & provincial tax
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Median Monthly Rent</span>
            <Home className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            ${(shelter.medianTenantRent || 0).toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Owner major payment: ${(shelter.medianOwnerCost || 0).toLocaleString()} / mo
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
                      sourceLineage: 'Statistics Canada 2021 Census Profile (Table 98-316-X2021001)',
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
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800/80 flex items-center gap-1 uppercase">
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
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            {searching && (
              <span className="absolute right-3 top-2 text-[10px] text-slate-400 animate-pulse">Searching...</span>
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
                      <span className="text-[10px] text-slate-400 ml-1.5">({city.csd_type})</span>
                    </div>
                    <span className="text-[10px] text-indigo-400">+ Add</span>
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
                          sourceLineage: 'Statistics Canada 2021 Census of Population Table 98-316-X2021001',
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
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-white">Median Household Income</td>
                    {compareFinancials.map(c => (
                      <td key={c.id} className="py-2.5 px-4 text-right font-mono font-bold text-emerald-400">
                        ${Number(c.median_income).toLocaleString()}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-white">Median Monthly Rent</td>
                    {compareFinancials.map(c => (
                      <td key={c.id} className="py-2.5 px-4 text-right font-mono text-slate-200">
                        ${Number(c.median_rent).toLocaleString()} / mo
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-white">Total Population (2021)</td>
                    {compareFinancials.map(c => (
                      <td key={c.id} className="py-2.5 px-4 text-right font-mono text-indigo-300">
                        {Number(c.population_2021).toLocaleString()}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-white">5-Year Growth Rate</td>
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
              <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Median Net Worth</span>
                <span className="text-2xl font-bold text-white">${wealth.medianNetWorth.toLocaleString()}</span>
                <span className="text-[11px] text-slate-500 block mt-1">Assets minus liabilities</span>
              </div>
              <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Average Net Worth</span>
                <span className="text-2xl font-bold text-indigo-400">${wealth.averageNetWorth.toLocaleString()}</span>
                <span className="text-[11px] text-slate-500 block mt-1">Driven by equity & real estate</span>
              </div>
              <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Median Total Assets</span>
                <span className="text-2xl font-bold text-emerald-400">${wealth.medianAssets.toLocaleString()}</span>
                <span className="text-[11px] text-slate-500 block mt-1">Real estate, pensions, savings</span>
              </div>
              <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Median Total Debt</span>
                <span className="text-2xl font-bold text-rose-400">${wealth.medianDebt.toLocaleString()}</span>
                <span className="text-[11px] text-slate-500 block mt-1">Mortgages & consumer credit</span>
              </div>
              <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Debt-to-Asset Ratio</span>
                <span className="text-2xl font-bold text-amber-400">{wealth.debtToAssetRatio}%</span>
                <span className="text-[11px] text-slate-500 block mt-1">Financial leverage metric</span>
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
