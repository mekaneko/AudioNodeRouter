import React, { useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  Panel,
} from '@xyflow/react';
import { useAudioGraphStore } from './store/useAudioGraphStore';
import { AudioInputNode } from './components/nodes/AudioInputNode';
import { AudioBusNode } from './components/nodes/AudioBusNode';
import { AudioOutputNode } from './components/nodes/AudioOutputNode';
import { EffectNode } from './components/nodes/EffectNode';
import { Toolbar } from './components/ui/Toolbar';
import { Info, HelpCircle } from 'lucide-react';

export const App: React.FC = () => {
  const nodes = useAudioGraphStore((s) => s.nodes);
  const edges = useAudioGraphStore((s) => s.edges);
  const onNodesChange = useAudioGraphStore((s) => s.onNodesChange);
  const onEdgesChange = useAudioGraphStore((s) => s.onEdgesChange);
  const onConnect = useAudioGraphStore((s) => s.onConnect);
  const updateMeters = useAudioGraphStore((s) => s.updateMeters);
  const isEngineStarted = useAudioGraphStore((s) => s.isEngineStarted);

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

  return (
    <div className="w-screen h-screen flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Top Navigation & Audio Control Bar */}
      <Toolbar />

      {/* Main Node Graph Canvas */}
      <div className="flex-1 w-full h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          defaultEdgeOptions={{
            type: 'default',
            animated: true,
            style: { stroke: '#3b82f6', strokeWidth: 3 },
          }}
          minZoom={0.2}
          maxZoom={2}
        >
          <Background
            color="#27272a"
            gap={20}
            size={1.5}
            variant={BackgroundVariant.Dots}
          />
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
                <Info className="w-3.5 h-3.5 text-blue-400" />
                <span>ノードベース・ルーティング操作ガイド</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] leading-relaxed">
                <li>
                  <strong className="text-emerald-400">緑ピン（出力）</strong> から <strong className="text-blue-400">青ピン（入力）</strong> へドラッグして配線。
                </li>
                <li>「Start Audio Engine」をクリックして音声処理を開始。</li>
                <li>「Test Audio」で即座に信号の流れとVUメーターを確認可能。</li>
                <li>10系統の仮想バスそれぞれで独立した音量調整、MUTE、SOLOに対応。</li>
              </ul>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
};
