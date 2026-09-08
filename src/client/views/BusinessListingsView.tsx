import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Tag, 
  DollarSign, 
  TrendingDown, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  HelpCircle,
  FileText
} from 'lucide-react';
import { ResolutionBadge } from '../components/ResolutionBadge.js';
import { ExportButton } from '../components/ExportButton.js';
import { MetricTooltip } from '../components/MetricTooltip.js';

interface BusinessListingsViewProps {
  cityId: string;
}

export const BusinessListingsView: React.FC<BusinessListingsViewProps> = ({ cityId }) => {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/business-listings`)
      .then(res => res.json())
      .then(d => {
        setListings(d.listings || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching business listings:', err);
        setLoading(false);
      });
  }, [cityId]);

  const exportData = listings.map(l => ({
    Title: l.title,
    Municipality: l.city_name,
    Category: l.category_name,
    'Listing Status': l.listing_status,
    'Asking Price (CAD)': `$${Number(l.asking_price).toLocaleString()}`,
    'Confirmed Sale Price (CAD)': l.confirmed_sale_price ? `$${Number(l.confirmed_sale_price).toLocaleString()}` : 'Unconfirmed / Pending',
    'Repeated Listing Confidence': l.repeated_listing_confidence ? `${(l.repeated_listing_confidence * 100).toFixed(0)}%` : 'None',
    'Days on Market': l.days_on_market,
    'Annual Revenue Disclosed': l.annual_revenue_claimed ? `$${Number(l.annual_revenue_claimed).toLocaleString()}` : 'Undisclosed',
    'Cash Flow Disclosed': l.cash_flow_claimed ? `$${Number(l.cash_flow_claimed).toLocaleString()}` : 'Undisclosed'
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/60">
              Commercial Transaction Intelligence
            </span>
            <ResolutionBadge resolution="CSD" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Commercial Business Listings & Acquisition History
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Tracks commercial business sales, broker listings, and price modifications across Ontario. Integrates repeated listing detection algorithms to surface stale inventory and seller negotiation leverage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExportButton data={exportData} filename="commercial_business_listings" label="Export Listings Data" />
        </div>
      </div>

      {/* Critical Pricing Separation Mandate Banner */}
      <div className="glass-panel p-5 rounded-xl border border-indigo-900/60 bg-indigo-950/20 text-xs text-indigo-200">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white">Strict Asking vs. Confirmed Sale Price Separation (Mandate #5):</span>
            <p className="mt-1 text-slate-300">
              Asking prices reflect aspirational seller valuations and are never conflated with confirmed transactional sale prices. Confirmed sale prices are displayed only when verified through land registry or closed escrow filings. Unsold or relisted properties are tracked with explicit repeated listing confidence scores.
            </p>
          </div>
        </div>
      </div>

      {/* Listings Inventory Table */}
      <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-400" />
            Active & Historical Commercial Business Listings ({listings.length})
          </h3>
          <span className="text-xs text-slate-400">
            Source: Commercial MLS & Brokerage Transaction Logs
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse">
            Loading commercial business listings and price histories...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Business / Listing Title</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Asking Price</th>
                  <th className="py-3 px-4 text-right">Confirmed Sale Price</th>
                  <th className="py-3 px-4 text-right">DOM</th>
                  <th className="py-3 px-4 text-center">Relisted Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {listings.map((l) => {
                  const hasPriceDrop = l.previous_asking_price && Number(l.previous_asking_price) > Number(l.asking_price);
                  const priceDropAmt = hasPriceDrop ? Number(l.previous_asking_price) - Number(l.asking_price) : 0;

                  return (
                    <tr key={l.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white">
                        <div>{l.title}</div>
                        <div className="text-[11px] text-slate-400 font-normal mt-0.5">{l.address}</div>
                        {hasPriceDrop && (
                          <div className="text-[10px] text-rose-400 flex items-center gap-1 mt-0.5">
                            <TrendingDown className="w-3 h-3" />
                            Reduced by ${priceDropAmt.toLocaleString()} (was ${Number(l.previous_asking_price).toLocaleString()})
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-300">{l.city_name}</td>
                      <td className="py-3 px-4 text-slate-400">{l.category_name}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          l.listing_status === 'ACTIVE' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                          l.listing_status === 'RELISTED' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                          l.listing_status === 'CONFIRMED_SOLD' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {l.listing_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-white">
                        ${Number(l.asking_price).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {l.confirmed_sale_price ? (
                          <span className="text-emerald-400 font-bold">
                            ${Number(l.confirmed_sale_price).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">
                            Unconfirmed / Active
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400">
                        {l.days_on_market ? `${l.days_on_market}d` : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {l.repeated_listing_confidence ? (
                          <span 
                            title={`Repeated listing algorithm match: ${(l.repeated_listing_confidence * 100).toFixed(0)}% confidence`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-950 text-purple-300 border border-purple-800/60"
                          >
                            {(l.repeated_listing_confidence * 100).toFixed(0)}% Match
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
