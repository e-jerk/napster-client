import { renderPreviewWav } from '../lib/audio'
import { buildPeers, type PeerDef } from '../lib/catalog'

export type { PeerDef }
import { quoteFilename } from '../lib/format'
import { Msg, PacketReader, send } from './protocol'
import type { VirtualTcp } from './tcp'

const decoder = new TextDecoder()

export function shareLine(file: PeerDef['files'][number]): string {
  return `${quoteFilename(file.filename)} ${file.md5} ${file.size} ${file.bitrate} ${file.freq} ${file.duration}`
}

async function serveDataPort(
  tcp: VirtualTcp,
  peer: PeerDef,
  ip: string,
  port: number,
): Promise<void> {
  tcp.listen(ip, port, (sock) => {
    let buf = ''
    sock.onData((chunk) => {
      buf += decoder.decode(chunk)
      const nl = buf.indexOf('\n')
      if (nl < 0) return
      const line = buf.slice(0, nl).trim()
      buf = buf.slice(nl + 1)
      const m = /^GET\s+(\S+)\s+"([^"]+)"\s+(\d+)/i.exec(line)
      if (!m) {
        sock.write('FILE NOT AVAILABLE\n')
        sock.close()
        return
      }
      const file = peer.files.find((f) => f.filename === m[2])
      if (!file) {
        sock.write('FILE NOT AVAILABLE\n')
        sock.close()
        return
      }
      const wav = renderPreviewWav(file.md5)
      void wav.arrayBuffer().then((ab) => {
        const bytes = new Uint8Array(ab)
        sock.write(`${bytes.length}\n`)
        const chunk = 1024
        let i = 0
        const pump = () => {
          if (i >= bytes.length || sock.isClosed) {
            sock.close()
            return
          }
          sock.write(bytes.subarray(i, i + chunk))
          i += chunk
          setTimeout(pump, 8)
        }
        pump()
      })
    })
  })
}

async function runBot(tcp: VirtualTcp, peer: PeerDef, ip: string, index: number): Promise<void> {
  const port = peer.firewalled ? 0 : 6699 + index
  if (port) await serveDataPort(tcp, peer, ip, port)
  const sock = await tcp.connect('napster.local', 8888, { host: ip, port: 20000 + index })
  const reader = new PacketReader()
  sock.onData((chunk) => {
    for (const pkt of reader.push(chunk)) {
      if (pkt.type === Msg.PUSH) {
        const m = /^(\S+)\s+(\S+)\s+(\d+)\s+"([^"]+)"/.exec(pkt.payload)
        if (!m) continue
        const destHost = m[2] ?? ''
        const destPort = Number(m[3])
        const filename = m[4] ?? ''
        const file = peer.files.find((f) => f.filename === filename)
        if (!file) continue
        void tcp.connect(destHost, destPort, { host: ip, port: 30000 + index }).then((up) => {
          const wav = renderPreviewWav(file.md5)
          void wav.arrayBuffer().then((ab) => {
            const bytes = new Uint8Array(ab)
            up.write(`SEND ${peer.nick} "${filename}" ${bytes.length}\n`)
            let i = 0
            const pump = () => {
              if (i >= bytes.length || up.isClosed) {
                up.close()
                return
              }
              up.write(bytes.subarray(i, i + 1024))
              i += 1024
              setTimeout(pump, 8)
            }
            setTimeout(pump, 20)
          })
        })
      }
    }
  })
  send(sock, Msg.LOGIN, `${peer.nick} x ${port} "napster v2.0 BETA 10.3" ${peer.speed}`)
  for (const file of peer.files) send(sock, Msg.SHARE, shareLine(file))
  for (const ch of peer.channels) send(sock, Msg.JOIN, ch)
}

export async function spawnBots(tcp: VirtualTcp): Promise<PeerDef[]> {
  const peers = buildPeers()
  await Promise.all(peers.map((peer, i) => runBot(tcp, peer, `10.0.0.${10 + i}`, i)))
  return peers
}
