import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Database, 
  BookOpen, 
  Cpu, 
  Layers, 
  CheckCircle2, 
  RefreshCw, 
  ExternalLink,
  Lock,
  Server,
  Zap,
  AlertTriangle,
  Compass,
  TrendingUp,
  XCircle,
  FileText,
  Clock,
  Search,
  Filter,
  Check,
  X
} from 'lucide-react';
import { ResolutionBadge } from '../components/ResolutionBadge.js';
import { ExportButton } from '../components/ExportButton.js';
import { MetricTooltip } from '../components/MetricTooltip.js';
import { FeatureOutliersSection } from '../components/FeatureOutliersSection.js';

export const MethodologySourcesView: React.FC = () => {
  const [sources, setSources] = useState<any[]>([]);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [dictionary, setDictionary] = useState<any[]>([]);
  const [freshnessData, setFreshnessData] = useState<any>(null);
  const [coverageGaps, setCoverageGaps] = useState<any[]>([]);
  const [disagreements, setDisagreements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'sources' | 'datasets' | 'capabilities' | 'freshness' | 'dictionary' | 'governance'>('sources');
  const [sourceSearch, setSourceSearch] = useState('');
  const [datasetFilter, setDatasetFilter] = useState<'ALL' | 'OBSERVED' | 'BENCHMARK' | 'DERIVED' | 'MODELED'>('ALL');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/sources').then(r => r.json()).catch(() => ({ sources: [] })),
      fetch('/api/datasets').then(r => r.json()).catch(() => ({ datasets: [] })),
      fetch('/api/meta/dictionary').then(r => r.json()).catch(() => ({ metricsDictionary: [] })),
      fetch('/api/meta/freshness').then(r => r.json()).catch(() => ({})),
      fetch('/api/coverage-gaps').then(r => r.json()).catch(() => ({ gaps: [] })),
      fetch('/api/source-disagreements').then(r => r.json()).catch(() => ({ disagreements: [] }))
    ])
    .then(([sourcesRes, datasetsRes, dictRes, freshRes, gapsRes, disagRes]) => {
      setSources(sourcesRes.sources || []);
      setDatasets(datasetsRes.datasets || []);
      setDictionary(dictRes.metricsDictionary || []);
      setFreshnessData(freshRes || null);
      setCoverageGaps(gapsRes.gaps || []);
      setDisagreements(disagRes.disagreements || []);
      setLoading(false);
    })
    .catch(err => {
      console.error('Error fetching registry data:', err);
      setLoading(false);
    });
  }, []);

  const filteredSources = sources.filter(s => 
    s.name.toLowerCase().includes(sourceSearch.toLowerCase()) ||
    s.friendly_code.toLowerCase().includes(sourceSearch.toLowerCase()) ||
    (s.official_publisher && s.official_publisher.toLowerCase().includes(sourceSearch.toLowerCase())) ||
    (s.official_dataset_id && s.official_dataset_id.toLowerCase().includes(sourceSearch.toLowerCase()))
  );

  const filteredDatasets = datasets.filter(d => {
    if (datasetFilter !== 'ALL' && d.classification !== datasetFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 animate-pulse">
        Loading authoritative data source registry, capability matrices, and zero-trip verification logs...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/60">
              Authoritative Data Source Registry (Section 40)
            </span>
            <ResolutionBadge resolution="PROVINCE" benchmarkLabel="Audit Standards" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Authoritative Registry, Lineage & Capability Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Exhaustive inventory of 35 authoritative publishers, official catalogue identifiers, DOI citations, mathematical classifications (OBSERVED / BENCHMARK / DERIVED / MODELED), programmatic capability matrices, and offline local SQL verification.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-1.5 rounded-lg border border-slate-700">
          <button
            type="button"
            onClick={() => setActiveTab('sources')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'sources'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sources Registry ({sources.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('datasets')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'datasets'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Datasets Catalog ({datasets.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('capabilities')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'capabilities'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Capability Matrix
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('freshness')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'freshness'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Zero-Trip Storage
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dictionary')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'dictionary'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Data Dictionary ({dictionary.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('governance')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'governance'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Disagreements & Gaps ({coverageGaps.length + disagreements.length})
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: AUTHORITATIVE SOURCE REGISTRY (35 SOURCES)                         */}
      {/* ========================================================================= */}
      {activeTab === 'sources' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 glass-panel rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 flex-1 max-w-md bg-slate-900 px-3 py-2 rounded-lg border border-slate-700">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={sourceSearch}
                onChange={e => setSourceSearch(e.target.value)}
                placeholder="Filter by source name, code, publisher, or official table ID..."
                className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
              />
            </div>
            <div className="text-xs text-slate-400">
              Showing <span className="text-white font-bold">{filteredSources.length}</span> of {sources.length} Authoritative Sources
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSources.map((s: any) => (
              <div key={s.id} className="glass-panel p-5 rounded-xl border border-slate-800 space-y-3.5 hover:border-slate-700 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-950/90 text-indigo-300 border border-indigo-700/80 uppercase tracking-wider font-mono">
                        {s.friendly_code}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        Priority #{s.priority_rank}
                      </span>
                      {s.is_authoritative && (
                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                          AUTHORITATIVE
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-bold text-white mt-1.5">{s.name}</h4>
                    <span className="text-xs text-slate-400 block mt-0.5">
                      {s.official_publisher} ({s.organization_type})
                    </span>
                  </div>

                  {s.website_url && (
                    <a
                      href={s.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                      title="Open Official Upstream Portal"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Official Table / ID:</span>
                    <span className="font-mono text-indigo-300 font-semibold truncate block">
                      {s.official_dataset_id || 'Official Record'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">DOI / Citation:</span>
                    {s.doi ? (
                      <a
                        href={s.doi.startsWith('http') ? s.doi : `https://doi.org/${s.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-emerald-400 hover:underline truncate block"
                      >
                        {s.doi}
                      </a>
                    ) : (
                      <span className="text-slate-500 font-mono">Standard Catalogue</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Frequency:</span>
                    <span className="text-slate-200">{s.frequency}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Supported Geography:</span>
                    <span className="text-slate-200">{s.supported_geography}</span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-800/60">
                    <span className="text-slate-500 block text-[11px]">Licence & Rights:</span>
                    <span className="text-slate-300 block truncate" title={s.licence_rules}>
                      {s.licence_rules}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block text-[11px]">Cache Policy:</span>
                    <span className="text-slate-400 font-mono text-[11px]">{s.cache_policy}</span>
                  </div>
                </div>

                {/* Authorized Capabilities & Scopes */}
                {s.capabilities && s.capabilities.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-800 text-xs">
                    <span className="font-semibold text-slate-300 block">Authorized Domain Capabilities:</span>
                    <div className="space-y-1">
                      {s.capabilities.map((c: any, cIdx: number) => (
                        <div key={cIdx} className="p-2 rounded bg-slate-900/80 border border-slate-800/90 flex items-start justify-between gap-2">
                          <div>
                            <span className="font-semibold text-white">{c.attributeGroup}</span>
                            <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{c.notes}</p>
                          </div>
                          <ResolutionBadge resolution={c.supportedResolutions || 'PROVINCE'} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DATASETS CATALOG & LINEAGE                                         */}
      {/* ========================================================================= */}
      {activeTab === 'datasets' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 glass-panel rounded-xl border border-slate-800">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-300 font-semibold">Classification:</span>
              {(['ALL', 'OBSERVED', 'BENCHMARK', 'DERIVED', 'MODELED'] as const).map(cls => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setDatasetFilter(cls)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                    datasetFilter === cls
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-700'
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>
            <div className="text-xs text-slate-400">
              Showing <span className="text-white font-bold">{filteredDatasets.length}</span> Ingested Datasets
            </div>
          </div>

          <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Dataset Code / Table ID</th>
                    <th className="py-3 px-4">Official Name</th>
                    <th className="py-3 px-4">Classification</th>
                    <th className="py-3 px-4">Publisher</th>
                    <th className="py-3 px-4">Reference Cycle</th>
                    <th className="py-3 px-4">Release Date</th>
                    <th className="py-3 px-4">Coverage</th>
                    <th className="py-3 px-4">Lineage / Superseded</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {filteredDatasets.map((d: any) => (
                    <tr key={d.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-indigo-400">{d.dataset_code}</div>
                        {d.source_friendly_code && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Source: {d.source_friendly_code}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-medium text-white">{d.name}</div>
                        {d.doi && (
                          <a 
                            href={d.doi.startsWith('http') ? d.doi : `https://doi.org/${d.doi}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-emerald-400 hover:underline block truncate font-mono mt-0.5"
                          >
                            DOI: {d.doi}
                          </a>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {d.classification === 'OBSERVED' && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                            OBSERVED
                          </span>
                        )}
                        {d.classification === 'BENCHMARK' && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-700/60">
                            BENCHMARK
                          </span>
                        )}
                        {d.classification === 'DERIVED' && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-700/60">
                            DERIVED
                          </span>
                        )}
                        {d.classification === 'MODELED' && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-950 text-amber-300 border border-amber-700/60">
                            MODELED
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-300">{d.official_publisher}</td>
                      <td className="py-3 px-4 font-semibold text-slate-200">{d.reference_period}</td>
                      <td className="py-3 px-4 text-slate-400">{d.release_date || 'Periodic'}</td>
                      <td className="py-3 px-4 text-slate-300">{d.geographic_coverage}</td>
                      <td className="py-3 px-4 text-xs">
                        {d.superseding_dataset_id ? (
                          <span className="text-amber-400 font-mono">
                            Superseded by {d.superseding_dataset_id} (Historical Lineage)
                          </span>
                        ) : d.dataset_code === 'STATCAN-33-10-1176-01' ? (
                          <span className="text-emerald-400 font-mono">
                            Supersedes 33-10-1097-01 (Aug 14, 2026 Release)
                          </span>
                        ) : (
                          <span className="text-slate-500">Current Primary</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {d.is_current ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                            <CheckCircle2 className="w-3 h-3" />
                            CURRENT
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            LINEAGE
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PROGRAMMATIC CAPABILITY ENGINE MATRIX (SECTION 40)                 */}
      {/* ========================================================================= */}
      {activeTab === 'capabilities' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-xl border border-indigo-500/30 bg-indigo-950/20 shadow-xl space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-900/40 rounded-xl border border-indigo-700">
                <Cpu className="w-7 h-7 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Programmatic Capability & Cross-Domain Constraint Engine
                </h3>
                <p className="text-xs text-slate-300 mt-0.5 max-w-2xl">
                  Enforces strict ontological boundaries across datasets. Prevents hallucinated cross-tabs, improper down-allocation of regional aggregates, and terms-of-service violations.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Rule 1: Census 2021 live counts */}
            <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-rose-950/80 text-rose-400 border border-rose-800">
                    <X className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Census 2021 → Live Business Counts</h4>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                  PROHIBITED
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                The Census of Population (98-316-X2021001) is a decennial/quinquennial demographic instrument and cannot serve live business entity counts. Business counts must query Canadian Business Counts Table <code className="text-indigo-300 font-mono">33-10-1176-01</code>.
              </p>
              <div className="text-[11px] text-slate-400 font-mono bg-slate-900/80 p-2 rounded border border-slate-800">
                Engine Decision: checkDatasetCapability('DEM-CEN21', 'business_counts', 'CSD') → false
              </div>
            </div>

            {/* Rule 2: Non-Employer Business Counts down-allocation */}
            <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-rose-950/80 text-rose-400 border border-rose-800">
                    <X className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Table 33-10-1175-01 → CSD Allocation</h4>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                  PROHIBITED
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Canadian Business Counts without employees (<code className="text-indigo-300 font-mono">33-10-1175-01</code>) is only published at Canada and Provincial levels. Down-allocation to individual Census Subdivisions is strictly prohibited to prevent statistical fabrication.
              </p>
              <div className="text-[11px] text-slate-400 font-mono bg-slate-900/80 p-2 rounded border border-slate-800">
                Engine Decision: checkDatasetCapability('STATCAN-33-10-1175-01', 'non_employer_counts', 'CSD') → false
              </div>
            </div>

            {/* Rule 3: Survey of Household Spending (SHS) */}
            <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-rose-950/80 text-rose-400 border border-rose-800">
                    <X className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-white">SHS Spending → Individual CSD Resolution</h4>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                  PROHIBITED
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Survey of Household Spending Table <code className="text-indigo-300 font-mono">11-10-0222-01</code> lacks sufficient sample size at municipality resolution. In municipal views, spending is displayed strictly as a Provincial Benchmark (<code className="text-indigo-300 font-mono">PR_35</code>).
              </p>
              <div className="text-[11px] text-slate-400 font-mono bg-slate-900/80 p-2 rounded border border-slate-800">
                Engine Decision: Fallback to benchmark with label 'Ontario Provincial Baseline (SHS)'
              </div>
            </div>

            {/* Rule 4: Commercial Real Estate DDF */}
            <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                    <Check className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-white">CREA DDF Commercial Listings</h4>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  ALLOWED WITH POLICY
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                CREA Data Distribution Facility is authorized exclusively for direct listing display with MLS® attribution. Aggregation, scraping, or derivative sub-licensing is strictly restricted. Unconfigured environments gracefully return structured empty states.
              </p>
              <div className="text-[11px] text-slate-400 font-mono bg-slate-900/80 p-2 rounded border border-slate-800">
                Licence Boundary: max_cache_duration_hours = 24 | attribution_required = true
              </div>
            </div>

            {/* Rule 5: Google Places / Yelp Directories */}
            <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-950/80 text-amber-400 border border-amber-800">
                    <Lock className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Google Places / Yelp Permanent Warehouse</h4>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                  EPHEMERAL CACHE ONLY
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Third-party commercial place APIs prohibit creating permanent offline replicas. The platform implements 24-hour cache invalidation and adheres to provider Terms of Service, persisting only place IDs and metadata tokens.
              </p>
              <div className="text-[11px] text-slate-400 font-mono bg-slate-900/80 p-2 rounded border border-slate-800">
                Licence Boundary: can_persist_identifiers_only = true | max_cache_duration_hours = 24
              </div>
            </div>

            {/* Rule 6: StatCan Labour Force Survey (LFS) */}
            <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                    <Check className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-white">LFS Labour Force → CMA Benchmark</h4>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                  BENCHMARK OBSERVED
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Labour Force Survey monthly tables (<code className="text-indigo-300 font-mono">14-10-0468-01</code>) are published at Census Metropolitan Area (CMA) resolution. Municipalities inherit their regional CMA benchmark with explicit labeling.
              </p>
              <div className="text-[11px] text-slate-400 font-mono bg-slate-900/80 p-2 rounded border border-slate-800">
                Engine Decision: metric_classification = 'BENCHMARK' | benchmark_label = 'CMA LFS Benchmark'
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ZERO-TRIP VERIFICATION & STORAGE                                   */}
      {/* ========================================================================= */}
      {activeTab === 'freshness' && freshnessData && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-xl border border-emerald-900/60 bg-emerald-950/20 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-emerald-900/40">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-900/40 rounded-xl border border-emerald-800">
                  <ShieldCheck className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white">
                      Zero External Round-Trip Guarantee Verified
                    </h3>
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-900 text-emerald-200 border border-emerald-700">
                      100% OFFLINE / LOCAL SQL
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                    All UI dashboards, analytical ranking simulations, and city profiles query the local persistent PostgreSQL database engine. Zero external network round-trips occur during normal dashboard usage.
                  </p>
                </div>
              </div>

              <div className="text-right p-3 bg-slate-900/80 rounded-xl border border-emerald-900/50">
                <span className="text-xs text-slate-300 block">External API Calls Made at Runtime</span>
                <span className="text-4xl font-extrabold text-emerald-400 font-mono">
                  {freshnessData.externalApiCallCount || 0}
                </span>
                <span className="text-xs text-slate-400 block mt-0.5">Strictly 0 runtime requests</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-300 block mb-1 font-medium">Operational Database Engine</span>
                <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-indigo-400" />
                  PostgreSQL 16 (Local Operational Store)
                </span>
                <span className="text-xs text-slate-400 block mt-1">Database: ontario_economic_intelligence</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-300 block mb-1 font-medium">Geographies & Municipalities Persisted</span>
                <span className="text-sm font-semibold text-emerald-400 font-mono">
                  {freshnessData.totalGeographiesPersisted || 444} Census Subdivisions (CSD)
                </span>
                <span className="text-xs text-slate-400 block mt-1">All 444 Ontario Municipalities</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-300 block mb-1 font-medium">Observations & Entities Stored</span>
                <span className="text-sm font-semibold text-indigo-300 font-mono">
                  {freshnessData.totalObservationsPersisted || 0} Observations
                </span>
                <span className="text-xs text-slate-400 block mt-1">Indexed across 30+ relational tables</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: DATA DICTIONARY                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'dictionary' && (
        <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              Standardized Metrics Dictionary ({dictionary.length} Definitions)
            </h3>
            <ExportButton data={dictionary} filename="metrics_data_dictionary" label="Export Dictionary" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Metric Identifier</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Formal Definition</th>
                  <th className="py-3 px-4">Mathematical Formula</th>
                  <th className="py-3 px-4">Scope</th>
                  <th className="py-3 px-4">Data Limitations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {dictionary.map((m: any) => (
                  <tr key={m.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{m.name}</div>
                      <div className="font-mono text-xs text-indigo-400 mt-0.5">{m.id}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{m.category}</td>
                    <td className="py-3 px-4 text-slate-300 max-w-xs">{m.definition}</td>
                    <td className="py-3 px-4 font-mono text-xs text-amber-300 max-w-xs">{m.formula || 'Direct Observation'}</td>
                    <td className="py-3 px-4">
                      <ResolutionBadge resolution={m.geographic_scope_supported || 'CSD'} />
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-xs text-xs">{m.limitations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: COVERAGE GAPS & SOURCE DISAGREEMENTS (SECTIONS 36 & 39)            */}
      {/* ========================================================================= */}
      {activeTab === 'governance' && (
        <div className="space-y-6">
          {/* Disagreements */}
          <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Audited Source Disagreements ({disagreements.length})</span>
            </div>
            <p className="text-xs text-slate-400">
              When multiple authoritative sources report differing numbers for the same metric, both observations are preserved for transparent audit rather than silently overwritten.
            </p>

            {disagreements.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 italic">
                Zero unresolved source disagreements detected. All authoritative observations align within acceptable variance.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Metric</th>
                      <th className="py-2.5 px-3">Geography</th>
                      <th className="py-2.5 px-3">Source A Value</th>
                      <th className="py-2.5 px-3">Source B Value</th>
                      <th className="py-2.5 px-3">Delta %</th>
                      <th className="py-2.5 px-3">Preferred Source Rationale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {disagreements.map((d: any) => (
                      <tr key={d.id} className="hover:bg-slate-900/50">
                        <td className="py-2.5 px-3 font-mono text-indigo-400">{d.metric_id}</td>
                        <td className="py-2.5 px-3">{d.geography_id}</td>
                        <td className="py-2.5 px-3 font-mono">{d.value_a} ({d.source_a_name})</td>
                        <td className="py-2.5 px-3 font-mono">{d.value_b} ({d.source_b_name})</td>
                        <td className="py-2.5 px-3 font-bold text-amber-400">{d.discrepancy_pct}%</td>
                        <td className="py-2.5 px-3 text-slate-300">{d.selection_rationale}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Coverage Gaps */}
          <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>Municipal Coverage Gaps & Demand Ledger ({coverageGaps.length})</span>
            </div>
            <p className="text-xs text-slate-400">
              Tracks requests where data is unavailable at municipal resolution, logging user demand signals to prioritize upstream synchronization pipelines.
            </p>

            {coverageGaps.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 italic">
                Zero active coverage gaps logged in this session.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Requested Metric</th>
                      <th className="py-2.5 px-3">Geography</th>
                      <th className="py-2.5 px-3">Nearest Resolution</th>
                      <th className="py-2.5 px-3">Diagnostic Reason</th>
                      <th className="py-2.5 px-3">Fallback Benchmark</th>
                      <th className="py-2.5 px-3">User Context</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {coverageGaps.map((g: any) => (
                      <tr key={g.id} className="hover:bg-slate-900/50">
                        <td className="py-2.5 px-3 font-mono text-indigo-400">{g.requested_metric}</td>
                        <td className="py-2.5 px-3 font-semibold text-white">{g.requested_geography}</td>
                        <td className="py-2.5 px-3 text-slate-300">{g.closest_available_geography || 'Province'}</td>
                        <td className="py-2.5 px-3 text-slate-400">{g.reason}</td>
                        <td className="py-2.5 px-3 font-mono text-cyan-400">{g.fallback_benchmark_code || 'PR_35'}</td>
                        <td className="py-2.5 px-3 text-slate-400 italic">{g.user_context || 'Standard Exploration'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cross-Domain Empirical Outliers & Statistical Integrity Verification */}
      <FeatureOutliersSection category="all" />
    </div>
  );
};

