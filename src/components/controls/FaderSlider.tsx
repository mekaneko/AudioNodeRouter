import React, { useCallback } from 'react';

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

  // Prevent event propagation so React Flow canvas won't drag when using slider
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(1.0); // Reset to 0dB on double click
  }, [onChange]);

  return (
    <div
      className="nodrag nopan window-no-drag flex flex-col gap-1 w-full select-none cursor-default"
      onPointerDown={handlePointerDown}
    >
      <div className="flex justify-between items-center text-[10px] text-zinc-400 font-mono">
        <span className="text-zinc-500 font-semibold">GAIN</span>
        <span
          onDoubleClick={handleDoubleClick}
          title="ダブルクリックで 0.0 dB にリセット"
          className={`cursor-pointer px-1 rounded transition-colors ${
            value > 1.0 ? 'text-amber-400 font-bold' : value < 0.05 ? 'text-zinc-500' : 'text-zinc-200'
          }`}
        >
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
        onChange={(e) => {
          e.stopPropagation();
          onChange(parseFloat(e.target.value));
        }}
        onPointerDown={handlePointerDown}
        className="nodrag nopan w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
      />
    </div>
  );
};
