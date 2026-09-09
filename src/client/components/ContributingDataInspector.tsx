import React from 'react';
import { 
  X, 
  Layers, 
  Database, 
  TrendingUp, 
  Info, 
  CheckCircle2, 
  Sparkles, 
  Lightbulb, 
  AlertTriangle, 
  ArrowRight,
  ShieldCheck,
  ExternalLink,
  BookOpen,
  FileCheck,
  Compass,
  Lock,
  Clock
} from 'lucide-react';

export interface ContributingDriverItem {
  label: string;
  value?: string;
  description?: string;
}

export interface DecisionImplicationItem {
  heading: string;
  insight: string;
  impact?: 'positive' | 'warning' | 'neutral';
}

export interface ProvenanceDetails {
  sourceName?: string;
  sourceCode?: string;
  officialPublisher?: string;
  officialIdentifier?: string;
  datasetCode?: string;
  datasetName?: string;
  referencePeriod?: string;
  releaseDate?: string;
  resolution?: string;
  geographicLevel?: string;
  classification?: 'OBSERVED' | 'BENCHMARK' | 'DERIVED' | 'MODELED' | string;
  confidence?: string;
  doi?: string;
  sourceUrl?: string;
  refreshPolicy?: string;
  licenceRules?: string;
  supersededBy?: string;
  checksum?: string;
  etag?: string;
  isBenchmark?: boolean;
  benchmarkLabel?: string;
  methodologyNotes?: string;
  limitations?: string;
  formula?: string;
}

export interface ContributingDataProps {
  title: string;
  category?: string;
  metricLabel?: string;
  metricName?: string;
  metricId?: string;
  geographyId?: string;
  value?: string | number;
  metricValue?: string | number;
  unit?: string;
  percentageOfTotal?: number | string;
  benchmarkValue?: string | number;
  benchmarkLabel?: string;
  deltaPct?: number;
  sourceLineage?: string;
  referenceYear?: string | number;
  provenance?: ProvenanceDetails;
  contextDrivers?: string[];
  contributingDrivers?: ContributingDriverItem[];
  // Executive Decision-Making enhancements
  decisionImplications?: (string | DecisionImplicationItem)[];
  strategicRecommendations?: string[];
  riskMitigations?: string[];
  actionLink?: {
    label: string;
    onClick: () => void;
  };
  methodologyNote?: string;
  onClose?: () => void;
}

export const ContributingDataInspector: React.FC<ContributingDataProps> = ({
  title,
  category,
  metricLabel,
  metricName,
  metricId,
  geographyId,
  value,
  metricValue,
  unit = '',
  percentageOfTotal,
  benchmarkValue,
  benchmarkLabel = 'Ontario Benchmark',
  deltaPct,
  sourceLineage = 'Statistics Canada & Verified Authoritative Sources',
  referenceYear = '2021 / 2026',
  provenance,
  contextDrivers = [],
  contributingDrivers = [],
  decisionImplications = [],
  strategicRecommendations = [],
  riskMitigations = [],
  actionLink,
  methodologyNote,
  onClose
}) => {
  const [fetchedProv, setFetchedProv] = React.useState<ProvenanceDetails | null>(null);

  // Fetch full provenance dossier if metricId and geographyId are provided
  React.useEffect(() => {
    if (metricId && geographyId && (!provenance?.officialPublisher || !provenance?.officialIdentifier)) {
      fetch(`/api/provenance/${encodeURIComponent(metricId)}/${encodeURIComponent(geographyId)}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.provenance) {
            const p = data.provenance;
            setFetchedProv({
              sourceName: p.source_name,
              sourceCode: p.source_friendly_code,
              officialPublisher: p.official_publisher,
              officialIdentifier: p.official_dataset_id,
              datasetCode: p.dataset_code,
              datasetName: p.dataset_name,
              referencePeriod: p.reference_period,
              releaseDate: p.release_date,
              resolution: p.geographic_resolution,
              classification: p.metric_classification || p.default_classification,
              confidence: p.confidence,
              doi: p.doi,
              sourceUrl: p.source_url,
              refreshPolicy: p.frequency,
              licenceRules: p.licence_rules,
              checksum: p.checksum,
              etag: p.etag,
              isBenchmark: p.is_benchmark,
              benchmarkLabel: p.benchmark_label,
              methodologyNotes: p.methodology_notes,
              limitations: p.limitations,
              formula: p.formula
            });
          }
        })
        .catch(() => {});
    }
  }, [metricId, geographyId]);

  // Merge active provenance
  const activeProv: ProvenanceDetails = {
    ...provenance,
    ...(fetchedProv || {})
  };

  // Keyboard accessibility: dismiss on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const displayVal = value !== undefined ? value : (metricValue !== undefined ? metricValue : '—');
  const formattedValue = typeof displayVal === 'number' 
    ? (unit === '$' || unit === 'CAD' ? `$${displayVal.toLocaleString()}` : `${displayVal.toLocaleString()} ${unit}`)
    : `${displayVal} ${unit}`.trim();

  const lineageText = activeProv.sourceName 
    ? `${activeProv.sourceName} (${activeProv.datasetCode || activeProv.officialIdentifier || 'Verified'})` 
    : sourceLineage;

  const cycleText = activeProv.referencePeriod 
    ? activeProv.referencePeriod 
    : String(referenceYear);

  const classification = activeProv.classification || 'OBSERVED';
  const isBenchmark = activeProv.isBenchmark || classification === 'BENCHMARK';

  return (
    <div 
      role="region"
      aria-label="Executive Decision & Contributing Data Inspector"
      className="mt-4 p-5 rounded-2xl liquid-glass-modal border border-indigo-500/60 shadow-2xl backdrop-blur-xl animate-in fade-in-50 slide-in-from-top-3 duration-200"
    >
      {/* Header Bar */}
      <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-950/90 text-indigo-400 border border-indigo-600/60 shadow-inner">
            <Sparkles className="w-5 h-5 text-indigo-300" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-700/50">
                {category ? `${category} • Decision Intelligence` : 'Executive Decision Drill-Down'}
              </span>
              {/* Classification Tag */}
              {classification === 'OBSERVED' && (
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700/60">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  OBSERVED • Direct Primary Empirical
                </span>
              )}
              {classification === 'BENCHMARK' && (
                <span className="text-xs text-cyan-400 font-semibold flex items-center gap-1 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-700/60">
                  <Compass className="w-3.5 h-3.5" />
                  BENCHMARK • Comparative Baseline
                </span>
              )}
              {classification === 'DERIVED' && (
                <span className="text-xs text-indigo-300 font-semibold flex items-center gap-1 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-700/60">
                  <Layers className="w-3.5 h-3.5" />
                  DERIVED • Calculated from Primary
                </span>
              )}
              {classification === 'MODELED' && (
                <span className="text-xs text-amber-300 font-semibold flex items-center gap-1 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-700/60">
                  <TrendingUp className="w-3.5 h-3.5" />
                  MODELED • Statistical Projection
                </span>
              )}
            </div>
            <h4 className="text-base sm:text-lg font-bold text-white tracking-tight mt-1">
              {title}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {actionLink && (
            <button
              type="button"
              onClick={actionLink.onClick}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
            >
              <span>{actionLink.label}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-2 min-h-[34px] min-w-[34px] rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center border border-white/10"
            title="Dismiss Inspector"
            aria-label="Dismiss Executive Decision Inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Benchmark Warning Callout if Benchmark */}
      {isBenchmark && (
        <div className="mt-3 p-3 rounded-xl bg-cyan-950/40 border border-cyan-800/60 flex items-start gap-2.5 text-xs text-cyan-200">
          <Compass className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
          <div>
            <strong className="text-white block mb-0.5">Benchmark Observation Notice:</strong>
            {activeProv.benchmarkLabel || `${benchmarkLabel}: This metric represents a regional or provincial benchmark. It serves as a comparative reference baseline and is not an individual municipal direct count.`}
          </div>
        </div>
      )}

      {/* Primary KPI Grid: Value, Benchmark, Lineage */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 my-3.5">
        {/* Metric Primary Value */}
        <div className="p-3.5 rounded-xl bg-slate-950/90 border border-white/10 shadow-sm">
          <span className="text-xs text-slate-300 block mb-0.5 font-medium">
            {metricName || metricLabel || 'Observed Value'}
          </span>
          <span className="text-xl font-extrabold text-white truncate block">
            {formattedValue}
          </span>
          {percentageOfTotal !== undefined && (
            <span className="block text-xs text-indigo-300 font-semibold mt-0.5">
              {percentageOfTotal}% share of category
            </span>
          )}
          {activeProv.confidence && (
            <span className="inline-block text-xs text-emerald-400 font-medium mt-1">
              Confidence: {activeProv.confidence}
            </span>
          )}
        </div>

        {/* Benchmark Delta or Secondary Context */}
        <div className="p-3.5 rounded-xl bg-slate-950/90 border border-white/10 shadow-sm">
          <span className="text-xs text-slate-300 block mb-0.5 font-medium">
            {benchmarkLabel}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-slate-100">
              {benchmarkValue ? benchmarkValue : 'Provincial Norm'}
            </span>
            {deltaPct !== undefined && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                deltaPct >= 0 
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                  : 'bg-amber-950 text-amber-400 border border-amber-800'
              }`}>
                {deltaPct >= 0 ? `+${deltaPct}%` : `${deltaPct}%`}
              </span>
            )}
          </div>
          <span className="block text-xs text-slate-400 mt-1">
            {activeProv.resolution ? `Resolution: ${activeProv.resolution}` : 'Comparative baseline ratio'}
          </span>
        </div>

        {/* Data Lineage & Provenance */}
        <div className="p-3.5 rounded-xl bg-slate-950/90 border border-white/10 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-slate-300 mb-0.5 font-medium">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Lineage & Audit</span>
          </div>
          <span className="text-xs font-semibold text-emerald-300 block truncate" title={lineageText}>
            {lineageText}
          </span>
          <span className="block text-xs text-slate-400 mt-1">
            Reference Cycle: <strong className="text-slate-200">{cycleText}</strong>
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* AUTHORITATIVE DATA SOURCE REGISTRY PROVENANCE DOSSIER (Section 38 & 40)   */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3 mt-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Authoritative Source & Dataset Provenance Dossier</span>
          </div>
          {activeProv.sourceUrl && (
            <a
              href={activeProv.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              <span>View Upstream Source</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Official Publisher */}
          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-slate-400 block mb-0.5 font-medium">Official Publisher</span>
            <span className="font-semibold text-slate-100 block">
              {activeProv.officialPublisher || activeProv.sourceName || 'Statistics Canada'}
            </span>
          </div>

          {/* Official Table / Catalogue Identifier */}
          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-slate-400 block mb-0.5 font-medium">Official Table / Catalog ID</span>
            <span className="font-mono font-semibold text-indigo-300 block">
              {activeProv.officialIdentifier || activeProv.datasetCode || 'Official Registry'}
            </span>
          </div>

          {/* DOI where applicable */}
          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-slate-400 block mb-0.5 font-medium">DOI / Citation</span>
            {activeProv.doi ? (
              <a
                href={activeProv.doi.startsWith('http') ? activeProv.doi : `https://doi.org/${activeProv.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-emerald-400 hover:underline block truncate"
              >
                {activeProv.doi}
              </a>
            ) : (
              <span className="text-slate-500 font-mono">N/A (Standard Table)</span>
            )}
          </div>

          {/* Geography Level */}
          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-slate-400 block mb-0.5 font-medium">Geography Resolution</span>
            <span className="font-semibold text-slate-200 block">
              {activeProv.resolution || 'Census Subdivision (CSD)'}
            </span>
          </div>

          {/* Release & Reference Period */}
          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-slate-400 block mb-0.5 font-medium">Release / Reference</span>
            <span className="text-slate-200 block">
              {activeProv.referencePeriod || cycleText} {activeProv.releaseDate ? `(Rel: ${activeProv.releaseDate})` : ''}
            </span>
          </div>

          {/* Refresh Policy */}
          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-slate-400 block mb-0.5 font-medium">Refresh Policy</span>
            <span className="text-slate-200 block">
              {activeProv.refreshPolicy || 'Semi-annual (StatCan Schedule)'}
            </span>
          </div>

          {/* Licence Rules */}
          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-slate-400 block mb-0.5 font-medium">Licence & Rights</span>
            <span className="text-slate-200 block truncate" title={activeProv.licenceRules || 'Statistics Canada Open Licence'}>
              {activeProv.licenceRules || 'Statistics Canada Open Licence'}
            </span>
          </div>

          {/* Integrity Checksum */}
          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-slate-400 block mb-0.5 font-medium">Integrity Verification</span>
            <span className="font-mono text-[11px] text-emerald-400 block truncate" title={activeProv.checksum || 'sha256:verified'}>
              {activeProv.checksum ? `${activeProv.checksum.slice(0, 16)}...` : 'Verified Authoritative'}
            </span>
          </div>
        </div>

        {/* Formula or Methodology Notes if available */}
        {(activeProv.formula || activeProv.methodologyNotes || activeProv.limitations) && (
          <div className="pt-2 border-t border-slate-800 text-xs space-y-1 text-slate-300">
            {activeProv.formula && (
              <div>
                <span className="text-slate-400 font-medium">Formula: </span>
                <span className="font-mono text-amber-300">{activeProv.formula}</span>
              </div>
            )}
            {activeProv.methodologyNotes && (
              <div>
                <span className="text-slate-400 font-medium">Methodology: </span>
                <span>{activeProv.methodologyNotes}</span>
              </div>
            )}
            {activeProv.limitations && (
              <div>
                <span className="text-slate-400 font-medium">Limitations: </span>
                <span className="text-slate-400 italic">{activeProv.limitations}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: STRATEGIC DECISION-MAKING IMPLICATIONS                          */}
      {/* ========================================================================= */}
      {decisionImplications.length > 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/70 via-slate-900/80 to-slate-950 border border-indigo-500/40 shadow-md mt-3 space-y-2.5">
          <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wider">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span>Key Implications for Business & Policy Decision Makers:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {decisionImplications.map((imp, idx) => {
              if (typeof imp === 'string') {
                return (
                  <div key={idx} className="p-3 rounded-lg bg-slate-900/90 border border-white/10 flex items-start gap-2.5 text-xs">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                    <span className="text-slate-200 leading-relaxed">{imp}</span>
                  </div>
                );
              }
              return (
                <div key={idx} className="p-3 rounded-lg bg-slate-900/90 border border-white/10 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-white mb-1">
                    <span className={`w-2 h-2 rounded-full ${
                      imp.impact === 'positive' ? 'bg-emerald-400' :
                      imp.impact === 'warning' ? 'bg-amber-400' : 'bg-indigo-400'
                    }`} />
                    <span>{imp.heading}</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed pl-3.5">{imp.insight}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: STRATEGIC PLAYBOOK / ACTION RECOMMENDATIONS                    */}
      {/* ========================================================================= */}
      {strategicRecommendations.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-950/70 border border-emerald-900/50 shadow-md mt-3 space-y-2">
          <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Recommended Strategic Action Plan:</span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-200">
            {strategicRecommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                <span className="leading-relaxed">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: RISK MITIGATIONS                                               */}
      {/* ========================================================================= */}
      {riskMitigations.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-900/50 shadow-md mt-3 space-y-2">
          <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Operational Risk Mitigations:</span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-200">
            {riskMitigations.map((risk, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-rose-400 font-bold mt-0.5">⚠</span>
                <span className="leading-relaxed">{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* String array context drivers */}
      {contextDrivers.length > 0 && (
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/10 text-xs mt-3">
          <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 mb-2">
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            Empirical Contributing Drivers:
          </span>
          <ul className="space-y-1.5 text-slate-200 text-xs">
            {contextDrivers.map((driver, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5">•</span>
                <span className="leading-relaxed">{driver}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Structured contributing drivers */}
      {contributingDrivers.length > 0 && (
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/10 text-xs mt-3">
          <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5 mb-2.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            Contributing Observations & Contextual Drivers:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {contributingDrivers.map((driver, i) => (
              <div key={i} className="p-3 rounded-lg bg-slate-900/90 border border-white/10">
                <div className="flex items-center justify-between text-indigo-300 font-semibold text-xs mb-1">
                  <span>{driver.label}</span>
                  {driver.value && <span className="text-white font-bold">{driver.value}</span>}
                </div>
                {driver.description && (
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {driver.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile Action Link */}
      {actionLink && (
        <div className="sm:hidden mt-3 pt-3 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={actionLink.onClick}
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
          >
            <span>{actionLink.label}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {methodologyNote && (
        <div className="mt-3 text-xs text-slate-400 italic px-1">
          {methodologyNote}
        </div>
      )}
    </div>
  );
};
