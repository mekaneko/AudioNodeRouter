import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { SlidersHorizontal, Sparkles } from 'lucide-react';
import { AudioNodeData } from '../../types/audio';
import { VUMeter } from '../controls/VUMeter';

interface EffectNodeProps {
  data: AudioNodeData;
}

export const EffectNode: React.FC<EffectNodeProps> = ({ data }) => {
  return (
    <div className="w-56 bg-zinc-900 border border-purple-800/80 rounded-xl shadow-2xl overflow-hidden hover:border-purple-500 transition-all duration-200">
      {/* Input Pin */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        className="!w-3.5 !h-3.5 !bg-blue-400 !border-2 !border-zinc-950 hover:!bg-blue-300"
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-950/70 to-zinc-900 px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span className="font-semibold text-xs tracking-tight text-zinc-100 truncate">
            {data.name || 'Parametric EQ / Comp'}
          </span>
        </div>
        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
          FX
        </span>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2 text-xs text-zinc-400">
        <div className="bg-zinc-950/70 p-2 rounded border border-zinc-800 text-[11px] space-y-1">
          <div className="flex justify-between">
            <span>Low Shelf</span>
            <span className="text-zinc-200 font-mono">+1.5 dB</span>
          </div>
          <div className="flex justify-between">
            <span>Mid Band</span>
            <span className="text-zinc-200 font-mono">-2.0 dB</span>
          </div>
          <div className="flex justify-between">
            <span>High Shelf</span>
            <span className="text-zinc-200 font-mono">+0.5 dB</span>
          </div>
        </div>
      </div>

      {/* Output Pin */}
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        className="!w-3.5 !h-3.5 !bg-emerald-400 !border-2 !border-zinc-950 hover:!bg-emerald-300"
      />
    </div>
  );
};
