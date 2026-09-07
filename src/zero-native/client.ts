import { renderPreviewWav } from '../lib/audio'
import { LOCAL_LIBRARY } from '../lib/catalog'
import { finiteNumber, hash32, parseQuoted, quoteFilename, transferSeconds, uid } from '../lib/format'
import { libraryFromFile, listShareFiles, readShareFile, writeDownload } from '../lib/fs'
import { sameChannel } from '../lib/hub'
import { fetchMeta, pickHubUrl } from '../lib/meta'
import { RtcMesh } from '../lib/rtc'
import { app } from '../lib/session.svelte'
import type { ChannelUser, LibraryItem, SearchHit, SharedFile, SpeedId, Transfer } from '../lib/types'
import { shareLine } from './peers'
import { MSG_NAME, Msg, PacketReader, send } from './protocol'
import { VirtualTcp, type VirtualSocket } from './tcp'
import { connectWss, type FrameSock } from './wss'

const decoder = new TextDecoder()

const HELP = [
  '/join [channel]   join a room (no name opens the dialog)',
  '/part [channel]   leave the current room',
  '/leave            same as /part',
  '/msg nick [text]  private message (no text opens a window)',
  '/query nick [text]  same as /msg',
  '/me text          action in the current channel',
  '/whois nick       user information',
  '/away [message]   set away, or clear with no message',
  '/topic [text]     show or set the channel topic',
  '/list             list channels',
  '/names [channel]  list users in a channel',
  '/history [query]  recent channel messages',
  '/browse nick      browse shared files',
  '/hotlist nick     add to the hot list',
  '/ignore [nick]    ignore a nick, or list ignores',
  '/unignore nick    stop ignoring',
  '/motd             message of the day',
  '/ping [nick]      ping the hub or a user',
  '/stats            hub user / file counts',
  '/key [nick]       fetch a public key',
  '/reply [msgid] text  reply to a message',
  '/react [msgid] emoji  react to a message',
  '/redact [msgid]   delete a message you sent',
  '/edit msgid text  edit a message you sent',
  '/search [query]   open search',
  '/clear            clear this chat log',
  '/quit             disconnect',
  '/help             this list',
  'Prefix a line with // to send it as channel text.',
]

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

function splitFields(payload: string): string[] {
  const out: string[] = []
  let i = 0
  while (i < payload.length) {
    while (payload[i] === ' ') i += 1
    if (i >= payload.length) break
    if (payload[i] === '"') {
      i += 1
      let s = ''
      while (i < payload.length && payload[i] !== '"') {
        s += payload[i]
        i += 1
      }
      if (i < payload.length) i += 1
      out.push(s.trim())
    } else {
      const start = i
      while (i < payload.length && payload[i] !== ' ') i += 1
      out.push(payload.slice(start, i))
    }
  }
  return out
}

function parseChannelEntry(payload: string): { name: string; users: number; topic: string } | null {
  const m = /^(\S+)\s+(\d+)(?:\s+(\d+))?\s+(.*)$/.exec(payload.trim())
  if (!m) return null
  let topic = (m[4] ?? '').trim()
  if (topic.startsWith('"') && topic.endsWith('"') && topic.length >= 2) topic = topic.slice(1, -1)
  return { name: m[1] ?? '', users: Number(m[2]), topic }
}

function parseHistory(payload: string): { kind: string; target: string; msgid: string; ts: number; nick: string; text: string } | null {
  const m = /^(\S+)\s+(\S+)\s+(\S+)\s+(\d+)\s+(\S+)(?:\s(.*))?$/.exec(payload)
  if (!m) return null
  return {
    kind: m[1] ?? '',
    target: m[2] ?? '',
    msgid: m[3] ?? '',
    ts: Number(m[4] ?? 0),
    nick: m[5] ?? '',
    text: m[6] ?? '',
  }
}

function formatWhois(payload: string): string {
  const f = splitFields(payload)
  if (!f[0]) return payload
  const nick = f[0]
  const level = f[1] || 'user'
  const online = f[2] ? `${f[2]}s` : '?'
  const chans = (f[3] || '').trim() || '(none)'
  const status = f[4] || 'Active'
  const files = f[5] || '0'
  const client = f[9] || ''
  const extra = client ? `, ${client}` : ''
  return `${nick} is ${level}, ${status}, on ${online}, channels: ${chans}, ${files} files${extra}`
}

function firstWord(s: string): { head: string; rest: string } {
  const sp = s.search(/\s/)
  if (sp < 0) return { head: s, rest: '' }
  return { head: s.slice(0, sp), rest: s.slice(sp + 1).trim() }
}

export class NapsterClient {
  private sock: FrameSock | null = null
  private rtc = new RtcMesh()
  private dataUnlisten: (() => void) | null = null
  private pending = new Map<string, Transfer>()

  private row(id: string): Transfer | undefined {
    return app.transfers.find((x) => x.id === id)
  }

  private patch(id: string, next: Partial<Transfer>): Transfer | undefined {
    const row = this.row(id)
    if (!row) return
    Object.assign(row, next)
    app.transfers = app.transfers.slice()
    return this.row(id)
  }

  constructor(private tcp: VirtualTcp) {}

  async connect(nick: string, speed: SpeedId): Promise<void> {
    this.disconnect()
    app.phase = 'connecting'
    const dataPort = app.hub === 'wss' ? 0 : 6699
    if (app.hub === 'wss') {
      try {
        const hubs = await fetchMeta()
        const url = pickHubUrl(hubs)
        if (url) app.wssUrl = url
        app.status = `Metaserver listed ${hubs.length} hub${hubs.length === 1 ? '' : 's'}`
      } catch (err) {
        app.status = err instanceof Error ? err.message : 'Metaserver unavailable'
      }
    }
    const remote = app.hub === 'wss' ? app.wssUrl : 'napster.local:8888'
    app.status = `Connecting to ${remote}…`
    if (app.hub === 'demo') {
      this.dataUnlisten = this.tcp.listen(app.localIp, dataPort, (sock) => this.acceptPush(sock))
    }
    try {
      this.sock =
        app.hub === 'wss'
          ? await connectWss(app.wssUrl)
          : await this.tcp.connect('napster.local', 8888, { host: app.localIp, port: 45000 })
    } catch (err) {
      app.phase = 'login'
      app.status = err instanceof Error ? err.message : 'Connection failed'
      app.error = app.status
      return
    }
    const reader = new PacketReader()
    this.bindRtc()
    this.sock.onText?.((text) => {
      void this.rtc.handle(text)
    })
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
        app.status = `Disconnected from ${remote}`
      }
    })
    const pass = app.password.trim() || (app.hub === 'wss' ? '*' : 'x')
    const payload = `${nick} ${pass} ${dataPort} "napster v2.0 BETA 10.3" ${speed}`
    log('out', Msg.LOGIN, payload)
    send(this.sock, Msg.LOGIN, payload)
    for (const file of app.library) {
      const line = shareLine(file)
      log('out', Msg.SHARE, line)
      send(this.sock, Msg.SHARE, line)
    }
  }

  private bindRtc(): void {
    this.rtc.attach((msg) => this.sock?.sendText?.(JSON.stringify(msg)))
    this.rtc.onWant = (_nick, file) => readShareFile(file)
    this.rtc.onFile = (nick, file, data) => {
      const t = this.pending.get(`${nick}|${file}`) ?? app.transfers.find((x) => x.filename === file && x.nick === nick)
      if (t) this.finishDownload(t, [data])
    }
    this.rtc.onProgress = (nick, file, got, size) => {
      const t = this.pending.get(`${nick}|${file}`) ?? app.transfers.find((x) => x.filename === file && x.direction === 'download')
      if (t && size > 0) this.patch(t.id, { status: 'Transferring', percent: Math.min(99, Math.round((got / size) * 100)), size })
      const up = app.transfers.find((x) => x.direction === 'upload' && x.filename === file && x.nick === nick)
      if (up && size > 0) this.patch(up.id, { status: 'Transferring', percent: Math.min(99, Math.round((got / size) * 100)) })
    }
    this.rtc.onError = (nick, err) => {
      app.status = err
      const t = app.transfers.find((x) => x.nick === nick && x.status === 'Connecting')
      if (t) this.patch(t.id, { status: 'File not available' })
    }
  }

  async shareFolder(): Promise<number> {
    const files = await listShareFiles()
    for (const file of files) {
      const item = libraryFromFile(file)
      app.library = [item, ...app.library.filter((x) => x.filename !== item.filename)]
      this.share(item)
    }
    app.status = files.length ? `Sharing ${files.length} files from disk` : 'Share folder is empty'
    return files.length
  }

  disconnect(): void {
    this.rtc.close()
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
    if (app.hub === 'wss') {
      const q = [artist, title].filter(Boolean).join(' ') || 'mp3'
      bits.push(`FILENAME CONTAINS "${q}"`)
    } else {
      if (artist) bits.push(`ARTIST CONTAINS "${artist}"`)
      if (title) bits.push(`TITLE CONTAINS "${title}"`)
      if (!bits.length) bits.push(`FILENAME CONTAINS "${app.search.artist || app.search.title || 'mp3'}"`)
    }
    bits.push(`MAX_RESULTS ${app.search.maxResults}`)
    if (app.search.minBitrate) bits.push(`BITRATE AT LEAST ${app.search.minBitrate}`)
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
    const live = app.transfers.find((x) => x.id === t.id) ?? t
    this.pending.set(`${hit.nick}|${hit.filename}`, live)
    const payload = `${hit.nick} ${quoteFilename(hit.filename)}`
    log('out', Msg.DOWNLOAD, payload)
    send(this.sock, Msg.DOWNLOAD, payload)
    app.view = 'transfer'
  }

  abort(id: string): void {
    const t = this.row(id)
    if (!t || t.status === 'Complete') return
    this.patch(id, { status: 'Aborted' })
  }

  clearFinished(): void {
    app.transfers = app.transfers.filter((t) => t.status === 'Transferring' || t.status === 'Connecting' || t.status === 'Getting header' || t.status === 'Queued')
  }

  join(channel: string): void {
    if (!this.sock) return
    const name = channel.replace(/^#/, '').trim()
    if (!name) {
      app.dialogs.join = true
      return
    }
    log('out', Msg.JOIN, name)
    send(this.sock, Msg.JOIN, name)
  }

  part(channel: string): void {
    if (!this.sock) return
    let name = channel.trim() || app.chat.channel
    if (app.hub === 'wss' && name && name[0] !== '#' && name[0] !== '&') name = `#${name}`
    send(this.sock, Msg.PART, name)
    log('out', Msg.PART, name)
  }

  say(text: string): void {
    if (!this.sock) return
    const raw = text.trim()
    if (!raw) return
    if (raw.startsWith('//')) {
      this.pub(raw.slice(1))
      return
    }
    if (raw.startsWith('/')) {
      this.command(raw.slice(1))
      return
    }
    this.pub(raw)
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

  private out(type: number, payload = ''): void {
    if (!this.sock) return
    log('out', type, payload)
    send(this.sock, type, payload)
  }

  private note(text: string): void {
    app.chat.messages.push({
      id: uid('sys'),
      kind: 'system',
      text,
      at: Date.now(),
    })
  }

  private pub(text: string): void {
    const payload = `${app.chat.channel} ${text}`
    this.out(Msg.SEND_PUB, payload)
  }

  private chanName(name = ''): string {
    const raw = name.trim() || app.chat.channel
    if (app.hub === 'wss' && raw && raw[0] !== '#' && raw[0] !== '&') return `#${raw}`
    return raw
  }

  private ignored(nick: string): boolean {
    const n = nick.toLowerCase()
    return app.ignore.some((x) => x.toLowerCase() === n)
  }

  private rememberMsgid(id: string | undefined): void {
    if (id) app.chat.lastMsgid = id
  }

  private demoOnly(label: string): boolean {
    if (app.hub !== 'demo') return false
    this.note(`${label} needs a live OpenNAP hub`)
    return true
  }

  private command(line: string): void {
    const { head, rest } = firstWord(line)
    const cmd = head.toLowerCase()
    switch (cmd) {
      case 'help':
      case '?':
        for (const row of HELP) this.note(row)
        return
      case 'join':
        if (!rest) {
          app.dialogs.join = true
          return
        }
        this.join(rest)
        return
      case 'part':
      case 'leave':
        this.part(rest)
        return
      case 'msg':
      case 'query': {
        const n = firstWord(rest)
        if (!n.head) {
          this.note('usage: /msg nick [text]')
          return
        }
        this.msg(n.head, n.rest)
        return
      }
      case 'me':
        if (!rest) {
          this.note('usage: /me text')
          return
        }
        this.out(Msg.EMOTE, `${this.chanName()} ${rest}`)
        return
      case 'whois':
        if (!rest) {
          this.note('usage: /whois nick')
          return
        }
        this.out(Msg.WHOIS, rest)
        return
      case 'away':
        this.out(Msg.AWAY, rest)
        return
      case 'topic':
        this.out(Msg.TOPIC, rest ? `${this.chanName()} ${rest}` : this.chanName())
        return
      case 'list':
        this.listChannels()
        app.dialogs.join = true
        return
      case 'names':
        this.out(Msg.NAMES_REQ, this.chanName(rest))
        return
      case 'history': {
        if (this.demoOnly('/history')) return
        const q = rest || `LATEST ${this.chanName()} * 50`
        this.out(Msg.HISTORY, q.includes(' ') || q.startsWith('#') || q.startsWith('&') ? q : `LATEST ${this.chanName(q)} * 50`)
        return
      }
      case 'browse':
        if (!rest) {
          this.note('usage: /browse nick')
          return
        }
        this.browse(rest)
        return
      case 'hotlist':
      case 'hot':
        if (!rest) {
          this.note('usage: /hotlist nick')
          return
        }
        this.addHot(rest)
        return
      case 'ignore':
        if (!rest) {
          if (app.hub === 'wss') this.out(Msg.IGNORE_LIST)
          if (!app.ignore.length) this.note('ignore list is empty')
          else this.note(`ignoring: ${app.ignore.join(', ')}`)
          return
        }
        if (!app.ignore.some((n) => n.toLowerCase() === rest.toLowerCase())) app.ignore = [...app.ignore, rest]
        this.out(Msg.IGNORE, rest)
        this.note(`ignoring ${rest}`)
        return
      case 'unignore':
        if (!rest) {
          this.note('usage: /unignore nick')
          return
        }
        app.ignore = app.ignore.filter((n) => n.toLowerCase() !== rest.toLowerCase())
        this.out(Msg.UNIGNORE, rest)
        this.note(`no longer ignoring ${rest}`)
        return
      case 'motd':
        this.out(Msg.MOTD)
        return
      case 'ping':
        if (!rest) this.out(Msg.PING_SERVER)
        else this.out(Msg.PING, rest)
        return
      case 'stats':
        this.out(Msg.SERVER_STATS)
        return
      case 'key':
        if (this.demoOnly('/key')) return
        this.out(Msg.KEY, rest ? `GET ${rest}` : 'GET')
        return
      case 'reply': {
        const n = firstWord(rest)
        const id = n.rest ? n.head : app.chat.lastMsgid
        const body = n.rest || n.head
        if (!id || !body) {
          this.note('usage: /reply [msgid] text')
          return
        }
        this.pub(body)
        return
      }
      case 'react': {
        if (this.demoOnly('/react')) return
        const n = firstWord(rest)
        const id = n.rest ? n.head : app.chat.lastMsgid
        const emoji = n.rest || n.head || '+1'
        if (!id) {
          this.note('usage: /react [msgid] emoji')
          return
        }
        this.out(Msg.TAGMSG, `REACT ${emoji} ${id}`)
        return
      }
      case 'redact': {
        if (this.demoOnly('/redact')) return
        const id = rest || app.chat.lastMsgid
        if (!id) {
          this.note('usage: /redact [msgid]')
          return
        }
        this.out(Msg.REDACT, id)
        return
      }
      case 'edit': {
        if (this.demoOnly('/edit')) return
        const n = firstWord(rest)
        if (!n.head || !n.rest) {
          this.note('usage: /edit msgid text')
          return
        }
        this.out(Msg.EDIT, `${n.head} ${n.rest}`)
        return
      }
      case 'search':
        app.view = 'search'
        if (rest) {
          app.search.artist = rest
          app.search.title = ''
          this.search()
        }
        return
      case 'clear':
        app.chat.messages = []
        return
      case 'quit':
      case 'disconnect':
        this.disconnect()
        this.note('disconnected')
        return
      default:
        this.note(`unknown command /${cmd} — try /help`)
    }
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
        app.status = app.hub === 'wss' ? `Connected to ${app.wssUrl}` : 'Connected to napster.local'
        this.join(app.hub === 'wss' ? 'lobby' : 'Alternative')
        this.listChannels()
        break
      case Msg.ERROR:
      case Msg.ERROR_MSG:
        app.error = payload
        app.status = payload
        if (app.phase === 'connecting') app.phase = 'login'
        else this.note(payload)
        this.failPending(payload)
        break
      case Msg.NOSUCH:
      case Msg.FAIL:
        app.status = payload
        this.note(payload)
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
        const [users, files, gigs] = payload.trim().split(/\s+/)
        app.stats.users = finiteNumber(users)
        app.stats.files = finiteNumber(files)
        app.stats.gigs = finiteNumber(gigs)
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
      case Msg.UPLOAD_REQUEST: {
        const q = parseQuoted(payload)
        const nick = payload.trim().split(/\s+/)[0] ?? ''
        const file = q?.quoted ?? ''
        if (nick && file) {
          const t: Transfer = {
            id: uid('up'),
            direction: 'upload',
            filename: file,
            artist: '',
            title: file,
            size: 0,
            nick,
            speed: 7,
            status: 'Connecting',
            percent: 0,
            bps: 0,
            startedAt: Date.now(),
          }
          app.transfers = [t, ...app.transfers]
          app.status = `WebRTC upload ${file} → ${nick}`
        }
        break
      }
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
        if (!ch || sameChannel(ch, app.chat.channel) || !app.chat.channel) app.chat.topic = topic
        app.chat.messages.push({
          id: uid('topic'),
          kind: 'system',
          channel: ch,
          text: `Topic for ${ch}: ${topic}`,
          at: Date.now(),
        })
        break
      }
      case Msg.USER_JOIN:
      case Msg.CHANNEL_USER: {
        const [ch, nick, files, speed] = payload.split(/\s+/)
        if (!sameChannel(ch ?? '', app.chat.channel)) break
        const entry: ChannelUser = {
          nick: nick ?? '',
          files: Number(files ?? 0),
          speed: Number(speed ?? 0) as SpeedId,
          op: (nick ?? '') === 'op_mike',
        }
        if (entry.nick && !app.chat.users.some((u) => u.nick === entry.nick)) {
          app.chat.users = [...app.chat.users, entry].sort((a, b) => a.nick.localeCompare(b.nick))
        }
        if (type === Msg.USER_JOIN && entry.nick && entry.nick !== app.nick) {
          app.chat.messages.push({
            id: uid('joinuser'),
            kind: 'system',
            channel: ch,
            nick: entry.nick,
            text: `${entry.nick} has joined the channel`,
            at: Date.now(),
          })
        }
        break
      }
      case Msg.CHANNEL_USER_END:
        break
      case Msg.PART: {
        const name = payload.trim()
        if (name && !name.includes(' ') && sameChannel(name, app.chat.channel)) {
          app.chat.users = []
          this.note(`You have left channel ${name}`)
        }
        break
      }
      case Msg.CHANNEL_PART: {
        const [ch, nick] = payload.split(/\s+/)
        if (sameChannel(ch ?? '', app.chat.channel)) {
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
      case Msg.PUBLIC:
      case Msg.EMOTE: {
        const parts = payload.split(' ')
        const channel = parts.shift() ?? ''
        const nick = parts.shift() ?? ''
        const text = parts.join(' ')
        if (this.ignored(nick)) break
        app.chat.messages.push({
          id: uid(type === Msg.EMOTE ? 'me' : 'pub'),
          kind: type === Msg.EMOTE ? 'action' : 'public',
          channel,
          nick,
          text,
          at: Date.now(),
        })
        break
      }
      case Msg.CHANNEL_ENTRY: {
        const row = parseChannelEntry(payload)
        if (!row) break
        const existing = app.channels.find((c) => sameChannel(c.name, row.name))
        if (existing) {
          existing.users = row.users
          existing.topic = row.topic
          existing.name = row.name
        } else app.channels.push({ name: row.name, users: row.users, topic: row.topic })
        break
      }
      case Msg.WHOIS_ACK:
        this.note(formatWhois(payload))
        break
      case Msg.WHOWAS: {
        const f = splitFields(payload)
        this.note(`${f[0] ?? payload} was ${f[1] || 'user'} (last seen ${f[2] || '?'})`)
        break
      }
      case Msg.AWAY_OUT: {
        const { head, rest } = firstWord(payload.trim())
        this.note(rest ? `${head} is away: ${rest}` : `${head} is back`)
        break
      }
      case Msg.PING:
        this.out(Msg.PONG, payload.trim())
        break
      case Msg.PONG:
        this.note(payload.trim() ? `pong from ${payload.trim()}` : 'pong')
        app.status = payload.trim() ? `pong from ${payload.trim()}` : 'pong'
        break
      case Msg.HISTORY_LINE: {
        const row = parseHistory(payload)
        if (!row || this.ignored(row.nick)) break
        this.rememberMsgid(row.msgid)
        const kind = row.kind === 'emote' ? 'action' : row.kind === 'priv' ? 'private' : 'public'
        app.chat.messages.push({
          id: uid('hist'),
          kind,
          channel: row.target,
          nick: row.nick,
          text: row.kind === 'priv' ? `(private) ${row.text}` : row.text,
          at: row.ts ? row.ts * 1000 : Date.now(),
          msgid: row.msgid,
        })
        break
      }
      case Msg.HISTORY_END:
        this.note(payload.trim() ? `end of history ${payload}` : 'end of history')
        break
      case Msg.KEY_OUT:
        this.note(`key ${payload}`)
        break
      case Msg.IGNORE_ENTRY:
        if (payload && !app.ignore.some((n) => n.toLowerCase() === payload.toLowerCase())) {
          app.ignore = [...app.ignore, payload]
        }
        this.note(`ignoring ${payload}`)
        break
      case Msg.ALREADY_IGNORED:
        this.note(`already ignoring ${payload}`)
        break
      case Msg.NOT_IGNORED:
        this.note(`not ignoring ${payload}`)
        break
      case Msg.NAMES: {
        const [ch, nick] = payload.split(/\s+/)
        if (!nick || !sameChannel(ch ?? '', app.chat.channel)) break
        if (!app.chat.users.some((u) => u.nick === nick)) {
          app.chat.users = [...app.chat.users, { nick, files: 0, speed: 0 as SpeedId, op: false }].sort((a, b) =>
            a.nick.localeCompare(b.nick),
          )
        }
        break
      }
      case Msg.NAMES_END:
        break
      case Msg.REDACT_OUT: {
        const id = firstWord(payload)
        const from = firstWord(id.rest)
        const line = app.chat.messages.find((m) => m.msgid === id.head)
        if (line) line.text = ''
        this.note(`${from.head || 'someone'} redacted a message`)
        break
      }
      case Msg.EDIT_OUT: {
        const id = firstWord(payload)
        const from = firstWord(id.rest)
        const line = app.chat.messages.find((m) => m.msgid === id.head)
        if (line) line.text = from.rest
        break
      }
      case Msg.TAGMSG_OUT:
        this.note(payload)
        break
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
      if (this.row(t.id)?.status === 'Connecting') {
        this.patch(t.id, {
          status: reason.toLowerCase().includes('not available') ? 'File not available' : 'User offline',
        })
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
    if (app.hub === 'wss') {
      this.patch(t.id, { status: 'Connecting' })
      app.status = `WebRTC from ${nick}…`
      void this.rtc.request(nick, q.quoted).catch((err: unknown) => {
        this.patch(t.id, { status: 'Timed out' })
        app.status = err instanceof Error ? err.message : 'WebRTC failed'
      })
      return
    }
    if (port === 0) {
      this.patch(t.id, { status: 'Queued' })
      app.status = `${nick} is firewalled — waiting for push`
      return
    }
    void this.pullFile(t, ip, port, q.quoted)
  }

  private async pullFile(t: Transfer, host: string, port: number, filename: string): Promise<void> {
    this.patch(t.id, { status: 'Connecting' })
    try {
      const sock = await this.tcp.connect(host, port, { host: app.localIp })
      this.patch(t.id, { status: 'Getting header' })
      sock.write(`GET ${app.nick} ${quoteFilename(filename)} 0\n`)
      await this.readTransfer(sock, t)
    } catch {
      this.patch(t.id, { status: 'Timed out' })
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
          transfer = app.transfers.find((x) => x.id === transfer!.id) ?? transfer
        }
        this.patch(transfer.id, { status: 'Transferring' })
        if (rest) chunks.push(new TextEncoder().encode(rest))
        return
      }
      chunks.push(chunk)
      const got = chunks.reduce((n, c) => n + c.length, 0)
      if (transfer) {
        this.patch(transfer.id, { percent: Math.min(99, Math.round((got / Math.max(expect, 1)) * 100)) })
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
        if (this.row(t.id)?.status === 'Aborted') {
          window.clearInterval(tick)
          sock.close()
          resolve()
          return
        }
        const p = Math.min(99, ((Date.now() - started) / (seconds * 1000)) * 100)
        this.patch(t.id, { percent: p, bps: t.size / seconds, status: 'Transferring' })
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
            this.patch(t.id, { status: 'File not available' })
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
        const status = this.row(t.id)?.status ?? t.status
        if (status === 'Complete' || status === 'Aborted') {
          resolve()
          return
        }
        if (chunks.length) this.finishDownload(t, chunks)
        else if (status === 'Transferring' || status === 'Getting header') this.patch(t.id, { status: 'Timed out' })
        resolve()
      })
    })
  }

  private finishDownload(t: Transfer, chunks: Uint8Array[]): void {
    const row = this.row(t.id) ?? t
    if (row.status === 'Complete') return
    const total = chunks.reduce((n, c) => n + c.length, 0)
    const bytes = new Uint8Array(total)
    let o = 0
    for (const c of chunks) {
      bytes.set(c, o)
      o += c.length
    }
    const blob = bytes.length > 44 ? new Blob([bytes]) : renderPreviewWav(row.filename)
    void writeDownload(row.filename, blob)
    this.patch(row.id, {
      blob,
      percent: 100,
      status: 'Complete',
      bps: row.size / Math.max(0.5, (Date.now() - row.startedAt) / 1000),
    })
    const item: LibraryItem = {
      id: uid('lib'),
      filename: row.filename,
      artist: row.artist,
      title: row.title,
      size: row.size,
      bitrate: 128,
      freq: 44100,
      duration: 200,
      md5: hash32(`${row.filename}|${row.size}`),
      origin: 'download',
      blob,
    }
    app.library = [item, ...app.library]
    this.share(item)
    app.status = `Download complete: ${row.title || row.filename}`
  }

  private onPrivate(payload: string): void {
    const sp = payload.indexOf(' ')
    const nick = payload.slice(0, sp)
    const text = payload.slice(sp + 1)
    if (this.ignored(nick)) return
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
