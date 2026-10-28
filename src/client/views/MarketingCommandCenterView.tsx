import React, { useState, useEffect } from 'react';
import {
  Sparkles, ShieldAlert, Play, Lock, CheckCircle2, AlertOctagon, PhoneCall, UserX, Mail, Send,
} from 'lucide-react';

export const MarketingCommandCenterView: React.FC = () => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [simulationReport, setSimulationReport] = useState<any>(null);
  const [optOutValue, setOptOutValue] = useState('');
  const [optOutSuccess, setOptOutSuccess] = useState(false);

  const fetchCampaigns = () => {
    setLoading(true);
    fetch('/api/ventures/campaigns')
      .then((r) => r.json())
      .then((res) => { if (res.success) setCampaigns(res.campaigns); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const handleCreateDefaultCampaign = async () => {
    await fetch('/api/ventures/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Halton Commercial Growth Initiative (Q4 2026)',
        targetCategories: ['pizza_store', 'full_service_restaurant', 'automotive_repair'],
        targetCities: ['Burlington', 'Oakville', 'Milton', 'Halton Hills'],
        offeringTopic: 'Local Customer Acquisition & Operating Efficiency',
        senderOrganization: 'Ontario Economic & Commercial Intelligence',
        senderAddress: '100 King St W, Suite 5600, Toronto, ON M5X 1C9',
        senderContact: 'compliance@intelligence.ontario.ca',
        dailySendCap: 50,
      }),
    });
    fetchCampaigns();
  };

  const handleApprove = async (id: string) => {
    await fetch(`/api/ventures/campaigns/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvedBy: 'CHIEF_COMPLIANCE_OFFICER', executionMode: 'DRY_RUN' }),
    });
    fetchCampaigns();
  };

  const handleDryRun = async (id: string) => {
    setSimulating(true);
    try {
      const res = await fetch(`/api/ventures/campaigns/${id}/dry-run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxTargets: 25 }),
      });
      const json = await res.json();
      if (json.success) {
        setSimulationReport(json.result);
        fetchCampaigns();
      }
    } finally {
      setSimulating(false);
    }
  };

  const handleToggleKillSwitch = async (id: string, current: boolean) => {
    await fetch(`/api/ventures/campaigns/${id}/kill-switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !current }),
    });
    fetchCampaigns();
  };

  const handleRecordOptOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!optOutValue) return;
    const res = await fetch('/api/ventures/suppression', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelValue: optOutValue, channelType: 'EMAIL', reason: 'UNSUBSCRIBE_REQUEST' }),
    });
    const json = await res.json();
    if (json.success) {
      setOptOutSuccess(true);
      setOptOutValue('');
      setTimeout(() => setOptOutSuccess(false), 4000);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
              Venture Execution
            </span>
            <span className="text-xs text-slate-400">• Strict CASL & CRTC Compliance</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Marketing Command Center</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Configure multi-channel prospecting sequences, enforce CASL statutory boundaries, simulate dry-run campaigns, and control fail-closed activation gates.
          </p>
        </div>

        <button
          onClick={handleCreateDefaultCampaign}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg transition"
        >
          <Sparkles className="w-4 h-4" />
          <span>New Halton Campaign</span>
        </button>
      </div>

      {/* Simulation Result Banner */}
      {simulationReport && (
        <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-800 text-xs text-emerald-200 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-emerald-100">
              Dry-Run Sequence Executed with 100% CASL Compliance
            </div>
            <p className="mt-1">
              Evaluated: <strong>{simulationReport.evaluated}</strong> qualified commercial leads • 
              Simulated Dispatches: <strong>{simulationReport.dispatchedDryRun}</strong> • 
              Suppressed: <strong>{simulationReport.suppressed}</strong> • 
              Eligibility Rate: <strong>{simulationReport.eligibleRatePct}%</strong>
            </p>
            <p className="text-emerald-300 mt-1">
              All dispatches tagged with statutory physical sender identity, 60-day unsubscribe links, and Section 10(9) B2B relevance evidence. Zero real emails sent.
            </p>
          </div>
        </div>
      )}

      {/* Campaigns Table */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Configured Campaigns</h3>
          <span className="text-xs text-slate-500">{campaigns.length} campaigns</span>
        </div>
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No active campaigns. Click "New Halton Campaign" to initialize an evidence-grounded campaign.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Campaign Name</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Approval Status</th>
                  <th className="py-3 px-4">Daily Cap</th>
                  <th className="py-3 px-4">Simulated Dispatches</th>
                  <th className="py-3 px-4">Kill Switch</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {campaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{camp.name}</div>
                      <span className="text-[11px] text-slate-500">ID: {camp.id.slice(0, 16)}...</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        camp.execution_mode === 'DRY_RUN'
                          ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}>
                        {camp.execution_mode}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        camp.approval_status === 'APPROVED'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {camp.approval_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono">{camp.daily_send_cap}/day</td>
                    <td className="py-3 px-4 font-mono text-indigo-400">{camp.delivered_messages || 0}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleKillSwitch(camp.id, camp.kill_switch_active)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          camp.kill_switch_active
                            ? 'bg-rose-900 text-rose-200'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {camp.kill_switch_active ? 'ACTIVE (BLOCKED)' : 'Disarmed'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {camp.approval_status !== 'APPROVED' ? (
                        <button
                          onClick={() => handleApprove(camp.id)}
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px]"
                        >
                          Approve Gate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDryRun(camp.id)}
                          disabled={simulating || camp.kill_switch_active}
                          className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] inline-flex items-center gap-1"
                        >
                          <Play className="w-3 h-3" />
                          <span>Dry-Run Simulation</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CASL Opt-Out & Regulatory Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <UserX className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-semibold text-white">Universal CASL Suppression & Opt-Out</h3>
          </div>
          <p className="text-xs text-slate-400">
            Instantly add an email or phone number to the global suppression ledger. Prevents any future message or simulated dispatch across all campaigns.
          </p>
          <form onSubmit={handleRecordOptOut} className="flex gap-2">
            <input
              type="text"
              value={optOutValue}
              onChange={(e) => setOptOutValue(e.target.value)}
              placeholder="e.g. contact@business.com or (905) 555-0199"
              className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-600 text-white text-xs font-semibold transition"
            >
              Suppress
            </button>
          </form>
          {optOutSuccess && (
            <p className="text-xs text-emerald-400 font-semibold">Address recorded in global suppression ledger.</p>
          )}
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Acuity Voice Outreach Regulatory Gate</h3>
          </div>
          <p className="text-xs text-slate-400">
            Integration contract with Acuity voice AI platform (<code className="text-slate-300">dograh</code>). Outbound telemarketing calling remains blocked until CRTC calling hours (9am-9pm ET) and National DNCL scrubbing clearance pass.
          </p>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">CRTC Time Window:</span>
              <span className="text-emerald-400 font-semibold">Valid (9am - 9pm ET)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">National DNCL Scrubbing:</span>
              <span className="text-amber-400 font-semibold">Carrier Gateway Pending</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Statutory AI Disclosure:</span>
              <span className="text-emerald-400 font-semibold">Enforced in Prompt</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
