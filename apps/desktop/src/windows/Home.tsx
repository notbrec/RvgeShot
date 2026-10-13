import { useCallback, useEffect, useMemo, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { openPath } from "@tauri-apps/plugin-opener";
import { listen } from "@tauri-apps/api/event";
import {
  Crop,
  Monitor,
  Settings as SettingsIcon,
  Search,
  Trash2,
  ExternalLink,
  ImageOff,
  Video,
  Play,
} from "lucide-react";
import { ipc } from "../lib/ipc";
import { isVideo } from "../lib/types";
import type { RecordDone, Screenshot } from "../lib/types";

type Filter = "all" | "images" | "videos";
import WindowFrame from "../components/WindowFrame";

export default function Home() {
  const [items, setItems] = useState<Screenshot[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = q.trim() ? await ipc.searchScreenshots(q) : await ipc.listScreenshots(300, 0);
      setItems(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(query), 200);
    return () => clearTimeout(t);
  }, [query, load]);

  useEffect(() => {
    const w = getCurrentWindow();
    const un = w.onFocusChanged(({ payload }) => {
      if (payload) void load(query);
    });
    return () => void un.then((f) => f());
  }, [load, query]);

  // Snimanje i tray-capture zavrsavaju izvan ovog prozora — event je jedini signal.
  useEffect(() => {
    const subs = [
      listen<RecordDone>("rvge:rec-done", (e) => {
        const { error, cancelled } = e.payload;
        if (error) setToast(`Recording failed: ${error}`);
        else if (!cancelled) {
          setToast("Recording saved");
          void load(query);
        }
      }),
      listen<Screenshot>("rvge:shot-saved", () => void load(query)),
      listen<string>("rvge:toast", (e) => setToast(e.payload)),
    ];
    return () => {
      subs.forEach((x) => void x.then((un) => un()));
    };
  }, [load, query]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const visible = useMemo(() => {
    if (filter === "all") return items;
    const wantVideo = filter === "videos";
    return items.filter((s) => isVideo(s) === wantVideo);
  }, [items, filter]);

  const onDelete = async (s: Screenshot) => {
    if (!confirm(`Delete "${s.name}"?`)) return;
    await ipc.deleteScreenshot(s.id, s.filePath);
    setItems((prev) => prev.filter((x) => x.id !== s.id));
  };

  const captureRegion = async () => {
    await getCurrentWindow().hide();
    await ipc.beginRegionCapture();
  };
  const captureFull = async () => {
    await ipc.captureFullscreen("png", 100);
    await load(query);
  };
  const recordArea = async () => {
    await getCurrentWindow().hide();
    await ipc.beginRegionCapture("record");
  };
  const openSettings = async () => {
    const existing = await WebviewWindow.getByLabel("settings");
    if (existing) return existing.setFocus();
    new WebviewWindow("settings", {
      url: "index.html#settings",
      title: "RvgeShot — Settings",
      width: 860,
      height: 660,
      center: true,
    });
  };

  return (
    <WindowFrame title="RvgeShot">
      {/* toolbar */}
      <header className="flex shrink-0 items-center gap-3 px-5 py-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or tag…"
            className="w-full rounded-full bg-elevated/80 py-2 pl-10 pr-4 text-sm outline-none ring-1 ring-white/10 transition focus:ring-2 focus:ring-accent"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={captureRegion} className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white shadow-glow transition hover:brightness-110 active:scale-95">
            <Crop size={16} /> Capture region
          </button>
          <button onClick={recordArea} className="flex items-center gap-2 rounded-full px-3.5 py-2 text-sm ring-1 ring-white/10 transition hover:bg-elevated active:scale-95">
            <Video size={16} /> Record
          </button>
          <button onClick={captureFull} className="flex items-center gap-2 rounded-full px-3.5 py-2 text-sm ring-1 ring-white/10 transition hover:bg-elevated active:scale-95">
            <Monitor size={16} /> Full screen
          </button>
          <button onClick={openSettings} title="Settings" className="grid h-9 w-9 place-items-center rounded-full ring-1 ring-white/10 transition hover:bg-elevated active:scale-95">
            <SettingsIcon size={18} />
          </button>
        </div>
      </header>

      {/* filter */}
      <div className="flex shrink-0 items-center gap-1 px-5 pb-2">
        {(["all", "images", "videos"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs capitalize transition-colors ${
              filter === f ? "bg-accent text-white" : "text-muted hover:bg-elevated"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* galerija */}
      <main className="min-h-0 flex-1 overflow-auto px-5 pb-5">
        {loading && items.length === 0 ? (
          <div className="grid h-full place-items-center text-muted">Loading…</div>
        ) : visible.length === 0 ? (
          <EmptyState onCapture={captureRegion} hasQuery={!!query.trim() || filter !== "all"} />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visible.map((s) => (
              <Card key={s.id} shot={s} onDelete={() => onDelete(s)} />
            ))}
          </div>
        )}
      </main>

      {toast && (
        <div className="pointer-events-none absolute bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-elevated/95 px-4 py-2 text-sm shadow-card ring-1 ring-white/10 animate-pop">
          {toast}
        </div>
      )}
    </WindowFrame>
  );
}

function Card({ shot, onDelete }: { shot: Screenshot; onDelete: () => void }) {
  const video = isVideo(shot);
  // MP4 se ne moze prikazati u <img>; bez thumbnaila ide placeholder.
  const src = shot.thumbPath ?? (video ? null : shot.filePath);
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-elevated/60 ring-1 ring-white/10 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card hover:ring-white/20">
      <div className="relative aspect-video w-full bg-black/30">
        {src ? (
          <img
            src={convertFileSrc(src)}
            alt={shot.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted">
            <Video size={26} />
          </div>
        )}
        {video && (
          <>
            <button
              onClick={() => openPath(shot.filePath)}
              title="Play"
              className="absolute inset-0 grid place-items-center opacity-0 transition-opacity group-hover:opacity-100"
            >
              <span className="grid h-11 w-11 place-items-center rounded-full bg-black/65 text-white backdrop-blur">
                <Play size={18} fill="currentColor" />
              </span>
            </button>
            <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] uppercase text-white">
              {shot.format}
            </span>
          </>
        )}
      </div>
      <div className="px-3 py-2">
        <div className="truncate text-[13px] font-medium">{shot.name}</div>
        <div className="font-mono text-[11px] text-muted">
          {shot.width}×{shot.height} · {fmtBytes(shot.sizeBytes)}
        </div>
      </div>
      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button onClick={() => openPath(shot.filePath)} title="Open" className="grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75">
          <ExternalLink size={15} />
        </button>
        <button onClick={onDelete} title="Delete" className="grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-danger">
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onCapture, hasQuery }: { onCapture: () => void; hasQuery: boolean }) {
  return (
    <div className="grid h-full place-items-center text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-elevated/60 ring-1 ring-white/10">
          <ImageOff size={26} className="text-muted" />
        </div>
        <h2 className="mb-1 text-lg font-semibold tracking-tight">{hasQuery ? "No results" : "No screenshots yet"}</h2>
        <p className="mb-5 text-sm text-muted">
          {hasQuery ? "Try a different term." : "Press the hotkey or button to capture your first screenshot."}
        </p>
        {!hasQuery && (
          <button onClick={onCapture} className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-glow transition hover:brightness-110 active:scale-95">
            Capture region
          </button>
        )}
      </div>
    </div>
  );
}

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
