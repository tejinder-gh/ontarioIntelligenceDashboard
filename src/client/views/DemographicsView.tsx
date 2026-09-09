import React, { useState, useEffect } from 'react';
import { Users, Globe2, Layers, Download, CheckCircle2, Baby, Award, TrendingUp, Sparkles, Home, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { ResolutionBadge } from '../components/ResolutionBadge.js';
import { ExportButton } from '../components/ExportButton.js';
import { MetricTooltip } from '../components/MetricTooltip.js';
import { ContributingDataInspector, ContributingDataProps } from '../components/ContributingDataInspector.js';
import { FeatureOutliersSection } from '../components/FeatureOutliersSection.js';

interface DemographicsViewProps {
  cityId: string;
  initialCohort?: string;
  initialCommunity?: string;
}

const COHORT_COMMERCIAL_INSIGHTS: Record<string, { summary: string; decisionDrivers: string[] }> = {
  '0 to 14 years': {
    summary: 'Childcare, Early Learning & Family Retail Demand',
    decisionDrivers: [
      'Drives critical demand for licensed childcare, daycares, Montessori, and tutoring franchises.',
      'Catalyzes pediatric health, orthodontic services, and youth sports academies.',
      'Signifies high concentration of young families prioritizing school catchment quality.'
    ]
  },
  '15 to 19 years': {
    summary: 'Secondary Education & Entry-Level Frontline Labor Pool',
    decisionDrivers: [
      'Represents local part-time labor pool for quick-service restaurants, retail, and recreational services.',
      'High consumer footprint for fast-casual dining, athletic apparel, and peer socializing.',
      'Drives extracurricular tutoring, driving instruction, and college-prep demand.'
    ]
  },
  '20 to 24 years': {
    summary: 'Higher Education, Early Career & Starter Rental Market',
    decisionDrivers: [
      'High mobility demographic seeking transit-connected rental apartments and shared housing.',
      'High propensity for fitness memberships, delivery apps, late-night dining, and active social venues.',
      'Forms early-stage professional talent pool for expanding regional employers.'
    ]
  },
  '25 to 34 years': {
    summary: 'Peak Household Formation, First-Time Buyers & Premium Dining',
    decisionDrivers: [
      'Core demographic for initial residential home purchases, townhomes, and rental condominiums.',
      'Maximum per-capita spending on gym memberships, specialty coffee, pet care, and craft dining.',
      'Key target market for wedding services, nursery goods, and early parenting products.'
    ]
  },
  '35 to 44 years': {
    summary: 'Peak Family Spending, Home Renovation & Automotive Upgrades',
    decisionDrivers: [
      'Highest total household expenditure lifecycle: groceries, family vehicles, and children activities.',
      'Heavy investment in home improvement, landscaping, pools, HVAC, and interior furnishings.',
      'Consistent discretionary budget for family vacation packages and youth extracurriculars.'
    ]
  },
  '45 to 54 years': {
    summary: 'Peak Earning Years, Disposable Income & Wealth Accumulation',
    decisionDrivers: [
      'Households operate at apex career earnings with high disposable income and equity accumulation.',
      'High patronage of upscale dining, boutique fitness, executive wellness, and financial advisory.',
      'Substantial spending on secondary post-secondary tuition and luxury consumer goods.'
    ]
  },
  '55 to 64 years': {
    summary: 'Pre-Retirement, Downsizing Candidates & Luxury Travel',
    decisionDrivers: [
      'Emerging empty-nester demographic evaluating condominium downsizing or secondary properties.',
      'Substantial unencumbered home equity with peak investment portfolios and low debt ratios.',
      'High demand for preventative healthcare, longevity services, and home maintenance contractors.'
    ]
  },
  '65 to 74 years': {
    summary: 'Active Retirees, Healthcare Patronage & Community Leisure',
    decisionDrivers: [
      'Active daytime consumers supporting local retail strips, cafés, golf courses, and cultural venues.',
      'Consistent demand for pharmacy, physiotherapy, optometry, and audiology clinics.',
      'Prioritize accessible commercial storefronts with dedicated surface parking and step-free access.'
    ]
  },
  '75 years and over': {
    summary: 'Assisted Living, Specialized Care & Senior Services',
    decisionDrivers: [
      'Drives essential local demand for retirement residences, memory care, and in-home nursing support.',
      'High requirement for medical clinics, mobility aids, and specialized pharmaceutical delivery.',
      'Predictable recurring healthcare expenditure insulated from broader economic cycles.'
    ]
  }
};

export const DemographicsView: React.FC<DemographicsViewProps> = ({ cityId, initialCohort, initialCommunity }) => {
  const [selectedGeo, setSelectedGeo] = useState<string>(cityId);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [contributingData, setContributingData] = useState<ContributingDataProps | null>(null);

  // Sync with prop when city changes unless Ontario-wide explicitly selected
  useEffect(() => {
    setSelectedGeo(cityId);
  }, [cityId]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/geographies/${selectedGeo}/demographics`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);

        // If deep-linked with initialCohort, auto-open inspector
        if (initialCohort && d.ageCohorts) {
          const match = d.ageCohorts.find((c: any) => c.category_label.toLowerCase().includes(initialCohort.toLowerCase()));
          if (match) {
            inspectAgeCohort(match);
          }
        }
        // If deep-linked with initialCommunity, auto-open inspector
        if (initialCommunity && (d.top20Communities || d.visibleMinorities)) {
          const match = (d.top20Communities || []).find((c: any) => c.category_label.toLowerCase().includes(initialCommunity.toLowerCase())) ||
                        (d.visibleMinorities || []).find((c: any) => c.category_label.toLowerCase().includes(initialCommunity.toLowerCase()));
          if (match) {
            inspectCommunity(match);
          }
        }
      })
      .catch(err => {
        console.error('Error fetching demographics:', err);
        setLoading(false);
      });
  }, [selectedGeo, initialCohort, initialCommunity]);

  const isOntarioWide = selectedGeo === 'PR_35' || selectedGeo === 'ontario';

  const inspectAgeCohort = (cohort: any) => {
    const commercial = COHORT_COMMERCIAL_INSIGHTS[cohort.category_label] || {
      summary: 'Generational Market Dynamics',
      decisionDrivers: ['Key consumer group influencing local commercial basket size and workforce availability.']
    };

    setContributingData({
      title: `${cohort.category_label} Life Stage & Commercial Demographics`,
      category: 'Generational Demographics',
      metricLabel: 'Cohort Resident Count',
      value: Number(cohort.count_total).toLocaleString(),
      unit: 'residents',
      percentageOfTotal: Number(cohort.percentage_share),
      benchmarkValue: 'StatCan 2021 Census Profile',
      benchmarkLabel: 'Mandate #8 Benchmark',
      deltaPct: 0,
      sourceLineage: 'Statistics Canada 2021 Census of Population (Table 98-401-X2021001)',
      referenceYear: '2021 Census Profile',
      contextDrivers: [
        `Comprises ${cohort.percentage_share}% of all municipal residents (${Number(cohort.count_total).toLocaleString()} people).`,
        `Commercial Focus: ${commercial.summary}.`,
        ...commercial.decisionDrivers
      ],
      strategicRecommendations: [
        `Tailor operating hours and merchandising to capture the ${cohort.category_label} customer lifecycle.`,
        'Correlate local business vacancy and commercial leasing space against this generational footprint.'
      ],
      onClose: () => setContributingData(null)
    });
  };

  const inspectCommunity = (item: any) => {
    setContributingData({
      title: `${item.category_label} Cultural & Community Profile`,
      category: 'Ethnocultural Lens',
      metricLabel: 'Reported Population',
      value: Number(item.count_total).toLocaleString(),
      unit: 'residents',
      percentageOfTotal: Number(item.percentage_share),
      benchmarkValue: 'Census Long-Form Sample',
      benchmarkLabel: 'Lineage Standard',
      deltaPct: 0,
      sourceLineage: 'Statistics Canada 2021 Census of Population (Table 98-400-X)',
      referenceYear: '2021 Census',
      contextDrivers: [
        `Represents ${item.percentage_share}% of the population in ${selectedGeo.replace('CSD_', '')}.`,
        `Authentic ethnocultural lineage reported in 2021 Census.`,
        `Directly supports niche retail, culinary concepts, community services, and language-tailored marketing.`
      ],
      onClose: () => setContributingData(null)
    });
  };

  // Derive generational totals
  const ageCohorts = data?.ageCohorts || [];
  const totalPop = ageCohorts.reduce((acc: number, c: any) => acc + Number(c.count_total), 0);
  const dominantCohort = [...ageCohorts].sort((a: any, b: any) => Number(b.count_total) - Number(a.count_total))[0];

  const workingAgeCohort = ageCohorts.filter((c: any) => 
    ['20 to 24 years', '25 to 34 years', '35 to 44 years', '45 to 54 years', '55 to 64 years'].includes(c.category_label)
  );
  const workingAgeCount = workingAgeCohort.reduce((acc: number, c: any) => acc + Number(c.count_total), 0);
  const workingAgePct = totalPop > 0 ? Math.round((workingAgeCount / totalPop) * 1000) / 10 : 0;

  const youthCohort = ageCohorts.filter((c: any) => 
    ['0 to 14 years', '15 to 19 years'].includes(c.category_label)
  );
  const youthCount = youthCohort.reduce((acc: number, c: any) => acc + Number(c.count_total), 0);
  const youthPct = totalPop > 0 ? Math.round((youthCount / totalPop) * 1000) / 10 : 0;

  const seniorCohort = ageCohorts.filter((c: any) => 
    ['65 to 74 years', '75 years and over'].includes(c.category_label)
  );
  const seniorCount = seniorCohort.reduce((acc: number, c: any) => acc + Number(c.count_total), 0);
  const seniorPct = totalPop > 0 ? Math.round((seniorCount / totalPop) * 1000) / 10 : 0;

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/60">
              Section 6 & 8: Generational & Demographic Lens
            </span>
            <ResolutionBadge resolution={isOntarioWide ? 'PROVINCE' : 'CSD'} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Demographic, Generational & Community Intelligence
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Calculated dynamically from Statistics Canada 2021 Census of Population data. Age cohorts, ethnic origins, visible minority groups, and housing stocks represent distinct census concepts and are kept strictly separated.
          </p>
        </div>

        {/* Geographic Lens Selector: Selected City vs Ontario-wide */}
        <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-lg border border-slate-700">
          <button
            type="button"
            onClick={() => setSelectedGeo(cityId)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              !isOntarioWide 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Selected Municipality
          </button>
          <button
            type="button"
            onClick={() => setSelectedGeo('PR_35')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              isOntarioWide 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ontario-wide Benchmark
          </button>
        </div>
      </div>

      {/* Contributing Data Inspector */}
      {contributingData && (
        <ContributingDataInspector {...contributingData} />
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400 animate-pulse">
          Computing dynamic demographic distributions...
        </div>
      ) : (
        <div className="space-y-6">
          {/* SECTION 8: Generational Age Cohorts & Life Stage Dynamics */}
          {ageCohorts.length > 0 && (
            <div className="glass-panel p-6 rounded-xl border border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-400" />
                    Generational Age Cohort Distribution (9 Statutory Census Brackets)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Full counts and percentages across all 9 life stages (0–14 to 75+). Click any bar or row to inspect commercial opportunities.
                  </p>
                </div>
                <ExportButton data={ageCohorts} filename={`${selectedGeo}_age_cohorts`} />
              </div>

              {/* Generational Vital Signs Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div 
                  className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/80 cursor-pointer transition-all"
                  onClick={() => dominantCohort && inspectAgeCohort(dominantCohort)}
                >
                  <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
                    <span>Dominant Cohort</span>
                    <Award className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-xl font-bold text-white mt-1">
                    {dominantCohort ? dominantCohort.category_label : '—'}
                  </div>
                  <div className="text-xs text-indigo-400 mt-0.5 font-medium">
                    {dominantCohort ? `${Number(dominantCohort.count_total).toLocaleString()} residents (${dominantCohort.percentage_share}%)` : ''}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
                    <span>Core Working Age (20–64)</span>
                    <Users className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xl font-bold text-white mt-1">
                    {workingAgeCount.toLocaleString()}
                  </div>
                  <div className="text-xs text-emerald-400 mt-0.5 font-medium">
                    {workingAgePct}% of municipal population
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
                    <span>Youth & Children (0–19)</span>
                    <Baby className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="text-xl font-bold text-white mt-1">
                    {youthCount.toLocaleString()}
                  </div>
                  <div className="text-xs text-sky-400 mt-0.5 font-medium">
                    {youthPct}% (Childcare & schooling demand)
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
                    <span>Mature & Seniors (65+)</span>
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-xl font-bold text-white mt-1">
                    {seniorCount.toLocaleString()}
                  </div>
                  <div className="text-xs text-purple-400 mt-0.5 font-medium">
                    {seniorPct}% (Health, leisure & downsizing)
                  </div>
                </div>
              </div>

              {/* Age Cohorts Bar Chart */}
              <div className="h-72 w-full cursor-pointer">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={ageCohorts}
                    margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                    onClick={(e: any) => {
                      if (e && e.activePayload && e.activePayload.length > 0) {
                        inspectAgeCohort(e.activePayload[0].payload);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="category_label" stroke="#64748b" tick={{ fontSize: 11, fill: '#cbd5e1' }} />
                    <YAxis unit="%" stroke="#64748b" tick={{ fontSize: 11, fill: '#cbd5e1' }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const c = payload[0].payload;
                        return (
                          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-700 shadow-xl text-xs text-slate-200">
                            <div className="font-semibold text-white">{c.category_label}</div>
                            <div className="text-indigo-400 font-mono mt-1">
                              {Number(c.count_total).toLocaleString()} residents ({c.percentage_share}%)
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">Click bar for commercial decision drivers</div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="percentage_share" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                      {ageCohorts.map((c: any, index: number) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={c.category_label === dominantCohort?.category_label ? '#a855f7' : '#6366f1'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Age Cohorts Table */}
              <div className="mt-4 overflow-x-auto border-t border-slate-800 pt-4">
                <table className="w-full text-left text-xs divide-y divide-slate-800">
                  <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">Age Cohort</th>
                      <th className="px-4 py-2.5 text-right">Population Count</th>
                      <th className="px-4 py-2.5 text-right">Share of Population</th>
                      <th className="px-4 py-2.5">Primary Commercial Opportunity Focus</th>
                      <th className="px-4 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {ageCohorts.map((cohort: any) => {
                      const commercial = COHORT_COMMERCIAL_INSIGHTS[cohort.category_label] || { summary: 'Commercial Demographic Driver' };
                      return (
                        <tr 
                          key={cohort.category_label}
                          onClick={() => inspectAgeCohort(cohort)}
                          className="hover:bg-slate-900/60 transition-colors cursor-pointer group"
                        >
                          <td className="px-4 py-2.5 font-semibold text-white flex items-center gap-1.5">
                            {cohort.category_label === dominantCohort?.category_label && (
                              <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            )}
                            {cohort.category_label}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-emerald-400">
                            {Number(cohort.count_total).toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-slate-300">
                            {cohort.percentage_share}%
                          </td>
                          <td className="px-4 py-2.5 text-slate-400 text-xs truncate max-w-xs">
                            {commercial.summary}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="text-indigo-400 text-[11px] font-medium group-hover:underline flex items-center justify-end gap-0.5">
                              Inspect <ChevronRight className="w-3 h-3" />
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Top 20 Ethnic Origins Chart & Table */}
          <div className="glass-panel p-6 rounded-xl border border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-indigo-400" />
                  Top 20 Ethnic and Cultural Origins ({isOntarioWide ? 'Ontario-wide' : 'Municipal'})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Reflects ethnic and cultural ancestral origins reported by respondents in the 2021 Census long form. Click any bar to inspect.
                </p>
              </div>
              <ExportButton data={data.top20Communities || []} filename={`${selectedGeo}_top_20_ethnic_origins`} />
            </div>

            {/* Chart: Top 20 Horizontal Bar */}
            <div className="h-96 w-full pt-2 cursor-pointer">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(data.top20Communities || []).slice(0, 15)}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload.length > 0) {
                      inspectCommunity(e.activePayload[0].payload);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" tickFormatter={v => v.toLocaleString()} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="category_label" stroke="#94a3b8" tick={{ fontSize: 11 }} width={110} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload;
                      return (
                        <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-700 shadow-xl text-xs text-slate-200">
                          <div className="font-semibold text-white">{item.category_label}</div>
                          <div className="text-indigo-400 font-mono mt-1">
                            Count: {Number(item.count_total).toLocaleString()} people ({item.percentage_share}%)
                          </div>
                          <div className="text-xs text-slate-400 mt-1">Source: Statistics Canada Census 2021</div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="count_total" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top 20 Table Breakdown */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-800">
                <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-2.5">Rank</th>
                    <th className="px-4 py-2.5">Ethnic or Cultural Origin</th>
                    <th className="px-4 py-2.5 text-right">Population Count</th>
                    <th className="px-4 py-2.5 text-right">Share of Population</th>
                    <th className="px-4 py-2.5">Source Dataset</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {(data.top20Communities || []).map((item: any, idx: number) => (
                    <tr 
                      key={item.category_label} 
                      className="hover:bg-slate-900/50 transition-colors cursor-pointer"
                      onClick={() => inspectCommunity(item)}
                    >
                      <td className="px-4 py-2.5 text-slate-500 font-mono">#{idx + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-white">{item.category_label}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-emerald-400">{Number(item.count_total).toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-300">{item.percentage_share}%</td>
                      <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">StatCan 98-400-X</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Visible Minority Distribution */}
          <div className="glass-panel p-6 rounded-xl border border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Visible Minority Groups ({isOntarioWide ? 'Ontario-wide' : 'Municipal'})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Employment Equity Act designated visible minority categories according to Statistics Canada Census classifications.
                </p>
              </div>
              <ExportButton data={data.visibleMinorities || []} filename={`${selectedGeo}_visible_minorities`} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {(data.visibleMinorities || []).map((vm: any) => (
                <div 
                  key={vm.category_label} 
                  className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 transition-colors cursor-pointer"
                  onClick={() => inspectCommunity(vm)}
                >
                  <div className="text-xs text-slate-400 font-medium truncate">{vm.category_label}</div>
                  <div className="text-lg font-bold text-white mt-1">{Number(vm.count_total).toLocaleString()}</div>
                  <div className="text-xs text-emerald-400 font-medium mt-0.5">{vm.percentage_share}% of total</div>
                </div>
              ))}
            </div>
          </div>

          {/* Housing Stock Structure (Section 8) */}
          {(data.housingStock || []).length > 0 && (
            <div className="glass-panel p-6 rounded-xl border border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Home className="w-4 h-4 text-amber-400" />
                    Housing Stock Structural Distribution (Census 2021)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Structural dwelling typology: single-detached, semi-detached, townhomes, low-rise, and high-rise apartments.
                  </p>
                </div>
                <ExportButton data={data.housingStock} filename={`${selectedGeo}_housing_stock`} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                {data.housingStock.map((hs: any) => (
                  <div 
                    key={hs.category_label} 
                    className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 transition-colors"
                  >
                    <div className="text-xs text-slate-400 font-medium truncate">{hs.category_label}</div>
                    <div className="text-lg font-bold text-white mt-1">{Number(hs.count_total).toLocaleString()}</div>
                    <div className="text-xs text-amber-400 font-medium mt-0.5">{hs.percentage_share}% of stock</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feature-Wide Outliers Section */}
          <FeatureOutliersSection
            category="demographics"
            cityId={selectedGeo}
            title="Demographic Divergences & Community Outliers"
            subtitle="Statistical divergences in population growth, age distribution, and visible minority concentrations across Ontario."
          />
        </div>
      )}
    </div>
  );
};

