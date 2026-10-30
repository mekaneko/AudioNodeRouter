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

const OUTPUT_DEVICE_OPTIONS = [
  { label: 'MacBook Pro スピーカー (内蔵)', value: 'builtin-speaker', icon: '🔊' },
  { label: 'USB Audio CODEC (Burr-Brown/TI)', value: 'usb-codec-out', icon: '🔌' },
  { label: 'BenQ GW2270 (HDMI)', value: 'benq-hdmi', icon: '🖥️' },
  { label: 'DELL E2214H (HDMI)', value: 'dell-hdmi', icon: '🖥️' },
  { label: 'BlackHole 2ch (仮想出力)', value: 'bh2ch-out', icon: '⬛' },
  { label: 'BlackHole 16ch (仮想出力 16ch)', value: 'bh16ch-out', icon: '⬛' },
  { label: 'NDI Audio (NewTek)', value: 'ndi-out', icon: '📡' },
  { label: 'Camo Microphone out (Reincubate)', value: 'camo-out', icon: '📱' },
  { label: '複数出力装置 (Multi-Output)', value: 'multi-out', icon: '📢' },
];

export const AudioOutputNode: React.FC<AudioOutputNodeProps> = ({ data }) => {
  const updateGain = useAudioGraphStore((s) => s.updateNodeGain);
  const toggleMute = useAudioGraphStore((s) => s.toggleNodeMute);
  const updateNodeChannel = useAudioGraphStore((s) => s.updateNodeChannel);

  const selectedDevice = data.virtualChannel || OUTPUT_DEVICE_OPTIONS[0].value;
  const isBlackHole = selectedDevice.startsWith('bh');

  return (
    <div className="w-72 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl overflow-hidden hover:border-amber-500/80 transition-all duration-200">
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        className="!w-3.5 !h-3.5 !bg-blue-400 !border-2 !border-zinc-950 hover:!bg-blue-300"
      />

      <div className="bg-gradient-to-r from-amber-950/60 to-zinc-900 px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isBlackHole ? (
            <Radio className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <Headphones className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span className="font-semibold text-xs tracking-wide text-zinc-100 truncate">
            {data.name}
          </span>
        </div>
        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
          OUTPUT
        </span>
      </div>

      <div className="p-3 space-y-2.5">
        <div className="space-y-1">
          <div className="text-[10px] text-zinc-400 font-mono">🔌 OUTPUT DEVICE / DESTINATION:</div>
          <select
            value={selectedDevice}
            onChange={(e) => updateNodeChannel(data.id, e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-750 text-[10px] text-zinc-200 rounded px-1.5 py-1.5 focus:outline-none focus:border-amber-500"
          >
            {OUTPUT_DEVICE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.icon} {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2.5">
          <VUMeter peakL={data.peakL} peakR={data.peakR} height={60} />
          <div className="flex-1 space-y-2">
            <FaderSlider
              value={data.gain}
              disabled={data.mute}
              onChange={(val) => updateGain(data.id, val)}
            />
            <button
              onClick={() => toggleMute(data.id)}
              className={`w-full py-1 rounded text-[10px] font-bold tracking-wider uppercase transition-all ${
                data.mute
                  ? 'bg-rose-500 text-white shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
              }`}
            >
              MUTE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
