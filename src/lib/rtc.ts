export type RtcTyp = 'offer' | 'answer' | 'ice' | 'want' | 'bye'

export type RtcSignal = {
  cmd: 'rtc'
  typ: RtcTyp
  from?: string
  to: string
  sdp?: string
  ice?: string
  file?: string
  size?: string
}

export type RtcSend = (msg: RtcSignal) => void

const ICE: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }, { urls: 'stun:stun.l.google.com:19302' }],
}

const CHUNK = 16 * 1024

type Incoming = {
  file: string
  size: number
  chunks: Uint8Array[]
  got: number
}

export class RtcMesh {
  private send: RtcSend | null = null
  private peers = new Map<string, RTCPeerConnection>()
  private channels = new Map<string, RTCDataChannel>()
  private incoming = new Map<string, Incoming>()
  onFile: ((nick: string, file: string, data: Uint8Array) => void) | null = null
  onProgress: ((nick: string, file: string, got: number, size: number) => void) | null = null
  onWant: ((nick: string, file: string) => Promise<File | null>) | null = null
  onError: ((nick: string, err: string) => void) | null = null

  attach(send: RtcSend): void {
    this.send = send
  }

  close(): void {
    for (const ch of this.channels.values()) ch.close()
    for (const pc of this.peers.values()) pc.close()
    this.channels.clear()
    this.peers.clear()
    this.incoming.clear()
    this.send = null
  }

  async handle(raw: string): Promise<void> {
    let msg: RtcSignal
    try {
      msg = JSON.parse(raw) as RtcSignal
    } catch {
      return
    }
    if (msg.cmd !== 'rtc' || !msg.from || !msg.typ) return
    const nick = msg.from
    if (msg.typ === 'want' && msg.file) {
      const file = (await this.onWant?.(nick, msg.file)) ?? null
      if (!file) {
        this.onError?.(nick, `${msg.file} is not in the share folder`)
        return
      }
      await this.sendFile(nick, file)
      return
    }
    if (msg.typ === 'bye') {
      this.drop(nick)
      return
    }
    const pc = this.peer(nick)
    if (msg.typ === 'offer' && msg.sdp) {
      await pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp })
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      this.emit({ typ: 'answer', to: nick, sdp: answer.sdp })
      return
    }
    if (msg.typ === 'answer' && msg.sdp) {
      if (!pc.currentRemoteDescription) await pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp })
      return
    }
    if (msg.typ === 'ice' && msg.ice) {
      try {
        await pc.addIceCandidate(JSON.parse(msg.ice) as RTCIceCandidateInit)
      } catch {
        /* stale */
      }
    }
  }

  async request(nick: string, file: string): Promise<void> {
    this.emit({ typ: 'want', to: nick, file })
    const pc = this.peer(nick)
    const ch = pc.createDataChannel('napster')
    this.bindChannel(nick, ch)
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    this.emit({ typ: 'offer', to: nick, sdp: offer.sdp, file })
  }

  private async sendFile(nick: string, file: File): Promise<void> {
    const ch = await this.waitChannel(nick)
    ch.send(JSON.stringify({ op: 'have', file: file.name, size: file.size }))
    const buf = new Uint8Array(await file.arrayBuffer())
    for (let i = 0; i < buf.length; i += CHUNK) {
      const slice = buf.subarray(i, i + CHUNK)
      const copy = new Uint8Array(slice.byteLength)
      copy.set(slice)
      ch.send(copy)
      this.onProgress?.(nick, file.name, Math.min(buf.length, i + slice.length), buf.length)
    }
    ch.send(JSON.stringify({ op: 'done', file: file.name }))
  }

  private peer(nick: string): RTCPeerConnection {
    const key = nick.toLowerCase()
    const existing = this.peers.get(key)
    if (existing && existing.connectionState !== 'closed' && existing.connectionState !== 'failed') return existing
    const pc = new RTCPeerConnection(ICE)
    this.peers.set(key, pc)
    pc.onicecandidate = (ev) => {
      if (ev.candidate) this.emit({ typ: 'ice', to: nick, ice: JSON.stringify(ev.candidate) })
    }
    pc.ondatachannel = (ev) => this.bindChannel(nick, ev.channel)
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') this.drop(nick)
    }
    return pc
  }

  private bindChannel(nick: string, ch: RTCDataChannel): void {
    this.channels.set(nick.toLowerCase(), ch)
    ch.binaryType = 'arraybuffer'
    ch.onmessage = (ev) => this.onChannel(nick, ev.data)
  }

  private async waitChannel(nick: string): Promise<RTCDataChannel> {
    const key = nick.toLowerCase()
    const ready = this.channels.get(key)
    if (ready && ready.readyState === 'open') return ready
    this.peer(nick)
    return await new Promise((resolve, reject) => {
      const started = Date.now()
      const id = window.setInterval(() => {
        const ch = this.channels.get(key)
        if (ch?.readyState === 'open') {
          window.clearInterval(id)
          resolve(ch)
          return
        }
        if (Date.now() - started > 12000) {
          window.clearInterval(id)
          reject(new Error(`WebRTC to ${nick} timed out`))
        }
      }, 50)
    })
  }

  private onChannel(nick: string, data: unknown): void {
    if (typeof data === 'string') {
      let msg: { op?: string; file?: string; size?: number }
      try {
        msg = JSON.parse(data) as { op?: string; file?: string; size?: number }
      } catch {
        return
      }
      if (msg.op === 'have' && msg.file) {
        this.incoming.set(nick.toLowerCase(), { file: msg.file, size: msg.size ?? 0, chunks: [], got: 0 })
        return
      }
      if (msg.op === 'done') {
        const inc = this.incoming.get(nick.toLowerCase())
        if (!inc) return
        const bytes = concat(inc.chunks, inc.got)
        this.incoming.delete(nick.toLowerCase())
        this.onFile?.(nick, inc.file, bytes)
      }
      return
    }
    const chunk = data instanceof ArrayBuffer ? new Uint8Array(data) : data instanceof Uint8Array ? data : null
    if (!chunk) return
    const inc = this.incoming.get(nick.toLowerCase())
    if (!inc) return
    inc.chunks.push(chunk)
    inc.got += chunk.byteLength
    this.onProgress?.(nick, inc.file, inc.got, inc.size)
  }

  private emit(msg: Omit<RtcSignal, 'cmd'>): void {
    this.send?.({ cmd: 'rtc', ...msg })
  }

  private drop(nick: string): void {
    const key = nick.toLowerCase()
    this.channels.get(key)?.close()
    this.peers.get(key)?.close()
    this.channels.delete(key)
    this.peers.delete(key)
    this.incoming.delete(key)
  }
}

function concat(chunks: Uint8Array[], total: number): Uint8Array {
  const out = new Uint8Array(total)
  let o = 0
  for (const c of chunks) {
    out.set(c, o)
    o += c.length
  }
  return out
}
