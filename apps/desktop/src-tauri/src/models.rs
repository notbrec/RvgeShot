//! Serde modeli dijeljeni između Rust jezgre i frontenda (preko IPC-a).
//! Polja su `camelCase` da odgovaraju TypeScript tipovima u `src/lib/types.ts`.

use serde::{Deserialize, Serialize};

/// Izlazni format slike.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ImageFormat {
    Png,
    Jpg,
    Webp,
}

impl ImageFormat {
    pub fn ext(&self) -> &'static str {
        match self {
            ImageFormat::Png => "png",
            ImageFormat::Jpg => "jpg",
            ImageFormat::Webp => "webp",
        }
    }
}

impl Default for ImageFormat {
    fn default() -> Self {
        ImageFormat::Png
    }
}

/// Izvor capture-a.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CaptureSource {
    Region,
    Fullscreen,
    Window,
}

impl CaptureSource {
    pub fn as_str(&self) -> &'static str {
        match self {
            CaptureSource::Region => "region",
            CaptureSource::Fullscreen => "fullscreen",
            CaptureSource::Window => "window",
        }
    }
}

/// Informacije o jednom monitoru (šalju se overlayu da zna gdje crtati).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MonitorInfo {
    pub id: u32,
    pub name: String,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub scale: f32,
    pub is_primary: bool,
}

/// Pravokutna regija u koordinatama jednog monitora (fizički pikseli).
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Region {
    pub monitor_id: u32,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

/// Akcija koju korisnik odabere u overlay floating toolbaru.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CaptureAction {
    Copy,
    Save,
    Edit,
    Upload, // Faza 3
}

/// Zapis screenshota u lokalnoj galeriji.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Screenshot {
    pub id: String,
    pub file_path: String,
    pub thumb_path: Option<String>,
    pub name: String,
    pub format: String,
    pub width: u32,
    pub height: u32,
    pub size_bytes: u64,
    pub source: String,
    pub created_at: i64, // unix ms
    pub is_uploaded: bool,
    pub tags: Vec<String>,
}
