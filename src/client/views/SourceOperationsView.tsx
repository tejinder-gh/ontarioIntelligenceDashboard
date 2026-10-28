import React, { useState, useEffect } from 'react';
import {
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Play,
  Clock,
  ShieldCheck,
  FileText,
} from 'lucide-react';

export const SourceOperationsView: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [lastReport, setLastReport] = useState<any>(null);

  const fetchHealth = () => {
    setLoading(true);
    fetch('/api/intelligence/sources/health')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setData(res.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleTriggerHalton = async () => {
    setTriggering(true);
    try {
      const res = await fetch('/api/intelligence/acquisition/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'halton', limit: 600 }),
      });
      const json = await res.json();
      if (json.success) {
        setLastReport(json.report);
        fetchHealth();
      }
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
              Operational Pipeline
            </span>
            <span className="text-xs text-slate-400">• Evidence Provenance & Registry</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Source Operations & Acquisition</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Monitor source health, statutory licensing terms, automated ingestion checkpoints, and incremental refresh jobs.
          </p>
        </div>

        <button
          onClick={handleTriggerHalton}
          disabled={triggering}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg transition"
        >
          {triggering ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Ingesting Halton Places...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Trigger Halton Proof Run (500+)</span>
            </>
          )}
        </button>
      </div>

      {/* Global Stats */}
      {data?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-xs text-slate-500 uppercase font-semibold block mb-1">Total Canonical Places</span>
            <span className="text-2xl font-bold text-white">{data.stats.totalCanonical.toLocaleString()}</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-xs text-slate-500 uppercase font-semibold block mb-1">Raw Observations Linked</span>
            <span className="text-2xl font-bold text-indigo-400">{data.stats.totalSources.toLocaleString()}</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-xs text-slate-500 uppercase font-semibold block mb-1">Contact Points Recorded</span>
            <span className="text-2xl font-bold text-emerald-400">{data.stats.totalContacts.toLocaleString()}</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-xs text-slate-500 uppercase font-semibold block mb-1">Independently Verified</span>
            <span className="text-2xl font-bold text-cyan-400">{data.stats.totalVerified.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Proof Run Success Alert */}
      {lastReport && (
        <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-800/80 text-xs text-emerald-200 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-emerald-100">
              Halton Region Proof Run Completed Successfully ({lastReport.durationMs}ms)
            </div>
            <p>
              Observed: <strong>{lastReport.totalObserved}</strong> records across Halton Region • 
              Canonical Created: <strong>{lastReport.canonicalCreated}</strong> • 
              Updated: <strong>{lastReport.canonicalUpdated}</strong> • 
              Duplicates Reconciled: <strong>{lastReport.duplicateMatches}</strong>
            </p>
            <p className="text-emerald-300">
              Burlington: {lastReport.haltonCounts.burlington} | Oakville: {lastReport.haltonCounts.oakville} | 
              Milton: {lastReport.haltonCounts.milton} | Halton Hills: {lastReport.haltonCounts.haltonHills}
            </p>
          </div>
        </div>
      )}

      {/* Sources Catalog Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {data?.sources?.map((src: any) => (
          <div key={src.sourceId} className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
                  {src.license}
                </span>
                <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active
                </span>
              </div>
              <h3 className="text-base font-bold text-white">{src.publisher}</h3>
              <p className="text-xs text-slate-400 mt-1">{src.description}</p>
            </div>

            <div className="space-y-2 border-t border-slate-800/80 pt-3 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Scope:</span>
                <span className="text-slate-200 font-medium">{src.geographicScope}</span>
              </div>
              <div className="flex justify-between">
                <span>Commercial Reuse:</span>
                <span className="text-emerald-400 font-medium">Permitted</span>
              </div>
              <div className="flex justify-between">
                <span>Marketing Consent:</span>
                <span className="text-amber-400 font-medium">Not Implied (Requires CASL Check)</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Ingestion Runs Table */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Recent Ingestion Executions</h3>
          <button onClick={fetchHealth} className="text-xs text-indigo-400 hover:underline flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Run ID</th>
                <th className="py-3 px-4">Dataset</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Observed</th>
                <th className="py-3 px-4">Inserted</th>
                <th className="py-3 px-4">Updated</th>
                <th className="py-3 px-4">Started At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {data?.recentRuns?.map((run: any) => (
                <tr key={run.id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-mono font-semibold text-white">#{run.id}</td>
                  <td className="py-3 px-4 text-slate-300">{run.dataset_id}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                      {run.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono">{run.rows_fetched}</td>
                  <td className="py-3 px-4 font-mono text-emerald-400">+{run.rows_inserted}</td>
                  <td className="py-3 px-4 font-mono text-indigo-400">{run.rows_updated}</td>
                  <td className="py-3 px-4 text-slate-500">{new Date(run.start_time).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
