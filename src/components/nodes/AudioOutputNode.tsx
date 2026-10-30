import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Headphones, Radio } from 'lucide-react';
import { AudioNodeData } from '../../types/audio';
import { VUMeter } from '../controls/VUMeter';
import { FaderSlider } from '../controls/FaderSlider';
import { useAudioGraphStore } from '../../store/useAudioGraphStore';

interface AudioOutputNodeProps {
  data: AudioNodeData;
}

export const AudioOutputNode: React.FC<AudioOutputNodeProps> = ({ data }) => {
  const updateGain = useAudioGraphStore((s) => s.updateNodeGain);
  const toggleMute = useAudioGraphStore((s) => s.toggleNodeMute);

  const isSpeaker = data.subType === 'speaker';

  return (
    <div className="w-60 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl overflow-hidden hover:border-amber-500/80 transition-all duration-200">
      {/* Input Pin (Left) */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        className="!w-3.5 !h-3.5 !bg-blue-400 !border-2 !border-zinc-950 hover:!bg-blue-300"
      />

      {/* Node Header */}
      <div className="bg-gradient-to-r from-amber-950/60 to-zinc-900 px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isSpeaker ? (
            <Headphones className="w-4 h-4 text-amber-400" />
          ) : (
            <Radio className="w-4 h-4 text-red-400" />
          )}
          <span className="font-semibold text-xs tracking-wide text-zinc-100 truncate">
            {data.name}
          </span>
        </div>
        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30">
          OUTPUT
        </span>
      </div>

      {/* Node Body */}
      <div className="p-3 space-y-2.5">
        <div className="flex items-center gap-2.5">
          <VUMeter peakL={data.peakL} peakR={data.peakR} height={60} />
          <div className="flex-1 space-y-2">
            <FaderSlider
              value={data.gain}
              disabled={data.mute}
              onChange={(val) => updateGain(data.id, val)}
            />
            {/* Mute Button */}
            <div className="flex gap-1.5 pt-0.5">
              <button
                onClick={() => toggleMute(data.id)}
                className={`w-full py-1 rounded text-[10px] font-bold tracking-wider uppercase transition-all ${
                  data.mute
                    ? 'bg-rose-500 text-white font-extrabold shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                    : 'bg-zinc-800 hover:bg-zinc-750 text-zinc-400'
                }`}
              >
                MUTE
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
