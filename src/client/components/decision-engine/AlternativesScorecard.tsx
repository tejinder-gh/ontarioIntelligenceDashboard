import React from 'react';
import { Trophy, CheckCircle2, AlertTriangle, ArrowRight, Ban, MapPin, DollarSign } from 'lucide-react';
import type { CandidateComparison } from '../../types/decision-engine.js';

interface AlternativesScorecardProps {
  alternatives: CandidateComparison[];
}

export const AlternativesScorecard: React.FC<AlternativesScorecardProps> = ({ alternatives }) => {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-semibold text-slate-100">
              Ranked Alternatives Comparison
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Attractiveness & evidence confidence strictly separated
          </span>
        </div>

        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Alternatives are evaluated side-by-side with trade-offs, contradictory evidence, and explicit break-even economics. We also maintain an explicit &quot;Do Not Proceed&quot; threshold.
        </p>

        {/* Candidate Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {alternatives.map((alt) => {
            const isRank1 = alt.rank === 1;
            return (
              <div
                key={alt.candidate.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${
                  isRank1
                    ? 'bg-gradient-to-b from-indigo-950/30 to-slate-950/60 border-indigo-500/50 shadow-xl shadow-indigo-500/10'
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Rank Header */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                      isRank1 ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-300'
                    }`}>
                      RANK #{alt.rank}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/60 text-slate-400 border border-slate-750">
                      {alt.candidate.resolutionTier}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-100 mb-1 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>{alt.candidate.name}</span>
                  </h4>
                  <div className="text-xs text-slate-400 mb-4">{alt.candidate.city}, Ontario</div>

                  {/* Why It Fits */}
                  <p className="text-xs text-slate-300 leading-relaxed mb-4 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/60">
                    {alt.whyItFits}
                  </p>

                  {/* Economic Snapshot */}
                  <div className="grid grid-cols-2 gap-2 mb-4 p-2.5 bg-slate-900/60 rounded-xl border border-slate-800/40 text-xs font-mono">
                    <div>
                      <div className="text-[10px] text-slate-400">Break-Even</div>
                      <div className="text-slate-200 font-bold">{alt.scenarioEconomics.breakEvenDailyOrders} orders/day</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Base Net/Yr</div>
                      <div className="text-emerald-400 font-bold">${alt.scenarioEconomics.baseAnnualNetIncome.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Pros & Cons */}
                  <div className="space-y-2 mb-4 text-xs">
                    <div className="text-[10px] uppercase font-semibold text-emerald-400 tracking-wider">Strongest Evidence</div>
                    <ul className="space-y-1 text-slate-300">
                      {alt.strongestSupportingEvidence.map((ev, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{ev}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="text-[10px] uppercase font-semibold text-rose-400 tracking-wider pt-2">Disadvantages & Risks</div>
                    <ul className="space-y-1 text-slate-400">
                      {alt.mainDisadvantages.map((dis, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                          <span>{dis}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Footer Rationale & Next Step */}
                <div className="pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="text-[11px] text-slate-300 leading-tight">
                    <span className="font-semibold text-indigo-300">Ranking Tradeoff: </span>
                    {alt.rankingRationale}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Next step: {alt.nextVerificationStep}
                  </div>
                </div>
              </div>
            );
          })}

          {/* DO NOT PROCEED Benchmark Outcome Card */}
          <div className="rounded-2xl border border-rose-500/20 bg-rose-950/10 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  BENCHMARK
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/40 text-rose-400">
                  STOP CONDITION
                </span>
              </div>

              <h4 className="text-sm font-bold text-rose-200 mb-1 flex items-center gap-1.5">
                <Ban className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Do Not Proceed (Capital / Density Deficit)</span>
              </h4>
              <div className="text-xs text-rose-400/80 mb-4">Baseline Failure Guardrail</div>

              <p className="text-xs text-slate-300 leading-relaxed mb-4 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/60">
                Triggered if commercial leasehold improvement estimates exceed $110,000, or if break-even orders exceed 60/day for a single-operator store format.
              </p>

              <div className="space-y-2 text-xs text-slate-400">
                <div className="text-[10px] uppercase font-semibold text-rose-300 tracking-wider">Trigger Conditions</div>
                <div className="flex items-start gap-1.5">
                  <span className="text-rose-400 font-bold">•</span>
                  <span>Unamortized working capital shortfall below 3 months</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-rose-400 font-bold">•</span>
                  <span>Absence of permitted Type 1 commercial hood chase</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-rose-500/20 text-[10px] text-rose-400 font-mono mt-4">
              Preserves investor capital when unit economics fail viability criteria.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
