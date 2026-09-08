import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Building2, ChevronRight, X } from 'lucide-react';
import { GeographySummary } from '../types/index.js';

interface CitySearchProps {
  selectedCityId: string;
  onSelectCity: (city: GeographySummary) => void;
}

export const CitySearch: React.FC<CitySearchProps> = ({ selectedCityId, onSelectCity }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeographySummary[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentCityName, setCurrentCityName] = useState('Burlington');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load initial city name
  useEffect(() => {
    fetch(`/api/geographies?q=${selectedCityId.replace('CSD_', '')}`)
      .then(res => res.json())
      .then(json => {
        if (json.data && json.data.length > 0) {
          const match = json.data.find((g: any) => g.id === selectedCityId) || json.data[0];
          setCurrentCityName(match.name);
        }
      })
      .catch(() => {});
  }, [selectedCityId]);

  // Query search endpoint
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/geographies?q=${encodeURIComponent(query)}&limit=15`);
        const json = await res.json();
        setResults(json.data || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (city: GeographySummary) => {
    onSelectCity(city);
    setCurrentCityName(city.name);
    setQuery('');
    setIsOpen(false);
  };

  // Escape key to close dropdown
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div className="relative w-full max-w-md" ref={dropdownRef}>
      <div className="relative flex items-center">
        <div className="absolute left-3.5 pointer-events-none text-indigo-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          id="city-search-input"
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-label="Analyze a City Search"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={`Analyze a City (current: ${currentCityName})...`}
          className="w-full pl-10 pr-9 py-2 bg-slate-900/90 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all shadow-inner"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear city search query"
            onClick={() => { setQuery(''); setResults([]); }}
            className="absolute right-3 text-slate-400 hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && (query.trim() || results.length > 0) && (
        <div 
          role="listbox" 
          aria-label="City search suggestions"
          className="absolute z-50 mt-2 w-full bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden divide-y divide-white/5 animate-in fade-in-50 duration-100 max-h-80 overflow-y-auto"
        >
          {loading && (
            <div className="p-3.5 text-center text-xs text-slate-300">Searching 444 Ontario municipalities...</div>
          )}

          {!loading && results.length === 0 && query.trim() && (
            <div className="p-3.5 text-center text-xs text-slate-300">
              No municipality matching &ldquo;{query}&rdquo; found.
            </div>
          )}

          {!loading && results.map(city => (
            <button
              key={city.id}
              type="button"
              role="option"
              aria-selected={city.id === selectedCityId}
              onClick={() => handleSelect(city)}
              className="w-full px-3.5 py-2.5 text-left flex items-center justify-between hover:bg-white/5 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-slate-800 text-indigo-400 group-hover:bg-indigo-950/80 transition-colors border border-white/5">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-100 group-hover:text-white flex items-center gap-1.5">
                    <span>{city.name}</span>
                    <span className="text-xs text-slate-400 font-normal">({city.csd_type})</span>
                  </div>
                  <div className="text-xs text-slate-300">
                    {city.census_division} {city.population_2021 ? `• Pop: ${city.population_2021.toLocaleString()}` : ''}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
