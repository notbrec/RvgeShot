// Typed wrapperi oko Tauri `invoke`. Jedina dodirna točka frontenda i Rust jezgre.
// Tauri v2 automatski mapira camelCase (JS) → snake_case (Rust) argumente.

import { invoke } from "@tauri-apps/api/core";
import type {
  CaptureAction,
  ImageFormat,
  MonitorInfo,
  Region,
  Screenshot,
} from "./types";

export const ipc = {
  // ── capture ──
  listMonitors: () => invoke<MonitorInfo[]>("list_monitors"),
  beginRegionCapture: () => invoke<void>("begin_region_capture"),
  getFrozenFrame: (monitorId: number) =>
    invoke<string>("get_frozen_frame", { monitorId }),
  getFrozenRgba: (monitorId: number) =>
    invoke<ArrayBuffer>("get_frozen_rgba", { monitorId }),
  finishRegionCapture: (
    region: Region,
    action: CaptureAction,
    format: ImageFormat,
    quality: number,
  ) =>
    invoke<Screenshot | null>("finish_region_capture", {
      region,
      action,
      format,
      quality,
    }),
  cancelCapture: () => invoke<void>("cancel_capture"),
  captureFullscreen: (format: ImageFormat, quality: number) =>
    invoke<Screenshot>("capture_fullscreen", { format, quality }),

  // ── editor ──
  saveEditedImage: (base64Png: string, format: ImageFormat, quality: number) =>
    invoke<Screenshot>("save_edited_image", { base64Png, format, quality }),
  saveImageAs: (base64Png: string, path: string, format: ImageFormat, quality: number) =>
    invoke<void>("save_image_as", { base64Png, path, format, quality }),
  copyBase64ToClipboard: (base64Png: string) =>
    invoke<void>("copy_base64_to_clipboard", { base64Png }),

  // ── galerija ──
  listScreenshots: (limit?: number, offset?: number) =>
    invoke<Screenshot[]>("list_screenshots", { limit, offset }),
  searchScreenshots: (query: string) =>
    invoke<Screenshot[]>("search_screenshots", { query }),
  deleteScreenshot: (id: string, filePath: string) =>
    invoke<void>("delete_screenshot", { id, filePath }),
  addTag: (id: string, tag: string) => invoke<void>("add_tag", { id, tag }),

  // ── sustav ──
  showHome: () => invoke<void>("show_home"),
  updateHotkey: (accelerator: string) =>
    invoke<void>("update_hotkey", { accelerator }),
};
