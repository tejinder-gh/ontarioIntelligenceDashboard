import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface MetricTooltipProps {
  name?: string;
  definition?: string;
  unit?: string;
  source?: string;
  period?: string;
  formula?: string;
  limitations?: string;
  content?: string;
}

export const MetricTooltip: React.FC<MetricTooltipProps> = ({
  name = 'Metric Details',
  definition,
  unit,
  source,
  period,
  formula,
  limitations,
  content
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block ml-1">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
        aria-label={`Documentation for ${name}`}
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-slate-900 border border-slate-700 rounded-lg shadow-xl text-left text-xs text-slate-200 pointer-events-none animate-in fade-in zoom-in-95 duration-100">
          <div className="font-semibold text-slate-100 mb-1 border-b border-slate-800 pb-1 flex justify-between">
            <span>{name}</span>
            {unit && <span className="text-slate-400 font-mono">[{unit}]</span>}
          </div>
          <p className="text-slate-300 mb-2">{content || definition}</p>
          {formula && (
            <div className="mb-1 text-xs text-slate-300">
              <span className="text-slate-400 font-medium">Formula: </span>
              <code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-300 font-mono">{formula}</code>
            </div>
          )}
          <div className="text-xs text-slate-300">
            <span className="text-slate-400 font-medium">Source: </span>
            <span>{source} {period ? `(${period})` : ''}</span>
          </div>
          {limitations && (
            <div className="mt-1.5 pt-1.5 border-t border-slate-800 text-xs text-amber-300 leading-snug">
              <span className="font-semibold text-amber-400">Limitations: </span>
              {limitations}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
