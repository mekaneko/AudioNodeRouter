import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Mic, Volume2, Radio, Bell } from 'lucide-react';
import { AudioNodeData } from '../../types/audio';
import { VUMeter } from '../controls/VUMeter';
import { FaderSlider } from '../controls/FaderSlider';
import { useAudioGraphStore } from '../../store/useAudioGraphStore';

interface AudioInputNodeProps {
  data: AudioNodeData;
}

export const AudioInputNode: React.FC<AudioInputNodeProps> = ({ data }) => {
  const updateGain = useAudioGraphStore((s) => s.updateNodeGain);
  const toggleMute = useAudioGraphStore((s) => s.toggleNodeMute);
  const toggleMic = useAudioGraphStore((s) => s.toggleMic);
  const isMicActive = useAudioGraphStore((s) => s.isMicActive);
  const toggleTestTone = useAudioGraphStore((s) => s.toggleTestTone);
  const isTestToneActive = useAudioGraphStore((s) => s.isTestToneActive);

  const isMic = data.subType === 'mic';

  return (
    <div className="w-64 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl overflow-hidden hover:border-blue-500/80 transition-all duration-200">
      {/* Node Header */}
      <div className="bg-gradient-to-r from-blue-950/60 to-zinc-900 px-3.5 py-2.5 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isMic ? (
            <Mic className="w-4 h-4 text-blue-400" />
          ) : (
            <Radio className="w-4 h-4 text-emerald-400" />
          )}
          <span className="font-semibold text-xs tracking-wide text-zinc-100 truncate">
            {data.name}
          </span>
        </div>
        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-mono bg-blue-500/20 text-blue-400 border border-blue-500/30">
          INPUT
        </span>
      </div>

      {/* Node Body */}
      <div className="p-3.5 space-y-3">
        {/* Hardware / Source Actions */}
        {isMic ? (
          <button
            onClick={toggleMic}
            className={`w-full py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
              isMicActive
                ? 'bg-rose-600/90 hover:bg-rose-600 text-white shadow-lg shadow-rose-900/30'
                : 'bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-zinc-700'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            {isMicActive ? 'Mic Active (Capturing)' : 'Enable Microphone'}
          </button>
        ) : (
          <button
            onClick={toggleTestTone}
            className={`w-full py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
              isTestToneActive
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
                : 'bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-zinc-700'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            {isTestToneActive ? 'Test Tone Running (440Hz)' : 'Generate Test Tone'}
          </button>
        )}

        {/* Meters and Volume Strip */}
        <div className="flex items-center gap-3">
          <VUMeter peakL={data.peakL} peakR={data.peakR} height={60} />
          <div className="flex-1 space-y-2">
            <FaderSlider
              value={data.gain}
              disabled={data.mute}
              onChange={(val) => updateGain(data.id, val)}
            />
            {/* Mute Button */}
            <div className="flex gap-1.5 pt-1">
              <button
                onClick={() => toggleMute(data.id)}
                className={`flex-1 py-1 rounded text-[10px] font-bold tracking-wider uppercase transition-all ${
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

      {/* Output Pin (Right) */}
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        className="!w-3.5 !h-3.5 !bg-emerald-400 !border-2 !border-zinc-950 hover:!bg-emerald-300"
      />
    </div>
  );
};
