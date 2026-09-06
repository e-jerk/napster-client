/** In-browser virtual TCP. No native sockets, no Node net, no WASM stacks. */

export type SockAddr = { host: string; port: number }

export function addrKey(a: SockAddr): string {
  return `${a.host}:${a.port}`
}

export class VirtualSocket {
  readonly local: SockAddr
  readonly remote: SockAddr
  private peer: VirtualSocket | null = null
  private closed = false
  private dataHandlers: Array<(chunk: Uint8Array) => void> = []
  private closeHandlers: Array<() => void> = []

  constructor(local: SockAddr, remote: SockAddr) {
    this.local = local
    this.remote = remote
  }

  get isClosed(): boolean {
    return this.closed
  }

  _attach(peer: VirtualSocket): void {
    this.peer = peer
  }

  onData(fn: (chunk: Uint8Array) => void): () => void {
    this.dataHandlers.push(fn)
    return () => {
      this.dataHandlers = this.dataHandlers.filter((h) => h !== fn)
    }
  }

  onClose(fn: () => void): () => void {
    this.closeHandlers.push(fn)
    return () => {
      this.closeHandlers = this.closeHandlers.filter((h) => h !== fn)
    }
  }

  write(data: Uint8Array | string): void {
    if (this.closed || !this.peer) return
    const chunk = typeof data === 'string' ? new TextEncoder().encode(data) : data
    const target = this.peer
    queueMicrotask(() => target._deliver(chunk))
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    const other = this.peer
    this.peer = null
    for (const h of this.closeHandlers) h()
    if (other && !other.closed) other.close()
  }

  _deliver(chunk: Uint8Array): void {
    if (this.closed) return
    for (const h of this.dataHandlers) h(chunk)
  }
}

type Accept = (socket: VirtualSocket) => void

export class VirtualTcp {
  private servers = new Map<string, Accept>()
  private ephemeral = 40000

  listen(host: string, port: number, onAccept: Accept): () => void {
    const key = `${host}:${port}`
    this.servers.set(key, onAccept)
    return () => {
      this.servers.delete(key)
    }
  }

  async connect(host: string, port: number, from?: Partial<SockAddr>): Promise<VirtualSocket> {
    const handler =
      this.servers.get(`${host}:${port}`) ?? this.servers.get(`0.0.0.0:${port}`)
    if (!handler) {
      throw new Error(`ECONNREFUSED ${host}:${port}`)
    }
    this.ephemeral += 1
    const local: SockAddr = {
      host: from?.host ?? '10.0.0.2',
      port: from?.port ?? this.ephemeral,
    }
    const remote: SockAddr = { host, port }
    const client = new VirtualSocket(local, remote)
    const server = new VirtualSocket(remote, local)
    client._attach(server)
    server._attach(client)
    handler(server)
    return client
  }
}

export function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const len = chunks.reduce((n, c) => n + c.length, 0)
  const out = new Uint8Array(len)
  let o = 0
  for (const c of chunks) {
    out.set(c, o)
    o += c.length
  }
  return out
}
