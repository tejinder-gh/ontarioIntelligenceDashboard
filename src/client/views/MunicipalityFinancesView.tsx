import React, { useState, useEffect } from 'react';
import { 
  Landmark, 
  DollarSign, 
  TrendingUp, 
  FileSpreadsheet, 
  Shield, 
  Truck, 
  Trees, 
  Building,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { ResolutionBadge } from '../components/ResolutionBadge.js';
import { ExportButton } from '../components/ExportButton.js';
import { MetricTooltip } from '../components/MetricTooltip.js';
import { ContributingDataInspector, ContributingDataProps } from '../components/ContributingDataInspector.js';
import { FeatureOutliersSection } from '../components/FeatureOutliersSection.js';
import { MunicipalPlanningCard } from '../components/MunicipalPlanningCard.js';

interface MunicipalityFinancesViewProps {
  cityId: string;
  onSelectCity?: (cityId: string) => void;
}

export const MunicipalityFinancesView: React.FC<MunicipalityFinancesViewProps> = ({ cityId, onSelectCity }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [contributingData, setContributingData] = useState<ContributingDataProps | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/geographies/${cityId}/municipal-budget`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching municipal budget:', err);
        setLoading(false);
      });
  }, [cityId]);

  if (loading || !data) {
    return (
      <div className="p-12 text-center text-slate-400 animate-pulse">
        Loading Ontario FIR municipal financial statements...
      </div>
    );
  }

  const operating = data.operatingBudget || 0;
  const capital = data.capitalBudget || 0;
  const propertyTax = data.propertyTaxRevenue || 0;
  const departments = data.departmentalBreakdown || [];
  const pop = Number(data.population || 0);
  const cityName = data.cityName || cityId.replace('CSD_', '');

  const handleSelectDepartment = (dept: any) => {
    const raw = departments.find((d: any) => d.account_category === (dept.fullName || dept.account_category || dept.name)) || dept;
    const amount = Number(raw.amount_dollars || dept.amount || 0);
    const pct = raw.pct_of_total_budget || dept.pct || (operating > 0 ? ((amount / operating) * 100).toFixed(1) : '0');
    const perCapita = raw.per_capita_dollars || dept.perCapita || '0';

    setContributingData({
      title: `${raw.account_category || dept.name} Spending`,
      category: 'Municipal Finance (Ontario FIR)',
      metricName: 'Annual Departmental Operating Expenditure',
      metricValue: `$${amount.toLocaleString()}`,
      unit: 'CAD',
      provenance: {
        sourceName: 'Ontario Ministry of Municipal Affairs and Housing (MMAH)',
        datasetCode: 'FIR_SCHEDULE_40',
        referencePeriod: '2022-2023 FIR Filings',
        resolution: 'CSD',
        confidence: 'OFFICIAL_AUDITED',
        sourceUrl: 'https://efir.ontario.ca/'
      },
      contributingDrivers: [
        {
          label: 'Total Municipal Budget Share',
          value: `${pct}% of total operating expenditures`,
          description: 'Share of aggregate municipal operating budget dedicated to this service function.'
        },
        {
          label: 'Per-Capita Allocation',
          value: `$${Number(perCapita).toLocaleString()} / resident`,
          description: 'Net local municipal expenditure per capita for residents within this census subdivision.'
        },
        {
          label: 'Impact on Commercial Operators',
          value: 'Municipal Service Capacity',
          description: raw.account_category?.includes('Transportation') 
            ? 'Dictates road snow-clearing, arterial transit flow, commercial parking enforcement, and logistics access.'
            : raw.account_category?.includes('Protection')
            ? 'Directly funds emergency response times, commercial fire code inspections, and storefront security.'
            : raw.account_category?.includes('Planning')
            ? 'Determines commercial zoning approvals, building permit issuance speed, and development charge structures.'
            : 'Core municipal administration, legal, and operational infrastructure.'
        }
      ],
      methodologyNote: 'Sourced from official Ontario Financial Information Return (FIR) Schedule 40 submissions. Data is reconciled against audited annual financial statements by municipal treasurers.',
      onClose: () => setContributingData(null)
    });
  };

  const chartData = departments.map((d: any) => ({
    name: d.account_category.length > 25 ? d.account_category.substring(0, 23) + '...' : d.account_category,
    fullName: d.account_category,
    amount: Number(d.amount_dollars),
    pct: Number(d.pct_of_total_budget),
    perCapita: Number(d.per_capita_dollars)
  }));

  const exportData = [
    { Metric: 'Total Operating Budget', Value: `$${operating.toLocaleString()}` },
    { Metric: 'Capital Budget', Value: `$${capital.toLocaleString()}` },
    { Metric: 'Property Taxation Revenue', Value: `$${propertyTax.toLocaleString()}` },
    ...departments.map((d: any) => ({
      Metric: `Dept: ${d.account_category}`,
      Value: `$${Number(d.amount_dollars).toLocaleString()} (${d.pct_of_total_budget}%, $${d.per_capita_dollars}/capita)`
    }))
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/60">
              Section 11: Municipal Fiscal Statements (Ontario FIR)
            </span>
            <ResolutionBadge resolution="CSD" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Municipal Budget, Revenue & Departmental Expenditures
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-3xl">
            Sourced directly from official Ontario Financial Information Return (FIR) filings published by the Ministry of Municipal Affairs and Housing (MMAH). Tracks local infrastructure investment, tax burden, and municipal service capacity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExportButton data={exportData} filename={`${cityId}_municipal_finances`} label="Export FIR Data" />
        </div>
      </div>

      {/* Contributing Data Inspector */}
      {contributingData && (
        <ContributingDataInspector {...contributingData} />
      )}

      {/* Fiscal Overview KPIs (Clickable for Decision Drill-Down) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Operating Budget */}
        <div 
          role="button"
          tabIndex={0}
          onClick={() => setContributingData({
            title: `${cityName} Municipal Operating Budget Analysis`,
            category: 'Municipal Fiscal Capacity',
            metricLabel: 'Total Annual Operating Expenditures',
            value: operating,
            unit: 'CAD',
            benchmarkValue: pop > 0 ? `$${Math.round(operating / pop).toLocaleString()} / resident` : '$— / resident',
            benchmarkLabel: 'Per-Capita Municipal Spend',
            sourceLineage: 'Ontario Financial Information Return (FIR Schedule 40)',
            referenceYear: 'Audited Municipal Year',
            decisionImplications: [
              {
                heading: 'Municipal Service & Infrastructure Maintenance',
                insight: `An operating budget of $${(operating / 1000000).toFixed(1)}M guarantees high service levels for arterial road maintenance, commercial snow removal, emergency fire response, and public transit connectivity.`,
                impact: 'positive'
              }
            ],
            strategicRecommendations: [
              'Track municipal service allocation to verify that commercial tax contributions yield adequate district maintenance and traffic flow.'
            ],
            onClose: () => setContributingData(null)
          })}
          onKeyDown={(e) => e.key === 'Enter' && setContributingData(null)}
          className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-indigo-500/80 hover:bg-slate-900 transition-all shadow-lg cursor-pointer group active:scale-[0.98]"
          title="Click to inspect municipal operating budget implications"
        >
          <div className="flex items-center justify-between text-slate-300 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider group-hover:text-indigo-300 transition-colors">Annual Operating Budget</span>
            <Landmark className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-white group-hover:text-indigo-200 transition-colors">
            ${(operating / 1000000).toFixed(1)}M
          </div>
          <div className="mt-2 text-xs text-slate-300 flex items-center justify-between">
            <span>${operating.toLocaleString()}</span>
            <span className="text-[10px] text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
              Inspect <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Capital Budget */}
        <div 
          role="button"
          tabIndex={0}
          onClick={() => setContributingData({
            title: `${cityId.replace('CSD_', '')} Capital Infrastructure Investment Plan`,
            category: 'Capital Infrastructure & Expansion',
            metricLabel: 'Capital Budget Expenditures',
            value: capital,
            unit: 'CAD',
            benchmarkValue: `${((capital / (operating || 1)) * 100).toFixed(1)}% of Operating`,
            benchmarkLabel: 'Capital Reinvestment Ratio',
            sourceLineage: 'Ontario FIR Capital Statements & 10-Year Capital Forecasts',
            referenceYear: 'Audited Municipal Year',
            decisionImplications: [
              {
                heading: 'Infrastructure Upgrades & Commercial Growth Nodes',
                insight: `Capital investments of $${(capital / 1000000).toFixed(1)}M indicate active renewal of water/wastewater mains, road corridor widening, and community transit terminal improvements.`,
                impact: 'positive'
              },
              {
                heading: 'Construction Distruption Awareness',
                insight: `Review active capital projects to avoid commercial leasing along corridors scheduled for prolonged utility excavations.`,
                impact: 'warning'
              }
            ],
            strategicRecommendations: [
              'Inquire with local municipal planning department regarding scheduled streetscaping or underground utility replacements before signing a long-term lease.'
            ],
            onClose: () => setContributingData(null)
          })}
          onKeyDown={(e) => e.key === 'Enter' && setContributingData(null)}
          className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-emerald-500/80 hover:bg-slate-900 transition-all shadow-lg cursor-pointer group active:scale-[0.98]"
          title="Click to inspect capital infrastructure investment"
        >
          <div className="flex items-center justify-between text-slate-300 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider group-hover:text-emerald-300 transition-colors">Capital Budget</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white group-hover:text-emerald-200 transition-colors">
            ${(capital / 1000000).toFixed(1)}M
          </div>
          <div className="mt-2 text-xs text-slate-300 flex items-center justify-between">
            <span>Infrastructure & growth (${capital.toLocaleString()})</span>
            <span className="text-[10px] text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
              Inspect <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Property Taxation Revenue */}
        <div 
          role="button"
          tabIndex={0}
          onClick={() => {
            const taxShare = operating > 0 ? ((propertyTax / operating) * 100).toFixed(1) : '0';
            setContributingData({
              title: `${cityId.replace('CSD_', '')} Property Taxation Revenue & Commercial Levy Burden`,
              category: 'Taxation & Fiscal Burden',
              metricLabel: 'Municipal Taxation Revenue Collected',
              value: propertyTax,
              unit: 'CAD',
              percentageOfTotal: `${taxShare}% of Operating Budget`,
              benchmarkValue: `${taxShare}% Tax Dependency`,
              benchmarkLabel: 'Levy Dependency Ratio',
              sourceLineage: 'Ontario FIR Schedule 20 (Taxation & Assessment)',
              referenceYear: 'Audited Municipal Year',
              decisionImplications: [
                {
                  heading: 'Tax Predictability & Commercial TMI Impact',
                  insight: `Property taxes fund ${taxShare}% of municipal services ($${(propertyTax / 1000000).toFixed(1)}M). Commercial property tax assessment multipliers directly dictate the TMI (tax, maintenance, insurance) portion of retail triple-net leases.`,
                  impact: 'neutral'
                }
              ],
              strategicRecommendations: [
                'Ensure commercial lease agreements specify exact tenant portion of realty taxes with annual reconciliation transparency.'
              ],
              onClose: () => setContributingData(null)
            });
          }}
          onKeyDown={(e) => e.key === 'Enter' && setContributingData(null)}
          className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-amber-500/80 hover:bg-slate-900 transition-all shadow-lg cursor-pointer group active:scale-[0.98]"
          title="Click to inspect municipal taxation and commercial levy burden"
        >
          <div className="flex items-center justify-between text-slate-300 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider group-hover:text-amber-300 transition-colors">Property Taxation Revenue</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-white group-hover:text-amber-200 transition-colors">
            ${(propertyTax / 1000000).toFixed(1)}M
          </div>
          <div className="mt-2 text-xs text-slate-300 flex items-center justify-between">
            <span>{operating > 0 ? ((propertyTax / operating) * 100).toFixed(1) : 0}% of operating budget</span>
            <span className="text-[10px] text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
              Inspect <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Departmental Allocation Chart */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
              Operating Expenditures by Municipal Department
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Ontario Ministry of Municipal Affairs and Housing (Schedule 40) • Click any bar to inspect contributing breakdown
            </p>
          </div>
          <ResolutionBadge resolution="CSD" />
        </div>

        <div 
          role="region" 
          aria-label="Operating Expenditures by Municipal Department Chart"
          className="h-72"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              layout="vertical" 
              margin={{ top: 5, right: 30, left: 175, bottom: 5 }}
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload.length) {
                  handleSelectDepartment(e.activePayload[0].payload);
                }
              }}
              className="cursor-pointer"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12, fill: '#cbd5e1' }} tickFormatter={(v) => `$${(v / 1000000).toFixed(0)}M`} />
              <YAxis dataKey="name" type="category" stroke="#94a3b8" width={170} tick={{ fontSize: 12, fill: '#cbd5e1' }} />
              <Tooltip 
                formatter={(val: any, name: any, item: any) => [`$${(Number(val) / 1000000).toFixed(2)}M (${item.payload.pct}%, $${item.payload.perCapita}/capita)`, 'Expenditure']}
                contentStyle={{ 
                  backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                  backdropFilter: 'blur(12px)', 
                  borderColor: 'rgba(255, 255, 255, 0.1)', 
                  borderRadius: '12px', 
                  color: '#f8fafc',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                }}
              />
              <Bar dataKey="amount" fill="#6366f1" radius={[0, 6, 6, 0]}>
                {chartData.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#818cf8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Departmental Detail Table */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 shadow-lg">
        <h3 className="text-base font-bold text-white mb-3">
          Departmental Expense Breakdown & Municipal Per-Capita Spending
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900/90 text-slate-300 uppercase tracking-wider border-b border-white/10 font-semibold">
              <tr>
                <th className="py-3 px-4">Municipal Service Category</th>
                <th className="py-3 px-4 text-right">Annual Expenditure</th>
                <th className="py-3 px-4 text-right">% of Budget</th>
                <th className="py-3 px-4 text-right">Per Capita Spending</th>
                <th className="py-3 px-4">Commercial Significance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-200">
              {departments.map((d: any) => (
                <tr 
                  key={d.account_category} 
                  onClick={() => handleSelectDepartment(d)}
                  className="hover:bg-white/5 transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-4 font-semibold text-white group-hover:text-indigo-300 transition-colors">{d.account_category}</td>
                  <td className="py-3 px-4 text-right font-bold text-white font-mono">${Number(d.amount_dollars).toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-semibold text-indigo-400">{d.pct_of_total_budget}%</td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-400 font-mono">${Number(d.per_capita_dollars).toLocaleString()} / resident</td>
                  <td className="py-3 px-4 text-slate-300">
                    {d.account_category.includes('Transportation') ? 'Directly impacts transit traffic, customer parking & arterial road flows' :
                     d.account_category.includes('Protection') ? 'Ensures public safety, fire code compliance & security for storefronts' :
                     d.account_category.includes('Environmental') ? 'Underpins utility rates, commercial water/waste capacity' :
                     d.account_category.includes('Recreation') ? 'Generates foot traffic near community arenas, pools and sports parks' :
                     d.account_category.includes('Planning') ? 'Dictates zoning approvals, permit turnaround times & commercial density' :
                     'Municipal governance and administrative support'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Municipal Expansion & Official Plan Intelligence */}
      <MunicipalPlanningCard 
        cityId={cityId} 
        cityName={cityName} 
        onInspectData={setContributingData} 
      />

      {/* Feature Outliers Section */}
      <FeatureOutliersSection 
        category="municipal" 
        cityId={cityId} 
        onSelectCity={onSelectCity} 
      />
    </div>
  );
};
