//! RvgeShot — desktop jezgra (Tauri v2).
//! Postavlja plugine, lokalnu bazu, tray i globalni hotkey, te izlaže komande frontendu.

mod capture;
mod commands;
mod db;
mod models;
mod shortcuts;
mod state;
mod tray;

use tauri::Manager;

use db::Db;
use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Neki WebView2/GPU driveri ruše borderless overlay webview (exit 0xC..., "Edge se pojavi").
    // Isključi GPU akceleraciju u WebView2 → stabilno na svim mašinama.
    std::env::set_var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", "--disable-gpu");

    tauri::Builder::default()
        // ── single-instance MORA biti prvi: druga instanca se ugasi (samo jedna tray ikona) ──
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // pokušaj pokretanja druge instance → pokaži galeriju prve, druga se gasi
            let _ = commands::show_home(app.clone());
        }))
        // ── ostali plugini ───────────────────────────────────────
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None::<Vec<&str>>,
        ))
        // ── setup: baza, tray, hotkey ────────────────────────────
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            let db = Db::open(&data_dir.join("rvgeshot.db")).map_err(|e| e.to_string())?;
            app.manage(AppState::new(db));

            tray::build_tray(app.handle())?;

            match shortcuts::register_default(app.handle()) {
                Ok(hk) => println!("[rvgeshot] aktivan capture hotkey: {hk}"),
                Err(e) => eprintln!("[rvgeshot] hotkey: {e}"),
            }

            // Pred-kreiraj (skriveni) overlay da capture bude instant.
            if let Err(e) = commands::ensure_overlay(app.handle()) {
                eprintln!("[rvgeshot] pred-kreiranje overlaya: {e}");
            }

            Ok(())
        })
        // ── komande dostupne frontendu ───────────────────────────
        .invoke_handler(tauri::generate_handler![
            commands::list_monitors,
            commands::begin_region_capture,
            commands::get_frozen_frame,
            commands::get_frozen_rgba,
            commands::finish_region_capture,
            commands::cancel_capture,
            commands::capture_fullscreen,
            commands::capture_active_window,
            commands::save_edited_image,
            commands::save_image_as,
            commands::copy_base64_to_clipboard,
            commands::list_screenshots,
            commands::search_screenshots,
            commands::delete_screenshot,
            commands::add_tag,
            commands::show_home,
            shortcuts::update_hotkey,
        ])
        .run(tauri::generate_context!())
        .expect("[rvgeshot] greška pri pokretanju aplikacije");
}
