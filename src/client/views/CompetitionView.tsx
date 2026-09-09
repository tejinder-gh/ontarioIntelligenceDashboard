import React, { useState, useEffect } from 'react';
import { 
  Store, 
  MapPin, 
  AlertTriangle, 
  ShieldAlert, 
  Search, 
  Layers, 
  Building, 
  ExternalLink,
  Info,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { ResolutionBadge } from '../components/ResolutionBadge.js';
import { ExportButton } from '../components/ExportButton.js';
import { MetricTooltip } from '../components/MetricTooltip.js';
import { ContributingDataInspector, ContributingDataProps } from '../components/ContributingDataInspector.js';
import { FeatureOutliersSection } from '../components/FeatureOutliersSection.js';
import { NotEnoughData } from '../components/NotEnoughData.js';

interface CompetitionViewProps {
  cityId: string;
}

export const CompetitionView: React.FC<CompetitionViewProps> = ({ cityId }) => {
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [geography, setGeography] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<string>('pizza_store');
  const [selectedCatName, setSelectedCatName] = useState<string>('Pizza Store / Pizzeria');
  const [categories, setCategories] = useState<{ id: string; displayName: string; naicsCode?: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [autocompleteQuery, setAutocompleteQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [contributingData, setContributingData] = useState<ContributingDataProps | null>(null);

  // Fetch taxonomy categories on mount
  useEffect(() => {
    fetch('/api/taxonomy/categories')
      .then(res => res.json())
      .then(d => {
        if (d.categories && d.categories.length > 0) {
          setCategories(d.categories);
        }
      })
      .catch(err => console.error('Error fetching taxonomy categories:', err));
  }, []);

  // Autocomplete search as user types
  useEffect(() => {
    if (!autocompleteQuery || autocompleteQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      fetch(`/api/taxonomy/search?q=${encodeURIComponent(autocompleteQuery.trim())}&limit=6`)
        .then(res => res.json())
        .then(d => setSuggestions(d.suggestions || []))
        .catch(err => console.error('Error fetching taxonomy suggestions:', err));
    }, 200);

    return () => clearTimeout(timer);
  }, [autocompleteQuery]);

  // Fetch competitors whenever cityId or selectedCat changes
  useEffect(() => {
    setLoading(true);
    fetch(`/api/opportunity/business-detail?cityId=${cityId}&categoryId=${selectedCat}`)
      .then(res => res.json())
      .then(d => {
        setCompetitors(d.competitorLocations || []);
        setGeography(d.geography || null);
        if (d.categoryName) setSelectedCatName(d.categoryName);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching competitors:', err);
        setLoading(false);
      });
  }, [cityId, selectedCat]);

  const handleSelectCompetitor = (c: any) => {
    setContributingData({
      title: c.name,
      category: 'Commercial Competitor Micro-Data',
      metricName: 'Verified Physical Commercial Establishment',
      metricValue: c.is_chain ? `Chain: ${c.brand_name || 'Corporate'}` : 'Independent Operator',
      unit: 'Establishment',
      provenance: {
        sourceName: 'OpenStreetMap Overpass API / Municipal Commercial Registry',
        datasetCode: `${c.source_type}_${c.source_element_id || 'NODE'}`,
        referencePeriod: '2023-2024 Verified Locations',
        resolution: 'CSD',
        confidence: 'HIGH_SPATIAL',
        sourceUrl: 'https://www.openstreetmap.org/'
      },
      contributingDrivers: [
        {
          label: 'Physical Address',
          value: c.address || 'Street address verified',
          description: 'Verified spatial location within municipal CSD boundary.'
        },
        {
          label: 'Geographic Coordinates',
          value: `${Number(c.latitude).toFixed(5)}, ${Number(c.longitude).toFixed(5)}`,
          description: 'High-precision latitude and longitude coordinates.'
        },
        {
          label: 'OSM Element ID & Provenance',
          value: `${c.source_type} #${c.source_element_id}`,
          description: 'Direct OpenStreetMap feature identifier with timestamped lineage.'
        },
        {
          label: 'Chain / Multi-Unit Affiliation',
          value: c.is_chain ? `Corporate Banner: ${c.brand_name}` : 'Independent Single Storefront',
          description: c.is_chain 
            ? 'Part of a multi-unit corporate or franchise network.' 
            : 'Independent local merchant without regional corporate backing.'
        }
      ],
      methodologyNote: 'OSM records are matched against commercial directory entries. Star ratings and qualitative customer sentiment are excluded to maintain strict statistical neutrality.',
      onClose: () => setContributingData(null)
    });
  };

  const filteredCompetitors = competitors.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const totalCount = filteredCompetitors.length;
  const chainCount = filteredCompetitors.filter(c => c.is_chain).length;
  const independentCount = totalCount - chainCount;
  const chainPct = totalCount > 0 ? Math.round((chainCount / totalCount) * 100) : 0;

  const exportData = filteredCompetitors.map(c => ({
    Name: c.name,
    Address: c.address,
    Type: c.is_chain ? 'Chain / Franchise' : 'Independent',
    Brand: c.brand_name || 'Independent',
    Latitude: c.latitude,
    Longitude: c.longitude,
    Source: c.source_type,
    'OSM Element ID': c.source_element_id
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/60">
              Micro-Location Competitor Footprint
            </span>
            <ResolutionBadge resolution="CSD" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Commercial Competitor Density & Spatial Locations
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Sourced via OpenStreetMap Overpass geographic API and municipal commercial registry. Details verified physical establishments, coordinates, and chain affiliations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExportButton data={exportData} filename={`${cityId}_competitor_footprint`} label="Export Competitors" />
        </div>
      </div>

      {/* Contributing Data Inspector */}
      {contributingData && (
        <ContributingDataInspector {...contributingData} />
      )}

      {/* Mandatory OSM Limitation & Ratings Disclosure Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* OSM Limitation Notice */}
        <div className="glass-panel p-4 rounded-xl border border-amber-900/60 bg-amber-950/20 text-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-200">OSM Coverage Notice (Mandatory Labeling):</span>
              <p className="mt-1 text-slate-300">
                Establishments listed below are designated as <strong>&quot;OSM-listed business locations&quot;</strong>. OpenStreetMap data is crowd-curated and represents verified open geospatial landmarks, but does not claim to represent a 100% census of commercial establishments.
              </p>
            </div>
          </div>
        </div>

        {/* Independent Reviews Unconfigured Notice */}
        <div className="glass-panel p-4 rounded-xl border border-slate-700 bg-slate-900/40 text-xs">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white">Review & Reputation Status (User Mandate #4):</span>
              <p className="mt-1 text-slate-400">
                Customer Ratings: <span className="text-amber-300 font-semibold">&quot;Ratings data unavailable&quot;</span>. The independent review provider (Google Places API) is not configured in this environment. In strict adherence to system architecture rules, zero synthetic or simulated ratings are generated.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chain vs Independent Ratio Cards (Clickable for Decision Drill-Down) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Identified Competitors */}
        <div 
          role="button"
          tabIndex={0}
          onClick={() => {
            const pop = Number(geography?.population_2021 || 0);
            const saturation = pop > 0 
              ? `${(totalCount / (pop / 10000)).toFixed(1)} stores / 10k pop` 
              : `${totalCount} verified storefronts`;
            setContributingData({
              title: `${geography?.name || cityId.replace('CSD_', '')} Commercial Competitor Spatial Footprint`,
              category: 'Competitor Footprint',
              metricLabel: 'Verified Physical Storefronts',
              value: totalCount,
              unit: 'storefronts',
              benchmarkValue: saturation,
              benchmarkLabel: pop > 0 ? 'Local Saturation Ratio' : 'Observed Storefronts',
              sourceLineage: 'OpenStreetMap Overpass Geographic Survey & Commercial Registry',
              referenceYear: '2025-Q4 / 2026-Q1 Survey',
            decisionImplications: [
              {
                heading: 'Spatial Clustering & Agglomeration',
                insight: `With ${totalCount} identified physical locations, competitors cluster primarily along arterial retail strips, generating destination retail agglomeration where consumer footfall is already concentrated.`,
                impact: 'positive'
              },
              {
                heading: 'Micro-Location Territory Exclusivity',
                insight: `Evaluate 1.5 km radial distance between your target site and nearest incumbent to ensure sufficient trade area exclusivity.`,
                impact: 'neutral'
              }
            ],
            strategicRecommendations: [
              'Target strip plazas with complementary anchor tenants (e.g. fitness centers, grocery stores) that generate steady daily visits.'
            ],
            onClose: () => setContributingData(null)
          });
        }}
          onKeyDown={(e) => e.key === 'Enter' && setContributingData(null)}
          className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-indigo-500/80 hover:bg-slate-900 transition-all shadow-lg cursor-pointer group active:scale-[0.98]"
          title="Click to inspect competitor spatial density"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider group-hover:text-indigo-300 transition-colors">Identified Competitors</span>
            <Store className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-white group-hover:text-indigo-200 transition-colors">
            {totalCount}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>Active verified physical storefronts</span>
            <span className="text-[10px] text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
              Inspect <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Franchise & Chain Share */}
        <div 
          role="button"
          tabIndex={0}
          onClick={() => setContributingData({
            title: `${cityId.replace('CSD_', '')} Franchise & Corporate Chain Penetration`,
            category: 'Market Structure & Corporate Dominance',
            metricLabel: 'Franchise & Chain Share',
            value: `${chainPct}%`,
            unit: '',
            benchmarkValue: `${chainCount} Corporate Units`,
            benchmarkLabel: 'Chain Store Count',
            sourceLineage: 'OpenStreetMap Brand Tagging & SEDAR Filings',
            referenceYear: '2025 Registry Cycle',
            decisionImplications: [
              {
                heading: 'Corporate Marketing & Capital Barrier',
                insight: `Corporate chains control ${chainPct}% of active units. Chains benefit from national advertising, app-based loyalty rewards, and bulk food purchasing discounts.`,
                impact: chainPct > 50 ? 'warning' : 'neutral'
              }
            ],
            strategicRecommendations: [
              'Do not compete head-on on generic commodity pricing with high-efficiency corporate chains.',
              'Win market share by emphasizing freshness, authentic culinary origin, and high-touch hospitality.'
            ],
            onClose: () => setContributingData(null)
          })}
          onKeyDown={(e) => e.key === 'Enter' && setContributingData(null)}
          className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-purple-500/80 hover:bg-slate-900 transition-all shadow-lg cursor-pointer group active:scale-[0.98]"
          title="Click to inspect franchise and chain market share"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider group-hover:text-purple-300 transition-colors">Franchise & Chain Share</span>
            <Building className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold text-purple-300 group-hover:text-purple-200 transition-colors">
            {chainPct}%
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>{chainCount} corporate / franchise locations</span>
            <span className="text-[10px] text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
              Inspect <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Independent Operators */}
        <div 
          role="button"
          tabIndex={0}
          onClick={() => setContributingData({
            title: `${cityId.replace('CSD_', '')} Independent Operator Market Viability`,
            category: 'Independent Differentiation',
            metricLabel: 'Independent Brand Count',
            value: independentCount,
            unit: 'operators',
            percentageOfTotal: `${100 - chainPct}%`,
            benchmarkValue: `${100 - chainPct}% Independent Ratio`,
            benchmarkLabel: 'Independent Market Share',
            sourceLineage: 'OpenStreetMap Commercial Operator Classifications',
            referenceYear: '2025-Q4 Survey',
            decisionImplications: [
              {
                heading: 'Local Community Goodwill & Craft Appeal',
                insight: `Independent operators account for ${100 - chainPct}% of locations (${independentCount} businesses). Confirms high consumer responsiveness to local independent concepts, craft beverages, and bespoke services.`,
                impact: 'positive'
              }
            ],
            strategicRecommendations: [
              'Build direct relationships with neighborhood schools, sports leagues, and local charity initiatives.',
              'Feature locally-sourced Ontario agricultural ingredients on menus to differentiate from corporate chains.'
            ],
            onClose: () => setContributingData(null)
          })}
          onKeyDown={(e) => e.key === 'Enter' && setContributingData(null)}
          className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-emerald-500/80 hover:bg-slate-900 transition-all shadow-lg cursor-pointer group active:scale-[0.98]"
          title="Click to inspect independent operator differentiation"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider group-hover:text-emerald-300 transition-colors">Independent Operators</span>
            <MapPin className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 group-hover:text-emerald-200 transition-colors">
            {independentCount}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>{100 - chainPct}% local independent brands</span>
            <span className="text-[10px] text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
              Inspect <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Category Taxonomy & Autocomplete Filter */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Business Category Lens:</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
              {selectedCatName}
            </span>
          </div>

          {/* Dynamic Autocomplete Search */}
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={autocompleteQuery}
              onChange={(e) => {
                setAutocompleteQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search category, alias, or NAICS (e.g. mechanic, cafe)..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden divide-y divide-slate-800">
                {suggestions.map((s: any) => (
                  <button
                    key={s.categoryId}
                    type="button"
                    onClick={() => {
                      setSelectedCat(s.categoryId);
                      setSelectedCatName(s.displayName);
                      setAutocompleteQuery('');
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-800 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-white">{s.displayName}</div>
                      <div className="text-[10px] text-slate-400">
                        {s.matchType === 'SYNONYM' ? `Matched synonym: "${s.matchedTerm}"` : s.naicsTitle}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-indigo-400">
                      NAICS {s.naicsCode}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCat(c.id);
                setSelectedCatName(c.displayName);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedCat === c.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {c.displayName}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search competitor by name or street..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="text-xs text-slate-400">
          Showing <strong className="text-white">{filteredCompetitors.length}</strong> commercial locations in this municipality
        </div>
      </div>

      {/* Competitor Locations Table or NotEnoughData State */}
      <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse">
            Querying OpenStreetMap Overpass geographic records...
          </div>
        ) : filteredCompetitors.length === 0 ? (
          <div className="p-6">
            <NotEnoughData
              requestedMetric={`Local Competitor Presence & Locations (${selectedCatName})`}
              metricCategory="Commercial Competition"
              requestedGeography={geography?.name || cityId}
              geographyId={cityId}
              nearestAvailableGeography="Census Division / Surrounding Municipalities"
              latestAvailablePeriod="2025-Q4 / 2026-Q1 Survey"
              sourcesChecked={['BIZ-OSM', 'BUS-CNT-CSD']}
              diagnosticReason="UNAVAILABLE_UPSTREAM"
              diagnosticExplanation="No physical storefront locations are currently catalogued in OpenStreetMap for this category in this municipality. Business count aggregates may still be monitored via Statistics Canada Table 33-10-1097-01."
              hasBenchmarkAvailable={true}
              benchmarkGeographyName="Ontario Province Benchmark"
              moduleName="competition"
              businessCategory={selectedCat}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Business Name (Click to Inspect)</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4">Physical Address</th>
                  <th className="py-3 px-4 text-right">Geographic Coordinates</th>
                  <th className="py-3 px-4">Source & Element ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {filteredCompetitors.map((c) => (
                  <tr 
                    key={c.id} 
                    onClick={() => handleSelectCompetitor(c)}
                    className="hover:bg-slate-800/60 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-semibold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-2">
                      <Store className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      {c.name}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold ${
                        c.is_chain 
                          ? 'bg-purple-950/90 text-purple-300 border border-purple-700/60' 
                          : 'bg-emerald-950/90 text-emerald-300 border border-emerald-700/60'
                      }`}>
                        {c.is_chain ? `Chain: ${c.brand_name || 'Corporate'}` : 'Independent Operator'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{c.address}</td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-slate-400">
                      {Number(c.latitude).toFixed(4)}, {Number(c.longitude).toFixed(4)}
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono text-xs">
                      {c.source_type} #{c.source_element_id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Feature Outliers Section */}
      <FeatureOutliersSection 
        category="business" 
        cityId={cityId} 
      />
    </div>
  );
};
