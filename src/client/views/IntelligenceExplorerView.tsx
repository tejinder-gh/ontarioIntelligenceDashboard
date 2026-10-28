import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Building2,
  CheckCircle2,
  Phone,
  Mail,
  Globe,
  MapPin,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Business360Drawer } from '../components/Business360Drawer.js';

export const IntelligenceExplorerView: React.FC = () => {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [hasPhoneOnly, setHasPhoneOnly] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);

  const fetchBusinesses = () => {
    setLoading(true);
    const params = new URLSearchParams({
      limit: '50',
      city: selectedCity,
      category_id: selectedCategory,
      verification_status: verificationFilter,
      has_phone: hasPhoneOnly ? 'true' : 'false',
      search,
    });

    fetch(`/api/intelligence/businesses?${params.toString()}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setBusinesses(res.data.businesses);
          setTotal(res.data.total);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBusinesses();
  }, [selectedCity, selectedCategory, verificationFilter, hasPhoneOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBusinesses();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Stats Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
              National Intelligence Core
            </span>
            <span className="text-xs text-slate-400">• Halton & Ontario Live Corpus</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Intelligence Explorer</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Discover, audit, and inspect real canonical commercial entities across Halton Region and Ontario with field-level provenance and independent verification.
          </p>
        </div>

        <div className="flex gap-4">
          <div className="px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-center min-w-[110px]">
            <span className="text-[11px] text-slate-500 uppercase block font-semibold">Canonical Places</span>
            <span className="text-xl font-bold text-white">{total.toLocaleString()}</span>
          </div>
          <div className="px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-center min-w-[110px]">
            <span className="text-[11px] text-slate-500 uppercase block font-semibold">Active Filter</span>
            <span className="text-xl font-bold text-indigo-400">{businesses.length}</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search business name, address, or corridor..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </form>

        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
        >
          <option value="all">All Municipalities</option>
          <option value="Burlington">Burlington (Halton)</option>
          <option value="Oakville">Oakville (Halton)</option>
          <option value="Milton">Milton (Halton)</option>
          <option value="Halton Hills">Halton Hills (Halton)</option>
          <option value="Toronto">Toronto</option>
        </select>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
        >
          <option value="all">All Industries</option>
          <option value="pizza_store">Pizza & Restaurants</option>
          <option value="coffee_shop">Coffee & Cafes</option>
          <option value="automotive_repair">Automotive Service</option>
          <option value="child_daycare">Child Daycare</option>
          <option value="gym_fitness">Gyms & Fitness</option>
          <option value="medical_clinic">Medical / Dental</option>
          <option value="home_services">Home & Contracting</option>
          <option value="professional_services">Professional Services</option>
        </select>

        <select
          value={verificationFilter}
          onChange={(e) => setVerificationFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
        >
          <option value="all">All Verification States</option>
          <option value="UNVERIFIED">Unverified Only</option>
          <option value="VERIFIED_ACTIVE">Verified Active Only</option>
        </select>

        <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={hasPhoneOnly}
            onChange={(e) => setHasPhoneOnly(e.target.checked)}
            className="rounded bg-slate-950 border-slate-800 text-indigo-500 focus:ring-0"
          />
          <span>Has Direct Phone</span>
        </label>
      </div>

      {/* Results Table */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : businesses.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No business locations match the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Business Name & Category</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Contact Signals</th>
                  <th className="py-3 px-4">Quality Score</th>
                  <th className="py-3 px-4">Verification Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {businesses.map((biz) => (
                  <tr
                    key={biz.id}
                    onClick={() => setSelectedBusinessId(biz.id)}
                    className="hover:bg-slate-800/50 cursor-pointer transition"
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{biz.name}</div>
                      <span className="text-[11px] text-slate-400">
                        {biz.category_name || biz.category_id}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div>{biz.address || 'Address unlisted'}</div>
                      <div className="text-[11px] text-slate-500">{biz.city}, ON {biz.postal_code || ''}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-slate-400">
                        {biz.phone && <span title={biz.phone}><Phone className="w-3.5 h-3.5 text-emerald-400" /></span>}
                        {biz.email && <span title={biz.email}><Mail className="w-3.5 h-3.5 text-indigo-400" /></span>}
                        {biz.website && <span title={biz.website}><Globe className="w-3.5 h-3.5 text-cyan-400" /></span>}
                        {!biz.phone && !biz.email && !biz.website && <span className="text-[11px] text-slate-600">None</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                        biz.quality_score >= 80
                          ? 'bg-emerald-950 text-emerald-300'
                          : biz.quality_score >= 60
                            ? 'bg-indigo-950 text-indigo-300'
                            : 'bg-amber-950 text-amber-300'
                      }`}>
                        {Number(biz.quality_score).toFixed(0)}/100
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        biz.verification_status === 'VERIFIED_ACTIVE'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                      }`}>
                        {biz.verification_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button className="text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1">
                        <span>Inspect</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 360 Drawer */}
      {selectedBusinessId && (
        <Business360Drawer
          businessId={selectedBusinessId}
          onClose={() => setSelectedBusinessId(null)}
          onVerified={fetchBusinesses}
        />
      )}
    </div>
  );
};
