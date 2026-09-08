import React, { useState, useEffect } from 'react';
import { Users, Globe2, Layers, Download, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ResolutionBadge } from '../components/ResolutionBadge.js';
import { ExportButton } from '../components/ExportButton.js';
import { MetricTooltip } from '../components/MetricTooltip.js';

interface DemographicsViewProps {
  cityId: string;
}

export const DemographicsView: React.FC<DemographicsViewProps> = ({ cityId }) => {
  const [selectedGeo, setSelectedGeo] = useState<string>(cityId);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Sync with prop when city changes unless Ontario-wide explicitly selected
  useEffect(() => {
    setSelectedGeo(cityId);
  }, [cityId]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/geographies/${selectedGeo}/demographics`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching demographics:', err);
        setLoading(false);
      });
  }, [selectedGeo]);

  const isOntarioWide = selectedGeo === 'PR_35' || selectedGeo === 'ontario';

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/60">
              Section 6: Demographic Lens
            </span>
            <ResolutionBadge resolution={isOntarioWide ? 'PROVINCE' : 'CSD'} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Dynamic Ethnocultural & Community Demographics
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Calculated dynamically from Statistics Canada 2021 Census of Population data. Ethnic origins and visible minority populations represent distinct census concepts and are kept strictly separated.
          </p>
        </div>

        {/* Geographic Lens Selector: Selected City vs Ontario-wide */}
        <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-lg border border-slate-700">
          <button
            type="button"
            onClick={() => setSelectedGeo(cityId)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              !isOntarioWide 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Selected Municipality
          </button>
          <button
            type="button"
            onClick={() => setSelectedGeo('PR_35')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              isOntarioWide 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ontario-wide / No City Selected
          </button>
        </div>
      </div>

      {loading || !data ? (
        <div className="p-12 text-center text-slate-400 animate-pulse">
          Computing dynamic demographic distributions...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top 20 Communities Chart */}
          <div className="glass-panel p-6 rounded-xl border border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-indigo-400" />
                  Top 20 Ethnic and Cultural Origins ({isOntarioWide ? 'Ontario-wide' : 'Municipal'})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Reflects ethnic and cultural ancestral origins reported by respondents in the 2021 Census long form.
                </p>
              </div>
              <ExportButton data={data.top20Communities || []} filename={`${selectedGeo}_top_20_ethnic_origins`} />
            </div>

            {/* Chart: Top 20 Horizontal Bar */}
            <div className="h-96 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(data.top20Communities || []).slice(0, 15)}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" tickFormatter={v => v.toLocaleString()} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="category_label" stroke="#94a3b8" tick={{ fontSize: 11 }} width={115} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload;
                      return (
                        <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-700 shadow-xl text-xs text-slate-200">
                          <div className="font-semibold text-white">{item.category_label}</div>
                          <div className="text-indigo-400 font-mono mt-1">
                            Count: {item.count_total.toLocaleString()} people ({item.percentage_share}%)
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Source: Statistics Canada Census 2021</div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="count_total" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top 20 Table Breakdown */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-800">
                <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-2.5">Rank</th>
                    <th className="px-4 py-2.5">Ethnic or Cultural Origin</th>
                    <th className="px-4 py-2.5 text-right">Population Count</th>
                    <th className="px-4 py-2.5 text-right">Share of Population</th>
                    <th className="px-4 py-2.5">Source Dataset</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {(data.top20Communities || []).map((comm: any, idx: number) => (
                    <tr key={comm.category_label} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-2 text-slate-400 font-mono">#{idx + 1}</td>
                      <td className="px-4 py-2 font-medium text-white">{comm.category_label}</td>
                      <td className="px-4 py-2 text-right font-mono">{comm.count_total.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right font-mono text-indigo-400">{comm.percentage_share}%</td>
                      <td className="px-4 py-2 text-slate-400">StatCan 98-401-X2021001</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Visible Minority Populations */}
          <div className="glass-panel p-6 rounded-xl border border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Visible Minority Groups ({isOntarioWide ? 'Ontario-wide' : 'Municipal'})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Employment Equity Act designated visible minority categories according to Statistics Canada Census classifications.
                </p>
              </div>
              <ExportButton data={data.visibleMinorities || []} filename={`${selectedGeo}_visible_minorities`} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {(data.visibleMinorities || []).map((vm: any) => (
                <div key={vm.category_label} className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800">
                  <div className="text-xs text-slate-400 font-medium truncate">{vm.category_label}</div>
                  <div className="text-lg font-bold text-white mt-1">{vm.count_total.toLocaleString()}</div>
                  <div className="text-xs text-emerald-400 font-medium mt-0.5">{vm.percentage_share}% of total</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
