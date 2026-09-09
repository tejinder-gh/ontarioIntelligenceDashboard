import React, { useState, useEffect } from 'react';
import { 
  Building, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Home, 
  Briefcase, 
  Train, 
  FileText, 
  ExternalLink, 
  ChevronRight, 
  CheckCircle2, 
  Layers, 
  TrendingUp,
  Filter
} from 'lucide-react';
import { ResolutionBadge } from './ResolutionBadge.js';
import { NotEnoughData } from './NotEnoughData.js';
import type { ContributingDataProps } from './ContributingDataInspector.js';

interface MunicipalPlanningCardProps {
  cityId: string;
  cityName?: string;
  onInspectData?: (data: ContributingDataProps) => void;
}

type CategoryFilter = 'ALL' | 'INTENSIFICATION_AREA' | 'INDUSTRIAL_EXPANSION' | 'TRANSIT_PROJECT' | 'HOUSING_PROJECT' | 'COMMERCIAL_NODE';

export const MunicipalPlanningCard: React.FC<MunicipalPlanningCardProps> = ({
  cityId,
  cityName,
  onInspectData
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedFilter, setSelectedFilter] = useState<CategoryFilter>('ALL');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/geographies/${cityId}/planning-initiatives`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching municipal planning initiatives:', err);
        setLoading(false);
      });
  }, [cityId]);

  if (loading) {
    return (
      <div className="glass-panel p-6 rounded-2xl border border-white/10 animate-pulse text-xs text-slate-400">
        Loading official municipal plan expansion corridors, transit nodes, and housing targets...
      </div>
    );
  }

  if (!data || !data.hasObservedData || !data.initiatives || data.initiatives.length === 0) {
    return (
      <NotEnoughData
        requestedMetric="Official Plan Secondary Plans & MTSA Growth Nodes"
        metricCategory="Municipal"
        requestedGeography={cityName || cityId}
        geographyId={cityId}
        nearestAvailableGeography="Burlington / Oakville Consolidated Official Plans"
        latestAvailablePeriod="2024 Consolidated Municipal Plans"
        sourcesChecked={[
          'MUNI-OFFICIAL-PLAN (Municipal Official Plan & Secondary Plans)',
          'MUNI-BUDGET-CURRENT (Approved Capital Budget & Development Charge Background Study)'
        ]}
        diagnosticReason="MISSING_INGESTION"
        hasBenchmarkAvailable={true}
        benchmarkGeographyName="Burlington / Oakville Consolidated Official Plans"
      />
    );
  }

  const { summary, initiatives } = data;

  const filteredInitiatives = initiatives.filter((init: any) => {
    if (selectedFilter === 'ALL') return true;
    return init.initiative_category === selectedFilter;
  });

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'TRANSIT_PROJECT':
        return <Train className="w-4 h-4 text-emerald-400" />;
      case 'INDUSTRIAL_EXPANSION':
      case 'EMPLOYMENT_AREA':
        return <Briefcase className="w-4 h-4 text-sky-400" />;
      case 'HOUSING_PROJECT':
      case 'RESIDENTIAL_GROWTH':
        return <Home className="w-4 h-4 text-purple-400" />;
      case 'COMMERCIAL_NODE':
        return <Building className="w-4 h-4 text-amber-400" />;
      default:
        return <Layers className="w-4 h-4 text-indigo-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'UNDER_CONSTRUCTION':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-700/60 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Under Construction
          </span>
        );
      case 'APPROVED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Approved By-law
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-700/60">
            {status}
          </span>
        );
    }
  };

  const inspectInitiative = (init: any) => {
    if (!onInspectData) return;
    onInspectData({
      title: init.title,
      category: 'Municipal Official Plan & Spatial Intelligence',
      metricLabel: 'Capital Investment & Planned Density',
      value: init.estimated_capital_cad ? `$${(Number(init.estimated_capital_cad) / 1000000).toFixed(1)}M CAD` : 'Regulatory Planning Framework',
      unit: '',
      percentageOfTotal: `${init.housing_units_targeted ? `${init.housing_units_targeted.toLocaleString()} target residential units` : ''}`,
      benchmarkValue: 'Regional MTSA Growth Allocation',
      benchmarkLabel: 'Provincial Policy Statement (PPS 2024)',
      sourceLineage: `${init.source_document} (${init.source_page_ref || 'Official Record'})`,
      referenceYear: new Date(init.reference_date).getFullYear().toString(),
      decisionImplications: [
        {
          heading: 'Commercial Demand & Customer Footfall Surge',
          insight: `Designated corridor (${init.spatialCorridor || 'Corridor'}) will capture sustained private investment, generating elevated pedestrian traffic and demand for retail, food services, and medical clinics.`,
          impact: 'positive'
        },
        {
          heading: 'Infrastructure & Phasing Timeline',
          insight: `Target completion horizon: ${init.target_completion_year || 'Multi-Phase'}. Commercial tenants should align lease commitments with scheduled infrastructure delivery dates.`,
          impact: 'neutral'
        }
      ],
      strategicRecommendations: [
        'Survey storefronts along identified transit corridors ahead of full subdivision completion to secure lower entry net rents.',
        'Review municipal development charge exemption by-laws when evaluating new construction or major commercial renovations.'
      ],
      provenance: {
        sourceName: init.source_document,
        datasetCode: 'MUNI_OFFICIAL_PLAN',
        referencePeriod: init.reference_date,
        resolution: 'CSD',
        confidence: 'AUDITED_MUNICIPAL_BYLAW',
        sourceUrl: 'https://burlington.ca/'
      }
    });
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-white/10 shadow-lg space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-purple-950/80 text-purple-300 border border-purple-700/60">
              MUNI-OFFICIAL-PLAN
            </span>
            <ResolutionBadge resolution="CSD" />
          </div>
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <span>Official Municipal Plans & Strategic Growth Initiatives</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Structured intelligence extracted from official municipal plans, MTSA secondary plans, and development charge studies for {cityName || cityId}.
          </p>
        </div>

        <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-900/80 text-slate-300 border border-white/5">
          {initiatives.length} Active Corridors
        </span>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 bg-slate-900/70 rounded-xl border border-white/5">
          <span className="text-slate-400 block mb-1">Planned Housing Units</span>
          <span className="text-base font-bold text-purple-300">
            {summary.totalHousingUnitsTargeted > 0 ? summary.totalHousingUnitsTargeted.toLocaleString() : '—'}
          </span>
          <span className="block text-[10px] text-slate-500 mt-0.5">Approved targets</span>
        </div>

        <div className="p-3 bg-slate-900/70 rounded-xl border border-white/5">
          <span className="text-slate-400 block mb-1">Commercial / Industrial Space</span>
          <span className="text-base font-bold text-sky-300">
            {summary.totalCommercialSqftTargeted > 0 ? `${(summary.totalCommercialSqftTargeted / 1000).toLocaleString()}k sq.ft` : '—'}
          </span>
          <span className="block text-[10px] text-slate-500 mt-0.5">Employment floorspace</span>
        </div>

        <div className="p-3 bg-slate-900/70 rounded-xl border border-white/5">
          <span className="text-slate-400 block mb-1">Capital Investment Pipeline</span>
          <span className="text-base font-bold text-emerald-300">
            {summary.totalCapitalInvestmentCad > 0 ? `$${(summary.totalCapitalInvestmentCad / 1000000).toFixed(0)}M CAD` : '—'}
          </span>
          <span className="block text-[10px] text-slate-500 mt-0.5">Public & transit capital</span>
        </div>

        <div className="p-3 bg-slate-900/70 rounded-xl border border-white/5">
          <span className="text-slate-400 block mb-1">Growth Horizon</span>
          <span className="text-base font-bold text-amber-300">
            2026 – 2035
          </span>
          <span className="block text-[10px] text-slate-500 mt-0.5">Target buildout</span>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'ALL', label: 'All Initiatives' },
          { id: 'INTENSIFICATION_AREA', label: 'MTSA Intensification' },
          { id: 'INDUSTRIAL_EXPANSION', label: 'Industrial & Employment' },
          { id: 'TRANSIT_PROJECT', label: 'Transit Corridors' },
          { id: 'HOUSING_PROJECT', label: 'Housing Strategy' },
          { id: 'COMMERCIAL_NODE', label: 'Commercial Nodes' }
        ].map(filter => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setSelectedFilter(filter.id as CategoryFilter)}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
              selectedFilter === filter.id
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-white/5'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Initiatives List */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
        {filteredInitiatives.map((init: any) => (
          <div
            key={init.id}
            onClick={() => inspectInitiative(init)}
            className="p-4 bg-slate-900/80 hover:bg-slate-900 rounded-xl border border-white/5 hover:border-purple-500/60 transition-all cursor-pointer group space-y-2.5"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-slate-950 border border-white/10">
                  {getCategoryIcon(init.initiative_category)}
                </span>
                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                    {init.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span className="font-medium text-slate-300">{init.plan_type.replace(/_/g, ' ')}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-indigo-400" />
                      {init.spatial_corridor}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {getStatusBadge(init.status)}
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {init.description}
            </p>

            {/* Metrics Ribbon */}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400 border-t border-white/5">
              {init.target_completion_year && (
                <span className="flex items-center gap-1 text-amber-300">
                  <Calendar className="w-3 h-3" />
                  Target: <strong>{init.target_completion_year}</strong>
                </span>
              )}
              {init.estimated_capital_cad > 0 && (
                <span className="flex items-center gap-1 text-emerald-300">
                  <DollarSign className="w-3 h-3" />
                  Capital: <strong>${(Number(init.estimated_capital_cad) / 1000000).toFixed(1)}M CAD</strong>
                </span>
              )}
              {init.housing_units_targeted > 0 && (
                <span className="flex items-center gap-1 text-purple-300">
                  <Home className="w-3 h-3" />
                  Units: <strong>{init.housing_units_targeted.toLocaleString()}</strong>
                </span>
              )}
              {init.commercial_sqft_targeted > 0 && (
                <span className="flex items-center gap-1 text-sky-300">
                  <Building className="w-3 h-3" />
                  Space: <strong>{init.commercial_sqft_targeted.toLocaleString()} sq.ft</strong>
                </span>
              )}
            </div>

            {/* Provenance Footer */}
            <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1">
              <span>Source: <strong className="text-slate-400">{init.source_document}</strong> ({init.source_page_ref})</span>
              <span>Adopted: {init.reference_date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
