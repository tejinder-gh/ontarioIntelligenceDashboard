import React from 'react';
import { X, Layers, Database, TrendingUp, Info, CheckCircle2 } from 'lucide-react';

export interface ContributingDriverItem {
  label: string;
  value?: string;
  description?: string;
}

export interface ContributingDataProps {
  title: string;
  category?: string;
  metricLabel?: string;
  metricName?: string;
  value?: string | number;
  metricValue?: string | number;
  unit?: string;
  percentageOfTotal?: number | string;
  benchmarkValue?: string | number;
  benchmarkLabel?: string;
  deltaPct?: number;
  sourceLineage?: string;
  referenceYear?: string | number;
  provenance?: {
    sourceName?: string;
    datasetCode?: string;
    referencePeriod?: string;
    resolution?: string;
    confidence?: string;
    sourceUrl?: string;
  };
  contextDrivers?: string[];
  contributingDrivers?: ContributingDriverItem[];
  methodologyNote?: string;
  onClose: () => void;
}

export const ContributingDataInspector: React.FC<ContributingDataProps> = ({
  title,
  category,
  metricLabel,
  metricName,
  value,
  metricValue,
  unit = '',
  percentageOfTotal,
  benchmarkValue,
  benchmarkLabel = 'Ontario Benchmark',
  deltaPct,
  sourceLineage = 'Statistics Canada 2021 Census of Population & Audited Datasets',
  referenceYear = '2021 / 2025-Q4',
  provenance,
  contextDrivers = [],
  contributingDrivers = [],
  methodologyNote,
  onClose
}) => {
  // Keyboard accessibility: dismiss on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const displayVal = value !== undefined ? value : (metricValue !== undefined ? metricValue : '—');
  const formattedValue = typeof displayVal === 'number' 
    ? (unit === '$' || unit === 'CAD' ? `$${displayVal.toLocaleString()}` : `${displayVal.toLocaleString()} ${unit}`)
    : `${displayVal} ${unit}`.trim();

  const lineageText = provenance?.sourceName 
    ? `${provenance.sourceName} (${provenance.datasetCode || 'Verified'})` 
    : sourceLineage;

  const cycleText = provenance?.referencePeriod 
    ? provenance.referencePeriod 
    : String(referenceYear);

  return (
    <div 
      role="region"
      aria-label="Contributing Data Inspector"
      className="mt-4 p-4 rounded-xl liquid-glass-modal border border-indigo-500/50 shadow-2xl backdrop-blur-md animate-in fade-in-50 slide-in-from-top-2 duration-150"
    >
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-950/90 text-indigo-400 border border-indigo-700/60">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">
              {category ? `${category} • Active Contributing Data Drill-Down` : 'Active Graph Drill-Down & Contributing Observations'}
            </span>
            <h4 className="text-sm font-bold text-white tracking-tight">
              {title}
            </h4>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2 min-h-[32px] min-w-[32px] rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center"
          title="Dismiss Contributing Data View"
          aria-label="Dismiss Contributing Data Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3">
        {/* Metric Primary Value */}
        <div className="p-3 rounded-lg bg-slate-950/80 border border-white/10">
          <span className="text-xs text-slate-300 block mb-0.5 font-medium">
            {metricName || metricLabel || 'Observed Value'}
          </span>
          <span className="text-lg font-extrabold text-white truncate block">
            {formattedValue}
          </span>
          {percentageOfTotal !== undefined && (
            <span className="block text-xs text-indigo-300 font-semibold mt-0.5">
              {percentageOfTotal}% share of category
            </span>
          )}
          {provenance?.confidence && (
            <span className="inline-block text-xs text-emerald-400 font-medium mt-1">
              Confidence: {provenance.confidence}
            </span>
          )}
        </div>

        {/* Benchmark Delta or Secondary Context */}
        <div className="p-3 rounded-lg bg-slate-950/80 border border-white/10">
          <span className="text-xs text-slate-300 block mb-0.5 font-medium">
            {benchmarkLabel}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-slate-100">
              {benchmarkValue ? benchmarkValue : 'Provincial Norm'}
            </span>
            {deltaPct !== undefined && (
              <span className={`text-xs font-bold ${deltaPct >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {deltaPct >= 0 ? `+${deltaPct}%` : `${deltaPct}%`}
              </span>
            )}
          </div>
          <span className="block text-xs text-slate-400 mt-0.5">
            {provenance?.resolution ? `Resolution: ${provenance.resolution}` : 'Comparative baseline ratio'}
          </span>
        </div>

        {/* Data Lineage & Provenance */}
        <div className="p-3 rounded-lg bg-slate-950/80 border border-white/10">
          <div className="flex items-center gap-1 text-xs text-slate-300 mb-0.5 font-medium">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Lineage & Audit</span>
          </div>
          <span className="text-xs font-semibold text-emerald-300 block truncate" title={lineageText}>
            {lineageText}
          </span>
          <span className="block text-xs text-slate-400 mt-0.5">
            Reference Cycle: {cycleText}
          </span>
        </div>
      </div>

      {/* String array context drivers */}
      {contextDrivers.length > 0 && (
        <div className="p-3 rounded-lg bg-slate-950/60 border border-white/10 text-xs mt-2">
          <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 mb-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            Empirical Contributing Drivers:
          </span>
          <ul className="space-y-1 text-slate-200 text-xs">
            {contextDrivers.map((driver, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-indigo-400 mt-0.5">•</span>
                <span>{driver}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Structured contributing drivers */}
      {contributingDrivers.length > 0 && (
        <div className="p-3 rounded-lg bg-slate-950/70 border border-white/10 text-xs mt-2">
          <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5 mb-2">
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            Contributing Observations & Contextual Drivers:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {contributingDrivers.map((driver, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-slate-900/90 border border-white/10">
                <div className="flex items-center justify-between text-indigo-300 font-semibold text-xs">
                  <span>{driver.label}</span>
                  {driver.value && <span className="text-white font-bold">{driver.value}</span>}
                </div>
                {driver.description && (
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {driver.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {methodologyNote && (
        <div className="mt-2 text-xs text-slate-300 italic px-1">
          {methodologyNote}
        </div>
      )}
    </div>
  );
};
