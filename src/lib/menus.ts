/**
 * Menus, ads, and chrome taken from napster.exe inside napv2b10-3.exe.
 *
 * Installer: archive.org/details/napv2b10-3 (2,044,147 bytes, MD5 d9f743ca…).
 * That file is a MindVision VISE self-extractor (ESIV overlay at 0x11000).
 * Payload napster.exe is 581,632 bytes, MD5 6d121b9717f53c48ee1254bd28ed9c00,
 * VERSIONINFO “BETA 10.3 Napster Client Application”.
 *
 * Top-level menus are ASCII C-strings in .rdata (not RT_MENU). Context menus
 * are RT_MENU 276–316. CDNOW wordmark is BITMAP 452 (50×12). Shop URL is
 * http://shop.napster.com. Home / Discover / Help are IE panes:
 *   http://www.napster.com/client/home.html?02b103
 *   http://www.napster.com/client/discover.html
 *   http://www.napster.com/client/help/…
 */
import type { AppView, HelpTopic } from './types'

export const VIEW_ITEMS: { id: AppView; label: string; shortcut: string }[] = [
  { id: 'home', label: 'Home', shortcut: 'Ctrl+H' },
  { id: 'chat', label: 'Chat', shortcut: 'Ctrl+A' },
  { id: 'library', label: 'My Files', shortcut: 'Ctrl+M' },
  { id: 'search', label: 'Search', shortcut: 'Ctrl+S' },
  { id: 'hotlist', label: 'Hot List', shortcut: 'Ctrl+L' },
  { id: 'transfer', label: 'Transfer', shortcut: 'Ctrl+T' },
  { id: 'discover', label: 'Discover', shortcut: 'Ctrl+D' },
]

export const VIEW_SHORTCUTS: Record<string, AppView> = {
  h: 'home',
  a: 'chat',
  m: 'library',
  s: 'search',
  l: 'hotlist',
  t: 'transfer',
  d: 'discover',
}

export const HELP_MANUAL: { id: HelpTopic; label: string }[] = [
  { id: 'manual-install', label: 'Installation' },
  { id: 'manual-config', label: 'Configuration' },
  { id: 'manual-chat', label: 'Chat & Instant Messaging' },
  { id: 'manual-myfiles', label: 'My Files' },
  { id: 'manual-search', label: 'Search' },
  { id: 'manual-hotlist', label: 'Hot List' },
  { id: 'manual-transfer', label: 'Transfer' },
  { id: 'manual-discover', label: 'Discover' },
  { id: 'manual-extra', label: 'Extra Knowledge' },
]

export const HELP_FAQ: { id: HelpTopic; label: string }[] = [
  { id: 'faq-connecting', label: 'Connecting' },
  { id: 'faq-chat', label: 'Chat & Instant Messaging' },
  { id: 'faq-myfiles', label: 'My Files & Player' },
  { id: 'faq-search', label: 'Search' },
  { id: 'faq-transfer', label: 'Transfer' },
  { id: 'faq-company', label: 'General Company Info' },
]

export const CLIENT_HOME = 'http://www.napster.com/client/home.html?02b103'
export const CLIENT_DISCOVER = 'http://www.napster.com/client/discover.html'
export const SHOP_NAPSTER = 'http://shop.napster.com'

export function onlineStatus(nick: string, sharing: number): string {
  return `Online (${nick}): Sharing ${sharing} files.`
}

export function networkStatus(users: number, files: number, gigs: number): string {
  const g = Number.isFinite(gigs) ? gigs.toFixed(1) : '0.0'
  return `Currently ${users.toLocaleString()} users sharing ${files.toLocaleString()} files (${g} gigs)`
}

export function offlineStatus(nick: string): string {
  return `Disconnected (${nick}).`
}
