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
  ChevronRight,
  Compass,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  Sparkles
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { ResolutionBadge } from '../components/ResolutionBadge.js';
import { ExportButton } from '../components/ExportButton.js';
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
  const [autocompleteQuery, setAutocompleteQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
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

  // Autocomplete search as user types
  useEffect(() => {
    if (!autocompleteQuery || autocompleteQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      fetch(`/api/taxonomy/search?q=${encodeURIComponent(autocompleteQuery.trim())}&limit=6`)
        .then(res => res.json())
        .then(d => setSuggestions(d.suggestions || []))
        .catch(err => console.error('Error fetching taxonomy suggestions:', err));
    }, 200);

    return () => clearTimeout(timer);
  }, [autocompleteQuery]);

  if (loading || !data) {
    return (
      <div className="p-12 text-center text-slate-400 animate-pulse">
        Querying municipal workforce composition, occupational Location Quotients, and Statistics Canada benchmarks...
      </div>
    );
  }

  const occupations = data.topOccupations || [];
  const industries = data.topIndustries || [];
  const summary = data.summary || {};
  const partRate = data.participationRate || 66.8;
  const unempRate = data.unemploymentRate || 6.6;
  const empRate = data.employmentRate || 62.4;
  const topTalentCluster = summary.topTalentCluster;

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
    share: Number(o.percentage_of_workforce),
    lq: Number(o.locationQuotient || 1.0)
  }));

  const handleSelectOccupation = (o: any) => {
    setContributingData({
      title: `${o.label} (NOC ${o.code})`,
      category: 'Occupational Labor Market & Location Quotient',
      metricLabel: 'Employed Municipal Residents',
      value: o.employed_count,
      unit: 'workers',
      benchmarkLabel: 'Ontario Workforce Share & Location Quotient',
      benchmarkValue: `${o.percentage_of_workforce}% local vs ${o.ontarioBenchmarkPct}% Ontario (LQ: ${o.locationQuotient})`,
      sourceLineage: 'Statistics Canada 2021 Census of Population (Table 98-401-X2021001)',
      referenceYear: '2021 Census Cycle',
      decisionImplications: [
        {
          heading: 'Location Quotient & Cluster Specialization',
          insight: o.locationQuotient >= 1.20 
            ? `Location Quotient of ${o.locationQuotient} signifies a specialized commercial talent cluster (${o.deltaVsBenchmarkPct > 0 ? '+' : ''}${o.deltaVsBenchmarkPct}% vs Ontario benchmark). Rich local hiring pool.`
            : o.locationQuotient <= 0.80
            ? `Location Quotient of ${o.locationQuotient} indicates relative local underrepresentation. Hiring may face candidate scarcity or necessitate regional recruiting.`
            : `Location Quotient of ${o.locationQuotient} reflects a balanced distribution aligned with provincial baseline.`,
          impact: o.locationQuotient >= 1.20 ? 'positive' : o.locationQuotient <= 0.80 ? 'warning' : 'neutral'
        },
        {
          heading: 'Wage Compensation & Income Baseline',
          insight: o.median_employment_income 
            ? `Median employment income is $${Number(o.median_employment_income).toLocaleString()} CAD${o.wageDeltaVsBenchmark !== null ? ` (${o.wageDeltaVsBenchmark >= 0 ? '+$' : '-$'}${Math.abs(o.wageDeltaVsBenchmark).toLocaleString()} vs Ontario median of $${Number(o.ontarioMedianIncome).toLocaleString()})` : ''}.`
            : 'Salary and median compensation data withheld for privacy or sample size.',
          impact: 'neutral'
        }
      ],
      strategicRecommendations: [
        o.locationQuotient >= 1.20 
          ? 'Capitalize on local technical depth to build specialized service operations without paying excessive talent recruitment premiums.'
          : 'Offer competitive benefits and referral bonuses to attract candidates in underrepresented occupational categories.'
      ],
      onClose: () => setContributingData(null)
    });
  };

  const handleSelectIndustry = (ind: any) => {
    setContributingData({
      title: `${ind.label} (NAICS ${ind.code})`,
      category: 'Industry Sector Employment & Concentration',
      metricLabel: 'Employed Residents in Sector',
      value: ind.employed_count,
      unit: 'workers',
      benchmarkLabel: 'Ontario Sector Share & Location Quotient',
      benchmarkValue: `${ind.percentage_of_workforce}% local vs ${ind.ontarioBenchmarkPct}% Ontario (LQ: ${ind.locationQuotient})`,
      sourceLineage: 'Statistics Canada 2021 Census NAICS Sector Employment Profile',
      referenceYear: '2021 Census Cycle',
      decisionImplications: [
        {
          heading: 'Sector Concentration & Agglomeration',
          insight: `Accounts for ${ind.percentage_of_workforce}% of all working residents (${ind.locationQuotient}x Ontario concentration). High sector agglomeration enhances supplier networks and B2B client potential.`,
          impact: ind.locationQuotient >= 1.20 ? 'positive' : 'neutral'
        }
      ],
      strategicRecommendations: [
        'Explore B2B corporate partnerships with anchor employers operating within this commercial sector.'
      ],
      onClose: () => setContributingData(null)
    });
  };

  const exportData = activeSubTab === 'occupations' 
    ? occupations.map((o: any) => ({
        'NOC Code': o.code,
        'Occupation Title': o.label,
        'Employed Count': o.employed_count,
        'Local Workforce Share (%)': `${o.percentage_of_workforce}%`,
        'Ontario Benchmark Share (%)': `${o.ontarioBenchmarkPct}%`,
        'Location Quotient (LQ)': o.locationQuotient,
        'Concentration Status': o.concentrationStatus,
        'Median Employment Income': o.median_employment_income ? `$${Number(o.median_employment_income).toLocaleString()}` : 'N/A',
        'Ontario Median Income': o.ontarioMedianIncome ? `$${Number(o.ontarioMedianIncome).toLocaleString()}` : 'N/A'
      }))
    : industries.map((i: any) => ({
        'NAICS Code': i.code,
        'Industry Sector': i.label,
        'Employed Count': i.employed_count,
        'Local Workforce Share (%)': `${i.percentage_of_workforce}%`,
        'Ontario Benchmark Share (%)': `${i.ontarioBenchmarkPct}%`,
        'Location Quotient (LQ)': i.locationQuotient,
        'Concentration Status': i.concentrationStatus
      }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/60">
              Labor Market Intelligence & Location Quotients (Section 23)
            </span>
            <ResolutionBadge resolution="CSD" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Workforce Composition, Location Quotients & Industry Concentration
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-3xl">
            Empirical labor market distributions from Statistics Canada 2021 Census of Population (Table 98-401-X2021001). Analyzes occupational specializations, Location Quotients vs Ontario benchmarks, and local talent availability.
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

      {/* Contributing Data Inspector */}
      {contributingData && (
        <ContributingDataInspector {...contributingData} />
      )}

      {/* Labor Market Health & Specialization KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            sourceLineage: 'Statistics Canada 2021 Census of Population',
            referenceYear: '2021 Census Reference Period',
            decisionImplications: [
              {
                heading: 'Labor Engagement & Active Workforce',
                insight: `A participation rate of ${partRate}% indicates high economic engagement among working-age residents (ages 15+), confirming steady regular employment income.`,
                impact: 'positive'
              }
            ],
            strategicRecommendations: [
              'Highlight flexible scheduling and competitive compensation to recruit active talent.'
            ],
            onClose: () => setContributingData(null)
          })}
          onKeyDown={(e) => e.key === 'Enter' && setContributingData(null)}
          className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-indigo-500/80 hover:bg-slate-900 transition-all shadow-lg cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center justify-between text-slate-300 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider group-hover:text-indigo-300 transition-colors">Participation Rate</span>
            <Briefcase className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-white group-hover:text-indigo-200 transition-colors">
            {partRate}%
          </div>
          <div className="mt-2 text-xs text-slate-300 flex items-center justify-between">
            <span>vs 65.1% Ontario benchmark</span>
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
            sourceLineage: 'Statistics Canada 2021 Census Profile',
            referenceYear: '2021 Census Cycle',
            decisionImplications: [
              {
                heading: 'Wage Competition & Candidate Availability',
                insight: `An unemployment rate of ${unempRate}% reflects a tight labor market where applicants frequently have competing offers. Starting hourly wages must match prevailing norms.`,
                impact: 'warning'
              }
            ],
            strategicRecommendations: [
              'Implement retention incentives after 90 days of employment.'
            ],
            onClose: () => setContributingData(null)
          })}
          onKeyDown={(e) => e.key === 'Enter' && setContributingData(null)}
          className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-emerald-500/80 hover:bg-slate-900 transition-all shadow-lg cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center justify-between text-slate-300 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider group-hover:text-emerald-300 transition-colors">Unemployment Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white group-hover:text-emerald-200 transition-colors">
            {unempRate}%
          </div>
          <div className="mt-2 text-xs text-slate-300 flex items-center justify-between">
            <span>vs 6.8% Ontario benchmark</span>
            <span className="text-[10px] text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
              Inspect <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Top Specialized Cluster */}
        <div 
          role="button"
          tabIndex={0}
          onClick={() => {
            if (topTalentCluster) handleSelectOccupation(topTalentCluster);
          }}
          onKeyDown={(e) => e.key === 'Enter' && setContributingData(null)}
          className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-purple-500/80 hover:bg-slate-900 transition-all shadow-lg cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center justify-between text-slate-300 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider group-hover:text-purple-300 transition-colors">Specialized Cluster</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-purple-300 group-hover:text-purple-200 transition-colors truncate">
            {topTalentCluster ? `LQ: ${topTalentCluster.locationQuotient}` : 'Balanced'}
          </div>
          <div className="mt-2 text-xs text-slate-300 flex items-center justify-between">
            <span className="truncate max-w-[170px]" title={topTalentCluster?.label}>{topTalentCluster?.label || 'General Talent'}</span>
            <span className="text-[10px] text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
              Inspect <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Active Labor Pool */}
        <div 
          role="button"
          tabIndex={0}
          onClick={() => {
            const totalEmployed = summary.totalEmployedInCensus || occupations.reduce((acc: number, o: any) => acc + Number(o.employed_count || 0), 0);
            setContributingData({
              title: `${cityId.replace('CSD_', '')} Active Municipal Labor Pool`,
              category: 'Workforce Size',
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
                  insight: `Over ${totalEmployed.toLocaleString()} employed residents operate across technical and service categories, providing comprehensive talent availability.`,
                  impact: 'positive'
                }
              ],
              strategicRecommendations: [
                'Analyze Location Quotients below to identify areas of competitive labor advantage.'
              ],
              onClose: () => setContributingData(null)
            });
          }}
          onKeyDown={(e) => e.key === 'Enter' && setContributingData(null)}
          className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-blue-500/80 hover:bg-slate-900 transition-all shadow-lg cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center justify-between text-slate-300 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider group-hover:text-blue-300 transition-colors">Active Labor Pool</span>
            <Building className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold text-white group-hover:text-blue-200 transition-colors">
            {(summary.totalEmployedInCensus || occupations.reduce((acc: number, o: any) => acc + Number(o.employed_count || 0), 0)).toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-slate-300 flex items-center justify-between">
            <span>Captured in occupational census</span>
            <span className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
              Inspect <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Top Occupations Chart */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-400" />
              Leading Occupational Employment Categories & Location Quotients
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Statistics Canada NOC 2021. Click any bar to inspect contributing workforce micro-data and wage benchmarks.
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
                  const matchingOcc = occupations.find((o: any) => o.label.startsWith(item.name.replace('...', '')));
                  if (matchingOcc) {
                    handleSelectOccupation(matchingOcc);
                  }
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12, fill: '#cbd5e1' }} tickFormatter={(v) => v.toLocaleString()} />
              <YAxis dataKey="name" type="category" stroke="#94a3b8" width={180} tick={{ fontSize: 12, fill: '#cbd5e1' }} />
              <Tooltip 
                formatter={(val: any, name: any, item: any) => [
                  `${Number(val).toLocaleString()} employed (${item.payload.share}%) • LQ: ${item.payload.lq}`, 
                  'Workers'
                ]}
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
                {topOccChartData.map((d: any, index: number) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={d.lq >= 1.20 ? '#10b981' : d.lq <= 0.80 ? '#f59e0b' : '#6366f1'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Subtabs: NOC Occupations vs NAICS Industries */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
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
              NOC Occupations ({occupations.length})
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
              NAICS Industries ({industries.length})
            </button>
          </div>

          {/* Search Input with Autocomplete */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              aria-label={`Search ${activeSubTab}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeSubTab} by title, code or domain...`}
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
                  <th className="py-3 px-4">Occupation Title (Click to Inspect)</th>
                  <th className="py-3 px-4 text-right">Employed Persons</th>
                  <th className="py-3 px-4 text-right">Local Share</th>
                  <th className="py-3 px-4 text-right">Ontario Benchmark</th>
                  <th className="py-3 px-4 text-center">Location Quotient (LQ)</th>
                  <th className="py-3 px-4 text-right">Median Salary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {filteredOccupations.map((o: any) => (
                  <tr 
                    key={o.code} 
                    onClick={() => handleSelectOccupation(o)}
                    className="hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-mono text-indigo-400 font-semibold">{o.code}</td>
                    <td className="py-3 px-4 font-medium text-white group-hover:text-indigo-300 transition-colors">
                      {o.label}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-white font-mono">
                      {Number(o.employed_count).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {o.percentage_of_workforce}%
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 font-mono">
                      {o.ontarioBenchmarkPct ? `${o.ontarioBenchmarkPct}%` : '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                        o.locationQuotient >= 1.20 
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                          : o.locationQuotient <= 0.80
                          ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {o.locationQuotient} {o.locationQuotient >= 1.20 ? '★ Cluster' : ''}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold font-mono">
                      {o.median_employment_income ? (
                        <div className="flex flex-col items-end">
                          <span className="text-emerald-400">${Number(o.median_employment_income).toLocaleString()}</span>
                          {o.wageDeltaVsBenchmark !== null && (
                            <span className={`text-[10px] font-normal ${o.wageDeltaVsBenchmark >= 0 ? 'text-emerald-300' : 'text-amber-300'}`}>
                              {o.wageDeltaVsBenchmark >= 0 ? '+' : ''}${o.wageDeltaVsBenchmark.toLocaleString()} vs ON
                            </span>
                          )}
                        </div>
                      ) : 'N/A'}
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
                  <th className="py-3 px-4">Industry Sector Title (Click to Inspect)</th>
                  <th className="py-3 px-4 text-right">Employed Persons</th>
                  <th className="py-3 px-4 text-right">Local Share</th>
                  <th className="py-3 px-4 text-right">Ontario Benchmark</th>
                  <th className="py-3 px-4 text-center">Location Quotient (LQ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {filteredIndustries.map((i: any) => (
                  <tr 
                    key={i.code} 
                    onClick={() => handleSelectIndustry(i)}
                    className="hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-mono text-indigo-400 font-semibold">{i.code}</td>
                    <td className="py-3 px-4 font-medium text-white group-hover:text-indigo-300 transition-colors">
                      {i.label}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-white font-mono">
                      {Number(i.employed_count).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {i.percentage_of_workforce}%
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 font-mono">
                      {i.ontarioBenchmarkPct ? `${i.ontarioBenchmarkPct}%` : '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                        i.locationQuotient >= 1.20 
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                          : i.locationQuotient <= 0.80
                          ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {i.locationQuotient} {i.locationQuotient >= 1.20 ? '★ Cluster' : ''}
                      </span>
                    </td>
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
