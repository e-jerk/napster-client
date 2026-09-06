import { renderPreviewWav } from '../lib/audio'
import { LOCAL_LIBRARY } from '../lib/catalog'
import { parseQuoted, quoteFilename, transferSeconds, uid } from '../lib/format'
import { app } from '../lib/session.svelte'
import type { ChannelUser, LibraryItem, SearchHit, SharedFile, SpeedId, Transfer } from '../lib/types'
import { shareLine } from './peers'
import { MSG_NAME, Msg, PacketReader, send } from './protocol'
import { VirtualTcp, type VirtualSocket } from './tcp'

const decoder = new TextDecoder()

function log(dir: 'in' | 'out' | 'peer', type: number, payload: string): void {
  app.packets.unshift({
    id: uid('pkt'),
    at: Date.now(),
    dir,
    type,
    name: MSG_NAME[type] ?? String(type),
    payload: payload.slice(0, 240),
  })
  if (app.packets.length > 80) app.packets.length = 80
}

function parseSearchHit(payload: string): SearchHit | null {
  const q = parseQuoted(payload)
  if (!q) return null
  const p = q.rest.split(/\s+/)
  const filename = q.quoted
  const base = filename.split('\\').pop() ?? filename
  const dash = base.replace(/\.mp3$/i, '').split(' - ')
  return {
    id: uid('hit'),
    filename,
    md5: p[0] ?? '',
    size: Number(p[1] ?? 0),
    bitrate: Number(p[2] ?? 128),
    freq: Number(p[3] ?? 44100),
    duration: Number(p[4] ?? 0),
    nick: p[5] ?? 'unknown',
    ip: p[6] ?? '',
    port: 6699,
    speed: Number(p[7] ?? 4) as SpeedId,
    ping: 40 + Math.floor(Math.random() * 420),
    firewalled: false,
    artist: dash.length > 1 ? (dash[0] ?? '') : '',
    title: dash.length > 1 ? dash.slice(1).join(' - ') : base.replace(/\.mp3$/i, ''),
  }
}

export class NapsterClient {
  private sock: VirtualSocket | null = null
  private dataUnlisten: (() => void) | null = null
  private pending = new Map<string, Transfer>()

  constructor(private tcp: VirtualTcp) {}

  async connect(nick: string, speed: SpeedId): Promise<void> {
    this.disconnect()
    app.phase = 'connecting'
    app.status = 'Connecting to napster.local:8888…'
    const dataPort = 6699
    this.dataUnlisten = this.tcp.listen(app.localIp, dataPort, (sock) => this.acceptPush(sock))
    try {
      this.sock = await this.tcp.connect('napster.local', 8888, { host: app.localIp, port: 45000 })
    } catch (err) {
      app.phase = 'login'
      app.status = err instanceof Error ? err.message : 'Connection failed'
      app.error = app.status
      return
    }
    const reader = new PacketReader()
    this.sock.onData((chunk) => {
      for (const pkt of reader.push(chunk)) {
        log('in', pkt.type, pkt.payload)
        this.onPacket(pkt.type, pkt.payload)
      }
    })
    this.sock.onClose(() => {
      if (app.phase === 'online') {
        app.phase = 'login'
        app.connected = false
        app.status = 'Disconnected from napster.local'
      }
    })
    const payload = `${nick} x ${dataPort} "napster v2.0 BETA 10.3" ${speed}`
    log('out', Msg.LOGIN, payload)
    send(this.sock, Msg.LOGIN, payload)
    for (const file of app.library) {
      const line = shareLine(file)
      log('out', Msg.SHARE, line)
      send(this.sock, Msg.SHARE, line)
    }
  }

  disconnect(): void {
    this.dataUnlisten?.()
    this.dataUnlisten = null
    this.sock?.close()
    this.sock = null
    app.connected = false
    if (app.phase === 'online' || app.phase === 'connecting') app.phase = 'login'
    app.chat.users = []
    app.channels = []
  }

  search(): void {
    if (!this.sock) return
    const artist = app.search.artist.trim()
    const title = app.search.title.trim()
    const bits: string[] = []
    if (artist) bits.push(`ARTIST CONTAINS "${artist}"`)
    if (title) bits.push(`TITLE CONTAINS "${title}"`)
    if (!bits.length) bits.push(`FILENAME CONTAINS "${app.search.artist || app.search.title || 'mp3'}"`)
    bits.push(`MAX_RESULTS ${app.search.maxResults}`)
    if (app.search.minBitrate) bits.push(`BITRATE "AT LEAST" ${app.search.minBitrate}`)
    app.search.results = []
    app.search.searching = true
    app.search.selected = null
    app.status = 'Searching the network…'
    const payload = bits.join(' ')
    log('out', Msg.SEARCH, payload)
    send(this.sock, Msg.SEARCH, payload)
  }

  download(hit: SearchHit): void {
    if (!this.sock) return
    if (app.transfers.some((t) => t.filename === hit.filename && t.nick === hit.nick && t.status === 'Transferring')) {
      return
    }
    const t: Transfer = {
      id: uid('xfer'),
      direction: 'download',
      filename: hit.filename,
      artist: hit.artist,
      title: hit.title,
      size: hit.size,
      nick: hit.nick,
      speed: hit.speed,
      status: 'Connecting',
      percent: 0,
      bps: 0,
      startedAt: Date.now(),
    }
    app.transfers = [t, ...app.transfers]
    this.pending.set(`${hit.nick}|${hit.filename}`, t)
    const payload = `${hit.nick} ${quoteFilename(hit.filename)}`
    log('out', Msg.DOWNLOAD, payload)
    send(this.sock, Msg.DOWNLOAD, payload)
    app.view = 'transfer'
  }

  abort(id: string): void {
    const t = app.transfers.find((x) => x.id === id)
    if (!t || t.status === 'Complete') return
    t.status = 'Aborted'
  }

  clearFinished(): void {
    app.transfers = app.transfers.filter((t) => t.status === 'Transferring' || t.status === 'Connecting' || t.status === 'Getting header' || t.status === 'Queued')
  }

  join(channel: string): void {
    if (!this.sock) return
    const name = channel.replace(/^#/, '')
    log('out', Msg.JOIN, name)
    send(this.sock, Msg.JOIN, name)
  }

  part(channel: string): void {
    if (!this.sock) return
    send(this.sock, Msg.PART, channel)
    log('out', Msg.PART, channel)
  }

  say(text: string): void {
    if (!this.sock) return
    const raw = text.trim()
    if (!raw) return
    if (raw.startsWith('/join ')) {
      this.join(raw.slice(6))
      return
    }
    if (raw.startsWith('/part')) {
      this.part(app.chat.channel)
      return
    }
    if (raw.startsWith('/msg ')) {
      const rest = raw.slice(5)
      const sp = rest.indexOf(' ')
      if (sp > 0) this.msg(rest.slice(0, sp), rest.slice(sp + 1))
      return
    }
    if (raw.startsWith('/browse ')) {
      this.browse(raw.slice(8).trim())
      return
    }
    if (raw.startsWith('/hotlist ')) {
      this.addHot(raw.slice(9).trim())
      return
    }
    if (raw === '/clear') {
      app.chat.messages = []
      return
    }
    const payload = `${app.chat.channel} ${raw}`
    log('out', Msg.SEND_PUB, payload)
    send(this.sock, Msg.SEND_PUB, payload)
  }

  msg(nick: string, text: string): void {
    if (!this.sock) return
    if (!text.trim()) {
      this.ensurePm(nick)
      return
    }
    const payload = `${nick} ${text}`
    log('out', Msg.PRIVATE, payload)
    send(this.sock, Msg.PRIVATE, payload)
    this.ensurePm(nick)
    const thread = app.pms.find((p) => p.nick.toLowerCase() === nick.toLowerCase())
    thread?.messages.push({
      id: uid('pm'),
      kind: 'private',
      nick: app.nick,
      text,
      at: Date.now(),
    })
  }

  addHot(nick: string): void {
    if (!this.sock || !nick) return
    if (!app.hotlist.some((h) => h.nick.toLowerCase() === nick.toLowerCase())) {
      app.hotlist = [...app.hotlist, { nick, online: false, files: 0, speed: 0 }]
    }
    log('out', Msg.ADD_HOTLIST, nick)
    send(this.sock, Msg.ADD_HOTLIST, nick)
  }

  removeHot(nick: string): void {
    if (!this.sock) return
    app.hotlist = app.hotlist.filter((h) => h.nick.toLowerCase() !== nick.toLowerCase())
    send(this.sock, Msg.REMOVE_HOTLIST, nick)
  }

  browse(nick: string): void {
    if (!this.sock) return
    app.browse = { nick, files: [], open: true }
    log('out', Msg.BROWSE, nick)
    send(this.sock, Msg.BROWSE, nick)
  }

  listChannels(): void {
    if (!this.sock) return
    send(this.sock, Msg.LIST_CHANNELS)
    log('out', Msg.LIST_CHANNELS, '')
  }

  share(file: SharedFile): void {
    if (!this.sock) return
    const line = shareLine(file)
    log('out', Msg.SHARE, line)
    send(this.sock, Msg.SHARE, line)
  }

  private onPacket(type: number, payload: string): void {
    switch (type) {
      case Msg.LOGIN_ACK:
        app.connected = true
        app.phase = 'online'
        app.error = ''
        app.status = 'Connected to napster.local'
        this.join('Alternative')
        this.listChannels()
        break
      case Msg.ERROR:
      case Msg.ERROR_MSG:
        app.error = payload
        app.status = payload
        if (app.phase === 'connecting') app.phase = 'login'
        this.failPending(payload)
        break
      case Msg.MOTD:
        app.chat.messages.push({
          id: uid('motd'),
          kind: 'system',
          text: payload,
          at: Date.now(),
        })
        break
      case Msg.SERVER_STATS: {
        const [users, files, gigs] = payload.split(/\s+/)
        app.stats.users = Number(users ?? 0)
        app.stats.files = Number(files ?? 0)
        app.stats.gigs = Number(gigs ?? 0)
        break
      }
      case Msg.SEARCH_RESULT: {
        const hit = parseSearchHit(payload)
        if (hit) app.search.results.push(hit)
        break
      }
      case Msg.SEARCH_END:
        app.search.searching = false
        app.status = app.search.results.length
          ? `${app.search.results.length} files found`
          : 'No files matching your query were found on the network.'
        break
      case Msg.DOWNLOAD_ACK:
        this.beginDownload(payload)
        break
      case Msg.PRIVATE:
        this.onPrivate(payload)
        break
      case Msg.JOIN_ACK:
        app.chat.channel = payload
        app.chat.users = []
        app.chat.messages.push({
          id: uid('join'),
          kind: 'system',
          channel: payload,
          text: `You have joined channel ${payload}`,
          at: Date.now(),
        })
        break
      case Msg.TOPIC: {
        const sp = payload.indexOf(' ')
        const ch = sp < 0 ? payload : payload.slice(0, sp)
        const topic = sp < 0 ? '' : payload.slice(sp + 1)
        app.chat.topic = topic
        app.chat.messages.push({
          id: uid('topic'),
          kind: 'system',
          channel: ch,
          text: `Topic: ${topic}`,
          at: Date.now(),
        })
        break
      }
      case Msg.CHANNEL_USER: {
        const [ch, nick, files, speed] = payload.split(/\s+/)
        if ((ch ?? '') !== app.chat.channel) break
        const entry: ChannelUser = {
          nick: nick ?? '',
          files: Number(files ?? 0),
          speed: Number(speed ?? 0) as SpeedId,
          op: (nick ?? '') === 'op_mike',
        }
        if (entry.nick && !app.chat.users.some((u) => u.nick === entry.nick)) {
          app.chat.users = [...app.chat.users, entry].sort((a, b) => a.nick.localeCompare(b.nick))
        }
        break
      }
      case Msg.CHANNEL_PART: {
        const [ch, nick] = payload.split(/\s+/)
        if (ch === app.chat.channel) {
          app.chat.users = app.chat.users.filter((u) => u.nick !== nick)
          app.chat.messages.push({
            id: uid('part'),
            kind: 'system',
            channel: ch,
            nick,
            text: `${nick} has left the channel`,
            at: Date.now(),
          })
        }
        break
      }
      case Msg.PUBLIC: {
        const parts = payload.split(' ')
        const channel = parts.shift() ?? ''
        const nick = parts.shift() ?? ''
        const text = parts.join(' ')
        app.chat.messages.push({
          id: uid('pub'),
          kind: 'public',
          channel,
          nick,
          text,
          at: Date.now(),
        })
        break
      }
      case Msg.CHANNEL_ENTRY: {
        const sp1 = payload.indexOf(' ')
        const name = payload.slice(0, sp1)
        const rest = payload.slice(sp1 + 1)
        const sp2 = rest.indexOf(' ')
        const users = Number(rest.slice(0, sp2))
        const topic = rest.slice(sp2 + 1)
        const existing = app.channels.find((c) => c.name === name)
        if (existing) {
          existing.users = users
          existing.topic = topic
        } else app.channels.push({ name, users, topic })
        break
      }
      case Msg.USER_ONLINE: {
        const [nick, speed, files] = payload.split(/\s+/)
        const row = app.hotlist.find((h) => h.nick.toLowerCase() === (nick ?? '').toLowerCase())
        if (row) {
          row.online = true
          row.speed = Number(speed ?? 0) as SpeedId
          row.files = Number(files ?? 0)
        }
        app.status = `${nick} is online`
        break
      }
      case Msg.USER_OFFLINE: {
        const row = app.hotlist.find((h) => h.nick.toLowerCase() === payload.trim().toLowerCase())
        if (row) row.online = false
        break
      }
      case Msg.BROWSE_ENTRY: {
        const nick = payload.split(/\s+/)[0] ?? ''
        const q = parseQuoted(payload)
        if (!q) break
        const p = q.rest.split(/\s+/)
        const filename = q.quoted
        const base = filename.split('\\').pop() ?? filename
        const dash = base.replace(/\.mp3$/i, '').split(' - ')
        app.browse.files.push({
          filename,
          md5: p[0] ?? '',
          size: Number(p[1] ?? 0),
          bitrate: Number(p[2] ?? 128),
          freq: Number(p[3] ?? 44100),
          duration: Number(p[4] ?? 0),
          nick,
          artist: dash.length > 1 ? (dash[0] ?? '') : '',
          title: dash.length > 1 ? dash.slice(1).join(' - ') : base.replace(/\.mp3$/i, ''),
        })
        break
      }
      case Msg.BROWSE_END:
        app.status = `Browse of ${payload} complete (${app.browse.files.length} files)`
        break
      default:
        break
    }
  }

  private failPending(reason: string): void {
    for (const t of this.pending.values()) {
      if (t.status === 'Connecting') {
        t.status = reason.toLowerCase().includes('not available') ? 'File not available' : 'User offline'
      }
    }
  }

  private beginDownload(payload: string): void {
    const m = /^(\S+)\s+(\S+)\s+(\d+)\s+/.exec(payload)
    const q = parseQuoted(payload)
    if (!m || !q) return
    const nick = m[1] ?? ''
    const ip = m[2] ?? ''
    const port = Number(m[3])
    const t = this.pending.get(`${nick}|${q.quoted}`)
    if (!t) return
    if (port === 0) {
      t.status = 'Queued'
      app.status = `${nick} is firewalled — waiting for push`
      return
    }
    void this.pullFile(t, ip, port, q.quoted)
  }

  private async pullFile(t: Transfer, host: string, port: number, filename: string): Promise<void> {
    t.status = 'Connecting'
    try {
      const sock = await this.tcp.connect(host, port, { host: app.localIp })
      t.status = 'Getting header'
      sock.write(`GET ${app.nick} ${quoteFilename(filename)} 0\n`)
      await this.readTransfer(sock, t)
    } catch {
      t.status = 'Timed out'
    }
  }

  private acceptPush(sock: VirtualSocket): void {
    let buf = ''
    const chunks: Uint8Array[] = []
    let expect = -1
    let transfer: Transfer | null = null
    sock.onData((chunk) => {
      if (expect < 0) {
        buf += decoder.decode(chunk)
        const nl = buf.indexOf('\n')
        if (nl < 0) return
        const header = buf.slice(0, nl)
        const rest = buf.slice(nl + 1)
        const m = /^SEND\s+(\S+)\s+"([^"]+)"\s+(\d+)/i.exec(header)
        if (!m) {
          sock.close()
          return
        }
        expect = Number(m[3])
        const nick = m[1] ?? ''
        const filename = m[2] ?? ''
        transfer = this.pending.get(`${nick}|${filename}`) ?? null
        if (!transfer) {
          transfer = {
            id: uid('xfer'),
            direction: 'download',
            filename,
            artist: '',
            title: filename,
            size: expect,
            nick,
            speed: 7,
            status: 'Transferring',
            percent: 0,
            bps: 0,
            startedAt: Date.now(),
          }
          app.transfers = [transfer, ...app.transfers]
        }
        transfer.status = 'Transferring'
        if (rest) chunks.push(new TextEncoder().encode(rest))
        return
      }
      chunks.push(chunk)
      const got = chunks.reduce((n, c) => n + c.length, 0)
      if (transfer) {
        transfer.percent = Math.min(99, Math.round((got / Math.max(expect, 1)) * 100))
      }
      if (got >= expect && transfer) this.finishDownload(transfer, chunks)
    })
  }

  private async readTransfer(sock: VirtualSocket, t: Transfer): Promise<void> {
    await new Promise<void>((resolve) => {
      let buf = ''
      const chunks: Uint8Array[] = []
      let expect = -1
      const seconds = transferSeconds(t.size, Math.min(app.speed, t.speed))
      const started = Date.now()
      const tick = window.setInterval(() => {
        if (t.status === 'Aborted') {
          window.clearInterval(tick)
          sock.close()
          resolve()
          return
        }
        const p = Math.min(99, ((Date.now() - started) / (seconds * 1000)) * 100)
        t.percent = p
        t.bps = t.size / seconds
        t.status = 'Transferring'
        finishWhenReady()
      }, 80)
      const finishWhenReady = () => {
        const elapsed = (Date.now() - started) / 1000
        const got = chunks.reduce((n, c) => n + c.length, 0)
        if (expect >= 0 && got >= expect && elapsed >= Math.min(seconds, 2.2)) {
          window.clearInterval(tick)
          this.finishDownload(t, chunks)
          sock.close()
          resolve()
        }
      }
      sock.onData((chunk) => {
        if (expect < 0) {
          buf += decoder.decode(chunk)
          const nl = buf.indexOf('\n')
          if (nl < 0) return
          const header = buf.slice(0, nl).trim()
          if (/NOT AVAILABLE/i.test(header)) {
            t.status = 'File not available'
            window.clearInterval(tick)
            sock.close()
            resolve()
            return
          }
          expect = Number(header) || 0
          const leftover = buf.slice(nl + 1)
          if (leftover) chunks.push(new TextEncoder().encode(leftover))
          return
        }
        chunks.push(chunk)
        finishWhenReady()
      })
      sock.onClose(() => {
        window.clearInterval(tick)
        if (t.status === 'Complete' || t.status === 'Aborted') {
          resolve()
          return
        }
        if (chunks.length) this.finishDownload(t, chunks)
        else if (t.status === 'Transferring' || t.status === 'Getting header') t.status = 'Timed out'
        resolve()
      })
    })
  }

  private finishDownload(t: Transfer, chunks: Uint8Array[]): void {
    if (t.status === 'Complete') return
    const total = chunks.reduce((n, c) => n + c.length, 0)
    const bytes = new Uint8Array(total)
    let o = 0
    for (const c of chunks) {
      bytes.set(c, o)
      o += c.length
    }
    const blob = bytes.length > 44 ? new Blob([bytes], { type: 'audio/wav' }) : renderPreviewWav(t.filename)
    t.blob = blob
    t.percent = 100
    t.status = 'Complete'
    t.bps = t.size / Math.max(0.5, (Date.now() - t.startedAt) / 1000)
    const item: LibraryItem = {
      id: uid('lib'),
      filename: t.filename,
      artist: t.artist,
      title: t.title,
      size: t.size,
      bitrate: 128,
      freq: 44100,
      duration: 200,
      md5: t.filename,
      origin: 'download',
      blob,
    }
    app.library = [item, ...app.library]
    this.share(item)
    app.status = `Download complete: ${t.title || t.filename}`
  }

  private onPrivate(payload: string): void {
    const sp = payload.indexOf(' ')
    const nick = payload.slice(0, sp)
    const text = payload.slice(sp + 1)
    this.ensurePm(nick)
    const thread = app.pms.find((p) => p.nick.toLowerCase() === nick.toLowerCase())
    thread?.messages.push({
      id: uid('pm'),
      kind: 'private',
      nick,
      text,
      at: Date.now(),
    })
    app.chat.messages.push({
      id: uid('pmin'),
      kind: 'private',
      nick,
      text: `(private) ${text}`,
      at: Date.now(),
    })
  }

  private ensurePm(nick: string): void {
    const existing = app.pms.find((p) => p.nick.toLowerCase() === nick.toLowerCase())
    if (existing) {
      existing.open = true
      return
    }
    app.pms = [
      ...app.pms,
      {
        nick,
        messages: [],
        input: '',
        open: true,
        x: 80 + app.pms.length * 24,
        y: 80 + app.pms.length * 24,
      },
    ]
  }
}

export function seedLibrary(): void {
  if (app.library.length) return
  app.library = LOCAL_LIBRARY.map((f) => ({
    ...f,
    id: uid('lib'),
    origin: 'shared' as const,
    blob: renderPreviewWav(f.md5),
  }))
}
