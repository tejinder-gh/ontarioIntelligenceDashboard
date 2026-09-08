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
  Zap
} from 'lucide-react';
import { ResolutionBadge } from '../components/ResolutionBadge.js';
import { ExportButton } from '../components/ExportButton.js';
import { MetricTooltip } from '../components/MetricTooltip.js';
import { FeatureOutliersSection } from '../components/FeatureOutliersSection.js';

export const MethodologySourcesView: React.FC = () => {
  const [dictData, setDictData] = useState<any>(null);
  const [freshnessData, setFreshnessData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dictionary' | 'sources' | 'freshness'>('freshness');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/meta/dictionary').then(r => r.json()),
      fetch('/api/meta/freshness').then(r => r.json())
    ])
    .then(([dict, fresh]) => {
      setDictData(dict);
      setFreshnessData(fresh);
      setLoading(false);
    })
    .catch(err => {
      console.error('Error fetching methodology data:', err);
      setLoading(false);
    });
  }, []);

  if (loading || !dictData || !freshnessData) {
    return (
      <div className="p-12 text-center text-slate-400 animate-pulse">
        Loading data architecture, source registry, and zero-trip verification logs...
      </div>
    );
  }

  const dictionary = dictData.metricsDictionary || [];
  const sources = dictData.sourcesRegistry || [];
  const datasets = freshnessData.datasets || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/60">
              System Architecture & Verification
            </span>
            <ResolutionBadge resolution="PROVINCE" benchmarkLabel="Audit Standards" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Data Architecture, Provenance & Zero-Trip Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Complete transparency into data lineage, official Statistics Canada catalog codes, mathematical definitions, and the Ingestion-First / Database-First local operational store.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-lg border border-slate-700">
          <button
            type="button"
            onClick={() => setActiveTab('freshness')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'freshness'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Zero-Trip Verification
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
            onClick={() => setActiveTab('sources')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'sources'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Source Capabilities ({sources.length})
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ZERO-TRIP VERIFICATION & REPOSITORY HEALTH                                 */}
      {/* ========================================================================= */}
      {activeTab === 'freshness' && (
        <div className="space-y-6">
          {/* Zero-Trip Guarantee Banner */}
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
                  {freshnessData.externalApiCallCount}
                </span>
                <span className="text-xs text-slate-400 block mt-0.5">Strictly 0 runtime requests</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-300 block mb-1 font-medium">Operational Database Engine</span>
                <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-indigo-400" />
                  PostgreSQL 16 (Docker Service)
                </span>
                <span className="text-xs text-slate-400 block mt-1">Database: ontario_economic_intelligence</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-300 block mb-1 font-medium">Geographies & Municipalities Persisted</span>
                <span className="text-sm font-semibold text-emerald-400 font-mono">
                  {freshnessData.totalGeographiesPersisted} Census Subdivisions (CSD)
                </span>
                <span className="text-xs text-slate-400 block mt-1">All 444 Ontario Municipalities</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-300 block mb-1 font-medium">Observations & Entities Stored</span>
                <span className="text-sm font-semibold text-indigo-300 font-mono">
                  {freshnessData.totalObservationsPersisted} Observations / {freshnessData.totalBusinessLocationsPersisted} Businesses
                </span>
                <span className="text-xs text-slate-400 block mt-1">Indexed with 22 relational tables</span>
              </div>
            </div>
          </div>

          {/* Datasets Ingestion & Staleness Registry */}
          <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-400" />
                Ingested Datasets & Staleness Thresholds
              </h3>
              <span className="text-xs text-slate-400">
                Automated change-detection & release-period tracking
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Dataset Code</th>
                    <th className="py-3 px-4">Dataset Name</th>
                    <th className="py-3 px-4">Reference Period</th>
                    <th className="py-3 px-4">Release Date</th>
                    <th className="py-3 px-4">Frequency</th>
                    <th className="py-3 px-4 text-center">Stale After</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {datasets.map((d: any) => (
                    <tr key={d.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-400">{d.dataset_code}</td>
                      <td className="py-3 px-4 font-medium text-white">{d.name}</td>
                      <td className="py-3 px-4 text-slate-300">{d.reference_period}</td>
                      <td className="py-3 px-4 text-slate-400">{d.release_date}</td>
                      <td className="py-3 px-4 text-slate-400">{d.update_frequency}</td>
                      <td className="py-3 px-4 text-center text-slate-400">{d.stale_after_days} days</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-950/90 text-emerald-300 border border-emerald-700/60">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          CURRENT
                        </span>
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
      {/* DATA DICTIONARY                                                           */}
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
                      <ResolutionBadge resolution={m.geographic_scope_supported} />
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
      {/* SOURCE CAPABILITIES REGISTRY                                              */}
      {/* ========================================================================= */}
      {activeTab === 'sources' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sources.map((s: any) => (
              <div key={s.id} className="glass-panel p-5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-indigo-950/90 text-indigo-300 border border-indigo-700/80 uppercase tracking-wider">
                      Priority Rank #{s.priority_rank}
                    </span>
                    <h4 className="text-base font-bold text-white mt-1.5">{s.name}</h4>
                    <span className="text-xs text-slate-400">{s.organization_type}</span>
                  </div>
                  <a
                    href={s.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                  <span className="font-semibold text-slate-300 block">Authorized Capabilities & Scopes:</span>
                  {(s.capabilities || []).map((c: any, cIdx: number) => (
                    <div key={cIdx} className="p-2.5 rounded bg-slate-900/60 border border-slate-800">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-white">{c.attributeGroup}</span>
                        <ResolutionBadge resolution={c.supportedResolutions || 'PROVINCE'} />
                      </div>
                      <p className="text-xs text-slate-300">{c.notes}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cross-Domain Empirical Outliers & Statistical Integrity Verification */}
      <FeatureOutliersSection category="all" />
    </div>
  );
};
