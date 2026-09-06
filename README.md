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

## Mac and Windows looks

The Napster client is the same zero-native web window on both desktops. Switch styles from the **Windows | Mac** control in the toolbar (and on the Mac menu bar), or from **View**, the Apple menu, or the Start menu.

- **Mac OS X Aqua** — menu bar, traffic-light title bar, brushed toolbar, and dock. The app window sits on the Aqua desktop; nothing native is launched.
- **Windows 98** — teal desktop, in-window menus, caption buttons, and a taskbar.

The choice is stored in `localStorage` as `napster-theme`.

## What works

- Connection Information wizard (speed + unused SOCKS dialog, matching the archived screenshot)
- Search (artist / title / bitrate), double-click to download
- Drag listview column edges to resize (double-click a divider to auto-fit)
- Transfer manager (downloads + simulated uploads)
- Chat rooms, `/join`, private messages
- Library + internal player (short original WAV previews)
- Hot list, browse user, context menus
- Status bar file / GB / user counts
- Desktop theme switch (Mac Aqua ↔ Windows 98) around the same in-browser hub

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

## OpenNAP WebSocket

The same UI can speak `naps-1` over WebSocket to a live [OpenNAP](https://github.com/e-jerk/opennap) hub. Served from that server at `/napster`, it defaults to the current origin (`ws:` / `wss:`). From this Vite app, choose **This OpenNAP server** on the nickname dialog, or open:

```
http://127.0.0.1:43179/?hub=wss&server=wss://napster.example.com/
```

Chat, search, hot list, and browse use the real hub. Peer file transfers still need a classic TCP client on port 6699.

```bash
npm run build
```

`dist/index.html` is a single file. OpenNAP embeds it and serves `GET /napster`.

## Stack

Svelte 5 + Vite + TypeScript. No native addons, no backend process, no second component library.
