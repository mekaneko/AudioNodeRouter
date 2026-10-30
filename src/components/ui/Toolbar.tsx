import React from 'react';
import {
  Mic,
  Volume2,
  PlusCircle,
  RotateCcw,
  Activity,
  Layers,
  Sparkles,
  MousePointerClick,
} from 'lucide-react';
import { useAudioGraphStore } from '../../store/useAudioGraphStore';

export const Toolbar: React.FC = () => {
  const isMicActive = useAudioGraphStore((s) => s.isMicActive);
  const isTestToneActive = useAudioGraphStore((s) => s.isTestToneActive);
  const toggleMic = useAudioGraphStore((s) => s.toggleMic);
  const toggleTestTone = useAudioGraphStore((s) => s.toggleTestTone);
  const addBusNode = useAudioGraphStore((s) => s.addBusNode);
  const loadDefaultLayout = useAudioGraphStore((s) => s.loadDefaultLayout);
  const nodes = useAudioGraphStore((s) => s.nodes);

  const busCount = nodes.filter((n) => n.data.type === 'bus').length;

  return (
    <header className="window-drag-region h-14 bg-zinc-900/95 backdrop-blur border-b border-zinc-800 px-4 flex items-center justify-between z-20 select-none">
      {/* Brand & Window Drag Area */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/20">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
              AudioNodeRouter
              <span className="text-[10px] font-normal font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ● LIVE 同通
              </span>
            </h1>
            <p className="text-[10px] text-zinc-400">
              macOS CoreAudio / BlackHole 16ch & 2ch Node Matrix
            </p>
          </div>
        </div>

        <div className="h-6 w-[1px] bg-zinc-800 mx-2" />

        {/* Live Audio Engine Status Badge */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
          <span className="text-[11px] font-mono text-emerald-300">
            結線で自動同通 (48kHz)
          </span>
        </div>

        {/* Active Bus Counter Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-950/40 border border-indigo-800/40 text-xs">
          <Layers className="w-3 h-3 text-indigo-400" />
          <span className="text-[11px] font-mono text-indigo-200">
            {busCount} バス稼働中
          </span>
        </div>

        {/* Right Click Guide Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] text-zinc-400 font-mono">
          <MousePointerClick className="w-3.5 h-3.5 text-blue-400" />
          <span>画面の右クリックで入出力ノードをどこでも追加可能</span>
        </div>
      </div>

      {/* Action Buttons (window-no-drag is essential for clicking) */}
      <div className="window-no-drag flex items-center gap-2">
        <button
          onClick={() => toggleMic()}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            isMicActive
              ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
              : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          {isMicActive ? 'マイク: 通電中' : 'マイク通電'}
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
          {isTestToneActive ? 'テスト信号: 発信中' : 'テスト信号'}
        </button>

        <div className="h-6 w-[1px] bg-zinc-800 mx-1" />

        <button
          onClick={() => addBusNode()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-200 text-xs font-medium transition-all"
        >
          <PlusCircle className="w-3.5 h-3.5 text-blue-400" />
          仮想バス追加
        </button>

        <button
          onClick={() => loadDefaultLayout()}
          title="10バス標準レイアウトにリセット"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          配置初期化
        </button>
      </div>
    </header>
  );
};
