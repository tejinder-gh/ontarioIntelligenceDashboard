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
  Search,
  Image as ImageIcon 
} from 'lucide-react';
import { ResolutionBadge } from '../components/ResolutionBadge.js';
import { ExportButton } from '../components/ExportButton.js';
import { MetricTooltip } from '../components/MetricTooltip.js';
import { BusinessVisualSelector } from '../components/BusinessVisualSelector.js';
import { ContributingDataInspector, ContributingDataProps } from '../components/ContributingDataInspector.js';
import { FeatureOutliersSection } from '../components/FeatureOutliersSection.js';
import { FeasibilityDossierModal } from '../components/FeasibilityDossierModal.js';

interface OpportunityLabViewProps {
  cityId: string;
  onSelectCity: (cityId: string) => void;
}

const getIconForCategory = (catId: string): string => {
  const iconMap: Record<string, string> = {
    pizza_store: '🍕',
    full_service_restaurant: '🍽️',
    coffee_shop: '☕',
    tutoring_centre: '📚',
    fitness_centre: '🏋️',
    child_daycare: '👶',
    automotive_repair: '🚗',
    dental_clinic: '🦷',
    medical_clinic: '🏥',
    hair_salon: '💇',
    pet_services: '🐾',
    pharmacy: '💊',
    grocery_specialty: '🥖',
    bakery: '🥐',
    brewery: '🍺',
    plumbing_contractor: '🔧',
    legal_services: '⚖️',
    accounting_services: '📊',
    optometrist: '👓',
    dry_cleaner: '👔'
  };
  return iconMap[catId] || '🏢';
};

export const OpportunityLabView: React.FC<OpportunityLabViewProps> = ({ cityId, onSelectCity }) => {
  const [workflow, setWorkflow] = useState<'VISUAL' | 'B' | 'A'>('VISUAL'); // Default to Visual Picture & Keyword Mapping Matrix
  
  // Workflow A State ("I know the business")
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [demandWeight, setDemandWeight] = useState<number>(0.25);
  const [compWeight, setCompWeight] = useState<number>(0.25);
  const [incomeWeight, setIncomeWeight] = useState<number>(0.20);
  const [growthWeight, setGrowthWeight] = useState<number>(0.10);
  const [costWeight, setCostWeight] = useState<number>(0.10);
  const [laborWeight, setLaborWeight] = useState<number>(0.10);
  const [minPopulation, setMinPopulation] = useState<number>(0);
  const [workflowAResults, setWorkflowAResults] = useState<any[]>([]);
  const [loadingA, setLoadingA] = useState(false);

  // Dynamic Business Taxonomy & Autocomplete State (Derived from Database API)
  const [categories, setCategories] = useState<{ id: string; name: string; icon?: string; naicsCode?: string }[]>([]);
  const [autocompleteQuery, setAutocompleteQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    fetch('/api/taxonomy/categories')
      .then(res => res.json())
      .then(d => {
        if (d.categories && d.categories.length > 0) {
          const mapped = d.categories.map((c: any) => ({
            id: c.id,
            name: c.displayName || c.name || c.id,
            icon: getIconForCategory(c.id),
            naicsCode: c.naicsCode
          }));
          setCategories(mapped);
          setSelectedCategory(prev => prev || mapped[0].id);
        }
      })
      .catch(err => console.error('Error fetching dynamic taxonomy categories:', err));
  }, []);

  useEffect(() => {
    if (!autocompleteQuery || autocompleteQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/taxonomy/search?q=${encodeURIComponent(autocompleteQuery.trim())}&limit=8`)
        .then(res => res.json())
        .then(d => setSuggestions(d.suggestions || []))
        .catch(err => console.error('Error fetching taxonomy suggestions:', err));
    }, 200);
    return () => clearTimeout(timer);
  }, [autocompleteQuery]);

  const getCategoryName = (id: string) => {
    const found = categories.find(c => c.id === id);
    return found ? found.name : id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getCategoryIcon = (id: string) => {
    const found = categories.find(c => c.id === id);
    return found?.icon || getIconForCategory(id);
  };

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
  const [modalContributingData, setModalContributingData] = useState<ContributingDataProps | null>(null);

  // Dynamic list of geographies for Workflow B selection
  const [availableCities, setAvailableCities] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch('/api/geographies?limit=200')
      .then(res => res.json())
      .then(json => {
        if (json.data && Array.isArray(json.data)) {
          setAvailableCities(json.data.map((g: any) => ({
            id: g.id,
            name: `${g.name}${g.csd_type ? ` (${g.csd_type})` : ''}`
          })));
        }
      })
      .catch(err => console.error('Error fetching dynamic geographies:', err));
  }, []);

  // Feasibility Dossier Modal State (Amendment #8 & T-008)
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);
  const [dossierCityId, setDossierCityId] = useState<string>(cityId);
  const [dossierCategoryId, setDossierCategoryId] = useState<string>(selectedCategory || '');
  const [dossierCityName, setDossierCityName] = useState<string>(cityId.replace('CSD_', ''));

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
        growth: growthWeight.toString(),
        operatingCost: costWeight.toString(),
        labor: laborWeight.toString(),
        minPopulation: minPopulation.toString()
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
  }, [workflow, selectedCategory, demandWeight, compWeight, incomeWeight, growthWeight, costWeight, laborWeight, minPopulation]);

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
      setModalContributingData(null);
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
    const oppScore = rec.opportunityScore !== undefined && rec.opportunityScore !== null ? rec.opportunityScore : null;
    const revMedian = rec.revenueBenchmarkRange?.median || rec.estimatedAnnualRevenueCAD?.median || null;
    const density = rec.competitorDensity !== undefined ? rec.competitorDensity : (rec.countPer10kPop !== undefined ? rec.countPer10kPop : null);
    const peerBench = rec.peerBenchmarkPer10kPop ?? null;
    const gapIndex = rec.gapIndex ?? null;
    const capexMin = rec.typicalInvestmentCAD?.min ?? null;
    const capexMax = rec.typicalInvestmentCAD?.max ?? null;

    setContributingData({
      title: `${rec.categoryName} Feasibility Breakdown in ${selectedCityId.replace('CSD_', '')}`,
      category: 'Market Opportunity & Feasibility',
      metricLabel: 'Opportunity Feasibility Score',
      value: oppScore !== null ? `${oppScore}/100` : '—',
      percentageOfTotal: gapIndex ? `+${gapIndex}x Gap Index` : 'Market Gap Under Evaluation',
      benchmarkValue: peerBench ? `${peerBench} stores / 10k pop` : 'Provincial Saturation Baseline',
      benchmarkLabel: 'Ontario Peer Saturation Benchmark',
      deltaPct: gapIndex ? Math.round((gapIndex - 1) * 100) : 0,
      sourceLineage: `StatCan NAICS ${rec.naicsCode} & Survey of Service Industries`,
      referenceYear: '2021 Census & 2025 Commercial Registry',
      provenance: {
        sourceName: 'Statistics Canada / OSM Commercial Directory',
        datasetCode: `NAICS_${rec.naicsCode}`,
        referencePeriod: '2021 Census / 2025-Q4 Commercial Registry',
        resolution: 'CSD',
        confidence: 'OFFICIAL_CENSUS',
        sourceUrl: 'https://www12.statcan.gc.ca/'
      },
      contextDrivers: [
        rec.rationale || (density !== null ? `Evaluated against ${density} existing competitors per 10k residents.` : 'Evaluated against municipal commercial establishment footprint.'),
        revMedian ? `Estimated Median Unit Revenue: $${Number(revMedian).toLocaleString()} CAD / yr` : 'Revenue benchmarks calculated on deep dive via audited filings.',
        (capexMin && capexMax)
          ? `Typical Initial Capital Investment: $${Number(capexMin).toLocaleString()} – $${Number(capexMax).toLocaleString()} CAD`
          : 'Capital requirements dynamically evaluated in unit economics modal.',
        ...(rec.keyDrivers || [])
      ],
      decisionImplications: [
        {
          heading: 'Market Entry Viability',
          insight: gapIndex
            ? `With a +${gapIndex}x gap index, local demand outstrips current physical retail capacity, indicating room for profitable new market entrants.`
            : 'Evaluating local demand versus commercial capacity.',
          impact: 'positive'
        },
        {
          heading: 'Revenue Realization & Debt Coverage',
          insight: revMedian
            ? `Median unit revenue of $${Number(revMedian).toLocaleString()} CAD supports targeted debt service coverage ratios (DSCR > 1.35x) assuming occupancy costs remain under 8.5% of gross sales.`
            : 'Revenue realization targets calculated against provincial benchmarks.',
          impact: 'neutral'
        },
        {
          heading: 'Competitor Density Baseline',
          insight: (density !== null && peerBench)
            ? `At ${density} locations per 10k residents compared to the Ontario peer average of ${peerBench}/10k, saturation risk is ${density < peerBench ? 'minimal' : 'moderate'}.`
            : 'Competitor footprint mapped against provincial peer baselines.',
          impact: (density !== null && peerBench && density >= peerBench) ? 'warning' : 'positive'
        }
      ],
      strategicRecommendations: [
        `Target site selection in high-density residential subdivisions or primary commercial transit corridors in ${selectedCityId.replace('CSD_', '')}.`,
        `Model 3-year cash flow projections using conservative 25th percentile revenue targets to verify operational solvency during initial customer acquisition.`,
        `Align product pricing and service tiering with municipal median household income and disposable spending capacity.`
      ],
      riskMitigations: [
        `Cap gross rent (base + TMI) at no more than 8-10% of projected annual gross sales to safeguard operational profit margins.`,
        `Seek landlord tenant improvement allowances (TI) of $25–$45/sq. ft to offset fit-out and HVAC capital expenditures.`,
        `Maintain a minimum of 6 to 9 months operating cash reserve to insulate against supplier inflation and localized demand shifts.`
      ],
      actionLink: {
        label: `Inspect ${rec.categoryName} Unit Economics & Competitor List`,
        onClick: () => setActiveDetail({ cityId: selectedCityId, categoryId: rec.categoryId, cityName: rec.cityName })
      },
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

        <button
          type="button"
          onClick={() => {
            setDossierCityId(selectedCityId || cityId);
            setDossierCategoryId(selectedCategory);
            setDossierCityName(selectedCityId?.replace('CSD_', '') || 'Burlington');
            setIsDossierOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20 transition-all active:scale-[0.98]"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Feasibility Dossier ($199 CAD)</span>
        </button>
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
          onInspectMetric={(props) => setContributingData(props)}
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
                  className="bg-slate-900 border border-slate-700 text-white font-bold text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 max-w-xs"
                >
                  {availableCities.length > 0 ? (
                    availableCities.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))
                  ) : (
                    <option value={selectedCityId}>{selectedCityId.replace('CSD_', '')}</option>
                  )}
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
                'Demand Score': r.demandScore ?? r.scoreComponents?.demandScore ?? '—',
                'Competition Score': r.competitionScore ?? r.scoreComponents?.competitionScore ?? '—',
                'Success Probability': (r.successProbability || 'HIGH').replace('_', ' '),
                'Median Revenue Benchmark': (r.revenueBenchmarkRange?.median || r.estimatedAnnualRevenueCAD?.median)
                  ? `$${Number(r.revenueBenchmarkRange?.median || r.estimatedAnnualRevenueCAD?.median).toLocaleString()}`
                  : '—'
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
                const medianRev = rec.revenueBenchmarkRange?.median || rec.estimatedAnnualRevenueCAD?.median || null;
                const density = rec.competitorDensity !== undefined ? rec.competitorDensity : (rec.countPer10kPop !== undefined ? rec.countPer10kPop : null);

                return (
                  <div 
                    key={rec.categoryId}
                    className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-indigo-500/60 transition-all shadow-md group cursor-pointer active:scale-[0.99] relative"
                    onClick={() => handleCardClick(rec)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl p-2 rounded-lg bg-slate-900 border border-slate-800">
                          {getCategoryIcon(rec.categoryId)}
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
                        <span className="text-xs text-slate-300 font-medium block mt-1">Score: {rec.opportunityScore}/100</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 my-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
                      <div>
                        <span className="text-slate-400 block mb-0.5">Market Gap Index</span>
                        <span className="font-bold text-emerald-400">+{rec.gapIndex}x</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Demand Score</span>
                        <span className="font-semibold text-white">
                          {rec.demandScore ?? rec.scoreComponents?.demandScore ?? '—'}/100
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Competitor Density</span>
                        <span className="font-semibold text-indigo-300">
                          {density !== null ? `${density} / 10k` : '—'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
                      <span className="text-slate-400">
                        Annual Revenue: <strong className="text-white">{medianRev ? `$${(medianRev / 1000).toFixed(0)}k` : '—'}</strong>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500 group-hover:text-indigo-400 transition-colors">
                          Click to inspect strategy
                        </span>
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
            <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="w-full sm:w-auto flex-1 max-w-xl space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  Search or Select Business Category:
                </label>
                <div className="flex flex-col sm:flex-row gap-2 relative">
                  {/* Autocomplete Input */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Type a business (e.g. pizza, mechanic, daycare, gym)..."
                      value={autocompleteQuery}
                      onChange={(e) => {
                        setAutocompleteQuery(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg pl-9 pr-3 py-2 w-full focus:outline-none focus:border-indigo-500"
                    />
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                        {suggestions.map((s: any) => (
                          <button
                            key={s.id || s.canonicalId}
                            type="button"
                            onClick={() => {
                              setSelectedCategory(s.canonicalId || s.id);
                              setAutocompleteQuery('');
                              setShowSuggestions(false);
                            }}
                            className="w-full text-left px-3 py-2.5 hover:bg-indigo-600/30 border-b border-slate-800/60 last:border-b-0 flex items-center justify-between text-xs"
                          >
                            <span className="font-semibold text-white flex items-center gap-2">
                              <span>{getCategoryIcon(s.canonicalId || s.id)}</span>
                              <span>{s.displayName || s.name || s.term}</span>
                            </span>
                            {s.naicsCode && (
                              <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-800/50">
                                NAICS {s.naicsCode}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Dynamic Category Select */}
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-white font-semibold text-sm rounded-lg px-3 py-2 sm:w-64 focus:outline-none focus:border-indigo-500"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.icon || getCategoryIcon(c.id)} {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="text-xs text-slate-400 max-w-xs mt-1">
                Ranks all 444 Ontario Census Subdivisions to identify municipalities with peak purchasing power, high household formation, and minimal competitor saturation.
              </div>
            </div>

            {/* 6-Factor Transparent Weight Sliders (Requirement 17) */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                Multi-Criteria Feasibility Weights (Total: {Math.round((demandWeight + compWeight + incomeWeight + growthWeight + costWeight + laborWeight) * 100)}%)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
                {/* 1. Demand */}
                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400 truncate" title="Demand & Population Base">Demand</span>
                    <span className="font-bold text-indigo-300">{Math.round(demandWeight * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.5"
                    step="0.05"
                    value={demandWeight}
                    onChange={(e) => setDemandWeight(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                {/* 2. Competition */}
                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400 truncate" title="Saturation & Competitor Density">Competition</span>
                    <span className="font-bold text-indigo-300">{Math.round(compWeight * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.5"
                    step="0.05"
                    value={compWeight}
                    onChange={(e) => setCompWeight(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                {/* 3. Purchasing Power */}
                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400 truncate" title="Median Household Income">Purchasing</span>
                    <span className="font-bold text-indigo-300">{Math.round(incomeWeight * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.4"
                    step="0.05"
                    value={incomeWeight}
                    onChange={(e) => setIncomeWeight(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                {/* 4. Growth */}
                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400 truncate" title="5-Year Population Trajectory">Growth</span>
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

                {/* 5. Operating Cost */}
                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400 truncate" title="Commercial Lease Rates & Taxes">Operating Cost</span>
                    <span className="font-bold text-indigo-300">{Math.round(costWeight * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.3"
                    step="0.05"
                    value={costWeight}
                    onChange={(e) => setCostWeight(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                {/* 6. Labour Availability */}
                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400 truncate" title="Labor Force Participation & Talent Pool">Labour Pool</span>
                    <span className="font-bold text-indigo-300">{Math.round(laborWeight * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.3"
                    step="0.05"
                    value={laborWeight}
                    onChange={(e) => setLaborWeight(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>
              </div>

              {/* Municipal Scale Population Filter */}
              <div className="p-3 bg-slate-900/70 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between gap-3 mt-3">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-semibold text-slate-300">
                    Municipal Scale Filter: <strong className="text-indigo-300">{minPopulation === 0 ? 'All Municipalities (0+)' : `${minPopulation.toLocaleString()}+ residents`}</strong>
                  </span>
                  <span className="text-[10px] text-slate-400 hidden sm:inline">
                    (Enables discovery of small & mid-sized Ontario communities)
                  </span>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="flex items-center gap-1">
                    {[0, 10000, 25000, 50000, 100000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setMinPopulation(preset)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                          minPopulation === preset
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {preset === 0 ? 'All' : `${preset / 1000}k+`}
                      </button>
                    ))}
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100000"
                    step="5000"
                    value={minPopulation}
                    onChange={(e) => setMinPopulation(parseInt(e.target.value))}
                    className="w-28 accent-indigo-500"
                    title="Adjust minimum population threshold"
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
                Top Ranked Municipalities for {getCategoryName(selectedCategory)}
              </h3>
              <ExportButton 
                data={workflowAResults.map((r, idx) => ({
                  Rank: idx + 1,
                  Municipality: r.cityName,
                  'Opportunity Score': r.opportunityScore,
                  'Demand Score': r.demandScore ?? r.scoreComponents?.demandScore ?? '—',
                  'Saturation Index': r.saturationIndex ?? r.competitorsPer10kPop ?? '—',
                  'Median Income': (r.medianIncome || r.medianHouseholdIncome) ? `$${Number(r.medianIncome || r.medianHouseholdIncome).toLocaleString()}` : '—',
                  'Competitor Count': r.competitorCount ?? '—',
                  'Est Annual Revenue': r.estimatedRevenue ? `$${Number(r.estimatedRevenue).toLocaleString()}` : '—'
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
                      const dScore = r.demandScore ?? r.scoreComponents?.demandScore ?? '—';
                      const sat = r.saturationIndex ?? r.competitorsPer10kPop ?? null;
                      const inc = r.medianIncome ?? r.medianHouseholdIncome ?? null;

                      return (
                        <tr 
                          key={r.geographyId} 
                          className="hover:bg-slate-800/60 transition-colors cursor-pointer group"
                          onClick={() => {
                            setContributingData({
                              title: `${r.cityName} Feasibility Metrics for ${selectedCategory.replace('_', ' ')}`,
                              category: 'Multi-Criteria Feasibility',
                              metricLabel: 'Opportunity Feasibility Score',
                              value: `${r.opportunityScore}/100`,
                              percentageOfTotal: `Rank #${idx + 1} of 444 Ontario Municipalities`,
                              benchmarkValue: inc ? `$${Number(inc).toLocaleString()}` : 'Provincial Census Data',
                              benchmarkLabel: 'Median Household Income',
                              deltaPct: inc ? Math.round(((inc - 95000) / 95000) * 100) : 0,
                              sourceLineage: 'StatCan 2021 Census & OSM Geographic Survey',
                              referenceYear: '2021 / 2025-Q4',
                              provenance: {
                                sourceName: 'Statistics Canada / OSM Commercial Directory',
                                datasetCode: 'FEASIBILITY_ENGINE_V2',
                                referencePeriod: '2021 Census / 2025-Q4',
                                resolution: 'CSD',
                                confidence: 'OFFICIAL_CENSUS',
                                sourceUrl: 'https://www12.statcan.gc.ca/'
                              },
                              contextDrivers: r.strengths || [r.evidenceSummary],
                              decisionImplications: [
                                {
                                  heading: `Rank #${idx + 1} Provincial Standing`,
                                  insight: `${r.cityName} ranks among top Ontario municipalities for ${selectedCategory.replace('_', ' ')} based on demand weight (${Math.round(demandWeight * 100)}%) and purchasing power (${Math.round(incomeWeight * 100)}%).`,
                                  impact: 'positive'
                                },
                                {
                                  heading: 'Household Income Support',
                                  insight: inc 
                                    ? `Median household income of $${Number(inc).toLocaleString()} represents significant disposable capacity for discretionary services.`
                                    : 'Median household income reflects local purchasing power.',
                                  impact: 'positive'
                                },
                                {
                                  heading: 'Saturation & Density',
                                  insight: sat !== null
                                    ? `Competitor density of ${sat} / 10k residents indicates manageable entry barriers.`
                                    : 'Competitor footprint mapped against local demographic base.',
                                  impact: (sat !== null && sat < 2.5) ? 'positive' : 'warning'
                                }
                              ],
                              strategicRecommendations: [
                                `Focus site selection along commercial arteries with proximity to high-density residential subdivisions in ${r.cityName}.`,
                                `Engage the local municipal economic development department regarding fast-track commercial permitting or Community Improvement Plan (CIP) incentives.`
                              ],
                              riskMitigations: [
                                `Diligence municipal commercial property tax assessments and local utility hook-up fees before finalizing lease covenants.`,
                                `Stress-test unit business pro-forma financials against 25th percentile revenue thresholds.`
                              ],
                              actionLink: {
                                label: `Inspect Competitors & Unit Economics for ${r.cityName}`,
                                onClick: () => setActiveDetail({ cityId: r.geographyId, categoryId: selectedCategory, cityName: r.cityName })
                              },
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
                            <div className="flex flex-col items-end">
                              <div>
                                <span className="font-extrabold text-emerald-400 text-sm">{r.opportunityScore}</span>
                                <span className="text-slate-400 text-xs font-normal">/100</span>
                              </div>
                              {r.scoreComponents && (
                                <div className="flex items-center gap-1 text-[9px] font-mono text-slate-400 mt-0.5">
                                  <span title={`Demand Score: ${r.scoreComponents.demandScore}`} className="text-indigo-300">D:{r.scoreComponents.demandScore}</span>
                                  <span>•</span>
                                  <span title={`Competition Score: ${r.scoreComponents.competitionScore}`} className="text-purple-300">C:{r.scoreComponents.competitionScore}</span>
                                  <span>•</span>
                                  <span title={`Purchasing Power: ${r.scoreComponents.purchasingPowerScore}`} className="text-emerald-300">P:{r.scoreComponents.purchasingPowerScore}</span>
                                  <span>•</span>
                                  <span title={`Growth Score: ${r.scoreComponents.growthScore}`} className="text-blue-300">G:{r.scoreComponents.growthScore}</span>
                                  <span>•</span>
                                  <span title={`Operating Cost: ${r.scoreComponents.operatingCostScore}`} className="text-amber-300">O:{r.scoreComponents.operatingCostScore}</span>
                                  <span>•</span>
                                  <span title={`Labour Pool: ${r.scoreComponents.laborScore}`} className="text-teal-300">L:{r.scoreComponents.laborScore}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-white">{dScore}</td>
                          <td className="py-3 px-4 text-right">
                            <span className={sat !== null ? (sat < 2.5 ? 'text-emerald-400' : 'text-amber-400') : 'text-slate-400'}>
                              {sat !== null ? `${sat} / 10k` : '—'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-medium">{inc ? `$${Number(inc).toLocaleString()}` : '—'}</td>
                          <td className="py-3 px-4 text-right">{r.competitorCount ?? '—'}</td>
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
                  {getCategoryName(activeDetail.categoryId)} in {activeDetail.cityName || activeDetail.cityId.replace('CSD_', '')}
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
              {/* Modal Contributing Data Inspector (if active) */}
              {modalContributingData && (
                <ContributingDataInspector {...modalContributingData} />
              )}

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
                        <span className="text-[11px] font-normal text-slate-400">
                          (Click any percentile card to inspect unit economics)
                        </span>
                      </h4>
                      <ResolutionBadge 
                        resolution={detailData.revenueBenchmarkChain?.geographic_resolution || 'PROVINCE'} 
                        benchmarkLabel={detailData.revenueBenchmarkChain?.benchmark_note || 'Ontario benchmark'} 
                      />
                    </div>

                    {detailData.revenueBenchmarkChain ? (
                      <div>
                        <div className="grid grid-cols-3 gap-3 my-2 text-xs">
                          {/* P25 Card */}
                          <div 
                            className="p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500/60 hover:bg-slate-850 transition-all cursor-pointer group active:scale-[0.98] relative"
                            onClick={() => {
                              const p25 = Number(detailData.revenueBenchmarkChain.p25_revenue_cad);
                              const med = Number(detailData.revenueBenchmarkChain.median_revenue_cad);
                              setModalContributingData({
                                title: `P25 Downside Revenue Stress Test (${getCategoryName(activeDetail.categoryId)})`,
                                category: 'Unit Economics Stress Test',
                                metricLabel: '25th Percentile Revenue (Downside Base)',
                                value: `$${p25.toLocaleString()} CAD`,
                                unit: 'CAD/yr',
                                percentageOfTotal: 'Lower 25% of provincial operators',
                                benchmarkValue: `$${med.toLocaleString()} CAD`,
                                benchmarkLabel: 'Ontario Median Unit Revenue',
                                deltaPct: Math.round(((p25 - med) / med) * 100),
                                sourceLineage: `${detailData.revenueBenchmarkChain.source_statcan_table} & ${detailData.revenueBenchmarkChain.source_sedar_filing}`,
                                referenceYear: '2023-2025 Audited Filings',
                                provenance: {
                                  sourceName: detailData.revenueBenchmarkChain.source_statcan_table,
                                  datasetCode: 'SEDAR_STATCAN_REVENUE_CHAIN',
                                  referencePeriod: '2023-2025 filings',
                                  resolution: 'PROVINCE',
                                  confidence: 'SEDAR_PUBLIC_FILINGS',
                                  sourceUrl: 'https://www.sedarplus.ca/'
                                },
                                contextDrivers: [
                                  `Methodology: ${detailData.revenueBenchmarkChain.methodology_notes}`,
                                  `SEDAR public disclosure filing cross-check: ${detailData.revenueBenchmarkChain.source_sedar_filing}`,
                                  `Downside baseline models single-unit operation during initial customer acquisition or secondary retail corridor placement.`
                                ],
                                decisionImplications: [
                                  {
                                    heading: 'Solvency & Debt Service Coverage (DSCR)',
                                    insight: `At $${p25.toLocaleString()} CAD in gross receipts, debt service coverage must be modeled strictly to confirm unit can service principal and interest obligations.`,
                                    impact: 'warning'
                                  },
                                  {
                                    heading: 'Fixed Cost Rent Ceiling',
                                    insight: `To ensure viability at P25 volume, annual gross occupancy cost (base rent + TMI) should not exceed 8-9% of revenue ($${Math.round(p25 * 0.085).toLocaleString()} CAD/yr).`,
                                    impact: 'neutral'
                                  }
                                ],
                                strategicRecommendations: [
                                  'Capitalize working capital reserves for a minimum of 9 months operating at P25 volume.',
                                  'Negotiate step-up rent or initial rent abatement (free rent period) during lease execution.',
                                  'Keep full-time labor commitments flexible by utilizing cross-trained part-time staff during ramp-up.'
                                ],
                                riskMitigations: [
                                  'Insert percentage-rent lease clauses with low base minimums to limit downside cash drain.',
                                  'Maintain conservative supplier terms (Net 30/60) to protect operating cash flow.'
                                ],
                                onClose: () => setModalContributingData(null)
                              });
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 block mb-1">25th Percentile Revenue</span>
                              <span className="text-[10px] text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">Inspect</span>
                            </div>
                            <span className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                              ${Number(detailData.revenueBenchmarkChain.p25_revenue_cad).toLocaleString()}
                            </span>
                          </div>

                          {/* Median Card */}
                          <div 
                            className="p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500/60 hover:bg-slate-850 transition-all cursor-pointer group active:scale-[0.98] relative"
                            onClick={() => {
                              const med = Number(detailData.revenueBenchmarkChain.median_revenue_cad);
                              setModalContributingData({
                                title: `Median Unit Revenue Target (${getCategoryName(activeDetail.categoryId)})`,
                                category: 'Baseline Unit Economics',
                                metricLabel: 'Median Annual Unit Revenue',
                                value: `$${med.toLocaleString()} CAD`,
                                unit: 'CAD/yr',
                                percentageOfTotal: '50th percentile (provincial median)',
                                benchmarkValue: `$${med.toLocaleString()} CAD`,
                                benchmarkLabel: 'Ontario Median Benchmark',
                                deltaPct: 0,
                                sourceLineage: `${detailData.revenueBenchmarkChain.source_statcan_table} & ${detailData.revenueBenchmarkChain.source_sedar_filing}`,
                                referenceYear: '2023-2025 Audited Filings',
                                provenance: {
                                  sourceName: detailData.revenueBenchmarkChain.source_statcan_table,
                                  datasetCode: 'SEDAR_STATCAN_REVENUE_CHAIN',
                                  referencePeriod: '2023-2025 filings',
                                  resolution: 'PROVINCE',
                                  confidence: 'SEDAR_PUBLIC_FILINGS',
                                  sourceUrl: 'https://www.sedarplus.ca/'
                                },
                                contextDrivers: [
                                  `Methodology: ${detailData.revenueBenchmarkChain.methodology_notes}`,
                                  `Public SEDAR Franchise Filings: ${detailData.revenueBenchmarkChain.source_sedar_filing}`,
                                  `Represents typical mature operation after 18-24 months of continuous commercial operations.`
                                ],
                                decisionImplications: [
                                  {
                                    heading: 'Core Profitability Target',
                                    insight: `At $${med.toLocaleString()} CAD gross revenue, typical EBITDA margins range between 12% and 18% depending on labor management efficiency.`,
                                    impact: 'positive'
                                  },
                                  {
                                    heading: 'Occupancy Affordability',
                                    insight: `Permits annual occupancy expenditure up to $${Math.round(med * 0.09).toLocaleString()} CAD ($${Math.round((med * 0.09) / 1200).toLocaleString()}/sq. ft gross for a 1,200 sq. ft retail unit).`,
                                    impact: 'positive'
                                  }
                                ],
                                strategicRecommendations: [
                                  'Standardize point-of-sale inventory tracking to benchmark food/merchandise costs against provincial peer targets (<30% COGS).',
                                  'Implement customer loyalty and repeat visit incentives to sustain steady mid-week transaction volume.'
                                ],
                                riskMitigations: [
                                  'Monitor wage cost escalations; implement scheduling software to avoid unexpected overtime labor spikes.',
                                  'Ensure adequate commercial liability and business interruption insurance coverage.'
                                ],
                                onClose: () => setModalContributingData(null)
                              });
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 block mb-1">Median Revenue</span>
                              <span className="text-[10px] text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">Inspect</span>
                            </div>
                            <span className="text-base font-bold text-emerald-400 group-hover:text-emerald-300 transition-colors">
                              ${Number(detailData.revenueBenchmarkChain.median_revenue_cad).toLocaleString()}
                            </span>
                          </div>

                          {/* P75 Card */}
                          <div 
                            className="p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/60 hover:bg-slate-850 transition-all cursor-pointer group active:scale-[0.98] relative"
                            onClick={() => {
                              const p75 = Number(detailData.revenueBenchmarkChain.p75_revenue_cad);
                              const med = Number(detailData.revenueBenchmarkChain.median_revenue_cad);
                              setModalContributingData({
                                title: `75th Percentile High-Volume Outperformance (${getCategoryName(activeDetail.categoryId)})`,
                                category: 'Peak Performance Unit Economics',
                                metricLabel: '75th Percentile Unit Revenue',
                                value: `$${p75.toLocaleString()} CAD`,
                                unit: 'CAD/yr',
                                percentageOfTotal: 'Upper quartile (top 25%)',
                                benchmarkValue: `$${med.toLocaleString()} CAD`,
                                benchmarkLabel: 'Ontario Median Unit Revenue',
                                deltaPct: Math.round(((p75 - med) / med) * 100),
                                sourceLineage: `${detailData.revenueBenchmarkChain.source_statcan_table} & ${detailData.revenueBenchmarkChain.source_sedar_filing}`,
                                referenceYear: '2023-2025 Audited Filings',
                                provenance: {
                                  sourceName: detailData.revenueBenchmarkChain.source_statcan_table,
                                  datasetCode: 'SEDAR_STATCAN_REVENUE_CHAIN',
                                  referencePeriod: '2023-2025 filings',
                                  resolution: 'PROVINCE',
                                  confidence: 'SEDAR_PUBLIC_FILINGS',
                                  sourceUrl: 'https://www.sedarplus.ca/'
                                },
                                contextDrivers: [
                                  `Methodology: ${detailData.revenueBenchmarkChain.methodology_notes}`,
                                  `High-throughput locations characterized by prime AAA retail frontage, dual drive-thrus, or high corporate catering delivery demand.`
                                ],
                                decisionImplications: [
                                  {
                                    heading: 'Operational Capacity Limits',
                                    insight: `Generating $${p75.toLocaleString()} CAD requires optimized peak-hour production lines and high order throughput to avoid customer drop-off.`,
                                    impact: 'positive'
                                  },
                                  {
                                    heading: 'Premium Rent Tolerance',
                                    insight: `High volume allows tenant to compete for prime corner commercial frontage commanding premium base rents.`,
                                    impact: 'positive'
                                  }
                                ],
                                strategicRecommendations: [
                                  'Invest in automated kitchen/service equipment and dual ordering kiosks to maximize peak hourly capacity.',
                                  'Explore dedicated third-party delivery dispatch stations to separate dine-in traffic from delivery drivers.'
                                ],
                                riskMitigations: [
                                  'Avoid lease terms that trigger punitive percentage-rent payments without a cap when exceeding high sales thresholds.',
                                  'Maintain strict quality control protocols to protect brand reputation during high-volume periods.'
                                ],
                                onClose: () => setModalContributingData(null)
                              });
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 block mb-1">75th Percentile Revenue</span>
                              <span className="text-[10px] text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">Inspect</span>
                            </div>
                            <span className="text-base font-bold text-indigo-300 group-hover:text-indigo-200 transition-colors">
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
                        <span className="text-[11px] font-normal text-slate-400">
                          (Click any metric to inspect leasing strategy)
                        </span>
                      </h4>
                      <ResolutionBadge resolution="CSD" />
                    </div>

                    {detailData.commercialRealEstate ? (
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        {/* Net Base Rent Card */}
                        <div 
                          className="p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-blue-500/60 transition-all cursor-pointer group active:scale-[0.98]"
                          onClick={() => {
                            const rent = Number(detailData.commercialRealEstate.avg_retail_rent_sqft_net);
                            setModalContributingData({
                              title: `${activeDetail.cityName || activeDetail.cityId.replace('CSD_', '')} Commercial Net Base Rent`,
                              category: 'Commercial Real Estate',
                              metricLabel: 'Net Base Retail Rent',
                              value: `$${rent.toFixed(2)} / sq.ft / yr`,
                              unit: 'CAD/sq.ft/yr',
                              percentageOfTotal: 'NNN Lease Structure',
                              benchmarkValue: '$28.50 / sq.ft',
                              benchmarkLabel: 'Ontario Municipal Average',
                              deltaPct: Math.round(((rent - 28.5) / 28.5) * 100),
                              sourceLineage: 'Commercial MLS & Local Brokerage Verified Transactions',
                              referenceYear: '2025-Q4 Commercial Lease Index',
                              provenance: {
                                sourceName: 'Commercial Real Estate Board Transaction Feeds',
                                datasetCode: 'RETAIL_LEASE_INDEX',
                                referencePeriod: '2025-Q4',
                                resolution: 'CSD',
                                confidence: 'BROKER_VERIFIED',
                                sourceUrl: 'https://www.crea.ca/'
                              },
                              contextDrivers: [
                                `Net base rent excludes property taxes, building insurance, and common area maintenance (TMI).`,
                                `For a standard 1,200 sq. ft retail footprint, annual base rent equates to approximately $${Math.round(rent * 1200).toLocaleString()} CAD/year ($${Math.round((rent * 1200) / 12).toLocaleString()} CAD/month).`
                              ],
                              decisionImplications: [
                                {
                                  heading: 'Occupancy Cost Ratio (OCR)',
                                  insight: `Base rent + TMI must not exceed 8-10% of gross sales to sustain profitable retail and foodservice operations.`,
                                  impact: 'warning'
                                },
                                {
                                  heading: 'Lease Term Commitment',
                                  insight: 'Standard commercial retail leases in Ontario require 5-year initial commitments with 5-year renewal options.',
                                  impact: 'neutral'
                                }
                              ],
                              strategicRecommendations: [
                                'Request 3 to 6 months of fixture-period rent abatement during store buildout and municipal inspection cycles.',
                                'Negotiate exclusivity covenants preventing the landlord from leasing adjacent spaces to direct competitors in the same NAICS classification.'
                              ],
                              riskMitigations: [
                                'Cap annual base rent escalation clauses to CPI or a maximum of 2.5% to 3.5% per annum.',
                                'Require explicit landlord indemnity against structural, roof, and pre-existing HVAC environmental defects.'
                              ],
                              onClose: () => setModalContributingData(null)
                            });
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-slate-300 block mb-1 font-medium">Net Base Rent</span>
                            <span className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">Inspect</span>
                          </div>
                          <span className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                            ${Number(detailData.commercialRealEstate.avg_retail_rent_sqft_net).toFixed(2)}
                          </span>
                          <span className="text-xs text-slate-400 block mt-0.5">CAD / sq. ft / year (NNN)</span>
                        </div>

                        {/* TMI Card */}
                        <div 
                          className="p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-blue-500/60 transition-all cursor-pointer group active:scale-[0.98]"
                          onClick={() => {
                            const tmi = Number(detailData.commercialRealEstate.avg_tmi_sqft);
                            setModalContributingData({
                              title: `${activeDetail.cityName || activeDetail.cityId.replace('CSD_', '')} Additional TMI Overheads`,
                              category: 'Occupancy Overheads',
                              metricLabel: 'Additional TMI (Taxes, Maintenance, Insurance)',
                              value: `$${tmi.toFixed(2)} / sq.ft / yr`,
                              unit: 'CAD/sq.ft/yr',
                              percentageOfTotal: 'Realty Tax + CAM + Insurance',
                              benchmarkValue: '$12.00 / sq.ft',
                              benchmarkLabel: 'Ontario Peer Average',
                              deltaPct: Math.round(((tmi - 12.0) / 12.0) * 100),
                              sourceLineage: 'Municipal Property Assessment Corporation (MPAC) & Broker Audits',
                              referenceYear: '2025-Q4',
                              provenance: {
                                sourceName: 'Municipal Property Assessment Corporation (MPAC) & Property Audits',
                                datasetCode: 'TMI_OPERATING_COSTS',
                                referencePeriod: '2025-Q4',
                                resolution: 'CSD',
                                confidence: 'AUDITED_OPERATIONAL',
                                sourceUrl: 'https://www.mpac.ca/'
                              },
                              contextDrivers: [
                                `Additional rent (TMI) passes through municipal commercial property taxes, exterior building maintenance, snow removal, and common insurance.`,
                                `For a 1,200 sq. ft premises, TMI adds $${Math.round(tmi * 1200).toLocaleString()} CAD annually ($${Math.round((tmi * 1200) / 12).toLocaleString()} CAD/month) on top of base rent.`
                              ],
                              decisionImplications: [
                                {
                                  heading: 'TMI Volatility & True-Up Risk',
                                  insight: 'Landlords reconcile TMI annually; sudden municipal property tax reassessments can cause unexpected year-end true-up bills.',
                                  impact: 'warning'
                                },
                                {
                                  heading: 'Total Gross Rent Impact',
                                  insight: `Total occupancy cost is Base Rent + TMI = $${(Number(detailData.commercialRealEstate.avg_retail_rent_sqft_net) + tmi).toFixed(2)} CAD/sq. ft gross.`,
                                  impact: 'neutral'
                                }
                              ],
                              strategicRecommendations: [
                                'Demand an annual audited statement of operating costs with right-to-audit clauses in the lease agreement.',
                                'Cap controllable CAM (common area maintenance) increases at no more than 5% per annum.'
                              ],
                              riskMitigations: [
                                'Exclude capital replacements (such as whole roof or parking lot repaving) from common area maintenance pass-throughs.',
                                'Verify historical 3-year TMI escalation trajectory from the previous commercial tenant.'
                              ],
                              onClose: () => setModalContributingData(null)
                            });
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-slate-300 block mb-1 font-medium">Additional TMI (Taxes/Maint)</span>
                            <span className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">Inspect</span>
                          </div>
                          <span className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                            ${Number(detailData.commercialRealEstate.avg_tmi_sqft).toFixed(2)}
                          </span>
                          <span className="text-xs text-slate-400 block mt-0.5">CAD / sq. ft / year</span>
                        </div>

                        {/* Retail Vacancy Card */}
                        <div 
                          className="p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/60 transition-all cursor-pointer group active:scale-[0.98]"
                          onClick={() => {
                            const vac = detailData.commercialRealEstate.retail_vacancy_rate_pct;
                            setModalContributingData({
                              title: `${activeDetail.cityName || activeDetail.cityId.replace('CSD_', '')} Commercial Retail Vacancy`,
                              category: 'Commercial Leasing Conditions',
                              metricLabel: 'Local Retail Vacancy Rate',
                              value: `${vac}%`,
                              unit: '%',
                              percentageOfTotal: 'Available retail inventory',
                              benchmarkValue: '4.8%',
                              benchmarkLabel: 'Ontario Benchmark Vacancy',
                              deltaPct: Math.round(((vac - 4.8) / 4.8) * 100),
                              sourceLineage: 'Commercial MLS & CBRE/Colliers Retail Availability Reports',
                              referenceYear: '2025-Q4',
                              provenance: {
                                sourceName: 'Commercial Brokerage Retail Surveys',
                                datasetCode: 'VACANCY_RATE_INDEX',
                                referencePeriod: '2025-Q4',
                                resolution: 'CSD',
                                confidence: 'BROKER_VERIFIED',
                                sourceUrl: 'https://www.cbre.ca/'
                              },
                              contextDrivers: [
                                `Retail vacancy below 4% indicates a tight landlord market with limited ready inventory and upward rent pressure.`,
                                `Vacancy above 6% provides tenant leverage for negotiating free rent periods and capital improvements.`
                              ],
                              decisionImplications: [
                                {
                                  heading: 'Landlord Concession Leverage',
                                  insight: vac >= 5.0 ? 'Higher vacancy rate shifts negotiating power to prospective tenants for tenant improvement (TI) allowances.' : 'Tight vacancy rate requires quick decision-making and pre-approved commercial financing.',
                                  impact: vac >= 5.0 ? 'positive' : 'warning'
                                }
                              ],
                              strategicRecommendations: [
                                'Engage commercial tenant representation brokers to uncover unlisted off-market lease opportunities.',
                                'Inquire into upcoming retail developments or strip mall revitalizations in growing municipal nodes.'
                              ],
                              riskMitigations: [
                                'Examine surrounding foot traffic and neighboring anchor tenant leases before committing to high-vacancy plazas.',
                                'Verify co-tenancy clauses ensuring anchor grocery or pharmacy stores remain open.'
                              ],
                              onClose: () => setModalContributingData(null)
                            });
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-slate-300 block mb-1 font-medium">Commercial Vacancy</span>
                            <span className="text-[10px] text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">Inspect</span>
                          </div>
                          <span className="text-base font-bold text-indigo-300 group-hover:text-indigo-200 transition-colors">
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
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          OSM-Listed Competitor Locations ({detailData.competitorLocations?.length || 0})
                          <span className="text-[11px] font-normal text-slate-400">
                            (Click any competitor to inspect competitive positioning)
                          </span>
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
                            <th className="py-2.5 px-3">Establishment (Click to Inspect)</th>
                            <th className="py-2.5 px-3">Type</th>
                            <th className="py-2.5 px-3">Address</th>
                            <th className="py-2.5 px-3 text-right">Coordinates</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                          {(detailData.competitorLocations || []).map((comp: any) => (
                            <tr 
                              key={comp.id}
                              className="hover:bg-slate-800/80 transition-colors cursor-pointer group"
                              onClick={() => {
                                setModalContributingData({
                                  title: `${comp.name} — Competitor Intelligence Profile`,
                                  category: 'Competitive Profiling',
                                  metricLabel: 'Competitor Classification',
                                  value: comp.is_chain ? 'Franchise / Multi-Unit Chain' : 'Independent Local Operator',
                                  unit: '',
                                  sourceLineage: 'OpenStreetMap Geographic Survey & Municipal Business Registry',
                                  referenceYear: '2025-Q4 Open Survey',
                                  provenance: {
                                    sourceName: 'OpenStreetMap Geographic Data',
                                    datasetCode: 'OSM_COMMERCIAL_SURVEY',
                                    referencePeriod: '2025-Q4',
                                    resolution: 'POINT_LOCATION',
                                    confidence: 'OPEN_SURVEY',
                                    sourceUrl: 'https://www.openstreetmap.org/'
                                  },
                                  contextDrivers: [
                                    `Establishment Name: ${comp.name}`,
                                    `Location Address: ${comp.address || 'Address unlisted in OSM record'}`,
                                    `Geographic Coordinates: ${Number(comp.latitude).toFixed(4)}, ${Number(comp.longitude).toFixed(4)}`,
                                    comp.is_chain 
                                      ? 'National or regional chain footprint with centralized supply chain and brand recognition.' 
                                      : 'Independent operator with established hyper-local neighborhood customer base.'
                                  ],
                                  decisionImplications: [
                                    {
                                      heading: 'Competitive Positioning Strategy',
                                      insight: comp.is_chain 
                                        ? 'Chain competitors compete primarily on uniform convenience and brand familiarity. Compete on bespoke craft quality, local sourcing, and personalized customer care.' 
                                        : 'Independent operators rely on community loyalty; differentiate through extended operating hours, loyalty apps, or specialized product lines.',
                                      impact: 'neutral'
                                    },
                                    {
                                      heading: 'Catchment Distance & Cannibalization',
                                      insight: `Located at lat/long (${Number(comp.latitude).toFixed(4)}, ${Number(comp.longitude).toFixed(4)}). Ensure new site location maintains at least 1.5–2.0 km separation to avoid zero-sum customer cannibalization.`,
                                      impact: 'positive'
                                    }
                                  ],
                                  strategicRecommendations: [
                                    'Conduct on-site customer traffic count during peak lunch and dinner rush hours.',
                                    'Analyze online reviews of this establishment to identify unmet customer grievances (e.g. slow delivery, parking issues).'
                                  ],
                                  riskMitigations: [
                                    'Avoid direct price discounting wars against high-volume corporate chains with deeper marketing pockets.',
                                    'Ensure lease includes adequate dedicated parking and curb-side pickup spaces if competing against drive-thru units.'
                                  ],
                                  onClose: () => setModalContributingData(null)
                                });
                              }}
                            >
                              <td className="py-2 px-3 font-semibold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-1.5">
                                {comp.name}
                                <span className="text-[10px] text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                  Inspect
                                </span>
                              </td>
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
                  if (activeDetail) {
                    setDossierCityId(activeDetail.cityId);
                    setDossierCategoryId(activeDetail.categoryId);
                    setDossierCityName(activeDetail.cityName || activeDetail.cityId.replace('CSD_', ''));
                    setIsDossierOpen(true);
                  }
                }}
                className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-[0.98]"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Export Banker Dossier ($199 CAD)</span>
              </button>

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

      {/* Feasibility Dossier Modal (Amendment #8 & T-008) */}
      <FeasibilityDossierModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        cityId={dossierCityId}
        categoryId={dossierCategoryId}
        cityName={dossierCityName}
      />
    </div>
  );
};
