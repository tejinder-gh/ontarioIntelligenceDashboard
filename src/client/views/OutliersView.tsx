import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Search, 
  TrendingUp, 
  Filter, 
  Info, 
  CheckCircle2, 
  BarChart2,
  ChevronRight
} from 'lucide-react';
import { ResolutionBadge } from '../components/ResolutionBadge.js';
import { ExportButton } from '../components/ExportButton.js';
import { MetricTooltip } from '../components/MetricTooltip.js';

interface OutliersViewProps {
  onSelectCity: (cityId: string) => void;
}

export const OutliersView: React.FC<OutliersViewProps> = ({ onSelectCity }) => {
  const [outliers, setOutliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
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
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Identifies municipalities exhibiting statistical anomalies using both Tukey&apos;s Interquartile Range [Q1 − 1.5×IQR, Q3 + 1.5×IQR] and Gaussian Standard Score (|z| ≥ 2.0) criteria.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExportButton data={exportData} filename="ontario_statistical_outliers" label="Export Outliers Data" />
        </div>
      </div>

      {/* Methodology Explainer Banner */}
      <div className="glass-panel p-5 rounded-xl border border-slate-800 bg-slate-900/40 text-xs">
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
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by municipality or metric..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="text-xs text-slate-400">
          Detected <strong className="text-rose-400">{filteredOutliers.length}</strong> extreme statistical divergences across Ontario
        </div>
      </div>

      {/* Outlier Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 animate-pulse glass-panel rounded-xl">
          Executing Tukey IQR and Gaussian z-score calculations across all datasets...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOutliers.map((o, idx) => (
            <div 
              key={`${o.geography_id}_${o.metric_id}_${idx}`}
              className="glass-panel p-5 rounded-xl border border-rose-900/40 hover:border-rose-700/80 transition-all shadow-lg"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">
                    {o.city_name}
                  </span>
                  <h4 className="text-base font-bold text-white mt-0.5">
                    {o.metric_name}
                  </h4>
                </div>
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800">
                  z = {o.z_score > 0 ? `+${o.z_score}` : o.z_score}
                </span>
              </div>

              <div className="flex items-baseline gap-2 my-2">
                <span className="text-2xl font-extrabold text-white">
                  {o.unit === 'CAD' || o.unit === '$' ? `$${Number(o.value_numeric).toLocaleString()}` : `${Number(o.value_numeric).toLocaleString()} ${o.unit}`}
                </span>
                <span className="text-xs text-emerald-400 font-semibold">
                  ({o.percentile_rank}th percentile)
                </span>
              </div>

              <p className="text-xs text-slate-300 mt-2 p-2.5 rounded bg-slate-900 border border-slate-800">
                {o.outlier_reason}
              </p>

              <div className="flex items-center justify-end mt-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => onSelectCity(o.geography_id)}
                  className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
                >
                  Inspect City Profile
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
