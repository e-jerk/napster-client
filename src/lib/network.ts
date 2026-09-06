import { NapsterClient, seedLibrary } from '../zero-native/client'
import { NapsterHub } from '../zero-native/hub'
import { spawnBots, type PeerDef } from '../zero-native/peers'
import { VirtualTcp } from '../zero-native/tcp'
import { uid } from './format'
import { detectHub } from './hub'
import { app } from './session.svelte'
import type { Transfer } from './types'

const tcp = new VirtualTcp()
const hub = new NapsterHub(tcp)
hub.listen()

export const client = new NapsterClient(tcp)

let bots: PeerDef[] = []
let chatTimer: ReturnType<typeof setInterval> | null = null
let uploadTimer: ReturnType<typeof setInterval> | null = null
let demoStarted = false

function chatter(): void {
  if (app.hub !== 'demo' || !app.connected || !bots.length) return
  const bot = bots[Math.floor(Math.random() * bots.length)]
  if (!bot) return
  const channel = bot.channels[Math.floor(Math.random() * bot.channels.length)]
  const line = bot.lines[Math.floor(Math.random() * bot.lines.length)]
  if (channel && line) hub.speak(bot.nick, channel, line)
}

function maybeUpload(): void {
  if (app.hub !== 'demo' || !app.connected || !app.library.length) return
  if (Math.random() > 0.35) return
  const file = app.library[Math.floor(Math.random() * app.library.length)]
  const bot = bots[Math.floor(Math.random() * bots.length)]
  if (!file || !bot) return
  if (app.transfers.some((t) => t.direction === 'upload' && t.status === 'Transferring')) return
  const t: Transfer = {
    id: uid('up'),
    direction: 'upload',
    filename: file.filename,
    artist: file.artist,
    title: file.title,
    size: file.size,
    nick: bot.nick,
    speed: bot.speed,
    status: 'Transferring',
    percent: 4,
    bps: 48_000,
    startedAt: Date.now(),
  }
  app.transfers = [t, ...app.transfers]
  const id = t.id
  const started = Date.now()
  const iv = window.setInterval(() => {
    const row = app.transfers.find((x) => x.id === id)
    if (!row) {
      window.clearInterval(iv)
      return
    }
    const p = Math.min(100, ((Date.now() - started) / 2600) * 100)
    row.percent = p
    if (p >= 100) {
      row.status = 'Complete'
      row.percent = 100
      window.clearInterval(iv)
    }
    app.transfers = app.transfers.slice()
  }, 90)
}

export async function ensureDemoHub(): Promise<void> {
  if (demoStarted) return
  demoStarted = true
  bots = await spawnBots(tcp)
  chatTimer = setInterval(chatter, 5200)
  uploadTimer = setInterval(maybeUpload, 18000)
  setTimeout(chatter, 900)
  setTimeout(chatter, 2200)
}

export const networkReady: Promise<void> = (async () => {
  seedLibrary()
  if (detectHub() === 'demo') await ensureDemoHub()
})()

export function shutdownNetwork(): void {
  if (chatTimer) clearInterval(chatTimer)
  if (uploadTimer) clearInterval(uploadTimer)
  hub.stop()
  client.disconnect()
}

export { hub, tcp }
