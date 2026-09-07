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

## Menus and ads (from napster.exe)

`napv2b10-3.exe` on archive.org is a MindVision VISE installer (`ESIV` overlay at `0x11000`). This project unpacked that overlay (byte-swap + raw deflate) and dumped **napster.exe** (581,632 bytes, MD5 `6d121b9717f53c48ee1254bd28ed9c00`). The EXE is not bundled here.

Top-level menus are ASCII strings in `.rdata`. Context menus are `RT_MENU` 276–316. Shop chrome is **BITMAP 452** (50×12 CDNOW wordmark) and the URL `http://shop.napster.com`. Home / Discover / Help were embedded IE panes (`home.html?02b103`, `discover.html`, `client/help/…`). About credits AMP / PlayMedia, Windows Media, and Relatable.

| Menu | Items (exact 10.3 labels) |
| --- | --- |
| **File** | Connect, Disconnect, Preferences, Exit |
| **View** | Home (Ctrl+H), Chat (Ctrl+A), My Files (Ctrl+M), Search (Ctrl+S), Hot List (Ctrl+L), Transfer (Ctrl+T), Discover (Ctrl+D) |
| **Actions** | Instant Message, Add User to Hot List, View User Information, Join Chat Rooms, View Ignore List, Shop for Music at CDNOW, Logon Server |
| **Help** | Getting Started, Home, Manual (Installation…Extra Knowledge), Napster FAQ (Connecting…Company Info), Customer Support, Send Us Some Feedback!, About Napster |

The toolbar matches those View tabs plus **Help** and the **CDNOW** shop button. The strip under the toolbar rotates the four in-client surfaces the binary actually had (CDNOW / shop.napster.com, Home `?02b103`, Discover, AMP). Clicks open a local pane or an Internet Archive snapshot — no live ad network.

Status bar wording is from the binary: `Online (nick): Sharing N files.` plus `Currently N users sharing N files (N gigs)`.

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
- Chat rooms and slash commands (`/join`, `/me`, `/msg`, `/whois`, `/away`, `/topic`, `/history`, `/help`, …)
- Library + internal player (short original WAV previews)
- Hot list, browse user, context menus
- Status bar share / library counts in the original “Sharing N files, Currently…” wording
- Desktop theme switch (Mac Aqua ↔ Windows 98) around the same in-browser hub
- Home bulletin (`home.html?02b103`), Discover, CDNOW / shop.napster.com, Help tree from napster.exe, Preferences tabs (Personal / Chat / Transfer / Proxy / My Files), Ignore List, Logon Server, Send Feedback
- Search popup, user popup, My Files popup, Transfer popup, and Hot List popup from `RT_MENU` resources

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

The same UI can speak `naps-1` over WebSocket to a live [OpenNAP](https://github.com/e-jerk/opennap) hub. Served from that server at `/?ui=win` or `/?ui=mac`, it defaults to the current origin (`ws:` / `wss:`). From this Vite app, choose **This OpenNAP server** on the nickname dialog, or open:

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
