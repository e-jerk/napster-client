import type {
  AppView,
  BrowseFile,
  ChannelInfo,
  ChannelUser,
  ChatLine,
  HelpTopic,
  HotlistUser,
  LibraryItem,
  PathMode,
  PrefTab,
  PacketLog,
  PrivateThread,
  SearchHit,
  SpeedId,
  Transfer,
} from './types'
import { detectHub, defaultWssUrl, openNapHost, servedFromOpenNap, uiFromLocation, uiPath, type HubKind, type Iface } from './hub'
import { applyThemeAttr, persistTheme, readTheme, type Theme } from './theme'

export type Phase = 'setup' | 'login' | 'connecting' | 'online'

export const app = $state({
  theme: readTheme() as Theme,
  ui: uiFromLocation() as Iface,
  phase: 'setup' as Phase,
  connected: false,
  hub: detectHub() as HubKind,
  wssUrl: defaultWssUrl(),
  nick: (typeof localStorage !== 'undefined' && localStorage.getItem('napster-nick')) || 'napster_kid',
  email: '',
  password: '',
  speed: 0 as SpeedId,
  localIp: '10.0.0.2',
  view: 'search' as AppView,
  ignore: [] as string[],
  status: 'Not connected',
  error: '',
  stats: { users: 0, files: 0, gigs: 0 },
  search: {
    artist: '',
    title: '',
    maxResults: 100,
    minBitrate: 0,
    maxPing: 0,
    minSpeed: 0 as SpeedId,
    advanced: false,
    results: [] as SearchHit[],
    searching: false,
    selected: null as string | null,
  },
  chat: {
    channel: 'Alternative',
    topic: '',
    input: '',
    messages: [] as ChatLine[],
    users: [] as ChannelUser[],
    selectedUser: null as string | null,
    lastMsgid: '',
  },
  transfers: [] as Transfer[],
  library: [] as LibraryItem[],
  librarySelected: null as string | null,
  hotlist: [] as HotlistUser[],
  hotSelected: null as string | null,
  channels: [] as ChannelInfo[],
  browse: { nick: '', files: [] as BrowseFile[], open: false },
  pms: [] as PrivateThread[],
  packets: [] as PacketLog[],
  player: {
    id: null as string | null,
    title: '',
    playing: false,
    url: '',
    internal: true,
  },
  dialogs: {
    proxy: false,
    join: false,
    about: false,
    bridge: false,
    preferences: false,
    ignore: false,
    shop: false,
    userInfo: null as string | null,
    help: null as HelpTopic | null,
    logon: false,
    feedback: false,
    prefTab: 'personal' as PrefTab,
    menu: null as string | null,
    context: null as { x: number; y: number; items: { label: string; action: string; disabled?: boolean }[] } | null,
    start: false,
  },
  proxy: { enabled: false, host: '', port: '1080', version: '5', user: '', password: '', transfer: 'direct' as 'direct' | 'proxy4' | 'proxy5' },
  prefs: {
    beepDownload: false,
    beepUpload: false,
    autoJoinChat: true,
    filterOffensive: false,
    separatePM: true,
    notifyJoinLeave: true,
    maxInbound: '10',
    maxOutbound: '10',
    deletePartial: true,
    removeSuccessful: false,
    dataPort: '6699',
    firewalled: false,
    promptDelete: true,
    pathMode: 'filename' as PathMode,
    shareDownloadFolder: true,
  },
  logon: { host: 'napster.local', port: '8888' },
  feedback: '',
  win: {
    x: 48,
    y: 40,
    w: 940,
    h: 620,
    maximized: typeof window !== 'undefined' && window.innerWidth < 860,
    minimized: false,
    open: true,
  },
})

export function persistNick(): void {
  try {
    localStorage.setItem('napster-nick', app.nick.trim())
  } catch {
    /* ignore */
  }
  void import('./persist').then((p) => p.schedulePersist()).catch(() => {})
}

export function setTheme(theme: Theme): void {
  app.theme = theme
  persistTheme(theme)
  applyThemeAttr(theme)
  if (theme === 'mac' && !app.win.maximized && app.win.y < 28) app.win.y = 40
  app.dialogs.menu = null
  app.dialogs.start = false
  if (app.ui !== 'chat') app.status = theme === 'mac' ? 'Mac OS X Aqua look' : 'Windows 98 look'
}

function connectionStatus(): string {
  if (app.connected) {
    return app.hub === 'wss' ? `Connected to ${app.wssUrl}` : 'Connected to napster.local'
  }
  if (app.phase === 'connecting') return app.status
  return 'Not connected'
}

export function setUi(ui: Iface, mode: 'push' | 'replace' | 'none' = 'push'): void {
  const prev = app.ui
  app.ui = ui
  if (ui === 'mac' || ui === 'win') {
    if (prev === 'chat') app.view = 'chat'
    setTheme(ui === 'mac' ? 'mac' : 'windows')
  }
  if (ui === 'chat') app.status = connectionStatus()
  if (typeof document !== 'undefined') {
    document.title = ui === 'chat' ? 'OpenNAP' : 'Napster v2.0 BETA 10.3'
  }
  if (mode === 'none' || typeof history === 'undefined') return
  if (!openNapHost() && !servedFromOpenNap()) return
  const next = uiPath(ui)
  if (`${location.pathname}${location.search}` === next) return
  if (mode === 'replace') history.replaceState({ ui }, '', next)
  else history.pushState({ ui }, '', next)
  void import('./persist').then((p) => p.schedulePersist()).catch(() => {})
}
