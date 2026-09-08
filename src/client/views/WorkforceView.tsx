import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  TrendingUp, 
  Search, 
  Layers, 
  Building, 
  DollarSign, 
  CheckCircle2,
  GraduationCap
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { ResolutionBadge } from '../components/ResolutionBadge.js';
import { ExportButton } from '../components/ExportButton.js';
import { MetricTooltip } from '../components/MetricTooltip.js';
import { ContributingDataInspector, ContributingDataProps } from '../components/ContributingDataInspector.js';
import { FeatureOutliersSection } from '../components/FeatureOutliersSection.js';

interface WorkforceViewProps {
  cityId: string;
}

export const WorkforceView: React.FC<WorkforceViewProps> = ({ cityId }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'occupations' | 'industries'>('occupations');
  const [searchQuery, setSearchQuery] = useState('');
  const [contributingData, setContributingData] = useState<ContributingDataProps | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/geographies/${cityId}/workforce`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching workforce data:', err);
        setLoading(false);
      });
  }, [cityId]);

  if (loading || !data) {
    return (
      <div className="p-12 text-center text-slate-400 animate-pulse">
        Loading municipal workforce and employment data...
      </div>
    );
  }

  const occupations = data.topOccupations || [];
  const industries = data.topIndustries || [];
  const partRate = data.participationRate || 66.8;
  const unempRate = data.unemploymentRate || 6.6;

  const filteredOccupations = occupations.filter((o: any) =>
    o.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredIndustries = industries.filter((i: any) =>
    i.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const topOccChartData = occupations.slice(0, 8).map((o: any) => ({
    name: o.label.length > 28 ? o.label.substring(0, 26) + '...' : o.label,
    count: Number(o.employed_count),
    share: Number(o.percentage_of_workforce)
  }));

  const exportData = activeSubTab === 'occupations' 
    ? occupations.map((o: any) => ({
        'NOC Code': o.code,
        'Occupation Title': o.label,
        'Employed Count': o.employed_count,
        'Workforce Share (%)': `${o.percentage_of_workforce}%`,
        'Median Employment Income': o.median_employment_income ? `$${Number(o.median_employment_income).toLocaleString()}` : 'N/A'
      }))
    : industries.map((i: any) => ({
        'NAICS Code': i.code,
        'Industry Sector': i.label,
        'Employed Count': i.employed_count,
        'Workforce Share (%)': `${i.percentage_of_workforce}%`
      }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/60">
              Section 7: Labor & Industry Intelligence
            </span>
            <ResolutionBadge resolution="CSD" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Workforce Composition, Occupations & Industry Sectors
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Empirical labor market distributions from Statistics Canada 2021 Census of Population. Dynamically categorizes dominant employment pools, wage structures, and commercial talent availability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExportButton 
            data={exportData} 
            filename={`${cityId}_workforce_${activeSubTab}`} 
            label={`Export ${activeSubTab === 'occupations' ? 'Occupations' : 'Industries'}`} 
          />
        </div>
      </div>

      {/* Labor Market Health KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Participation Rate</span>
            <Briefcase className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {partRate}%
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Share of working-age population actively working or seeking work
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Unemployment Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {unempRate}%
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Census reference week unemployment rate
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Active Labor Pool</span>
            <Building className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {occupations.reduce((acc: number, o: any) => acc + Number(o.employed_count || 0), 0).toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Employed residents captured in detailed occupational categories
          </div>
        </div>
      </div>

      {/* Contributing Data Inspector */}
      {contributingData && (
        <ContributingDataInspector {...contributingData} />
      )}

      {/* Top Occupations Chart */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-400" />
              Leading Occupational Employment Categories
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Statistics Canada NOC 2021. Click any bar to inspect contributing workforce data.
            </p>
          </div>
          <ResolutionBadge resolution="CSD" />
        </div>

        <div className="h-72 cursor-pointer">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={topOccChartData} 
              layout="vertical" 
              margin={{ top: 5, right: 30, left: 180, bottom: 5 }}
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload.length > 0) {
                  const item = e.activePayload[0].payload;
                  setContributingData({
                    title: `${item.name} Employment Distribution`,
                    metricLabel: 'Employed Residents in Occupation',
                    value: item.count,
                    unit: 'workers',
                    percentageOfTotal: item.share,
                    benchmarkValue: '66.8% Participation Rate',
                    benchmarkLabel: 'Labor Participation Baseline',
                    deltaPct: Math.round(((partRate - 65) / 65) * 100),
                    sourceLineage: 'Statistics Canada 2021 Census NOC Occupational Profiles',
                    referenceYear: '2021 Census',
                    contextDrivers: [
                      `Represents ${item.share}% of all employed residents in this municipality.`,
                      `Municipal labor force participation rate: ${partRate}%.`,
                      `Local unemployment rate stands at ${unempRate}%.`
                    ],
                    onClose: () => setContributingData(null)
                  });
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" tickFormatter={(v) => v.toLocaleString()} />
              <YAxis dataKey="name" type="category" stroke="#94a3b8" width={175} tick={{ fontSize: 11 }} />
              <Tooltip 
                formatter={(val: any, name: any, item: any) => [`${Number(val).toLocaleString()} employed (${item.payload.share}%)`, 'Workers']}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]}>
                {topOccChartData.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#818cf8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Subtabs: NOC Occupations vs NAICS Industries */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-lg border border-slate-700">
            <button
              type="button"
              onClick={() => { setActiveSubTab('occupations'); setSearchQuery(''); }}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeSubTab === 'occupations'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Top 20 NOC Occupations ({occupations.length})
            </button>
            <button
              type="button"
              onClick={() => { setActiveSubTab('industries'); setSearchQuery(''); }}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeSubTab === 'industries'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Top 20 NAICS Industries ({industries.length})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Filter ${activeSubTab}...`}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {activeSubTab === 'occupations' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">NOC Code</th>
                  <th className="py-3 px-4">Occupation Title</th>
                  <th className="py-3 px-4 text-right">Employed Persons</th>
                  <th className="py-3 px-4 text-right">% of Workforce</th>
                  <th className="py-3 px-4 text-right">Median Employment Income</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {filteredOccupations.map((o: any) => (
                  <tr key={o.code} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-indigo-400 font-semibold">{o.code}</td>
                    <td className="py-3 px-4 font-medium text-white">{o.label}</td>
                    <td className="py-3 px-4 text-right font-semibold text-white">{Number(o.employed_count).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">{o.percentage_of_workforce}%</td>
                    <td className="py-3 px-4 text-right font-medium text-emerald-400">
                      {o.median_employment_income ? `$${Number(o.median_employment_income).toLocaleString()}` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">NAICS Code</th>
                  <th className="py-3 px-4">Industry Sector Title</th>
                  <th className="py-3 px-4 text-right">Employed Persons</th>
                  <th className="py-3 px-4 text-right">% of Workforce</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {filteredIndustries.map((i: any) => (
                  <tr key={i.code} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-indigo-400 font-semibold">{i.code}</td>
                    <td className="py-3 px-4 font-medium text-white">{i.label}</td>
                    <td className="py-3 px-4 text-right font-semibold text-white">{Number(i.employed_count).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">{i.percentage_of_workforce}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Feature-Wide Outliers Section */}
      <FeatureOutliersSection
        category="workforce"
        cityId={cityId}
        title="Labor Force & Occupational Outliers"
        subtitle="Empirical statistical divergences in unemployment rate, labor participation, and occupational concentration across Ontario."
      />
    </div>
  );
};
