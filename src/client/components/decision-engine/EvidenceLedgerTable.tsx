import React, { useState } from 'react';
import { Database, AlertTriangle, ArrowRight, ExternalLink, CheckCircle2, AlertOctagon, ChevronDown, ChevronUp } from 'lucide-react';
import type { EvidenceClassification, EvidenceRecordItem } from '../../types/decision-engine.js';

interface EvidenceLedgerTableProps {
  items: EvidenceRecordItem[];
}

export const EvidenceLedgerTable: React.FC<EvidenceLedgerTableProps> = ({ items }) => {
  const [expandedProvenanceIdx, setExpandedProvenanceIdx] = useState<number | null>(null);

  const getClassificationBadge = (cls: EvidenceClassification | 'UNVERIFIED_ASSUMPTION') => {
    switch (cls) {
      case 'OBSERVED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">OBSERVED</span>;
      case 'AUDITED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">AUDITED</span>;
      case 'BENCHMARK':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">BENCHMARK</span>;
      case 'DERIVED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">DERIVED</span>;
      case 'UNVERIFIED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">UNVERIFIED</span>;
      case 'UNVERIFIED_ASSUMPTION':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">ASSUMPTION</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400">UNAVAILABLE</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Cautionary Banner */}
      <div className="p-4 bg-amber-950/20 border border-amber-500/20 rounded-2xl flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-300 leading-relaxed">
          <strong className="font-semibold text-amber-200">Traceable Provenance Standard:</strong> Every claim connects observed government or audited market records to deterministic calculations. Macro municipal counts are distinguished from property-level micro evidence.
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-semibold text-slate-100">
              Auditable Evidence Record & Provenance Ledger
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {items.length} Material Metrics Verified
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px] tracking-wider bg-slate-950/40">
                <th className="py-3 px-3">Class</th>
                <th className="py-3 px-3">Material Claim</th>
                <th className="py-3 px-3">Observed Fact & Provenance</th>
                <th className="py-3 px-3">Interpretation / Math</th>
                <th className="py-3 px-3">Uncertainty & Decision Implication</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {items.map((item, idx) => {
                const prov = item.provenance;
                const isExpanded = expandedProvenanceIdx === idx;

                return (
                  <React.Fragment key={idx}>
                    <tr className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 px-3 align-top whitespace-nowrap">
                        {getClassificationBadge(item.classification)}
                      </td>
                      <td className="py-3 px-3 align-top font-medium text-slate-200 max-w-[220px]">
                        {item.claim}
                      </td>
                      <td className="py-3 px-3 align-top max-w-[280px]">
                        <div className="text-slate-300 mb-1">{item.evidenceObserved}</div>
                        <div className="text-[10px] text-slate-500 font-mono mb-1.5">{item.verificationSource}</div>
                        {prov && (
                          <button
                            onClick={() => setExpandedProvenanceIdx(isExpanded ? null : idx)}
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                          >
                            <span>Inspect Provenance ({prov.datasetId})</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-3 align-top max-w-[240px] text-slate-400">
                        {item.calculationMethod}
                      </td>
                      <td className="py-3 px-3 align-top max-w-[280px]">
                        <div className="text-amber-300/90 mb-1 text-[11px] leading-tight">
                          {item.uncertaintyEstimate}
                        </div>
                        <div className="text-indigo-300 font-medium text-[11px] flex items-center gap-1 mt-1">
                          <ArrowRight className="w-3 h-3 text-indigo-400 shrink-0" />
                          <span>{item.decisionImplication}</span>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Provenance Detail Drawer */}
                    {isExpanded && prov && (
                      <tr className="bg-slate-950/60 border-b border-slate-800">
                        <td colSpan={5} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono">
                            <div>
                              <span className="text-slate-500 block text-[10px] uppercase">Source Provider & Citation</span>
                              {prov.sourceUrl && prov.sourceUrl.startsWith('http') ? (
                                <a
                                  href={prov.sourceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-indigo-400 hover:underline flex items-center gap-1 mt-0.5 truncate"
                                >
                                  <span>{prov.sourceName}</span>
                                  <ExternalLink className="w-3 h-3 shrink-0" />
                                </a>
                              ) : (
                                <div className="text-slate-300 mt-0.5 truncate font-medium">
                                  <span>{prov.sourceName}</span>
                                </div>
                              )}
                              <span className="text-slate-400 text-[10px] block mt-1">Dataset: {prov.datasetId}</span>
                            </div>

                            <div>
                              <span className="text-slate-500 block text-[10px] uppercase">Geography & Resolution</span>
                              <div className="text-slate-200 mt-0.5 font-sans">
                                {prov.geographyName} ({prov.geographyResolution})
                              </div>
                              <div className="flex items-center gap-1 mt-1 text-[10px]">
                                {prov.geographicFitValid ? (
                                  <span className="text-emerald-400 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Geographic fit valid
                                  </span>
                                ) : (
                                  <span className="text-amber-400 flex items-center gap-1">
                                    <AlertOctagon className="w-3 h-3" /> Macro data invalid for micro claim
                                  </span>
                                )}
                              </div>
                            </div>

                            <div>
                              <span className="text-slate-500 block text-[10px] uppercase">Observation Period & Units</span>
                              <div className="text-slate-200 mt-0.5">
                                {prov.observationPeriod} • {prov.units}
                              </div>
                              <span className="text-slate-500 text-[10px] block mt-1">
                                Value: {String(prov.originalValue)}
                              </span>
                            </div>

                            <div className="col-span-1 md:col-span-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-sans">
                              <span className="font-semibold text-slate-300">Methodology & Transformation:</span> {prov.transformation}.
                              <span className="block text-slate-500 text-[10px] mt-0.5 font-mono">Limitations: {prov.limitations}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
