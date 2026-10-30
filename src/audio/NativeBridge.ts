// NativeBridge.ts: IPC Bridge between Web UI and macOS CoreAudio AUHAL Engine

export interface AudioDeviceItem {
  id: number;
  name: string;
  uid: string;
}

export interface MeterUpdate {
  id: string;
  peakL: number;
  peakR: number;
}

type DevicesCallback = (inputs: AudioDeviceItem[], outputs: AudioDeviceItem[]) => void;
type MetersCallback = (meters: MeterUpdate[]) => void;

class NativeBridgeManager {
  private static instance: NativeBridgeManager;
  private onDevicesCb: DevicesCallback | null = null;
  private onMetersCb: MetersCallback | null = null;
  private isNativeAvailable: boolean = false;

  private constructor() {
    this.isNativeAvailable = typeof (window as any).webkit?.messageHandlers?.nativeAudio !== 'undefined';

    // Register global callbacks from Swift
    (window as any).__onDevicesList = (payload: { inputs: AudioDeviceItem[]; outputs: AudioDeviceItem[] }) => {
      if (this.onDevicesCb) {
        this.onDevicesCb(payload.inputs || [], payload.outputs || []);
      }
    };

    (window as any).__onNativeMeters = (meters: MeterUpdate[]) => {
      if (this.onMetersCb) {
        this.onMetersCb(meters || []);
      }
    };
  }

  public static getInstance(): NativeBridgeManager {
    if (!NativeBridgeManager.instance) {
      NativeBridgeManager.instance = new NativeBridgeManager();
    }
    return NativeBridgeManager.instance;
  }

  private post(action: string, payload: Record<string, any> = {}) {
    try {
      (window as any).webkit?.messageHandlers?.nativeAudio?.postMessage({
        action,
        ...payload,
      });
    } catch (e) {
      console.warn('NativeBridge post failed (running in browser?):', action, e);
    }
  }

  public subscribeDevices(cb: DevicesCallback) {
    this.onDevicesCb = cb;
    this.post('getDevices');
  }

  public subscribeMeters(cb: MetersCallback) {
    this.onMetersCb = cb;
  }

  public updateInputNode(id: string, deviceId: number, volume: number, mute: boolean) {
    this.post('updateInput', { id, deviceId, volume, mute });
  }

  public updateOutputNode(id: string, deviceId: number, volume: number, mute: boolean) {
    this.post('updateOutput', { id, deviceId, volume, mute });
  }

  public updateBusNode(id: string, volume: number, mute: boolean) {
    this.post('updateBus', { id, volume, mute });
  }

  public connect(sourceId: string, targetId: string) {
    this.post('connect', { sourceId, targetId });
  }

  public disconnect(sourceId: string, targetId: string) {
    this.post('disconnect', { sourceId, targetId });
  }

  public removeNode(id: string) {
    this.post('removeNode', { id });
  }
}

export const NativeBridge = NativeBridgeManager.getInstance();
