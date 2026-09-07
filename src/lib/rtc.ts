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

type Peer = {
  pc: RTCPeerConnection
  pendingIce: RTCIceCandidateInit[]
}

export class RtcMesh {
  private send: RtcSend | null = null
  private peers = new Map<string, Peer>()
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
    for (const peer of this.peers.values()) peer.pc.close()
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
      void this.sendFile(nick, file).catch((err: unknown) => {
        this.onError?.(nick, err instanceof Error ? err.message : 'WebRTC upload failed')
      })
      return
    }
    if (msg.typ === 'bye') {
      this.drop(nick)
      return
    }
    const peer = this.peer(nick)
    if (msg.typ === 'offer' && msg.sdp) {
      await peer.pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp })
      await this.flushIce(nick)
      const answer = await peer.pc.createAnswer()
      await peer.pc.setLocalDescription(answer)
      this.emit({ typ: 'answer', to: nick, sdp: answer.sdp })
      return
    }
    if (msg.typ === 'answer' && msg.sdp) {
      if (!peer.pc.currentRemoteDescription) await peer.pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp })
      await this.flushIce(nick)
      return
    }
    if (msg.typ === 'ice' && msg.ice) {
      const cand = JSON.parse(msg.ice) as RTCIceCandidateInit
      if (!peer.pc.currentRemoteDescription) {
        peer.pendingIce.push(cand)
        return
      }
      try {
        await peer.pc.addIceCandidate(cand)
      } catch {
        /* stale */
      }
    }
  }

  async request(nick: string, file: string): Promise<void> {
    this.emit({ typ: 'want', to: nick, file })
    const peer = this.peer(nick)
    const ch = peer.pc.createDataChannel('napster')
    this.bindChannel(nick, ch)
    const offer = await peer.pc.createOffer()
    await peer.pc.setLocalDescription(offer)
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
      while (ch.bufferedAmount > 512 * 1024) await pause(20)
      ch.send(copy)
      this.onProgress?.(nick, file.name, Math.min(buf.length, i + slice.length), buf.length)
    }
    while (ch.bufferedAmount > 0) await pause(20)
    ch.send(JSON.stringify({ op: 'done', file: file.name }))
  }

  private peer(nick: string): Peer {
    const key = nick.toLowerCase()
    const existing = this.peers.get(key)
    if (existing && existing.pc.connectionState !== 'closed' && existing.pc.connectionState !== 'failed') return existing
    const pc = new RTCPeerConnection(ICE)
    const peer: Peer = { pc, pendingIce: [] }
    this.peers.set(key, peer)
    pc.onicecandidate = (ev) => {
      if (ev.candidate) this.emit({ typ: 'ice', to: nick, ice: JSON.stringify(ev.candidate) })
    }
    pc.ondatachannel = (ev) => this.bindChannel(nick, ev.channel)
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') this.drop(nick)
    }
    return peer
  }

  private async flushIce(nick: string): Promise<void> {
    const peer = this.peers.get(nick.toLowerCase())
    if (!peer?.pc.currentRemoteDescription) return
    const queued = peer.pendingIce.splice(0)
    for (const cand of queued) {
      try {
        await peer.pc.addIceCandidate(cand)
      } catch {
        /* stale */
      }
    }
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
    this.peers.get(key)?.pc.close()
    this.channels.delete(key)
    this.peers.delete(key)
    this.incoming.delete(key)
  }
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
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
