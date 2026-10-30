import { create } from 'zustand';
import {
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Connection,
} from '@xyflow/react';
import { AudioNodeData, AudioNodeType } from '../types/audio';
import { AudioEngine } from '../audio/AudioEngine';
import { ALL_BYPASS_LINES } from '../audio/BlackHoleChannels';

interface AudioGraphState {
  nodes: Node<AudioNodeData>[];
  edges: Edge[];
  isEngineStarted: boolean;
  isMicActive: boolean;
  isTestToneActive: boolean;

  // Actions
  onNodesChange: OnNodesChange<Node<AudioNodeData>>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  startEngine: () => Promise<void>;
  toggleMic: () => Promise<void>;
  toggleTestTone: () => void;
  updateNodeGain: (id: string, gain: number) => void;
  updateNodeChannel: (id: string, virtualChannel: string) => void;
  toggleNodeMute: (id: string) => void;
  toggleNodeSolo: (id: string) => void;
  addBusNode: (customBusNum?: number) => void;
  addNodeAtPosition: (
    type: AudioNodeType,
    position: { x: number; y: number },
    presetName?: string,
    subType?: string
  ) => void;
  updateMeters: () => void;
  loadDefaultLayout: () => void;
}

// Initial Nodes Setup
const createInitialNodes = (): Node<AudioNodeData>[] => {
  const nodes: Node<AudioNodeData>[] = [
    // 1. Microphone Input Node
    {
      id: 'input-mic',
      type: 'audioInput',
      position: { x: 50, y: 120 },
      data: {
        id: 'input-mic',
        name: 'Mic (CoreAudio)',
        type: 'input',
        subType: 'mic',
        virtualChannel: 'builtin-mic',
        gain: 1.0,
        mute: false,
        solo: false,
        pan: 0,
        peakL: 0,
        peakR: 0,
      },
    },
    // 2. System / App Audio Input Node
    {
      id: 'input-app',
      type: 'audioInput',
      position: { x: 50, y: 380 },
      data: {
        id: 'input-app',
        name: 'App Audio (BlackHole In)',
        type: 'input',
        subType: 'blackhole-in',
        virtualChannel: 'bh16ch-in',
        gain: 1.0,
        mute: false,
        solo: false,
        pan: 0,
        peakL: 0,
        peakR: 0,
      },
    },
  ];

  // 3. 10 Independent Virtual Buses mapped to real BlackHole + Internal
  const busPresets = [
    { num: 1, name: 'Bus 1: 通話 (Discord/Zoom)', channel: 'BlackHole 16ch: Ch 1-2 (Discord/通話)' },
    { num: 2, name: 'Bus 2: ゲーム音 (Steam/App)', channel: 'BlackHole 16ch: Ch 3-4 (Game/ゲーム音)' },
    { num: 3, name: 'Bus 3: BGM (Spotify/Music)', channel: 'BlackHole 16ch: Ch 5-6 (Music/BGM)' },
    { num: 4, name: 'Bus 4: 効果音 (Soundpad/SE)', channel: 'BlackHole 16ch: Ch 7-8 (SFX/効果音)' },
    { num: 5, name: 'Bus 5: クリーンマイク (生声)', channel: 'BlackHole 16ch: Ch 9-10 (Mic Clean/生声)' },
    { num: 6, name: 'Bus 6: エフェクトマイク (ボイチェン)', channel: 'BlackHole 16ch: Ch 11-12 (Mic FX/ボイチェン)' },
    { num: 7, name: 'Bus 7: 配信モニター (OBS)', channel: 'BlackHole 16ch: Ch 13-14 (OBS Monitor/配信)' },
    { num: 8, name: 'Bus 8: システム音 (macOS通知)', channel: 'BlackHole 16ch: Ch 15-16 (System/通知音)' },
    { num: 9, name: 'Bus 9: メインバイパス (2ch)', channel: 'BlackHole 2ch: Ch 1-2 (メイン)' },
    { num: 10, name: 'Bus 10: 内部サブミックス', channel: '内部バス A (Internal)' },
  ];

  for (let i = 0; i < 10; i++) {
    const p = busPresets[i];
    const col = i < 5 ? 0 : 1;
    const row = i % 5;
    nodes.push({
      id: `bus-${p.num}`,
      type: 'audioBus',
      position: { x: 400 + col * 310, y: 60 + row * 210 },
      data: {
        id: `bus-${p.num}`,
        name: p.name,
        type: 'bus',
        busNumber: p.num,
        virtualChannel: p.channel,
        gain: 1.0,
        mute: false,
        solo: false,
        pan: 0,
        peakL: 0,
        peakR: 0,
      },
    });
  }

  // 4. Output Nodes
  nodes.push({
    id: 'out-monitor',
    type: 'audioOutput',
    position: { x: 1060, y: 150 },
    data: {
      id: 'out-monitor',
      name: 'Monitor (Speaker/Headphone)',
      type: 'output',
      subType: 'speaker',
      virtualChannel: 'builtin-speaker',
      gain: 1.0,
      mute: false,
      solo: false,
      pan: 0,
      peakL: 0,
      peakR: 0,
    },
  });

  nodes.push({
    id: 'out-stream',
    type: 'audioOutput',
    position: { x: 1060, y: 440 },
    data: {
      id: 'out-stream',
      name: 'OBS Stream (BlackHole Out)',
      type: 'output',
      subType: 'blackhole-out',
      virtualChannel: 'bh16ch-out',
      gain: 1.0,
      mute: false,
      solo: false,
      pan: 0,
      peakL: 0,
      peakR: 0,
    },
  });

  return nodes;
};

// Initial routing wire connections
const initialEdges: Edge[] = [
  { id: 'e-mic-bus5', source: 'input-mic', target: 'bus-5', animated: true },
  { id: 'e-app-bus2', source: 'input-app', target: 'bus-2', animated: true },
  { id: 'e-bus5-out1', source: 'bus-5', target: 'out-monitor' },
  { id: 'e-bus2-out1', source: 'bus-2', target: 'out-monitor' },
  { id: 'e-bus5-out2', source: 'bus-5', target: 'out-stream' },
  { id: 'e-bus2-out2', source: 'bus-2', target: 'out-stream' },
];

export const useAudioGraphStore = create<AudioGraphState>((set, get) => {
  const engine = AudioEngine.getInstance();

  return {
    nodes: createInitialNodes(),
    edges: initialEdges,
    isEngineStarted: false,
    isMicActive: false,
    isTestToneActive: false,

    onNodesChange: (changes) => {
      set({
        nodes: applyNodeChanges(changes, get().nodes),
      });
    },

    onEdgesChange: (changes) => {
      const currentEdges = get().edges;
      const updatedEdges = applyEdgeChanges(changes, currentEdges);

      changes.forEach((change) => {
        if (change.type === 'remove') {
          const removedEdge = currentEdges.find((e) => e.id === change.id);
          if (removedEdge) {
            engine.disconnect(removedEdge.source, removedEdge.target);
          }
        }
      });

      set({ edges: updatedEdges });
    },

    // ★ 繋いだら実行ボタンなしで即座に自動同通！
    onConnect: (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const edge = { ...connection, id: `e-${connection.source}-${connection.target}-${Date.now()}`, animated: true };

      // エンジンが未起動なら即時自動起動して同通
      if (!get().isEngineStarted) {
        get().startEngine();
      }

      // Wire audio in engine immediately
      engine.connect(connection.source, connection.target);

      set({
        edges: addEdge(edge, get().edges),
      });
    },

    startEngine: async () => {
      await engine.initContext();

      const nodes = get().nodes;
      nodes.forEach((n) => {
        engine.registerNode(n.id);
        if (n.data.type === 'output') {
          engine.connectToMasterOutput(n.id);
        }
      });

      const edges = get().edges;
      edges.forEach((e) => {
        engine.connect(e.source, e.target);
      });

      set({ isEngineStarted: true });
    },

    toggleMic: async () => {
      const isMicActive = get().isMicActive;
      if (!isMicActive) {
        await get().startEngine();
        const success = await engine.enableMicrophone('input-mic');
        if (success) {
          set({ isMicActive: true });
        }
      } else {
        set({ isMicActive: false });
      }
    },

    toggleTestTone: () => {
      get().startEngine();
      const active = engine.toggleTestTone('input-app', 440);
      set({ isTestToneActive: active });
    },

    updateNodeGain: (id: string, gain: number) => {
      set({
        nodes: get().nodes.map((node) => {
          if (node.id === id) {
            const updated = { ...node, data: { ...node.data, gain } };
            engine.setGain(id, gain, updated.data.mute, updated.data.solo);
            return updated;
          }
          return node;
        }),
      });
    },

    updateNodeChannel: (id: string, virtualChannel: string) => {
      set({
        nodes: get().nodes.map((node) => {
          if (node.id === id) {
            return { ...node, data: { ...node.data, virtualChannel } };
          }
          return node;
        }),
      });
    },

    toggleNodeMute: (id: string) => {
      set({
        nodes: get().nodes.map((node) => {
          if (node.id === id) {
            const newMute = !node.data.mute;
            const updated = { ...node, data: { ...node.data, mute: newMute } };
            engine.setGain(id, updated.data.gain, newMute, updated.data.solo);
            return updated;
          }
          return node;
        }),
      });
    },

    toggleNodeSolo: (id: string) => {
      set({
        nodes: get().nodes.map((node) => {
          if (node.id === id) {
            const newSolo = !node.data.solo;
            const updated = { ...node, data: { ...node.data, solo: newSolo } };
            engine.setGain(id, updated.data.gain, updated.data.mute, newSolo);
            return updated;
          }
          return node;
        }),
      });
    },

    addBusNode: (customBusNum?: number) => {
      const currentBuses = get().nodes.filter((n) => n.data.type === 'bus');
      const nextNum = customBusNum || (currentBuses.length + 1);
      const newId = `bus-${Date.now()}`;

      // Automatically assign remaining BlackHole channel if available
      const assignedLine =
        nextNum <= ALL_BYPASS_LINES.length ? ALL_BYPASS_LINES[nextNum - 1].label : '内部バス A (Internal)';

      const newNode: Node<AudioNodeData> = {
        id: newId,
        type: 'audioBus',
        position: { x: 500 + Math.random() * 80, y: 150 + Math.random() * 200 },
        data: {
          id: newId,
          name: `Bus ${nextNum}: カスタムバス`,
          type: 'bus',
          busNumber: nextNum,
          virtualChannel: assignedLine,
          gain: 1.0,
          mute: false,
          solo: false,
          pan: 0,
          peakL: 0,
          peakR: 0,
        },
      };

      engine.registerNode(newId);
      set({ nodes: [...get().nodes, newNode] });
    },

    // ★ 右クリックした場所に指定ノードを追加するアクション
    addNodeAtPosition: (
      type: AudioNodeType,
      position: { x: number; y: number },
      presetName?: string,
      subType?: string
    ) => {
      const newId = `${type}-${Date.now()}`;
      let name = presetName || `${type.toUpperCase()} Node`;
      let virtualChannel = '';

      if (type === 'bus') {
        const count = get().nodes.filter((n) => n.data.type === 'bus').length + 1;
        name = presetName || `Bus ${count}: 仮想ライン`;
        virtualChannel = count <= 8 ? `BlackHole 16ch: Ch ${count * 2 - 1}-${count * 2}` : '内部バス A (Internal)';
      } else if (type === 'input') {
        name = presetName || 'Input Source';
        virtualChannel = subType === 'mic' ? 'builtin-mic' : 'bh16ch-in';
      } else if (type === 'output') {
        name = presetName || 'Output Destination';
        virtualChannel = subType === 'speaker' ? 'builtin-speaker' : 'bh16ch-out';
      }

      const newNode: Node<AudioNodeData> = {
        id: newId,
        type: type === 'bus' ? 'audioBus' : type === 'input' ? 'audioInput' : type === 'output' ? 'audioOutput' : 'effect',
        position,
        data: {
          id: newId,
          name,
          type,
          subType: subType as any,
          busNumber: type === 'bus' ? get().nodes.filter((n) => n.data.type === 'bus').length + 1 : undefined,
          virtualChannel,
          gain: 1.0,
          mute: false,
          solo: false,
          pan: 0,
          peakL: 0,
          peakR: 0,
        },
      };

      engine.registerNode(newId);
      if (type === 'output') {
        engine.connectToMasterOutput(newId);
      }

      set({ nodes: [...get().nodes, newNode] });
    },

    updateMeters: () => {
      const nodes = get().nodes;
      let hasChanges = false;
      const updatedNodes = nodes.map((node) => {
        const { peakL, peakR } = engine.getMeterLevels(node.id);
        if (Math.abs(node.data.peakL - peakL) > 0.01 || Math.abs(node.data.peakR - peakR) > 0.01) {
          hasChanges = true;
          return {
            ...node,
            data: { ...node.data, peakL, peakR },
          };
        }
        return node;
      });

      if (hasChanges) {
        set({ nodes: updatedNodes });
      }
    },

    loadDefaultLayout: () => {
      set({
        nodes: createInitialNodes(),
        edges: initialEdges,
      });
      // Re-register in engine
      get().startEngine();
    },
  };
});
