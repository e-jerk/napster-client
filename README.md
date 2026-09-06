# Napster v2.0 BETA 10.3 (web)

A Svelte recreation of the original Napster Windows client. The UI follows **Napster v2.0 BETA 10.3** — the last official P2P build from 2001 — using the copy preserved on the Internet Archive.

**Original client:** [archive.org/details/napv2b10-3](https://archive.org/details/napv2b10-3)  
File: `napv2b10-3.exe` (2,044,147 bytes). That executable is not bundled here.

This is a historical UI + protocol demo. The in-browser network only shares **original demo tracks** (synthesized previews). It does not connect to the real, long-defunct Napster service or any public file-sharing network.

## Zero-native TCP bridge

Browsers cannot open raw TCP sockets. Instead of Electron, Node `net`, or a native helper, the client speaks the classic Napster / OpenNap framing over a **virtual TCP stack** implemented in TypeScript:

- Packet header: `uint16le length` + `uint16le type` + ASCII payload
- Hub on `napster.local:8888` (in-memory)
- Peer transfers on port `6699` using the old `GET` / `SEND` data-port handshake
- Firewalled peers are pushed with message type `500`

Open **Actions → TCP Bridge…** after you connect to watch framed packets.

## What works

- Connection Information wizard (speed + unused SOCKS dialog, matching the archived screenshot)
- Search (artist / title / bitrate), double-click to download
- Transfer manager (downloads + simulated uploads)
- Chat rooms, `/join`, private messages
- Library + internal player (short original WAV previews)
- Hot list, browse user, context menus
- Status bar file / GB / user counts

## Run locally

```bash
npm install
npm run dev
```

The dev server listens on [http://127.0.0.1:43179](http://127.0.0.1:43179).

```bash
npm run build
npm run preview
npm run check
```

## Connect

1. Pick a connection speed (or leave **I don't know!**).
2. Click **Next**, enter a nickname, **Connect**.
3. Search for `modem`, `winamp`, `encode`, or `napster`.
4. Open **Chat** or **Actions → Join Channel…** (try `#OpenNap`).

## Stack

Svelte 5 + Vite + TypeScript. No native addons, no backend process, no second component library.
