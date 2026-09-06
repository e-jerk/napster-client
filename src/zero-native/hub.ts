import { CHANNELS, MOTD, type PeerDef } from '../lib/catalog'
import { finiteNumber, parseQuoted, quoteFilename } from '../lib/format'
import type { SharedFile, SpeedId } from '../lib/types'
import { Msg, PacketReader, send } from './protocol'
import type { VirtualSocket, VirtualTcp } from './tcp'

export type HubFile = SharedFile & {
  nick: string
  ip: string
  port: number
  speed: SpeedId
  firewalled: boolean
}

type HubUser = {
  nick: string
  socket: VirtualSocket
  speed: SpeedId
  port: number
  ip: string
  firewalled: boolean
  files: Map<string, SharedFile>
  channels: Set<string>
  hotlist: Set<string>
  ignore: Set<string>
  away: string
}

function ipToInt(ip: string): number {
  const p = ip.split('.').map((n) => Number(n))
  return ((((p[0] ?? 0) << 24) | ((p[1] ?? 0) << 16) | ((p[2] ?? 0) << 8) | (p[3] ?? 0)) >>> 0)
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1)
}

function matches(file: SharedFile, artist: string, title: string, filename: string, minBitrate: number): boolean {
  if (minBitrate && file.bitrate < minBitrate) return false
  const blob = `${file.artist} ${file.title} ${file.filename}`.toLowerCase()
  const need = [...tokenize(artist), ...tokenize(title), ...tokenize(filename)]
  if (need.length === 0) return true
  return need.every((t) => blob.includes(t))
}

function parseSearch(payload: string): { artist: string; title: string; filename: string; max: number; minBitrate: number } {
  const max = Number(/MAX_RESULTS\s+(\d+)/i.exec(payload)?.[1] ?? 100)
  const minBitrate = Number(/BITRATE\s+"?(?:AT LEAST|EQUAL TO)"?\s+(\d+)/i.exec(payload)?.[1] ?? 0)
  const grab = (key: string) => {
    const re = new RegExp(`${key}\\s+CONTAINS\\s+"([^"]*)"`, 'i')
    return re.exec(payload)?.[1] ?? ''
  }
  return {
    artist: grab('ARTIST'),
    title: grab('TITLE'),
    filename: grab('FILENAME'),
    max: Number.isFinite(max) ? max : 100,
    minBitrate: Number.isFinite(minBitrate) ? minBitrate : 0,
  }
}

export class NapsterHub {
  readonly host = 'napster.local'
  readonly port = 8888
  private users = new Map<string, HubUser>()
  private bySocket = new Map<VirtualSocket, HubUser>()
  private topics = new Map<string, string>(CHANNELS.map((c) => [c.name.toLowerCase(), c.topic]))
  private statsTimer: ReturnType<typeof setInterval> | null = null

  constructor(private tcp: VirtualTcp) {}

  listen(): void {
    this.tcp.listen(this.host, this.port, (sock) => this.accept(sock))
    this.tcp.listen('0.0.0.0', this.port, (sock) => this.accept(sock))
    this.statsTimer = setInterval(() => this.broadcastStats(), 4000)
  }

  stop(): void {
    if (this.statsTimer) clearInterval(this.statsTimer)
  }

  stats(): { users: number; files: number; bytes: number } {
    let files = 0
    let bytes = 0
    for (const u of this.users.values()) {
      files += u.files.size
      for (const f of u.files.values()) bytes += finiteNumber(f.size)
    }
    return { users: this.users.size, files, bytes }
  }

  private accept(sock: VirtualSocket): void {
    const reader = new PacketReader()
    sock.onData((chunk) => {
      for (const pkt of reader.push(chunk)) this.handle(sock, pkt.type, pkt.payload)
    })
    sock.onClose(() => this.drop(sock))
  }

  private handle(sock: VirtualSocket, type: number, payload: string): void {
    const user = this.bySocket.get(sock)
    if (!user && type !== Msg.LOGIN && type !== Msg.NEW_USER) {
      send(sock, Msg.ERROR, 'not logged in')
      return
    }
    switch (type) {
      case Msg.LOGIN:
      case Msg.NEW_USER:
        this.login(sock, payload)
        break
      case Msg.SHARE:
        if (user) this.share(user, payload)
        break
      case Msg.UNSHARE:
        if (user) {
          const q = parseQuoted(payload)
          if (q) user.files.delete(q.quoted)
        }
        break
      case Msg.SEARCH:
        if (user) this.search(user, payload)
        break
      case Msg.DOWNLOAD:
        if (user) this.download(user, payload)
        break
      case Msg.PRIVATE:
        if (user) this.privateMsg(user, payload)
        break
      case Msg.ADD_HOTLIST:
        if (user) this.addHot(user, payload.trim())
        break
      case Msg.REMOVE_HOTLIST:
        if (user) user.hotlist.delete(payload.trim())
        break
      case Msg.BROWSE:
        if (user) this.browse(user, payload.trim())
        break
      case Msg.JOIN:
        if (user) this.join(user, payload.trim())
        break
      case Msg.PART:
        if (user) this.part(user, payload.trim())
        break
      case Msg.SEND_PUB:
        if (user) this.pub(user, payload)
        break
      case Msg.LIST_CHANNELS:
        if (user) this.listChannels(user)
        break
      case Msg.EMOTE:
        if (user) this.pub(user, payload, true)
        break
      case Msg.WHOIS:
        if (user) this.whois(user, payload.trim())
        break
      case Msg.TOPIC:
        if (user) this.topic(user, payload)
        break
      case Msg.MOTD:
        if (user) this.motd(user)
        break
      case Msg.PING_SERVER:
        send(sock, Msg.PONG, this.host)
        break
      case Msg.PING:
        if (user) this.ping(user, payload.trim())
        break
      case Msg.PONG: {
        const dest = this.users.get(payload.trim().toLowerCase())
        if (user && dest) send(dest.socket, Msg.PONG, user.nick)
        break
      }
      case Msg.SERVER_STATS:
        if (user) {
          const s = this.stats()
          send(user.socket, Msg.SERVER_STATS, `${s.users} ${s.files} ${(s.bytes / (1024 * 1024 * 1024)).toFixed(1)}`)
        }
        break
      case Msg.AWAY:
        if (user) {
          user.away = payload.trim()
          send(sock, Msg.AWAY_OUT, user.away ? `${user.nick} ${user.away}` : user.nick)
        }
        break
      case Msg.NAMES_REQ:
        if (user) this.names(user, payload.trim())
        break
      case Msg.IGNORE:
        if (user && payload.trim()) user.ignore.add(payload.trim().toLowerCase())
        break
      case Msg.UNIGNORE:
        if (user) user.ignore.delete(payload.trim().toLowerCase())
        break
      case Msg.IGNORE_LIST:
        if (user) {
          for (const n of user.ignore) send(sock, Msg.IGNORE_ENTRY, n)
        }
        break
      case Msg.CLEAR_IGNORE:
        if (user) user.ignore.clear()
        break
      default:
        send(sock, Msg.ERROR, `unknown message ${type}`)
    }
  }

  private login(sock: VirtualSocket, payload: string): void {
    const m = /^(\S+)\s+(\S+)\s+(\d+)\s+"([^"]*)"\s+(\d+)/.exec(payload)
    if (!m) {
      send(sock, Msg.ERROR, 'invalid login')
      return
    }
    const nick = m[1] ?? 'user'
    if (this.users.has(nick.toLowerCase())) {
      send(sock, Msg.ERROR, 'nickname already active')
      sock.close()
      return
    }
    const port = Number(m[3])
    const speed = Number(m[5]) as SpeedId
    const ip = sock.remote.host
    const user: HubUser = {
      nick,
      socket: sock,
      speed,
      port,
      ip,
      firewalled: port === 0,
      files: new Map(),
      channels: new Set(),
      hotlist: new Set(),
      ignore: new Set(),
      away: '',
    }
    this.users.set(nick.toLowerCase(), user)
    this.bySocket.set(sock, user)
    send(sock, Msg.LOGIN_ACK, 'demo@napster.local')
    for (const line of MOTD) send(sock, Msg.MOTD, line)
    this.broadcastStats()
    this.notifyHotlist(nick, true, speed)
  }

  private share(user: HubUser, payload: string): void {
    const q = parseQuoted(payload)
    if (!q) return
    const parts = q.rest.split(/\s+/)
    const file: SharedFile = {
      filename: q.quoted,
      md5: /^[0-9a-f]{8,32}$/i.test(parts[0] ?? '') ? (parts[0] ?? '') : '',
      size: finiteNumber(parts[1]),
      bitrate: finiteNumber(parts[2], 128),
      freq: finiteNumber(parts[3], 44100),
      duration: finiteNumber(parts[4]),
      artist: '',
      title: '',
    }
    const base = q.quoted.split('\\').pop() ?? q.quoted
    const dash = base.replace(/\.mp3$/i, '').split(' - ')
    file.artist = dash.length > 1 ? (dash[0] ?? '') : ''
    file.title = dash.length > 1 ? dash.slice(1).join(' - ') : base.replace(/\.mp3$/i, '')
    user.files.set(q.quoted, file)
  }

  private search(user: HubUser, payload: string): void {
    const q = parseSearch(payload)
    let n = 0
    for (const other of this.users.values()) {
      if (other.nick === user.nick) continue
      for (const file of other.files.values()) {
        if (!matches(file, q.artist, q.title, q.filename, q.minBitrate)) continue
        const line = [
          quoteFilename(file.filename),
          file.md5,
          String(file.size),
          String(file.bitrate),
          String(file.freq),
          String(file.duration),
          other.nick,
          String(ipToInt(other.ip)),
          String(other.speed),
        ].join(' ')
        send(user.socket, Msg.SEARCH_RESULT, line)
        n += 1
        if (n >= q.max) {
          send(user.socket, Msg.SEARCH_END)
          return
        }
      }
    }
    send(user.socket, Msg.SEARCH_END)
  }

  private download(user: HubUser, payload: string): void {
    const m = /^(\S+)\s+/.exec(payload)
    const q = parseQuoted(payload)
    const nick = m?.[1]
    if (!nick || !q) {
      send(user.socket, Msg.ERROR_MSG, 'bad download request')
      return
    }
    const other = this.users.get(nick.toLowerCase())
    if (!other) {
      send(user.socket, Msg.ERROR_MSG, `${nick} is not online`)
      return
    }
    const file = other.files.get(q.quoted)
    if (!file) {
      send(user.socket, Msg.ERROR_MSG, 'file not available')
      return
    }
    send(
      user.socket,
      Msg.DOWNLOAD_ACK,
      `${other.nick} ${other.ip} ${other.port} ${quoteFilename(file.filename)} ${file.md5} ${other.speed}`,
    )
    if (other.firewalled) {
      send(other.socket, Msg.PUSH, `${user.nick} ${user.ip} ${user.port} ${quoteFilename(file.filename)}`)
    }
  }

  private privateMsg(user: HubUser, payload: string): void {
    const space = payload.indexOf(' ')
    if (space < 0) return
    const nick = payload.slice(0, space)
    const text = payload.slice(space + 1)
    const other = this.users.get(nick.toLowerCase())
    if (!other) {
      send(user.socket, Msg.ERROR, `${nick} is not online`)
      return
    }
    if (other.ignore.has(user.nick.toLowerCase())) return
    send(other.socket, Msg.PRIVATE, `${user.nick} ${text}`)
  }

  private addHot(user: HubUser, nick: string): void {
    if (!nick) return
    user.hotlist.add(nick.toLowerCase())
    const other = this.users.get(nick.toLowerCase())
    if (other) send(user.socket, Msg.USER_ONLINE, `${other.nick} ${other.speed} ${other.files.size}`)
    else send(user.socket, Msg.USER_OFFLINE, nick)
  }

  private browse(user: HubUser, nick: string): void {
    const other = this.users.get(nick.toLowerCase())
    if (!other) {
      send(user.socket, Msg.ERROR, `${nick} is not online`)
      return
    }
    for (const file of other.files.values()) {
      send(
        user.socket,
        Msg.BROWSE_ENTRY,
        `${other.nick} ${quoteFilename(file.filename)} ${file.md5} ${file.size} ${file.bitrate} ${file.freq} ${file.duration}`,
      )
    }
    send(user.socket, Msg.BROWSE_END, other.nick)
  }

  private join(user: HubUser, channel: string): void {
    const name = channel.replace(/^#/, '')
    if (!name) return
    user.channels.add(name.toLowerCase())
    send(user.socket, Msg.JOIN_ACK, name)
    const def = CHANNELS.find((c) => c.name.toLowerCase() === name.toLowerCase())
    send(user.socket, Msg.TOPIC, `${def?.name ?? name} ${this.topics.get(name.toLowerCase()) ?? def?.topic ?? 'no topic'}`)
    for (const other of this.users.values()) {
      if (!other.channels.has(name.toLowerCase())) continue
      send(user.socket, Msg.CHANNEL_USER, `${def?.name ?? name} ${other.nick} ${other.files.size} ${other.speed}`)
      if (other !== user) {
        send(other.socket, Msg.USER_JOIN, `${def?.name ?? name} ${user.nick} ${user.files.size} ${user.speed}`)
      }
    }
  }

  private part(user: HubUser, channel: string): void {
    const name = channel.replace(/^#/, '')
    user.channels.delete(name.toLowerCase())
    for (const other of this.users.values()) {
      if (other.channels.has(name.toLowerCase()) || other === user) {
        send(other.socket, Msg.CHANNEL_PART, `${name} ${user.nick}`)
      }
    }
  }

  private pub(user: HubUser, payload: string, emote = false): void {
    const space = payload.indexOf(' ')
    if (space < 0) return
    const channel = payload.slice(0, space)
    const text = payload.slice(space + 1)
    const key = channel.replace(/^#/, '').toLowerCase()
    if (!user.channels.has(key)) this.join(user, channel)
    const shown = CHANNELS.find((c) => c.name.toLowerCase() === key)?.name ?? channel.replace(/^#/, '')
    const tag = emote ? Msg.EMOTE : Msg.PUBLIC
    for (const other of this.users.values()) {
      if (!other.channels.has(key)) continue
      if (other.ignore.has(user.nick.toLowerCase())) continue
      send(other.socket, tag, `${shown} ${user.nick} ${text}`)
    }
  }

  private whois(user: HubUser, nick: string): void {
    const other = this.users.get(nick.toLowerCase())
    if (!other) {
      send(user.socket, Msg.NOSUCH, `user ${nick} is not available`)
      return
    }
    const chans = [...other.channels].join(' ')
    const status = other.away ? 'Away' : 'Active'
    send(
      user.socket,
      Msg.WHOIS_ACK,
      `${other.nick} "User" 0 " ${chans}" "${status}" ${other.files.size} 0 0 ${other.speed} "napster v2.0 BETA 10.3"`,
    )
    if (other.away) send(user.socket, Msg.AWAY_OUT, `${other.nick} ${other.away}`)
  }

  private topic(user: HubUser, payload: string): void {
    const trimmed = payload.trim()
    const space = trimmed.indexOf(' ')
    const raw = space < 0 ? trimmed : trimmed.slice(0, space)
    const text = space < 0 ? '' : trimmed.slice(space + 1)
    const key = raw.replace(/^#/, '').toLowerCase()
    if (!key) return
    const shown = CHANNELS.find((c) => c.name.toLowerCase() === key)?.name ?? raw.replace(/^#/, '')
    if (text) {
      this.topics.set(key, text)
      for (const other of this.users.values()) {
        if (other.channels.has(key)) send(other.socket, Msg.TOPIC, `${shown} ${text}`)
      }
      return
    }
    send(user.socket, Msg.TOPIC, `${shown} ${this.topics.get(key) ?? 'no topic'}`)
  }

  private motd(user: HubUser): void {
    for (const line of MOTD) send(user.socket, Msg.MOTD, line)
  }

  private ping(user: HubUser, nick: string): void {
    const dest = this.users.get(nick.toLowerCase())
    if (!dest) {
      send(user.socket, Msg.NOSUCH, `user ${nick} is not available`)
      return
    }
    send(dest.socket, Msg.PING, user.nick)
  }

  private names(user: HubUser, channel: string): void {
    const name = (channel || [...user.channels][0] || '').replace(/^#/, '')
    if (!name) {
      send(user.socket, Msg.NAMES_END)
      return
    }
    const shown = CHANNELS.find((c) => c.name.toLowerCase() === name.toLowerCase())?.name ?? name
    for (const other of this.users.values()) {
      if (other.channels.has(name.toLowerCase())) send(user.socket, Msg.NAMES, `${shown} ${other.nick}`)
    }
    send(user.socket, Msg.NAMES_END)
  }

  private listChannels(user: HubUser): void {
    const counts = new Map<string, number>()
    for (const c of CHANNELS) counts.set(c.name.toLowerCase(), 0)
    for (const u of this.users.values()) {
      for (const ch of u.channels) counts.set(ch, (counts.get(ch) ?? 0) + 1)
    }
    for (const c of CHANNELS) {
      send(user.socket, Msg.CHANNEL_ENTRY, `${c.name} ${counts.get(c.name.toLowerCase()) ?? 0} ${c.topic}`)
    }
    send(user.socket, Msg.CHANNEL_LIST_END)
  }

  private notifyHotlist(nick: string, online: boolean, speed: SpeedId): void {
    for (const u of this.users.values()) {
      if (!u.hotlist.has(nick.toLowerCase())) continue
      if (online) send(u.socket, Msg.USER_ONLINE, `${nick} ${speed} ${this.users.get(nick.toLowerCase())?.files.size ?? 0}`)
      else send(u.socket, Msg.USER_OFFLINE, nick)
    }
  }

  private broadcastStats(): void {
    const s = this.stats()
    const gigs = (s.bytes / (1024 * 1024 * 1024)).toFixed(1)
    const line = `${s.users} ${s.files} ${gigs}`
    for (const u of this.users.values()) send(u.socket, Msg.SERVER_STATS, line)
  }

  private drop(sock: VirtualSocket): void {
    const user = this.bySocket.get(sock)
    if (!user) return
    this.bySocket.delete(sock)
    this.users.delete(user.nick.toLowerCase())
    for (const ch of [...user.channels]) this.part(user, ch)
    this.notifyHotlist(user.nick, false, user.speed)
    this.broadcastStats()
  }

  /** Used by demo bots that chat through the hub without extra client code. */
  speak(nick: string, channel: string, text: string): void {
    const user = this.users.get(nick.toLowerCase())
    if (!user) return
    this.pub(user, `${channel} ${text}`)
  }

  peerSnapshot(): PeerDef[] {
    return [...this.users.values()].map((u) => ({
      nick: u.nick,
      speed: u.speed,
      firewalled: u.firewalled,
      channels: [...u.channels],
      lines: [],
      files: [...u.files.values()],
    }))
  }
}
