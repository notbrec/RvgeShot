# RvgeShot

**Brzi screenshot i screen-recording alat za 2026. — capture, snimanje, anotacija, privatni share.
Privatnost ugrađena, ne dodana.**

RvgeShot je moderan, lagan desktop alat za hvatanje ekrana: pritisneš hotkey, označiš dio
ekrana, anotiraš ga u sekundi i spremiš lokalno ili podijeliš preko sigurnog, privatnog linka
koji istekne kad ti kažeš. Isti hotkey-tok radi i za **snimanje ekrana u MP4 ili GIF** — ono
što na Macu radi Cmd+Shift+5, a Windows nikad nije dobio kako treba.
Bez javnih galerija, bez indeksiranja, bez kompromisa.

> Inspirirano principom brzog hvatanja ekrana, ali **potpuno originalan proizvod** — vlastiti
> brand, dizajn, kod i backend. Nije klon nijednog postojećeg alata.

---

## Zašto RvgeShot

| | Stari "brzi screenshot" alati | RvgeShot |
|---|---|---|
| Default vidljivost uploada | često javno / pogodivo | **privatno** uvijek |
| URL-ovi | kratki, pogodivi ID-evi | **high-entropy** (~128 bita) |
| Istek linka | ne | **1h / 1d / 7d / nikad** |
| Password na linku | ne | **da (opcionalno)** |
| Blur / redact osjetljivog | naknadno | **primarni alat** |
| Lokalna galerija | rijetko | **da, s pretragom i tagovima** |
| Snimanje ekrana | zaseban alat | **ugrađeno (MP4 H.264 / GIF)** |
| Indeksiranje od tražilica | da | **nikad** (`noindex`, robots deny) |

---

## Tech stack

- **Desktop:** Tauri v2 + Rust (jezgra) · React + TypeScript + Tailwind (UI)
- **Capture:** `xcap` (Rust) — monitor / regija / aktivni prozor
- **Snimanje:** DXGI Desktop Duplication (hvatanje) + Windows Media Foundation (H.264/MP4),
  uz `gif` crate za GIF izlaz — bez ffmpeg-a i bez vanjskih binaryja
- **Lokalna pohrana:** SQLite (povijest, tagovi, metapodaci) + datotečni sustav (slike)
- **Backend (kasnija faza):** NestJS · PostgreSQL · S3-compatible storage · Sharp
- **Auth (kasnija faza):** email magic-link, Google OAuth opcionalno

## Repo struktura

```
RvgeShot/
├── README.md                  ← ovaj dokument
├── docs/
│   ├── SPECIFICATION.md       ← proizvod, arhitektura, DB, API, security, roadmap
│   └── TASK-BREAKDOWN.md      ← sprint-po-sprint zadaci za developera
└── apps/
    └── desktop/               ← Tauri v2 aplikacija (skeleton)
        ├── src/               ← React frontend (overlay, editor, gallery, settings)
        └── src-tauri/         ← Rust jezgra (capture, db, tray, shortcuts)
```

> Backend (`apps/backend/`) i shared paket (`packages/`) dolaze u Fazi 3 (vidi roadmap).
> Prvi skeleton je **desktop-first** i radi 100% offline.

## Quickstart (desktop)

Preduvjeti: **Node 20+** (testirano na 24), **Rust (stable)** + Tauri preduvjeti za Windows
([WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) + Visual Studio Build Tools).

```bash
cd apps/desktop
npm install
npm run tauri dev      # razvojni mod
npm run tauri build    # produkcijski .msi / .exe
```

> Default je npm (radi odmah). Voliš li `pnpm`/`yarn`, slobodno — samo zamijeni i
> `beforeDevCommand`/`beforeBuildCommand` u `src-tauri/tauri.conf.json`.

Default hotkeyi (promjenjivi u Settings → Hotkeys):

| Akcija | Hotkey | Fallback ako je zauzet |
|---|---|---|
| Capture regije | `PrintScreen` | `Ctrl+Shift+1`, `Ctrl+Shift+S`, `Alt+Shift+S` |
| Snimanje ekrana | `Ctrl+Shift+R` | `Ctrl+Shift+5`, `Alt+Shift+R`, `Ctrl+Alt+R` |

> **Zašto ne `Fn+R`?** `Fn` obrađuje sama tipkovnica — Windows ga nikad ne vidi. Vidi samo
> tipku koju kombinacija proizvede (npr. `Fn+P` šalje pravi `PrintScreen`, zato taj radi).
> Za snimanje zato ide obična kombinacija koju OS registrira.

### Snimanje ekrana

Hotkey → označi područje → **Record**. Traka s tajmerom nudi pauzu, stop i odbaci; isti
hotkey ponovno pritisnut zaustavlja snimanje. Snimka završi u galeriji uz screenshotove.

- **MP4 (H.264)** — Media Foundation, hardverski enkoder kad ga ima. Default na Windowsu.
- **GIF** — do 960px širine, za direktno lijepljenje u chat.
- Kursor se ucrtava u snimku (isključivo u Settings → Recording).
- Sigurnosni limit trajanja (default 30 min) da zaboravljeno snimanje ne napuni disk.

### Dijagnostika

Aplikacija piše log u `%APPDATA%/app.rvgeshot.desktop/logs/rvgeshot.log`
(Settings → About → **Open log file**). Svaki panic i neuspjeh snimanja završi ondje.

## Status

**v0.2.0 — desktop je upotrebljiv.** Capture regije, anotacije, lokalna galerija i snimanje
ekrana rade end-to-end. Capture aktivnog prozora i privatni upload (Faza 3) još su `TODO`
(vidi `docs/TASK-BREAKDOWN.md`).

### Testovi

```bash
cd apps/desktop/src-tauri
cargo test                              # geometrija cropa + pretvorba boja
cargo test --release -- --ignored       # puni lanac DXGI → H.264 → MP4 (treba stvarni desktop)
```

## Licenca

TBD (prijedlog: dual — AGPL za core + komercijalna za hosted servis).
