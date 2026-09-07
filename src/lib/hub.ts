export type HubKind = 'demo' | 'wss'
export type Iface = 'chat' | 'win' | 'mac'

declare global {
  interface Window {
    __OPENNAP__?: boolean
  }
}

function uiParam(): string {
  if (typeof location === 'undefined') return ''
  return (new URLSearchParams(location.search).get('ui') || '').toLowerCase()
}

export function openNapHost(): boolean {
  return typeof window !== 'undefined' && window.__OPENNAP__ === true
}

export function uiTheme(): 'windows' | 'mac' | null {
  const ui = uiParam()
  if (ui === 'mac') return 'mac'
  if (ui === 'win' || ui === 'windows' || ui === 'napster') return 'windows'
  return null
}

export function uiFromLocation(): Iface {
  const ui = uiParam()
  if (ui === 'mac') return 'mac'
  if (ui === 'win' || ui === 'windows' || ui === 'napster') return 'win'
  if (ui === 'chat') return 'chat'
  if (openNapHost()) return 'chat'
  return uiTheme() === 'mac' ? 'mac' : 'win'
}

export function uiPath(ui: Iface): string {
  if (ui === 'chat') return '/?ui=chat'
  if (ui === 'mac') return '/?ui=mac'
  return '/?ui=win'
}

export function detectHub(): HubKind {
  if (typeof location === 'undefined') return 'demo'
  const q = new URLSearchParams(location.search)
  if (q.get('hub') === 'demo') return 'demo'
  if (q.get('hub') === 'wss') return 'wss'
  if (servedFromOpenNap()) return 'wss'
  return 'demo'
}

export function defaultWssUrl(): string {
  if (typeof location === 'undefined') return 'ws://127.0.0.1:8890/'
  const q = new URLSearchParams(location.search)
  const server = q.get('server')
  if (server) return server
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${location.host}/`
}

export function servedFromOpenNap(): boolean {
  if (openNapHost()) return true
  if (typeof location === 'undefined') return false
  const path = location.pathname.replace(/\/+$/, '') || '/'
  return path === '/napster' || path.endsWith('/napster')
}

export function sameChannel(a: string, b: string): boolean {
  return a.replace(/^[#&]/, '').toLowerCase() === b.replace(/^[#&]/, '').toLowerCase()
}

export function displayChannel(name: string): string {
  const n = name.trim()
  if (!n) return '#'
  if (n[0] === '#' || n[0] === '&') return n
  return `#${n}`
}
