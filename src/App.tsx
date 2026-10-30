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
import { Zap, Radio } from 'lucide-react';
import { AudioNodeType } from './types/audio';

const FlowCanvas: React.FC = () => {
  const nodes = useAudioGraphStore((s) => s.nodes);
  const edges = useAudioGraphStore((s) => s.edges);
  const onNodesChange = useAudioGraphStore((s) => s.onNodesChange);
  const onEdgesChange = useAudioGraphStore((s) => s.onEdgesChange);
  const onConnect = useAudioGraphStore((s) => s.onConnect);
  const initNativeBridge = useAudioGraphStore((s) => s.initNativeBridge);
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

  // ★ 起動時に CoreAudio AUHAL ネイティブブリッジを初期化
  useEffect(() => {
    initNativeBridge();
  }, [initNativeBridge]);

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
    (type: AudioNodeType, presetName: string, subType?: string, defaultDeviceId?: number) => {
      if (menuPos) {
        addNodeAtPosition(type, { x: menuPos.flowX, y: menuPos.flowY }, presetName, subType, defaultDeviceId);
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
              <span>CoreAudio AUHAL 実機パススルー稼働中</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] leading-relaxed">
              <li>
                <strong className="text-emerald-400">LadioCast互換</strong>: 各入力ノードで個別にマイクやBlackHoleを選べます（片方オンで両方オンになる問題は解消）。
              </li>
              <li>
                <strong className="text-blue-400">繋いだら即・同通</strong>: 線（緑ピン→青ピン）を繋ぐとCoreAudioが直結され、即座に音が流れます。
              </li>
              <li>
                <strong className="text-purple-400">右クリック</strong>: 画面上で右クリックすると、Macの入出力装置を選んで即座にノード追加可能。
              </li>
              <li>
                <strong className="text-amber-400">音量スライダー</strong>: クリックしながらドラッグで個別ゲイン調整（ダブルクリックで0dBリセット）。
              </li>
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
