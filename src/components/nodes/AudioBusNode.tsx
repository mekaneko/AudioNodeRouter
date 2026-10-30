import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Layers, ArrowRightLeft, CheckCircle2, Cpu } from 'lucide-react';
import { AudioNodeData } from '../../types/audio';
import { VUMeter } from '../controls/VUMeter';
import { FaderSlider } from '../controls/FaderSlider';
import { useAudioGraphStore } from '../../store/useAudioGraphStore';
import { ALL_BYPASS_LINES } from '../../audio/BlackHoleChannels';

interface AudioBusNodeProps {
  data: AudioNodeData;
}

const LINE_GROUPS: { label: string; prefix: string; isHardware: boolean }[] = [
  { label: '🟢 BlackHole 16ch (実機ドライバ 8系統)', prefix: 'BlackHole 16ch', isHardware: true },
  { label: '🔵 BlackHole 2ch (実機ドライバ 1系統)', prefix: 'BlackHole 2ch', isHardware: true },
  { label: '🟣 内部ソフトウェアバス (無制限)', prefix: '', isHardware: false },
];

export const AudioBusNode: React.FC<AudioBusNodeProps> = ({ data }) => {
  const updateGain = useAudioGraphStore((s) => s.updateNodeGain);
  const toggleMute = useAudioGraphStore((s) => s.toggleNodeMute);
  const toggleSolo = useAudioGraphStore((s) => s.toggleNodeSolo);
  const updateNodeChannel = useAudioGraphStore((s) => s.updateNodeChannel);

  const currentLine = data.virtualChannel || ALL_BYPASS_LINES[0].label;
  const selectedLineDef = ALL_BYPASS_LINES.find((l) => l.label === currentLine);

  const isRealBlackHole =
    selectedLineDef?.device === 'BlackHole 16ch' || selectedLineDef?.device === 'BlackHole 2ch';

  return (
    <div className={`w-72 bg-zinc-900 border rounded-xl shadow-2xl overflow-hidden transition-all duration-200 ${
      isRealBlackHole ? 'border-emerald-700/80 hover:border-emerald-500' : 'border-zinc-700 hover:border-indigo-500'
    }`}>
      {/* Input Pin (Left) */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        className="!w-4 !h-4 !bg-blue-400 !border-2 !border-zinc-950 hover:!bg-blue-300"
      />

      {/* Node Header */}
      <div className="bg-gradient-to-r from-indigo-950/70 to-zinc-900 px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="font-semibold text-xs tracking-tight text-zinc-100 truncate">
            {data.name}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isRealBlackHole ? (
            <span className="flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 className="w-2.5 h-2.5" /> CoreAudio実機
            </span>
          ) : (
            <span className="flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <Cpu className="w-2.5 h-2.5" /> 内部バス
            </span>
          )}
          <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
            BUS {data.busNumber ?? '#'}
          </span>
        </div>
      </div>

      {/* Node Body */}
      <div className="p-3 space-y-2.5 nodrag">
        {/* Virtual Bypass Line Selector */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="flex items-center gap-1 text-indigo-300 font-semibold">
              <ArrowRightLeft className="w-3 h-3 shrink-0" />
              BYPASS LINE:
            </span>
            <span className="text-[9px] text-zinc-400">
              {isRealBlackHole ? '他アプリと連携可' : 'アプリ内限定'}
            </span>
          </div>
          <select
            value={currentLine}
            onChange={(e) => updateNodeChannel(data.id, e.target.value)}
            className="nodrag nopan w-full bg-zinc-950 border border-zinc-750 text-[10px] text-zinc-200 rounded px-1.5 py-1.5 focus:outline-none focus:border-indigo-500"
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
          {selectedLineDef && (
            <p className="text-[9px] text-zinc-400 px-0.5 truncate">
              💡 {selectedLineDef.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2.5 pt-1">
          {/* Real-time VU Meter */}
          <VUMeter peakL={data.peakL} peakR={data.peakR} height={60} />

          {/* Controls: Fader, Mute, Solo */}
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
