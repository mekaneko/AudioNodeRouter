import React from 'react';

interface VUMeterProps {
  peakL: number; // 0.0 to 1.0
  peakR: number; // 0.0 to 1.0
  height?: number;
}

export const VUMeter: React.FC<VUMeterProps> = ({ peakL, peakR, height = 70 }) => {
  // Convert 0.0 ~ 1.0 to percentage
  const pctL = Math.min(100, Math.round(peakL * 100));
  const pctR = Math.min(100, Math.round(peakR * 100));

  const getSegmentColor = (pct: number) => {
    if (pct > 90) return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]';
    if (pct > 75) return 'bg-amber-400';
    return 'bg-emerald-500';
  };

  return (
    <div className="flex items-center gap-1.5 bg-zinc-950/80 p-1.5 rounded border border-zinc-800">
      {/* Channel L */}
      <div className="flex flex-col items-center">
        <span className="text-[9px] font-mono text-zinc-500">L</span>
        <div 
          className="w-2.5 bg-zinc-900 rounded-sm relative overflow-hidden flex flex-col justify-end"
          style={{ height: `${height}px` }}
        >
          {/* Meter Bar */}
          <div
            className={`w-full transition-all duration-75 rounded-b-sm ${getSegmentColor(pctL)}`}
            style={{ height: `${pctL}%` }}
          />
        </div>
      </div>

      {/* Channel R */}
      <div className="flex flex-col items-center">
        <span className="text-[9px] font-mono text-zinc-500">R</span>
        <div 
          className="w-2.5 bg-zinc-900 rounded-sm relative overflow-hidden flex flex-col justify-end"
          style={{ height: `${height}px` }}
        >
          {/* Meter Bar */}
          <div
            className={`w-full transition-all duration-75 rounded-b-sm ${getSegmentColor(pctR)}`}
            style={{ height: `${pctR}%` }}
          />
        </div>
      </div>
    </div>
  );
};
