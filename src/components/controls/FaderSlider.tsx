import React from 'react';

interface FaderSliderProps {
  value: number; // 0.0 to 2.0 (1.0 = 0dB)
  onChange: (value: number) => void;
  disabled?: boolean;
}

export const FaderSlider: React.FC<FaderSliderProps> = ({ value, onChange, disabled }) => {
  // Linear gain to Decibels
  const formatDb = (gain: number): string => {
    if (gain <= 0.001) return '-∞ dB';
    const db = 20 * Math.log10(gain);
    if (Math.abs(db) < 0.1) return '0.0 dB';
    return `${db > 0 ? '+' : ''}${db.toFixed(1)} dB`;
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex justify-between items-center text-[10px] text-zinc-400 font-mono">
        <span>VOL</span>
        <span className={value > 1.0 ? 'text-amber-400 font-bold' : ''}>
          {formatDb(value)}
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="2"
        step="0.01"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
      />
    </div>
  );
};
