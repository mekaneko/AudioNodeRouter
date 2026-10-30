// BlackHole channel configuration for AudioNodeRouter
// macOS detected devices: BlackHole 2ch (2ch I/O), BlackHole 16ch (16ch I/O)
// This file defines all available virtual bypass lines derived from those devices.

export interface VirtualBypassLine {
  id: string;
  label: string;       // 表示名
  device: string;      // Core Audio device name
  channelL: number;    // Left channel index (0-based)
  channelR: number;    // Right channel index (0-based)
  available: boolean;  // false = device not installed
  description: string; // Typical use case
}

// BlackHole 2ch — 1 stereo pair
export const BLACKHOLE_2CH_LINES: VirtualBypassLine[] = [
  {
    id: 'bh2-1',
    label: 'BlackHole 2ch: Ch 1-2 (メイン)',
    device: 'BlackHole 2ch',
    channelL: 0,
    channelR: 1,
    available: true,
    description: '汎用バイパス・OBS/DAWへの送り',
  },
];

// BlackHole 16ch — 8 stereo pairs
export const BLACKHOLE_16CH_LINES: VirtualBypassLine[] = [
  {
    id: 'bh16-1',
    label: 'BlackHole 16ch: Ch 1-2 (Discord/通話)',
    device: 'BlackHole 16ch',
    channelL: 0,
    channelR: 1,
    available: true,
    description: 'Discord / Zoom / Teams などの通話音声',
  },
  {
    id: 'bh16-2',
    label: 'BlackHole 16ch: Ch 3-4 (Game/ゲーム音)',
    device: 'BlackHole 16ch',
    channelL: 2,
    channelR: 3,
    available: true,
    description: 'ゲーム音声・メインアプリ音',
  },
  {
    id: 'bh16-3',
    label: 'BlackHole 16ch: Ch 5-6 (Music/BGM)',
    device: 'BlackHole 16ch',
    channelL: 4,
    channelR: 5,
    available: true,
    description: 'Spotify / YouTube / 音楽プレイヤー',
  },
  {
    id: 'bh16-4',
    label: 'BlackHole 16ch: Ch 7-8 (SFX/効果音)',
    device: 'BlackHole 16ch',
    channelL: 6,
    channelR: 7,
    available: true,
    description: 'Soundpad / SEトリガー',
  },
  {
    id: 'bh16-5',
    label: 'BlackHole 16ch: Ch 9-10 (Mic Clean/生声)',
    device: 'BlackHole 16ch',
    channelL: 8,
    channelR: 9,
    available: true,
    description: 'マイク（エフェクト前のクリーン音）',
  },
  {
    id: 'bh16-6',
    label: 'BlackHole 16ch: Ch 11-12 (Mic FX/ボイチェン)',
    device: 'BlackHole 16ch',
    channelL: 10,
    channelR: 11,
    available: true,
    description: 'ボイスチェンジャー・エフェクト後マイク',
  },
  {
    id: 'bh16-7',
    label: 'BlackHole 16ch: Ch 13-14 (OBS Monitor/配信)',
    device: 'BlackHole 16ch',
    channelL: 12,
    channelR: 13,
    available: true,
    description: 'OBSモニタリング・配信ミックス',
  },
  {
    id: 'bh16-8',
    label: 'BlackHole 16ch: Ch 15-16 (System/通知音)',
    device: 'BlackHole 16ch',
    channelL: 14,
    channelR: 15,
    available: true,
    description: 'システム通知音・アラート',
  },
];

// Internal software buses (no hardware needed)
export const INTERNAL_BUS_LINES: VirtualBypassLine[] = [
  {
    id: 'int-1',
    label: '内部バス A (Internal)',
    device: 'Web Audio API',
    channelL: 0,
    channelR: 1,
    available: true,
    description: 'ソフトウェア内部のみ（仮想ミックス）',
  },
  {
    id: 'int-2',
    label: '内部バス B (Internal)',
    device: 'Web Audio API',
    channelL: 0,
    channelR: 1,
    available: true,
    description: 'ソフトウェア内部のみ（仮想ミックス）',
  },
  {
    id: 'int-3',
    label: 'NDI Audio (NewTek)',
    device: 'NDI Audio',
    channelL: 0,
    channelR: 1,
    available: true,
    description: 'NDI経由の音声ルーティング',
  },
  {
    id: 'int-4',
    label: 'Camo Microphone (Reincubate)',
    device: 'Camo Microphone',
    channelL: 0,
    channelR: 1,
    available: true,
    description: 'Camo仮想マイクへのバイパス',
  },
];

// All lines combined — the full selector list shown in each Bus node
export const ALL_BYPASS_LINES: VirtualBypassLine[] = [
  ...INTERNAL_BUS_LINES,
  ...BLACKHOLE_2CH_LINES,
  ...BLACKHOLE_16CH_LINES,
];

// Legacy string labels for the dropdown (for backward compatibility)
export const BYPASS_LINE_LABELS: string[] = ALL_BYPASS_LINES.map((l) => l.label);
