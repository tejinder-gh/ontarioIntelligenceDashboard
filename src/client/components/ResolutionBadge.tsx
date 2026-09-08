import React from 'react';
import { MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ResolutionBadgeProps {
  resolution: string;
  isBenchmark?: boolean;
  benchmarkLabel?: string | null;
  className?: string;
}

export const ResolutionBadge: React.FC<ResolutionBadgeProps> = ({
  resolution,
  isBenchmark,
  benchmarkLabel,
  className = ''
}) => {
  if (isBenchmark || resolution === 'PROVINCE' || resolution === 'CMA') {
    return (
      <span 
        title={benchmarkLabel || `${resolution} Benchmark — municipal data unavailable`}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-950/70 text-amber-300 border border-amber-800/60 ${className}`}
      >
        <AlertCircle className="w-3 h-3 text-amber-400" />
        {resolution === 'PROVINCE' ? 'Ontario Benchmark' : `${resolution} Benchmark`}
      </span>
    );
  }

  return (
    <span 
      title="Observed at Census Subdivision (CSD) / Municipality Resolution"
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 ${className}`}
    >
      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
      CSD Observed
    </span>
  );
};
