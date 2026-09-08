import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Target, 
  MapPin, 
  TrendingUp, 
  Sliders, 
  DollarSign, 
  Building, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  FileText, 
  HelpCircle,
  BarChart3,
  Layers,
  Image as ImageIcon
} from 'lucide-react';
import { ResolutionBadge } from '../components/ResolutionBadge.js';
import { ExportButton } from '../components/ExportButton.js';
import { MetricTooltip } from '../components/MetricTooltip.js';
import { BusinessVisualSelector } from '../components/BusinessVisualSelector.js';
import { ContributingDataInspector, ContributingDataProps } from '../components/ContributingDataInspector.js';
import { FeatureOutliersSection } from '../components/FeatureOutliersSection.js';

interface OpportunityLabViewProps {
  cityId: string;
  onSelectCity: (cityId: string) => void;
}

const BUSINESS_CATEGORIES = [
  { id: 'pizza_store', name: 'Pizza Store / Pizzeria (NAICS 722513)', icon: '🍕' },
  { id: 'full_service_restaurant', name: 'Full-Service Restaurant (NAICS 722511)', icon: '🍽️' },
  { id: 'coffee_shop', name: 'Coffee & Snack Shop (NAICS 722515)', icon: '☕' },
  { id: 'tutoring_centre', name: 'Tutoring & Learning Centre (NAICS 611691)', icon: '📚' },
  { id: 'fitness_centre', name: 'Fitness & Recreational Sports (NAICS 713940)', icon: '🏋️' },
  { id: 'child_daycare', name: 'Child Daycare Facility (NAICS 624410)', icon: '👶' },
  { id: 'automotive_repair', name: 'General Automotive Repair (NAICS 811111)', icon: '🚗' },
  { id: 'dental_clinic', name: 'Offices of Dentists (NAICS 621210)', icon: '🦷' }
];

export const OpportunityLabView: React.FC<OpportunityLabViewProps> = ({ cityId, onSelectCity }) => {
  const [workflow, setWorkflow] = useState<'VISUAL' | 'B' | 'A'>('VISUAL'); // Default to Visual Picture & Keyword Mapping Matrix
  
  // Workflow A State ("I know the business")
  const [selectedCategory, setSelectedCategory] = useState<string>('pizza_store');
  const [demandWeight, setDemandWeight] = useState<number>(0.35);
  const [compWeight, setCompWeight] = useState<number>(0.30);
  const [incomeWeight, setIncomeWeight] = useState<number>(0.20);
  const [growthWeight, setGrowthWeight] = useState<number>(0.15);
  const [workflowAResults, setWorkflowAResults] = useState<any[]>([]);
  const [loadingA, setLoadingA] = useState(false);

  // Workflow B State ("I know the city")
  const [selectedCityId, setSelectedCityId] = useState<string>(cityId);
  const [workflowBResults, setWorkflowBResults] = useState<any[]>([]);
  const [loadingB, setLoadingB] = useState(false);

  // Detail Modal State
  const [activeDetail, setActiveDetail] = useState<{ cityId: string; categoryId: string; cityName?: string } | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Contributing Data Inspector State
  const [contributingData, setContributingData] = useState<ContributingDataProps | null>(null);

  // Sync selectedCityId with prop
  useEffect(() => {
    setSelectedCityId(cityId);
  }, [cityId]);

  // Fetch Workflow A
  useEffect(() => {
    if (workflow === 'A') {
      setLoadingA(true);
      const params = new URLSearchParams({
        category: selectedCategory,
        demand: demandWeight.toString(),
        competition: compWeight.toString(),
        income: incomeWeight.toString(),
        growth: growthWeight.toString()
      });
      fetch(`/api/opportunity/business-search?${params.toString()}`)
        .then(res => res.json())
        .then(data => {
          setWorkflowAResults(data.topCities || []);
          setLoadingA(false);
        })
        .catch(err => {
          console.error('Error in Workflow A:', err);
          setLoadingA(false);
        });
    }
  }, [workflow, selectedCategory, demandWeight, compWeight, incomeWeight, growthWeight]);

  // Fetch Workflow B
  useEffect(() => {
    if (workflow === 'B') {
      setLoadingB(true);
      fetch(`/api/opportunity/city-recommendations?cityId=${selectedCityId}`)
        .then(res => res.json())
        .then(data => {
          setWorkflowBResults(data.recommendations || []);
          setLoadingB(false);
        })
        .catch(err => {
          console.error('Error in Workflow B:', err);
          setLoadingB(false);
        });
    }
  }, [workflow, selectedCityId]);

  // Fetch Category Detail when opened
  useEffect(() => {
    if (activeDetail) {
      setLoadingDetail(true);
      fetch(`/api/opportunity/business-detail?cityId=${activeDetail.cityId}&categoryId=${activeDetail.categoryId}`)
        .then(res => res.json())
        .then(data => {
          setDetailData(data);
          setLoadingDetail(false);
        })
        .catch(err => {
          console.error('Error loading detail:', err);
          setLoadingDetail(false);
        });
    } else {
      setDetailData(null);
    }
  }, [activeDetail]);

  // Keyboard accessibility: dismiss modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeDetail) {
        setActiveDetail(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDetail]);

  const handleCardClick = (rec: any) => {
    const oppScore = rec.opportunityScore || 85;
    const revMedian = rec.revenueBenchmarkRange?.median || rec.estimatedAnnualRevenueCAD?.median || 750000;
    const density = rec.competitorDensity || rec.countPer10kPop || 0;

    setContributingData({
      title: `${rec.categoryName} Feasibility Breakdown in ${selectedCityId.replace('CSD_', '')}`,
      metricLabel: 'Opportunity Feasibility Score',
      value: `${oppScore}/100`,
      percentageOfTotal: `${rec.gapIndex || 2.1}x Gap Index`,
      benchmarkValue: `${rec.peerBenchmarkPer10kPop || 2.8} stores / 10k pop`,
      benchmarkLabel: 'Ontario Peer Saturation Benchmark',
      deltaPct: rec.gapIndex ? Math.round((rec.gapIndex - 1) * 100) : 25,
      sourceLineage: `StatCan NAICS ${rec.naicsCode} & Survey of Service Industries`,
      referenceYear: '2021 Census & 2025 Commercial Registry',
      contextDrivers: [
        rec.rationale || `Evaluated against ${density} existing competitors per 10k residents.`,
        `Estimated Median Unit Revenue: $${Number(revMedian).toLocaleString()} CAD / yr`,
        `Typical Initial Capital Investment: $${Number(rec.typicalInvestmentCAD?.min || 150000).toLocaleString()} – $${Number(rec.typicalInvestmentCAD?.max || 450000).toLocaleString()} CAD`,
        ...(rec.keyDrivers || [])
      ],
      onClose: () => setContributingData(null)
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/60">
              Opportunity Engine v2
            </span>
            <ResolutionBadge resolution="CSD" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Market Opportunity & Business Feasibility Lab
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Empirically models business viability using census income, household counts, competition saturation, population growth, and SEDAR franchise revenue filings.
          </p>
        </div>

        {/* Workflow Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-700">
          <button
            type="button"
            onClick={() => setWorkflow('VISUAL')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              workflow === 'VISUAL'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Visual Domain & Keyword Fit
          </button>
          <button
            type="button"
            onClick={() => setWorkflow('B')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              workflow === 'B'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            City Opportunities
          </button>
          <button
            type="button"
            onClick={() => setWorkflow('A')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              workflow === 'A'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            Ontario City League
          </button>
        </div>
      </div>

      {/* Contributing Data Inspector (if active) */}
      {contributingData && (
        <ContributingDataInspector {...contributingData} />
      )}

      {/* ========================================================================= */}
      {/* MODE 1: VISUAL PICTURE SELECTOR & KEYWORD MAPPING MATRIX                 */}
      {/* ========================================================================= */}
      {workflow === 'VISUAL' && (
        <BusinessVisualSelector
          selectedCategoryId={selectedCategory}
          onSelectCategory={(catId) => {
            setSelectedCategory(catId);
          }}
          onSelectCity={(targetCityId) => {
            onSelectCity(targetCityId);
            setSelectedCityId(targetCityId);
          }}
          activeCityId={selectedCityId}
        />
      )}

      {/* ========================================================================= */}
      {/* MODE 2: WORKFLOW B ("I KNOW THE CITY")                                   */}
      {/* ========================================================================= */}
      {workflow === 'B' && (
        <div className="space-y-6">
          <div className="glass-panel p-5 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-medium text-slate-400 block">Target Municipality:</span>
              <div className="flex items-center gap-3 mt-1">
                <select
                  value={selectedCityId}
                  onChange={(e) => setSelectedCityId(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white font-bold text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                >
                  <option value="CSD_burlington">Burlington (CSD 3524002)</option>
                  <option value="CSD_oakville">Oakville (CSD 3524001)</option>
                  <option value="CSD_milton">Milton (CSD 3524009)</option>
                  <option value="CSD_toronto">Toronto (CSD 3520005)</option>
                  <option value="CSD_mississauga">Mississauga (CSD 3521005)</option>
                  <option value="CSD_ottawa">Ottawa (CSD 3506008)</option>
                  <option value="CSD_hamilton">Hamilton (CSD 3525005)</option>
                  <option value="CSD_waterloo">Waterloo (CSD 3530016)</option>
                  <option value="CSD_guelph">Guelph (CSD 3523001)</option>
                  <option value="CSD_barrie">Barrie (CSD 3543042)</option>
                </select>
                <span className="text-xs text-slate-400">
                  Showing highest probability business opportunities ranked by market gap index. Click any card for contributing data.
                </span>
              </div>
            </div>

            <ExportButton 
              data={workflowBResults.map(r => ({
                Category: r.categoryName,
                'NAICS Code': r.naicsCode,
                'Opportunity Score': r.opportunityScore,
                'Gap Index': r.gapIndex,
                'Demand Score': r.demandScore || 75,
                'Competition Score': r.competitionScore || 65,
                'Success Probability': (r.successProbability || 'HIGH').replace('_', ' '),
                'Median Revenue Benchmark': `$${Number(r.revenueBenchmarkRange?.median || r.estimatedAnnualRevenueCAD?.median || 750000).toLocaleString()}`
              }))} 
              filename={`${selectedCityId}_business_opportunities`} 
              label="Export City Opportunities" 
            />
          </div>

          {loadingB ? (
            <div className="p-12 text-center text-slate-400 animate-pulse glass-panel rounded-xl">
              Analyzing local market gaps, competitor densities, and disposable income...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workflowBResults.map((rec) => {
                const prob = rec.successProbability || (rec.opportunityScore >= 85 ? 'VERY_HIGH' : rec.opportunityScore >= 70 ? 'HIGH' : 'MODERATE');
                const medianRev = rec.revenueBenchmarkRange?.median || rec.estimatedAnnualRevenueCAD?.median || 750000;
                const density = rec.competitorDensity !== undefined ? rec.competitorDensity : (rec.countPer10kPop || 0);

                return (
                  <div 
                    key={rec.categoryId}
                    className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-indigo-500/60 transition-all shadow-md group cursor-pointer"
                    onClick={() => handleCardClick(rec)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl p-2 rounded-lg bg-slate-900 border border-slate-800">
                          {BUSINESS_CATEGORIES.find(c => c.id === rec.categoryId)?.icon || '🏢'}
                        </span>
                        <div>
                          <h4 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">
                            {rec.categoryName}
                          </h4>
                          <span className="text-xs font-mono text-slate-400">NAICS {rec.naicsCode}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold ${
                          prob === 'VERY_HIGH' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                          prob === 'HIGH' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' :
                          prob === 'MODERATE' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {prob.replace('_', ' ')}
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-1">Score: {rec.opportunityScore}/100</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 my-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
                      <div>
                        <span className="text-slate-400 block mb-0.5">Market Gap Index</span>
                        <span className="font-bold text-emerald-400">+{rec.gapIndex}x</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Demand Score</span>
                        <span className="font-semibold text-white">{rec.demandScore || 80}/100</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Competitor Density</span>
                        <span className="font-semibold text-indigo-300">{density} / 10k</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
                      <span className="text-slate-400">
                        Annual Revenue: <strong className="text-white">${(medianRev / 1000).toFixed(0)}k</strong>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDetail({ cityId: selectedCityId, categoryId: rec.categoryId, cityName: rec.cityName });
                          }}
                          className="text-indigo-400 group-hover:text-indigo-300 font-semibold inline-flex items-center gap-1 hover:underline"
                        >
                          Deep Dive Competitors
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 3: WORKFLOW A ("I KNOW THE BUSINESS")                                */}
      {/* ========================================================================= */}
      {workflow === 'A' && (
        <div className="space-y-6">
          {/* Controls Panel */}
          <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="w-full sm:w-auto">
                <label className="text-xs font-semibold text-slate-300 block mb-1">Select Business Category:</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white font-semibold text-sm rounded-lg px-3 py-2 w-full sm:w-80 focus:outline-none focus:border-indigo-500"
                >
                  {BUSINESS_CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>

              <div className="text-xs text-slate-400 max-w-sm">
                Ranks all 444 Ontario Census Subdivisions to identify municipalities with peak purchasing power, high household formation, and minimal competitor saturation.
              </div>
            </div>

            {/* Weight Sliders */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                Multi-Criteria Feasibility Weights (Total: {Math.round((demandWeight + compWeight + incomeWeight + growthWeight) * 100)}%)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Demand / Population</span>
                    <span className="font-bold text-indigo-300">{Math.round(demandWeight * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.6"
                    step="0.05"
                    value={demandWeight}
                    onChange={(e) => setDemandWeight(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Saturation Penalty</span>
                    <span className="font-bold text-indigo-300">{Math.round(compWeight * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.5"
                    step="0.05"
                    value={compWeight}
                    onChange={(e) => setCompWeight(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Purchasing Power</span>
                    <span className="font-bold text-indigo-300">{Math.round(incomeWeight * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.4"
                    step="0.05"
                    value={incomeWeight}
                    onChange={(e) => setIncomeWeight(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">5-Yr Growth Rate</span>
                    <span className="font-bold text-indigo-300">{Math.round(growthWeight * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.3"
                    step="0.05"
                    value={growthWeight}
                    onChange={(e) => setGrowthWeight(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Results League Table */}
          <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                Top Ranked Municipalities for {BUSINESS_CATEGORIES.find(c => c.id === selectedCategory)?.name}
              </h3>
              <ExportButton 
                data={workflowAResults.map((r, idx) => ({
                  Rank: idx + 1,
                  Municipality: r.cityName,
                  'Opportunity Score': r.opportunityScore,
                  'Demand Score': r.demandScore || r.scoreComponents?.demandScore || 80,
                  'Saturation Index': r.saturationIndex || r.competitorsPer10kPop || 2.5,
                  'Median Income': `$${Number(r.medianIncome || r.medianHouseholdIncome || 95000).toLocaleString()}`,
                  'Competitor Count': r.competitorCount,
                  'Est Annual Revenue': `$${Number(r.estimatedRevenue || 750000).toLocaleString()}`
                }))} 
                filename={`top_cities_${selectedCategory}`} 
                label="Export Ranking" 
              />
            </div>

            {loadingA ? (
              <div className="p-12 text-center text-slate-400 animate-pulse">
                Ranking Ontario Census Subdivisions based on dynamic weights...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4 w-16">Rank</th>
                      <th className="py-3 px-4">Municipality</th>
                      <th className="py-3 px-4 text-right">Opportunity Score</th>
                      <th className="py-3 px-4 text-right">Market Demand</th>
                      <th className="py-3 px-4 text-right">Competitor Density</th>
                      <th className="py-3 px-4 text-right">Median Income</th>
                      <th className="py-3 px-4 text-right">Competitors</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {workflowAResults.map((r, idx) => {
                      const dScore = r.demandScore || r.scoreComponents?.demandScore || 80;
                      const sat = r.saturationIndex || r.competitorsPer10kPop || 2.5;
                      const inc = r.medianIncome || r.medianHouseholdIncome || 95000;

                      return (
                        <tr 
                          key={r.geographyId} 
                          className="hover:bg-slate-900/50 transition-colors cursor-pointer"
                          onClick={() => {
                            setContributingData({
                              title: `${r.cityName} Feasibility Metrics for ${selectedCategory.replace('_', ' ')}`,
                              metricLabel: 'Opportunity Feasibility Score',
                              value: `${r.opportunityScore}/100`,
                              percentageOfTotal: `Rank #${idx + 1} of 444`,
                              benchmarkValue: `$${Number(inc).toLocaleString()}`,
                              benchmarkLabel: 'Median Household Income',
                              deltaPct: Math.round(((inc - 95000) / 95000) * 100),
                              sourceLineage: 'StatCan 2021 Census & OSM Geographic Survey',
                              referenceYear: '2021 / 2025-Q4',
                              contextDrivers: r.strengths || [r.evidenceSummary],
                              onClose: () => setContributingData(null)
                            });
                          }}
                        >
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              idx === 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                              idx === 1 ? 'bg-slate-300/20 text-slate-200 border border-slate-400/40' :
                              idx === 2 ? 'bg-amber-700/20 text-amber-500 border border-amber-700/40' :
                              'text-slate-400'
                            }`}>
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-white">{r.cityName}</td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-extrabold text-emerald-400 text-sm">{r.opportunityScore}</span>
                            <span className="text-slate-400 text-xs font-normal">/100</span>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-white">{dScore}</td>
                          <td className="py-3 px-4 text-right">
                            <span className={sat < 2.5 ? 'text-emerald-400' : 'text-amber-400'}>
                              {sat} / 10k
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-medium">${Number(inc).toLocaleString()}</td>
                          <td className="py-3 px-4 text-right">{r.competitorCount}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDetail({ cityId: r.geographyId, categoryId: selectedCategory, cityName: r.cityName });
                              }}
                              className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
                            >
                              Deep Dive
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
        </div>
      )}

      {/* Feature-Wide Outliers Section */}
      <FeatureOutliersSection
        category="business"
        cityId={selectedCityId}
        title="Commercial Saturation & Opportunity Outliers"
        subtitle="Empirical statistical divergences in establishment density, competitor voids, and commercial leasing variance across Ontario."
        onSelectCity={(cid) => {
          onSelectCity(cid);
          setSelectedCityId(cid);
        }}
      />

      {/* ========================================================================= */}
      {/* CATEGORY DEEP DIVE MODAL / DRAWER                                         */}
      {/* ========================================================================= */}
      {activeDetail && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setActiveDetail(null)}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-detail-title"
            className="liquid-glass-modal rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-slate-900/90 backdrop-blur-md z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-indigo-950/90 text-indigo-300 border border-indigo-700/80">
                    Category Opportunity Intelligence
                  </span>
                  <ResolutionBadge resolution="CSD" />
                </div>
                <h3 id="category-detail-title" className="text-xl font-bold text-white tracking-tight">
                  {BUSINESS_CATEGORIES.find(c => c.id === activeDetail.categoryId)?.name || activeDetail.categoryId} in {activeDetail.cityName || activeDetail.cityId.replace('CSD_', '')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveDetail(null)}
                className="p-2 min-h-[36px] min-w-[36px] rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center"
                aria-label="Close category opportunity modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {loadingDetail || !detailData ? (
                <div className="p-12 text-center text-slate-400 animate-pulse">
                  Loading verified unit economics, commercial rent, and competitor locations...
                </div>
              ) : (
                <>
                  {/* Revenue Benchmark Chain Card */}
                  <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                        Verified Revenue Benchmark Chain
                      </h4>
                      <ResolutionBadge 
                        resolution={detailData.revenueBenchmarkChain?.geographic_resolution || 'PROVINCE'} 
                        benchmarkLabel={detailData.revenueBenchmarkChain?.benchmark_note || 'Ontario benchmark'} 
                      />
                    </div>

                    {detailData.revenueBenchmarkChain ? (
                      <div>
                        <div className="grid grid-cols-3 gap-3 my-2 text-xs">
                          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                            <span className="text-slate-400 block mb-1">25th Percentile Revenue</span>
                            <span className="text-base font-bold text-white">
                              ${Number(detailData.revenueBenchmarkChain.p25_revenue_cad).toLocaleString()}
                            </span>
                          </div>
                          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                            <span className="text-slate-400 block mb-1">Median Revenue</span>
                            <span className="text-base font-bold text-emerald-400">
                              ${Number(detailData.revenueBenchmarkChain.median_revenue_cad).toLocaleString()}
                            </span>
                          </div>
                          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                            <span className="text-slate-400 block mb-1">75th Percentile Revenue</span>
                            <span className="text-base font-bold text-indigo-300">
                              ${Number(detailData.revenueBenchmarkChain.p75_revenue_cad).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="text-xs text-slate-400 space-y-1 mt-3 pt-3 border-t border-slate-800">
                          <div>
                            <strong>Primary Lineage:</strong> {detailData.revenueBenchmarkChain.source_statcan_table} (Statistics Canada Annual Survey of Service Industries)
                          </div>
                          <div>
                            <strong>Public Filing Cross-Check:</strong> {detailData.revenueBenchmarkChain.source_sedar_filing}
                          </div>
                          <div className="text-slate-500 italic mt-1">
                            &quot;{detailData.revenueBenchmarkChain.methodology_notes}&quot;
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">Revenue benchmark chain not available.</div>
                    )}
                  </div>

                  {/* Commercial Real Estate Lease Estimates */}
                  <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Building className="w-4 h-4 text-blue-400" />
                        Commercial Real Estate Lease Benchmarks
                      </h4>
                      <ResolutionBadge resolution="CSD" />
                    </div>

                    {detailData.commercialRealEstate ? (
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                          <span className="text-slate-300 block mb-1 font-medium">Net Base Rent</span>
                          <span className="text-base font-bold text-white">
                            ${Number(detailData.commercialRealEstate.avg_retail_rent_sqft_net).toFixed(2)}
                          </span>
                          <span className="text-xs text-slate-400 block mt-0.5">CAD / sq. ft / year (NNN)</span>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                          <span className="text-slate-300 block mb-1 font-medium">Additional TMI (Taxes/Maint)</span>
                          <span className="text-base font-bold text-white">
                            ${Number(detailData.commercialRealEstate.avg_tmi_sqft).toFixed(2)}
                          </span>
                          <span className="text-xs text-slate-400 block mt-0.5">CAD / sq. ft / year</span>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                          <span className="text-slate-300 block mb-1 font-medium">Commercial Vacancy</span>
                          <span className="text-base font-bold text-indigo-300">
                            {detailData.commercialRealEstate.retail_vacancy_rate_pct}%
                          </span>
                          <span className="text-xs text-slate-400 block mt-0.5">Local retail availability</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">Commercial lease data not available for this municipality.</div>
                    )}
                  </div>

                  {/* Verified OSM-Listed Competitors */}
                  <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          OSM-Listed Competitor Locations ({detailData.competitorLocations?.length || 0})
                        </h4>
                        <span className="text-xs text-amber-300 font-medium">
                          Notice: OSM-listed locations reflect open geographic survey and may not represent a complete census.
                        </span>
                      </div>
                    </div>

                    <div className="overflow-y-auto max-h-48 border border-slate-800 rounded-lg">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-900 text-slate-300 uppercase tracking-wider border-b border-slate-800">
                          <tr>
                            <th className="py-2.5 px-3">Establishment</th>
                            <th className="py-2.5 px-3">Type</th>
                            <th className="py-2.5 px-3">Address</th>
                            <th className="py-2.5 px-3 text-right">Coordinates</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                          {(detailData.competitorLocations || []).map((comp: any) => (
                            <tr key={comp.id}>
                              <td className="py-2 px-3 font-semibold text-white">{comp.name}</td>
                              <td className="py-2 px-3">
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                  comp.is_chain ? 'bg-purple-950/90 text-purple-300 border border-purple-700/60' : 'bg-slate-800 text-slate-200'
                                }`}>
                                  {comp.is_chain ? 'Franchise / Chain' : 'Independent'}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-slate-300 truncate max-w-[180px]">{comp.address}</td>
                              <td className="py-2 px-3 text-right font-mono text-xs text-slate-400">
                                {Number(comp.latitude).toFixed(4)}, {Number(comp.longitude).toFixed(4)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/60">
              <button
                type="button"
                onClick={() => {
                  if (activeDetail) onSelectCity(activeDetail.cityId);
                  setActiveDetail(null);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Go to City Intelligence Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
