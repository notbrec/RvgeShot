//! Tauri komande — jedini most između frontenda i jezgre.
//! Frontend ih zove preko `invoke()` (vidi `src/lib/ipc.ts`).

use std::fs;
use std::path::PathBuf;

use base64::Engine;
use chrono::{Local, Utc};
use tauri::ipc::Response;
use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, State, WebviewUrl,
    WebviewWindowBuilder,
};
use tauri_plugin_clipboard_manager::ClipboardExt;
use uuid::Uuid;

use crate::capture;
use crate::models::{CaptureAction, CaptureSource, ImageFormat, MonitorInfo, Region, Screenshot};
use crate::state::AppState;

fn estr<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

// ──────────────────────────────── putanje ────────────────────────────────

/// Folder galerije (default: Slike/RvgeShot). TODO: čitaj iz settings store-a (F2-17).
fn gallery_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let base = app.path().picture_dir().map_err(estr)?;
    Ok(base.join("RvgeShot"))
}

fn thumbs_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let base = app.path().app_data_dir().map_err(estr)?;
    Ok(base.join("thumbnails"))
}

// ──────────────────────────── interni helperi ────────────────────────────

/// Spremi sliku u galeriju (datoteka + thumbnail + DB zapis) i vrati zapis.
fn save_to_gallery(
    app: &AppHandle,
    state: &State<AppState>,
    img: &image::RgbaImage,
    source: CaptureSource,
    format: ImageFormat,
    quality: u8,
) -> Result<Screenshot, String> {
    let bytes = capture::encode(img, format, quality).map_err(estr)?;

    let dir = gallery_dir(app)?;
    fs::create_dir_all(&dir).map_err(estr)?;

    let id = Uuid::new_v4().to_string();
    let name = format!("RvgeShot {}", Local::now().format("%Y-%m-%d %H.%M.%S"));
    let path = dir.join(format!("{name}.{}", format.ext()));
    fs::write(&path, &bytes).map_err(estr)?;

    // thumbnail (WebP, max 480px)
    let tdir = thumbs_dir(app)?;
    fs::create_dir_all(&tdir).map_err(estr)?;
    let thumb = capture::thumbnail(img, 480);
    let thumb_bytes = capture::encode(&thumb, ImageFormat::Webp, 80).map_err(estr)?;
    let thumb_path = tdir.join(format!("{id}.webp"));
    fs::write(&thumb_path, &thumb_bytes).map_err(estr)?;

    let shot = Screenshot {
        id,
        file_path: path.to_string_lossy().into_owned(),
        thumb_path: Some(thumb_path.to_string_lossy().into_owned()),
        name,
        format: format.ext().to_string(),
        width: img.width(),
        height: img.height(),
        size_bytes: bytes.len() as u64,
        source: source.as_str().to_string(),
        created_at: Utc::now().timestamp_millis(),
        is_uploaded: false,
        tags: Vec::new(),
    };

    state.db.lock().map_err(estr)?.insert(&shot).map_err(estr)?;
    Ok(shot)
}

fn copy_rgba_to_clipboard(app: &AppHandle, img: &image::RgbaImage) -> Result<(), String> {
    let image = tauri::image::Image::new(img.as_raw(), img.width(), img.height());
    app.clipboard().write_image(&image).map_err(estr)
}

/// Trenutna pozicija miša u fizičkim px (Windows). Fallback (0,0).
fn cursor_pos() -> (i32, i32) {
    #[cfg(windows)]
    {
        use windows::Win32::Foundation::POINT;
        use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;
        let mut p = POINT::default();
        if unsafe { GetCursorPos(&mut p) }.is_ok() {
            return (p.x, p.y);
        }
    }
    (0, 0)
}

/// Sakrij (ne zatvaraj!) overlay — ostaje "topao" za sljedeći capture.
fn hide_overlays(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("overlay") {
        let _ = win.hide();
    }
}

/// Pred-kreiraj JEDAN skriveni overlay prozor ("overlay") ako ne postoji.
/// Webview se učita unaprijed → prikaz na hotkey je instant; pozicioniramo ga po monitoru pri capture-u.
pub fn ensure_overlay(app: &AppHandle) -> Result<(), String> {
    if app.get_webview_window("overlay").is_some() {
        return Ok(());
    }
    WebviewWindowBuilder::new(app, "overlay", WebviewUrl::App("index.html#overlay".into()))
        .decorations(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .shadow(false)
        .visible(false)
        .build()
        .map_err(estr)?;
    Ok(())
}

fn open_editor_window(app: &AppHandle, file_path: &str) -> Result<(), String> {
    // Putanju proslijedimo base64-encoded u hashu (izbjegava probleme s razmacima/\).
    let enc = base64::engine::general_purpose::STANDARD.encode(file_path);
    let url = format!("index.html#editor?p={enc}");
    if let Some(existing) = app.get_webview_window("editor") {
        let _ = existing.close();
    }
    WebviewWindowBuilder::new(app, "editor", WebviewUrl::App(url.into()))
        .title("RvgeShot — Editor")
        .inner_size(1120.0, 760.0)
        .min_inner_size(800.0, 560.0)
        .center()
        .build()
        .map_err(estr)?;
    Ok(())
}

// ──────────────────────────────── komande ────────────────────────────────

#[tauri::command]
pub fn list_monitors() -> Result<Vec<MonitorInfo>, String> {
    capture::list_monitors().map_err(estr)
}

#[derive(serde::Serialize, Clone)]
struct CapturePayload {
    path: String,
    token: i64,
    id: u32,
}

/// Zamrzni monitor POD MIŠEM: spremi frame na disk i javi overlayu putanju (asset protokol = brzo).
#[tauri::command]
pub fn begin_region_capture(app: AppHandle) -> Result<(), String> {
    let (cx, cy) = cursor_pos();
    let t = std::time::Instant::now();
    let (info, img) = capture::capture_at(cx, cy).map_err(estr)?;

    // Spremi PNG na disk; overlay ga učita preko asset protokola — puno brže od 14MB IPC prijenosa.
    let png = capture::encode_png_fast(&img).map_err(estr)?;
    let dir = app.path().app_data_dir().map_err(estr)?;
    std::fs::create_dir_all(&dir).map_err(estr)?;
    let path = dir.join("frozen.png");
    std::fs::write(&path, &png).map_err(estr)?;
    let token = Utc::now().timestamp_millis();

    ensure_overlay(&app)?;
    if let Some(win) = app.get_webview_window("overlay") {
        // Pozicioniraj točno preko aktivnog monitora u FIZIČKIM px (ispravno na HiDPI).
        let _ = win.set_position(PhysicalPosition::new(info.x, info.y));
        let _ = win.set_size(PhysicalSize::new(info.width, info.height));
        // Prikaz radi FRONTEND tek nakon što učita sliku → nema crnog bljeska.
        let _ = win.emit(
            "rvge:capture",
            CapturePayload {
                path: path.to_string_lossy().into_owned(),
                token,
                id: info.id,
            },
        );
    }
    println!(
        "[rvge] capture {}x{} za {:?}, png {} KB",
        info.width,
        info.height,
        t.elapsed(),
        png.len() / 1024
    );
    Ok(())
}

/// Vrati zamrznuti frame monitora kao PNG data-URL (za prikaz u overlayu).
#[tauri::command]
pub fn get_frozen_frame(state: State<AppState>, monitor_id: u32) -> Result<String, String> {
    let frozen = state.frozen.lock().map_err(estr)?;
    let frame = frozen
        .frames
        .get(&monitor_id)
        .ok_or_else(|| format!("no frozen frame for monitor {monitor_id}"))?;
    capture::to_png_data_url(frame).map_err(estr)
}

/// Vrati zamrznuti frame kao SIROVE RGBA bajtove (header: width,height kao u32 LE, pa pikseli).
/// Binarni IPC bez PNG/base64 → overlay se pojavi gotovo instantno (ključno za brzinu).
#[tauri::command]
pub fn get_frozen_rgba(state: State<AppState>, monitor_id: u32) -> Response {
    let frozen = match state.frozen.lock() {
        Ok(f) => f,
        Err(_) => return Response::new(Vec::new()),
    };
    // Jedan frame u igri — uzmi po id-u, ili prvi dostupni (robusno na nepodudaranje id-a).
    let Some(frame) = frozen
        .frames
        .get(&monitor_id)
        .or_else(|| frozen.frames.values().next())
    else {
        return Response::new(Vec::new());
    };
    let raw = frame.as_raw();
    let mut out = Vec::with_capacity(8 + raw.len());
    out.extend_from_slice(&frame.width().to_le_bytes());
    out.extend_from_slice(&frame.height().to_le_bytes());
    out.extend_from_slice(raw);
    Response::new(out)
}

/// Završi capture regije odabranom akcijom. Vraća zapis ako je nešto spremljeno.
#[tauri::command]
pub fn finish_region_capture(
    app: AppHandle,
    state: State<AppState>,
    region: Region,
    action: CaptureAction,
    format: ImageFormat,
    quality: u8,
) -> Result<Option<Screenshot>, String> {
    let cropped = {
        let frozen = state.frozen.lock().map_err(estr)?;
        let frame = frozen
            .frames
            .get(&region.monitor_id)
            .ok_or("frozen frame missing")?;
        capture::crop(frame, &region)
    };

    hide_overlays(&app);
    state.frozen.lock().map_err(estr)?.clear();

    match action {
        CaptureAction::Copy => {
            copy_rgba_to_clipboard(&app, &cropped)?;
            Ok(None)
        }
        CaptureAction::Save => {
            let shot = save_to_gallery(&app, &state, &cropped, CaptureSource::Region, format, quality)?;
            Ok(Some(shot))
        }
        CaptureAction::Edit => {
            let shot = save_to_gallery(&app, &state, &cropped, CaptureSource::Region, ImageFormat::Png, 100)?;
            open_editor_window(&app, &shot.file_path)?;
            Ok(Some(shot))
        }
        CaptureAction::Upload => {
            // Faza 3 — vidi docs/SPECIFICATION.md §3.3
            Err("Upload coming in Phase 3".into())
        }
    }
}

/// Odustani od capture-a: zatvori overlaye, oslobodi frozen frameove.
#[tauri::command]
pub fn cancel_capture(app: AppHandle, state: State<AppState>) -> Result<(), String> {
    hide_overlays(&app);
    state.frozen.lock().map_err(estr)?.clear();
    Ok(())
}

/// Capture cijelog primarnog ekrana → spremi u galeriju.
#[tauri::command]
pub fn capture_fullscreen(
    app: AppHandle,
    state: State<AppState>,
    format: ImageFormat,
    quality: u8,
) -> Result<Screenshot, String> {
    let img = capture::capture_primary().map_err(estr)?;
    save_to_gallery(&app, &state, &img, CaptureSource::Fullscreen, format, quality)
}

/// Capture aktivnog prozora — TODO (F1-10): xcap::Window + fokusirani prozor.
#[tauri::command]
pub fn capture_active_window() -> Result<Screenshot, String> {
    Err("Active window capture: TODO (F1-10)".into())
}

/// Spremi sliku iz editora (base64 PNG s canvasa) u galeriju.
#[tauri::command]
pub fn save_edited_image(
    app: AppHandle,
    state: State<AppState>,
    base64_png: String,
    format: ImageFormat,
    quality: u8,
) -> Result<Screenshot, String> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(base64_png.trim())
        .map_err(estr)?;
    let img = image::load_from_memory(&bytes).map_err(estr)?.to_rgba8();
    save_to_gallery(&app, &state, &img, CaptureSource::Region, format, quality)
}

/// Spremi sliku (base64 PNG s canvasa) na proizvoljnu putanju iz "Save As" dialoga.
#[tauri::command]
pub fn save_image_as(
    base64_png: String,
    path: String,
    format: ImageFormat,
    quality: u8,
) -> Result<(), String> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(base64_png.trim())
        .map_err(estr)?;
    let img = image::load_from_memory(&bytes).map_err(estr)?.to_rgba8();
    let out = capture::encode(&img, format, quality).map_err(estr)?;
    std::fs::write(&path, out).map_err(estr)?;
    Ok(())
}

/// Kopiraj base64 PNG (iz editora) u clipboard.
#[tauri::command]
pub fn copy_base64_to_clipboard(app: AppHandle, base64_png: String) -> Result<(), String> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(base64_png.trim())
        .map_err(estr)?;
    let img = image::load_from_memory(&bytes).map_err(estr)?.to_rgba8();
    copy_rgba_to_clipboard(&app, &img)
}

#[tauri::command]
pub fn list_screenshots(
    state: State<AppState>,
    limit: Option<u32>,
    offset: Option<u32>,
) -> Result<Vec<Screenshot>, String> {
    state
        .db
        .lock()
        .map_err(estr)?
        .list(limit.unwrap_or(200), offset.unwrap_or(0))
        .map_err(estr)
}

#[tauri::command]
pub fn search_screenshots(state: State<AppState>, query: String) -> Result<Vec<Screenshot>, String> {
    let db = state.db.lock().map_err(estr)?;
    if query.trim().is_empty() {
        db.list(200, 0).map_err(estr)
    } else {
        db.search(query.trim()).map_err(estr)
    }
}

#[tauri::command]
pub fn delete_screenshot(state: State<AppState>, id: String, file_path: String) -> Result<(), String> {
    state.db.lock().map_err(estr)?.delete(&id).map_err(estr)?;
    let _ = fs::remove_file(&file_path); // best-effort
    Ok(())
}

#[tauri::command]
pub fn add_tag(state: State<AppState>, id: String, tag: String) -> Result<(), String> {
    state.db.lock().map_err(estr)?.add_tag(&id, tag.trim()).map_err(estr)
}

/// Otvori glavni prozor / galeriju (tray, hotkey, single-instance).
/// Na zatvaranje (X) prozor se SAMO sakrije (vidi `on_window_event` u lib.rs),
/// pa ga ovdje obično samo prikažemo. Sigurnosna mreža: ako je "home" ipak
/// nestao (npr. stari build koji ga je uništavao na X), ponovo ga kreiramo —
/// galerija se tako UVIJEK može otvoriti.
#[tauri::command]
pub fn show_home(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("home") {
        let _ = win.unminimize();
        let _ = win.show();
        let _ = win.set_focus();
        return Ok(());
    }
    WebviewWindowBuilder::new(&app, "home", WebviewUrl::App("index.html".into()))
        .title("RvgeShot")
        .inner_size(1120.0, 740.0)
        .min_inner_size(880.0, 560.0)
        .center()
        .build()
        .map_err(estr)?;
    Ok(())
}
