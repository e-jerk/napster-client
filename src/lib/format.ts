import { SPEEDS, type SpeedId } from './types'

export function speedLabel(id: SpeedId | number): string {
  return SPEEDS.find((s) => s.id === id)?.label ?? 'Unknown'
}

export function speedKbps(id: SpeedId | number): number {
  return SPEEDS.find((s) => s.id === id)?.kbps ?? 56
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function formatGigs(bytes: number): string {
  return (bytes / (1024 * 1024 * 1024)).toFixed(1)
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatBitrate(kbps: number): string {
  return `${kbps}kbps`
}

export function formatFreq(hz: number): string {
  return `${Math.round(hz / 1000)}kHz`
}

export function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function basename(path: string): string {
  const parts = path.replaceAll('\\', '/').split('/')
  return parts[parts.length - 1] ?? path
}

export function quoteFilename(name: string): string {
  return `"${name.replaceAll('"', "'")}"`
}

export function parseQuoted(input: string): { quoted: string; rest: string } | null {
  const start = input.indexOf('"')
  if (start < 0) return null
  const end = input.indexOf('"', start + 1)
  if (end < 0) return null
  return {
    quoted: input.slice(start + 1, end),
    rest: input.slice(end + 1).trim(),
  }
}

export function hash32(s: string): string {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16).padStart(8, '0').repeat(4).slice(0, 32)
}

let seq = 0
export function uid(prefix = 'id'): string {
  seq += 1
  return `${prefix}-${seq}-${Math.random().toString(36).slice(2, 7)}`
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export function transferSeconds(size: number, speed: SpeedId | number): number {
  const kbps = speedKbps(speed)
  const real = (size * 8) / (kbps * 1000)
  return clamp(real / 28, 1.4, 7.5)
}
