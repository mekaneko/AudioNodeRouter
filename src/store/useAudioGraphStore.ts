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
import { NativeBridge, AudioDeviceItem, MeterUpdate } from '../audio/NativeBridge';

interface AudioGraphState {
  nodes: Node<AudioNodeData>[];
  edges: Edge[];
  availableInputs: AudioDeviceItem[];
  availableOutputs: AudioDeviceItem[];

  // Actions
  initNativeBridge: () => void;
  onNodesChange: OnNodesChange<Node<AudioNodeData>>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  updateNodeDevice: (id: string, deviceId: number) => void;
  updateNodeGain: (id: string, gain: number) => void;
  updateNodeChannel: (id: string, virtualChannel: string) => void;
  toggleNodeMute: (id: string) => void;
  toggleNodeSolo: (id: string) => void;
  addBusNode: (customBusNum?: number) => void;
  addNodeAtPosition: (
    type: AudioNodeType,
    position: { x: number; y: number },
    presetName?: string,
    subType?: string,
    defaultDeviceId?: number
  ) => void;
  loadDefaultLayout: () => void;
}

const createInitialNodes = (inDevs: AudioDeviceItem[], outDevs: AudioDeviceItem[]): Node<AudioNodeData>[] => {
  // Find BlackHole and default devices if present
  const defaultIn = inDevs.find((d) => d.id !== 0 && !d.name.includes('BlackHole')) || inDevs[1] || { id: 0, name: '未選択' };
  const blackholeIn = inDevs.find((d) => d.name.includes('BlackHole 16ch') || d.name.includes('BlackHole 2ch')) || { id: 0, name: 'BlackHole' };
  const defaultOut = outDevs.find((d) => d.id !== 0 && !d.name.includes('BlackHole')) || outDevs[1] || { id: 0, name: '未選択' };
  const blackholeOut = outDevs.find((d) => d.name.includes('BlackHole 16ch') || d.name.includes('BlackHole 2ch')) || { id: 0, name: 'BlackHole' };

  const nodes: Node<AudioNodeData>[] = [
    // 1. Microphone Input (Input 1)
    {
      id: 'input-1',
      type: 'audioInput',
      position: { x: 50, y: 120 },
      data: {
        id: 'input-1',
        name: '入力 1 (マイク)',
        type: 'input',
        subType: 'mic',
        deviceId: defaultIn.id,
        gain: 1.0,
        mute: false,
        solo: false,
        pan: 0,
        peakL: 0,
        peakR: 0,
      },
    },
    // 2. BlackHole In (Input 2)
    {
      id: 'input-2',
      type: 'audioInput',
      position: { x: 50, y: 380 },
      data: {
        id: 'input-2',
        name: '入力 2 (PC音声/BlackHole)',
        type: 'input',
        subType: 'blackhole-in',
        deviceId: blackholeIn.id,
        gain: 1.0,
        mute: false,
        solo: false,
        pan: 0,
        peakL: 0,
        peakR: 0,
      },
    },
  ];

  // 3. Virtual Bypass Lines (Bus 1 ~ 8)
  for (let i = 1; i <= 6; i++) {
    const col = i <= 3 ? 0 : 1;
    const row = (i - 1) % 3;
    nodes.push({
      id: `bus-${i}`,
      type: 'audioBus',
      position: { x: 420 + col * 320, y: 100 + row * 220 },
      data: {
        id: `bus-${i}`,
        name: `バイパスライン ${i} (Bus ${i})`,
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

  // 4. Output Nodes (Output 1: Main Speaker, Output 2: Stream OBS)
  nodes.push({
    id: 'out-1',
    type: 'audioOutput',
    position: { x: 1100, y: 120 },
    data: {
      id: 'out-1',
      name: '出力 1 (スピーカー/モニター)',
      type: 'output',
      subType: 'speaker',
      deviceId: defaultOut.id,
      gain: 1.0,
      mute: false,
      solo: false,
      pan: 0,
      peakL: 0,
      peakR: 0,
    },
  });

  nodes.push({
    id: 'out-2',
    type: 'audioOutput',
    position: { x: 1100, y: 380 },
    data: {
      id: 'out-2',
      name: '出力 2 (OBS配信/録音用)',
      type: 'output',
      subType: 'blackhole-out',
      deviceId: blackholeOut.id,
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

const initialEdges: Edge[] = [
  { id: 'e-in1-bus1', source: 'input-1', target: 'bus-1', animated: true },
  { id: 'e-in2-bus2', source: 'input-2', target: 'bus-2', animated: true },
  { id: 'e-bus1-out1', source: 'bus-1', target: 'out-1' },
  { id: 'e-bus2-out1', source: 'bus-2', target: 'out-1' },
  { id: 'e-bus1-out2', source: 'bus-1', target: 'out-2' },
  { id: 'e-bus2-out2', source: 'bus-2', target: 'out-2' },
];

export const useAudioGraphStore = create<AudioGraphState>((set, get) => {
  return {
    nodes: createInitialNodes([], []),
    edges: initialEdges,
    availableInputs: [],
    availableOutputs: [],

    initNativeBridge: () => {
      // 1. Subscribe to Core Audio devices from Swift
      NativeBridge.subscribeDevices((inputs, outputs) => {
        set({ availableInputs: inputs, availableOutputs: outputs });

        // Update default device IDs on nodes if not set
        const currentNodes = get().nodes;
        const defaultIn = inputs.find((d) => d.id !== 0 && !d.name.includes('BlackHole'))?.id || inputs[1]?.id || 0;
        const defaultOut = outputs.find((d) => d.id !== 0 && !d.name.includes('BlackHole'))?.id || outputs[1]?.id || 0;

        const updatedNodes = currentNodes.map((n) => {
          if (n.data.type === 'input' && (!n.data.deviceId || n.data.deviceId === 0)) {
            const devId = n.id.includes('2')
              ? inputs.find((d) => d.name.includes('BlackHole'))?.id || defaultIn
              : defaultIn;
            NativeBridge.updateInputNode(n.id, devId, n.data.gain, n.data.mute);
            return { ...n, data: { ...n.data, deviceId: devId } };
          }
          if (n.data.type === 'output' && (!n.data.deviceId || n.data.deviceId === 0)) {
            const devId = n.id.includes('2')
              ? outputs.find((d) => d.name.includes('BlackHole'))?.id || defaultOut
              : defaultOut;
            NativeBridge.updateOutputNode(n.id, devId, n.data.gain, n.data.mute);
            return { ...n, data: { ...n.data, deviceId: devId } };
          }
          if (n.data.type === 'bus') {
            NativeBridge.updateBusNode(n.id, n.data.gain, n.data.mute);
          }
          return n;
        });

        set({ nodes: updatedNodes });

        // Connect initial edges in Swift CoreAudio engine
        get().edges.forEach((e) => {
          NativeBridge.connect(e.source, e.target);
        });
      });

      // 2. Subscribe to 30fps Real-time VU Meters from Swift AUHAL
      NativeBridge.subscribeMeters((meters: MeterUpdate[]) => {
        const meterMap = new Map<string, { l: number; r: number }>();
        meters.forEach((m) => meterMap.set(m.id, { l: m.peakL, r: m.peakR }));

        set({
          nodes: get().nodes.map((node) => {
            const m = meterMap.get(node.id);
            if (m) {
              return {
                ...node,
                data: { ...node.data, peakL: m.l, peakR: m.r },
              };
            }
            return node;
          }),
        });
      });
    },

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
            // Disconnect in native AUHAL engine immediately!
            NativeBridge.disconnect(removedEdge.source, removedEdge.target);
          }
        }
      });

      set({ edges: updatedEdges });
    },

    // 結線した瞬間に即座にSwift CoreAudioエンジン側で直結！
    onConnect: (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const edge = { ...connection, id: `e-${connection.source}-${connection.target}-${Date.now()}`, animated: true };

      // Swift AUHAL engine direct routing
      NativeBridge.connect(connection.source, connection.target);

      set({
        edges: addEdge(edge, get().edges),
      });
    },

    updateNodeDevice: (id: string, deviceId: number) => {
      set({
        nodes: get().nodes.map((node) => {
          if (node.id === id) {
            const updated = { ...node, data: { ...node.data, deviceId } };
            if (node.data.type === 'input') {
              NativeBridge.updateInputNode(id, deviceId, updated.data.gain, updated.data.mute);
            } else if (node.data.type === 'output') {
              NativeBridge.updateOutputNode(id, deviceId, updated.data.gain, updated.data.mute);
            }
            return updated;
          }
          return node;
        }),
      });
    },

    updateNodeGain: (id: string, gain: number) => {
      set({
        nodes: get().nodes.map((node) => {
          if (node.id === id) {
            const updated = { ...node, data: { ...node.data, gain } };
            if (node.data.type === 'input') {
              NativeBridge.updateInputNode(id, node.data.deviceId || 0, gain, updated.data.mute);
            } else if (node.data.type === 'output') {
              NativeBridge.updateOutputNode(id, node.data.deviceId || 0, gain, updated.data.mute);
            } else if (node.data.type === 'bus') {
              NativeBridge.updateBusNode(id, gain, updated.data.mute);
            }
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
            if (node.data.type === 'input') {
              NativeBridge.updateInputNode(id, node.data.deviceId || 0, node.data.gain, newMute);
            } else if (node.data.type === 'output') {
              NativeBridge.updateOutputNode(id, node.data.deviceId || 0, node.data.gain, newMute);
            } else if (node.data.type === 'bus') {
              NativeBridge.updateBusNode(id, node.data.gain, newMute);
            }
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
            return { ...node, data: { ...node.data, solo: !node.data.solo } };
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
        position: { x: 500 + Math.random() * 80, y: 150 + Math.random() * 200 },
        data: {
          id: newId,
          name: `バイパスライン ${nextNum} (Bus ${nextNum})`,
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

      NativeBridge.updateBusNode(newId, 1.0, false);
      set({ nodes: [...get().nodes, newNode] });
    },

    addNodeAtPosition: (
      type: AudioNodeType,
      position: { x: number; y: number },
      presetName?: string,
      subType?: string,
      defaultDeviceId?: number
    ) => {
      const newId = `${type}-${Date.now()}`;
      let name = presetName || `${type.toUpperCase()} Node`;
      let deviceId = defaultDeviceId || 0;

      if (type === 'input') {
        const inDevs = get().availableInputs;
        if (!deviceId && inDevs.length > 1) {
          deviceId = inDevs[1].id;
        }
        NativeBridge.updateInputNode(newId, deviceId, 1.0, false);
      } else if (type === 'output') {
        const outDevs = get().availableOutputs;
        if (!deviceId && outDevs.length > 1) {
          deviceId = outDevs[1].id;
        }
        NativeBridge.updateOutputNode(newId, deviceId, 1.0, false);
      } else if (type === 'bus') {
        const count = get().nodes.filter((n) => n.data.type === 'bus').length + 1;
        name = presetName || `バイパスライン ${count} (Bus ${count})`;
        NativeBridge.updateBusNode(newId, 1.0, false);
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
          deviceId,
          gain: 1.0,
          mute: false,
          solo: false,
          pan: 0,
          peakL: 0,
          peakR: 0,
        },
      };

      set({ nodes: [...get().nodes, newNode] });
    },

    loadDefaultLayout: () => {
      const inDevs = get().availableInputs;
      const outDevs = get().availableOutputs;
      set({
        nodes: createInitialNodes(inDevs, outDevs),
        edges: initialEdges,
      });
      get().initNativeBridge();
    },
  };
});
