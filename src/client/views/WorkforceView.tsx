import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  TrendingUp, 
  Search, 
  Layers, 
  Building, 
  DollarSign, 
  CheckCircle2,
  GraduationCap,
  ChevronRight
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
      <div className="glass-panel p-6 rounded-2xl border border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-4">
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
          <p className="text-xs text-slate-300 mt-1 max-w-3xl">
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

      {/* Labor Market Health KPIs (Clickable for Decision Drill-Down) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Participation Rate */}
        <div 
          role="button"
          tabIndex={0}
          onClick={() => setContributingData({
            title: `${cityId.replace('CSD_', '')} Labor Force Participation Rate Analysis`,
            category: 'Labor Market Engagement',
            metricLabel: 'Labor Participation Rate',
            value: `${partRate}%`,
            unit: '',
            benchmarkValue: '65.1% Ontario Benchmark',
            benchmarkLabel: 'Provincial Participation Rate',
            deltaPct: Math.round(((partRate - 65.1) / 65.1) * 100),
            sourceLineage: 'Statistics Canada 2021 Census of Population (Table 98-400-X)',
            referenceYear: '2021 Census Reference Period',
            decisionImplications: [
              {
                heading: 'Labor Engagement & Active Workforce',
                insight: `A participation rate of ${partRate}% indicates high economic engagement among working-age residents (ages 15+), confirming strong workforce attachment and steady regular employment income.`,
                impact: 'positive'
              },
              {
                heading: 'Hiring Reservoir Depth',
                insight: `High participation leaves a smaller pool of inactive workers, meaning new employers must attract staff away from existing local firms or recruit from neighboring census divisions.`,
                impact: 'neutral'
              }
            ],
            strategicRecommendations: [
              'Highlight flexible scheduling, professional development, and employee perks to attract passive talent.',
              'Leverage automated self-service technologies to reduce front-of-house headcount requirements.'
            ],
            onClose: () => setContributingData(null)
          })}
          onKeyDown={(e) => e.key === 'Enter' && setContributingData(null)}
          className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-indigo-500/80 hover:bg-slate-900 transition-all shadow-lg cursor-pointer group active:scale-[0.98]"
          title="Click to inspect labor participation rate implications"
        >
          <div className="flex items-center justify-between text-slate-300 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider group-hover:text-indigo-300 transition-colors">Participation Rate</span>
            <Briefcase className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-white group-hover:text-indigo-200 transition-colors">
            {partRate}%
          </div>
          <div className="mt-2 text-xs text-slate-300 flex items-center justify-between">
            <span>Share of working-age population</span>
            <span className="text-[10px] text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
              Inspect <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Unemployment Rate */}
        <div 
          role="button"
          tabIndex={0}
          onClick={() => setContributingData({
            title: `${cityId.replace('CSD_', '')} Unemployment & Hiring Tightness`,
            category: 'Recruiting & Wage Pressure',
            metricLabel: 'Unemployment Rate',
            value: `${unempRate}%`,
            unit: '',
            benchmarkValue: '6.8% Ontario Benchmark',
            benchmarkLabel: 'Provincial Unemployment Rate',
            deltaPct: Math.round(((unempRate - 6.8) / 6.8) * 100),
            sourceLineage: 'Statistics Canada 2021 Census Profile & Monthly LFS',
            referenceYear: '2021 Census Cycle',
            decisionImplications: [
              {
                heading: 'Wage Competition & Candidate Availability',
                insight: `An unemployment rate of ${unempRate}% reflects a tight labor market where applicants frequently have multiple competing offers. Starting hourly rates must match or exceed local prevailing norms.`,
                impact: 'warning'
              },
              {
                heading: 'Consumer Household Purchasing Cushion',
                insight: `Low municipal unemployment guarantees regular payroll paychecks and consistent retail spending power.`,
                impact: 'positive'
              }
            ],
            riskMitigations: [
              'Build strong relationships with local high schools, colleges, and university placement offices for seasonal staffing.',
              'Implement employee retention bonuses after 90 and 180 days of tenure.'
            ],
            onClose: () => setContributingData(null)
          })}
          onKeyDown={(e) => e.key === 'Enter' && setContributingData(null)}
          className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-emerald-500/80 hover:bg-slate-900 transition-all shadow-lg cursor-pointer group active:scale-[0.98]"
          title="Click to inspect hiring tightness and wage dynamics"
        >
          <div className="flex items-center justify-between text-slate-300 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider group-hover:text-emerald-300 transition-colors">Unemployment Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white group-hover:text-emerald-200 transition-colors">
            {unempRate}%
          </div>
          <div className="mt-2 text-xs text-slate-300 flex items-center justify-between">
            <span>Census reference week rate</span>
            <span className="text-[10px] text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
              Inspect <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Active Labor Pool */}
        <div 
          role="button"
          tabIndex={0}
          onClick={() => {
            const totalEmployed = occupations.reduce((acc: number, o: any) => acc + Number(o.employed_count || 0), 0);
            setContributingData({
              title: `${cityId.replace('CSD_', '')} Active Municipal Labor Pool`,
              category: 'Workforce Size & Talent Pool',
              metricLabel: 'Employed Resident Workforce',
              value: totalEmployed,
              unit: 'workers',
              benchmarkValue: `${occupations.length} Tracked NOC Occupations`,
              benchmarkLabel: 'Occupational Diversity',
              sourceLineage: 'Statistics Canada Census Workforce File',
              referenceYear: '2021 Census',
              decisionImplications: [
                {
                  heading: 'Talent Specialization Depth',
                  insight: `Over ${totalEmployed.toLocaleString()} employed residents operate across detailed managerial, technical, and service categories, providing comprehensive talent availability for commercial operations.`,
                  impact: 'positive'
                }
              ],
              strategicRecommendations: [
                'Review the Top 20 Occupations and Top 20 Industries below to determine daytime vs commuter workforce splits.'
              ],
              onClose: () => setContributingData(null)
            });
          }}
          onKeyDown={(e) => e.key === 'Enter' && setContributingData(null)}
          className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-blue-500/80 hover:bg-slate-900 transition-all shadow-lg cursor-pointer group active:scale-[0.98]"
          title="Click to inspect active municipal labor pool size"
        >
          <div className="flex items-center justify-between text-slate-300 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider group-hover:text-blue-300 transition-colors">Active Labor Pool</span>
            <Building className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold text-white group-hover:text-blue-200 transition-colors">
            {occupations.reduce((acc: number, o: any) => acc + Number(o.employed_count || 0), 0).toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-slate-300 flex items-center justify-between">
            <span>Captured in occupational census</span>
            <span className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
              Inspect <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Contributing Data Inspector */}
      {contributingData && (
        <ContributingDataInspector {...contributingData} />
      )}

      {/* Top Occupations Chart */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-400" />
              Leading Occupational Employment Categories
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Statistics Canada NOC 2021. Click any bar to inspect contributing workforce data.
            </p>
          </div>
          <ResolutionBadge resolution="CSD" />
        </div>

        <div 
          role="region" 
          aria-label="Leading Occupational Employment Categories Chart"
          className="h-72 cursor-pointer"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={topOccChartData} 
              layout="vertical" 
              margin={{ top: 5, right: 30, left: 185, bottom: 5 }}
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
              <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12, fill: '#cbd5e1' }} tickFormatter={(v) => v.toLocaleString()} />
              <YAxis dataKey="name" type="category" stroke="#94a3b8" width={180} tick={{ fontSize: 12, fill: '#cbd5e1' }} />
              <Tooltip 
                formatter={(val: any, name: any, item: any) => [`${Number(val).toLocaleString()} employed (${item.payload.share}%)`, 'Workers']}
                contentStyle={{ 
                  backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                  backdropFilter: 'blur(12px)', 
                  borderColor: 'rgba(255, 255, 255, 0.1)', 
                  borderRadius: '12px', 
                  color: '#f8fafc',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                }}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 6, 6, 0]}>
                {topOccChartData.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#818cf8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Subtabs: NOC Occupations vs NAICS Industries */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => { setActiveSubTab('occupations'); setSearchQuery(''); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === 'occupations'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Top 20 NOC Occupations ({occupations.length})
            </button>
            <button
              type="button"
              onClick={() => { setActiveSubTab('industries'); setSearchQuery(''); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === 'industries'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Top 20 NAICS Industries ({industries.length})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              aria-label={`Filter ${activeSubTab}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Filter ${activeSubTab}...`}
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
        </div>

        {activeSubTab === 'occupations' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900/90 text-slate-300 uppercase tracking-wider border-b border-white/10 font-semibold">
                <tr>
                  <th className="py-3 px-4">NOC Code</th>
                  <th className="py-3 px-4">Occupation Title</th>
                  <th className="py-3 px-4 text-right">Employed Persons</th>
                  <th className="py-3 px-4 text-right">% of Workforce</th>
                  <th className="py-3 px-4 text-right">Median Employment Income</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {filteredOccupations.map((o: any) => (
                  <tr key={o.code} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-mono text-indigo-400 font-semibold">{o.code}</td>
                    <td className="py-3 px-4 font-medium text-white">{o.label}</td>
                    <td className="py-3 px-4 text-right font-semibold text-white font-mono">{Number(o.employed_count).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-medium">{o.percentage_of_workforce}%</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400 font-mono">
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
              <thead className="bg-slate-900/90 text-slate-300 uppercase tracking-wider border-b border-white/10 font-semibold">
                <tr>
                  <th className="py-3 px-4">NAICS Code</th>
                  <th className="py-3 px-4">Industry Sector Title</th>
                  <th className="py-3 px-4 text-right">Employed Persons</th>
                  <th className="py-3 px-4 text-right">% of Workforce</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {filteredIndustries.map((i: any) => (
                  <tr key={i.code} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-mono text-indigo-400 font-semibold">{i.code}</td>
                    <td className="py-3 px-4 font-medium text-white">{i.label}</td>
                    <td className="py-3 px-4 text-right font-semibold text-white font-mono">{Number(i.employed_count).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-medium">{i.percentage_of_workforce}%</td>
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
