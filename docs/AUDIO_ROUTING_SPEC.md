# AudioNodeRouter オーディオルール・ルーティング仕様書

## 1. 信号フローモデル

```
[Audio Input Device / App] 
       │
       ▼ (Node Connection / Edge)
[Pass-Thru Bus 1 ~ 10] (Gain / Mute / Solo / Peak Meter)
       │
       ▼ (Optional Effect Processing)
[Audio Output Device / BlackHole Virtual Cable]
```

## 2. ノードデータ定義 (TypeScript)

```typescript
export type NodeType = 'input' | 'bus' | 'output' | 'effect';

export interface AudioChannelState {
  id: string;
  name: string;
  type: NodeType;
  gain: number;       // 0.0 ~ 2.0 (1.0 = 0dB)
  mute: boolean;      // true: 出力遮断
  solo: boolean;      // true: 当該チャンネルのみ再生
  pan: number;        // -1.0 (Left) ~ +1.0 (Right)
  peakL: number;      // 0.0 ~ 1.0 (リアルタイムメーターL)
  peakR: number;      // 0.0 ~ 1.0 (リアルタイムメーターR)
}

export interface AudioConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
}
```

## 3. macOS Core Audio / BlackHole 仮想ドライバとの連携方式

1. **直接HALストリーム方式 (Native Rust)**
   - `coreaudio-rs` または `cpal` を利用し、macOSのオーディオデバイスIDを直接列挙。
   - BlackHole 16ch/64ch を Output/Input として開き、マルチチャンネルバッファをソフトウェア内で分配。
2. **Web Audio API プロトタイプ方式 (ブラウザ / Webview PoC)**
   - `navigator.mediaDevices.getUserMedia` でマイクやオーディオ入力を取得。
   - `AudioContext` の `ChannelSplitterNode` / `ChannelMergerNode` / `GainNode` / `AnalyserNode` を組み合わせ、キャンバス上の接続と完全連動したリアルタイムサウンドルーティングを実現。
