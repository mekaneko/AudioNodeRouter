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
  toggleNodeMute: (id: string) => void;
  toggleNodeSolo: (id: string) => void;
  addBusNode: (busNumber?: number) => void;
  updateMeters: () => void;
  loadDefaultLayout: () => void;
}

// Initial 10 Virtual Buses + Default Inputs & Outputs
const createInitialNodes = (): Node<AudioNodeData>[] => {
  const nodes: Node<AudioNodeData>[] = [
    // 1. Microphone Input Node
    {
      id: 'input-mic',
      type: 'audioInput',
      position: { x: 50, y: 100 },
      data: {
        id: 'input-mic',
        name: 'Mic (CoreAudio)',
        type: 'input',
        subType: 'mic',
        gain: 1.0,
        mute: false,
        solo: false,
        pan: 0,
        peakL: 0,
        peakR: 0,
      },
    },
    // 2. System / App Audio Input Node (e.g. BlackHole In)
    {
      id: 'input-app',
      type: 'audioInput',
      position: { x: 50, y: 320 },
      data: {
        id: 'input-app',
        name: 'App Audio (BlackHole)',
        type: 'input',
        subType: 'blackhole-in',
        gain: 1.0,
        mute: false,
        solo: false,
        pan: 0,
        peakL: 0,
        peakR: 0,
      },
    },
  ];

  // 3. 10 Independent Virtual Pass-Thru Buses
  const busDescriptions = [
    'Voice / Discord',
    'Game / Primary',
    'Music / Spotify',
    'SFX / Soundpad',
    'Clean Mic Out',
    'Processed Mic',
    'Stream OBS Bus',
    'System Alert',
    'Auxiliary 1',
    'Recording Master',
  ];

  for (let i = 1; i <= 10; i++) {
    const col = i <= 5 ? 0 : 1;
    const row = (i - 1) % 5;
    nodes.push({
      id: `bus-${i}`,
      type: 'audioBus',
      position: { x: 380 + col * 260, y: 60 + row * 180 },
      data: {
        id: `bus-${i}`,
        name: `Bus ${i}: ${busDescriptions[i - 1]}`,
        type: 'bus',
        busNumber: i,
        gain: 1.0,
        mute: false,
        solo: false,
        pan: 0,
        peakL: 0,
        peakR: 0,
      },
    });
  }

  // 4. Output Nodes (Speakers / OBS Stream / Headphones)
  nodes.push({
    id: 'out-monitor',
    type: 'audioOutput',
    position: { x: 960, y: 150 },
    data: {
      id: 'out-monitor',
      name: 'Monitor (Speaker/Headphone)',
      type: 'output',
      subType: 'speaker',
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
    position: { x: 960, y: 400 },
    data: {
      id: 'out-stream',
      name: 'OBS Stream (BlackHole Out)',
      type: 'output',
      subType: 'blackhole-out',
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

      // Handle removed edges in AudioEngine
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

    onConnect: (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const edge = { ...connection, id: `e-${connection.source}-${connection.target}`, animated: true };
      
      // Wire audio in engine
      engine.connect(connection.source, connection.target);

      set({
        edges: addEdge(edge, get().edges),
      });
    },

    startEngine: async () => {
      await engine.initContext();
      
      // Register all nodes in engine
      const nodes = get().nodes;
      nodes.forEach((n) => {
        engine.registerNode(n.id);
        if (n.data.type === 'output' && n.data.subType === 'speaker') {
          engine.connectToMasterOutput(n.id);
        }
      });

      // Connect all initial edges
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
        // Toggle off
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

      const newNode: Node<AudioNodeData> = {
        id: newId,
        type: 'audioBus',
        position: { x: 450 + Math.random() * 100, y: 150 + Math.random() * 200 },
        data: {
          id: newId,
          name: `Bus ${nextNum}: User Bus`,
          type: 'bus',
          busNumber: nextNum,
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
    },
  };
});
