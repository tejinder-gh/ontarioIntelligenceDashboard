import React, { useState } from 'react';
import { 
  AlertCircle, 
  MapPin, 
  Calendar, 
  Database, 
  HelpCircle, 
  Send, 
  CheckCircle2, 
  ExternalLink,
  Info,
  Layers
} from 'lucide-react';

export interface NotEnoughDataProps {
  requestedMetric: string;
  metricCategory?: string;
  requestedGeography: string;
  geographyId?: string;
  nearestAvailableGeography?: string;
  latestAvailablePeriod?: string;
  sourcesChecked: string[]; // e.g. ['DEM-CEN21', 'SPEND-SHS']
  diagnosticReason: 'MISSING_INGESTION' | 'UNAVAILABLE_UPSTREAM' | 'SAMPLE_SUPPRESSED';
  diagnosticExplanation?: string;
  hasBenchmarkAvailable?: boolean;
  benchmarkGeographyName?: string;
  onViewBenchmark?: () => void;
  moduleName?: string;
  businessCategory?: string;
}

export const NotEnoughData: React.FC<NotEnoughDataProps> = ({
  requestedMetric,
  metricCategory = 'Economic Indicator',
  requestedGeography,
  geographyId,
  nearestAvailableGeography = 'Ontario (Province)',
  latestAvailablePeriod = '2021 Census / 2024 Estimates',
  sourcesChecked,
  diagnosticReason,
  diagnosticExplanation,
  hasBenchmarkAvailable = true,
  benchmarkGeographyName = 'Ontario Benchmark',
  onViewBenchmark,
  moduleName = 'Overview',
  businessCategory
}) => {
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userContext, setUserContext] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const reasonBadge = {
    MISSING_INGESTION: {
      label: 'Scheduled for Next Ingestion Cycle',
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      description: 'Official data exists upstream from authoritative publishers and is queued for local synchronization.'
    },
    UNAVAILABLE_UPSTREAM: {
      label: 'Unavailable at Municipal Resolution',
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      description: 'Upstream federal/provincial agencies do not publish this metric at individual municipal (CSD) level to protect survey respondent privacy.'
    },
    SAMPLE_SUPPRESSED: {
      label: 'Confidentiality Suppressed',
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      description: 'Statistics Canada suppresses counts for areas under standard privacy confidentiality thresholds.'
    }
  }[diagnosticReason];

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/insights/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geographyId: geographyId || null,
          geographyName: requestedGeography,
          metricId: requestedMetric.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
          metricName: requestedMetric,
          module: moduleName,
          businessCategory: businessCategory || null,
          userContext: userContext || null,
          userEmail: userEmail || null
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      setSubmitted(true);
      setTimeout(() => {
        setShowRequestModal(false);
        setSubmitted(false);
        setUserContext('');
      }, 2500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit demand signal. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-6">
        {/* Header Badge & Title */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Data Availability Disclosure
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${reasonBadge.color}`}>
                  {reasonBadge.label}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mt-0.5">
                Not Enough Data at Requested Municipal Resolution
              </h3>
            </div>
          </div>

          <button
            onClick={() => setShowRequestModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-all shadow-sm active:scale-95"
          >
            <Send className="h-3.5 w-3.5" />
            Request This Insight
          </button>
        </div>

        {/* Diagnostic 4-Grid Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Requested Target */}
          <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
              <HelpCircle className="h-3.5 w-3.5 text-slate-500" />
              Requested Target
            </div>
            <div className="text-sm font-semibold text-slate-200 truncate">
              {requestedMetric}
            </div>
            <div className="text-xs text-slate-400 mt-0.5 truncate">
              in {requestedGeography} ({metricCategory})
            </div>
          </div>

          {/* 2. Nearest Resolution */}
          <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
              <MapPin className="h-3.5 w-3.5 text-blue-400" />
              Nearest Geography Available
            </div>
            <div className="text-sm font-semibold text-slate-200">
              {nearestAvailableGeography}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Broader statistical aggregation
            </div>
          </div>

          {/* 3. Latest Reference Period */}
          <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
              <Calendar className="h-3.5 w-3.5 text-amber-400" />
              Latest Reference Period
            </div>
            <div className="text-sm font-semibold text-slate-200">
              {latestAvailablePeriod}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Verified authoritative snapshot
            </div>
          </div>

          {/* 4. Sources Audited */}
          <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
              <Database className="h-3.5 w-3.5 text-purple-400" />
              Sources Audited
            </div>
            <div className="flex flex-wrap gap-1.5 mt-0.5">
              {sourcesChecked.map((src) => (
                <span 
                  key={src}
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700"
                >
                  {src}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Explanation & Policy */}
        <div className="p-4 rounded-xl bg-slate-950/30 border border-slate-800/60 flex items-start gap-3 text-xs text-slate-300 leading-relaxed">
          <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-200">Strict Non-Fabrication Standard: </span>
            {diagnosticExplanation || reasonBadge.description}{' '}
            Per platform data governance rules, we never silently substitute provincial estimates or adjacent municipal figures without explicit user authorization.
          </div>
        </div>

        {/* Benchmark Action Callout if available */}
        {hasBenchmarkAvailable && (
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-950/30 to-indigo-950/30 border border-blue-800/30">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-blue-200">
                  {benchmarkGeographyName} Available
                </div>
                <div className="text-[11px] text-slate-400">
                  You can inspect the broader regional benchmark to benchmark economic baseline patterns.
                </div>
              </div>
            </div>

            {onViewBenchmark && (
              <button
                onClick={onViewBenchmark}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors"
              >
                Switch to Benchmark
                <ExternalLink className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Interactive "Request this insight" Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-slate-100 font-semibold text-base">
                <Send className="h-4 w-4 text-emerald-400" />
                Request Priority Ingestion
              </div>
              <button
                onClick={() => setShowRequestModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            {submitted ? (
              <div className="py-8 text-center flex flex-col items-center gap-3">
                <CheckCircle2 className="h-12 w-12 text-emerald-400 animate-bounce" />
                <h4 className="text-base font-semibold text-slate-100">Demand Signal Logged</h4>
                <p className="text-xs text-slate-300 max-w-xs">
                  Your request for <strong className="text-slate-100">{requestedMetric}</strong> in <strong className="text-slate-100">{requestedGeography}</strong> has been persisted to our upstream synchronization queue.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendRequest} className="mt-4 flex flex-col gap-4">
                <div className="text-xs text-slate-400">
                  User demand directly determines our automated ingestion roadmap. Tell us what decision this data informs:
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Your Use Case / Decision Context (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={userContext}
                    onChange={(e) => setUserContext(e.target.value)}
                    placeholder="e.g. Evaluating franchise location feasibility or commercial lease negotiation..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Your Email (For Alert when Ingested)
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {errorMessage && (
                  <div className="text-xs text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                    {errorMessage}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowRequestModal(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Recording...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
