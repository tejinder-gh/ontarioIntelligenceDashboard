import React from 'react';
import { Filter, ArrowRight, MapPin, Building, Store, ShieldAlert } from 'lucide-react';
import type { GeographicFunnelResult } from '../../types/decision-engine.js';

interface StagedFunnelProgressProps {
  funnel: GeographicFunnelResult;
}

export const StagedFunnelProgress: React.FC<StagedFunnelProgressProps> = ({ funnel }) => {
  return (
    <div className="space-y-6">
      {/* Top Funnel Bar */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-semibold text-slate-100">
              Staged Geographic Investigation Funnel
            </h3>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-full">
            {funnel.totalMarketsScreened} Municipalities Screened
          </span>
        </div>

        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          {funnel.scopeSummary}
        </p>

        {/* 4-Step Funnel Flow */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
          {/* Stage 1 */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 relative">
            <div className="text-[10px] font-mono uppercase text-slate-500 tracking-wider mb-1">Stage 1: Province</div>
            <div className="text-sm font-bold text-slate-200">Ontario Macro Pool</div>
            <div className="text-xs text-slate-400 mt-1">444 Census Subdivisions</div>
            <div className="mt-2 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded w-fit">
              100% CSD Scope
            </div>
          </div>

          {/* Stage 2 */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 relative">
            <div className="text-[10px] font-mono uppercase text-slate-500 tracking-wider mb-1">Stage 2: Cities</div>
            <div className="text-sm font-bold text-indigo-300">Growth Municipalities</div>
            <div className="text-xs text-slate-400 mt-1">Pop &gt; 45k, Income &gt; $70k</div>
            <div className="mt-2 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded w-fit">
              {funnel.screenedExclusionsCount} Excluded
            </div>
          </div>

          {/* Stage 3 */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 relative">
            <div className="text-[10px] font-mono uppercase text-slate-500 tracking-wider mb-1">Stage 3: Corridors</div>
            <div className="text-sm font-bold text-purple-300">Commercial Nodes</div>
            <div className="text-xs text-slate-400 mt-1">Catchment Radius 3.5 km</div>
            <div className="mt-2 text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded w-fit">
              {funnel.stages.neighbourhoodNodes.length} Nodes Isolated
            </div>
          </div>

          {/* Stage 4 */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-indigo-500/30 relative">
            <div className="text-[10px] font-mono uppercase text-indigo-400 tracking-wider mb-1">Stage 4: Properties</div>
            <div className="text-sm font-bold text-slate-100">Specific Listings</div>
            <div className="text-xs text-slate-400 mt-1">Audited Commercial Units</div>
            <div className="mt-2 text-[10px] text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded w-fit">
              {funnel.shortlistedCandidates.length} Properties
            </div>
          </div>
        </div>
      </div>

      {/* Stopping Criteria & Exclusions Card */}
      <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-300">
            Search Exclusions & Stopping Rules
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {funnel.stoppingCriteria.map((rule, idx) => (
            <div key={idx} className="flex items-start gap-2.5 p-3 bg-slate-950/40 rounded-xl border border-slate-800/40 text-xs text-slate-400">
              <span className="text-amber-400 font-mono font-bold">[{idx + 1}]</span>
              <span>{rule}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
