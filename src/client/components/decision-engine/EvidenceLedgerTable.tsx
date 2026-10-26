import React from 'react';
import { Database, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import type { EvidenceClassification, EvidenceRecordItem } from '../../types/decision-engine.js';

interface EvidenceLedgerTableProps {
  items: EvidenceRecordItem[];
}

export const EvidenceLedgerTable: React.FC<EvidenceLedgerTableProps> = ({ items }) => {
  const getClassificationBadge = (cls: EvidenceClassification) => {
    switch (cls) {
      case 'OBSERVED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">OBSERVED</span>;
      case 'AUDITED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">AUDITED</span>;
      case 'BENCHMARK':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">BENCHMARK</span>;
      case 'DERIVED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">DERIVED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400">UNAVAILABLE</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Cautionary Banner (Requirement 5) */}
      <div className="p-4 bg-amber-950/20 border border-amber-500/20 rounded-2xl flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-300 leading-relaxed">
          <strong className="font-semibold text-amber-200">Staff Engineer Evidence Standard:</strong> Every claim must connect observed data to deterministic calculation and state its uncertainty envelope. Demographic correlation does not prove customer purchasing behaviour or commercial success.
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-semibold text-slate-100">
            Auditable Evidence Record (Requirement 5)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px] tracking-wider bg-slate-950/40">
                <th className="py-3 px-3">Class</th>
                <th className="py-3 px-3">Material Claim</th>
                <th className="py-3 px-3">Observed Fact & Source</th>
                <th className="py-3 px-3">Interpretation / Math</th>
                <th className="py-3 px-3">Uncertainty & Decision Implication</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                  <td className="py-3 px-3 align-top whitespace-nowrap">
                    {getClassificationBadge(item.classification)}
                  </td>
                  <td className="py-3 px-3 align-top font-medium text-slate-200 max-w-[220px]">
                    {item.claim}
                  </td>
                  <td className="py-3 px-3 align-top max-w-[260px]">
                    <div className="text-slate-300 mb-1">{item.evidenceObserved}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{item.verificationSource}</div>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
