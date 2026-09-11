import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  MapPin, 
  Tag, 
  Percent, 
  Send, 
  Sliders, 
  Play, 
  TrendingDown, 
  Building, 
  FileText, 
  Fuel, 
  Trash2,
  Clock
} from 'lucide-react';

interface AlertSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCityId?: string;
  defaultCityName?: string;
}

const WATCH_TYPES = [
  { 
    id: 'LISTING_PRICE_DROP', 
    label: 'Business-for-Sale Price Drop', 
    icon: <TrendingDown className="w-4 h-4 text-rose-400" />,
    description: 'Trigger an alert whenever an active commercial listing reduces asking price beyond your specified threshold percentage.'
  },
  { 
    id: 'NEW_LISTING', 
    label: 'New Business / Commercial Listing', 
    icon: <Building className="w-4 h-4 text-indigo-400" />,
    description: 'Detect newly posted businesses for sale or commercial spaces within your target municipal radius.'
  },
  { 
    id: 'MUNICIPAL_BUDGET_RELEASE', 
    label: 'Municipal Budget & FIR Release', 
    icon: <FileText className="w-4 h-4 text-purple-400" />,
    description: 'Notify when official MMAH Financial Information Returns or municipal operating budgets are approved.'
  },
  { 
    id: 'GAS_PRICE_DELTA', 
    label: 'Gasoline Price Delta Surge', 
    icon: <Fuel className="w-4 h-4 text-amber-400" />,
    description: 'Alert when local retail fuel price diverges materially (e.g. > 5¢/L) from the Toronto benchmark.'
  }
];

export const AlertSubscriptionModal: React.FC<AlertSubscriptionModalProps> = ({
  isOpen,
  onClose,
  defaultCityId = 'CSD_burlington',
  defaultCityName = 'Burlington'
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'create' | 'active'>('create');
  
  // Form State
  const [email, setEmail] = useState<string>(() => localStorage.getItem('ontario_subscriber_email') || '');
  const [watchType, setWatchType] = useState<string>('LISTING_PRICE_DROP');
  const [targetCityId, setTargetCityId] = useState<string>(defaultCityId);
  const [targetCityName, setTargetCityName] = useState<string>(defaultCityName);
  const [selectedCategory, setSelectedCategory] = useState<string>('pizza_store');
  const [thresholdPct, setThresholdPct] = useState<number>(5.0);
  const [maxRadiusKm, setMaxRadiusKm] = useState<number>(30);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Taxonomy categories
  const [categories, setCategories] = useState<any[]>([]);

  // Active Watches & Notifications State
  const [watches, setWatches] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [evalSummary, setEvalSummary] = useState<string | null>(null);

  // Load categories
  useEffect(() => {
    fetch('/api/taxonomy/categories')
      .then(res => res.json())
      .then(d => {
        if (d.categories) setCategories(d.categories);
      })
      .catch(() => {});
  }, []);

  // Sync city props
  useEffect(() => {
    setTargetCityId(defaultCityId);
    setTargetCityName(defaultCityName);
  }, [defaultCityId, defaultCityName]);

  // Load active watches for current email
  const fetchWatches = () => {
    fetch(`/api/alerts/watches?email=${encodeURIComponent(email)}`)
      .then(res => res.json())
      .then(d => {
        if (d.data) setWatches(d.data);
      })
      .catch(() => {});
  };

  // Load pending notifications
  const fetchNotifications = () => {
    fetch('/api/alerts/notifications/pending')
      .then(res => res.json())
      .then(d => {
        if (d.data) setNotifications(d.data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (isOpen) {
      fetchWatches();
      fetchNotifications();
    }
  }, [isOpen, email]);

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCreateWatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMessage(null);

    localStorage.setItem('ontario_subscriber_email', email);

    const payload = {
      subscriber_email: email,
      watch_type: watchType,
      target_geography_id: targetCityId,
      target_business_category: selectedCategory,
      threshold_percentage: thresholdPct,
      max_radius_km: maxRadiusKm,
      is_active: true
    };

    try {
      const res = await fetch('/api/alerts/watches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(`Watch registered successfully! We'll alert ${email} when conditions match.`);
        fetchWatches();
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        alert(data.error || 'Failed to create watch');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRunEvaluation = async () => {
    setEvaluating(true);
    setEvalSummary(null);
    try {
      const res = await fetch('/api/alerts/evaluate', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setEvalSummary(`Evaluation completed: ${data.evaluatedWatches || 0} watches evaluated, ${data.eventsProcessed || 0} events matched, ${data.notificationsCreated || 0} new notifications generated.`);
        fetchNotifications();
      }
    } catch (err: any) {
      setEvalSummary(`Evaluation error: ${err.message}`);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="alert-modal-title"
        className="liquid-glass-modal rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/10"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between sticky top-0 bg-slate-900/90 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-950/80 text-amber-400 border border-amber-700/60 shadow-inner">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 id="alert-modal-title" className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Intelligence Alerts & Diff Engine</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                  Real-Time Diff
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Subscribe to automated change-detection events across commercial listings, gas prices, and municipal releases.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Tabs */}
        <div className="px-6 pt-4 border-b border-white/5 flex gap-4">
          <button
            type="button"
            onClick={() => setActiveSubTab('create')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeSubTab === 'create'
                ? 'border-amber-500 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Create Intelligence Watch
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('active')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeSubTab === 'active'
                ? 'border-amber-500 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            Active Subscriptions ({watches.length})
            {notifications.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-950 font-bold">
                {notifications.length}
              </span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {activeSubTab === 'create' && (
            <form onSubmit={handleCreateWatch} className="space-y-4">
              {successMessage && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-700 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Email Address */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Subscriber Notification Email:
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="investor@example.com"
                  className="bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 w-full focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Watch Type Grid */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2">
                  Select Event Trigger Type:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {WATCH_TYPES.map(wt => (
                    <div
                      key={wt.id}
                      onClick={() => setWatchType(wt.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        watchType === wt.id
                          ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-amber-950/30'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {wt.icon}
                        <span className="text-xs font-bold text-white">{wt.label}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {wt.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Parameters Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {/* City */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                    Target Municipality:
                  </label>
                  <input
                    type="text"
                    value={targetCityName}
                    onChange={e => setTargetCityName(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 w-full focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-sky-400" />
                    Business Category:
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 w-full focus:outline-none focus:border-amber-500"
                  >
                    {categories.length > 0 ? (
                      categories.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.displayName || c.name || c.id}</option>
                      ))
                    ) : (
                      <>
                        <option value="pizza_store">Pizza Store / Pizzeria</option>
                        <option value="automotive_repair">Automotive Repair</option>
                        <option value="child_daycare">Child Daycare Facility</option>
                        <option value="fitness_centre">Fitness Centre</option>
                        <option value="coffee_shop">Coffee & Bakery Cafe</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Threshold Delta */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-emerald-400" />
                    Min Price/Delta Drop (%):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    step="0.5"
                    value={thresholdPct}
                    onChange={e => setThresholdPct(parseFloat(e.target.value) || 5)}
                    className="bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 w-full focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Proximity Radius */}
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block">Maximum Proximity Radius:</span>
                  <span className="text-[11px] text-slate-400">
                    Matches listings and announcements within {maxRadiusKm} km of {targetCityName}.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {[15, 30, 50, 100].map(km => (
                    <button
                      key={km}
                      type="button"
                      onClick={() => setMaxRadiusKm(km)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                        maxRadiusKm === km
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      {km} km
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-xs shadow-lg shadow-amber-900/40 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submitting ? 'Registering Watch...' : 'Activate Intelligence Watch'}
                </button>
              </div>
            </form>
          )}

          {activeSubTab === 'active' && (
            <div className="space-y-4">
              {/* Evaluator Trigger */}
              <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-white block">Single-Pass Diff Evaluator</span>
                  <span className="text-[11px] text-slate-400">
                    Simulate upstream ingestion event matching against your active subscriber filters.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRunEvaluation}
                  disabled={evaluating}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" />
                  {evaluating ? 'Evaluating...' : 'Run Evaluator Now'}
                </button>
              </div>

              {evalSummary && (
                <div className="p-3 rounded-lg bg-indigo-950/60 border border-indigo-700/60 text-xs text-indigo-300">
                  {evalSummary}
                </div>
              )}

              {/* Active Watches List */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300 block">
                  Active Subscriber Watches for {email}:
                </span>
                {watches.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs glass-panel rounded-xl">
                    No active watches found for this email address. Switch to the &quot;Create&quot; tab to set your first alert threshold.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {watches.map((w: any) => (
                      <div 
                        key={w.id} 
                        className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="font-bold text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span>{w.watch_type.replace(/_/g, ' ')}</span>
                            {w.target_business_category && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800/50">
                                {w.target_business_category}
                              </span>
                            )}
                          </div>
                          <div className="text-slate-400 flex items-center gap-3 text-[11px]">
                            <span>Radius: {w.max_radius_km || 30} km</span>
                            <span>Threshold: {w.threshold_percentage || 5}% drop</span>
                            <span>Created: {new Date(w.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-emerald-400 px-2 py-1 rounded bg-emerald-950/60 border border-emerald-800/40">
                          Active
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pending Notifications List */}
              {notifications.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Unread Notification Queue ({notifications.length}):
                  </span>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {notifications.map((n: any) => (
                      <div 
                        key={n.id} 
                        className="p-3 rounded-xl bg-amber-950/30 border border-amber-700/50 text-xs space-y-1"
                      >
                        <div className="font-semibold text-white flex items-center justify-between">
                          <span>{n.title}</span>
                          <span className="text-[10px] text-amber-400 font-mono">
                            {new Date(n.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-slate-300 text-[11px]">
                          {n.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
