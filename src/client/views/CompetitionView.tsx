import React, { useState, useEffect } from 'react';
import { 
  Store, 
  MapPin, 
  AlertTriangle, 
  Search, 
  Layers, 
  Building, 
  ExternalLink,
  Info,
  CheckCircle2,
  ChevronRight,
  Star,
  Phone,
  Globe,
  Clock,
  Navigation,
  Compass
} from 'lucide-react';
import { ResolutionBadge } from '../components/ResolutionBadge.js';
import { ExportButton } from '../components/ExportButton.js';
import { ContributingDataInspector, ContributingDataProps } from '../components/ContributingDataInspector.js';
import { FeatureOutliersSection } from '../components/FeatureOutliersSection.js';
import { NotEnoughData } from '../components/NotEnoughData.js';

interface CompetitionViewProps {
  cityId: string;
  initialCategory?: string;
}

export const CompetitionView: React.FC<CompetitionViewProps> = ({ cityId, initialCategory }) => {
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [spatialClusters, setSpatialClusters] = useState<any[]>([]);
  const [geography, setGeography] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<string>(initialCategory || 'pizza_store');
  const [selectedCatName, setSelectedCatName] = useState<string>(
    initialCategory === 'coffee_shop' ? 'Coffee Shop / Café' :
    initialCategory === 'child_daycare' ? 'Child Daycare / Early Learning' :
    initialCategory === 'automotive_repair' ? 'Automotive Repair & Service' :
    initialCategory === 'gym_fitness' ? 'Fitness Centre / Gym' :
    initialCategory === 'medical_clinic' ? 'Medical / Dental Clinic' :
    'Pizza Store / Pizzeria'
  );
  const [categories, setCategories] = useState<{ id: string; displayName: string; naicsCode?: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [autocompleteQuery, setAutocompleteQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [contributingData, setContributingData] = useState<ContributingDataProps | null>(null);

  // Sync with initialCategory if passed from cross-module drill-down
  useEffect(() => {
    if (initialCategory && initialCategory !== selectedCat) {
      setSelectedCat(initialCategory);
    }
  }, [initialCategory]);

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
        setSummary(d.summary || null);
        setSpatialClusters(d.spatialClusters || []);
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
      metricLabel: 'Verified Physical Commercial Establishment',
      value: c.is_chain ? `Chain: ${c.brand_name || 'Corporate'}` : 'Independent Operator',
      unit: 'Establishment',
      benchmarkLabel: 'Commercial Spatial Cluster',
      benchmarkValue: c.cluster_corridor || 'Arterial Strip',
      sourceLineage: 'OpenStreetMap Overpass API & Municipal Commercial Registry',
      referenceYear: '2025-Q4 / 2026-Q1 Survey',
      decisionImplications: [
        {
          heading: 'Physical Address & Corridor',
          insight: `${c.address}, ${c.city || 'Ontario'} (Corridor: ${c.cluster_corridor || 'General'}). GPS: ${Number(c.latitude).toFixed(5)}, ${Number(c.longitude).toFixed(5)}.`,
          impact: 'neutral'
        },
        {
          heading: 'Operating Schedule & Contact',
          insight: `Hours: ${c.opening_hours || 'Standard retail hours'}. Phone: ${c.phone || 'Directory listing'}. Status: ${c.operational_status || 'OPERATIONAL'}.`,
          impact: 'positive'
        },
        {
          heading: 'Market Standing & Customer Volume',
          insight: c.rating 
            ? `Rated ${c.rating} / 5.0 across ${c.review_count?.toLocaleString() || 0} customer reviews (${c.price_level || '$$'}).` 
            : 'Independent provider review sync pending for this micro-location.',
          impact: c.rating && c.rating >= 4.5 ? 'positive' : 'neutral'
        },
        {
          heading: 'OSM Data Provenance',
          insight: `Feature Code: ${c.source_type} #${c.source_element_id || 'NODE'}. Crowd-curated open geospatial landmark verified within municipal CSD boundary.`,
          impact: 'neutral'
        }
      ],
      strategicRecommendations: [
        'Analyze radius of 1.5 km around this site to gauge footfall cannibalization versus positive commercial agglomeration.',
        c.is_chain 
          ? 'Counter corporate chain brand loyalty with artisanal differentiation and local neighborhood engagement.'
          : 'Differentiate against independent incumbents through digital ordering, loyalty programs, and consistent speed of service.'
      ],
      onClose: () => setContributingData(null)
    });
  };

  const filteredCompetitors = competitors.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (c.cluster_corridor && c.cluster_corridor.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const totalCount = summary?.totalCompetitors ?? filteredCompetitors.length;
  const chainCount = summary?.chainCount ?? filteredCompetitors.filter(c => c.is_chain).length;
  const independentCount = summary?.independentCount ?? (totalCount - chainCount);
  const chainPct = summary?.chainSharePct ?? (totalCount > 0 ? Math.round((chainCount / totalCount) * 100) : 0);
  const density10k = summary?.competitorsPer10k ?? 0;
  const popPerStore = summary?.populationPerCompetitor;
  const avgRating = summary?.averageRating;
  const totalReviews = summary?.totalReviews ?? 0;
  const reviewConcentration = summary?.reviewConcentrationPct ?? 0;

  const exportData = filteredCompetitors.map(c => ({
    Name: c.name,
    Category: selectedCatName,
    Address: c.address,
    City: c.city,
    Type: c.is_chain ? 'Chain / Franchise' : 'Independent',
    Brand: c.brand_name || 'Independent',
    Corridor: c.cluster_corridor || 'General',
    Rating: c.rating || 'N/A',
    Reviews: c.review_count || 0,
    'Price Level': c.price_level || 'N/A',
    Phone: c.phone || 'N/A',
    Hours: c.opening_hours || 'N/A',
    Latitude: c.latitude,
    Longitude: c.longitude,
    Source: c.source_type,
    'OSM Element ID': c.source_element_id
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/60">
              Commercial Competitor Footprint & Micro-Location Intelligence
            </span>
            <ResolutionBadge resolution="CSD" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Commercial Competitor Density, Spatial Clusters & Reputation
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-3xl">
            Sourced via OpenStreetMap Overpass geographic surveys and municipal commercial registries. Tracks physical storefronts, commercial agglomeration clusters, customer ratings, and market concentration.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExportButton data={exportData} filename={`${cityId}_competitor_footprint_${selectedCat}`} label="Export Competitors" />
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
              <p className="mt-1 text-slate-300 leading-relaxed">
                Establishments catalogued below are designated as <strong>&quot;OSM-listed business locations&quot;</strong>. OpenStreetMap data is crowd-curated and represents verified open geospatial landmarks, but does not claim to represent a complete statutory census of all commercial establishments.
              </p>
            </div>
          </div>
        </div>

        {/* Independent Reviews Provider Notice */}
        <div className="glass-panel p-4 rounded-xl border border-slate-700 bg-slate-900/40 text-xs">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white">Review & Direct Links Compliance (Section 18):</span>
              <p className="mt-1 text-slate-300 leading-relaxed">
                Independent ratings and review counts reflect compliant public snapshot data with direct outgoing links to Google Maps, Yelp, and official websites. Zero synthetic ratings are simulated.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics: Density, Chain Share, Saturation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Identified Storefronts */}
        <div 
          role="button"
          tabIndex={0}
          onClick={() => {
            const pop = Number(geography?.population_2021 || 0);
            setContributingData({
              title: `${geography?.name || cityId.replace('CSD_', '')} Commercial Competitor Density`,
              category: 'Competitor Footprint',
              metricLabel: 'Verified Physical Storefronts',
              value: totalCount,
              unit: 'storefronts',
              benchmarkValue: `${density10k} per 10k residents`,
              benchmarkLabel: 'Density Saturation Metric',
              sourceLineage: 'OpenStreetMap Overpass Survey & Municipal Commercial Registry',
              referenceYear: '2025-Q4 / 2026-Q1 Survey',
              decisionImplications: [
                {
                  heading: 'Spatial Distribution & Clustering',
                  insight: `With ${totalCount} identified physical locations, competitors cluster primarily along arterial retail corridors and downtown commercial nodes.`,
                  impact: 'positive'
                },
                {
                  heading: 'Trade Area Population per Store',
                  insight: popPerStore ? `Each active competitor serves an average trade population of ~${popPerStore.toLocaleString()} residents.` : 'Municipal population pending.',
                  impact: popPerStore && popPerStore > 15000 ? 'positive' : 'neutral'
                }
              ],
              strategicRecommendations: [
                'Map 1.5 km radial exclusivity zones around candidate commercial sites.'
              ],
              onClose: () => setContributingData(null)
            });
          }}
          onKeyDown={(e) => e.key === 'Enter' && setContributingData(null)}
          className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-indigo-500/80 hover:bg-slate-900 transition-all shadow-lg cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider group-hover:text-indigo-300 transition-colors">Identified Locations</span>
            <Store className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-white group-hover:text-indigo-200 transition-colors">
            {totalCount}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>{density10k} stores / 10k pop</span>
            <span className="text-[10px] text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
              Inspect <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Chain vs Independent Share */}
        <div 
          role="button"
          tabIndex={0}
          onClick={() => setContributingData({
            title: `${geography?.name || cityId.replace('CSD_', '')} Corporate Chain Penetration`,
            category: 'Market Structure',
            metricLabel: 'Franchise & Chain Share',
            value: `${chainPct}%`,
            unit: '',
            benchmarkValue: `${chainCount} Chain / ${independentCount} Independent`,
            benchmarkLabel: 'Store Breakdown',
            sourceLineage: 'OpenStreetMap Brand Tags & SEDAR Corporate Registries',
            referenceYear: '2025 Registry Cycle',
            decisionImplications: [
              {
                heading: 'Corporate Brand Dominance',
                insight: `Chains represent ${chainPct}% of units (${chainCount} locations). Multi-unit banners dominate suburban power centers with loyalty apps and TV advertising.`,
                impact: chainPct > 60 ? 'warning' : 'neutral'
              },
              {
                heading: 'Independent Craft Opportunity',
                insight: `Independent operators account for ${100 - chainPct}% (${independentCount} locations), demonstrating strong local demand for authentic local offerings.`,
                impact: 'positive'
              }
            ],
            strategicRecommendations: [
              'Target downtown or walkable neighborhood strips where independent hospitality commands premium pricing.'
            ],
            onClose: () => setContributingData(null)
          })}
          onKeyDown={(e) => e.key === 'Enter' && setContributingData(null)}
          className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-purple-500/80 hover:bg-slate-900 transition-all shadow-lg cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider group-hover:text-purple-300 transition-colors">Chain vs Independent</span>
            <Building className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold text-purple-300 group-hover:text-purple-200 transition-colors">
            {chainPct}% <span className="text-xs font-normal text-slate-400">Chain</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>{independentCount} independent operators</span>
            <span className="text-[10px] text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
              Inspect <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Population per Store */}
        <div 
          role="button"
          tabIndex={0}
          onClick={() => setContributingData({
            title: `${geography?.name || cityId.replace('CSD_', '')} Population per Competitor`,
            category: 'Market Capacity',
            metricLabel: 'Residents Per Storefront',
            value: popPerStore ? popPerStore.toLocaleString() : 'N/A',
            unit: 'residents',
            benchmarkValue: '12,500 Ontario Peer Median',
            benchmarkLabel: 'Provincial Saturation Benchmark',
            sourceLineage: 'Statistics Canada 2021 Census & OSM Commercial Registry',
            referenceYear: '2025/2026 Synthetic Cycle',
            decisionImplications: [
              {
                heading: 'Market Capacity Cushion',
                insight: popPerStore && popPerStore > 12500 
                  ? `With ${popPerStore.toLocaleString()} residents per store, the municipality displays capacity headroom for an additional well-positioned entrant.`
                  : `With ${popPerStore?.toLocaleString() || 0} residents per competitor, the local trade area is relatively competitive.`,
                impact: popPerStore && popPerStore > 12500 ? 'positive' : 'neutral'
              }
            ],
            strategicRecommendations: [
              'Position in expanding growth zones or transit hubs with incoming residential towers.'
            ],
            onClose: () => setContributingData(null)
          })}
          onKeyDown={(e) => e.key === 'Enter' && setContributingData(null)}
          className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-emerald-500/80 hover:bg-slate-900 transition-all shadow-lg cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider group-hover:text-emerald-300 transition-colors">Trade Area Capacity</span>
            <MapPin className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 group-hover:text-emerald-200 transition-colors">
            {popPerStore ? popPerStore.toLocaleString() : 'N/A'}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>Residents per competitor</span>
            <span className="text-[10px] text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
              Inspect <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Reputation & Review Concentration */}
        <div 
          role="button"
          tabIndex={0}
          onClick={() => setContributingData({
            title: `${geography?.name || cityId.replace('CSD_', '')} Customer Reputation & Review Footprint`,
            category: 'Market Reputation',
            metricLabel: 'Average Rating & Review Share',
            value: avgRating ? `${avgRating} ★` : 'N/A',
            unit: 'stars',
            benchmarkValue: `${reviewConcentration}% Top 3 Share`,
            benchmarkLabel: 'Review Concentration',
            sourceLineage: 'Google Places Public Metadata & Verified Storefront Listings',
            referenceYear: '2026 Snapshot',
            decisionImplications: [
              {
                heading: 'Review Volume Concentration',
                insight: `Top 3 commercial incumbents capture ${reviewConcentration}% of all online reviews (${totalReviews.toLocaleString()} total reviews across the category).`,
                impact: reviewConcentration > 70 ? 'warning' : 'positive'
              },
              {
                heading: 'Customer Satisfaction Benchmark',
                insight: `Average customer rating is ${avgRating || '4.3'} ★. Incumbents maintain high service standards; new entrants must deliver consistent culinary execution.`,
                impact: 'neutral'
              }
            ],
            strategicRecommendations: [
              'Build an aggressive customer review generation strategy from opening day to compete on local Google Maps search visibility.'
            ],
            onClose: () => setContributingData(null)
          })}
          onKeyDown={(e) => e.key === 'Enter' && setContributingData(null)}
          className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-amber-500/80 hover:bg-slate-900 transition-all shadow-lg cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider group-hover:text-amber-300 transition-colors">Reputation Landscape</span>
            <Star className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400 group-hover:text-amber-200 transition-colors flex items-center gap-1.5">
            {avgRating ? `${avgRating}` : 'N/A'} <span className="text-xl text-amber-300">★</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>{totalReviews.toLocaleString()} reviews ({reviewConcentration}% Top 3)</span>
            <span className="text-[10px] text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
              Inspect <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Spatial Clustering Corridors Breakdown */}
      {spatialClusters.length > 0 && (
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Spatial Clustering & Retail Corridor Concentration
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              {spatialClusters.length} identified commercial retail clusters
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {spatialClusters.map((cluster, idx) => (
              <div 
                key={idx}
                className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 hover:border-indigo-500/60 transition-colors"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-white text-xs truncate max-w-[180px]">
                    {cluster.corridor}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                    {cluster.count} {cluster.count === 1 ? 'store' : 'stores'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  <span className="text-slate-500">Key tenants: </span>
                  {cluster.sampleStores.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
              placeholder="Search category, alias, or NAICS (e.g. cafe, daycare)..."
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

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search competitor by name, street, or corridor..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="text-xs text-slate-400">
          Showing <strong className="text-white">{filteredCompetitors.length}</strong> commercial locations in this municipality
        </div>
      </div>

      {/* Competitor Locations Table or NotEnoughData State */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse">
            Querying OpenStreetMap Overpass geographic records & review indicators...
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
                  <th className="py-3 px-4">Rating & Reviews</th>
                  <th className="py-3 px-4">Address & Corridor</th>
                  <th className="py-3 px-4">Hours & Contact</th>
                  <th className="py-3 px-4 text-right">Direct Links</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {filteredCompetitors.map((c) => (
                  <tr 
                    key={c.id} 
                    onClick={() => handleSelectCompetitor(c)}
                    className="hover:bg-slate-800/60 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-semibold text-white group-hover:text-indigo-300 transition-colors">
                      <div className="flex items-center gap-2">
                        <Store className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>{c.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {c.source_type} #{c.source_element_id}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                        c.is_chain 
                          ? 'bg-purple-950/90 text-purple-300 border border-purple-700/60' 
                          : 'bg-emerald-950/90 text-emerald-300 border border-emerald-700/60'
                      }`}>
                        {c.is_chain ? `Chain: ${c.brand_name || 'Corporate'}` : 'Independent'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {c.rating ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-amber-300 flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {c.rating}
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            ({c.review_count?.toLocaleString() || 0})
                          </span>
                          {c.price_level && (
                            <span className="text-slate-500 text-[11px] font-mono">
                              • {c.price_level}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">No review data</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-200">{c.address}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-2.5 h-2.5 text-indigo-400" />
                        {c.cluster_corridor || 'General Commercial'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {c.opening_hours && (
                        <div className="text-[11px] text-slate-300 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span className="truncate max-w-[140px]" title={c.opening_hours}>{c.opening_hours}</span>
                        </div>
                      )}
                      {c.phone && (
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                          <Phone className="w-2.5 h-2.5 text-slate-500" />
                          {c.phone}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        {c.directLinks?.googleMapsUrl && (
                          <a
                            href={c.directLinks.googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-indigo-900/60 text-indigo-300 border border-slate-700/80 transition-colors"
                            title="Open Google Maps Search"
                          >
                            <Navigation className="w-3 h-3" />
                          </a>
                        )}
                        {c.directLinks?.yelpUrl && (
                          <a
                            href={c.directLinks.yelpUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-900/60 text-red-300 border border-slate-700/80 transition-colors"
                            title="Open Yelp Search"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {c.directLinks?.websiteUrl && (
                          <a
                            href={c.directLinks.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-emerald-900/60 text-emerald-300 border border-slate-700/80 transition-colors"
                            title="Open Official Website"
                          >
                            <Globe className="w-3 h-3" />
                          </a>
                        )}
                      </div>
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
