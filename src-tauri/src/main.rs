// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod audio_engine;
use audio_engine::NativeAudioEngine;
use std::sync::Arc;
use parking_lot::Mutex;

struct AppState {
    engine: Arc<Mutex<NativeAudioEngine>>,
}

#[tauri::command]
fn get_audio_devices() -> Vec<String> {
    NativeAudioEngine::list_audio_devices()
}

#[tauri::command]
fn set_bus_params(state: tauri::State<AppState>, bus_id: usize, gain: f32, mute: bool, solo: bool) {
    let engine = state.engine.lock();
    engine.update_bus(bus_id, gain, mute, solo);
}

fn main() {
    let app_state = AppState {
        engine: Arc::new(Mutex::new(NativeAudioEngine::new())),
    };

    tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            get_audio_devices,
            set_bus_params,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
