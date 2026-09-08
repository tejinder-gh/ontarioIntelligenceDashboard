import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  ArrowUpDown, 
  Filter, 
  TrendingUp, 
  AlertTriangle, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { ResolutionBadge } from '../components/ResolutionBadge.js';
import { ExportButton } from '../components/ExportButton.js';
import { MetricTooltip } from '../components/MetricTooltip.js';
import { ContributingDataInspector, ContributingDataProps } from '../components/ContributingDataInspector.js';
import { FeatureOutliersSection } from '../components/FeatureOutliersSection.js';

interface CityRankingsViewProps {
  onSelectCity: (cityId: string) => void;
}

const METRIC_OPTIONS = [
  { id: 'income_median_hh', label: 'Median Household Income (CAD)', unit: '$' },
  { id: 'businesses_per_1000_pop', label: 'Business Density (per 1k pop)', unit: 'biz/1k' },
  { id: 'population_growth_pct', label: 'Population Growth Rate (%)', unit: '%' },
  { id: 'businesses_total_counts', label: 'Total Business Counts', unit: 'biz' },
  { id: 'municipal_operating_budget', label: 'Municipal Operating Budget (CAD)', unit: '$' },
  { id: 'labor_unemployment_rate', label: 'Unemployment Rate (%)', unit: '%' },
  { id: 'shelter_cost_median_rent', label: 'Median Monthly Rent (CAD)', unit: '$/mo' }
];

export const CityRankingsView: React.FC<CityRankingsViewProps> = ({ onSelectCity }) => {
  const [selectedMetric, setSelectedMetric] = useState<string>('income_median_hh');
  const [minPop, setMinPop] = useState<number>(0);
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [contributingData, setContributingData] = useState<ContributingDataProps | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/rankings?metric=${selectedMetric}`)
      .then(res => res.json())
      .then(data => {
        setRankings(data.rankings || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching rankings:', err);
        setLoading(false);
      });
  }, [selectedMetric]);

  const activeMetricObj = METRIC_OPTIONS.find(m => m.id === selectedMetric) || METRIC_OPTIONS[0];

  const handleSelectRankingRow = (r: any) => {
    const valFormatted = activeMetricObj.unit === '$' 
      ? `$${Number(r.value_numeric).toLocaleString()}`
      : `${Number(r.value_numeric).toLocaleString()} ${activeMetricObj.unit}`;

    setContributingData({
      title: `${r.city_name} — Rank #${r.ontario_rank || 'N/A'} in Ontario`,
      category: 'Cross-Municipal League Table',
      metricName: activeMetricObj.label,
      metricValue: valFormatted,
      unit: activeMetricObj.unit,
      provenance: {
        sourceName: 'Statistics Canada / Ontario MMAH FIR Audits',
        datasetCode: 'LEAGUE_RANKING_2021',
        referencePeriod: '2021 Census / 2023 FIR',
        resolution: 'CSD',
        confidence: 'OFFICIAL_CENSUS',
        sourceUrl: 'https://www12.statcan.gc.ca/'
      },
      contributingDrivers: [
        {
          label: 'Provincial Percentile Rank',
          value: `Top ${(100 - Number(r.percentile_rank || 0)).toFixed(1)}% (Percentile: ${r.percentile_rank}%)`,
          description: `Ranks higher than ${r.percentile_rank}% of evaluated Ontario Census Subdivisions.`
        },
        {
          label: 'Gaussian Z-Score Divergence',
          value: `z = ${r.z_score !== null ? (r.z_score > 0 ? `+${r.z_score}` : r.z_score) : '0.00'}`,
          description: 'Standard deviations away from the population-weighted provincial benchmark mean.'
        },
        {
          label: 'Outlier Anomaly Status',
          value: r.is_outlier ? 'Statistical Outlier (|z| ≥ 2.0 or Tukey IQR)' : 'Within Standard Bounds',
          description: r.outlier_reason || 'Metric falls within normal provincial distribution bounds.'
        },
        {
          label: 'CSD Population Base',
          value: `${Number(r.population_2021 || 0).toLocaleString()} residents`,
          description: `Official 2021 Census of Population count for ${r.city_name}.`
        }
      ],
      methodologyNote: 'Rankings are computed dynamically using standard rank algorithms with tie-breaking and percentile rank formulas. Outliers are validated against Tukey IQR 1.5x interquartile ranges.',
      onClose: () => setContributingData(null)
    });
  };

  const filteredRankings = rankings.filter(r => {
    const pop = Number(r.population_2021 || 0);
    return pop >= minPop;
  });

  const exportData = filteredRankings.map(r => ({
    Rank: r.ontario_rank || 'N/A',
    Municipality: r.city_name,
    Type: r.csd_type || 'City',
    Population: r.population_2021?.toLocaleString(),
    Metric: activeMetricObj.label,
    Value: activeMetricObj.unit === '$' 
      ? `$${Number(r.value_numeric).toLocaleString()}`
      : `${Number(r.value_numeric).toLocaleString()} ${activeMetricObj.unit}`,
    'Percentile Rank (%)': `${r.percentile_rank}%`,
    'Z-Score': r.z_score,
    'Outlier Status': r.is_outlier ? 'Outlier' : 'Normal'
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/60">
              Section 12: Cross-Municipal Rankings & Percentiles
            </span>
            <ResolutionBadge resolution="CSD" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Ontario Municipal League Table & Comparative Rankings
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Empirically ranks Ontario Census Subdivisions across key economic indicators. Incorporates Gaussian z-scores, percentile ranks, and Tukey IQR statistical outlier boundary detection.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExportButton data={exportData} filename={`ontario_rankings_${selectedMetric}`} label="Export League Table" />
        </div>
      </div>

      {/* Contributing Data Inspector */}
      {contributingData && (
        <ContributingDataInspector {...contributingData} />
      )}

      {/* Control Filters Bar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        {/* Metric Selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-300">Metric:</label>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            {METRIC_OPTIONS.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Population Threshold Filters */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Min Population:</span>
          {[
            { label: 'All Cities', value: 0 },
            { label: '> 50k', value: 50000 },
            { label: '> 100k', value: 100000 },
            { label: '> 500k', value: 500000 }
          ].map(btn => (
            <button
              key={btn.value}
              type="button"
              onClick={() => setMinPop(btn.value)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                minPop === btn.value
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* League Table */}
      <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse">
            Computing statewide percentiles and ranking distribution...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 w-16">Rank</th>
                  <th className="py-3 px-4">Municipality (Click to Inspect)</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Population (2021)</th>
                  <th className="py-3 px-4 text-right">{activeMetricObj.label}</th>
                  <th className="py-3 px-4 text-right">Percentile</th>
                  <th className="py-3 px-4 text-right">Z-Score</th>
                  <th className="py-3 px-4 text-center">Outlier</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {filteredRankings.map((r, idx) => {
                  const rank = r.ontario_rank || idx + 1;
                  const isTop3 = rank <= 3;
                  const isOutlier = r.is_outlier;

                  return (
                    <tr 
                      key={r.geography_id} 
                      onClick={() => handleSelectRankingRow(r)}
                      className="hover:bg-slate-800/60 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          rank === 1 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                          rank === 2 ? 'bg-slate-300/20 text-slate-200 border border-slate-400/40' :
                          rank === 3 ? 'bg-amber-700/20 text-amber-500 border border-amber-700/40' :
                          'text-slate-400'
                        }`}>
                          {rank}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-1.5">
                        {r.city_name}
                      </td>
                      <td className="py-3 px-4 text-slate-400">{r.csd_type || 'City'}</td>
                      <td className="py-3 px-4 text-right">{Number(r.population_2021 || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-bold text-indigo-300">
                        {activeMetricObj.unit === '$' 
                          ? `$${Number(r.value_numeric).toLocaleString()}`
                          : `${Number(r.value_numeric).toLocaleString()} ${activeMetricObj.unit}`}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        <span className="text-emerald-400">{r.percentile_rank}%</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">
                        {r.z_score !== null ? (r.z_score > 0 ? `+${r.z_score}` : r.z_score) : '0.00'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isOutlier ? (
                          <span 
                            title={r.outlier_reason}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-950/90 text-rose-300 border border-rose-700/60"
                          >
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            Outlier
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCity(r.geography_id);
                          }}
                          className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
                        >
                          View Profile
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

      {/* Feature Outliers Section */}
      <FeatureOutliersSection 
        category="all" 
        onSelectCity={onSelectCity} 
      />
    </div>
  );
};
