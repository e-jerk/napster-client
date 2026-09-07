import { openNapHost } from './hub'

export type MetaHub = {
  host: string
  port?: number
  wss?: string
  naps?: string
}

export function defaultMetaUrl(): string {
  if (typeof location === 'undefined') return 'http://127.0.0.1:8890/meta'
  const q = new URLSearchParams(location.search)
  const meta = q.get('meta')
  if (meta) return meta
  return `${location.origin}/meta`
}

export async function fetchMeta(url = defaultMetaUrl()): Promise<MetaHub[]> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`metaserver ${res.status}`)
  const body = (await res.json()) as { proto?: string; hubs?: MetaHub[] }
  if (!Array.isArray(body.hubs) || !body.hubs.length) throw new Error('metaserver returned no hubs')
  return body.hubs
}

export async function connectMetaWs(url: string): Promise<MetaHub[]> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, ['meta-1'])
    const timer = window.setTimeout(() => {
      ws.close()
      reject(new Error('metaserver timeout'))
    }, 8000)
    ws.onmessage = (ev) => {
      window.clearTimeout(timer)
      try {
        const body = JSON.parse(String(ev.data)) as { hubs?: MetaHub[] }
        ws.close()
        if (!body.hubs?.length) throw new Error('metaserver returned no hubs')
        resolve(body.hubs)
      } catch (err) {
        reject(err instanceof Error ? err : new Error('bad metaserver frame'))
      }
    }
    ws.onerror = () => {
      window.clearTimeout(timer)
      reject(new Error(`metaserver websocket failed: ${url}`))
    }
  })
}

export function pickHubUrl(hubs: MetaHub[]): string | null {
  const withWss = hubs.find((h) => h.wss)
  if (withWss?.wss) return withWss.wss
  if (openNapHost() && typeof location !== 'undefined') {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${proto}//${location.host}/`
  }
  return null
}
