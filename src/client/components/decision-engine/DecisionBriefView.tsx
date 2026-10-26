import React, { useState } from 'react';
import { FileText, Copy, Check, Printer, ShieldCheck, MapPin, DollarSign, AlertTriangle, BookOpen, ExternalLink, ClipboardCheck, Edit3 } from 'lucide-react';
import type { DecisionBrief } from '../../types/decision-engine.js';
import { createLaunchWorkspace } from '../../utils/launch-api.js';

interface DecisionBriefViewProps {
  brief: DecisionBrief;
  runId: string;
  version: string;
  timestamp: string;
  onEditInquiry?: () => void;
}

export const DecisionBriefView: React.FC<DecisionBriefViewProps> = ({
  brief,
  runId,
  version,
  timestamp,
  onEditInquiry
}) => {
  const [copied, setCopied] = useState(false);
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);

  const handleInitiateDueDiligence = async () => {
    setCreatingWorkspace(true);
    try {
      const ws = await createLaunchWorkspace({
        name: `${brief.recommendation.operatingFormat} - ${brief.recommendation.marketOrLocation}`,
        municipality: brief.recommendation.marketOrLocation,
        industry: brief.recommendation.operatingFormat,
      });
      if (ws?.id) {
        window.dispatchEvent(new CustomEvent('open-launch-workspace', { detail: { workspaceId: ws.id } }));
      }
    } catch (err) {
      console.error('Failed to create due diligence workspace:', err);
      alert('Could not initiate launch workspace. Please check your connection.');
    } finally {
      setCreatingWorkspace(false);
    }
  };

  const handleCopyText = () => {
    const text = `
DECISION BRIEF (Run: ${runId} | v${version})
Generated: ${new Date(timestamp).toLocaleString()}

1. RECOMMENDATION
${brief.recommendation.summaryHeadline}
Location: ${brief.recommendation.marketOrLocation} [${brief.recommendation.resolutionTier}]
Format: ${brief.recommendation.operatingFormat} | Ownership: ${brief.recommendation.ownershipModel}
Status: ${brief.recommendation.outcome}

2. WHY THIS LOCATION
${brief.whyThisLocation.map(r => `• ${r}`).join('\n')}

3. WHY NOT THE ALTERNATIVES
${brief.whyNotAlternatives.map(a => `• ${a.candidateName}: ${a.tradeOffReason}`).join('\n')}

4. ECONOMICS
• Required Initial Capital: $${brief.economics.requiredCapital.toLocaleString()}
• Break-Even Daily Orders: ${brief.economics.breakEvenDailyOrders} orders/day
• Base Net Operating Income: $${brief.economics.baseNetIncome.toLocaleString()}/yr
• Scenarios: ${brief.economics.scenarioRanges}

5. WHAT COULD MAKE THIS WRONG
${brief.whatCouldMakeThisWrong.map(w => `• ${w}`).join('\n')}

6. BEFORE COMMITTING
${brief.beforeCommitting.map(c => `• ${c}`).join('\n')}

7. SOURCES
${brief.sources.map(s => `• ${s.name} (${s.friendlyCode}): ${s.coverage} [Limitations: ${s.limitations}]`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/60 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-100">Executive Decision Brief</div>
            <div className="text-xs text-slate-400 font-mono">
              Run: {runId} • Engine v{version} • {new Date(timestamp).toLocaleDateString()}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onEditInquiry && (
            <button
              onClick={onEditInquiry}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
            >
              <Edit3 className="w-4 h-4 text-indigo-400" />
              <span>Adjust Parameters</span>
            </button>
          )}
          {brief.recommendation.outcome !== 'DO_NOT_PROCEED' && (
            <button
              onClick={handleInitiateDueDiligence}
              disabled={creatingWorkspace}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>{creatingWorkspace ? 'Creating...' : 'Initiate Due Diligence'}</span>
            </button>
          )}
          <button
            onClick={handleCopyText}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied Brief' : 'Copy Text'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-indigo-500/20"
          >
            <Printer className="w-4 h-4" />
            <span>Print Document</span>
          </button>
        </div>
      </div>

      {/* Structured Brief Document */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-8 text-slate-200">
        {/* 1. RECOMMENDATION */}
        <section className="space-y-3 pb-6 border-b border-slate-800">
          <div className="text-xs font-bold font-mono tracking-wider text-indigo-400 uppercase">
            1. Recommendation
          </div>
          <h2 className="text-xl font-bold text-slate-50 tracking-tight leading-snug">
            {brief.recommendation.summaryHeadline}
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-3 py-1 rounded-full font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {brief.recommendation.marketOrLocation}
            </span>
            <span className="px-2.5 py-1 rounded-full font-mono bg-slate-800 text-slate-400">
              Resolution: {brief.recommendation.resolutionTier}
            </span>
            <span className="px-2.5 py-1 rounded-full font-mono bg-slate-800 text-slate-400">
              Format: {brief.recommendation.operatingFormat}
            </span>
            <span className={`px-2.5 py-1 rounded-full font-mono border ${
              brief.recommendation.outcome === 'PROCEED_WITH_VERIFICATION'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                : brief.recommendation.outcome === 'INVESTIGATE_ALTERNATIVE' || brief.recommendation.outcome === 'INSUFFICIENT_EVIDENCE'
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
            }`}>
              Status: {brief.recommendation.outcome}
            </span>
          </div>
        </section>

        {/* 2. WHY THIS LOCATION */}
        <section className="space-y-3 pb-6 border-b border-slate-800">
          <div className="text-xs font-bold font-mono tracking-wider text-purple-400 uppercase">
            2. Why This Location
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {brief.whyThisLocation.map((reason, idx) => (
              <div key={idx} className="p-3.5 bg-slate-950/40 rounded-xl border border-slate-800/80 leading-relaxed text-slate-300 flex items-start gap-2.5">
                <span className="text-purple-400 font-bold shrink-0">•</span>
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 3. WHY NOT THE ALTERNATIVES */}
        <section className="space-y-3 pb-6 border-b border-slate-800">
          <div className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase">
            3. Why Not The Alternatives
          </div>
          <div className="space-y-2 text-xs">
            {brief.whyNotAlternatives.map((alt, idx) => (
              <div key={idx} className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/60 flex items-start justify-between gap-4">
                <span className="font-semibold text-slate-200 shrink-0">{alt.candidateName}</span>
                <span className="text-slate-400 text-right">{alt.tradeOffReason}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 4. ECONOMICS */}
        <section className="space-y-4 pb-6 border-b border-slate-800">
          <div className="text-xs font-bold font-mono tracking-wider text-emerald-400 uppercase">
            4. Economics & Capital Viability
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400">Total Capital Required</div>
              <div className="text-xl font-bold text-slate-100 mt-1">
                ${brief.economics.requiredCapital.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Fit-out + initial buffer</div>
            </div>

            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400">Break-Even Order Volume</div>
              <div className="text-xl font-bold text-indigo-300 mt-1">
                {brief.economics.breakEvenDailyOrders} orders/day
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Under base cost structure</div>
            </div>

            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400">Base Net Cashflow</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">
                ${brief.economics.baseNetIncome.toLocaleString()}/yr
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Owner operator basis</div>
            </div>
          </div>
          <div className="text-xs text-slate-400 font-mono bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
            {brief.economics.scenarioRanges}
          </div>
        </section>

        {/* 5. WHAT COULD MAKE THIS WRONG */}
        <section className="space-y-3 pb-6 border-b border-slate-800">
          <div className="text-xs font-bold font-mono tracking-wider text-rose-400 uppercase">
            5. What Could Make This Wrong (Failure Modes & Headwinds)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {brief.whatCouldMakeThisWrong.map((risk, idx) => (
              <div key={idx} className="p-3.5 bg-rose-950/10 border border-rose-500/20 rounded-xl text-rose-200/90 leading-relaxed flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{risk}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 6. BEFORE COMMITTING */}
        <section className="space-y-3 pb-6 border-b border-slate-800">
          <div className="text-xs font-bold font-mono tracking-wider text-amber-400 uppercase">
            6. Before Committing (Pre-Lease Action Checklist)
          </div>
          <div className="space-y-2 text-xs">
            {brief.beforeCommitting.map((item, idx) => (
              <div key={idx} className="p-3 bg-amber-950/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-amber-200/90">
                <span className="font-mono text-amber-400 font-bold">[{idx + 1}]</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
          {brief.recommendation.outcome !== 'DO_NOT_PROCEED' && (
            <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                Ready to verify on the ground? Transfer these pre-lease checklist items directly into a Launch Due Diligence workspace.
              </div>
              <button
                type="button"
                onClick={handleInitiateDueDiligence}
                disabled={creatingWorkspace}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 shrink-0"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>{creatingWorkspace ? 'Initiating Due Diligence...' : 'Initiate Launch Workspace'}</span>
              </button>
            </div>
          )}
        </section>

        {/* 7. SOURCES */}
        <section className="space-y-3">
          <div className="text-xs font-bold font-mono tracking-wider text-blue-400 uppercase">
            7. Authoritative Sources & Limitations
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {brief.sources.map((s, idx) => (
              <div key={idx} className="p-3.5 bg-slate-950/40 rounded-xl border border-slate-800 text-slate-300">
                <div className="font-semibold text-slate-200 flex items-center justify-between mb-1">
                  <span>{s.name}</span>
                  <span className="text-[10px] font-mono text-blue-400">{s.friendlyCode}</span>
                </div>
                <div className="text-[11px] text-slate-400 mb-1">Coverage: {s.coverage}</div>
                <div className="text-[10px] text-slate-500">Limitation: {s.limitations}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
