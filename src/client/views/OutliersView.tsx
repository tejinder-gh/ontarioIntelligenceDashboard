import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Search, 
  TrendingUp, 
  Filter, 
  Info, 
  CheckCircle2, 
  BarChart2,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { ResolutionBadge } from '../components/ResolutionBadge.js';
import { ExportButton } from '../components/ExportButton.js';
import { MetricTooltip } from '../components/MetricTooltip.js';
import { ContributingDataInspector, ContributingDataProps } from '../components/ContributingDataInspector.js';

interface OutliersViewProps {
  onSelectCity: (cityId: string) => void;
}

export const OutliersView: React.FC<OutliersViewProps> = ({ onSelectCity }) => {
  const [outliers, setOutliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [contributingData, setContributingData] = useState<ContributingDataProps | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics/outliers`)
      .then(res => res.json())
      .then(d => {
        setOutliers(d.outliers || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching outliers:', err);
        setLoading(false);
      });
  }, []);

  const filteredOutliers = outliers.filter(o =>
    o.city_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.metric_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.outlier_reason && o.outlier_reason.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const exportData = filteredOutliers.map(o => ({
    Municipality: o.city_name,
    Metric: o.metric_name,
    'Observed Value': `${Number(o.value_numeric).toLocaleString()} ${o.unit}`,
    'Z-Score': o.z_score,
    'Percentile Rank': `${o.percentile_rank}%`,
    'Outlier Rationale': o.outlier_reason
  }));

  const handleInspectOutlier = (o: any) => {
    const zNum = typeof o.z_score === 'number' ? o.z_score : parseFloat(String(o.z_score)) || 0;
    const isPositive = zNum > 0;
    const formattedVal = o.unit === 'CAD' || o.unit === '$' 
      ? `$${Number(o.value_numeric).toLocaleString()}` 
      : `${Number(o.value_numeric).toLocaleString()} ${o.unit}`;

    setContributingData({
      title: `${o.city_name} — ${o.metric_name} Anomaly Intelligence`,
      category: 'Extreme Statistical Divergence',
      metricLabel: o.metric_name,
      value: formattedVal,
      benchmarkValue: `${o.percentile_rank}th Percentile (z = ${zNum > 0 ? `+${zNum.toFixed(2)}` : zNum.toFixed(2)})`,
      benchmarkLabel: 'Statistical Standard Score',
      sourceLineage: 'Audited Statistics Canada Census & Municipal Datasets with Tukey IQR Detection',
      referenceYear: '2021 Census / 2025 Audited FIR',
      decisionImplications: [
        {
          heading: isPositive ? 'Severe Positive Outperformance' : 'Severe Negative Divergence',
          insight: isPositive 
            ? `At ${zNum.toFixed(2)} standard deviations above the Ontario municipal average, ${o.city_name} represents a statistically rare outlier in ${o.metric_name}. This creates high operational advantages for businesses targeting this specific demographic or economic attribute.`
            : `Operating at ${zNum.toFixed(2)} standard deviations below the median, this metric highlights a severe structural gap in ${o.city_name}. Businesses entering this market should structure their capital expenditures and pricing models accordingly.`,
          impact: isPositive ? 'positive' : 'warning'
        },
        {
          heading: 'Methodological Rigor & Confidence',
          insight: `Detected using both Tukey Interquartile Range (IQR) fences and Gaussian Standard Score (|z| ≥ 2.0). Ensures detection is robust against distribution skewness.`,
          impact: 'neutral'
        }
      ],
      contextDrivers: [
        o.outlier_reason,
        `Percentile Rank: ${o.percentile_rank}% of Ontario Census Subdivisions fall below this value.`
      ],
      strategicRecommendations: isPositive ? [
        'Leverage this municipal advantage in business plans and debt financing applications.',
        'Target product and service pricing to capture high local willingness to pay.'
      ] : [
        'If low establishment count: move quickly to capture first-mover competitive advantage.',
        'If elevated cost metric: secure lease caps and tenant improvement allowances to insulate margins.'
      ],
      actionLink: {
        label: `Switch to ${o.city_name} Profile`,
        onClick: () => onSelectCity(o.geography_id)
      },
      onClose: () => setContributingData(null)
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-950 text-rose-300 border border-rose-800/60">
              Statistical Anomaly & Outlier Engine
            </span>
            <ResolutionBadge resolution="CSD" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Statistical Outliers & Extreme Market Divergences
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-3xl">
            Identifies municipalities exhibiting statistical anomalies using both Tukey&apos;s Interquartile Range [Q1 − 1.5×IQR, Q3 + 1.5×IQR] and Gaussian Standard Score (|z| ≥ 2.0) criteria. Click any anomaly card to drill down into executive decision implications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExportButton data={exportData} filename="ontario_statistical_outliers" label="Export Outliers Data" />
        </div>
      </div>

      {/* Active Inspector Drill-Down */}
      {contributingData && (
        <ContributingDataInspector {...contributingData} />
      )}

      {/* Methodology Explainer Banner */}
      <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-slate-900/40 text-xs shadow-md">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white">Dual-Method Statistical Outlier Detection Rationale:</span>
            <p className="mt-1 text-slate-300">
              Economic metrics frequently exhibit skewed non-normal distributions (e.g., household wealth and business counts). To ensure robust detection without distortion from skewness, our analytics engine evaluates both <strong>IQR fences</strong> (which are non-parametric and resistant to extreme values) and <strong>z-scores</strong> (which measure standard deviations from the parametric mean).
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            aria-label="Search by municipality or metric"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by municipality or metric..."
            className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-10 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all"
          />
        </div>

        <div className="text-xs text-slate-300 font-medium">
          Detected <strong className="text-rose-400">{filteredOutliers.length}</strong> extreme statistical divergences across Ontario
        </div>
      </div>

      {/* Outlier Cards Grid (Every Card is Clickable for Decision Drill-Down) */}
      {loading ? (
        <div className="p-12 text-center text-slate-300 animate-pulse glass-panel rounded-2xl border border-white/10">
          Executing Tukey IQR and Gaussian z-score calculations across all datasets...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOutliers.map((o, idx) => {
            const zNum = typeof o.z_score === 'number' ? o.z_score : parseFloat(String(o.z_score)) || 0;
            const isSevere = Math.abs(zNum) >= 2.5;

            return (
              <div 
                key={`${o.geography_id}_${o.metric_id}_${idx}`}
                role="button"
                tabIndex={0}
                onClick={() => handleInspectOutlier(o)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleInspectOutlier(o)}
                className="glass-panel p-5 rounded-2xl border border-rose-500/20 bg-slate-900/90 hover:border-rose-500/80 hover:shadow-xl transition-all cursor-pointer group active:scale-[0.98]"
                title="Click to inspect anomaly decision implications"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block group-hover:text-indigo-300 transition-colors">
                      {o.city_name}
                    </span>
                    <h4 className="text-base font-bold text-white mt-0.5 group-hover:text-rose-200 transition-colors">
                      {o.metric_name}
                    </h4>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold shrink-0 ${
                    isSevere 
                      ? 'bg-rose-950 text-rose-300 border border-rose-800' 
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    z = {zNum > 0 ? `+${zNum.toFixed(2)}` : zNum.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-baseline gap-2 my-2.5">
                  <span className="text-2xl font-extrabold text-white font-mono">
                    {o.unit === 'CAD' || o.unit === '$' ? `$${Number(o.value_numeric).toLocaleString()}` : `${Number(o.value_numeric).toLocaleString()} ${o.unit}`}
                  </span>
                  <span className="text-xs text-emerald-400 font-semibold">
                    ({o.percentile_rank}th percentile)
                  </span>
                </div>

                <p className="text-xs text-slate-200 mt-2 p-3 rounded-xl bg-slate-950/60 border border-white/5 leading-relaxed">
                  {o.outlier_reason}
                </p>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                  <span className="text-[10px] text-rose-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Click to drill down into decision value
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCity(o.geography_id);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors py-1 px-2.5 rounded-lg hover:bg-white/5"
                  >
                    Inspect Profile
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
