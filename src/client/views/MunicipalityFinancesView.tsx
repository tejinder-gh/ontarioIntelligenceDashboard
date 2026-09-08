import React, { useState, useEffect } from 'react';
import { 
  Landmark, 
  DollarSign, 
  TrendingUp, 
  FileSpreadsheet, 
  Shield, 
  Truck, 
  Trees, 
  Building,
  CheckCircle2
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { ResolutionBadge } from '../components/ResolutionBadge.js';
import { ExportButton } from '../components/ExportButton.js';
import { MetricTooltip } from '../components/MetricTooltip.js';

interface MunicipalityFinancesViewProps {
  cityId: string;
}

export const MunicipalityFinancesView: React.FC<MunicipalityFinancesViewProps> = ({ cityId }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/geographies/${cityId}/municipal-budget`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching municipal budget:', err);
        setLoading(false);
      });
  }, [cityId]);

  if (loading || !data) {
    return (
      <div className="p-12 text-center text-slate-400 animate-pulse">
        Loading Ontario FIR municipal financial statements...
      </div>
    );
  }

  const operating = data.operatingBudget || 0;
  const capital = data.capitalBudget || 0;
  const propertyTax = data.propertyTaxRevenue || 0;
  const departments = data.departmentalBreakdown || [];

  const chartData = departments.map((d: any) => ({
    name: d.account_category.length > 25 ? d.account_category.substring(0, 23) + '...' : d.account_category,
    fullName: d.account_category,
    amount: Number(d.amount_dollars),
    pct: Number(d.pct_of_total_budget),
    perCapita: Number(d.per_capita_dollars)
  }));

  const exportData = [
    { Metric: 'Total Operating Budget', Value: `$${operating.toLocaleString()}` },
    { Metric: 'Capital Budget', Value: `$${capital.toLocaleString()}` },
    { Metric: 'Property Taxation Revenue', Value: `$${propertyTax.toLocaleString()}` },
    ...departments.map((d: any) => ({
      Metric: `Dept: ${d.account_category}`,
      Value: `$${Number(d.amount_dollars).toLocaleString()} (${d.pct_of_total_budget}%, $${d.per_capita_dollars}/capita)`
    }))
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/60">
              Section 11: Municipal Fiscal Statements (Ontario FIR)
            </span>
            <ResolutionBadge resolution="CSD" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Municipal Budget, Revenue & Departmental Expenditures
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Sourced directly from official Ontario Financial Information Return (FIR) filings published by the Ministry of Municipal Affairs and Housing (MMAH). Tracks local infrastructure investment, tax burden, and municipal service capacity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExportButton data={exportData} filename={`${cityId}_municipal_finances`} label="Export FIR Data" />
        </div>
      </div>

      {/* Fiscal Overview KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Annual Operating Budget</span>
            <Landmark className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            ${(operating / 1000000).toFixed(1)}M
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Total annual operating expenditures (${operating.toLocaleString()})
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Capital Budget</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            ${(capital / 1000000).toFixed(1)}M
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Capital infrastructure & development projects (${capital.toLocaleString()})
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Property Taxation Revenue</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            ${(propertyTax / 1000000).toFixed(1)}M
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Municipal levy collected ({operating > 0 ? ((propertyTax / operating) * 100).toFixed(1) : 0}% of operating budget)
          </div>
        </div>
      </div>

      {/* Departmental Allocation Chart */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
              Operating Expenditures by Municipal Department
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Ontario Ministry of Municipal Affairs and Housing (Schedule 40)
            </p>
          </div>
          <ResolutionBadge resolution="CSD" />
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 170, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" tickFormatter={(v) => `$${(v / 1000000).toFixed(0)}M`} />
              <YAxis dataKey="name" type="category" stroke="#94a3b8" width={165} tick={{ fontSize: 11 }} />
              <Tooltip 
                formatter={(val: any, name: any, item: any) => [`$${(Number(val) / 1000000).toFixed(2)}M (${item.payload.pct}%, $${item.payload.perCapita}/capita)`, 'Expenditure']}
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

      {/* Departmental Detail Table */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800">
        <h3 className="text-base font-bold text-white mb-3">
          Departmental Expense Breakdown & Municipal Per-Capita Spending
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Municipal Service Category</th>
                <th className="py-3 px-4 text-right">Annual Expenditure</th>
                <th className="py-3 px-4 text-right">% of Budget</th>
                <th className="py-3 px-4 text-right">Per Capita Spending</th>
                <th className="py-3 px-4">Commercial Significance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {departments.map((d: any) => (
                <tr key={d.account_category} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3 px-4 font-medium text-white">{d.account_category}</td>
                  <td className="py-3 px-4 text-right font-semibold text-white">${Number(d.amount_dollars).toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-medium text-indigo-400">{d.pct_of_total_budget}%</td>
                  <td className="py-3 px-4 text-right font-medium text-emerald-400">${Number(d.per_capita_dollars).toLocaleString()} / resident</td>
                  <td className="py-3 px-4 text-slate-400">
                    {d.account_category.includes('Transportation') ? 'Directly impacts transit traffic, customer parking & arterial road flows' :
                     d.account_category.includes('Protection') ? 'Ensures public safety, fire code compliance & security for storefronts' :
                     d.account_category.includes('Environmental') ? 'Underpins utility rates, commercial water/waste capacity' :
                     d.account_category.includes('Recreation') ? 'Generates foot traffic near community arenas, pools and sports parks' :
                     d.account_category.includes('Planning') ? 'Dictates zoning approvals, permit turnaround times & commercial density' :
                     'Municipal governance and administrative support'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
