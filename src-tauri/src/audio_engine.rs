// audio_engine.rs: Native macOS Core Audio & 10-Bus Routing Engine (Rust)

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use ringbuf::HeapRb;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use parking_lot::Mutex;

pub const NUM_VIRTUAL_BUSES: usize = 10;
const BUFFER_SIZE: usize = 1024;

pub struct AudioBus {
    pub id: usize,
    pub name: String,
    pub gain: f32,
    pub mute: bool,
    pub solo: bool,
    pub peak_l: f32,
    pub peak_r: f32,
}

impl AudioBus {
    pub fn new(id: usize, name: &str) -> Self {
        Self {
            id,
            name: name.to_string(),
            gain: 1.0,
            mute: false,
            solo: false,
            peak_l: 0.0,
            peak_r: 0.0,
        }
    }
}

pub struct NativeAudioEngine {
    pub is_running: Arc<AtomicBool>,
    pub buses: Arc<Mutex<Vec<AudioBus>>>,
}

impl NativeAudioEngine {
    pub fn new() -> Self {
        let mut buses = Vec::with_capacity(NUM_VIRTUAL_BUSES);
        for i in 1..=NUM_VIRTUAL_BUSES {
            buses.push(AudioBus::new(i, &format!("Virtual Bus {}", i)));
        }

        Self {
            is_running: Arc::new(AtomicBool::new(false)),
            buses: Arc::new(Mutex::new(buses)),
        }
    }

    /// List macOS CoreAudio input and output devices (e.g. Built-in Mic, BlackHole 16ch/64ch)
    pub fn list_audio_devices() -> Vec<String> {
        let host = cpal::default_host();
        let mut device_names = Vec::new();

        if let Ok(devices) = host.devices() {
            for device in devices {
                if let Ok(name) = device.name() {
                    device_names.push(name);
                }
            }
        }
        device_names
    }

    /// Update gain, mute, solo for a specific bus
    pub fn update_bus(&self, bus_id: usize, gain: f32, mute: bool, solo: bool) {
        let mut buses = self.buses.lock();
        if let Some(bus) = buses.iter_mut().find(|b| b.id == bus_id) {
            bus.gain = gain;
            bus.mute = mute;
            bus.solo = solo;
        }
    }
}
