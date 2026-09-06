import type {
  AppView,
  BrowseFile,
  ChannelInfo,
  ChannelUser,
  ChatLine,
  HotlistUser,
  LibraryItem,
  PacketLog,
  PrivateThread,
  SearchHit,
  SpeedId,
  Transfer,
} from './types'
import { detectHub, defaultWssUrl, type HubKind } from './hub'
import { applyThemeAttr, persistTheme, readTheme, type Theme } from './theme'

export type Phase = 'setup' | 'login' | 'connecting' | 'online'

export const app = $state({
  theme: readTheme() as Theme,
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
  status: 'Not connected',
  error: '',
  stats: { users: 0, files: 0, gigs: 0 },
  search: {
    artist: '',
    title: '',
    maxResults: 100,
    minBitrate: 0,
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
  ignore: [] as string[],
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
  },
  dialogs: {
    proxy: false,
    join: false,
    about: false,
    bridge: false,
    menu: null as string | null,
    context: null as { x: number; y: number; items: { label: string; action: string; disabled?: boolean }[] } | null,
    start: false,
  },
  proxy: { enabled: false, host: '', port: '1080', version: '5' },
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

export function setTheme(theme: Theme): void {
  app.theme = theme
  persistTheme(theme)
  applyThemeAttr(theme)
  if (theme === 'mac' && !app.win.maximized && app.win.y < 28) app.win.y = 40
  app.dialogs.menu = null
  app.dialogs.start = false
  app.status = theme === 'mac' ? 'Mac OS X Aqua look' : 'Windows 98 look'
}
