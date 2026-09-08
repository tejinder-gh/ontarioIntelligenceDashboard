import React from 'react';
import { 
  Building2, 
  BarChart3, 
  Users, 
  Wallet, 
  ShoppingBag, 
  Briefcase, 
  Store, 
  Landmark, 
  Trophy, 
  Target, 
  Compass, 
  FileText, 
  AlertTriangle, 
  Database, 
  BookOpen,
  Layers,
  CheckCircle2,
  Sparkles,
  MapPin,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { ActiveTab, GeographySummary } from '../types/index.js';
import { CitySearch } from './CitySearch.js';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  selectedCityId: string;
  onSelectCity: (city: GeographySummary) => void;
  isCompareMode: boolean;
  onToggleCompareMode: () => void;
  compareCount?: number;
}

interface NavCategory {
  title: string;
  items: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ReactNode;
    badge?: string;
  }>;
}

const NAV_CATEGORIES: NavCategory[] = [
  {
    title: 'Executive & Strategy',
    items: [
      { id: 'overview', label: 'Executive Overview', icon: <Building2 className="w-4 h-4" /> },
      { id: 'city_intelligence', label: 'City Intelligence', icon: <BarChart3 className="w-4 h-4" /> },
      { id: 'city_rankings', label: 'City Rankings League', icon: <Trophy className="w-4 h-4" /> }
    ]
  },
  {
    title: 'Market Opportunity & Fit',
    items: [
      { id: 'opportunity_lab', label: 'Opportunity Lab', icon: <Target className="w-4 h-4" />, badge: 'AI Engine' },
      { id: 'competition', label: 'Competition Analysis', icon: <Compass className="w-4 h-4" /> },
      { id: 'business_listings', label: 'Sales & Listings', icon: <FileText className="w-4 h-4" /> }
    ]
  },
  {
    title: 'Household & Economics',
    items: [
      { id: 'demographics', label: 'Demographics Lens', icon: <Users className="w-4 h-4" /> },
      { id: 'financial_profile', label: 'Financial Profile & Wealth', icon: <Wallet className="w-4 h-4" />, badge: 'Multi-City' },
      { id: 'consumer_spending', label: 'Consumer Spending Habits', icon: <ShoppingBag className="w-4 h-4" /> },
      { id: 'workforce', label: 'Workforce & Occupations', icon: <Briefcase className="w-4 h-4" /> }
    ]
  },
  {
    title: 'Commercial & Municipal',
    items: [
      { id: 'business_landscape', label: 'Business Landscape', icon: <Store className="w-4 h-4" /> },
      { id: 'municipality_finances', label: 'Municipality Finances', icon: <Landmark className="w-4 h-4" /> }
    ]
  },
  {
    title: 'Analytics & Integrity',
    items: [
      { id: 'outliers', label: 'Statistical Outliers', icon: <AlertTriangle className="w-4 h-4" />, badge: 'Z-Score' },
      { id: 'data_explorer', label: 'SQL Data Explorer', icon: <Database className="w-4 h-4" /> },
      { id: 'methodology_sources', label: 'Methodology & Audits', icon: <BookOpen className="w-4 h-4" /> }
    ]
  }
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  selectedCityId,
  onSelectCity,
  isCompareMode,
  onToggleCompareMode,
  compareCount = 3
}) => {
  return (
    <aside className="w-72 liquid-glass-sidebar flex flex-col shrink-0 h-screen sticky top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-800 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-600/30">
            ON
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-1.5">
              <span>Ontario Intel</span>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-950/90 text-indigo-300 border border-indigo-700/60 uppercase">
                v2.0
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-normal">
              Economic & Market Intelligence
            </p>
          </div>
        </div>
      </div>

      {/* Quick City Search & Compare Bar */}
      <div className="p-3 border-b border-white/10 space-y-2">
        <CitySearch selectedCityId={selectedCityId} onSelectCity={onSelectCity} />

        <button
          type="button"
          onClick={onToggleCompareMode}
          className={`w-full min-h-[38px] flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${
            isCompareMode
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/25'
              : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-700/80'
          }`}
          aria-pressed={isCompareMode}
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Multi-City Comparison</span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-950/90 text-indigo-300 border border-slate-700">
            {compareCount} Active
          </span>
        </button>
      </div>

      {/* Navigation Links Grouped by Category */}
      <nav 
        aria-label="Ontario Economic Intelligence Navigation"
        className="flex-1 overflow-y-auto px-3 py-3 space-y-5 no-scrollbar"
      >
        {NAV_CATEGORIES.map(category => (
          <div key={category.title} className="space-y-1">
            <div className="px-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              {category.title}
            </div>
            {category.items.map(item => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full min-h-[36px] flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all group ${
                    isActive
                      ? 'bg-indigo-600/20 text-white border border-indigo-500/50 shadow-sm font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className={`${isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'}`}>
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className={`text-xs px-2 py-0.5 rounded font-mono font-semibold ${
                      isActive 
                        ? 'bg-indigo-500 text-white' 
                        : 'bg-slate-800/90 text-slate-300 group-hover:text-white border border-slate-700/60'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer / System Status */}
      <div className="p-3 border-t border-white/10 bg-slate-950/70 text-xs space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Instant Offline Cache
          </span>
          <span className="font-mono text-xs text-slate-400">Port 3001</span>
        </div>
        <div className="text-xs text-slate-400 flex items-center justify-between">
          <span>Verified StatCan 33-10-1097</span>
          <span className="text-indigo-400 font-semibold font-mono">444 CSDs</span>
        </div>
      </div>
    </aside>
  );
};
