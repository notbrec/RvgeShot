import React, { useEffect, useState } from "react";
import { load, type Store } from "@tauri-apps/plugin-store";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { ipc } from "../lib/ipc";
import type { ImageFormat } from "../lib/types";
import WindowFrame from "../components/WindowFrame";

type Tab = "general" | "hotkeys" | "capture" | "save" | "privacy" | "about";

interface AppSettings {
  theme: "dark" | "light";
  hotkey: string;
  format: ImageFormat;
  quality: number;
  saveFolder: string;
  warnSensitive: boolean;
  stripExif: boolean;
}

const DEFAULTS: AppSettings = {
  theme: "dark",
  hotkey: "PrintScreen",
  format: "png",
  quality: 92,
  saveFolder: "Pictures/RvgeShot",
  warnSensitive: true,
  stripExif: true,
};

const TABS: { id: Tab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "hotkeys", label: "Hotkeys" },
  { id: "capture", label: "Capture" },
  { id: "save", label: "Save" },
  { id: "privacy", label: "Privacy" },
  { id: "about", label: "About" },
];

export default function Settings() {
  const [tab, setTab] = useState<Tab>("general");
  const [s, setS] = useState<AppSettings>(DEFAULTS);
  const [store, setStore] = useState<Store | null>(null);
  const [autostart, setAutostart] = useState(false);

  useEffect(() => {
    (async () => {
      const st = await load("settings.json", { autoSave: true, defaults: {} });
      setStore(st);
      const loaded = { ...DEFAULTS };
      for (const k of Object.keys(DEFAULTS) as (keyof AppSettings)[]) {
        const v = await st.get(k);
        if (v !== undefined && v !== null) (loaded as Record<string, unknown>)[k] = v;
      }
      setS(loaded);
      try {
        setAutostart(await isEnabled());
      } catch {
        /* noop */
      }
    })();
  }, []);

  function set<K extends keyof AppSettings>(key: K, val: AppSettings[K]) {
    setS((prev) => ({ ...prev, [key]: val }));
    void store?.set(key, val);
  }

  const applyTheme = (theme: "dark" | "light") => {
    set("theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("rvge-theme", theme);
  };

  const toggleAutostart = async (on: boolean) => {
    try {
      on ? await enable() : await disable();
      setAutostart(on);
    } catch (e) {
      console.error(e);
    }
  };

  const pickFolder = async () => {
    const dir = await openDialog({ directory: true, multiple: false });
    if (typeof dir === "string") set("saveFolder", dir);
  };

  return (
    <WindowFrame title="Settings">
      <div className="flex min-h-0 flex-1">
        {/* tabovi */}
        <nav className="flex w-48 flex-col gap-1 border-r border-white/5 bg-black/10 p-3">
        <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted">Settings</div>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              tab === t.id ? "bg-accent text-white" : "text-muted hover:bg-elevated hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-auto p-6">
        {tab === "general" && (
          <Section title="General">
            <Row label="Theme" hint="Light or dark interface scheme.">
              <Segmented
                value={s.theme}
                options={[
                  { v: "dark", l: "Dark" },
                  { v: "light", l: "Light" },
                ]}
                onChange={(v) => applyTheme(v as "dark" | "light")}
              />
            </Row>
            <Row
              label="Launch on startup"
              hint="Open RvgeShot quietly in the background at every sign-in."
            >
              <Toggle checked={autostart} onChange={toggleAutostart} />
            </Row>
          </Section>
        )}

        {tab === "hotkeys" && (
          <Section title="Hotkeys">
            <Row label="Region capture">
              <HotkeyInput
                value={s.hotkey}
                onChange={async (accel) => {
                  set("hotkey", accel);
                  try {
                    await ipc.updateHotkey(accel);
                  } catch (e) {
                    console.error(e);
                  }
                }}
              />
            </Row>
            <p className="mt-3 text-xs text-muted">
              Click the field, then press a combination. Changes apply immediately. Full-screen /
              window capture coming in F2-18.
            </p>
          </Section>
        )}

        {tab === "capture" && (
          <Section title="Capture">
            <Row label="Default format" hint="Format new screenshots are saved in.">
              <Segmented
                value={s.format}
                options={[
                  { v: "png", l: "PNG" },
                  { v: "jpg", l: "JPG" },
                  { v: "webp", l: "WebP" },
                ]}
                onChange={(v) => set("format", v as ImageFormat)}
              />
            </Row>
            <Row label={`Quality (${s.quality})`}>
              <input
                type="range"
                min={50}
                max={100}
                value={s.quality}
                disabled={s.format === "png"}
                onChange={(e) => set("quality", +e.target.value)}
                className="w-48"
              />
            </Row>
            {s.format === "png" && <p className="text-xs text-muted">PNG is lossless — quality doesn't apply.</p>}
          </Section>
        )}

        {tab === "save" && (
          <Section title="Save">
            <Row label="Folder">
              <div className="flex items-center gap-2">
                <code className="max-w-xs truncate rounded bg-elevated px-2 py-1 text-xs">{s.saveFolder}</code>
                <button onClick={pickFolder} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-elevated">
                  Change
                </button>
              </div>
            </Row>
          </Section>
        )}

        {tab === "privacy" && (
          <Section title="Privacy">
            <Row label="Warn before uploading sensitive content">
              <Toggle checked={s.warnSensitive} onChange={(v) => set("warnSensitive", v)} />
            </Row>
            <Row label="Strip EXIF/metadata on save">
              <Toggle checked={s.stripExif} onChange={(v) => set("stripExif", v)} />
            </Row>
            <div className="mt-6 rounded-xl border border-danger/40 bg-danger/5 p-4">
              <div className="mb-1 text-sm font-medium text-danger">Danger zone</div>
              <p className="mb-3 text-xs text-muted">Permanently deletes the local gallery and database. (F4-3)</p>
              <button
                onClick={() => alert("TODO (F4-3): delete all local data.")}
                className="rounded-lg border border-danger px-3 py-1.5 text-sm text-danger hover:bg-danger hover:text-white"
              >
                Delete all local data
              </button>
            </div>
          </Section>
        )}

        {tab === "about" && (
          <Section title="About">
            <p className="text-sm text-muted">RvgeShot · version 0.1.3</p>
            <p className="mt-2 text-sm text-muted">Fast, private screenshot tool. Privacy built in, not bolted on.</p>
          </Section>
        )}
      </div>
      </div>
    </WindowFrame>
  );
}

// ── UI primitivci ──
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="max-w-2xl">
      <h1 className="mb-5 text-xl font-semibold">{title}</h1>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-border/60 pb-4">
      <div className="min-w-0">
        <div className="text-sm">{label}</div>
        {hint && <div className="mt-1 text-xs leading-snug text-muted">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${checked ? "bg-accent" : "bg-border"}`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.4)] transition-transform duration-200 ${
          checked ? "translate-x-[1.375rem]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
function Segmented({ value, options, onChange }: { value: string; options: { v: string; l: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="flex rounded-lg border border-border p-0.5">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`rounded-md px-3 py-1 text-sm transition-colors ${value === o.v ? "bg-accent text-white" : "text-muted hover:text-text"}`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}
function HotkeyInput({ value, onChange }: { value: string; onChange: (accel: string) => void }) {
  const [capturing, setCapturing] = useState(false);
  return (
    <input
      readOnly
      value={capturing ? "Press a combination…" : value}
      onFocus={() => setCapturing(true)}
      onBlur={() => setCapturing(false)}
      onKeyDown={(e) => {
        e.preventDefault();
        const accel = buildAccelerator(e);
        if (accel) {
          onChange(accel);
          setCapturing(false);
          e.currentTarget.blur();
        }
      }}
      className="w-48 cursor-pointer rounded-lg border border-border bg-bg px-3 py-1.5 text-center font-mono text-sm outline-none focus:border-accent"
    />
  );
}

function buildAccelerator(e: React.KeyboardEvent): string | null {
  const mods: string[] = [];
  if (e.ctrlKey) mods.push("Ctrl");
  if (e.shiftKey) mods.push("Shift");
  if (e.altKey) mods.push("Alt");
  if (e.metaKey) mods.push("Super");
  const k = e.key;
  if (["Control", "Shift", "Alt", "Meta"].includes(k)) return null;
  let key = k;
  if (k === " ") key = "Space";
  else if (k.length === 1) key = k.toUpperCase();
  else if (k.startsWith("Arrow")) key = k.slice(5);
  return [...mods, key].join("+");
}
