export type AudioNodeType = 'input' | 'bus' | 'output' | 'effect';

export interface AudioNodeData {
  id: string;
  name: string;
  type: AudioNodeType;
  busNumber?: number; // 1 ~ 10 for bus nodes
  subType?: 'mic' | 'oscillator' | 'blackhole-in' | 'speaker' | 'blackhole-out' | 'eq';
  gain: number;       // 0.0 ~ 2.0 (1.0 = 0dB)
  mute: boolean;
  solo: boolean;
  pan: number;        // -1.0 to 1.0
  peakL: number;      // 0.0 to 1.0 (realtime VU)
  peakR: number;      // 0.0 to 1.0 (realtime VU)
}

export interface NodeConnectionData {
  id: string;
  source: string;
  target: string;
}

export interface PresetData {
  id: string;
  name: string;
  nodes: any[];
  edges: any[];
}
