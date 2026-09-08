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
  CheckCircle2
} from 'lucide-react';
import { ActiveTab, GeographySummary } from '../types/index.js';
import { CitySearch } from './CitySearch.js';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  selectedCityId: string;
  onSelectCity: (city: GeographySummary) => void;
  isCompareMode: boolean;
  onToggleCompareMode: () => void;
}

const TABS: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
  { id: 'overview', label: 'Overview', icon: <Building2 className="w-3.5 h-3.5" /> },
  { id: 'city_intelligence', label: 'City Intelligence', icon: <BarChart3 className="w-3.5 h-3.5" /> },
  { id: 'demographics', label: 'Demographics', icon: <Users className="w-3.5 h-3.5" /> },
  { id: 'financial_profile', label: 'Financial Profile', icon: <Wallet className="w-3.5 h-3.5" /> },
  { id: 'consumer_spending', label: 'Consumer Spending', icon: <ShoppingBag className="w-3.5 h-3.5" /> },
  { id: 'workforce', label: 'Workforce Lens', icon: <Briefcase className="w-3.5 h-3.5" /> },
  { id: 'business_landscape', label: 'Business Landscape', icon: <Store className="w-3.5 h-3.5" /> },
  { id: 'municipality_finances', label: 'Municipality Finances', icon: <Landmark className="w-3.5 h-3.5" /> },
  { id: 'city_rankings', label: 'City Rankings', icon: <Trophy className="w-3.5 h-3.5" /> },
  { id: 'opportunity_lab', label: 'Opportunity Lab', icon: <Target className="w-3.5 h-3.5" /> },
  { id: 'competition', label: 'Competition', icon: <Compass className="w-3.5 h-3.5" /> },
  { id: 'business_listings', label: 'Sales & Listings', icon: <FileText className="w-3.5 h-3.5" /> },
  { id: 'outliers', label: 'Outliers', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  { id: 'data_explorer', label: 'Data Explorer', icon: <Database className="w-3.5 h-3.5" /> },
  { id: 'methodology_sources', label: 'Methodology & Sources', icon: <BookOpen className="w-3.5 h-3.5" /> },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  selectedCityId,
  onSelectCity,
  isCompareMode,
  onToggleCompareMode
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-500/20">
            ON
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 tracking-tight flex items-center gap-2">
              <span>Ontario Economic & Business Intelligence</span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 uppercase tracking-wide">
                Production Engine
              </span>
            </h1>
            <p className="text-xs text-slate-300">
              Authoritative Market Selection & Location Intelligence Platform
            </p>
          </div>
        </div>

        {/* Center: City Search */}
        <div className="flex-1 max-w-md mx-auto">
          <CitySearch selectedCityId={selectedCityId} onSelectCity={onSelectCity} />
        </div>

        {/* Right: Actions & Zero-Round-Trip Indicator */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onToggleCompareMode}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              isCompareMode 
                ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/20'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-white/10 hover:border-white/20'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Compare Cities
          </button>

          <div 
            title="Local Persistent Operational Store Active (0 unnecessary upstream API round-trips during normal reads)"
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900/90 text-emerald-300 border border-emerald-800/60"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>DB-First: 0 Round-Trips</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 overflow-x-auto no-scrollbar py-1 text-xs">
          {TABS.map(t => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onTabChange(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-slate-800 text-indigo-400 border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
