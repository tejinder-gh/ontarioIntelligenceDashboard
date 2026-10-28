import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  CheckCircle2,
  Target,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  Search,
} from 'lucide-react';

export const VentureWorkspacesView: React.FC = () => {
  const [modules, setModules] = useState<any[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>('marketing_outreach');
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [qualification, setQualification] = useState<any>(null);
  const [qualifying, setQualifying] = useState(false);

  useEffect(() => {
    fetch('/api/ventures/modules')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setModules(res.modules);
      });

    fetch('/api/intelligence/businesses?limit=25')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setBusinesses(res.data.businesses);
          if (res.data.businesses.length > 0) {
            handleSelectBusiness(res.data.businesses[0]);
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSelectBusiness = async (biz: any) => {
    setSelectedBusiness(biz);
    setQualifying(true);
    try {
      const res = await fetch('/api/ventures/qualify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venture_id: selectedModule,
          business_id: biz.id,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setQualification(json.qualification);
      }
    } finally {
      setQualifying(false);
    }
  };

  const handleModuleChange = (modId: string) => {
    setSelectedModule(modId);
    if (selectedBusiness) {
      setQualifying(true);
      fetch('/api/ventures/qualify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venture_id: modId,
          business_id: selectedBusiness.id,
        }),
      })
        .then((r) => r.json())
        .then((json) => {
          if (json.success) setQualification(json.qualification);
        })
        .finally(() => setQualifying(false));
    }
  };

  const currentMod = modules.find((m) => m.id === selectedModule);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
              Modular Architecture
            </span>
            <span className="text-xs text-slate-400">• Venture Execution Engine</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Venture Workspaces</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Plug independent venture workflows into the core intelligence foundation. Each venture executes customized qualification hypotheses and opportunity scoring.
          </p>
        </div>

        {/* Module Selector Pills */}
        <div className="flex gap-2 p-1.5 rounded-xl bg-slate-950 border border-slate-800">
          {modules.map((m) => (
            <button
              key={m.id}
              onClick={() => handleModuleChange(m.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedModule === m.id
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* Module Overview Card */}
      {currentMod && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <span className="font-semibold text-white text-sm">{currentMod.name} (v{currentMod.version})</span>
            <p className="text-slate-400 mt-0.5">{currentMod.description}</p>
          </div>
          <div className="flex gap-2">
            {currentMod.supportedWorkflows?.map((wf: string) => (
              <span key={wf} className="px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800 font-mono text-[10px]">
                {wf}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 2-Column Split: Business Selector & Qualification Scorecard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Businesses List */}
        <div className="lg:col-span-5 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-slate-800 bg-slate-950 text-xs font-semibold text-slate-400">
            Select Commercial Entity for Venture Scoring
          </div>
          <div className="divide-y divide-slate-800 overflow-y-auto max-h-[500px]">
            {loading ? (
              <div className="p-8 flex justify-center">
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              businesses.map((biz) => (
                <div
                  key={biz.id}
                  onClick={() => handleSelectBusiness(biz)}
                  className={`p-3.5 cursor-pointer transition text-xs flex justify-between items-center ${
                    selectedBusiness?.id === biz.id ? 'bg-indigo-950/60 border-l-4 border-indigo-500' : 'hover:bg-slate-800/40'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-white">{biz.name}</div>
                    <span className="text-[11px] text-slate-400">{biz.city} • {biz.category_name || biz.category_id}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Qualification Scorecard */}
        <div className="lg:col-span-7 space-y-4">
          {qualifying ? (
            <div className="p-12 rounded-xl bg-slate-900 border border-slate-800 flex justify-center items-center">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !qualification ? (
            <div className="p-12 rounded-xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-xs">
              Select a business to view venture qualification.
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs text-slate-500 uppercase font-semibold">Evaluation Target</span>
                  <h2 className="text-xl font-bold text-white mt-0.5">{selectedBusiness?.name}</h2>
                  <p className="text-xs text-slate-400">{selectedBusiness?.address || 'Address unlisted'}, {selectedBusiness?.city}, ON</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 uppercase font-semibold">Opportunity Score</span>
                  <div className="text-3xl font-extrabold text-indigo-400">{qualification.score.toFixed(0)}/100</div>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                    qualification.priorityTier === 'TIER_1_IMMEDIATE'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : qualification.priorityTier === 'TIER_2_PROSPECT'
                        ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                        : 'bg-slate-800 text-slate-400'
                  }`}>
                    {qualification.priorityTier}
                  </span>
                </div>
              </div>

              {/* Hypotheses Matrix */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Evidence-Grounded Qualification Hypotheses
                </h3>
                <div className="space-y-2">
                  {qualification.hypotheses?.map((h: any) => (
                    <div key={h.code} className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-white">{h.code}</span>
                        <span className="text-emerald-400 font-mono text-[11px]">
                          Confidence: {(h.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-slate-300">{h.statement}</p>
                      <div className="flex gap-1.5 pt-1">
                        {h.evidenceFields?.map((f: string) => (
                          <span key={f} className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 font-mono">
                            Field: {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
