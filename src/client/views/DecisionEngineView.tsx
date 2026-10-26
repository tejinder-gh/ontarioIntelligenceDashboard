import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  FileText,
  Target,
  Layers,
  Database,
  Trophy,
  Activity,
  CheckSquare,
  AlertCircle,
  RefreshCw,
  Compass
} from 'lucide-react';
import type { DecisionEngineResult, OperatingScenario } from '../types/decision-engine.js';
import { DecisionModelPanel } from '../components/decision-engine/DecisionModelPanel.js';
import { StagedFunnelProgress } from '../components/decision-engine/StagedFunnelProgress.js';
import { HypothesesMatrixCard } from '../components/decision-engine/HypothesesMatrixCard.js';
import { EvidenceLedgerTable } from '../components/decision-engine/EvidenceLedgerTable.js';
import { AlternativesScorecard } from '../components/decision-engine/AlternativesScorecard.js';
import { SensitivityStressTester } from '../components/decision-engine/SensitivityStressTester.js';
import { PreCommitmentChecklist } from '../components/decision-engine/PreCommitmentChecklist.js';
import { DecisionBriefView } from '../components/decision-engine/DecisionBriefView.js';

type EngineTab = 'brief' | 'funnel' | 'hypotheses' | 'alternatives' | 'sensitivity';

export const DecisionEngineView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<EngineTab>('brief');
  const [inquiryText, setInquiryText] = useState('I want to open a pizza store. I am flexible about location.');
  const [selectedScenarioKey, setSelectedScenarioKey] = useState('lean_takeout_delivery');
  const [scenarios, setScenarios] = useState<OperatingScenario[]>([]);
  const [engineResult, setEngineResult] = useState<DecisionEngineResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch scenarios on mount
  useEffect(() => {
    fetch('/api/engine/scenarios')
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          setScenarios(json.data);
        }
      })
      .catch(err => console.error('Failed to load engine scenarios:', err));

    // Auto-run default inquiry
    executeAnalysis('lean_takeout_delivery');
  }, []);

  const executeAnalysis = async (scenarioKey?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/engine/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiry: inquiryText,
          selectedScenarioKey: scenarioKey || selectedScenarioKey
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to execute decision engine');
      }

      setEngineResult(json.data);
    } catch (err: unknown) {
      console.error('Decision engine execution error:', err);
      setError(err instanceof Error ? err.message : 'Unknown execution error');
    } finally {
      setLoading(false);
    }
  };

  const handleScenarioChange = (key: string) => {
    setSelectedScenarioKey(key);
    executeAnalysis(key);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 text-xs font-mono font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Staff Engineer Grade • Deterministic Engine v2.0
              </span>
              <span className="px-2.5 py-1 text-[10px] font-mono rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Auditable Calculations
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              Intelligent Research & Decision Engine
            </h1>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
              Actively investigates commercial opportunities, screens staged geographic funnels, tests counter-hypotheses against empirical sources, and produces auditable recommendations.
            </p>
          </div>

          {engineResult && (
            <div className="shrink-0 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl font-mono text-xs">
                <div className="text-slate-500">Run ID: {engineResult.runId}</div>
                <div className="text-emerald-400 font-bold mt-0.5">
                  {engineResult.decisionBrief.recommendation.outcome}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-900/80 border border-slate-800 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('brief')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'brief'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Executive Brief</span>
        </button>

        <button
          onClick={() => setActiveTab('funnel')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'funnel'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Model & Staged Funnel</span>
        </button>

        <button
          onClick={() => setActiveTab('hypotheses')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'hypotheses'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Hypotheses & Evidence</span>
        </button>

        <button
          onClick={() => setActiveTab('alternatives')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'alternatives'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Alternatives & Economics</span>
        </button>

        <button
          onClick={() => setActiveTab('sensitivity')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'sensitivity'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Sensitivity & Unknowns</span>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-950/30 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-300 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Tab Contents */}
      {engineResult && (
        <div className="space-y-6">
          {activeTab === 'brief' && (
            <DecisionBriefView
              brief={engineResult.decisionBrief}
              runId={engineResult.runId}
              version={engineResult.version}
              timestamp={engineResult.timestamp}
            />
          )}

          {activeTab === 'funnel' && (
            <div className="space-y-6">
              <DecisionModelPanel
                inquiryText={inquiryText}
                setInquiryText={setInquiryText}
                scenarios={scenarios}
                selectedScenarioKey={selectedScenarioKey}
                onSelectScenario={handleScenarioChange}
                decisionModel={engineResult.decisionModel}
                onRunAnalysis={() => executeAnalysis()}
                isLoading={loading}
              />
              <StagedFunnelProgress funnel={engineResult.geographicFunnel} />
            </div>
          )}

          {activeTab === 'hypotheses' && (
            <div className="space-y-6">
              <HypothesesMatrixCard hypotheses={engineResult.hypotheses} />
              <EvidenceLedgerTable items={engineResult.evidenceLedger} />
            </div>
          )}

          {activeTab === 'alternatives' && (
            <div className="space-y-6">
              <AlternativesScorecard alternatives={engineResult.rankedAlternatives} />
            </div>
          )}

          {activeTab === 'sensitivity' && (
            <div className="space-y-6">
              <SensitivityStressTester
                shocks={engineResult.sensitivityShocks}
                switchingConditions={engineResult.switchingConditions}
              />
              <PreCommitmentChecklist unknowns={engineResult.materialUnknowns} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
