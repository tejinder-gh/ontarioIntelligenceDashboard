import React, { useState, useEffect } from 'react';
import { Fuel, TrendingDown, TrendingUp, Info, ExternalLink, Calendar, ChevronRight } from 'lucide-react';
import { ResolutionBadge } from './ResolutionBadge.js';
import { NotEnoughData } from './NotEnoughData.js';

interface GasPriceDeltaCardProps {
  cityId: string;
  cityName?: string;
}

export const GasPriceDeltaCard: React.FC<GasPriceDeltaCardProps> = ({ cityId, cityName }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/geographies/${cityId}/fuel`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching fuel price delta:', err);
        setLoading(false);
      });
  }, [cityId]);

  if (loading) {
    return (
      <div className="glass-panel p-5 rounded-xl border border-slate-800 animate-pulse text-xs text-slate-400">
        Loading retail fuel pricing & Toronto benchmark delta...
      </div>
    );
  }

  if (!data || !data.hasObservedData || !data.latest) {
    return (
      <NotEnoughData
        requestedMetric="Retail Gasoline Pump Price & Gas Price Delta"
        metricCategory="Operating Cost"
        requestedGeography={cityName || cityId}
        geographyId={cityId}
        nearestAvailableGeography="Toronto Reference Benchmark"
        latestAvailablePeriod="July 2026 (Table 18-10-0001-01)"
        sourcesChecked={['FUEL-RETAIL (StatCan Table 18-10-0001-01)']}
        diagnosticReason="UNAVAILABLE_UPSTREAM"
        diagnosticExplanation="Statistics Canada monitors retail gasoline prices at major Ontario urban sample points. Smaller rural municipalities inherit the nearest regional distribution benchmark."
        hasBenchmarkAvailable={true}
        benchmarkGeographyName="Toronto Reference Benchmark ($1.727/L)"
        moduleName="fuel"
      />
    );
  }

  const { latest, history, source } = data;
  const isCheaper = latest.absoluteDeltaCents <= 0;
  const deltaCentsFormatted = Math.abs(latest.absoluteDeltaCents).toFixed(1);
  const deltaPctFormatted = Math.abs(latest.deltaPct).toFixed(1);

  return (
    <div className="glass-panel p-6 rounded-xl border border-slate-800 relative overflow-hidden group hover:border-amber-500/50 transition-all">
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -z-10 group-hover:bg-amber-500/10 transition-all" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-700/60 text-amber-400">
            <Fuel className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Retail Gasoline Delta
              </span>
              <ResolutionBadge resolution="CSD" />
            </div>
            <p className="text-[11px] text-slate-400">
              vs Toronto Reference Benchmark (Section 11)
            </p>
          </div>
        </div>

        {/* Source Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
          <Calendar className="w-3.5 h-3.5 text-amber-400" />
          <span>{String(latest.referenceMonth).slice(0, 7)}</span>
          <span className="text-slate-600">|</span>
          <span className="font-mono text-indigo-400">{source.friendlyCode}</span>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        {/* Local Pump Price */}
        <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">
            Local Pump Price
          </span>
          <div className="text-2xl font-extrabold text-white">
            ${latest.priceDollarsPerLitre.toFixed(3)}
            <span className="text-xs font-normal text-slate-400 ml-1">/L</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {latest.priceCentsPerLitre.toFixed(1)}¢ / litre
          </span>
        </div>

        {/* Toronto Benchmark */}
        <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">
            Toronto Benchmark
          </span>
          <div className="text-2xl font-extrabold text-slate-300">
            ${latest.torontoBenchmarkDollars.toFixed(3)}
            <span className="text-xs font-normal text-slate-400 ml-1">/L</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {latest.torontoBenchmarkCents.toFixed(1)}¢ / litre
          </span>
        </div>

        {/* Absolute & Percentage Delta */}
        <div className={`p-3.5 rounded-lg border ${
          isCheaper 
            ? 'bg-emerald-950/20 border-emerald-800/60 text-emerald-300' 
            : 'bg-rose-950/20 border-rose-800/60 text-rose-300'
        }`}>
          <span className="text-[11px] uppercase tracking-wider block mb-1 font-semibold">
            Price Advantage (Delta)
          </span>
          <div className="flex items-center gap-1.5 text-2xl font-extrabold">
            {isCheaper ? <TrendingDown className="w-5 h-5 text-emerald-400" /> : <TrendingUp className="w-5 h-5 text-rose-400" />}
            <span>{isCheaper ? '-' : '+'}{deltaCentsFormatted}¢</span>
            <span className="text-xs font-medium opacity-80">({isCheaper ? '-' : '+'}{deltaPctFormatted}%)</span>
          </div>
          <span className="text-[11px] block mt-0.5 opacity-80">
            {isCheaper ? 'Cheaper than Toronto' : 'Premium vs Toronto'}
          </span>
        </div>
      </div>

      {/* Footer & Toggle History */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
        <span className="text-slate-400 flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-slate-500" />
          StatCan Table 18-10-0001-01 regular unleaded self-service.
        </span>

        <button
          onClick={() => setShowHistory(!showHistory)}
          className="text-amber-400 hover:text-amber-300 transition-colors font-medium flex items-center gap-1"
        >
          {showHistory ? 'Hide Monthly History' : 'View Monthly History'}
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showHistory ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {/* Historical Trend Table Drawer */}
      {showHistory && history && history.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-800 overflow-x-auto">
          <span className="text-xs font-bold text-white uppercase tracking-wider block mb-2">
            Historical Monthly Price Points ({cityName || cityId})
          </span>
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2 px-3">Reference Month</th>
                <th className="py-2 px-3 text-right">Local Pump Price</th>
                <th className="py-2 px-3 text-right">Toronto Benchmark</th>
                <th className="py-2 px-3 text-right">Absolute Delta</th>
                <th className="py-2 px-3 text-right">Delta %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {history.slice(0, 12).map((h: any, idx: number) => {
                const hCheaper = h.absoluteDeltaCents <= 0;
                return (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="py-2 px-3 font-mono">{String(h.referenceMonth).slice(0, 7)}</td>
                    <td className="py-2 px-3 text-right font-mono">${(h.priceCentsPerLitre / 100).toFixed(3)}/L</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-400">${(h.torontoBenchmarkCents / 100).toFixed(3)}/L</td>
                    <td className={`py-2 px-3 text-right font-mono font-semibold ${hCheaper ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {hCheaper ? '' : '+'}{h.absoluteDeltaCents.toFixed(1)}¢/L
                    </td>
                    <td className={`py-2 px-3 text-right font-mono ${hCheaper ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {hCheaper ? '' : '+'}{h.deltaPct.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
