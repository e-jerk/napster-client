import { basename } from './format'
import { adoptDownloads, adoptShare, downloadDir, listShareFiles, libraryFromFile, shareDir } from './fs'
import { idbGet, idbSet } from './idb'
import { app, persistNick } from './session.svelte'
import { persistTheme } from './theme'
import type { ChatLine, HotlistUser, LibraryItem, PrivateThread, Transfer } from './types'

const KEY = 'session'
const COLS = 'cols'
const MAX_CHAT = 400
const MAX_PM = 80
const MAX_XFER = 80
const MAX_BLOB = 16 * 1024 * 1024

export type ColMap = Record<string, Record<string, number>>

type Snapshot = {
  nick: string
  email: string
  password: string
  speed: number
  localIp: string
  wssUrl: string
  logon: { host: string; port: string }
  phase: 'setup' | 'login'
  view: typeof app.view
  ignore: string[]
  prefs: typeof app.prefs
  proxy: typeof app.proxy
  win: typeof app.win
  search: Pick<typeof app.search, 'artist' | 'title' | 'maxResults' | 'minBitrate' | 'maxPing' | 'minSpeed' | 'advanced'>
  chat: { channel: string; messages: ChatLine[] }
  pms: PrivateThread[]
  hotlist: HotlistUser[]
  library: LibraryItem[]
  transfers: Transfer[]
  theme: typeof app.theme
  share: FileSystemDirectoryHandle | null
  downloads: FileSystemDirectoryHandle | null
}

let hydrated = false
let timer: number | null = null
let writing = false

export function isFakePath(name: string): boolean {
  const n = name.replaceAll('/', '\\')
  if (/^[A-Za-z]:\\/.test(n)) return true
  return /My Music\\|Program Files\\Napster\\|Windows\\Desktop\\|\\mp3s\\|\\shared\\/.test(n)
}

function keepBlob(blob: Blob | undefined): Blob | undefined {
  if (!blob || blob.size > MAX_BLOB) return undefined
  return blob
}

function snapshot(): Snapshot {
  const sharedOnDisk = Boolean(shareDir())
  return {
    nick: app.nick,
    email: app.email,
    password: app.password,
    speed: app.speed,
    localIp: app.localIp,
    wssUrl: app.wssUrl,
    logon: { ...app.logon },
    phase: app.phase === 'setup' ? 'setup' : 'login',
    view: app.view,
    ignore: [...app.ignore],
    prefs: { ...app.prefs },
    proxy: { ...app.proxy },
    win: { ...app.win },
    search: {
      artist: app.search.artist,
      title: app.search.title,
      maxResults: app.search.maxResults,
      minBitrate: app.search.minBitrate,
      maxPing: app.search.maxPing,
      minSpeed: app.search.minSpeed,
      advanced: app.search.advanced,
    },
    chat: {
      channel: app.chat.channel,
      messages: app.chat.messages.slice(-MAX_CHAT),
    },
    pms: app.pms.slice(-12).map((p) => ({
      ...p,
      messages: p.messages.slice(-MAX_PM),
      open: false,
    })),
    hotlist: app.hotlist.map((h) => ({ ...h, online: false })),
    library: app.library
      .filter((f) => !isFakePath(f.filename))
      .map((f) => ({
        ...f,
        filename: basename(f.filename),
        blob: f.origin === 'shared' && sharedOnDisk ? undefined : keepBlob(f.blob),
      })),
    transfers: app.transfers.slice(0, MAX_XFER).map((t) => ({
      ...t,
      filename: basename(t.filename),
      status: t.status === 'Transferring' || t.status === 'Connecting' || t.status === 'Getting header' ? 'Timed out' : t.status,
      blob: keepBlob(t.blob),
    })),
    theme: app.theme,
    share: shareDir(),
    downloads: downloadDir(),
  }
}

function apply(snap: Snapshot): void {
  app.nick = snap.nick || app.nick
  app.email = snap.email ?? ''
  app.password = snap.password ?? ''
  if (typeof snap.speed === 'number') app.speed = snap.speed as typeof app.speed
  if (snap.localIp) app.localIp = snap.localIp
  if (snap.wssUrl) app.wssUrl = snap.wssUrl
  if (snap.logon) app.logon = { ...app.logon, ...snap.logon }
  app.phase = snap.phase === 'setup' ? 'setup' : 'login'
  if (snap.view) app.view = snap.view
  if (Array.isArray(snap.ignore)) app.ignore = snap.ignore
  if (snap.prefs) app.prefs = { ...app.prefs, ...snap.prefs }
  if (snap.proxy) app.proxy = { ...app.proxy, ...snap.proxy }
  if (snap.win) app.win = { ...app.win, ...snap.win, minimized: false, open: true }
  if (snap.search) Object.assign(app.search, snap.search, { results: [], searching: false, selected: null })
  if (snap.chat) {
    app.chat.channel = snap.chat.channel || app.chat.channel
    app.chat.messages = (snap.chat.messages ?? []).filter((m) => m && m.text)
  }
  if (Array.isArray(snap.pms)) app.pms = snap.pms
  if (Array.isArray(snap.hotlist)) app.hotlist = snap.hotlist
  if (Array.isArray(snap.library)) {
    app.library = snap.library.filter((f) => f && !isFakePath(f.filename)).map((f) => ({ ...f, filename: basename(f.filename) }))
  }
  if (Array.isArray(snap.transfers)) app.transfers = snap.transfers
  if (snap.theme === 'windows' || snap.theme === 'mac') app.theme = snap.theme
  persistNick()
  persistTheme(app.theme)
}

export async function loadSession(): Promise<void> {
  try {
    const snap = await idbGet<Snapshot>(KEY)
    if (snap) apply(snap)
    else migrateLocal()
    if (snap?.share) {
      if (await adoptShare(snap.share)) {
        const files = await listShareFiles()
        if (files.length) {
          const kept = app.library.filter((f) => f.origin === 'download')
          app.library = [...files.map((f) => libraryFromFile(f)), ...kept]
        }
      }
    }
    if (snap?.downloads) await adoptDownloads(snap.downloads)
  } catch {
    /* first run or private mode */
  }
  hydrated = true
}

function migrateLocal(): void {
  try {
    const nick = localStorage.getItem('napster-nick')
    if (nick) app.nick = nick
  } catch {
    /* ignore */
  }
}

export async function saveSession(): Promise<void> {
  if (!hydrated || writing || typeof indexedDB === 'undefined') return
  writing = true
  try {
    await idbSet(KEY, snapshot())
    persistNick()
    persistTheme(app.theme)
  } catch {
    /* quota or private mode */
  } finally {
    writing = false
  }
}

export function schedulePersist(): void {
  if (!hydrated || typeof window === 'undefined') return
  if (timer) window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    void saveSession()
  }, 400)
}

export function bindPersist(): () => void {
  const onHide = () => {
    void saveSession()
  }
  window.addEventListener('pagehide', onHide)
  window.addEventListener('visibilitychange', () => {
    if (document.hidden) onHide()
  })
  const id = window.setInterval(() => void saveSession(), 4000)
  return () => {
    window.removeEventListener('pagehide', onHide)
    window.clearInterval(id)
  }
}

export async function loadCols(): Promise<ColMap> {
  return (await idbGet<ColMap>(COLS)) ?? {}
}

export async function saveCols(key: string, widths: Record<string, number>): Promise<void> {
  const all = (await idbGet<ColMap>(COLS)) ?? {}
  all[key] = widths
  await idbSet(COLS, all)
}

export async function rememberDownloadDir(dir: FileSystemDirectoryHandle): Promise<void> {
  await idbSet('download-dir', dir)
  schedulePersist()
}
