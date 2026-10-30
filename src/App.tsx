import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import { useAudioGraphStore } from './store/useAudioGraphStore';
import { AudioInputNode } from './components/nodes/AudioInputNode';
import { AudioBusNode } from './components/nodes/AudioBusNode';
import { AudioOutputNode } from './components/nodes/AudioOutputNode';
import { EffectNode } from './components/nodes/EffectNode';
import { Toolbar } from './components/ui/Toolbar';
import { ContextMenu } from './components/ui/ContextMenu';
import { Info, MousePointerClick, Zap } from 'lucide-react';
import { AudioNodeType } from './types/audio';

const FlowCanvas: React.FC = () => {
  const nodes = useAudioGraphStore((s) => s.nodes);
  const edges = useAudioGraphStore((s) => s.edges);
  const onNodesChange = useAudioGraphStore((s) => s.onNodesChange);
  const onEdgesChange = useAudioGraphStore((s) => s.onEdgesChange);
  const onConnect = useAudioGraphStore((s) => s.onConnect);
  const updateMeters = useAudioGraphStore((s) => s.updateMeters);
  const startEngine = useAudioGraphStore((s) => s.startEngine);
  const isEngineStarted = useAudioGraphStore((s) => s.isEngineStarted);
  const addNodeAtPosition = useAudioGraphStore((s) => s.addNodeAtPosition);

  const { screenToFlowPosition } = useReactFlow();

  // Context Menu State
  const [menuPos, setMenuPos] = useState<{ x: number; y: number; flowX: number; flowY: number } | null>(null);

  // Register Custom Node Types
  const nodeTypes = useMemo(
    () => ({
      audioInput: AudioInputNode,
      audioBus: AudioBusNode,
      audioOutput: AudioOutputNode,
      effect: EffectNode,
    }),
    []
  );

  // ★ 起動時に自動でオーディオエンジンを起動（ボタン不要で同通）
  useEffect(() => {
    startEngine();

    // 最初のユーザー操作（クリック）でも自動でオーディオコンテキストを完全有効化
    const unlockAudio = () => {
      startEngine();
      window.removeEventListener('click', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    return () => window.removeEventListener('click', unlockAudio);
  }, [startEngine]);

  // Real-time VU Meter Animation Loop
  useEffect(() => {
    let animId: number;
    const tick = () => {
      if (isEngineStarted) {
        updateMeters();
      }
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isEngineStarted, updateMeters]);

  // ★ キャンバス右クリックでメニューを開く
  const handlePaneContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      const flowPos = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      setMenuPos({
        x: event.clientX,
        y: event.clientY,
        flowX: flowPos.x,
        flowY: flowPos.y,
      });
    },
    [screenToFlowPosition]
  );

  const handleSelectNode = useCallback(
    (type: AudioNodeType, presetName: string, subType?: string) => {
      if (menuPos) {
        addNodeAtPosition(type, { x: menuPos.flowX, y: menuPos.flowY }, presetName, subType);
        setMenuPos(null);
      }
    },
    [menuPos, addNodeAtPosition]
  );

  return (
    <div className="w-full h-full relative" onContextMenu={handlePaneContextMenu}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        defaultEdgeOptions={{
          type: 'default',
          animated: true,
          style: { stroke: '#3b82f6', strokeWidth: 3 },
        }}
        minZoom={0.2}
        maxZoom={2}
      >
        <Background color="#27272a" gap={20} size={1.5} variant={BackgroundVariant.Dots} />
        <Controls className="!bg-zinc-900 !border-zinc-800 !fill-zinc-300" />
        <MiniMap
          nodeColor={(n) => {
            if (n.type === 'audioInput') return '#3b82f6';
            if (n.type === 'audioBus') return '#6366f1';
            if (n.type === 'audioOutput') return '#f59e0b';
            return '#a855f7';
          }}
          maskColor="rgba(9, 9, 11, 0.75)"
          className="!bg-zinc-900 !border-zinc-800 !rounded-lg overflow-hidden"
        />

        {/* Quick Guide Overlay */}
        <Panel position="bottom-left" className="m-4">
          <div className="bg-zinc-900/90 backdrop-blur border border-zinc-800/80 rounded-lg p-3 text-xs text-zinc-400 space-y-1.5 shadow-xl max-w-sm">
            <div className="flex items-center gap-1.5 text-zinc-200 font-semibold">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>自動同通 & 右クリック対応マトリクス</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] leading-relaxed">
              <li>
                <strong className="text-emerald-400">繋ぐだけで即同通</strong>: 線（緑ピン→青ピン）を繋いだ瞬間に自動で音声が通ります（実行ボタン不要）。
              </li>
              <li>
                <strong className="text-blue-400">右クリック</strong>: キャンバス上の好きな場所で右クリックすると、入力・バス・出力ノードを追加できます。
              </li>
              <li>
                <strong className="text-amber-400">音量スライダー</strong>: クリックしながらドラッグで滑らかに調整可能（ダブルクリックで0dBリセット）。
              </li>
              <li>上部ヘッダーをドラッグするとアプリウィンドウを自由に移動できます。</li>
            </ul>
          </div>
        </Panel>
      </ReactFlow>

      {/* Context Menu Popup */}
      {menuPos && (
        <ContextMenu
          x={menuPos.x}
          y={menuPos.y}
          onClose={() => setMenuPos(null)}
          onSelect={handleSelectNode}
        />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ReactFlowProvider>
      <div className="w-screen h-screen flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
        <Toolbar />
        <div className="flex-1 w-full h-full relative">
          <FlowCanvas />
        </div>
      </div>
    </ReactFlowProvider>
  );
};
