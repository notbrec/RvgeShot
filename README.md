# RvgeShot

**Brzi screenshot alat za 2026. — capture, anotacija, privatni share. Privatnost ugrađena, ne dodana.**

RvgeShot je moderan, lagan desktop alat za hvatanje ekrana: pritisneš hotkey, označiš dio
ekrana, anotiraš ga u sekundi i spremiš lokalno ili podijeliš preko sigurnog, privatnog linka
koji istekne kad ti kažeš. Bez javnih galerija, bez indeksiranja, bez kompromisa.

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
| Indeksiranje od tražilica | da | **nikad** (`noindex`, robots deny) |

---

## Tech stack

- **Desktop:** Tauri v2 + Rust (jezgra) · React + TypeScript + Tailwind (UI)
- **Capture:** `xcap` (Rust) — monitor / regija / aktivni prozor
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

Default hotkey: **`PrintScreen`** za capture regije (promjenjivo u Settings).

## Status

🚧 **Skeleton / scaffold.** Arhitektura, prozori, capture pipeline i komande su postavljeni;
pojedini alati editora i backend share još su označeni `TODO` (vidi `docs/TASK-BREAKDOWN.md`).

## Licenca

TBD (prijedlog: dual — AGPL za core + komercijalna za hosted servis).
