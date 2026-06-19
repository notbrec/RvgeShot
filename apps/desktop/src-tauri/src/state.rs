//! Globalno stanje aplikacije, dijeljeno preko Tauri `State`.

use std::collections::HashMap;
use std::sync::Mutex;

use image::RgbaImage;

use crate::db::Db;

/// Zamrznuti frameovi svih monitora u trenutku capture-a.
/// Drže se u memoriji samo dok je overlay otvoren, pa se oslobađaju.
#[derive(Default)]
pub struct FrozenFrames {
    pub frames: HashMap<u32, RgbaImage>,
}

impl FrozenFrames {
    pub fn clear(&mut self) {
        self.frames.clear();
    }
}

/// Aplikacijsko stanje registrirano u Tauri builderu.
pub struct AppState {
    /// Zamrznuti capture po monitor id-u.
    pub frozen: Mutex<FrozenFrames>,
    /// Lokalna SQLite baza (povijest, tagovi).
    pub db: Mutex<Db>,
}

impl AppState {
    pub fn new(db: Db) -> Self {
        Self {
            frozen: Mutex::new(FrozenFrames::default()),
            db: Mutex::new(db),
        }
    }
}
