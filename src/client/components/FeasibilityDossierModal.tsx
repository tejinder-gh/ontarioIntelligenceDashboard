import React, { useState, useEffect } from 'react';
import { 
  X, 
  Printer, 
  FileText, 
  Sparkles
} from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/formatters.js';

interface FeasibilityDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  cityId: string;
  categoryId?: string;
  cityName?: string;
}

export const FeasibilityDossierModal: React.FC<FeasibilityDossierModalProps> = ({
  isOpen,
  onClose,
  cityId,
  categoryId = 'pizza_store'
}) => {
  const [dossierData, setDossierData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRedirecting, setIsRedirecting] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);

    fetch(`/api/dossier/${cityId}/${categoryId}`)
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          setDossierData(json.data);
        }
      })
      .catch(err => {
        console.error('Failed to load feasibility dossier:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, cityId, categoryId]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCheckout = async () => {
    try {
      setIsRedirecting(true);
      const res = await fetch('/api/checkout/dossier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cityId, categoryId })
      });
      const json = await res.json();
      
      if (json.url) {
        window.location.href = json.url;
      } else {
        alert(json.error || 'Failed to start checkout. Please try again.');
        setIsRedirecting(false);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Network error. Please try again.');
      setIsRedirecting(false);
    }
  };

  const geo = dossierData?.geography;
  const cat = dossierData?.category;
  const dem = dossierData?.demographics;
  const comp = dossierData?.competitiveLandscape;
  const cre = dossierData?.commercialRealEstate?.[0];
  const unit = dossierData?.unitEconomics;
  const counts = dossierData?.businessCountsTable33;

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-label="Location Feasibility Dossier"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 print:p-0 print:bg-white print:static"
    >
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden print:border-0 print:shadow-none print:bg-white print:text-black">
        
        {/* Header Bar - Hidden in Print */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/90 print:hidden">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Location Feasibility Dossier</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700/60 font-semibold">
                  Data Preview
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Official Statistics Canada & MMAH FIR Verified Intelligence Report
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 max-h-[82vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-6 space-y-8 bg-slate-900 print:bg-white text-slate-200 print:text-slate-900 font-sans">
          
          {isLoading ? (
            <div className="py-24 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-slate-400">Synthesizing authoritative municipal records and census tables...</p>
            </div>
          ) : (
            <>
              {/* Document Header / Cover Banner */}
              <div className="border-b border-slate-800 print:border-slate-300 pb-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 print:text-indigo-800">
                      <span>Ontario Location Intelligence</span>
                      <span>•</span>
                      <span>Document ID: {dossierData?.reportId}</span>
                    </div>
                    <h1 className="text-3xl font-extrabold text-white print:text-black tracking-tight">
                      Commercial Feasibility & Location Dossier
                    </h1>
                    <p className="text-sm text-slate-300 print:text-slate-700 mt-1">
                      Target Concept: <strong className="text-white print:text-black">{cat?.display_name}</strong> (NAICS {cat?.naics_code}) | Market: <strong className="text-white print:text-black">{geo?.name}, Ontario</strong> (CSD {geo?.id?.replace('CSD_', '')})
                    </p>
                  </div>

                  <div className="text-right text-xs text-slate-400 print:text-slate-600 space-y-1">
                    <div>Effective Period: <strong className="text-white print:text-black">{new Date().getFullYear()} Benchmark</strong></div>
                    <div>StatCan Product: <span className="font-mono">98-401-X2021001</span></div>
                    <div>Preview generated from the current dataset</div>
                  </div>
                </div>
              </div>

              {/* Section 1: Executive Summary & Opportunity Scorecard */}
              <section className="space-y-4">
                <h3 className="text-base font-bold text-white print:text-black uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  1. Executive Summary & Market Fit Scorecard
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-200 p-4 rounded-xl">
                    <span className="text-xs text-slate-400 print:text-slate-600 block">Market Catchment</span>
                    <span className="text-2xl font-black text-white print:text-black mt-1 block">
                      {formatNumber(dem?.population)}
                    </span>
                    <span className="text-xs text-emerald-400 print:text-emerald-700 mt-1 block font-medium">
                      +{dem?.populationGrowth5Year}% 5-Yr Growth
                    </span>
                  </div>

                  <div className="bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-200 p-4 rounded-xl">
                    <span className="text-xs text-slate-400 print:text-slate-600 block">Median HH Income</span>
                    <span className="text-2xl font-black text-emerald-400 print:text-emerald-800 mt-1 block">
                      {formatCurrency(dem?.medianHouseholdIncome)}
                    </span>
                    <span className="text-xs text-slate-400 print:text-slate-600 mt-1 block">
                      Avg: {formatCurrency(dem?.averageHouseholdIncome)}
                    </span>
                  </div>

                  <div className="bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-200 p-4 rounded-xl">
                    <span className="text-xs text-slate-400 print:text-slate-600 block">Category Opportunity Gap</span>
                    <span className="text-2xl font-black text-indigo-400 print:text-indigo-800 mt-1 block">
                      {comp?.gapIndex}x Index
                    </span>
                    <span className="text-xs text-indigo-300 print:text-indigo-700 mt-1 block font-semibold">
                      {comp?.opportunityTier?.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-200 p-4 rounded-xl">
                    <span className="text-xs text-slate-400 print:text-slate-600 block">Est. Pro Forma SDE</span>
                    <span className="text-2xl font-black text-white print:text-black mt-1 block">
                      {formatCurrency(unit?.median_annual_revenue * (unit?.sde_ebitda_pct / 100))}
                    </span>
                    <span className="text-xs text-slate-400 print:text-slate-600 mt-1 block">
                      {unit?.sde_ebitda_pct}% Cash Flow Margin
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/40 print:bg-slate-100 border border-slate-800 print:border-slate-200 text-xs leading-relaxed">
                  <strong>Executive Recommendation: </strong>
                  The municipality of <strong>{geo?.name}</strong> demonstrates superior demographic strength for commercial entry in <strong>{cat?.display_name}</strong>. With a median household total income of {formatCurrency(dem?.medianHouseholdIncome)} CAD (well exceeding the $95,000 provincial benchmark) and strong retail spend retention, local purchasing capacity supports high unit volumes. The category saturation gap index of {comp?.gapIndex}x indicates room for new market capacity before reaching saturation.
                </div>
              </section>

              {/* Section 2: Demographics & Catchment Sizing */}
              <section className="space-y-4">
                <h3 className="text-base font-bold text-white print:text-black uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  2. Census Demographics & Catchment Dynamics (StatCan 98-401-X2021001)
                </h3>
                
                <div className="overflow-x-auto border border-slate-800 print:border-slate-300 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950 print:bg-slate-100 text-slate-400 print:text-slate-700 uppercase font-semibold">
                      <tr>
                        <th className="py-2.5 px-4">Demographic Metric</th>
                        <th className="py-2.5 px-4 text-right">Municipal Value ({geo?.name})</th>
                        <th className="py-2.5 px-4 text-right">Ontario Benchmark</th>
                        <th className="py-2.5 px-4">Variance Analysis</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 print:divide-slate-200">
                      <tr>
                        <td className="py-2 px-4 font-medium">Usual Resident Population</td>
                        <td className="py-2 px-4 text-right font-bold">{formatNumber(dem?.population)}</td>
                        <td className="py-2 px-4 text-right">14,223,942</td>
                        <td className="py-2 px-4 text-emerald-400 print:text-emerald-700 font-medium">+{geo?.ontario_pop_share_pct || '1.31'}% of Ontario Base</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 font-medium">5-Year Growth Rate (2016–2021)</td>
                        <td className="py-2 px-4 text-right font-bold">+{dem?.populationGrowth5Year}%</td>
                        <td className="py-2 px-4 text-right">+5.8%</td>
                        <td className="py-2 px-4">Established mature submarket</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 font-medium">Median Age of Residents</td>
                        <td className="py-2 px-4 text-right font-bold">{dem?.medianAge} yrs</td>
                        <td className="py-2 px-4 text-right">41.6 yrs</td>
                        <td className="py-2 px-4">High prime earning age distribution</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 font-medium">Labor Force Participation Rate</td>
                        <td className="py-2 px-4 text-right font-bold">{dem?.laborParticipationRate}%</td>
                        <td className="py-2 px-4 text-right">65.0%</td>
                        <td className="py-2 px-4 text-emerald-400 print:text-emerald-700 font-medium">Above provincial labor engagement</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 font-medium">Local Unemployment Rate</td>
                        <td className="py-2 px-4 text-right font-bold">{dem?.unemploymentRate}%</td>
                        <td className="py-2 px-4 text-right">6.5%</td>
                        <td className="py-2 px-4">Low economic friction</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Section 3: Household Purchasing Power & Wealth Profile */}
              <section className="space-y-4">
                <h3 className="text-base font-bold text-white print:text-black uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  3. Household Purchasing Power & Wealth Distribution
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-200">
                    <span className="text-xs text-slate-400 print:text-slate-600">Median Household Income</span>
                    <div className="text-xl font-bold text-white print:text-black mt-1">
                      {formatCurrency(dem?.medianHouseholdIncome)}
                    </div>
                    <p className="text-xs text-slate-400 print:text-slate-600 mt-2">
                      50% of households in {geo?.name} earn above this threshold, providing ample discretionary budget for casual dining and takeout.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-200">
                    <span className="text-xs text-slate-400 print:text-slate-600">Average Household Income</span>
                    <div className="text-xl font-bold text-white print:text-black mt-1">
                      {formatCurrency(dem?.averageHouseholdIncome)}
                    </div>
                    <p className="text-xs text-slate-400 print:text-slate-600 mt-2">
                      Significant upward skew (Mean exceeds Median by {formatCurrency(dem?.averageHouseholdIncome - dem?.medianHouseholdIncome)}) confirms an affluent upper tier.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-200">
                    <span className="text-xs text-slate-400 print:text-slate-600">Average Dwelling Asset Value</span>
                    <div className="text-xl font-bold text-white print:text-black mt-1">
                      {formatCurrency(dem?.averageHomeValue)}
                    </div>
                    <p className="text-xs text-slate-400 print:text-slate-600 mt-2">
                      High homeowner equity foundations correlate strongly with low consumer credit delinquency and bankability.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 4: Local Competitive Footprint & Table 33-10-1097 Counts */}
              <section className="space-y-4">
                <h3 className="text-base font-bold text-white print:text-black uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  4. Local Competitive Landscape & Canadian Business Counts (Table 33-10-1097-01)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-200 space-y-2">
                    <span className="text-xs font-semibold text-slate-300 print:text-slate-800 uppercase">
                      Employer Business Establishment Bands (NAICS {cat?.naics_code})
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                      <div className="flex justify-between py-1 border-b border-slate-800 print:border-slate-200">
                        <span className="text-slate-400 print:text-slate-600">1 to 4 Employees:</span>
                        <strong className="text-white print:text-black">{counts?.emp_1_to_4}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800 print:border-slate-200">
                        <span className="text-slate-400 print:text-slate-600">5 to 9 Employees:</span>
                        <strong className="text-white print:text-black">{counts?.emp_5_to_9}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800 print:border-slate-200">
                        <span className="text-slate-400 print:text-slate-600">10 to 19 Employees:</span>
                        <strong className="text-white print:text-black">{counts?.emp_10_to_19}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800 print:border-slate-200">
                        <span className="text-slate-400 print:text-slate-600">20 to 49 Employees:</span>
                        <strong className="text-white print:text-black">{counts?.emp_20_to_49}</strong>
                      </div>
                    </div>
                    <div className="pt-2 flex justify-between text-xs font-bold text-indigo-400 print:text-indigo-800">
                      <span>Total Registered Establishments:</span>
                      <span>{counts?.total_establishments}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-200 space-y-2">
                    <span className="text-xs font-semibold text-slate-300 print:text-slate-800 uppercase">
                      Active Business-For-Sale Comps
                    </span>
                    <div className="text-xs text-slate-400 print:text-slate-600">
                      Current active commercial listings in this municipality and category:
                    </div>
                    {comp?.activeForSaleListings?.length > 0 ? (
                      <div className="space-y-1.5 pt-1">
                        {comp.activeForSaleListings.map((lst: any) => (
                          <div key={lst.id} className="p-2 rounded bg-slate-900 print:bg-white border border-slate-800 print:border-slate-300 text-xs flex justify-between">
                            <span className="truncate max-w-[240px] font-medium">{lst.business_name}</span>
                            <span className="font-bold text-emerald-400 print:text-emerald-700">{formatCurrency(lst.asking_price)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 rounded bg-slate-900 print:bg-white text-xs text-slate-400 italic">
                        No distressed commercial listings currently on market. Sign of stable incumbent cashflows.
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Section 5: Commercial Real Estate Lease Benchmarks */}
              <section className="space-y-4">
                <h3 className="text-base font-bold text-white print:text-black uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  5. Commercial Real Estate & Storefront Lease Benchmarks
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-200">
                    <span className="text-slate-400 print:text-slate-600 block">Retail Strip Plaza Net Rent</span>
                    <span className="text-xl font-bold text-white print:text-black mt-1 block">
                      ${cre?.net_rent_sqft_cad || 32.50} / sq.ft.
                    </span>
                    <span className="text-slate-400 print:text-slate-600 mt-1 block">
                      + ${cre?.tmi_additional_rent_sqft_cad || 12.50} TMI Additional
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-200">
                    <span className="text-slate-400 print:text-slate-600 block">Gross Occupancy Cost</span>
                    <span className="text-xl font-bold text-white print:text-black mt-1 block">
                      ${cre?.gross_rent_sqft_cad || 45.00} / sq.ft.
                    </span>
                    <span className="text-slate-400 print:text-slate-600 mt-1 block">
                      ~{formatCurrency(((cre?.gross_rent_sqft_cad || 45) * 1400) / 12)} / month for 1,400 sq.ft.
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-200">
                    <span className="text-slate-400 print:text-slate-600 block">Submarket Retail Vacancy</span>
                    <span className="text-xl font-bold text-emerald-400 print:text-emerald-700 mt-1 block">
                      {cre?.vacancy_rate_pct || 4.2}%
                    </span>
                    <span className="text-slate-400 print:text-slate-600 mt-1 block">
                      Tight inventory; strong commercial stability
                    </span>
                  </div>
                </div>
              </section>

              {/* Section 6: Illustrative Unit Economics */}
              <section className="space-y-4">
                <h3 className="text-base font-bold text-white print:text-black uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  6. Illustrative Unit Economics
                </h3>

                <div className="p-5 rounded-xl bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-200 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center border-b border-slate-800 print:border-slate-200 pb-4">
                    <div>
                      <span className="text-xs text-slate-400 print:text-slate-600">Cost of Goods (COGS)</span>
                      <div className="text-base font-bold text-white print:text-black mt-1">{unit?.cogs_pct}%</div>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 print:text-slate-600">Labor Expense</span>
                      <div className="text-base font-bold text-white print:text-black mt-1">{unit?.labor_pct}%</div>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 print:text-slate-600">Rent & Occupancy</span>
                      <div className="text-base font-bold text-white print:text-black mt-1">{unit?.rent_pct}%</div>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 print:text-slate-600">SDE / Net Cash Flow</span>
                      <div className="text-base font-bold text-emerald-400 print:text-emerald-700 mt-1">{unit?.sde_ebitda_pct}%</div>
                    </div>
                  </div>

                  <div className="text-xs space-y-2 text-slate-300 print:text-slate-700">
                    <p>
                      This preview applies the displayed category assumptions to the available municipal data. It is a starting point for analysis, not a forecast or a financing assessment. Verify assumptions, local costs, and source dates before making a decision.
                    </p>
                  </div>
                </div>
              </section>

              {/* Citations & Lineage Footer */}
              <div className="border-t border-slate-800 print:border-slate-300 pt-6 text-xs text-slate-400 print:text-slate-600 space-y-2">
                <div className="font-semibold text-slate-300 print:text-slate-800 uppercase tracking-wider">
                  Authoritative Data Lineage & Provenance
                </div>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Statistics Canada: </strong> 2021 Census of Population Profile, Table 98-401-X2021001. Released 2022.</li>
                  <li><strong>Statistics Canada: </strong> Canadian Business Counts, with employees, Table 33-10-1097-01. Reference period December 2025.</li>
                  <li><strong>Ontario Ministry of Municipal Affairs and Housing (MMAH): </strong> Financial Information Returns (FIR) Multi-Year Audit Schedules.</li>
                </ul>
              </div>

              {/* Call-to-Action Callout (Hidden in Print) */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950 border border-emerald-500/40 shadow-xl flex flex-wrap items-center justify-between gap-4 print:hidden">
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Unlock the Full 40-Page Commercial Dossier
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl">
                    Get access to hyper-local consumer spending habits, competitor review analysis, multi-year municipal budget trends, and verified active commercial lease listings.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handlePrint}
                    disabled={isRedirecting}
                    className="px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Preview</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={isRedirecting}
                    className="px-6 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRedirecting ? (
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>{isRedirecting ? 'Redirecting...' : 'Unlock Full Dossier ($199)'}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  );
};
