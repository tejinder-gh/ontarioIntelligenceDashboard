import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.js';
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
  Scale
} from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [selectedCityId, setSelectedCityId] = useState<string>('CSD_burlington');
  const [isCompareMode, setIsCompareMode] = useState<boolean>(false);
  const [compareIds, setCompareIds] = useState<string[]>(['CSD_burlington', 'CSD_oakville', 'CSD_milton']);
  const [compareData, setCompareData] = useState<any[]>([]);
  const [loadingCompare, setLoadingCompare] = useState<boolean>(false);

  const handleSelectCity = (city: GeographySummary) => {
    setSelectedCityId(city.id);
  };

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

  const toggleCompareCity = (cityId: string) => {
    if (compareIds.includes(cityId)) {
      if (compareIds.length > 1) {
        setCompareIds(compareIds.filter(id => id !== cityId));
      }
    } else {
      if (compareIds.length < 5) {
        setCompareIds([...compareIds, cityId]);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedCityId={selectedCityId}
        onSelectCity={handleSelectCity}
        isCompareMode={isCompareMode}
        onToggleCompareMode={() => setIsCompareMode(!isCompareMode)}
      />

      {/* Main Workspace Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <OverviewView cityId={selectedCityId} onNavigateTab={setActiveTab} />
        )}
        {activeTab === 'city_intelligence' && (
          <CityIntelligenceView cityId={selectedCityId} />
        )}
        {activeTab === 'demographics' && (
          <DemographicsView cityId={selectedCityId} />
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
          <MunicipalityFinancesView cityId={selectedCityId} />
        )}
        {activeTab === 'city_rankings' && (
          <CityRankingsView onSelectCity={(id) => { setSelectedCityId(id); setActiveTab('overview'); }} />
        )}
        {activeTab === 'opportunity_lab' && (
          <OpportunityLabView cityId={selectedCityId} onSelectCity={(id) => { setSelectedCityId(id); setActiveTab('overview'); }} />
        )}
        {activeTab === 'competition' && (
          <CompetitionView cityId={selectedCityId} />
        )}
        {activeTab === 'business_listings' && (
          <BusinessListingsView cityId={selectedCityId} />
        )}
        {activeTab === 'outliers' && (
          <OutliersView onSelectCity={(id) => { setSelectedCityId(id); setActiveTab('overview'); }} />
        )}
        {activeTab === 'data_explorer' && (
          <DataExplorerView cityId={selectedCityId} />
        )}
        {activeTab === 'methodology_sources' && (
          <MethodologySourcesView />
        )}
      </main>

      {/* Multi-City Comparison Modal / Drawer */}
      {isCompareMode && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">
                  Multi-City Comparative Economic Benchmarking
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCompareMode(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* City Selection Chips */}
              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-2">
                  Toggle Municipalities in Comparison (Max 5):
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'CSD_burlington', name: 'Burlington' },
                    { id: 'CSD_oakville', name: 'Oakville' },
                    { id: 'CSD_milton', name: 'Milton' },
                    { id: 'CSD_toronto', name: 'Toronto' },
                    { id: 'CSD_mississauga', name: 'Mississauga' },
                    { id: 'CSD_ottawa', name: 'Ottawa' },
                    { id: 'CSD_hamilton', name: 'Hamilton' }
                  ].map(city => {
                    const isSelected = compareIds.includes(city.id);
                    return (
                      <button
                        key={city.id}
                        type="button"
                        onClick={() => toggleCompareCity(city.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white border border-indigo-500 shadow-sm'
                            : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {city.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Side-by-Side Comparison Table */}
              {loadingCompare ? (
                <div className="p-12 text-center text-slate-400 animate-pulse">
                  Querying multi-city comparative observations...
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4 w-48">Economic Indicator</th>
                        {compareData.map(c => (
                          <th key={c.id} className="py-3 px-4 font-bold text-white text-right">
                            {c.name}
                            <span className="block text-[10px] text-slate-500 font-normal">{c.csd_type || 'City'}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
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
                          <td key={c.id} className="py-3 px-4 text-right font-mono text-indigo-300">
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
                          <td key={c.id} className="py-3 px-4 text-right font-mono text-indigo-300">
                            {Number(c.total_businesses).toLocaleString()}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-semibold text-white">Business Density (per 1k pop)</td>
                        {compareData.map(c => (
                          <td key={c.id} className="py-3 px-4 text-right font-mono text-amber-300">
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

            <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex justify-end">
              <button
                type="button"
                onClick={() => setIsCompareMode(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-300">Ontario Economic & Business Intelligence Platform</span>
            <span>•</span>
            <span>Audited StatCan Table 33-10-1097-01</span>
            <span>•</span>
            <span>2021 Census of Population</span>
            <span>•</span>
            <span>Ontario FIR</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              100% Persistent PostgreSQL
            </span>
            <span className="text-slate-400">0 Runtime Upstream Round Trips</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
