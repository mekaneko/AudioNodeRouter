import React, { useEffect, useRef } from 'react';
import {
  Mic,
  Volume2,
  Headphones,
  Sparkles,
  Layers,
  Radio,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { AudioNodeType } from '../../types/audio';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onSelect: (type: AudioNodeType, presetName: string, subType?: string) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, onSelect }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
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

          {/* Submenu */}
          <div className="hidden group-hover:block absolute left-full top-0 ml-1 min-w-52 bg-zinc-900/95 backdrop-blur-md border border-zinc-700/80 rounded-xl shadow-2xl p-1.5 space-y-0.5">
            <button
              onClick={() => onSelect('input', 'マイク入力', 'mic')}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-600 hover:text-white flex items-center gap-2"
            >
              <Mic className="w-3.5 h-3.5 text-blue-400" />
              <span>マイク (内蔵/USBマイク)</span>
            </button>
            <button
              onClick={() => onSelect('input', 'アプリ音声 (BlackHole In)', 'blackhole-in')}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-600 hover:text-white flex items-center gap-2"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>アプリ音声 (BlackHole In)</span>
            </button>
            <button
              onClick={() => onSelect('input', 'テスト信号ジェネレータ', 'oscillator')}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-600 hover:text-white flex items-center gap-2"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              <span>テスト信号 (440Hz サイン波)</span>
            </button>
          </div>
        </div>

        {/* 2. VIRTUAL BUS NODES */}
        <div className="group relative">
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-indigo-600 hover:text-white cursor-pointer transition-colors">
            <span className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-indigo-400 group-hover:text-white" />
              <span>仮想バスノード (Bus)</span>
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white" />
          </div>

          {/* Submenu */}
          <div className="hidden group-hover:block absolute left-full top-0 ml-1 min-w-56 bg-zinc-900/95 backdrop-blur-md border border-zinc-700/80 rounded-xl shadow-2xl p-1.5 space-y-0.5">
            <button
              onClick={() => onSelect('bus', 'BlackHole 16ch バイパスバス')}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-indigo-600 hover:text-white flex items-center gap-2"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <div>
                <div className="font-medium">BlackHole 16ch バス</div>
                <div className="text-[10px] text-zinc-400">CoreAudio他アプリ連携</div>
              </div>
            </button>
            <button
              onClick={() => onSelect('bus', 'BlackHole 2ch バイパスバス')}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-indigo-600 hover:text-white flex items-center gap-2"
            >
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <div>
                <div className="font-medium">BlackHole 2ch バス</div>
                <div className="text-[10px] text-zinc-400">ステレオメインバイパス</div>
              </div>
            </button>
            <button
              onClick={() => onSelect('bus', '内部仮想バス')}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-indigo-600 hover:text-white flex items-center gap-2"
            >
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <div>
                <div className="font-medium">内部ソフトウェアバス</div>
                <div className="text-[10px] text-zinc-400">アプリ内サブミックス</div>
              </div>
            </button>
          </div>
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

          {/* Submenu */}
          <div className="hidden group-hover:block absolute left-full top-0 ml-1 min-w-56 bg-zinc-900/95 backdrop-blur-md border border-zinc-700/80 rounded-xl shadow-2xl p-1.5 space-y-0.5">
            <button
              onClick={() => onSelect('output', 'モニター (スピーカー/ヘッドフォン)', 'speaker')}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-600 hover:text-white flex items-center gap-2"
            >
              <Headphones className="w-3.5 h-3.5 text-amber-400" />
              <span>スピーカー / ヘッドフォン</span>
            </button>
            <button
              onClick={() => onSelect('output', 'OBS配信用 (BlackHole Out)', 'blackhole-out')}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-600 hover:text-white flex items-center gap-2"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>OBS配信送り (BlackHole Out)</span>
            </button>
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
