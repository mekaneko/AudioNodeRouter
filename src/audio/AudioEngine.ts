// AudioEngine.ts: Web Audio API & Native Bridge Audio Routing Core

export class AudioEngine {
  private static instance: AudioEngine;
  private ctx: AudioContext | null = null;
  private isRunning = false;

  // Node Audio Elements
  private nodeGains: Map<string, GainNode> = new Map();
  private nodeAnalysers: Map<string, { left: AnalyserNode; right: AnalyserNode }> = new Map();
  private splitterNodes: Map<string, ChannelSplitterNode> = new Map();

  // Inputs
  private micStream: MediaStream | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;
  private testOscillator: OscillatorNode | null = null;
  private testGain: GainNode | null = null;

  // Connections (sourceId -> Set<targetId>)
  private connections: Map<string, Set<string>> = new Map();

  // Active solo list
  private soloNodeIds: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  public async initContext(): Promise<boolean> {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx({ latencyHint: 'interactive' });
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    this.isRunning = true;
    return true;
  }

  public getContext(): AudioContext | null {
    return this.ctx;
  }

  public registerNode(nodeId: string): void {
    if (!this.ctx) return;
    if (this.nodeGains.has(nodeId)) return;

    const gain = this.ctx.createGain();
    gain.gain.value = 1.0;

    const splitter = this.ctx.createChannelSplitter(2);
    const leftAnalyser = this.ctx.createAnalyser();
    const rightAnalyser = this.ctx.createAnalyser();
    leftAnalyser.fftSize = 256;
    rightAnalyser.fftSize = 256;

    gain.connect(splitter);
    splitter.connect(leftAnalyser, 0);
    splitter.connect(rightAnalyser, 1);

    this.nodeGains.set(nodeId, gain);
    this.splitterNodes.set(nodeId, splitter);
    this.nodeAnalysers.set(nodeId, { left: leftAnalyser, right: rightAnalyser });
    this.connections.set(nodeId, new Set());
  }

  public unregisterNode(nodeId: string): void {
    const gain = this.nodeGains.get(nodeId);
    if (gain) {
      gain.disconnect();
      this.nodeGains.delete(nodeId);
    }
    this.nodeAnalysers.delete(nodeId);
    this.splitterNodes.delete(nodeId);
    this.connections.delete(nodeId);

    // Remove as target in other nodes
    this.connections.forEach((targets) => {
      targets.delete(nodeId);
    });
  }

  public setGain(nodeId: string, gainValue: number, mute: boolean, solo: boolean): void {
    const gainNode = this.nodeGains.get(nodeId);
    if (!gainNode || !this.ctx) return;

    if (solo) {
      this.soloNodeIds.add(nodeId);
    } else {
      this.soloNodeIds.delete(nodeId);
    }

    // Determine final volume
    let effectiveGain = gainValue;
    if (mute) {
      effectiveGain = 0;
    } else if (this.soloNodeIds.size > 0 && !this.soloNodeIds.has(nodeId)) {
      // If any solo is active and this node is not solo, mute it
      effectiveGain = 0;
    }

    gainNode.gain.setTargetAtTime(effectiveGain, this.ctx.currentTime, 0.02);
  }

  public connect(sourceId: string, targetId: string): void {
    if (!this.ctx) return;
    const sourceGain = this.nodeGains.get(sourceId);
    const targetGain = this.nodeGains.get(targetId);

    if (sourceGain && targetGain) {
      sourceGain.connect(targetGain);
      const targets = this.connections.get(sourceId) || new Set();
      targets.add(targetId);
      this.connections.set(sourceId, targets);
    }
  }

  public disconnect(sourceId: string, targetId: string): void {
    if (!this.ctx) return;
    const sourceGain = this.nodeGains.get(sourceId);
    const targetGain = this.nodeGains.get(targetId);

    if (sourceGain && targetGain) {
      try {
        sourceGain.disconnect(targetGain);
      } catch (e) {
        // Fallback reconnection
        this.rebuildSourceConnections(sourceId);
      }
      const targets = this.connections.get(sourceId);
      if (targets) {
        targets.delete(targetId);
      }
    }
  }

  private rebuildSourceConnections(sourceId: string): void {
    const sourceGain = this.nodeGains.get(sourceId);
    const splitter = this.splitterNodes.get(sourceId);
    if (!sourceGain) return;

    sourceGain.disconnect();
    if (splitter) {
      sourceGain.connect(splitter);
    }

    const targets = this.connections.get(sourceId);
    if (targets) {
      targets.forEach((tId) => {
        const targetGain = this.nodeGains.get(tId);
        if (targetGain) {
          sourceGain.connect(targetGain);
        }
      });
    }
  }

  public connectToMasterOutput(nodeId: string): void {
    if (!this.ctx) return;
    const gainNode = this.nodeGains.get(nodeId);
    if (gainNode) {
      gainNode.connect(this.ctx.destination);
    }
  }

  public disconnectFromMasterOutput(nodeId: string): void {
    if (!this.ctx) return;
    const gainNode = this.nodeGains.get(nodeId);
    if (gainNode) {
      try {
        gainNode.disconnect(this.ctx.destination);
      } catch (e) {
        this.rebuildSourceConnections(nodeId);
      }
    }
  }

  // Real-time Peak Level for VU Meters
  public getMeterLevels(nodeId: string): { peakL: number; peakR: number } {
    const analysers = this.nodeAnalysers.get(nodeId);
    if (!analysers) return { peakL: 0, peakR: 0 };

    const bufferL = new Float32Array(analysers.left.fftSize);
    const bufferR = new Float32Array(analysers.right.fftSize);
    analysers.left.getFloatTimeDomainData(bufferL);
    analysers.right.getFloatTimeDomainData(bufferR);

    let maxL = 0;
    for (let i = 0; i < bufferL.length; i++) {
      const abs = Math.abs(bufferL[i]);
      if (abs > maxL) maxL = abs;
    }

    let maxR = 0;
    for (let i = 0; i < bufferR.length; i++) {
      const abs = Math.abs(bufferR[i]);
      if (abs > maxR) maxR = abs;
    }

    return {
      peakL: Math.min(1.0, maxL),
      peakR: Math.min(1.0, maxR),
    };
  }

  // Microphone Input Helper
  public async enableMicrophone(inputNodeId: string): Promise<boolean> {
    await this.initContext();
    if (!this.ctx) return false;

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      this.micSourceNode = this.ctx.createMediaStreamSource(this.micStream);
      const targetGain = this.nodeGains.get(inputNodeId);
      if (targetGain) {
        this.micSourceNode.connect(targetGain);
      }
      return true;
    } catch (err) {
      console.error('Failed to get mic access', err);
      return false;
    }
  }

  // Test Generator (Sine Tone / Pink Noise) for instant audio testing
  public toggleTestTone(inputNodeId: string, frequency: number = 440): boolean {
    if (!this.ctx) return false;

    if (this.testOscillator) {
      this.testOscillator.stop();
      this.testOscillator.disconnect();
      this.testOscillator = null;
      return false;
    }

    const targetGain = this.nodeGains.get(inputNodeId);
    if (!targetGain) return false;

    this.testOscillator = this.ctx.createOscillator();
    this.testGain = this.ctx.createGain();
    this.testGain.gain.value = 0.3; // safe volume

    this.testOscillator.type = 'sine';
    this.testOscillator.frequency.value = frequency;
    this.testOscillator.connect(this.testGain);
    this.testGain.connect(targetGain);

    this.testOscillator.start();
    return true;
  }
}
