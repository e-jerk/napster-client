import { client } from './network'
import { app } from './session.svelte'
import type { AppView, HelpTopic } from './types'

/** Close floating menus after a command. */
export function closeChrome(): void {
  app.dialogs.menu = null
  app.dialogs.start = false
}

export function selectedNick(): string | null {
  if (app.search.selected) {
    const hit = app.search.results.find((r) => r.id === app.search.selected)
    if (hit) return hit.nick
  }
  return app.chat.selectedUser || app.hotSelected
}

export function cmdConnect(): void {
  if (app.connected) client.disconnect()
  app.phase = 'setup'
  closeChrome()
}

export function cmdDisconnect(): void {
  if (app.connected) client.disconnect()
  closeChrome()
}

export function cmdExit(): void {
  app.win.open = false
  closeChrome()
}

export function cmdView(view: AppView): void {
  app.view = view
  closeChrome()
}

export function cmdPreferences(): void {
  app.dialogs.preferences = true
  closeChrome()
}

export function cmdIM(nick = selectedNick()): void {
  if (nick) client.msg(nick, '')
  else app.status = 'Select a user in Search, Chat, or Hot List first.'
  closeChrome()
}

export function cmdAddHot(nick = selectedNick()): void {
  if (nick) client.addHot(nick)
  else app.status = 'Select a user to add to the Hot List.'
  closeChrome()
}

export function cmdUserInfo(nick = selectedNick()): void {
  if (nick) app.dialogs.userInfo = nick
  else app.status = 'Select a user to view information.'
  closeChrome()
}

export function cmdJoinRooms(): void {
  app.dialogs.join = true
  closeChrome()
}

export function cmdIgnoreList(): void {
  app.dialogs.ignore = true
  closeChrome()
}

export function cmdShop(): void {
  app.dialogs.shop = true
  closeChrome()
}

export function cmdLogonServer(): void {
  app.dialogs.logon = true
  closeChrome()
}

export function cmdFeedback(): void {
  app.dialogs.feedback = true
  closeChrome()
}

export function cmdHelp(topic: HelpTopic): void {
  app.dialogs.help = topic
  closeChrome()
}

export function cmdAbout(): void {
  app.dialogs.about = true
  closeChrome()
}

export function cmdBridge(): void {
  app.dialogs.bridge = true
  closeChrome()
}

export function cmdDownloadSelected(): void {
  const hit = app.search.results.find((r) => r.id === app.search.selected)
  if (hit) client.download(hit)
  closeChrome()
}

export function addIgnore(nick: string): void {
  const n = nick.trim()
  if (!n) return
  if (!app.ignore.includes(n)) app.ignore = [...app.ignore, n]
}

export function removeIgnore(nick: string): void {
  app.ignore = app.ignore.filter((n) => n !== nick)
}
