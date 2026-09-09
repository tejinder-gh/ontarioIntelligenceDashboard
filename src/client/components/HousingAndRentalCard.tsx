import React, { useState, useEffect } from 'react';
import { Home, Key, Users, TrendingUp, Info, ChevronRight, BarChart2 } from 'lucide-react';
import { ResolutionBadge } from './ResolutionBadge.js';
import { NotEnoughData } from './NotEnoughData.js';

interface HousingAndRentalCardProps {
  cityId: string;
  cityName?: string;
}

export const HousingAndRentalCard: React.FC<HousingAndRentalCardProps> = ({ cityId, cityName }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'RENTAL' | 'OWNERSHIP' | 'HOUSING_STOCK'>('RENTAL');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/geographies/${cityId}/housing-rental`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching housing & rental data:', err);
        setLoading(false);
      });
  }, [cityId]);

  if (loading) {
    return (
      <div className="glass-panel p-5 rounded-xl border border-slate-800 animate-pulse text-xs text-slate-400">
        Loading CMHC rental market & property ownership concentration...
      </div>
    );
  }

  if (!data) return null;

  const { propertyOwnership, rentalMarket, housingStock } = data;

  return (
    <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-950/60 border border-indigo-700/60 text-indigo-400">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Residential Real Estate, Rental & Ownership Concentration
              </h3>
              <ResolutionBadge resolution="CSD" />
            </div>
            <p className="text-xs text-slate-400">
              CMHC Rental Market Survey (RMS) & Statistics Canada CHSP (Section 8, 9)
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
          <button
            onClick={() => setActiveTab('RENTAL')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              activeTab === 'RENTAL'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            CMHC Rental Market
          </button>
          <button
            onClick={() => setActiveTab('OWNERSHIP')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              activeTab === 'OWNERSHIP'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Property Owners
          </button>
          <button
            onClick={() => setActiveTab('HOUSING_STOCK')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              activeTab === 'HOUSING_STOCK'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Housing Stock
          </button>
        </div>
      </div>

      {/* Tab 1: CMHC Rental Market Survey */}
      {activeTab === 'RENTAL' && (
        <div className="space-y-4">
          {!data.hasObservedRentalMarket || !rentalMarket.latest ? (
            <NotEnoughData
              requestedMetric="CMHC Primary Rental Market Survey (Average Rent & Vacancy Rate)"
              metricCategory="Housing & Rental"
              requestedGeography={cityName || cityId}
              geographyId={cityId}
              nearestAvailableGeography="Ontario Provincial Benchmark"
              latestAvailablePeriod="October 2024 / January 2025"
              sourcesChecked={['RENT-CMHC (CMHC Rental Market Survey)']}
              diagnosticReason="UNAVAILABLE_UPSTREAM"
              diagnosticExplanation="CMHC conducts its primary rental market survey exclusively in urban centres with populations of 10,000+. Smaller rural municipalities do not have purpose-built rental universe surveys."
              hasBenchmarkAvailable={true}
              benchmarkGeographyName="Ontario Province Benchmark ($1,745/mo, 2.1% Vacancy)"
              moduleName="rental"
            />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {/* 2-Bed Average Rent */}
                <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">
                    Avg 2-Bed Rent
                  </span>
                  <div className="text-2xl font-extrabold text-white">
                    ${rentalMarket.latest.averageRentCad.toLocaleString()}
                    <span className="text-xs font-normal text-slate-400 ml-1">/mo</span>
                  </div>
                  {rentalMarket.benchmark && (
                    <span className="text-[11px] text-slate-400 block mt-1">
                      vs ${rentalMarket.benchmark.averageRentCad.toLocaleString()} Ontario avg
                    </span>
                  )}
                </div>

                {/* Vacancy Rate */}
                <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">
                    Rental Vacancy Rate
                  </span>
                  <div className="text-2xl font-extrabold text-indigo-300">
                    {rentalMarket.latest.vacancyRatePct.toFixed(1)}%
                  </div>
                  {rentalMarket.benchmark && (
                    <span className="text-[11px] text-slate-400 block mt-1">
                      vs {rentalMarket.benchmark.vacancyRatePct.toFixed(1)}% Ontario avg
                    </span>
                  )}
                </div>

                {/* Rental Universe */}
                <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">
                    Purpose-Built Universe
                  </span>
                  <div className="text-2xl font-extrabold text-slate-200">
                    {rentalMarket.latest.rentalUniverse ? rentalMarket.latest.rentalUniverse.toLocaleString() : 'N/A'}
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-1">
                    Surveyed apartment units
                  </span>
                </div>

                {/* Tenant Turnover Rate */}
                <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">
                    Annual Turnover Rate
                  </span>
                  <div className="text-2xl font-extrabold text-purple-300">
                    {rentalMarket.latest.turnoverRatePct ? `${rentalMarket.latest.turnoverRatePct.toFixed(1)}%` : 'N/A'}
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-1">
                    Tenant mobility rate
                  </span>
                </div>
              </div>

              {/* Rent by Bedroom Count Breakdown */}
              <div className="p-4 rounded-lg bg-slate-900/40 border border-slate-800">
                <span className="text-xs font-bold text-white uppercase tracking-wider block mb-3">
                  Monthly Rent by Unit Type (CMHC October 2024 Survey)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-400 block">Bachelor:</span>
                    <span className="text-white font-bold font-mono">
                      {rentalMarket.latest.rentBachelorCad ? `$${rentalMarket.latest.rentBachelorCad.toLocaleString()}` : 'N/A'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-400 block">1 Bedroom:</span>
                    <span className="text-white font-bold font-mono">
                      {rentalMarket.latest.rent1bedCad ? `$${rentalMarket.latest.rent1bedCad.toLocaleString()}` : 'N/A'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-400 block">2 Bedroom:</span>
                    <span className="text-white font-bold font-mono">
                      {rentalMarket.latest.rent2bedCad ? `$${rentalMarket.latest.rent2bedCad.toLocaleString()}` : 'N/A'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-400 block">3+ Bedroom:</span>
                    <span className="text-white font-bold font-mono">
                      {rentalMarket.latest.rent3bedPlusCad ? `$${rentalMarket.latest.rent3bedPlusCad.toLocaleString()}` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 2: Property Ownership Concentration */}
      {activeTab === 'OWNERSHIP' && (
        <div className="space-y-4">
          {!data.hasObservedPropertyOwnership || !propertyOwnership.latest ? (
            <NotEnoughData
              requestedMetric="Residential Property Ownership Concentration"
              metricCategory="Housing & Property"
              requestedGeography={cityName || cityId}
              geographyId={cityId}
              nearestAvailableGeography="Ontario Provincial Benchmark"
              latestAvailablePeriod="2024 (Table 46-10-0096-01)"
              sourcesChecked={['PROP-MULTI-OWNER (StatCan CHSP)']}
              diagnosticReason="UNAVAILABLE_UPSTREAM"
              diagnosticExplanation="Statistics Canada Canadian Housing Statistics Program (CHSP) publishes municipal ownership cross-tabs for major census subdivisions. Provincial benchmark is available."
              hasBenchmarkAvailable={true}
              benchmarkGeographyName="Ontario Province Benchmark (17.2% Multi-Property Owners)"
              moduleName="property_ownership"
            />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">
                    Multi-Property Owner Share
                  </span>
                  <div className="text-2xl font-extrabold text-amber-300">
                    {propertyOwnership.latest.multiPropertyOwnerPct.toFixed(1)}%
                  </div>
                  {propertyOwnership.benchmark && (
                    <span className="text-[11px] text-slate-400 block mt-1">
                      vs {propertyOwnership.benchmark.multiPropertyOwnerPct.toFixed(1)}% Ontario benchmark
                    </span>
                  )}
                </div>

                <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">
                    Multiple-Property Owners
                  </span>
                  <div className="text-2xl font-extrabold text-white">
                    {propertyOwnership.latest.multiPropertyOwners.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-1">
                    Own 2 or more properties
                  </span>
                </div>

                <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">
                    Single-Property Owners
                  </span>
                  <div className="text-2xl font-extrabold text-white">
                    {propertyOwnership.latest.singlePropertyOwners.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-1">
                    Own exactly 1 property
                  </span>
                </div>
              </div>

              {/* Longitudinal History Table */}
              {propertyOwnership.history && propertyOwnership.history.length > 0 && (
                <div className="p-4 rounded-lg bg-slate-900/40 border border-slate-800 overflow-x-auto">
                  <span className="text-xs font-bold text-white uppercase tracking-wider block mb-2">
                    Multi-Year Property Ownership Trend ({propertyOwnership.source.friendlyCode})
                  </span>
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-2 px-3">Reference Year</th>
                        <th className="py-2 px-3 text-right">Total Owners</th>
                        <th className="py-2 px-3 text-right">Single-Property</th>
                        <th className="py-2 px-3 text-right">Multi-Property</th>
                        <th className="py-2 px-3 text-right">Multi-Property Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {propertyOwnership.history.map((h: any) => (
                        <tr key={h.referenceYear} className="hover:bg-slate-800/40">
                          <td className="py-2 px-3 font-semibold text-white">{h.referenceYear}</td>
                          <td className="py-2 px-3 text-right font-mono">{h.totalOwners.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-400">{h.singlePropertyOwners.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-mono text-amber-400">{h.multiPropertyOwners.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-amber-300">{h.multiPropertyOwnerPct.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Tab 3: Housing Stock Structural Breakdown */}
      {activeTab === 'HOUSING_STOCK' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {housingStock && housingStock.length > 0 ? (
              housingStock.map((h: any, idx: number) => (
                <div key={idx} className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-xs text-slate-300 font-medium block truncate" title={h.label}>
                    {h.label}
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xl font-extrabold text-white">
                      {h.count.toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold text-indigo-400">
                      {h.pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-6 text-xs text-slate-400">
                Housing stock structural breakdown loading from 2021 Census Profile...
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Source: Statistics Canada, 2021 Census of Population, Table 98-401-X2021001 (Dwelling types occupied by ordinary residents).
          </p>
        </div>
      )}
    </div>
  );
};
