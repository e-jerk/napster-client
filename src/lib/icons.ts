/**
 * Pixel-perfect SVGs traced from napster.exe (BETA 10.3) RT_GROUP_ICON /
 * RT_BITMAP. Files live in /icons. The EXE is not bundled.
 */
import type { AppView } from './types'

export const TOOL_ICONS: Record<AppView | 'help', string> = {
  home: 'computer',
  chat: 'chat',
  library: 'folder-open',
  search: 'search',
  hotlist: 'user-online',
  transfer: 'transfer',
  discover: 'cd',
  help: 'help',
}

export const ICON_SOURCES: Record<string, string> = {
  'app-32': 'RT_GROUP_ICON 101 (32×32)',
  'app-16': 'RT_GROUP_ICON 101 (16×16)',
  chat: 'RT_GROUP_ICON 108',
  play: 'RT_GROUP_ICON 157',
  'file-list': 'RT_GROUP_ICON 259',
  speaker: 'RT_GROUP_ICON 277',
  download: 'RT_GROUP_ICON 292',
  upload: 'RT_GROUP_ICON 293',
  stop: 'RT_GROUP_ICON 331',
  pause: 'RT_GROUP_ICON 332',
  'wave-left': 'RT_GROUP_ICON 334',
  'wave-right': 'RT_GROUP_ICON 335',
  transfer: 'RT_GROUP_ICON 336',
  search: 'RT_GROUP_ICON 339',
  folder: 'RT_GROUP_ICON 346',
  checkbox: 'RT_GROUP_ICON 348',
  'checkbox-on': 'RT_GROUP_ICON 349',
  hand: 'RT_GROUP_ICON 355',
  user: 'RT_GROUP_ICON 381',
  'badge-red': 'RT_GROUP_ICON 387',
  blank: 'RT_GROUP_ICON 388',
  'checkbox-dim': 'RT_GROUP_ICON 389',
  folders: 'RT_GROUP_ICON 393',
  'folder-open': 'RT_GROUP_ICON 394',
  drive: 'RT_GROUP_ICON 395',
  computer: 'RT_GROUP_ICON 396',
  'drive-net': 'RT_GROUP_ICON 397',
  cdrom: 'RT_GROUP_ICON 398',
  help: 'RT_GROUP_ICON 400',
  disc: 'RT_GROUP_ICON 409',
  cd: 'RT_GROUP_ICON 410',
  'user-online': 'RT_GROUP_ICON 419',
  window: 'RT_GROUP_ICON 420',
  note: 'RT_GROUP_ICON 423',
  lock: 'RT_GROUP_ICON 457',
  unlock: 'RT_GROUP_ICON 458',
  'status-yellow': 'RT_BITMAP 264',
  'status-red': 'RT_BITMAP 265',
  'status-green': 'RT_BITMAP 266',
  'status-black': 'RT_BITMAP 268',
  logo: 'RT_BITMAP 379 (399×92 wordmark)',
  cdnow: 'RT_BITMAP 452 (50×12)',
}

export function iconUrl(name: string): string {
  return `/icons/${name}.svg`
}
