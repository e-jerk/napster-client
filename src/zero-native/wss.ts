/** OpenNAP WSS transport: each binary WebSocket message is one Napster frame. */

export type FrameSock = {
  write: (data: Uint8Array | string) => void
  close: () => void
  onData: (fn: (chunk: Uint8Array) => void) => () => void
  onClose: (fn: () => void) => () => void
}

export function connectWss(url: string): Promise<FrameSock> {
  return new Promise((resolve, reject) => {
    let settled = false
    const ws = new WebSocket(url, ['naps-1'])
    ws.binaryType = 'arraybuffer'
    const dataHandlers: Array<(chunk: Uint8Array) => void> = []
    const closeHandlers: Array<() => void> = []

    const sock: FrameSock = {
      write(data) {
        if (ws.readyState !== WebSocket.OPEN) return
        const src = typeof data === 'string' ? new TextEncoder().encode(data) : data
        const copy = new Uint8Array(src.byteLength)
        copy.set(src)
        ws.send(copy)
      },
      close() {
        ws.close()
      },
      onData(fn) {
        dataHandlers.push(fn)
        return () => {
          const i = dataHandlers.indexOf(fn)
          if (i >= 0) dataHandlers.splice(i, 1)
        }
      },
      onClose(fn) {
        closeHandlers.push(fn)
        return () => {
          const i = closeHandlers.indexOf(fn)
          if (i >= 0) closeHandlers.splice(i, 1)
        }
      },
    }

    ws.onopen = () => {
      settled = true
      resolve(sock)
    }
    ws.onerror = () => {
      if (!settled) {
        settled = true
        reject(new Error(`WebSocket failed: ${url}`))
      }
    }
    ws.onclose = () => {
      if (!settled) {
        settled = true
        reject(new Error(`WebSocket closed: ${url}`))
        return
      }
      for (const h of closeHandlers) h()
    }
    ws.onmessage = (ev) => {
      let chunk: Uint8Array
      if (ev.data instanceof ArrayBuffer) chunk = new Uint8Array(ev.data)
      else if (typeof ev.data === 'string') chunk = new TextEncoder().encode(ev.data)
      else return
      for (const h of dataHandlers) h(chunk)
    }
  })
}
