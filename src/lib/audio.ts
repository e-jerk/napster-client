/** Original short preview tones — seeded so each track sounds distinct. */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedFrom(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h || 1
}

export function renderPreviewWav(key: string, duration = 3.2): Blob {
  const rand = mulberry32(seedFrom(key))
  const sampleRate = 22050
  const length = Math.floor(sampleRate * duration)
  const scale = [0, 2, 4, 7, 9, 11, 12]
  const root = 196 + Math.floor(rand() * 8) * 16
  const notes = Array.from({ length: 8 }, () => {
    const n = scale[Math.floor(rand() * scale.length)] ?? 0
    return root * 2 ** (n / 12)
  })
  const samples = new Int16Array(length)
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    const idx = Math.floor((t / duration) * notes.length)
    const f = notes[idx] ?? root
    const env = Math.sin((Math.PI * (t % (duration / notes.length))) / (duration / notes.length))
    const wave =
      0.55 * Math.sin(2 * Math.PI * f * t) +
      0.22 * Math.sin(2 * Math.PI * f * 2 * t) +
      0.08 * Math.sin(2 * Math.PI * (f / 2) * t)
    const v = Math.max(-1, Math.min(1, wave * env * 0.7))
    samples[i] = v * 32767
  }
  const bytes = new Uint8Array(44 + samples.length * 2)
  const view = new DataView(bytes.buffer)
  const writeStr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  bytes.set(new Uint8Array(samples.buffer), 44)
  return new Blob([bytes], { type: 'audio/wav' })
}
