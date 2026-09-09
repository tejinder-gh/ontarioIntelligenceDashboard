import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar.js';
import { ActiveTab, GeographySummary } from './types/index.js';
import { OverviewView } from './views/OverviewView.js';
import { CityIntelligenceView } from './views/CityIntelligenceView.js';
import { DemographicsView } from './views/DemographicsView.js';
import { FinancialProfileView } from './views/FinancialProfileView.js';
import { ConsumerSpendingView } from './views/ConsumerSpendingView.js';
import { WorkforceView } from './views/WorkforceView.js';
import { BusinessLandscapeView } from './views/BusinessLandscapeView.js';
import { MunicipalityFinancesView } from './views/MunicipalityFinancesView.js';
import { CityRankingsView } from './views/CityRankingsView.js';
import { OpportunityLabView } from './views/OpportunityLabView.js';
import { CompetitionView } from './views/CompetitionView.js';
import { BusinessListingsView } from './views/BusinessListingsView.js';
import { OutliersView } from './views/OutliersView.js';
import { DataExplorerView } from './views/DataExplorerView.js';
import { MethodologySourcesView } from './views/MethodologySourcesView.js';
import { 
  X, 
  Layers, 
  Plus, 
  CheckCircle2, 
  ShieldCheck, 
  Database,
  Building2,
  TrendingUp,
  DollarSign,
  Scale,
  Search,
  MapPin,
  Menu,
  Bell
} from 'lucide-react';
import { AlertSubscriptionModal } from './components/AlertSubscriptionModal.js';

const TAB_TO_SLUG: Record<ActiveTab, string> = {
  overview: 'overview',
  city_intelligence: 'intelligence',
  demographics: 'demographics',
  financial_profile: 'finances',
  consumer_spending: 'spending',
  workforce: 'workforce',
  business_landscape: 'business',
  municipality_finances: 'muni-finances',
  city_rankings: 'rankings',
  opportunity_lab: 'opportunity',
  competition: 'competition',
  business_listings: 'listings',
  outliers: 'outliers',
  data_explorer: 'explorer',
  methodology_sources: 'sources'
};

const SLUG_TO_TAB: Record<string, ActiveTab> = {
  overview: 'overview',
  intelligence: 'city_intelligence',
  city: 'city_intelligence',
  demographics: 'demographics',
  finances: 'financial_profile',
  financial: 'financial_profile',
  wealth: 'financial_profile',
  spending: 'consumer_spending',
  consumer: 'consumer_spending',
  workforce: 'workforce',
  labor: 'workforce',
  business: 'business_landscape',
  landscape: 'business_landscape',
  'muni-finances': 'municipality_finances',
  'muni-budget': 'municipality_finances',
  municipal: 'municipality_finances',
  rankings: 'city_rankings',
  opportunity: 'opportunity_lab',
  lab: 'opportunity_lab',
  competition: 'competition',
  listings: 'business_listings',
  sales: 'business_listings',
  outliers: 'outliers',
  explorer: 'data_explorer',
  sources: 'methodology_sources',
  methodology: 'methodology_sources'
};

const isCityTab = (tab: ActiveTab) => [
  'overview',
  'city_intelligence',
  'demographics',
  'financial_profile',
  'consumer_spending',
  'workforce',
  'business_landscape',
  'municipality_finances',
  'competition'
].includes(tab);

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [selectedCityId, setSelectedCityId] = useState<string>('CSD_burlington');
  const [selectedCityName, setSelectedCityName] = useState<string>('Burlington');
  const [isCompareMode, setIsCompareMode] = useState<boolean>(false);
  const [compareIds, setCompareIds] = useState<string[]>(['CSD_burlington', 'CSD_oakville', 'CSD_milton']);
  const [compareData, setCompareData] = useState<any[]>([]);
  const [loadingCompare, setLoadingCompare] = useState<boolean>(false);
  
  // Alert Subscription Modal State
  const [isAlertModalOpen, setIsAlertModalOpen] = useState<boolean>(false);
  const [pendingAlertsCount, setPendingAlertsCount] = useState<number>(0);

  // Search within Compare Modal
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [modalSearchResults, setModalSearchResults] = useState<any[]>([]);
  const [modalSearching, setModalSearching] = useState(false);

  // Mobile sidebar state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Cross-Module Drill-Down State (Requirement 33)
  const [drillDownOptions, setDrillDownOptions] = useState<{ category?: string; community?: string; ageCohort?: string }>({});

  // Helper to build deep-link URL (Requirement 40)
  const buildUrl = (tab: ActiveTab, cityName: string, options?: { category?: string; community?: string; ageCohort?: string }) => {
    const citySlug = cityName.toLowerCase().replace(/\s+/g, '-');
    if (tab === 'competition' && options?.category) {
      const catSlug = options.category.replace(/_/g, '-');
      return `/competition/${citySlug}/${catSlug}`;
    }
    if (isCityTab(tab)) {
      return `/city/${citySlug}/${TAB_TO_SLUG[tab]}`;
    }
    return `/${TAB_TO_SLUG[tab]}`;
  };

  // Deep-linking programmatic navigation with cross-module drill-down parameters
  const navigateTo = (
    tab: ActiveTab, 
    cityId?: string, 
    cityName?: string, 
    options?: { category?: string; community?: string; ageCohort?: string }
  ) => {
    setActiveTab(tab);
    if (cityId) setSelectedCityId(cityId);
    if (cityName) setSelectedCityName(cityName);
    if (options) {
      setDrillDownOptions(options);
    } else {
      setDrillDownOptions({});
    }
    setMobileSidebarOpen(false);

    const targetCity = cityName || selectedCityName;
    const newPath = buildUrl(tab, targetCity, options);
    if (window.location.pathname !== newPath) {
      window.history.pushState({ tab, cityId: cityId || selectedCityId, cityName: targetCity, options }, '', newPath);
    }
  };

  const handleSelectCity = (city: GeographySummary) => {
    setSelectedCityId(city.id);
    setSelectedCityName(city.name);
    if (isCityTab(activeTab)) {
      const newPath = buildUrl(activeTab, city.name);
      if (window.location.pathname !== newPath) {
        window.history.pushState({ tab: activeTab, cityId: city.id, cityName: city.name }, '', newPath);
      }
    }
  };

  // URL synchronization & back/forward history listener (Requirement 40)
  useEffect(() => {
    const handlePopState = () => {
      const pathname = window.location.pathname;
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length === 0) return;

      if (parts[0] === 'city' && parts.length >= 2) {
        const cityNameSlug = parts[1];
        const tabSlug = parts[2] || 'overview';
        const matchedTab = SLUG_TO_TAB[tabSlug] || 'overview';
        setActiveTab(matchedTab);

        // Fetch matched geography by name
        fetch(`/api/geographies?q=${cityNameSlug}`)
          .then(res => res.json())
          .then(json => {
            if (json.data && json.data.length > 0) {
              const matched = json.data[0];
              setSelectedCityId(matched.id);
              setSelectedCityName(matched.name);
            }
          })
          .catch(() => {});
        return;
      }

      if (parts[0] === 'competition' && parts.length >= 2) {
        setActiveTab('competition');
        if (parts.length >= 3) {
          setDrillDownOptions({ category: parts[2].replace(/-/g, '_') });
        }
        fetch(`/api/geographies?q=${parts[1]}`)
          .then(res => res.json())
          .then(json => {
            if (json.data && json.data.length > 0) {
              setSelectedCityId(json.data[0].id);
              setSelectedCityName(json.data[0].name);
            }
          })
          .catch(() => {});
        return;
      }

      const matchedTab = SLUG_TO_TAB[parts[0]];
      if (matchedTab) {
        setActiveTab(matchedTab);
      }
    };

    handlePopState();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync city name if ID changes externally
  useEffect(() => {
    fetch(`/api/geographies?q=${selectedCityId.replace('CSD_', '')}`)
      .then(res => res.json())
      .then(json => {
        if (json.data && json.data.length > 0) {
          const match = json.data.find((g: any) => g.id === selectedCityId) || json.data[0];
          setSelectedCityName(match.name);
        }
      })
      .catch(() => {});
  }, [selectedCityId]);

  // Fetch pending notification count for alerts badge
  useEffect(() => {
    fetch('/api/alerts/notifications/pending')
      .then(res => res.json())
      .then(d => {
        if (d.total !== undefined) setPendingAlertsCount(d.total);
      })
      .catch(() => {});
  }, [isAlertModalOpen]);

  // Multi-City Comparison Fetcher
  useEffect(() => {
    if (isCompareMode && compareIds.length > 0) {
      setLoadingCompare(true);
      fetch(`/api/geographies/compare?ids=${compareIds.join(',')}`)
        .then(res => res.json())
        .then(d => {
          setCompareData(d.comparison || []);
          setLoadingCompare(false);
        })
        .catch(err => {
          console.error('Error fetching comparison:', err);
          setLoadingCompare(false);
        });
    }
  }, [isCompareMode, compareIds]);

  // Handle Search in Comparison Modal
  useEffect(() => {
    if (!modalSearchQuery.trim()) {
      setModalSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setModalSearching(true);
      fetch(`/api/geographies?q=${encodeURIComponent(modalSearchQuery)}&limit=8`)
        .then(res => res.json())
        .then(json => {
          setModalSearchResults(json.data || []);
          setModalSearching(false);
        })
        .catch(() => setModalSearching(false));
    }, 200);
    return () => clearTimeout(timer);
  }, [modalSearchQuery]);

  // Keyboard accessibility: Dismiss comparison modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCompareMode) {
        setIsCompareMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCompareMode]);

  const toggleCompareCity = (cityId: string) => {
    if (compareIds.includes(cityId)) {
      if (compareIds.length > 1) {
        setCompareIds(compareIds.filter(id => id !== cityId));
      }
    } else {
      if (compareIds.length < 8) {
        setCompareIds([...compareIds, cityId]);
      }
    }
  };

  const addModalCity = (cityId: string) => {
    if (!compareIds.includes(cityId)) {
      if (compareIds.length < 8) {
        setCompareIds([...compareIds, cityId]);
      } else {
        setCompareIds([...compareIds.slice(1), cityId]);
      }
    }
    setModalSearchQuery('');
    setModalSearchResults([]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans selection:bg-indigo-500 selection:text-white">
      {/* Vertical Navigation Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 lg:static lg:block transition-transform duration-300 ${
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <Sidebar
          activeTab={activeTab}
          onTabChange={(t) => {
            navigateTo(t);
          }}
          selectedCityId={selectedCityId}
          onSelectCity={handleSelectCity}
          isCompareMode={isCompareMode}
          onToggleCompareMode={() => setIsCompareMode(!isCompareMode)}
          compareCount={compareIds.length}
        />
      </div>

      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-slate-950/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Utility Header (Apple HIG Liquid Glass) */}
        <header className="sticky top-0 z-20 liquid-glass-header px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 min-h-[38px] min-w-[38px] rounded-lg text-slate-300 hover:text-white hover:bg-slate-900/80 border border-slate-800 flex items-center justify-center"
              aria-label="Open navigation sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Active City Pill & Breadcrumb */}
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-950/90 text-indigo-300 border border-indigo-700/60 shadow-sm">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                <span>Active: <strong className="text-white">{selectedCityName}</strong></span>
              </span>
              <span className="hidden md:inline text-slate-500 text-xs">•</span>
              <span className="text-xs text-slate-300 capitalize font-medium">
                {activeTab.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Intelligence Alerts Button with Unread Badge */}
            <button
              type="button"
              onClick={() => setIsAlertModalOpen(true)}
              className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 transition-colors shadow-sm relative"
              aria-label="Open intelligence alerts and watches"
            >
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span>Alerts</span>
              {pendingAlertsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-950 font-extrabold">
                  {pendingAlertsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsCompareMode(true)}
              className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 transition-colors shadow-sm"
              aria-haspopup="dialog"
              aria-expanded={isCompareMode}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Compare ({compareIds.length})</span>
            </button>

            <div 
              title="Verified provincial and municipal data with instant caching"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900/90 text-emerald-300 border border-emerald-800/60"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verified StatCan Data • Instant Cache</span>
            </div>
          </div>
        </header>

        {/* View Content Workspace */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'overview' && (
            <OverviewView 
              cityId={selectedCityId} 
              onNavigateTab={(t, opts) => navigateTo(t, undefined, undefined, opts)} 
              onSelectCity={(id) => navigateTo('overview', id)}
            />
          )}
          {activeTab === 'city_intelligence' && (
            <CityIntelligenceView 
              cityId={selectedCityId} 
              onSelectCity={(id) => navigateTo('city_intelligence', id)} 
            />
          )}
          {activeTab === 'demographics' && (
            <DemographicsView 
              cityId={selectedCityId} 
              initialCohort={drillDownOptions.ageCohort}
              initialCommunity={drillDownOptions.community}
            />
          )}
          {activeTab === 'financial_profile' && (
            <FinancialProfileView cityId={selectedCityId} />
          )}
          {activeTab === 'consumer_spending' && (
            <ConsumerSpendingView cityId={selectedCityId} />
          )}
          {activeTab === 'workforce' && (
            <WorkforceView cityId={selectedCityId} />
          )}
          {activeTab === 'business_landscape' && (
            <BusinessLandscapeView cityId={selectedCityId} />
          )}
          {activeTab === 'municipality_finances' && (
            <MunicipalityFinancesView 
              cityId={selectedCityId} 
              onSelectCity={(id) => navigateTo('municipality_finances', id)}
            />
          )}
          {activeTab === 'city_rankings' && (
            <CityRankingsView onSelectCity={(id) => navigateTo('overview', id)} />
          )}
          {activeTab === 'opportunity_lab' && (
            <OpportunityLabView cityId={selectedCityId} onSelectCity={(id) => navigateTo('overview', id)} />
          )}
          {activeTab === 'competition' && (
            <CompetitionView 
              cityId={selectedCityId} 
              initialCategory={drillDownOptions.category}
            />
          )}
          {activeTab === 'business_listings' && (
            <BusinessListingsView cityId={selectedCityId} />
          )}
          {activeTab === 'outliers' && (
            <OutliersView onSelectCity={(id) => navigateTo('overview', id)} />
          )}
          {activeTab === 'data_explorer' && (
            <DataExplorerView cityId={selectedCityId} />
          )}
          {activeTab === 'methodology_sources' && (
            <MethodologySourcesView />
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800/80 bg-slate-950/90 py-6 text-xs text-slate-400 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="font-semibold text-slate-200">Ontario Economic & Business Intelligence Platform</span>
              <span>•</span>
              <span>Audited StatCan Table 33-10-1097-01</span>
              <span>•</span>
              <span>2021 Census of Population</span>
              <span>•</span>
              <span>Ontario FIR</span>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified StatCan 2021–2025 Data
              </span>
              <span className="text-slate-300">Instant Offline Cache</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Multi-City Comparison Modal / Drawer (Allows ANY Ontario Municipality) */}
      {isCompareMode && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsCompareMode(false)}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="compare-modal-title"
            className="liquid-glass-modal rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-white/10 flex items-center justify-between sticky top-0 bg-slate-900/90 backdrop-blur-md z-10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-950/90 text-indigo-400 border border-indigo-700/60">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="compare-modal-title" className="text-lg font-bold text-white tracking-tight">
                    Multi-City Comparative Economic Benchmarking
                  </h3>
                  <p className="text-xs text-slate-300">
                    Benchmark any of Ontario&apos;s 444 municipalities side-by-side.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCompareMode(false)}
                className="p-2 min-h-[36px] min-w-[36px] rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center"
                aria-label="Close Comparison Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Dynamic City Search Bar in Modal */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-white/10 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-slate-200">
                    Add Any Municipality to Comparison ({compareIds.length} of 8 max):
                  </span>
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-indigo-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      aria-label="Search any municipality to add to comparison"
                      value={modalSearchQuery}
                      onChange={e => setModalSearchQuery(e.target.value)}
                      placeholder="Search any city (e.g. Waterloo, Guelph, Barrie)..."
                      className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                    />
                    {modalSearching && (
                      <span className="absolute right-3 top-2.5 text-xs text-indigo-300 font-medium animate-pulse">Searching...</span>
                    )}

                    {/* Search Results Dropdown */}
                    {modalSearchResults.length > 0 && (
                      <div className="absolute z-20 mt-1.5 w-full bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto divide-y divide-white/5">
                        {modalSearchResults.map((city: any) => (
                          <button
                            key={city.id}
                            type="button"
                            onClick={() => addModalCity(city.id)}
                            className="w-full px-3.5 py-2 text-left flex items-center justify-between hover:bg-white/5 text-xs text-white transition-colors"
                          >
                            <div>
                              <span className="font-semibold">{city.name}</span>
                              <span className="text-xs text-slate-400 ml-1.5">({city.csd_type})</span>
                            </div>
                            <span className="text-xs text-indigo-400 font-semibold">+ Add</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Active Comparison City Chips */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {compareData.map(c => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-950/80 text-indigo-200 border border-indigo-700/60 shadow-sm"
                    >
                      <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{c.name}</span>
                      {compareIds.length > 1 && (
                        <button
                          type="button"
                          onClick={() => toggleCompareCity(c.id)}
                          className="hover:text-rose-400 p-0.5 rounded transition-colors"
                          title={`Remove ${c.name}`}
                          aria-label={`Remove ${c.name} from comparison`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>

                {/* Quick Add Top Peers */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-slate-300">
                  <span className="font-medium text-slate-400">Quick Add:</span>
                  {[
                    { id: 'CSD_oakville', name: 'Oakville' },
                    { id: 'CSD_milton', name: 'Milton' },
                    { id: 'CSD_mississauga', name: 'Mississauga' },
                    { id: 'CSD_waterloo', name: 'Waterloo' },
                    { id: 'CSD_guelph', name: 'Guelph' }
                  ].filter(p => !compareIds.includes(p.id)).map(city => (
                    <button
                      key={city.id}
                      type="button"
                      onClick={() => toggleCompareCity(city.id)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/5 transition-colors flex items-center gap-1 text-xs"
                    >
                      <Plus className="w-3 h-3" />
                      {city.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Side-by-Side Comparison Table */}
              {loadingCompare ? (
                <div className="p-12 text-center text-slate-300 animate-pulse text-xs">
                  Querying multi-city comparative observations...
                </div>
              ) : (
                <div className="overflow-x-auto border border-white/10 rounded-2xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950/90 text-slate-300 uppercase tracking-wider border-b border-white/10 font-semibold">
                      <tr>
                        <th className="py-3 px-4 w-48">Economic Indicator</th>
                        {compareData.map(c => (
                          <th key={c.id} className="py-3 px-4 font-bold text-white text-right">
                            {c.name}
                            <span className="block text-xs text-slate-400 font-normal">{c.csd_type || 'City'}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-200">
                      <tr>
                        <td className="py-3 px-4 font-semibold text-white">Population (2021)</td>
                        {compareData.map(c => (
                          <td key={c.id} className="py-3 px-4 text-right font-mono font-bold text-white">
                            {Number(c.population_2021).toLocaleString()}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-semibold text-white">5-Year Growth Rate</td>
                        {compareData.map(c => (
                          <td key={c.id} className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                            {c.population_growth_pct > 0 ? `+${c.population_growth_pct}%` : `${c.population_growth_pct}%`}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-semibold text-white">Share of Ontario Pop</td>
                        {compareData.map(c => (
                          <td key={c.id} className="py-3 px-4 text-right font-mono text-indigo-300 font-semibold">
                            {c.ontario_pop_share_pct}%
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-semibold text-white">Median Household Income</td>
                        {compareData.map(c => (
                          <td key={c.id} className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                            ${Number(c.median_income).toLocaleString()}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-semibold text-white">Median Monthly Rent</td>
                        {compareData.map(c => (
                          <td key={c.id} className="py-3 px-4 text-right font-mono text-slate-200">
                            ${Number(c.median_rent).toLocaleString()} / mo
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-semibold text-white">Total Business Establishments</td>
                        {compareData.map(c => (
                          <td key={c.id} className="py-3 px-4 text-right font-mono text-indigo-300 font-semibold">
                            {Number(c.total_businesses).toLocaleString()}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-semibold text-white">Business Density (per 1k pop)</td>
                        {compareData.map(c => (
                          <td key={c.id} className="py-3 px-4 text-right font-mono text-amber-300 font-semibold">
                            {c.biz_density}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-semibold text-white">Unemployment Rate</td>
                        {compareData.map(c => (
                          <td key={c.id} className="py-3 px-4 text-right font-mono text-slate-300">
                            {c.unemp_rate}%
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-semibold text-white">Annual Municipal Budget</td>
                        {compareData.map(c => (
                          <td key={c.id} className="py-3 px-4 text-right font-mono text-slate-300">
                            ${(Number(c.operating_budget) / 1000000).toFixed(1)}M
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/10 bg-slate-900/80 flex justify-end">
              <button
                type="button"
                onClick={() => setIsCompareMode(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors min-h-[38px]"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Alert Subscription & Watch Modal */}
      <AlertSubscriptionModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        defaultCityId={selectedCityId}
        defaultCityName={selectedCityName}
      />
    </div>
  );
};
