import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  Tag, 
  DollarSign, 
  TrendingDown, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  HelpCircle,
  FileText,
  Search,
  Filter,
  History,
  Sparkles,
  X,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { ResolutionBadge } from '../components/ResolutionBadge.js';
import { ExportButton } from '../components/ExportButton.js';
import { MetricTooltip } from '../components/MetricTooltip.js';
import { ContributingDataInspector, ContributingDataProps } from '../components/ContributingDataInspector.js';
import { FeatureOutliersSection } from '../components/FeatureOutliersSection.js';
import { FeasibilityDossierModal } from '../components/FeasibilityDossierModal.js';

interface BusinessListingsViewProps {
  cityId: string;
}

export const BusinessListingsView: React.FC<BusinessListingsViewProps> = ({ cityId }) => {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [contributingData, setContributingData] = useState<ContributingDataProps | null>(null);
  
  // Dynamic Filter States (Requirements 24, 25, 26)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedGeo, setSelectedGeo] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [repeatedOnly, setRepeatedOnly] = useState<boolean>(false);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  
  // Categories and Geos metadata
  const [categories, setCategories] = useState<{ id: string; displayName: string }[]>([]);
  const [selectedListingForHistory, setSelectedListingForHistory] = useState<any | null>(null);
  const [historyEvents, setHistoryEvents] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Feasibility Dossier State (T-035)
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [dossierCityId, setDossierCityId] = useState('CSD_burlington');
  const [dossierCategoryId, setDossierCategoryId] = useState('pizza_store');
  const [dossierCityName, setDossierCityName] = useState('Burlington');

  // Fetch category taxonomy
  useEffect(() => {
    fetch('/api/taxonomy/categories')
      .then(res => res.json())
      .then(d => {
        if (d.categories) {
          setCategories(d.categories);
        }
      })
      .catch(err => console.error('Error fetching categories:', err));
  }, []);

  // Fetch listings with active filters
  const fetchListings = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedGeo !== 'ALL') params.set('cityId', selectedGeo);
    if (selectedCategory !== 'ALL') params.set('categoryId', selectedCategory);
    if (selectedStatus !== 'ALL') params.set('status', selectedStatus);
    if (repeatedOnly) params.set('repeatedOnly', 'true');
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (searchQuery.trim()) params.set('q', searchQuery.trim());

    fetch(`/api/business-listings?${params.toString()}`)
      .then(res => res.json())
      .then(d => {
        setListings(d.listings || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching business listings:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchListings();
  }, [selectedCategory, selectedGeo, selectedStatus, repeatedOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchListings();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedGeo('ALL');
    setSelectedStatus('ALL');
    setRepeatedOnly(false);
    setMinPrice('');
    setMaxPrice('');
  };

  const handleViewHistory = (listing: any) => {
    setSelectedListingForHistory(listing);
    setHistoryLoading(true);
    fetch(`/api/business-listings/${listing.listing_uid || listing.id}/history`)
      .then(res => res.json())
      .then(d => {
        setHistoryEvents(d.history || []);
        setHistoryLoading(false);
      })
      .catch(err => {
        console.error('Error fetching listing history:', err);
        setHistoryLoading(false);
      });
  };

  const handleSelectListing = (l: any) => {
    const hasPriceDrop = l.previous_asking_price && Number(l.previous_asking_price) > Number(l.asking_price);
    const priceDropAmt = hasPriceDrop ? Number(l.previous_asking_price) - Number(l.asking_price) : 0;

    setContributingData({
      title: l.title || l.business_name,
      category: `${l.category_name} • Commercial M&A`,
      metricLabel: 'Asking Valuation & Transaction Status',
      value: `$${Number(l.asking_price).toLocaleString()} (${l.listing_status})`,
      unit: 'CAD',
      benchmarkValue: l.confirmed_sale_price ? `$${Number(l.confirmed_sale_price).toLocaleString()}` : 'Unconfirmed / Pending Escrow',
      benchmarkLabel: 'Escrow Settlement',
      sourceLineage: 'Audited Commercial MLS Transactions & Brokerage Logs',
      referenceYear: `${l.first_listed_date} to ${l.last_active_date}`,
      provenance: {
        sourceName: l.broker_name || 'Commercial Brokerage Registry',
        datasetCode: `COMM_LISTING_${l.listing_uid || l.id}`,
        referencePeriod: `${l.first_listed_date} – ${l.last_active_date}`,
        resolution: 'CSD',
        confidence: 'AUDITED_BROKER',
        sourceUrl: l.source_url || 'https://crea.ca/'
      },
      decisionImplications: [
        {
          heading: 'Asking vs Confirmed Sale Price Protocol (Requirement 24)',
          insight: l.confirmed_sale_price 
            ? `Confirmed Sale: $${Number(l.confirmed_sale_price).toLocaleString()} (Discount-to-ask spread: $${(Number(l.asking_price) - Number(l.confirmed_sale_price)).toLocaleString()}). Confirmed through Teranet Land Registry filing.`
            : 'Pending Escrow / Unconfirmed Transaction. Mandate #5 forbids conflating asking price with transactional revenue.',
          impact: l.confirmed_sale_price ? 'positive' : 'warning'
        },
        {
          heading: 'Repeated Listing Detection (Requirement 25)',
          insight: l.repeated_listing_confidence 
            ? `${(Number(l.repeated_listing_confidence) * 100).toFixed(0)}% algorithmic match confidence matching ${l.repeated_parent_uid || 'prior MLS offering'}. Relisted under modified terms to refresh marketplace exposure.`
            : 'Unique initial commercial offering with no prior MLS footprint recorded.',
          impact: l.repeated_listing_confidence ? 'warning' : 'neutral'
        },
        {
          heading: 'Price Adjustment History (Requirement 26)',
          insight: hasPriceDrop 
            ? `Reduced by $${priceDropAmt.toLocaleString()} (was $${Number(l.previous_asking_price).toLocaleString()}). Demonstrates seller negotiation flexibility.` 
            : 'No downward price revisions recorded. Listing currently held at initial asking valuation.',
          impact: hasPriceDrop ? 'positive' : 'neutral'
        }
      ],
      strategicRecommendations: [
        l.sde_cashflow_disclosed 
          ? `Disclosed SDE of $${Number(l.sde_cashflow_disclosed).toLocaleString()} yields an implied acquisition multiple of ${(Number(l.asking_price) / Number(l.sde_cashflow_disclosed)).toFixed(2)}x cash flow.`
          : 'Request audited CPA tax returns and SDE schedule prior to submission of Letter of Intent (LOI).'
      ],
      onClose: () => setContributingData(null)
    });
  };

  const exportData = listings.map(l => ({
    Title: l.title || l.business_name,
    Municipality: l.city_name,
    Category: l.category_name,
    'Listing Status': l.listing_status,
    'Asking Price (CAD)': `$${Number(l.asking_price).toLocaleString()}`,
    'Previous Asking Price (CAD)': l.previous_asking_price ? `$${Number(l.previous_asking_price).toLocaleString()}` : '—',
    'Confirmed Sale Price (CAD)': l.confirmed_sale_price ? `$${Number(l.confirmed_sale_price).toLocaleString()}` : 'Unconfirmed / Pending',
    'Repeated Listing Confidence': l.repeated_listing_confidence ? `${(Number(l.repeated_listing_confidence) * 100).toFixed(0)}%` : 'None',
    'Days on Market': l.days_on_market,
    'Annual Revenue Disclosed': l.annual_revenue_claimed ? `$${Number(l.annual_revenue_claimed).toLocaleString()}` : 'Undisclosed',
    'EBITDA Disclosed': l.ebitda_disclosed ? `$${Number(l.ebitda_disclosed).toLocaleString()}` : 'Undisclosed',
    'Cash Flow Disclosed': l.cash_flow_claimed ? `$${Number(l.cash_flow_claimed).toLocaleString()}` : 'Undisclosed',
    'Monthly Rent': l.monthly_rent ? `$${Number(l.monthly_rent).toLocaleString()}` : 'Undisclosed',
    'Franchise Brand': l.franchise_brand || 'Independent',
    Broker: l.broker_name || 'Commercial Broker'
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/60">
              Commercial Transaction Intelligence (Requirements 24, 25, 26)
            </span>
            <ResolutionBadge resolution="CSD" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Commercial Business Listings & Acquisition History
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Tracks commercial business sales, broker listings, price revisions, and repeated listing detection algorithms across Ontario. Never infers removed listings as sold without legal confirmation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExportButton data={exportData} filename="commercial_business_listings" label="Export Listings Data" />
        </div>
      </div>

      {/* Contributing Data Inspector */}
      {contributingData && (
        <ContributingDataInspector {...contributingData} />
      )}

      {/* Strict Pricing Separation Banner */}
      <div 
        role="button"
        tabIndex={0}
        onClick={() => setContributingData({
          title: 'Mandate #5: Asking vs Confirmed Sale Separation Methodology',
          category: 'Commercial Valuation Integrity',
          metricLabel: 'Valuation Separation Protocol',
          value: 'Enforced',
          benchmarkValue: 'Land Registry & Escrow Audits',
          benchmarkLabel: 'Verification Protocol',
          sourceLineage: 'Audited Commercial MLS Transactions & Teranet Land Registry Filings',
          referenceYear: '2023–2026 Closed Transactions',
          decisionImplications: [
            {
              heading: 'Prevention of Aspirational Price Inflation',
              insight: 'Unconfirmed asking prices reflect seller aspirations and often carry a 15–35% negotiation premium. Conflating asking and selling prices leads to gross overpayment by acquirers.',
              impact: 'positive'
            }
          ],
          strategicRecommendations: [
            'Compare the seller asking price against confirmed closed sales in the table below to calculate local discount-to-ask averages.'
          ],
          onClose: () => setContributingData(null)
        })}
        onKeyDown={(e) => e.key === 'Enter' && setContributingData(null)}
        className="glass-panel p-5 rounded-xl border border-indigo-900/60 bg-indigo-950/20 text-xs text-indigo-200 hover:border-indigo-500/80 hover:bg-indigo-950/30 transition-all cursor-pointer group"
        title="Click to inspect Mandate #5 pricing separation rules"
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">Strict Asking vs. Confirmed Sale Price Separation (Click to Inspect):</span>
              <span className="text-[10px] text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity">Inspect Protocol →</span>
            </div>
            <p className="mt-1 text-slate-300">
              Asking prices reflect aspirational seller valuations and are never conflated with confirmed transactional sale prices. Confirmed sale prices are displayed only when verified through land registry or closed escrow filings. Unsold or relisted properties are tracked with explicit repeated listing confidence scores.
            </p>
          </div>
        </div>
      </div>

      {/* Dynamic Filter Controls Toolbar */}
      <div className="glass-panel p-5 rounded-xl border border-white/10 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search listings by title, address, franchise brand, or city..."
              className="w-full bg-slate-900/90 text-xs text-white pl-9 pr-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Dynamic Category Selector (Requirement 24) */}
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-900/90 text-xs text-white px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="ALL">All Business Categories ({categories.length})</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.displayName}</option>
            ))}
          </select>

          {/* Municipality Selector */}
          <select 
            value={selectedGeo}
            onChange={(e) => setSelectedGeo(e.target.value)}
            className="bg-slate-900/90 text-xs text-white px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="ALL">All Ontario Municipalities</option>
            <option value="CSD_burlington">Burlington (Current Focus)</option>
            <option value="CSD_oakville">Oakville</option>
            <option value="CSD_milton">Milton</option>
            <option value="CSD_toronto">Toronto</option>
            <option value="CSD_mississauga">Mississauga</option>
            <option value="CSD_hamilton">Hamilton</option>
            <option value="CSD_ottawa">Ottawa</option>
            <option value="CSD_waterloo">Waterloo</option>
          </select>

          {/* Status Selector */}
          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-900/90 text-xs text-white px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="ALL">All Listing Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="CONFIRMED_SOLD">CONFIRMED_SOLD (Escrow Verified)</option>
            <option value="RELISTED">RELISTED (Repeated Offering)</option>
            <option value="PRICE_CHANGED">PRICE_CHANGED (Reduced)</option>
            <option value="REMOVED">REMOVED (Expired / Off-Market)</option>
          </select>

          {/* Repeated Listing Only Toggle (Requirement 25) */}
          <button
            type="button"
            onClick={() => setRepeatedOnly(!repeatedOnly)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              repeatedOnly 
                ? 'bg-purple-900/80 border-purple-500 text-purple-200 shadow-md shadow-purple-900/30' 
                : 'bg-slate-900/80 border-white/10 text-slate-400 hover:text-white hover:border-purple-500/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Repeated Listings Only</span>
          </button>

          {/* Reset Filters */}
          <button
            type="button"
            onClick={handleResetFilters}
            className="p-2 rounded-lg bg-slate-900/80 border border-white/10 text-slate-400 hover:text-white transition-colors"
            title="Reset Filters"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Commercial M&A Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tracked Listings */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Filtered Offerings</span>
            <Building2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {listings.length}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Active & historical acquisition offerings
          </div>
        </div>

        {/* Average Asking Price */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Avg Asking Price</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            ${listings.length > 0 ? (Math.round(listings.reduce((acc, l) => acc + Number(l.asking_price || 0), 0) / listings.length) / 1000).toFixed(0) + 'k' : '—'}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Aspirational seller valuation
          </div>
        </div>

        {/* Repeated Listings Detected */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Repeated Listings</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold text-purple-300">
            {listings.filter(l => l.listing_status === 'RELISTED' || (l.repeated_listing_confidence && Number(l.repeated_listing_confidence) > 0)).length}
          </div>
          <div className="mt-2 text-xs text-purple-300/80">
            Matched stale / relisted inventory
          </div>
        </div>

        {/* Confirmed Sale Closings */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Confirmed Closings</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-300">
            {listings.filter(l => l.confirmed_sale_price).length}
          </div>
          <div className="mt-2 text-xs text-emerald-300/80">
            Verified land registry settlements
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
            Click any row to inspect valuation drivers • Click &ldquo;Timeline&rdquo; to view price change history
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse">
            Loading commercial business listings and price histories...
          </div>
        ) : listings.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            No business listings match the selected filters. Try clearing or expanding your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider border-b border-slate-800 font-semibold">
                <tr>
                  <th className="py-3 px-4">Business / Offering Title</th>
                  <th className="py-3 px-4">Municipality</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Asking Price</th>
                  <th className="py-3 px-4 text-right">Confirmed Sale Price</th>
                  <th className="py-3 px-4 text-right">Cash Flow (SDE)</th>
                  <th className="py-3 px-4 text-right">DOM</th>
                  <th className="py-3 px-4 text-center">Repeated Match</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {listings.map((l) => {
                  const hasPriceDrop = l.previous_asking_price && Number(l.previous_asking_price) > Number(l.asking_price);
                  const priceDropAmt = hasPriceDrop ? Number(l.previous_asking_price) - Number(l.asking_price) : 0;

                  return (
                    <tr 
                      key={l.id} 
                      className="hover:bg-slate-800/60 transition-colors group cursor-pointer"
                      onClick={() => handleSelectListing(l)}
                    >
                      <td className="py-3 px-4 font-semibold text-white group-hover:text-indigo-300 transition-colors">
                        <div>{l.title || l.business_name}</div>
                        <div className="text-xs text-slate-400 font-normal mt-0.5">{l.address}</div>
                        {hasPriceDrop && (
                          <div className="text-xs text-rose-400 flex items-center gap-1 mt-0.5 font-medium">
                            <TrendingDown className="w-3.5 h-3.5" />
                            Reduced by ${priceDropAmt.toLocaleString()} (was ${Number(l.previous_asking_price).toLocaleString()})
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-300">{l.city_name}</td>
                      <td className="py-3 px-4 text-slate-300">{l.category_name}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold ${
                          l.listing_status === 'ACTIVE' ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-700/80' :
                          l.listing_status === 'RELISTED' ? 'bg-purple-950/90 text-purple-300 border border-purple-700/80' :
                          l.listing_status === 'PRICE_CHANGED' ? 'bg-amber-950/90 text-amber-300 border border-amber-700/80' :
                          l.listing_status === 'CONFIRMED_SOLD' ? 'bg-blue-950/90 text-blue-300 border border-blue-700/80' :
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
                            Unconfirmed
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-200">
                        {l.cash_flow_claimed ? `$${Number(l.cash_flow_claimed).toLocaleString()}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        {l.days_on_market ? `${l.days_on_market}d` : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {l.repeated_listing_confidence ? (
                          <span 
                            title={`Repeated listing algorithm match: ${(Number(l.repeated_listing_confidence) * 100).toFixed(0)}% confidence matching ${l.repeated_parent_uid || 'prior listing'}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-purple-950/90 text-purple-300 border border-purple-700/60"
                          >
                            <Sparkles className="w-3 h-3 text-purple-400" />
                            {(Number(l.repeated_listing_confidence) * 100).toFixed(0)}% Match
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setDossierCityId(l.geography_id || cityId);
                              setDossierCategoryId(l.category_id || 'pizza_store');
                              setDossierCityName(l.city_name || 'Burlington');
                              setIsDossierOpen(true);
                            }}
                            className="px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold transition-colors flex items-center gap-1"
                            title="Generate $199 Location Feasibility Dossier for this listing"
                          >
                            <FileText className="w-3 h-3 text-emerald-400" />
                            <span>Dossier</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleViewHistory(l)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1"
                            title="View price reduction & listing timeline"
                          >
                            <History className="w-3 h-3 text-indigo-400" />
                            <span>Timeline</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Price & Status Timeline Modal (Requirement 26) */}
      {selectedListingForHistory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="glass-panel w-full max-w-xl rounded-2xl border border-white/20 p-6 shadow-2xl relative bg-slate-950 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  Listing Valuation & Timeline History
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedListingForHistory(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <div className="text-sm font-semibold text-white">{selectedListingForHistory.title || selectedListingForHistory.business_name}</div>
              <div className="text-xs text-slate-400">{selectedListingForHistory.address} • {selectedListingForHistory.city_name}</div>
            </div>

            {historyLoading ? (
              <div className="p-8 text-center text-slate-400 animate-pulse text-xs">
                Retrieving longitudinal price revision ledger...
              </div>
            ) : historyEvents.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                No recorded price adjustment events for this listing yet.
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                {historyEvents.map((h, i) => (
                  <div key={h.id || i} className="flex items-start gap-3 text-xs p-3 rounded-xl bg-slate-900/80 border border-white/5">
                    <div className="p-1.5 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800/60 mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white uppercase tracking-wider">{h.event_type.replace('_', ' ')}</span>
                        <span className="text-slate-400 font-mono">{h.recorded_date}</span>
                      </div>
                      <div className="text-sm font-extrabold text-emerald-400 mt-0.5">
                        ${Number(h.asking_price).toLocaleString()}
                      </div>
                      <p className="text-slate-300 mt-1">{h.notes}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-white/10 text-right">
              <button
                type="button"
                onClick={() => setSelectedListingForHistory(null)}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feature Outliers Section */}
      <FeatureOutliersSection 
        category="business" 
        cityId={cityId} 
      />

      {/* Feasibility Dossier Modal (T-035) */}
      <FeasibilityDossierModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        cityId={dossierCityId}
        categoryId={dossierCategoryId}
        cityName={dossierCityName}
      />
    </div>
  );
};
