import { uid } from './format'
import type { LibraryItem } from './types'

export type DirHandle = FileSystemDirectoryHandle

let share: DirHandle | null = null
let downloads: DirHandle | null = null

export function hasFs(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

export function shareDir(): DirHandle | null {
  return share
}

export function downloadDir(): DirHandle | null {
  return downloads
}

export async function pickShare(): Promise<DirHandle | null> {
  if (!hasFs()) return null
  share = await window.showDirectoryPicker({ id: 'opennap-share', mode: 'read' })
  return share
}

export async function pickDownloads(): Promise<DirHandle | null> {
  if (!hasFs()) return null
  downloads = await window.showDirectoryPicker({ id: 'opennap-downloads', mode: 'readwrite' })
  return downloads
}

export async function listShareFiles(): Promise<File[]> {
  if (!share) return []
  const out: File[] = []
  for await (const [name, handle] of share.entries()) {
    if (handle.kind !== 'file') continue
    if (name.startsWith('.')) continue
    out.push(await handle.getFile())
    if (out.length >= 200) break
  }
  return out
}

export async function readShareFile(name: string): Promise<File | null> {
  if (!share) return null
  const base = name.replace(/^.*[/\\]/, '')
  try {
    const handle = await share.getFileHandle(base)
    return await handle.getFile()
  } catch {
    return null
  }
}

export async function writeDownload(name: string, data: Blob): Promise<void> {
  const base = name.replace(/^.*[/\\]/, '') || 'download'
  if (downloads) {
    const handle = await downloads.getFileHandle(base, { create: true })
    const writable = await handle.createWritable()
    await writable.write(data)
    await writable.close()
    return
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(data)
  a.download = base
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}

export function libraryFromFile(file: File, origin: LibraryItem['origin'] = 'shared'): LibraryItem {
  const title = file.name.replace(/\.[^.]+$/, '')
  return {
    id: uid('lib'),
    filename: file.name,
    artist: '',
    title,
    size: file.size,
    bitrate: 128,
    freq: 44100,
    duration: Math.max(1, Math.round(file.size / 16000)),
    md5: '0'.repeat(32),
    origin,
    blob: file,
  }
}
