import React from 'react';
import {
  Play,
  Mic,
  Volume2,
  PlusCircle,
  RotateCcw,
  Activity,
  Layers,
  Cpu,
} from 'lucide-react';
import { useAudioGraphStore } from '../../store/useAudioGraphStore';

export const Toolbar: React.FC = () => {
  const isEngineStarted = useAudioGraphStore((s) => s.isEngineStarted);
  const isMicActive = useAudioGraphStore((s) => s.isMicActive);
  const isTestToneActive = useAudioGraphStore((s) => s.isTestToneActive);
  const startEngine = useAudioGraphStore((s) => s.startEngine);
  const toggleMic = useAudioGraphStore((s) => s.toggleMic);
  const toggleTestTone = useAudioGraphStore((s) => s.toggleTestTone);
  const addBusNode = useAudioGraphStore((s) => s.addBusNode);
  const loadDefaultLayout = useAudioGraphStore((s) => s.loadDefaultLayout);
  const nodes = useAudioGraphStore((s) => s.nodes);

  const busCount = nodes.filter((n) => n.data.type === 'bus').length;

  return (
    <header className="h-14 bg-zinc-900/90 backdrop-blur border-b border-zinc-800 px-4 flex items-center justify-between z-10 select-none">
      {/* Brand & Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/20">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
              AudioNodeRouter
              <span className="text-[10px] font-normal font-mono px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                macOS CoreAudio / BlackHole
              </span>
            </h1>
            <p className="text-[10px] text-zinc-400">
              10-Channel Node-Based Audio Routing Matrix
            </p>
          </div>
        </div>

        <div className="h-6 w-[1px] bg-zinc-800 mx-2" />

        {/* Engine Status Badge */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-950/60 border border-zinc-800 text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              isEngineStarted
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                : 'bg-zinc-600'
            }`}
          />
          <span className="text-[11px] font-mono text-zinc-300">
            {isEngineStarted ? 'Engine: 48kHz / 512smpl' : 'Engine: Standby'}
          </span>
        </div>

        {/* Active Bus Counter Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-950/40 border border-indigo-800/40 text-xs">
          <Layers className="w-3 h-3 text-indigo-400" />
          <span className="text-[11px] font-mono text-indigo-200">
            {busCount} Buses Active
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {!isEngineStarted ? (
          <button
            onClick={() => startEngine()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Start Audio Engine
          </button>
        ) : (
          <>
            <button
              onClick={() => toggleMic()}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                isMicActive
                  ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              {isMicActive ? 'Mic: ON' : 'Mic: OFF'}
            </button>

            <button
              onClick={() => toggleTestTone()}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                isTestToneActive
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              {isTestToneActive ? 'Test Audio: Playing' : 'Test Audio'}
            </button>
          </>
        )}

        <div className="h-6 w-[1px] bg-zinc-800 mx-1" />

        <button
          onClick={() => addBusNode()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-200 text-xs font-medium transition-all"
        >
          <PlusCircle className="w-3.5 h-3.5 text-blue-400" />
          Add Virtual Bus
        </button>

        <button
          onClick={() => loadDefaultLayout()}
          title="Reset to 10-Bus Default Layout"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Layout
        </button>
      </div>
    </header>
  );
};
