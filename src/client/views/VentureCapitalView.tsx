import React, { useEffect, useState, useMemo } from 'react';
import {
  Building2,
  TrendingUp,
  DollarSign,
  Briefcase,
  Layers,
  Sparkles,
  ShieldCheck,
  Search,
  ExternalLink,
  Target,
  Users,
  Compass,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  BarChart2,
  Network,
  Radio,
  FileCheck2,
  Mail,
  MapPin,
} from 'lucide-react';
import {
  fetchVCSummary,
  fetchVCFirms,
  fetchVCDeals,
  fetchVCSectors,
  fetchVCSignals,
  fetchVCSyndication,
  calculateInvestorFit,
  type VCSummaryData,
  type VCFirm,
  type VCDeal,
  type VCSector,
  type VCSignal,
  type VCSyndicationGraph,
  type InvestorFitMatch,
} from '../utils/vc-api.js';

interface VentureCapitalViewProps {
  initialCityId?: string;
}

export const VentureCapitalView: React.FC<VentureCapitalViewProps> = () => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'firms' | 'deals' | 'matcher' | 'syndication' | 'signals'>('overview');
  
  // Data state
  const [summary, setSummary] = useState<VCSummaryData | null>(null);
  const [firms, setFirms] = useState<VCFirm[]>([]);
  const [deals, setDeals] = useState<VCDeal[]>([]);
  const [sectors, setSectors] = useState<VCSector[]>([]);
  const [signals, setSignals] = useState<VCSignal[]>([]);
  const [syndication, setSyndication] = useState<VCSyndicationGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Directory filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState('all');
  const [selectedSector, setSelectedSector] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('all');

  // Matcher state
  const [matcherSector, setMatcherSector] = useState('Artificial Intelligence');
  const [matcherStage, setMatcherStage] = useState('series_a');
  const [matcherAmount, setMatcherAmount] = useState(15000000);
  const [matcherCountry, setMatcherCountry] = useState('CA');
  const [matches, setMatches] = useState<InvestorFitMatch[]>([]);
  const [matchingLoading, setMatchingLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [sumRes, firmsRes, dealsRes, secRes, sigRes, synRes] = await Promise.all([
          fetchVCSummary(),
          fetchVCFirms(),
          fetchVCDeals(),
          fetchVCSectors(),
          fetchVCSignals(),
          fetchVCSyndication(),
        ]);
        setSummary(sumRes);
        setFirms(firmsRes);
        setDeals(dealsRes);
        setSectors(secRes);
        setSignals(sigRes);
        setSyndication(synRes);
      } catch (err: any) {
        setError(err.message || 'Failed to load Venture Capital data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Run matcher when tab or inputs change
  useEffect(() => {
    async function runMatcher() {
      try {
        setMatchingLoading(true);
        const res = await calculateInvestorFit({
          sector: matcherSector,
          stage: matcherStage,
          targetCheckSize: matcherAmount,
          countryCode: matcherCountry,
          stateProvince: 'ON',
        });
        setMatches(res);
      } catch (err) {
        console.error('Error running matcher:', err);
      } finally {
        setMatchingLoading(false);
      }
    }
    if (activeSubTab === 'matcher' || activeSubTab === 'overview') {
      runMatcher();
    }
  }, [activeSubTab, matcherSector, matcherStage, matcherAmount, matcherCountry]);

  // Filtered firms
  const filteredFirms = useMemo(() => {
    return firms.filter(f => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = f.name.toLowerCase().includes(q);
        const matchDesc = (f.description || '').toLowerCase().includes(q);
        const matchTheses = (f.theses || []).some(t =>
          (t.summary || '').toLowerCase().includes(q) ||
          (t.evaluationCriteria || []).some(c => c.toLowerCase().includes(q))
        );
        const matchInvestments = (f.recent_investments || []).some(i =>
          (i.companyName || '').toLowerCase().includes(q)
        );
        const matchContact = (f.contact_email || '').toLowerCase().includes(q) || (f.office_address || '').toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchTheses && !matchInvestments && !matchContact) return false;
      }
      if (selectedStage !== 'all') {
        if (!(f.stages || []).map(s => s.toLowerCase()).includes(selectedStage.toLowerCase())) {
          return false;
        }
      }
      if (selectedSector !== 'all') {
        if (!(f.sectors || []).some(s => s.toLowerCase().includes(selectedSector.toLowerCase()))) {
          return false;
        }
      }
      if (selectedCountry !== 'all') {
        if (f.country_code?.toLowerCase() !== selectedCountry.toLowerCase()) {
          return false;
        }
      }
      return true;
    });
  }, [firms, searchQuery, selectedStage, selectedSector, selectedCountry]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-400">Loading Venture Capital & Investor Intelligence Graph...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="p-4 rounded-xl border border-rose-800/80 bg-rose-950/40 text-rose-200 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <h4 className="font-semibold text-sm">Failed to connect to VC Intelligence Schema</h4>
            <p className="text-xs text-rose-300/80 mt-0.5">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="liquid-glass-header p-6 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <TrendingUp className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Venture Capital & Investor Intelligence Graph
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
              Active Graph
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
            Institutional investment graph connecting Tier-1 US & Canadian funds (Inovia, Georgian, Sequoia, a16z) with high-growth scale-ups, rounds, theses, and public capital commitments.
          </p>
        </div>

        {/* Sub-tab Navigation Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-white/10 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart2 },
            { id: 'firms', label: 'VC Firms', icon: Building2 },
            { id: 'deals', label: 'Deals & Rounds', icon: DollarSign },
            { id: 'matcher', label: 'Investor Matcher', icon: Target },
            { id: 'syndication', label: 'Syndicates & LPs', icon: Network },
            { id: 'signals', label: 'Signals', icon: Radio },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* SUB-TAB 1: OVERVIEW */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* 4 Hero KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                <span>Institutional AUM Tracked</span>
                <DollarSign className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-white">
                ${((summary?.totalAumUsd || 0) / 1e9).toFixed(1)}B
              </div>
              <p className="text-xs text-indigo-300 flex items-center gap-1">
                <span>Across {summary?.totalFirms} institutional funds</span>
              </p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                <span>Scale-Up Portfolio Valuation</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">
                ${((summary?.totalValuationUsd || 0) / 1e9).toFixed(1)}B
              </div>
              <p className="text-xs text-slate-400">
                {summary?.totalCompanies} category leaders tracked
              </p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                <span>Canadian Scale-Up Deals</span>
                <Building2 className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-sky-400">
                ${((summary?.canadianFundingRaisedUsd || 0) / 1e6).toFixed(0)}M+
              </div>
              <p className="text-xs text-sky-300">
                Cohere $500M Series D (Toronto)
              </p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                <span>Lead Investor Rate</span>
                <ShieldCheck className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-400">
                {summary?.leadInvestorRate}%
              </div>
              <p className="text-xs text-slate-400">
                High conviction, board seat participation
              </p>
            </div>
          </div>

          {/* Sector & Stage Distributions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sector Capital Allocation */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Venture Capital by Tech Sector</h3>
                  <p className="text-xs text-slate-400">Firm mandate frequency across technology domains</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-950/80 text-indigo-300 border border-indigo-700/60">
                  {summary?.sectorDistribution?.length || 0} Sectors
                </span>
              </div>

              <div className="space-y-3 pt-2">
                {summary?.sectorDistribution?.slice(0, 6).map(sec => (
                  <div key={sec.sector} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-200">{sec.sector}</span>
                      <span className="text-slate-400">{sec.count} firms ({sec.aumWeightedPct}% AUM)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(15, sec.count * 15))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Geographic & Cross-Border Allocation */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Geographic Footprint & Corridor Mandate</h3>
                  <p className="text-xs text-slate-400">Canada-US cross-border institutional capital allocation</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
                  North America
                </span>
              </div>

              <div className="space-y-3 pt-2">
                {summary?.countryAllocation?.map(geo => (
                  <div key={geo.country} className="p-4 rounded-xl bg-slate-950/70 border border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-white">{geo.country}</span>
                      <p className="text-xs text-slate-400">{geo.firmCount} institutional firms</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono font-bold text-emerald-400">${(geo.aumUsd / 1e9).toFixed(1)}B AUM</div>
                      <span className="text-xs text-slate-400">{geo.sharePct}% share</span>
                    </div>
                  </div>
                ))}

                <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-xs text-indigo-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>
                    <strong>Ontario Scale-Up Synergies:</strong> Canadian firms (Inovia, Georgian, Version One) actively syndicate with US Tier-1s (Sequoia, a16z, Founders Fund) for late-stage Ontario tech scale-ups.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Matcher Preview Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900/60 via-slate-900/80 to-emerald-950/60 border border-indigo-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Find Venture Investors for Ontario Startups</h3>
              </div>
              <p className="text-xs text-slate-300 max-w-2xl">
                Run the algorithmic investor fit calculator against verified fund check limits, stage preferences, and geographic mandates.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveSubTab('matcher')}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2"
            >
              <span>Launch Matcher</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: VC FIRMS DIRECTORY */}
      {activeSubTab === 'firms' && (
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search firm name or thesis..."
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <select
              value={selectedStage}
              onChange={e => setSelectedStage(e.target.value)}
              className="bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Stages</option>
              <option value="seed">Seed</option>
              <option value="series_a">Series A</option>
              <option value="series_b">Series B</option>
              <option value="growth">Growth</option>
            </select>

            <select
              value={selectedSector}
              onChange={e => setSelectedSector(e.target.value)}
              className="bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Sectors</option>
              <option value="ai">Artificial Intelligence</option>
              <option value="saas">SaaS / Enterprise</option>
              <option value="deeptech">DeepTech / Defense</option>
              <option value="fintech">FinTech</option>
              <option value="marketplaces">Marketplaces</option>
            </select>

            <select
              value={selectedCountry}
              onChange={e => setSelectedCountry(e.target.value)}
              className="bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Countries</option>
              <option value="ca">Canada 🇨🇦</option>
              <option value="us">United States 🇺🇸</option>
            </select>

            <span className="text-xs text-slate-400 px-2 font-mono">
              {filteredFirms.length} of {firms.length} firms
            </span>
          </div>

          {/* Firm Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredFirms.map(firm => {
              const isCanada = firm.country_code === 'CA';
              return (
                <div
                  key={firm.id}
                  className="glass-panel p-5 rounded-2xl border border-white/10 flex flex-col justify-between space-y-4 hover:border-indigo-500/40 transition-all group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">
                          {firm.name}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {firm.city}, {firm.state_province} ({firm.country})
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          isCanada
                            ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                            : 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60'
                        }`}
                      >
                        {isCanada ? 'Canada 🇨🇦' : 'USA 🇺🇸'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                      {firm.description}
                    </p>

                    {/* Check and AUM metrics */}
                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
                        <span className="text-slate-400 block text-[11px]">Reported AUM</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {firm.aum_amount ? `$${(firm.aum_amount / 1e9).toFixed(1)}B` : 'Undisclosed'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
                        <span className="text-slate-400 block text-[11px]">Typical Check</span>
                        <span className="font-mono font-semibold text-white">
                          {firm.typical_check_min && firm.typical_check_max
                            ? `$${(firm.typical_check_min / 1e6).toFixed(0)}M–$${(firm.typical_check_max / 1e6).toFixed(0)}M`
                            : 'Multi-stage'}
                        </span>
                      </div>
                    </div>

                    {/* Verified Contact Information */}
                    {(firm.contact_email || firm.office_address) && (
                      <div className="p-3 rounded-xl bg-slate-900/90 border border-white/10 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-indigo-400" />
                            Official Contact
                          </span>
                          {firm.contact_email && (
                            <a
                              href={`mailto:${firm.contact_email}`}
                              className="text-indigo-300 hover:text-indigo-200 font-mono text-[11px] font-semibold hover:underline"
                            >
                              {firm.contact_email}
                            </a>
                          )}
                        </div>
                        {firm.office_address && (
                          <div className="flex items-start gap-1.5 text-slate-400 text-[11px] pt-0.5">
                            <MapPin className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
                            <span className="line-clamp-2 leading-tight">{firm.office_address}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Investment Thesis & Evaluation Criteria */}
                    {firm.theses && firm.theses.length > 0 && (
                      <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-2 text-xs">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Evaluation Criteria & Thesis</span>
                        </div>
                        {firm.theses[0].summary && (
                          <p className="text-slate-300 text-[11px] leading-relaxed italic">
                            "{firm.theses[0].summary}"
                          </p>
                        )}
                        {firm.theses[0].evaluationCriteria && firm.theses[0].evaluationCriteria.length > 0 && (
                          <div className="space-y-1 pt-1 border-t border-indigo-500/20">
                            <span className="text-[10px] font-semibold text-slate-400 block">Evaluation Mandate:</span>
                            {firm.theses[0].evaluationCriteria.slice(0, 3).map((crit, idx) => (
                              <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                                <span className="leading-tight">{crit}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {firm.theses[0].requiredTraction && firm.theses[0].requiredTraction.length > 0 && (
                          <div className="pt-1 border-t border-indigo-500/20 flex flex-wrap gap-1">
                            <span className="text-[10px] text-slate-400 self-center">Traction Bar:</span>
                            {firm.theses[0].requiredTraction.map((trac, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-900/90 text-emerald-300 border border-emerald-800/50 text-[10px] font-medium">
                                {trac}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Recent Investments */}
                    {firm.recent_investments && firm.recent_investments.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                            <TrendingUp className="w-3 h-3 text-emerald-400" />
                            Recent Portfolio Investments
                          </span>
                          <span className="text-slate-400 font-mono text-[10px]">{firm.recent_investments.length} logged</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {firm.recent_investments.map((inv, idx) => (
                            <div
                              key={idx}
                              className="px-2 py-1 rounded-lg bg-slate-900/90 border border-white/10 text-xs flex items-center gap-1.5 hover:border-indigo-500/50 transition-colors"
                            >
                              <span className="font-semibold text-white">{inv.companyName}</span>
                              {inv.stage && (
                                <span className="text-[10px] px-1 py-0.5 rounded bg-indigo-950 text-indigo-300 font-mono">
                                  {inv.stage.replace('_', ' ')}
                                </span>
                              )}
                              {inv.amountRaised && (
                                <span className="text-[10px] text-emerald-400 font-mono font-medium">
                                  ${(inv.amountRaised / 1e6).toFixed(0)}M
                                </span>
                              )}
                              {inv.role === 'lead' && (
                                <span className="text-[9px] px-1 py-0.5 rounded bg-amber-950/80 text-amber-300 font-bold border border-amber-700/60">
                                  LEAD
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sectors and Stages */}
                    <div className="space-y-2 pt-1">
                      <div className="flex flex-wrap gap-1.5">
                        {(firm.stages || []).map(st => (
                          <span
                            key={st}
                            className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800 text-slate-300"
                          >
                            {st.replace('_', ' ')}
                          </span>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {(firm.sectors || []).map(sec => (
                          <span
                            key={sec}
                            className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-950/60 text-indigo-300 border border-indigo-800/40"
                          >
                            {sec}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Key Partners */}
                    {firm.partners && firm.partners.length > 0 && (
                      <div className="pt-2 border-t border-white/5 text-xs text-slate-400 flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-300">Leadership: </span>
                        {firm.partners.map(p => (
                          <span key={p.id} className="inline-flex items-center gap-1 text-slate-200">
                            {p.name}
                            {p.publicEmail && (
                              <a href={`mailto:${p.publicEmail}`} title={p.publicEmail} className="text-indigo-400 hover:text-indigo-300">
                                <Mail className="w-2.5 h-2.5 inline" />
                              </a>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
                    {firm.website ? (
                      <a
                        href={firm.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        <span>Visit Website</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : <span />}

                    {firm.linkedin_url && (
                      <a
                        href={firm.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                      >
                        <span>LinkedIn</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: DEALS & VALUATIONS */}
      {activeSubTab === 'deals' && (
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-xl space-y-4">
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Portfolio Rounds & Valuations Ledger</h3>
              <p className="text-xs text-slate-400">Verified financing rounds, post-money valuations, and participating investors</p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-700/60">
              {deals.length} Rounds Logged
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Headquarters</th>
                  <th className="py-3 px-4">Round</th>
                  <th className="py-3 px-4 text-right">Amount Raised</th>
                  <th className="py-3 px-4 text-right">Post-Money Valuation</th>
                  <th className="py-3 px-4">Investors Logged</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {deals.map(deal => {
                  const isCanada = deal.country_code === 'CA';
                  return (
                    <tr key={deal.round_id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4 font-sans font-bold text-white">
                        <div className="flex items-center gap-2">
                          <span>{deal.company_name}</span>
                          {isCanada && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-950 text-rose-300 border border-rose-800/60">
                              Ontario / Canada
                            </span>
                          )}
                        </div>
                        {deal.company_website && (
                          <a
                            href={deal.company_website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-slate-400 hover:text-indigo-400 font-sans"
                          >
                            {deal.company_website.replace('https://', '')}
                          </a>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-sans text-slate-300">
                        {deal.city}, {deal.state_province} ({deal.country_code})
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/60 uppercase">
                          {deal.round_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                        {deal.amount_raised ? `$${(deal.amount_raised / 1e6).toLocaleString()}M` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-white">
                        {deal.post_money_valuation ? `$${(deal.post_money_valuation / 1e9).toFixed(1)}B` : '—'}
                      </td>
                      <td className="py-3.5 px-4 font-sans text-slate-200">
                        {(deal.investors || []).map(inv => inv.firmName).join(', ') || 'Syndicate participants'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {deal.announced_date ? new Date(deal.announced_date).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: INVESTOR MATCHER & FIT CALCULATOR */}
      {activeSubTab === 'matcher' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Form */}
          <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-5 h-fit">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">Founder Match Engine</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Match your venture ask against our active institutional fund graph based on check limits, sector focus, stage, and geographic preferences.
            </p>

            <div className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Industry Sector</label>
                <select
                  value={matcherSector}
                  onChange={e => setMatcherSector(e.target.value)}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Artificial Intelligence">Artificial Intelligence / GenAI</option>
                  <option value="Enterprise Software">Enterprise Software / SaaS</option>
                  <option value="DeepTech">DeepTech / Defense Tech / Space</option>
                  <option value="FinTech">FinTech / Payments</option>
                  <option value="Developer Tools">Developer Tools / Infra</option>
                  <option value="Marketplaces">Marketplaces / Platforms</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Financing Stage</label>
                <select
                  value={matcherStage}
                  onChange={e => setMatcherStage(e.target.value)}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="pre_seed">Pre-Seed ($500K–$2M)</option>
                  <option value="seed">Seed ($1M–$5M)</option>
                  <option value="series_a">Series A ($5M–$20M)</option>
                  <option value="series_b">Series B ($20M–$50M)</option>
                  <option value="growth">Growth Equity ($50M+)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
                  <span>Target Ask</span>
                  <span className="font-mono text-emerald-400">${(matcherAmount / 1e6).toFixed(1)}M USD</span>
                </div>
                <input
                  type="range"
                  min={1000000}
                  max={100000000}
                  step={1000000}
                  value={matcherAmount}
                  onChange={e => setMatcherAmount(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Geographic Anchor</label>
                <select
                  value={matcherCountry}
                  onChange={e => setMatcherCountry(e.target.value)}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="CA">Ontario / Canada 🇨🇦 (Priority domestic mandate)</option>
                  <option value="US">North America / US Cross-Border</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                Ranked Investor Fit Scores ({matches.length})
              </h3>
              {matchingLoading && (
                <span className="text-xs text-indigo-400 animate-pulse font-medium">Recalculating...</span>
              )}
            </div>

            <div className="space-y-4">
              {matches.map((match, idx) => {
                const isHighFit = match.overallScore >= 80;
                return (
                  <div
                    key={match.firmId}
                    className="glass-panel p-5 rounded-2xl border border-white/10 space-y-3 hover:border-indigo-500/40 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-xs flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <h4 className="text-base font-bold text-white">{match.firmName}</h4>
                          <span className="text-xs text-slate-400">({match.headquarters.city}, {match.headquarters.country})</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Typical check: ${((match.typicalCheck.min || 0) / 1e6).toFixed(1)}M–${((match.typicalCheck.max || 0) / 1e6).toFixed(1)}M
                        </p>
                      </div>

                      {/* Overall Fit Score Badge */}
                      <div className="text-right">
                        <div
                          className={`text-2xl font-mono font-bold ${
                            isHighFit ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {match.overallScore}%
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">
                          {isHighFit ? 'Strong Fit' : 'Moderate Fit'}
                        </span>
                      </div>
                    </div>

                    {/* Component Score Bars */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      <div className="p-2 rounded-lg bg-slate-950/60 border border-white/5 text-[11px]">
                        <span className="text-slate-400 block">Sector</span>
                        <span className="font-mono font-bold text-white">{match.components.sectorFit}%</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-950/60 border border-white/5 text-[11px]">
                        <span className="text-slate-400 block">Stage</span>
                        <span className="font-mono font-bold text-white">{match.components.stageFit}%</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-950/60 border border-white/5 text-[11px]">
                        <span className="text-slate-400 block">Check Size</span>
                        <span className="font-mono font-bold text-white">{match.components.checkSizeFit}%</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-950/60 border border-white/5 text-[11px]">
                        <span className="text-slate-400 block">Geography</span>
                        <span className="font-mono font-bold text-white">{match.components.geographyFit}%</span>
                      </div>
                    </div>

                    {/* Reasons List */}
                    {match.reasons.length > 0 && (
                      <ul className="text-xs text-slate-300 space-y-1 pt-1">
                        {match.reasons.map((r, i) => (
                          <li key={i} className="flex items-center gap-1.5 text-slate-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: SYNDICATES & LPS */}
      {activeSubTab === 'syndication' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Limited Partners & Commitments */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Institutional Limited Partners (LPs)</h3>
              </div>
              <p className="text-xs text-slate-400">
                Sovereign and pension funds providing anchor capital to Canadian venture managers
              </p>

              <div className="space-y-3 pt-2">
                {syndication?.commitments?.map(c => (
                  <div key={c.id} className="p-4 rounded-xl bg-slate-950/70 border border-white/5 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white">{c.lp_name}</h4>
                        <span className="text-xs text-slate-400">{c.lp_type} ({c.lp_country})</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        ${(c.commitment_amount / 1e6).toFixed(0)}M {c.currency}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 flex items-center gap-1.5">
                      <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Committed to <strong>{c.fund_name}</strong> ({c.firm_name})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Co-investor Relationships */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
              <div className="flex items-center gap-2">
                <Network className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Syndication Ties & Co-Investors</h3>
              </div>
              <p className="text-xs text-slate-400">
                Verified collaborative investment ties across portfolio rounds
              </p>

              <div className="space-y-3 pt-2">
                {syndication?.relationships?.map(rel => (
                  <div key={rel.id} className="p-4 rounded-xl bg-slate-950/70 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{rel.from_name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/60 uppercase">
                        {rel.relationship_type}
                      </span>
                      <span className="font-bold text-white">{rel.to_name}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                      <span>Syndicate Strength: {(rel.strength * 100).toFixed(0)}%</span>
                      <span>{rel.first_observed} — {rel.last_observed}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Notable Exits Banner */}
          <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
            <h3 className="text-base font-bold text-white">Notable IPO Exits in Tracked Portfolio</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {syndication?.exits?.map(exit => (
                <div key={exit.id} className="p-4 rounded-xl bg-slate-950/70 border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-white">{exit.company_name}</span>
                    <p className="text-xs text-slate-400">{exit.exchange}: {exit.ticker} (IPO {exit.completion_date})</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-mono font-bold text-emerald-400">
                      ${((exit.market_cap_at_ipo || 0) / 1e9).toFixed(1)}B
                    </span>
                    <p className="text-[11px] text-slate-400">Market Cap at IPO</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 6: SIGNALS & PROVENANCE */}
      {activeSubTab === 'signals' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Market Telemetry & Activity Signals</h3>
                <p className="text-xs text-slate-400">Observed events from regulatory filings, press releases, and news</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-indigo-950 text-indigo-300 border border-indigo-700/60">
                Audited Feed
              </span>
            </div>

            <div className="space-y-4 pt-2">
              {signals.map(sig => (
                <div key={sig.id} className="p-4 rounded-xl bg-slate-950/70 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{sig.firm_name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/60 uppercase">
                        {sig.signal_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(sig.observed_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{sig.description}</p>
                  <div className="text-[11px] text-indigo-400 font-medium">
                    Signal Strength Confidence: {((sig.signal_strength || 0) * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
