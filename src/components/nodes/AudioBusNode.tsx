import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { ArrowRightLeft } from 'lucide-react';
import { AudioNodeData } from '../../types/audio';
import { VUMeter } from '../controls/VUMeter';
import { FaderSlider } from '../controls/FaderSlider';
import { useAudioGraphStore } from '../../store/useAudioGraphStore';

interface AudioBusNodeProps {
  data: AudioNodeData;
}

export const AudioBusNode: React.FC<AudioBusNodeProps> = ({ data }) => {
  const updateGain = useAudioGraphStore((s) => s.updateNodeGain);
  const toggleMute = useAudioGraphStore((s) => s.toggleNodeMute);
  const toggleSolo = useAudioGraphStore((s) => s.toggleNodeSolo);

  return (
    <div className="w-64 bg-zinc-900 border border-indigo-700/70 rounded-xl shadow-2xl overflow-hidden hover:border-indigo-400 transition-all duration-200">
      {/* Input Pin (Left) */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        className="!w-4 !h-4 !bg-blue-400 !border-2 !border-zinc-950 hover:!bg-blue-300"
      />

      {/* Node Header */}
      <div className="bg-gradient-to-r from-indigo-950/80 to-zinc-900 px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="font-semibold text-xs tracking-tight text-zinc-100 truncate">
            {data.name}
          </span>
        </div>
        <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
          BYPASS {data.busNumber ?? '#'}
        </span>
      </div>

      {/* Node Body */}
      <div className="p-3 space-y-2.5 nodrag">
        <div className="text-[10px] text-zinc-400 font-mono">
          <span>パススルー中継 (Gain / Mute / Solo)</span>
        </div>

        <div className="flex items-center gap-2.5 pt-0.5">
          <VUMeter peakL={data.peakL} peakR={data.peakR} height={60} />

          <div className="flex-1 space-y-2">
            <FaderSlider
              value={data.gain}
              disabled={data.mute}
              onChange={(val) => updateGain(data.id, val)}
            />

            <div className="grid grid-cols-2 gap-1.5 pt-0.5 nodrag">
              <button
                onClick={() => toggleMute(data.id)}
                className={`nodrag nopan py-1 rounded text-[10px] font-bold tracking-wider uppercase transition-all ${
                  data.mute
                    ? 'bg-rose-500 text-white shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
                }`}
              >
                MUTE
              </button>
              <button
                onClick={() => toggleSolo(data.id)}
                className={`nodrag nopan py-1 rounded text-[10px] font-bold tracking-wider uppercase transition-all ${
                  data.solo
                    ? 'bg-amber-400 text-zinc-950 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
                }`}
              >
                SOLO
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Output Pin (Right) */}
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        className="!w-4 !h-4 !bg-emerald-400 !border-2 !border-zinc-950 hover:!bg-emerald-300"
      />
    </div>
  );
};
