import React from 'react';
import { Activity, ShieldCheck, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import type { SensitivityShock, SwitchingCondition } from '../../types/decision-engine.js';

interface SensitivityStressTesterProps {
  shocks: SensitivityShock[];
  switchingConditions: SwitchingCondition[];
}

export const SensitivityStressTester: React.FC<SensitivityStressTesterProps> = ({
  shocks,
  switchingConditions
}) => {
  const getRatingBadge = (rating: 'ROBUST' | 'SENSITIVE' | 'VULNERABLE') => {
    switch (rating) {
      case 'ROBUST':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            Robust
          </span>
        );
      case 'SENSITIVE':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400">
            Sensitive
          </span>
        );
      case 'VULNERABLE':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 border border-rose-500/30 text-rose-400">
            Vulnerable
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Sensitivity Shock Tests */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-semibold text-slate-100">
              Macro & Operational Assumption Stress Tests (Requirement 7)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Deterministic Parameter Shocks
          </span>
        </div>

        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          We test whether the preferred recommendation survives when rent escalates, initial sales ramp slowly, ingredient inflation compresses margin, or delivery platform dependence increases.
        </p>

        <div className="space-y-3">
          {shocks.map((s, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/40 hover:bg-slate-900/40 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono text-indigo-400">[{idx + 1}]</span>
                  <span className="text-sm font-semibold text-slate-200">{s.parameter}</span>
                  <span className="text-xs text-slate-500">({s.shockApplied})</span>
                </div>
                {getRatingBadge(s.resilienceRating)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300 mb-2">
                <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/50">
                  <span className="text-slate-500 font-mono text-[10px] block">Baseline Metric</span>
                  <span className="font-mono text-slate-200">{s.baseMetric}</span>
                </div>
                <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/50">
                  <span className="text-slate-500 font-mono text-[10px] block">Shocked Metric</span>
                  <span className="font-mono text-amber-300">{s.shockedMetric}</span>
                </div>
              </div>

              <div className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-300 font-medium">Impact Assessment: </strong>
                {s.impactOnViability}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Switching Conditions */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <RefreshCw className="w-5 h-5 text-purple-400" />
          <h3 className="text-base font-semibold text-slate-100">
            Deterministic Switching Conditions (Requirement 7)
          </h3>
        </div>

        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Explicit criteria and mathematical thresholds that overturn the #1 recommendation in favor of an alternative candidate.
        </p>

        <div className="space-y-3">
          {switchingConditions.map((cond, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-purple-500/20 bg-purple-950/10 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-purple-300 font-mono">Trigger Formula</span>
                </div>
                <div className="text-xs text-slate-400 font-mono">{cond.formulaTrigger}</div>
                <div className="text-sm font-medium text-slate-100 mt-1">{cond.conditionStatement}</div>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-[10px] text-slate-400 font-mono uppercase">Calculated Threshold</div>
                <div className="text-sm font-bold font-mono text-purple-300">{cond.switchingThresholdValue}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Switch to: {cond.alternativeTarget}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
