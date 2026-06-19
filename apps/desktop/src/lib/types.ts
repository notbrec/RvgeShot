// TS ogledalo Rust modela (serde camelCase). Vidi src-tauri/src/models.rs.

export type ImageFormat = "png" | "jpg" | "webp";
export type CaptureSource = "region" | "fullscreen" | "window";
export type CaptureAction = "copy" | "save" | "edit" | "upload";

export interface MonitorInfo {
  id: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  isPrimary: boolean;
}

export interface Region {
  monitorId: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Screenshot {
  id: string;
  filePath: string;
  thumbPath: string | null;
  name: string;
  format: string;
  width: number;
  height: number;
  sizeBytes: number;
  source: string;
  createdAt: number;
  isUploaded: boolean;
  tags: string[];
}

// ── Editor / overlay tipovi (frontend-only) ──
export type AnnotationTool =
  | "arrow"
  | "rect"
  | "ellipse"
  | "line"
  | "pen"
  | "marker"
  | "blur"
  | "text"
  | "step";

/** Alati u toolbaru = anotacijski alati + interaktivni (kursor, eyedropper). */
export type EditorTool = AnnotationTool | "select" | "eyedropper";

export interface Point {
  x: number;
  y: number;
}

export interface Annotation {
  id: string;
  tool: AnnotationTool;
  color: string;
  size: number;
  points: Point[]; // pen/marker: mnogo točaka; oblici: [start, end]; text/step: [pos]
  text?: string; // text sadržaj ili broj koraka
}
