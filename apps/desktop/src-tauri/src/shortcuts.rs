//! Globalni hotkeys (registracija + rebind).

use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

/// Preferirani hotkeyi za capture regije, redom. PrintScreen često zauzme Windows
/// Snipping Tool ili drugi screenshot alat — tada padamo na prvi slobodni fallback.
pub const DEFAULT_HOTKEYS: &[&str] = &[
    "PrintScreen",
    "CmdOrCtrl+Shift+1",
    "CmdOrCtrl+Shift+S",
    "Alt+Shift+S",
];

/// Registriraj prvi hotkey iz liste koji nije zauzet. Vraća aktivni accelerator.
pub fn register_default(app: &AppHandle) -> Result<String, String> {
    for hk in DEFAULT_HOTKEYS {
        if register(app, hk).is_ok() {
            return Ok((*hk).to_string());
        }
    }
    Err("nijedan default hotkey nije slobodan".into())
}

/// (Re)registriraj hotkey za capture regije. Briše prethodne registracije.
pub fn register(app: &AppHandle, accelerator: &str) -> Result<(), String> {
    let gs = app.global_shortcut();
    let _ = gs.unregister_all();

    gs.on_shortcut(accelerator, move |app, _shortcut, event| {
        if event.state() == ShortcutState::Pressed {
            // Pokreni capture regije (zamrzni + otvori overlay).
            let _ = crate::commands::begin_region_capture(app.clone());
        }
    })
    .map_err(|e| e.to_string())
}

/// Frontend command: promijeni globalni hotkey.
#[tauri::command]
pub fn update_hotkey(app: AppHandle, accelerator: String) -> Result<(), String> {
    register(&app, &accelerator)
}
