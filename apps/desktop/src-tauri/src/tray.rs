//! System tray ikona i quick menu.

use tauri::{
    menu::{Menu, MenuEvent, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, WebviewUrl, WebviewWindowBuilder,
};

use crate::models::ImageFormat;

pub fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let capture_region =
        MenuItem::with_id(app, "capture_region", "Uhvati regiju", true, Some("PrintScreen"))?;
    let capture_full =
        MenuItem::with_id(app, "capture_full", "Uhvati cijeli ekran", true, None::<&str>)?;
    let capture_window =
        MenuItem::with_id(app, "capture_window", "Uhvati prozor", true, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let open_gallery = MenuItem::with_id(app, "open_gallery", "Galerija", true, None::<&str>)?;
    let open_settings = MenuItem::with_id(app, "open_settings", "Postavke", true, None::<&str>)?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Izlaz", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[
            &capture_region,
            &capture_full,
            &capture_window,
            &sep1,
            &open_gallery,
            &open_settings,
            &sep2,
            &quit,
        ],
    )?;

    let mut builder = TrayIconBuilder::with_id("rvge-tray")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .tooltip("RvgeShot")
        .on_menu_event(on_menu_event)
        .on_tray_icon_event(on_tray_event);

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    builder.build(app)?;
    Ok(())
}

fn on_menu_event(app: &AppHandle, event: MenuEvent) {
    match event.id().as_ref() {
        "capture_region" => {
            let _ = crate::commands::begin_region_capture(app.clone());
        }
        "capture_full" => {
            let _ = crate::commands::capture_fullscreen(
                app.clone(),
                app.state(),
                ImageFormat::Png,
                100,
            );
        }
        "capture_window" => {
            let _ = crate::commands::capture_active_window();
        }
        "open_gallery" => {
            let _ = crate::commands::show_home(app.clone());
        }
        "open_settings" => {
            let _ = open_settings(app);
        }
        "quit" => app.exit(0),
        _ => {}
    }
}

fn on_tray_event(tray: &TrayIcon, event: TrayIconEvent) {
    if let TrayIconEvent::Click {
        button: MouseButton::Left,
        button_state: MouseButtonState::Up,
        ..
    } = event
    {
        let _ = crate::commands::show_home(tray.app_handle().clone());
    }
}

fn open_settings(app: &AppHandle) -> tauri::Result<()> {
    if let Some(win) = app.get_webview_window("settings") {
        let _ = win.set_focus();
        return Ok(());
    }
    WebviewWindowBuilder::new(app, "settings", WebviewUrl::App("index.html#settings".into()))
        .title("RvgeShot — Postavke")
        .inner_size(860.0, 660.0)
        .center()
        .build()?;
    Ok(())
}
