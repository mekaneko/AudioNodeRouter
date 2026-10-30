import React, { useEffect, useRef } from 'react';
import {
  Mic,
  Headphones,
  Sparkles,
  ChevronRight,
  Plus,
  ArrowRightLeft,
} from 'lucide-react';
import { AudioNodeType } from '../../types/audio';
import { useAudioGraphStore } from '../../store/useAudioGraphStore';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onSelect: (type: AudioNodeType, presetName: string, subType?: string, defaultDeviceId?: number) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, onSelect }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const availableInputs = useAudioGraphStore((s) => s.availableInputs);
  const availableOutputs = useAudioGraphStore((s) => s.availableOutputs);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      style={{ left: `${x}px`, top: `${y}px` }}
      className="fixed z-50 min-w-56 bg-zinc-900/95 backdrop-blur-md border border-zinc-700/80 rounded-xl shadow-2xl p-1.5 text-xs text-zinc-200 select-none animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-400 border-b border-zinc-800 flex items-center justify-between">
        <span>ノード追加 (右クリックメニュー)</span>
        <Plus className="w-3 h-3 text-blue-400" />
      </div>

      <div className="py-1 space-y-0.5">
        {/* 1. INPUT NODES */}
        <div className="group relative">
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-blue-600 hover:text-white cursor-pointer transition-colors">
            <span className="flex items-center gap-2">
              <Mic className="w-3.5 h-3.5 text-blue-400 group-hover:text-white" />
              <span>入力ノード (Input)</span>
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white" />
          </div>

          {/* Submenu: Mac実機入力デバイス一覧 */}
          <div className="hidden group-hover:block absolute left-full top-0 ml-1 min-w-64 max-h-80 overflow-y-auto bg-zinc-900/95 backdrop-blur-md border border-zinc-700/80 rounded-xl shadow-2xl p-1.5 space-y-0.5">
            <div className="px-2 py-1 text-[9px] text-zinc-400 font-mono border-b border-zinc-800">
              Mac上の入力装置を選択:
            </div>
            {availableInputs
              .filter((d) => d.id !== 0)
              .map((dev) => (
                <button
                  key={dev.id}
                  onClick={() => onSelect('input', dev.name, 'mic', dev.id)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-600 hover:text-white flex items-center gap-2 truncate"
                >
                  <Mic className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="truncate">{dev.name}</span>
                </button>
              ))}
          </div>
        </div>

        {/* 2. VIRTUAL BYPASS BUS NODES */}
        <div className="group relative">
          <button
            onClick={() => onSelect('bus', 'バイパスライン')}
            className="w-full text-left flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-indigo-600 hover:text-white cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-2">
              <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
              <span>バイパス中継ライン (Bypass Bus)</span>
            </span>
          </button>
        </div>

        {/* 3. OUTPUT NODES */}
        <div className="group relative">
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-amber-600 hover:text-white cursor-pointer transition-colors">
            <span className="flex items-center gap-2">
              <Headphones className="w-4 h-4 text-amber-400 group-hover:text-white" />
              <span>出力ノード (Output)</span>
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white" />
          </div>

          {/* Submenu: Mac実機出力デバイス一覧 */}
          <div className="hidden group-hover:block absolute left-full top-0 ml-1 min-w-64 max-h-80 overflow-y-auto bg-zinc-900/95 backdrop-blur-md border border-zinc-700/80 rounded-xl shadow-2xl p-1.5 space-y-0.5">
            <div className="px-2 py-1 text-[9px] text-zinc-400 font-mono border-b border-zinc-800">
              Mac上の出力先を選択:
            </div>
            {availableOutputs
              .filter((d) => d.id !== 0)
              .map((dev) => (
                <button
                  key={dev.id}
                  onClick={() => onSelect('output', dev.name, 'speaker', dev.id)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-600 hover:text-white flex items-center gap-2 truncate"
                >
                  <Headphones className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">{dev.name}</span>
                </button>
              ))}
          </div>
        </div>

        {/* 4. EFFECT NODES */}
        <div className="group relative">
          <div
            onClick={() => onSelect('effect', 'Parametric EQ / Comp')}
            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-purple-600 hover:text-white cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-400 group-hover:text-white" />
              <span>エフェクトノード (EQ/Comp)</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
