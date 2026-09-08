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
  Scale
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { ResolutionBadge } from '../components/ResolutionBadge.js';
import { ExportButton } from '../components/ExportButton.js';
import { MetricTooltip } from '../components/MetricTooltip.js';

interface FinancialProfileViewProps {
  cityId: string;
}

export const FinancialProfileView: React.FC<FinancialProfileViewProps> = ({ cityId }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    { name: 'Median Before-Tax', value: inc.median || 0, fill: '#6366f1' },
    { name: 'Average Before-Tax', value: inc.average || 0, fill: '#8b5cf6' },
    { name: 'Median After-Tax', value: inc.medianAfterTax || 0, fill: '#10b981' }
  ];

  const shelterData = [
    { name: 'Tenant Rent / mo', value: shelter.medianTenantRent || 0, fill: '#3b82f6' },
    { name: 'Owner Shelter / mo', value: shelter.medianOwnerCost || 0, fill: '#06b6d4' }
  ];

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
            <span className="text-xs font-medium uppercase tracking-wider">Average Dwelling Value</span>
            <Home className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            ${(shelter.averageDwellingValue || 0).toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Expected market value of owner-occupied homes
          </div>
        </div>
      </div>

      {/* Skewness Analysis Banner */}
      <div className="glass-panel p-5 rounded-xl border border-indigo-900/50 bg-indigo-950/20">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-white">
              Income Distribution Skewness Analysis: {inc.skewIndication}
            </h4>
            <p className="text-xs text-slate-300 mt-1">
              In this municipality, average household income exceeds median income by <strong>${(inc.difference || 0).toLocaleString()}</strong> (+{inc.percentageDifference}%). Because averages are sensitive to extreme high-earning households, this significant positive delta signals an affluent upper-tail that generates substantial discretionary spending for premium retail, private tutoring, and specialty dining establishments.
            </p>
          </div>
        </div>
      </div>

      {/* Income & Shelter Costs Visual Comparison */}
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
                Statistics Canada Census Profile Table 98-316-X2021001
              </p>
            </div>
            <ResolutionBadge resolution="CSD" />
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incomeComparisonData} margin={{ top: 10, right: 20, left: 15, bottom: 20 }}>
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
                Median gross rent vs. owner major payments (mortgage, property taxes, utilities)
              </p>
            </div>
            <ResolutionBadge resolution="CSD" />
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shelterData} margin={{ top: 10, right: 20, left: 15, bottom: 20 }}>
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

      {/* Wealth & Net Worth Benchmark Section (Strict Resolution Disclosure) */}
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
                <span className="text-2xl font-bold text-indigo-300">${wealth.averageNetWorth.toLocaleString()}</span>
                <span className="text-[11px] text-slate-500 block mt-1">Reflects top wealth tier</span>
              </div>

              <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Median Total Assets</span>
                <span className="text-2xl font-bold text-emerald-400">${wealth.medianAssets.toLocaleString()}</span>
                <span className="text-[11px] text-slate-500 block mt-1">Real estate & pensions</span>
              </div>

              <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Median Total Debt</span>
                <span className="text-2xl font-bold text-rose-400">${wealth.medianDebt.toLocaleString()}</span>
                <span className="text-[11px] text-slate-500 block mt-1">Mortgages & lines of credit</span>
              </div>

              <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Debt-to-Asset Ratio</span>
                <span className="text-2xl font-bold text-amber-300">{(wealth.debtToAssetRatio * 100).toFixed(1)}%</span>
                <span className="text-[11px] text-slate-500 block mt-1">Financial leverage</span>
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 text-xs text-slate-400 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Zero Synthetic Data Guarantee:</strong> Rather than manufacturing pseudo-municipal net worth numbers, this system transparently displays the official {wealth.geographicResolution === 'CMA' ? 'Toronto CMA' : 'Ontario Province'} benchmark ({wealth.benchmarkLabel}) so financial decisions are anchored in authentic, verified Statistics Canada empirical observations.
              </span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-400 p-4 bg-slate-900 rounded-lg">
            Wealth benchmark data not available for this geographic view.
          </div>
        )}
      </div>
    </div>
  );
};
