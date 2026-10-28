import React, { useState } from 'react';
import { CheckCircle2, XCircle, HelpCircle, ChevronDown, ChevronUp, AlertCircle, Sparkles } from 'lucide-react';
import type { BusinessHypothesis } from '../../types/decision-engine.js';

interface HypothesesMatrixCardProps {
  hypotheses: BusinessHypothesis[];
}

export const HypothesesMatrixCard: React.FC<HypothesesMatrixCardProps> = ({ hypotheses }) => {
  const [expandedId, setExpandedId] = useState<string | null>(hypotheses[0]?.id || null);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUPPORTED':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Supported</span>
          </span>
        );
      case 'CONTRADICTED':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-full text-xs font-semibold">
            <XCircle className="w-3.5 h-3.5" />
            <span>Contradicted</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full text-xs font-semibold">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Inconclusive</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-semibold text-slate-100">
              Testable Business Hypotheses & Counter-Arguments
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Evaluating evidence for & against assumptions
          </span>
        </div>

        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Assumptions must be treated as hypotheses, not facts. We actively seek contradictory evidence and evaluate alternate explanations (such as low competition signaling low consumer demand).
        </p>

        <div className="space-y-3">
          {hypotheses.map((h) => {
            const isExpanded = expandedId === h.id;
            return (
              <div
                key={h.id}
                className="rounded-xl border border-slate-800/80 bg-slate-950/40 overflow-hidden transition-all"
              >
                {/* Header Row */}
                <div
                  onClick={() => toggleExpand(h.id)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-slate-400">{h.id.split('_')[0]}</span>
                    <div>
                      <div className="text-sm font-semibold text-slate-200">{h.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{h.statement}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusBadge(h.status)}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-4 border-t border-slate-800/80 bg-slate-900/40 space-y-4">
                    {/* For and Against Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Evidence For */}
                      <div className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mb-2">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Supporting Evidence</span>
                        </div>
                        <ul className="space-y-2 text-xs text-slate-300">
                          {h.evidenceFor.map((ev, idx) => (
                            <li key={idx} className="flex flex-col gap-0.5">
                              <span>{ev.fact}</span>
                              <span className="text-[10px] text-emerald-300/60 font-mono">
                                [{ev.classification}] {ev.sourceId}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Evidence Against */}
                      <div className="p-3.5 rounded-lg bg-rose-950/20 border border-rose-500/20">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 mb-2">
                          <XCircle className="w-4 h-4" />
                          <span>Contradictory Evidence & Headwinds</span>
                        </div>
                        <ul className="space-y-2 text-xs text-slate-300">
                          {h.evidenceAgainst.map((ev, idx) => (
                            <li key={idx} className="flex flex-col gap-0.5">
                              <span>{ev.fact}</span>
                              <span className="text-[10px] text-rose-300/60 font-mono">
                                [{ev.classification}] {ev.sourceId}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Counter-Hypothesis / Alternative Explanation */}
                    <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/20 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs font-semibold text-amber-300">Alternative Explanation Considered</div>
                        <div className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                          {h.alternativeExplanation}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
