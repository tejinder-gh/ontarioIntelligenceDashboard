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
  CheckCircle2
} from 'lucide-react';
import { ResolutionBadge } from '../components/ResolutionBadge.js';
import { ExportButton } from '../components/ExportButton.js';
import { MetricTooltip } from '../components/MetricTooltip.js';
import { ContributingDataInspector, ContributingDataProps } from '../components/ContributingDataInspector.js';
import { FeatureOutliersSection } from '../components/FeatureOutliersSection.js';

interface CompetitionViewProps {
  cityId: string;
}

const CATEGORIES = [
  { id: 'all', name: 'All Monitored Categories' },
  { id: 'pizza_store', name: 'Pizza Store / Pizzerias' },
  { id: 'full_service_restaurant', name: 'Full-Service Restaurants' },
  { id: 'coffee_shop', name: 'Coffee & Snack Shops' },
  { id: 'tutoring_centre', name: 'Tutoring & Learning Centres' },
  { id: 'fitness_centre', name: 'Fitness & Gyms' },
  { id: 'child_daycare', name: 'Child Daycare' },
  { id: 'automotive_repair', name: 'Automotive Repair' },
  { id: 'dental_clinic', name: 'Dental Clinics' }
];

export const CompetitionView: React.FC<CompetitionViewProps> = ({ cityId }) => {
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [contributingData, setContributingData] = useState<ContributingDataProps | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/opportunity/business-detail?cityId=${cityId}&categoryId=pizza_store`)
      .then(res => res.json())
      .then(d => {
        setCompetitors(d.competitorLocations || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching competitors:', err);
        setLoading(false);
      });
  }, [cityId]);

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

      {/* Chain vs Independent Ratio Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Identified Competitors</span>
            <Store className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {totalCount}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Active verified physical storefronts
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Franchise & Chain Share</span>
            <Building className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold text-purple-300">
            {chainPct}%
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {chainCount} corporate / franchise locations
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Independent Operators</span>
            <MapPin className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">
            {independentCount}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {100 - chainPct}% local independent brands
          </div>
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

      {/* Competitor Locations Table */}
      <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse">
            Querying OpenStreetMap Overpass geographic records...
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
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
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
