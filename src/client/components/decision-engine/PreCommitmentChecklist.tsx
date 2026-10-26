import React from 'react';
import { AlertCircle, CheckSquare, Search, FileText, Wrench } from 'lucide-react';
import type { MaterialUnknown } from '../../types/decision-engine.js';

interface PreCommitmentChecklistProps {
  unknowns: MaterialUnknown[];
}

export const PreCommitmentChecklist: React.FC<PreCommitmentChecklistProps> = ({ unknowns }) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ONLINE_VERIFIED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ONLINE VERIFIED</span>;
      case 'FIELD_INSPECTION_REQUIRED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">FIELD CHECK REQUIRED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">MUNICIPAL ARCHIVE</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-semibold text-slate-100">
              Prioritized Material Unknowns & Pre-Lease Verification
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Ranked by potential capital blast radius
          </span>
        </div>

        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          A zoning uncertainty, inadequate rooftop grease chase, or excessive CAM escalation must receive research priority before minor scoring adjustments.
        </p>

        <div className="space-y-4">
          {unknowns.map((u) => (
            <div
              key={u.rank}
              className="p-5 rounded-xl border border-slate-800/80 bg-slate-950/40 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-xs font-bold flex items-center justify-center">
                    {u.rank}
                  </span>
                  <span className="text-sm font-semibold text-slate-200">{u.title}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    {u.category}
                  </span>
                </div>
                {getStatusBadge(u.retrievalStatus)}
              </div>

              {/* Potential Impact */}
              <div className="p-3 bg-rose-950/20 border border-rose-500/20 rounded-lg text-xs text-rose-300 leading-relaxed">
                <strong className="text-rose-200">Potential Decision Impact: </strong>
                {u.potentialImpact}
              </div>

              {/* Authoritative Source */}
              <div className="text-xs text-slate-400 flex items-center gap-2 font-mono">
                <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>Verification Source: {u.authoritativeSource}</span>
              </div>

              {/* Practical Field Check Protocol */}
              <div className="p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-lg text-xs text-indigo-200">
                <strong className="text-indigo-300 flex items-center gap-1.5 mb-1">
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Practical Field Protocol Before Lease Commitment</span>
                </strong>
                <p className="text-slate-300 leading-relaxed">{u.fieldCheckProtocol}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
