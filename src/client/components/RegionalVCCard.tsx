import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Building2,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Zap,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { fetchRegionalVC, fetchVCSummary, type VCSummaryData } from '../utils/vc-api.js';

interface RegionalVCCardProps {
  cityId: string;
  cityName: string;
  onNavigateToVC?: () => void;
}

export const RegionalVCCard: React.FC<RegionalVCCardProps> = ({
  cityId,
  cityName,
  onNavigateToVC,
}) => {
  const [data, setData] = useState<{
    city: string;
    cleanCity: string;
    ventureBackedCompanies: number;
    capitalRaisedUsd: number;
    roundCount: number;
    activeDomesticInvestors: number;
    topHubs: string[];
  } | null>(null);
  const [summary, setSummary] = useState<VCSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      fetchRegionalVC(cityName),
      fetchVCSummary().catch(() => null),
    ])
      .then(([regionalRes, sumRes]) => {
        if (!isMounted) return;
        setData(regionalRes);
        setSummary(sumRes);
        setLoading(false);
      })
      .catch(err => {
        if (!isMounted) return;
        console.error('Error fetching regional VC card data:', err);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [cityName]);

  const cleanName = cityName.replace(/^(CSD_|City of |Town of |Municipality of )/i, '').trim();
  const isMajorHub = ['Toronto', 'Waterloo', 'Ottawa', 'Hamilton', 'Kitchener', 'Cambridge', 'London'].some(h =>
    cleanName.toLowerCase().includes(h.toLowerCase())
  );

  const handleGoToVC = () => {
    if (onNavigateToVC) {
      onNavigateToVC();
    } else {
      window.history.pushState(null, '', '/venture-capital');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-indigo-900/40 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/30 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Venture Capital & Scale-Up Corridor Ecosystem
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
                Live Graph
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Institutional venture access, tech hub connectivity, and growth capital availability for {cleanName}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoToVC}
          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 active:scale-95 shrink-0"
        >
          <span>Explore VC Graph</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/5 space-y-1">
          <span className="text-[11px] font-medium text-slate-400 block">Ontario Corridor Funding</span>
          <div className="text-lg sm:text-xl font-mono font-bold text-emerald-400">
            ${((summary?.canadianFundingRaisedUsd || 500000000) / 1e6).toFixed(0)}M+
          </div>
          <span className="text-[10px] text-slate-400 block">Anchor deals (Cohere $500M)</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/5 space-y-1">
          <span className="text-[11px] font-medium text-slate-400 block">Active Domestic VCs</span>
          <div className="text-lg sm:text-xl font-mono font-bold text-white">
            {data?.activeDomesticInvestors || 3} Managers
          </div>
          <span className="text-[10px] text-indigo-300 block">Inovia, Georgian, Version One</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/5 space-y-1">
          <span className="text-[11px] font-medium text-slate-400 block">Total Syndicate AUM</span>
          <div className="text-lg sm:text-xl font-mono font-bold text-white">
            ${((summary?.totalAumUsd || 175000000000) / 1e9).toFixed(1)}B
          </div>
          <span className="text-[10px] text-slate-400 block">US-Canada co-investors</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/5 space-y-1">
          <span className="text-[11px] font-medium text-slate-400 block">Corridor Position</span>
          <div className="text-lg sm:text-xl font-mono font-bold text-amber-400">
            {isMajorHub ? 'Tier-1 Hub' : 'Catchment'}
          </div>
          <span className="text-[10px] text-slate-400 block">Innovation highway access</span>
        </div>
      </div>

      {/* Strategic Insight Box */}
      <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 text-xs text-slate-300 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-white">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>Regional Innovation & Capital Availability Context:</span>
        </div>
        <p className="leading-relaxed text-slate-300">
          Startups and technology businesses in <strong>{cleanName}</strong> operate within the greater Ontario innovation network, with direct syndication pathways to Canadian growth champions (Inovia, Georgian) and Tier-1 US funds (Sequoia, a16z). Institutional pension capital from <strong>CDPQ ($552B AUM)</strong> and <strong>BDC Capital ($6B)</strong> actively backs local growth vehicles.
        </p>

        <div className="pt-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400">Target Sectors in Corridor:</span>
          {['Artificial Intelligence', 'Enterprise SaaS', 'FinTech', 'DeepTech & Robotics'].map(sec => (
            <span
              key={sec}
              className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-indigo-950/80 text-indigo-300 border border-indigo-800/40"
            >
              {sec}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
