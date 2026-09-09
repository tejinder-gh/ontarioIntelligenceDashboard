import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  Sliders, 
  TrendingUp, 
  Building2, 
  DollarSign, 
  MapPin, 
  Scale, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  RotateCcw,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { ResolutionBadge } from './ResolutionBadge.js';
import type { ContributingDataProps } from './ContributingDataInspector.js';

interface ComparableCitiesCardProps {
  cityId: string;
  cityName?: string;
  onSelectCity?: (cityId: string) => void;
  onInspectData?: (data: ContributingDataProps) => void;
}

export const ComparableCitiesCard: React.FC<ComparableCitiesCardProps> = ({
  cityId,
  cityName,
  onSelectCity,
  onInspectData
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showSliders, setShowSliders] = useState<boolean>(false);

  // Dynamic Weights State (Requirement 35)
  const [incomeWeight, setIncomeWeight] = useState<number>(2.0);
  const [growthWeight, setGrowthWeight] = useState<number>(1.5);
  const [densityWeight, setDensityWeight] = useState<number>(1.5);
  const [popWeight, setPopWeight] = useState<number>(1.0);
  const [workforceWeight, setWorkforceWeight] = useState<number>(1.2);

  const fetchSimilar = () => {
    setLoading(true);
    const params = new URLSearchParams({
      income: incomeWeight.toString(),
      growth: growthWeight.toString(),
      businessDensity: densityWeight.toString(),
      population: popWeight.toString(),
      workforce: workforceWeight.toString()
    });

    fetch(`/api/geographies/${cityId}/similar?${params.toString()}`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching comparable cities:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSimilar();
  }, [cityId, incomeWeight, growthWeight, densityWeight, popWeight, workforceWeight]);

  const handleResetWeights = () => {
    setIncomeWeight(2.0);
    setGrowthWeight(1.5);
    setDensityWeight(1.5);
    setPopWeight(1.0);
    setWorkforceWeight(1.2);
  };

  if (loading && !data) {
    return (
      <div className="glass-panel p-6 rounded-2xl border border-white/10 animate-pulse text-xs text-slate-400">
        Calculating multi-dimensional Euclidean similarity vectors across 444 Ontario municipalities...
      </div>
    );
  }

  if (!data || !data.similarCities || data.similarCities.length === 0) {
    return null;
  }

  const { targetCity, similarCities, marketGaps } = data;
  const topPeers = similarCities.slice(0, 5);

  const inspectPeer = (peer: any) => {
    if (!onInspectData) return;
    onInspectData({
      title: `${targetCity.name} vs ${peer.name} Comparable Peer Audit`,
      category: 'Economically Similar Municipalities',
      metricLabel: 'Vector Similarity Score',
      value: `${peer.similarityScore}% Compatibility`,
      unit: '',
      percentageOfTotal: `Euclidean Normalized Distance: ${peer.distance}`,
      benchmarkValue: `${targetCity.name} Baseline`,
      benchmarkLabel: 'Target Municipality',
      sourceLineage: 'Statistics Canada 2021 Census & Business Counts Vector Model',
      referenceYear: '2021-2025 Multi-Attribute Model',
      decisionImplications: [
        {
          heading: 'High Transferability of Commercial Models',
          insight: `${peer.name} shares ${peer.keySharedAttributes.length} primary economic characteristics with ${targetCity.name}. Business concepts proven in ${peer.name} face similar disposable income, family formation, and commercial space realities.`,
          impact: 'positive'
        },
        {
          heading: 'Structural Divergence to Monitor',
          insight: peer.divergentAttributes.length > 0 
            ? peer.divergentAttributes.join('; ') 
            : 'Minimal divergence across normalized demographic attributes.',
          impact: 'neutral'
        }
      ],
      strategicRecommendations: [
        `Benchmark franchise pricing and operating hours against top operators in ${peer.name}.`,
        'Compare municipal commercial tax rates and development charges before final site selection.'
      ],
      provenance: {
        sourceName: 'StatCan Census & Canadian Business Counts',
        datasetCode: 'CSD_SIMILARITY_MODEL',
        referencePeriod: '2021 Census & 2025 Counts',
        resolution: 'CSD',
        confidence: 'HIGH_EMPIRICAL',
        sourceUrl: 'https://www12.statcan.gc.ca/'
      }
    });
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-white/10 shadow-lg space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-700/60">
              Requirements 35 & 36
            </span>
            <ResolutionBadge resolution="CSD" />
          </div>
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Compass className="w-5 h-5 text-indigo-400" />
            <span>Comparable Cities & Market-Gap Intelligence</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Evaluates {targetCity.name} against economically similar Ontario municipalities using normalized multi-attribute vector scaling.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSliders(!showSliders)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              showSliders
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-slate-900 text-slate-300 border-white/10 hover:border-white/20'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            {showSliders ? 'Hide Sliders' : 'Adjust Weights'}
          </button>
        </div>
      </div>

      {/* Dynamic Weight Sliders Drawer (Requirement 35) */}
      {showSliders && (
        <div className="p-4 bg-slate-900/90 rounded-xl border border-indigo-700/50 space-y-3 animate-fadeIn text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-indigo-400" />
              Adjust Feature Similarity Weights:
            </span>
            <button
              type="button"
              onClick={handleResetWeights}
              className="text-[11px] text-slate-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Defaults
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
            {/* Income Weight */}
            <div className="p-2.5 bg-slate-950/60 rounded-lg border border-white/5">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Income:</span>
                <strong className="text-emerald-400">{incomeWeight.toFixed(1)}x</strong>
              </div>
              <input
                type="range"
                min="0.5"
                max="4.0"
                step="0.5"
                value={incomeWeight}
                onChange={e => setIncomeWeight(parseFloat(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            {/* Growth Weight */}
            <div className="p-2.5 bg-slate-950/60 rounded-lg border border-white/5">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Growth:</span>
                <strong className="text-indigo-400">{growthWeight.toFixed(1)}x</strong>
              </div>
              <input
                type="range"
                min="0.5"
                max="4.0"
                step="0.5"
                value={growthWeight}
                onChange={e => setGrowthWeight(parseFloat(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            {/* Density Weight */}
            <div className="p-2.5 bg-slate-950/60 rounded-lg border border-white/5">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Biz Density:</span>
                <strong className="text-sky-400">{densityWeight.toFixed(1)}x</strong>
              </div>
              <input
                type="range"
                min="0.5"
                max="4.0"
                step="0.5"
                value={densityWeight}
                onChange={e => setDensityWeight(parseFloat(e.target.value))}
                className="w-full accent-sky-500"
              />
            </div>

            {/* Population Weight */}
            <div className="p-2.5 bg-slate-950/60 rounded-lg border border-white/5">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Population:</span>
                <strong className="text-purple-400">{popWeight.toFixed(1)}x</strong>
              </div>
              <input
                type="range"
                min="0.5"
                max="4.0"
                step="0.5"
                value={popWeight}
                onChange={e => setPopWeight(parseFloat(e.target.value))}
                className="w-full accent-purple-500"
              />
            </div>

            {/* Workforce Weight */}
            <div className="p-2.5 bg-slate-950/60 rounded-lg border border-white/5">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Workforce:</span>
                <strong className="text-amber-400">{workforceWeight.toFixed(1)}x</strong>
              </div>
              <input
                type="range"
                min="0.5"
                max="4.0"
                step="0.5"
                value={workforceWeight}
                onChange={e => setWorkforceWeight(parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Market-Gap Summary vs Peer Cohort (Requirement 36) */}
      {marketGaps && (
        <div className="p-4 bg-gradient-to-r from-slate-950 to-indigo-950/40 rounded-xl border border-indigo-800/40 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Market-Gap Delta vs Top Peer Cohort:
            </span>
            <span className="text-[11px] text-slate-400">
              Benchmark: {marketGaps.peerBenchmarkCohort?.slice(0, 3).join(', ')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-2.5 bg-slate-900/80 rounded-lg border border-white/5">
              <span className="text-slate-400 block text-[11px]">Median Income Spread</span>
              <span className={`text-sm font-bold ${marketGaps.incomeGapCad >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {marketGaps.incomeGapCad >= 0 ? `+$${marketGaps.incomeGapCad.toLocaleString()}` : `-$${Math.abs(marketGaps.incomeGapCad).toLocaleString()}`} CAD
              </span>
              <span className="block text-[10px] text-slate-500">
                {marketGaps.incomeGapPct >= 0 ? `+${marketGaps.incomeGapPct}%` : `${marketGaps.incomeGapPct}%`} vs peer median
              </span>
            </div>

            <div className="p-2.5 bg-slate-900/80 rounded-lg border border-white/5">
              <span className="text-slate-400 block text-[11px]">Business Density Gap</span>
              <span className={`text-sm font-bold ${marketGaps.businessDensityGap >= 0 ? 'text-sky-400' : 'text-amber-400'}`}>
                {marketGaps.businessDensityGap >= 0 ? `+${marketGaps.businessDensityGap}` : `${marketGaps.businessDensityGap}`} biz / 1k pop
              </span>
              <span className="block text-[10px] text-slate-500">
                {marketGaps.businessDensityGap < 0 ? 'Potential undersaturation gap' : 'Higher density vs peers'}
              </span>
            </div>

            <div className="p-2.5 bg-slate-900/80 rounded-lg border border-white/5">
              <span className="text-slate-400 block text-[11px]">5-Year Growth Rate Gap</span>
              <span className={`text-sm font-bold ${marketGaps.growthRateGap >= 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                {marketGaps.growthRateGap >= 0 ? `+${marketGaps.growthRateGap}%` : `${marketGaps.growthRateGap}%`}
              </span>
              <span className="block text-[10px] text-slate-500">
                Relative customer pool expansion
              </span>
            </div>
          </div>

          {/* Alternative Explanations Callout (Strict Requirement 36 Rule) */}
          <div className="p-2.5 bg-slate-900/90 rounded-lg border border-amber-800/40 text-[11px] text-amber-200/90 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>Analytical Integrity Warning (Mandate #36):</strong> Do not equate low business density with guaranteed commercial opportunity. Low density in {targetCity.name} may alternative reflect restrictive municipal zoning by-laws, elevated commercial retail net rents, specific suburban demographic age profiles, or out-of-city commuter shopping patterns.
            </div>
          </div>
        </div>
      )}

      {/* Peer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {topPeers.map((peer: any) => (
          <div
            key={peer.geographyId}
            onClick={() => inspectPeer(peer)}
            className="p-4 bg-slate-900/80 hover:bg-slate-900 rounded-xl border border-white/5 hover:border-indigo-500/60 transition-all cursor-pointer group space-y-2 text-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {peer.name}
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    CSD {peer.geographyId.replace('CSD_', '')}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Click to inspect contributing feature similarity
                </span>
              </div>

              <div className="text-right">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-950 text-indigo-300 border border-indigo-700/60">
                  {peer.similarityScore}% Match
                </span>
              </div>
            </div>

            {/* Shared Attributes */}
            <div className="space-y-1 pt-1">
              {peer.keySharedAttributes?.slice(0, 2).map((shared: string, i: number) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px] text-emerald-300/90">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>{shared}</span>
                </div>
              ))}
              {peer.divergentAttributes?.slice(0, 1).map((div: string, i: number) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0 ml-0.5" />
                  <span>{div}</span>
                </div>
              ))}
            </div>

            {/* Action Bar */}
            {onSelectCity && (
              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <span className="text-[11px] text-indigo-400 group-hover:text-indigo-300 font-semibold flex items-center gap-1">
                  Inspect Micro-Data <ChevronRight className="w-3.5 h-3.5" />
                </span>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onSelectCity(peer.geographyId);
                  }}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white text-[10px] font-semibold transition-colors flex items-center gap-1"
                >
                  <span>Switch City</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
