export type HubKind = 'demo' | 'wss'

export function detectHub(): HubKind {
  if (typeof location === 'undefined') return 'demo'
  const q = new URLSearchParams(location.search)
  if (q.get('hub') === 'demo') return 'demo'
  if (q.get('hub') === 'wss') return 'wss'
  const path = location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/napster' || path.endsWith('/napster')) return 'wss'
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
  if (typeof location === 'undefined') return false
  const path = location.pathname.replace(/\/+$/, '') || '/'
  return path === '/napster' || path.endsWith('/napster')
}

export function sameChannel(a: string, b: string): boolean {
  return a.replace(/^#/, '').toLowerCase() === b.replace(/^#/, '').toLowerCase()
}
