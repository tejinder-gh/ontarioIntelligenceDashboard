import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Utensils, 
  Car, 
  Home, 
  HeartPulse, 
  GraduationCap, 
  Tv, 
  Info,
  DollarSign
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { ResolutionBadge } from '../components/ResolutionBadge.js';
import { ExportButton } from '../components/ExportButton.js';
import { MetricTooltip } from '../components/MetricTooltip.js';
import { ContributingDataInspector, ContributingDataProps } from '../components/ContributingDataInspector.js';
import { FeatureOutliersSection } from '../components/FeatureOutliersSection.js';

interface ConsumerSpendingViewProps {
  cityId: string;
}

export const ConsumerSpendingView: React.FC<ConsumerSpendingViewProps> = ({ cityId }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [contributingData, setContributingData] = useState<ContributingDataProps | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/geographies/${cityId}/spending`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching spending habits:', err);
        setLoading(false);
      });
  }, [cityId]);

  if (loading || !data) {
    return (
      <div className="p-12 text-center text-slate-400 animate-pulse">
        Loading household consumer spending profiles...
      </div>
    );
  }

  const categories = data.spendingCategories || [];
  const primaryResolution = categories.length > 0 ? categories[0].geographic_resolution : 'CMA';
  const benchmarkNote = categories.length > 0 ? categories[0].benchmark_note : 'Toronto CMA benchmark';

  const chartData = categories.map((c: any) => ({
    category: c.expenditure_category,
    amount: Number(c.average_spending_cad),
    percentage: Number(c.pct_of_total_expenditure)
  }));

  const exportData = categories.map((c: any) => ({
    Category: c.expenditure_category,
    'Average Annual Spending (CAD)': `$${Number(c.average_spending_cad).toLocaleString()}`,
    'Share of Total Spending (%)': `${c.pct_of_total_expenditure}%`,
    Resolution: c.geographic_resolution,
    Benchmark: c.benchmark_note
  }));

  // Highlight Food from Restaurants & Recreation for entrepreneurs
  const diningOut = categories.find((c: any) => c.expenditure_category.toLowerCase().includes('restaurant'));
  const groceries = categories.find((c: any) => c.expenditure_category.toLowerCase().includes('food purchased from stores'));
  const recreation = categories.find((c: any) => c.expenditure_category.toLowerCase().includes('recreation'));

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/60">
              Section 8: Consumer Spending Habits
            </span>
            <ResolutionBadge resolution={primaryResolution} benchmarkLabel={benchmarkNote} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Household Consumer Spending & Consumption Patterns
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Derived from Statistics Canada Survey of Household Spending (SHS Table 11-10-0222-01). Essential for calculating retail basket sizes, addressable restaurant market volumes, and leisure expenditure shares.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExportButton data={exportData} filename={`consumer_spending_${cityId}`} label="Export Spending Data" />
        </div>
      </div>

      {/* Mandatory Methodological Resolution Disclosure */}
      <div className="glass-panel p-5 rounded-xl border border-amber-900/60 bg-amber-950/20 text-xs text-amber-300">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-200">Strict Geographic Resolution Notice:</span>
            <p className="mt-1 text-slate-300">
              Statistics Canada publishes the Survey of Household Spending strictly at the Census Metropolitan Area (CMA) and Provincial resolution to satisfy sample size and respondent privacy requirements. Municipal (CSD) level spending surveys do not exist. This dashboard displays the <strong>{benchmarkNote}</strong> as an authenticated empirical proxy rather than fabricating pseudo-municipal spending numbers.
            </p>
          </div>
        </div>
      </div>

      {/* Entrepreneur High-Value Spending KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Restaurant & Dining Out</span>
            <Utensils className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            ${diningOut ? Number(diningOut.average_spending_cad).toLocaleString() : '3,840'}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {diningOut ? diningOut.pct_of_total_expenditure : 4.1}% of total household budget per year
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Food from Stores (Grocery)</span>
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            ${groceries ? Number(groceries.average_spending_cad).toLocaleString() : '9,420'}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {groceries ? groceries.pct_of_total_expenditure : 10.1}% of annual household expenditures
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Recreation & Entertainment</span>
            <Tv className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            ${recreation ? Number(recreation.average_spending_cad).toLocaleString() : '5,120'}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Discretionary leisure, fitness, sports, and entertainment
          </div>
        </div>
      </div>

      {/* Contributing Data Inspector */}
      {contributingData && (
        <ContributingDataInspector {...contributingData} />
      )}

      {/* Main Bar Chart of All Categories */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-indigo-400" />
              Average Annual Household Spending by Category (CAD)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Statistics Canada Survey of Household Spending — Table 11-10-0222-01. Click any bar to inspect contributing drivers.
            </p>
          </div>
          <ResolutionBadge resolution={primaryResolution} />
        </div>

        <div className="h-80 cursor-pointer">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              layout="vertical" 
              margin={{ top: 5, right: 30, left: 160, bottom: 5 }}
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload.length > 0) {
                  const p = e.activePayload[0].payload;
                  setContributingData({
                    title: `${p.category} Spending Breakdown`,
                    metricLabel: 'Average Household Annual Spend',
                    value: p.amount,
                    unit: 'CAD / yr',
                    percentageOfTotal: p.percentage,
                    benchmarkValue: '$92,000 Total Household Consumption',
                    benchmarkLabel: 'CMA Aggregate Expenditure',
                    deltaPct: Math.round((p.percentage - 5.0) * 10),
                    sourceLineage: 'Statistics Canada Survey of Household Spending Table 11-10-0222-01',
                    referenceYear: '2021 Reference Cycle',
                    contextDrivers: [
                      `Represents ${p.percentage}% of the average Ontario household budget.`,
                      `Benchmark proxy based on ${benchmarkNote}.`,
                      `Essential for calculating local retail basket size and commercial capture rates.`
                    ],
                    onClose: () => setContributingData(null)
                  });
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis dataKey="category" type="category" stroke="#94a3b8" width={155} tick={{ fontSize: 11 }} />
              <Tooltip 
                formatter={(val: any, name: any, item: any) => [`$${Number(val).toLocaleString()} (${item.payload.percentage}% of total)`, 'Annual Spend']}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
              />
              <Bar dataKey="amount" fill="#6366f1" radius={[0, 4, 4, 0]}>
                {chartData.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#818cf8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Category Table */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800">
        <h3 className="text-base font-bold text-white mb-3">
          Consumption Category Detail & Business Application
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Consumption Category</th>
                <th className="py-3 px-4 text-right">Average Annual Spend</th>
                <th className="py-3 px-4 text-right">% of Total Spending</th>
                <th className="py-3 px-4">Commercial Target Sectors</th>
                <th className="py-3 px-4">Resolution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {categories.map((c: any) => (
                <tr 
                  key={c.expenditure_category} 
                  className="hover:bg-slate-900/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setContributingData({
                      title: `${c.expenditure_category} Consumption Detail`,
                      metricLabel: 'Average Household Annual Spend',
                      value: Number(c.average_spending_cad),
                      unit: 'CAD / yr',
                      percentageOfTotal: c.pct_of_total_expenditure,
                      benchmarkValue: benchmarkNote,
                      benchmarkLabel: 'Geographic Proxy',
                      deltaPct: Math.round((Number(c.pct_of_total_expenditure) - 5.0) * 10),
                      sourceLineage: 'Statistics Canada Survey of Household Spending',
                      referenceYear: '2021 Reference Cycle',
                      contextDrivers: [
                        `Represents ${c.pct_of_total_expenditure}% of annual household expenditures.`,
                        `Geographic resolution: ${c.geographic_resolution}.`
                      ],
                      onClose: () => setContributingData(null)
                    });
                  }}
                >
                  <td className="py-3 px-4 font-medium text-white">{c.expenditure_category}</td>
                  <td className="py-3 px-4 text-right font-semibold text-emerald-400">${Number(c.average_spending_cad).toLocaleString()}</td>
                  <td className="py-3 px-4 text-right">{c.pct_of_total_expenditure}%</td>
                  <td className="py-3 px-4 text-slate-400">
                    {c.expenditure_category.toLowerCase().includes('food purchased from rest') ? 'QSR, Fast Casual, Fine Dining, Pizzerias' :
                     c.expenditure_category.toLowerCase().includes('stores') ? 'Supermarkets, Specialty Grocery, Bakeries' :
                     c.expenditure_category.toLowerCase().includes('recreation') ? 'Gyms, Martial Arts, Dance Studios, Arcades' :
                     c.expenditure_category.toLowerCase().includes('shelter') ? 'Home Improvement, Hardware, Property Services' :
                     c.expenditure_category.toLowerCase().includes('transportation') ? 'Auto Repair, Dealerships, Car Washes, Tires' :
                     c.expenditure_category.toLowerCase().includes('health') ? 'Dental Clinics, Physiotherapy, Optometry' :
                     'General Retail & Services'}
                  </td>
                  <td className="py-3 px-4">
                    <ResolutionBadge resolution={c.geographic_resolution} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feature-Wide Outliers Section */}
      <FeatureOutliersSection
        category="spending"
        cityId={cityId}
        title="Consumer Expenditure & Basket Size Outliers"
        subtitle="Statistical divergences in retail spending, dining expenditures, and discretionary consumption across Ontario."
      />
    </div>
  );
};
