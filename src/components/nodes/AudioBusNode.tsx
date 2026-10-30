import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Layers, ArrowRightLeft, Radio } from 'lucide-react';
import { AudioNodeData } from '../../types/audio';
import { VUMeter } from '../controls/VUMeter';
import { FaderSlider } from '../controls/FaderSlider';
import { useAudioGraphStore } from '../../store/useAudioGraphStore';
import { ALL_BYPASS_LINES } from '../../audio/BlackHoleChannels';

interface AudioBusNodeProps {
  data: AudioNodeData;
}

// Group lines by device type for <optgroup> display
const LINE_GROUPS: { label: string; prefix: string }[] = [
  { label: '🔌 BlackHole 2ch (インストール済)', prefix: 'BlackHole 2ch' },
  { label: '🔌 BlackHole 16ch (インストール済)', prefix: 'BlackHole 16ch' },
  { label: '🌐 その他 / 内部バス', prefix: '' },
];

export const AudioBusNode: React.FC<AudioBusNodeProps> = ({ data }) => {
  const updateGain = useAudioGraphStore((s) => s.updateNodeGain);
  const toggleMute = useAudioGraphStore((s) => s.toggleNodeMute);
  const toggleSolo = useAudioGraphStore((s) => s.toggleNodeSolo);
  const updateNodeChannel = useAudioGraphStore((s) => s.updateNodeChannel);

  const currentLine = data.virtualChannel || ALL_BYPASS_LINES[0].label;

  const selectedLineDef = ALL_BYPASS_LINES.find((l) => l.label === currentLine);

  // Colour indicator by device
  const deviceColor =
    selectedLineDef?.device === 'BlackHole 16ch'
      ? 'text-emerald-400'
      : selectedLineDef?.device === 'BlackHole 2ch'
      ? 'text-sky-400'
      : 'text-indigo-400';

  const borderColor =
    selectedLineDef?.device === 'BlackHole 16ch'
      ? 'hover:border-emerald-500/80'
      : selectedLineDef?.device === 'BlackHole 2ch'
      ? 'hover:border-sky-500/80'
      : 'hover:border-indigo-500/80';

  return (
    <div className={`w-72 bg-zinc-900 border border-zinc-750 rounded-xl shadow-2xl overflow-hidden ${borderColor} transition-all duration-200`}>
      {/* Input Pin (Left) */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        className="!w-3.5 !h-3.5 !bg-blue-400 !border-2 !border-zinc-950 hover:!bg-blue-300"
      />

      {/* Node Header */}
      <div className="bg-gradient-to-r from-indigo-950/70 to-zinc-900 px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="font-semibold text-xs tracking-tight text-zinc-100 truncate">
            {data.name}
          </span>
        </div>
        <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
          BUS {data.busNumber ?? '#'}
        </span>
      </div>

      {/* Node Body */}
      <div className="p-3 space-y-2.5">
        {/* Virtual Bypass Line Selector */}
        <div className="space-y-1">
          <div className={`flex items-center gap-1 text-[10px] font-mono ${deviceColor}`}>
            <ArrowRightLeft className="w-3 h-3 shrink-0" />
            <span className="truncate font-semibold">VIRTUAL BYPASS LINE:</span>
          </div>
          <select
            value={currentLine}
            onChange={(e) => updateNodeChannel(data.id, e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-750 text-[10px] text-zinc-200 rounded px-1.5 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            {LINE_GROUPS.map((group) => {
              const groupLines = group.prefix
                ? ALL_BYPASS_LINES.filter((l) => l.device === group.prefix)
                : ALL_BYPASS_LINES.filter(
                    (l) => l.device !== 'BlackHole 2ch' && l.device !== 'BlackHole 16ch'
                  );

              if (groupLines.length === 0) return null;
              return (
                <optgroup key={group.label} label={group.label}>
                  {groupLines.map((line) => (
                    <option key={line.id} value={line.label}>
                      {line.label}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
          {/* Description */}
          {selectedLineDef && (
            <p className="text-[9px] text-zinc-500 px-0.5 truncate">
              → {selectedLineDef.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {/* Real-time VU Meter */}
          <VUMeter peakL={data.peakL} peakR={data.peakR} height={60} />

          {/* Controls: Fader, Mute, Solo */}
          <div className="flex-1 space-y-2">
            <FaderSlider
              value={data.gain}
              disabled={data.mute}
              onChange={(val) => updateGain(data.id, val)}
            />

            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              <button
                onClick={() => toggleMute(data.id)}
                className={`py-1 rounded text-[10px] font-bold tracking-wider uppercase transition-all ${
                  data.mute
                    ? 'bg-rose-500 text-white shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
                }`}
              >
                MUTE
              </button>
              <button
                onClick={() => toggleSolo(data.id)}
                className={`py-1 rounded text-[10px] font-bold tracking-wider uppercase transition-all ${
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
        className="!w-3.5 !h-3.5 !bg-emerald-400 !border-2 !border-zinc-950 hover:!bg-emerald-300"
      />
    </div>
  );
};
