import React from 'react';
import { Target, Layers, Play, DollarSign, Clock, HelpCircle, CheckCircle2 } from 'lucide-react';
import type { DecisionModel, OperatingScenario } from '../../types/decision-engine.js';

interface DecisionModelPanelProps {
  inquiryText: string;
  setInquiryText: (v: string) => void;
  scenarios: OperatingScenario[];
  selectedScenarioKey: string;
  onSelectScenario: (key: string) => void;
  decisionModel: DecisionModel | null;
  onRunAnalysis: () => void;
  isLoading: boolean;
}

export const DecisionModelPanel: React.FC<DecisionModelPanelProps> = ({
  inquiryText,
  setInquiryText,
  scenarios,
  selectedScenarioKey,
  onSelectScenario,
  decisionModel,
  onRunAnalysis,
  isLoading
}) => {
  return (
    <div className="space-y-6">
      {/* Inquiry Input Bar */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">Decision Inquiry & Business Objective</h3>
            <p className="text-xs text-slate-400">Formulates a multi-factor operational model rather than generic chatbot advice.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <input
            type="text"
            value={inquiryText}
            onChange={(e) => setInquiryText(e.target.value)}
            placeholder="e.g. I want to open a pizza store. I am flexible about location."
            className="flex-1 bg-slate-950/80 border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
          <button
            onClick={onRunAnalysis}
            disabled={isLoading || !inquiryText.trim()}
            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium text-sm rounded-xl shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Evaluating Evidence...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Execute Decision Pipeline</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Explicitly Labelled Scenarios */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <h4 className="text-sm font-semibold text-slate-200">Operating Scenarios</h4>
          </div>
          <span className="text-xs text-slate-400 font-mono">Explicitly Labelled Parameter Sets</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {scenarios.map((sc) => {
            const isSelected = sc.key === selectedScenarioKey;
            return (
              <div
                key={sc.key}
                onClick={() => onSelectScenario(sc.key)}
                className={`p-4 rounded-xl border transition-all cursor-pointer text-left ${
                  isSelected
                    ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-500/10'
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/20'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    isSelected ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {sc.format}
                  </span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                </div>

                <div className="text-sm font-medium text-slate-100 mb-1">{sc.label}</div>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">{sc.rationale}</p>

                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs font-mono text-slate-300">
                  <span>CapEx: ${sc.investmentCapital.toLocaleString()}</span>
                  <span>AOV: ${sc.targetAov.toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Model Snapshot & Unspecified Explored Preferences */}
      {decisionModel && (
        <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-6">
          <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-4">
            Active Decision Model Dimensions
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/50">
              <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>Total Capital Pool</span>
              </div>
              <div className="text-base font-bold text-slate-100 font-mono">
                ${decisionModel.totalRequiredCapital.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">CapEx + 3mo reserve</div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/50">
              <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-1">
                <Target className="w-3.5 h-3.5 text-indigo-400" />
                <span>Required Daily Orders</span>
              </div>
              <div className="text-base font-bold text-indigo-300 font-mono">
                {decisionModel.minDailyOrdersNeeded} / day
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">At ${decisionModel.targetPricePointAov.toFixed(2)} AOV</div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/50">
              <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>Min Catchment Scale</span>
              </div>
              <div className="text-base font-bold text-slate-100 font-mono">
                {decisionModel.minCatchmentHouseholds.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">15-min delivery radius</div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/50">
              <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                <span>Max Rent Ceiling</span>
              </div>
              <div className="text-base font-bold text-amber-300 font-mono">
                {(decisionModel.maxGrossRentPctRevenue * 100).toFixed(0)}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Of gross monthly turnover</div>
            </div>
          </div>

          {/* Unspecified preferences callout */}
          {decisionModel.unspecifiedPreferencesExplored.length > 0 && (
            <div className="p-4 bg-indigo-950/20 border border-indigo-500/20 rounded-xl">
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold mb-2">
                <HelpCircle className="w-4 h-4" />
                <span>Explored Assumptions (Instead of inventing user preferences)</span>
              </div>
              <ul className="space-y-1 text-xs text-slate-400">
                {decisionModel.unspecifiedPreferencesExplored.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-indigo-400">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
