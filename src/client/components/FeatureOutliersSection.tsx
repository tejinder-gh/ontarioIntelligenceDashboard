import React, { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, CheckCircle2, ChevronRight, Scale, Info, Sparkles } from 'lucide-react';
import { ResolutionBadge } from './ResolutionBadge.js';
import { ContributingDataInspector, ContributingDataProps } from './ContributingDataInspector.js';

interface OutlierItem {
  geography_id: string;
  city_name: string;
  metric_id: string;
  metric_name: string;
  value_numeric: number | string;
  unit: string;
  percentile_rank: number;
  z_score: number;
  outlier_reason: string;
}

export interface FeatureOutliersSectionProps {
  cityId?: string;
  category?: 'financial' | 'spending' | 'workforce' | 'demographics' | 'business' | 'municipal' | 'all';
  title?: string;
  subtitle?: string;
  onSelectCity?: (cityId: string) => void;
}

export const FeatureOutliersSection: React.FC<FeatureOutliersSectionProps> = ({
  cityId,
  category = 'all',
  title = 'Statistical Outlier & Market Divergence Section',
  subtitle = 'Dual-method detection using Tukey Interquartile Range (IQR) fences and Gaussian Standard Score (|z| ≥ 2.0) criteria. Click any anomaly card to inspect decision implications.',
  onSelectCity
}) => {
  const [outliers, setOutliers] = useState<OutlierItem[]>([]);
  const [provincialOutliers, setProvincialOutliers] = useState<OutlierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProvincial, setShowProvincial] = useState(false);
  const [contributingData, setContributingData] = useState<ContributingDataProps | null>(null);

  useEffect(() => {
    setLoading(true);
    const url = cityId ? `/api/analytics/outliers?cityId=${encodeURIComponent(cityId)}` : `/api/analytics/outliers`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        const raw: OutlierItem[] = data.outliers || [];
        const prov: OutlierItem[] = data.provincialOutliers || [];

        // Optional category filtering
        const matchesCategory = (o: OutlierItem) => {
          if (category === 'all') return true;
          const id = (o.metric_id || '').toLowerCase();
          const name = (o.metric_name || '').toLowerCase();
          if (category === 'financial') return id.includes('income') || id.includes('shelter') || id.includes('rent') || name.includes('income') || name.includes('wealth');
          if (category === 'spending') return id.includes('spending') || name.includes('expenditure') || name.includes('spending');
          if (category === 'workforce') return id.includes('labor') || id.includes('unemp') || name.includes('employment') || name.includes('workforce');
          if (category === 'demographics') return id.includes('population') || id.includes('pop') || id.includes('age') || name.includes('population');
          if (category === 'business') return id.includes('business') || id.includes('density') || name.includes('establishment');
          if (category === 'municipal') return id.includes('budget') || id.includes('reserve') || name.includes('budget');
          return true;
        };

        const filtered = raw.filter(matchesCategory);
        setOutliers(filtered);
        setProvincialOutliers(prov.filter(matchesCategory));
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching feature outliers:', err);
        setLoading(false);
      });
  }, [cityId, category]);

  const displayList = (outliers.length > 0 && !showProvincial) ? outliers : provincialOutliers;

  const handleInspectOutlier = (o: OutlierItem) => {
    const zNum = typeof o.z_score === 'number' ? o.z_score : parseFloat(String(o.z_score)) || 0;
    const isPositive = zNum > 0;
    const formattedVal = o.unit === 'CAD' || o.unit === '$' 
      ? `$${Number(o.value_numeric).toLocaleString()}` 
      : `${Number(o.value_numeric).toLocaleString()} ${o.unit}`;

    setContributingData({
      title: `${o.city_name} — ${o.metric_name} Statistical Anomaly Analysis`,
      category: 'Statistical Outlier & Anomaly',
      metricLabel: o.metric_name,
      value: formattedVal,
      benchmarkValue: `${o.percentile_rank}th Percentile (z = ${zNum > 0 ? `+${zNum.toFixed(2)}` : zNum.toFixed(2)})`,
      benchmarkLabel: 'Statistical Standard Score',
      sourceLineage: 'Audited Statistics Canada Census & Municipal Datasets with Tukey IQR Detection',
      referenceYear: '2021 Census / 2025 Audited FIR',
      decisionImplications: [
        {
          heading: isPositive ? 'Strong Positive Market Divergence' : 'Significant Negative Market Divergence',
          insight: isPositive 
            ? `At ${zNum.toFixed(2)} standard deviations above the Ontario median, ${o.city_name} is an extreme positive outperformer in this category. Represents a top-tier market opportunity with rare commercial conditions.`
            : `At ${zNum.toFixed(2)} standard deviations below the Ontario median, this metric signals either an underserved structural vacuum or operational headwind requiring custom mitigation.`,
          impact: isPositive ? 'positive' : 'warning'
        },
        {
          heading: 'Statistical Confidence & Methodology',
          insight: `Verified through dual criteria: Gaussian Z-Score (|z| ≥ 2.0) and Tukey Interquartile Range [Q1 - 1.5×IQR, Q3 + 1.5×IQR]. Resistant to outlier skewness.`,
          impact: 'neutral'
        }
      ],
      contextDrivers: [
        o.outlier_reason,
        `Percentile Standing: ${o.percentile_rank}% of Ontario Census Subdivisions operate below this observed value.`
      ],
      strategicRecommendations: isPositive ? [
        'Capitalize on this localized outperformance by introducing premium or specialized offerings that capture high consumer willingness to pay.',
        'Use this municipal advantage in investor decks and franchise expansion proposals to justify faster payback timelines.'
      ] : [
        'If low commercial density: capture first-mover advantage before national chains expand into the market void.',
        'If low income/high unemployment: price aggressively with value-tier packaging and high-volume staples.'
      ],
      actionLink: onSelectCity ? {
        label: `Inspect ${o.city_name} Full Profile`,
        onClick: () => onSelectCity(o.geography_id)
      } : undefined,
      onClose: () => setContributingData(null)
    });
  };

  return (
    <div className="glass-panel p-5 sm:p-6 rounded-xl border border-rose-900/40 bg-gradient-to-b from-rose-950/20 via-slate-900/40 to-slate-950/80 shadow-xl space-y-4 mt-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-rose-900/30">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-rose-950/90 text-rose-300 border border-rose-700/80 flex items-center gap-1 uppercase tracking-wider">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              Empirical Anomaly Engine
            </span>
            <span className="text-xs text-slate-300 font-mono">
              |z| ≥ 2.0 & IQR Fences
            </span>
            <ResolutionBadge resolution="CSD" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            {title}
          </h3>
          <p className="text-xs text-slate-300 mt-0.5 max-w-3xl">
            {subtitle}
          </p>
        </div>

        {cityId && provincialOutliers.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowProvincial(!showProvincial)}
              className="text-xs font-semibold px-3 py-1.5 min-h-[32px] rounded-lg bg-slate-900 text-slate-200 hover:text-white border border-slate-700 transition-colors"
            >
              {showProvincial ? 'Show Active City Outliers' : 'View Top Provincial Outliers'}
            </button>
          </div>
        )}
      </div>

      {/* Active Inspector Drill-Down */}
      {contributingData && (
        <ContributingDataInspector {...contributingData} />
      )}

      {loading ? (
        <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
          Computing Gaussian Standard Scores and Tukey IQR distributions across 444 municipalities...
        </div>
      ) : displayList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {displayList.slice(0, 6).map((o, idx) => {
            const zNum = typeof o.z_score === 'number' ? o.z_score : parseFloat(String(o.z_score)) || 0;
            const isSevere = Math.abs(zNum) >= 2.5;

            return (
              <div 
                key={`${o.geography_id}_${o.metric_id}_${idx}`}
                role="button"
                tabIndex={0}
                onClick={() => handleInspectOutlier(o)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleInspectOutlier(o)}
                className="p-4 rounded-xl bg-slate-900/90 border border-rose-900/50 hover:border-rose-500/80 hover:bg-slate-900 transition-all shadow-md flex flex-col justify-between cursor-pointer group active:scale-[0.98]"
                title="Click to inspect anomaly decision implications"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-xs font-extrabold text-indigo-300 uppercase tracking-wider truncate group-hover:text-indigo-200 transition-colors">
                      {o.city_name}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold shrink-0 ${
                      isSevere 
                        ? 'bg-rose-950 text-rose-300 border border-rose-800' 
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                      z = {zNum > 0 ? `+${zNum.toFixed(2)}` : zNum.toFixed(2)}
                    </span>
                  </div>

                  <h5 className="text-sm font-bold text-white mb-1 leading-snug group-hover:text-rose-200 transition-colors">
                    {o.metric_name}
                  </h5>

                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-xl font-extrabold text-white">
                      {o.unit === 'CAD' || o.unit === '$' ? `$${Number(o.value_numeric).toLocaleString()}` : `${Number(o.value_numeric).toLocaleString()} ${o.unit}`}
                    </span>
                    <span className="text-xs font-semibold text-emerald-400">
                      ({o.percentile_rank}th percentile)
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 line-clamp-3 leading-relaxed">
                    {o.outlier_reason}
                  </p>
                </div>

                <div className="pt-2.5 mt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-rose-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Click to drill down
                  </span>
                  {onSelectCity && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCity(o.geography_id);
                      }}
                      className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold min-h-[28px]"
                    >
                      Examine Profile
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-slate-900/60 border border-emerald-900/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Normal Statistical Distribution:</strong> This municipality&apos;s metrics operate within expected Gaussian bounds (|z| &lt; 2.0). No extreme anomalies or statistical distortions detected.
            </span>
          </div>
          {provincialOutliers.length > 0 && (
            <button
              type="button"
              onClick={() => setShowProvincial(true)}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 ml-4 shrink-0"
            >
              See Provincial Outliers →
            </button>
          )}
        </div>
      )}
    </div>
  );
};
