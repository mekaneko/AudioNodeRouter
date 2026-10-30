# AudioNodeRouter 🎛️
### macOS 10-Channel Node-Based Virtual Audio Mixer & Routing Matrix

[![macOS](https://img.shields.io/badge/macOS-CoreAudio-black.svg?logo=apple)](https://developer.apple.com/documentation/coreaudio)
[![React](https://img.shields.io/badge/React-18-blue.svg?logo=react)](https://react.dev/)
[![React Flow](https://img.shields.io/badge/React%20Flow-xyflow-purple.svg)](https://reactflow.dev/)
[![Tauri](https://img.shields.io/badge/Tauri-v2-orange.svg?logo=tauri)](https://tauri.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**AudioNodeRouter** は、macOS上で動作する10系統以上の独立した仮想オーディオラインを視覚的に管理・ルーティングできる、**Blender / ComfyUIスタイルのノードベース・オーディオミキサー／ルーティングアプリケーション**です。

---

## 🌟 主な機能と特徴

### 1. 10系統の完全独立仮想バス（Pass-Thru Bus 1 ~ 10）
- 10個の完全独立したステレオバッファ（Bus 1〜10）を常時保持・管理。
- **macOS Core Audio / BlackHole (16ch / 64ch)** のステレオペア（Ch 1-2, Ch 3-4, ...）と1対1で直接マッピング可能。
- 通話音声（Discord）、ゲーム音、BGM、配信プレビュー、マイク入力などをチャンネルごとに完全に分離してルーティング。

### 2. Blender / ComfyUIライクな直感的ノードキャンバス
- **ドラッグ＆ドロップのワイヤリング**: 出力ピン（緑）から入力ピン（青）へ直感的にケーブルを接続。
- **マルチプル・スプリット & サミング**: 1つの出力を複数のバスへ分岐、または複数バスを1つの出力へ自動加算ミキシング。
- **チャンネルストリップ内蔵**: 各ノードに **リアルタイムステレオVUメーター（Peak/RMS）**、**高精度フェーダー（dB換算表示）**、**MUTE**、**SOLO** を搭載。

### 3. 高拡張性エフェクトパイプライン
- ノードとノードの間にエフェクトノード（Parametric EQ、Compressor、Limiter、Filter）を自由にインサート可能。
- グラフ全体を有向非巡回グラフ（DAG）として評価し、超低レイテンシで処理。

---

## 🗺️ アーキテクチャ

```
[Audio Input Device / Mic / BlackHole In]
                 │ (Wire Connection)
                 ▼
      [Pass-Thru Bus 1 ~ Bus 10]
      (Gain: -∞ ~ +6dB | Mute | Solo | Stereo VU Meter)
                 │
                 ▼ (Optional FX Pipeline)
     [Audio Output / Speakers / OBS Stream Out]
```

詳細なアーキテクチャ設計およびBlackHole連携仕様は [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) および [docs/AUDIO_ROUTING_SPEC.md](docs/AUDIO_ROUTING_SPEC.md) をご覧ください。

---

## 🚀 クイックスタート

### 開発環境のセットアップ

```bash
# リポジトリのクローン
git clone https://github.com/mekaneko/AudioNodeRouter.git
cd AudioNodeRouter

# 依存関係のインストール
npm install

# 開発サーバー（Web / UIプレビュー）の起動
npm run dev
```

ブラウザで `http://localhost:5173` を開くと、10系統の仮想バスを備えたノードキャンバスが即座に起動します。

### 操作手順
1. ヘッダーの **「Start Audio Engine」** をクリックしてオーディオ処理を有効化。
2. **「Test Audio」** または **「Enable Microphone」** を押すと、音声信号が接続されたノードを流れます。
3. ケーブルをドラッグして繋ぎ変えたり、ノードの **VOL / MUTE / SOLO** を切り替えてルーティングをテストできます。

---

## 🛠️ 技術スタック

- **フロントエンド / UI:** React 18, TypeScript, Tailwind CSS
- **ノードグラフィクス:** `@xyflow/react` (React Flow)
- **状態管理:** Zustand
- **オーディオエンジン:** 
  - プロトタイプ / PoC: Web Audio API (リアルタイムアナライザー、ゲイン、サミング)
  - ネイティブデスクトップ: Tauri v2 + Rust (`cpal`, `coreaudio-rs`, `ringbuf`)
- **対応OS:** macOS 12 (Monterey) 以降（Apple Silicon M1/M2/M3/M4 & Intel対応）

---

## 📄 ライセンス

MIT License
