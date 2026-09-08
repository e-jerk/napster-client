<script lang="ts">
  import { cmdHelp, cmdView } from '../lib/commands'
  import { networkStatus, offlineStatus, onlineStatus, VIEW_ITEMS, VIEW_SHORTCUTS } from '../lib/menus'
  import { app } from '../lib/session.svelte'
  import type { AppView } from '../lib/types'
  import { TOOL_ICONS } from '../lib/icons'
  import AdBanner from '../ui/AdBanner.svelte'
  import AppMenus from '../ui/AppMenus.svelte'
  import CatLogo from '../ui/CatLogo.svelte'
  import CdnowButton from '../ui/CdnowButton.svelte'
  import NapIcon from '../ui/NapIcon.svelte'
  import ThemeSwitch from '../ui/ThemeSwitch.svelte'
  import TitleBar from '../ui/TitleBar.svelte'
  import ChatView from './ChatView.svelte'
  import Dialogs from './Dialogs.svelte'
  import DiscoverView from './DiscoverView.svelte'
  import HomeView from './HomeView.svelte'
  import HotlistView from './HotlistView.svelte'
  import LibraryView from './LibraryView.svelte'
  import SearchView from './SearchView.svelte'
  import TransferView from './TransferView.svelte'

  const tools: { id: AppView | 'help'; label: string }[] = [
    ...VIEW_ITEMS.map((t) => ({ id: t.id as AppView | 'help', label: t.label })),
    { id: 'help', label: 'Help' },
  ]

  type Edge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

  let dragging = $state(false)
  let resizing = $state<Edge | null>(null)
  let dx = 0
  let dy = 0
  let start = { x: 0, y: 0, w: 0, h: 0, left: 0, top: 0 }
  const MIN_W = 480
  const MIN_H = 360

  function dragStart(e: PointerEvent) {
    if (app.win.maximized || resizing) return
    dragging = true
    dx = e.clientX - app.win.x
    dy = e.clientY - app.win.y
  }

  function resizeStart(edge: Edge, e: PointerEvent) {
    if (app.win.maximized) return
    e.stopPropagation()
    e.preventDefault()
    resizing = edge
    start = {
      x: e.clientX,
      y: e.clientY,
      w: app.win.w,
      h: app.win.h,
      left: app.win.x,
      top: app.win.y,
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function dragMove(e: PointerEvent) {
    if (resizing) {
      const ox = e.clientX - start.x
      const oy = e.clientY - start.y
      let w = start.w
      let h = start.h
      let left = start.left
      let top = start.top
      if (resizing.includes('e')) w = Math.max(MIN_W, start.w + ox)
      if (resizing.includes('s')) h = Math.max(MIN_H, start.h + oy)
      if (resizing.includes('w')) {
        w = Math.max(MIN_W, start.w - ox)
        left = start.left + start.w - w
      }
      if (resizing.includes('n')) {
        h = Math.max(MIN_H, start.h - oy)
        top = start.top + start.h - h
      }
      app.win.w = w
      app.win.h = h
      app.win.x = Math.max(0, left)
      app.win.y = Math.max(app.theme === 'mac' ? 24 : 0, top)
      return
    }
    if (!dragging) return
    app.win.x = Math.max(0, e.clientX - dx)
    app.win.y = Math.max(app.theme === 'mac' ? 24 : 0, e.clientY - dy)
  }

  function dragEnd() {
    dragging = false
    resizing = null
  }

  function toggleMenu(name: string) {
    app.dialogs.menu = app.dialogs.menu === name ? null : name
    app.dialogs.start = false
  }

  function clickTool(id: AppView | 'help') {
    if (id === 'help') cmdHelp('start')
    else cmdView(id)
  }

  const style = $derived.by(() => {
    if (!app.win.maximized) {
      return `left:${app.win.x}px;top:${app.win.y}px;width:${app.win.w}px;height:${app.win.h}px;`
    }
    if (app.theme === 'mac') return 'inset: 28px 10px 76px 10px; width: auto; height: auto;'
    return 'inset: 8px 8px 38px 8px; width: auto; height: auto;'
  })

  const sharing = $derived(
    app.connected
      ? `${onlineStatus(app.nick, app.library.length)} ${networkStatus(app.stats.users, app.stats.files, app.stats.gigs)}`
      : offlineStatus(app.nick),
  )

  function onKey(e: KeyboardEvent) {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return
    const t = e.target as HTMLElement
    if (t.closest('input, textarea, select, [contenteditable="true"]')) return
    const view = VIEW_SHORTCUTS[e.key.toLowerCase()]
    if (!view) return
    e.preventDefault()
    cmdView(view)
  }
</script>

<svelte:window onpointermove={dragMove} onpointerup={dragEnd} onpointercancel={dragEnd} onkeydown={onKey} />

<section
  class="window client"
  class:hidden={app.win.minimized || !app.win.open}
  class:resizing={dragging || resizing}
  style={style}
>
  {#if app.theme === 'mac'}
    <TitleBar
      title="Napster v2.0 BETA 10.3"
      inactive={!app.connected}
      buttons="all"
      onpointerdown={dragStart}
      onclose={() => (app.win.open = false)}
      onmin={() => (app.win.minimized = true)}
      onzoom={() => (app.win.maximized = !app.win.maximized)}
    />
  {:else}
    <div class="caption" class:inactive={!app.connected} role="toolbar" tabindex="0" onpointerdown={dragStart}>
      <CatLogo compact />
      <span>Napster v2.0 BETA 10.3</span>
      <div class="caption-btns">
        <button class="caption-btn" title="Minimize" onpointerdown={(e) => e.stopPropagation()} onclick={() => (app.win.minimized = true)}>▬</button>
        <button class="caption-btn" title="Maximize" onpointerdown={(e) => e.stopPropagation()} onclick={() => (app.win.maximized = !app.win.maximized)}>
          {app.win.maximized ? '❐' : '□'}
        </button>
        <button class="caption-btn" title="Close" onpointerdown={(e) => e.stopPropagation()} onclick={() => (app.win.open = false)}>×</button>
      </div>
    </div>
  {/if}

  {#if app.theme === 'windows'}
    <div class="menubar">
      <button class:open={app.dialogs.menu === 'file'} onclick={() => toggleMenu('file')}>File</button>
      <button class:open={app.dialogs.menu === 'view'} onclick={() => toggleMenu('view')}>View</button>
      <button class:open={app.dialogs.menu === 'actions'} onclick={() => toggleMenu('actions')}>Actions</button>
      <button class:open={app.dialogs.menu === 'help'} onclick={() => toggleMenu('help')}>Help</button>
    </div>
    {#if app.dialogs.menu === 'file'}
      <AppMenus which="file" left="8px" top="44px" />
    {:else if app.dialogs.menu === 'view'}
      <AppMenus which="view" left="40px" top="44px" />
    {:else if app.dialogs.menu === 'actions'}
      <AppMenus which="actions" left="78px" top="44px" />
    {:else if app.dialogs.menu === 'help'}
      <AppMenus which="help" left="132px" top="44px" />
    {/if}
  {/if}

  <div class="toolbar groove">
    {#each tools as t (t.id)}
      <button
        class="tool"
        class:active={t.id !== 'help' && app.view === t.id}
        onclick={() => clickTool(t.id)}
        disabled={app.phase === 'setup' && t.id !== 'help' && t.id !== 'home'}
      >
        <NapIcon name={TOOL_ICONS[t.id]} size={32} />
        {t.label}
      </button>
    {/each}
    <div class="look">
      <CdnowButton />
      <ThemeSwitch />
    </div>
  </div>

  <AdBanner />

  <div class="workspace">
    {#if app.view === 'home'}
      <HomeView />
    {:else if app.view === 'chat'}
      <ChatView />
    {:else if app.view === 'library'}
      <LibraryView />
    {:else if app.view === 'search'}
      <SearchView />
    {:else if app.view === 'hotlist'}
      <HotlistView />
    {:else if app.view === 'discover'}
      <DiscoverView />
    {:else}
      <TransferView />
    {/if}
  </div>

  <div class="statusbar">
    <div style="flex: 1 1 280px">{app.status}</div>
    <div class="share" title={sharing}>{sharing}</div>
    <div>{app.connected ? 'Connected' : 'Offline'} · {app.nick}</div>
  </div>

  <Dialogs />

  {#if !app.win.maximized}
    <button type="button" tabindex="-1" class="grip n" aria-label="Resize top" onpointerdown={(e) => resizeStart('n', e)}></button>
    <button type="button" tabindex="-1" class="grip s" aria-label="Resize bottom" onpointerdown={(e) => resizeStart('s', e)}></button>
    <button type="button" tabindex="-1" class="grip e" aria-label="Resize right" onpointerdown={(e) => resizeStart('e', e)}></button>
    <button type="button" tabindex="-1" class="grip w" aria-label="Resize left" onpointerdown={(e) => resizeStart('w', e)}></button>
    <button type="button" tabindex="-1" class="grip ne" aria-label="Resize top-right" onpointerdown={(e) => resizeStart('ne', e)}></button>
    <button type="button" tabindex="-1" class="grip nw" aria-label="Resize top-left" onpointerdown={(e) => resizeStart('nw', e)}></button>
    <button type="button" tabindex="-1" class="grip se" aria-label="Resize bottom-right" onpointerdown={(e) => resizeStart('se', e)}></button>
    <button type="button" tabindex="-1" class="grip sw" aria-label="Resize bottom-left" onpointerdown={(e) => resizeStart('sw', e)}></button>
  {/if}
</section>

<style>
  .client {
    position: absolute;
    z-index: 5;
    min-width: 320px;
    min-height: 280px;
    overflow: visible;
  }
  .client.resizing {
    user-select: none;
  }
  .hidden {
    display: none;
  }
  .grip {
    position: absolute;
    padding: 0;
    margin: 0;
    border: 0;
    background: transparent;
    appearance: none;
    z-index: 30;
    touch-action: none;
  }
  .grip.n,
  .grip.s {
    left: 10px;
    right: 10px;
    height: 6px;
    cursor: ns-resize;
  }
  .grip.e,
  .grip.w {
    top: 10px;
    bottom: 10px;
    width: 6px;
    cursor: ew-resize;
  }
  .grip.n { top: 0; }
  .grip.s { bottom: 0; }
  .grip.e { right: 0; }
  .grip.w { left: 0; }
  .grip.ne,
  .grip.nw,
  .grip.se,
  .grip.sw {
    width: 14px;
    height: 14px;
  }
  .grip.ne { top: 0; right: 0; cursor: nesw-resize; }
  .grip.nw { top: 0; left: 0; cursor: nwse-resize; }
  .grip.se { bottom: 0; right: 0; cursor: nwse-resize; }
  .grip.sw { bottom: 0; left: 0; cursor: nesw-resize; }
  .workspace {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    margin: 0 3px;
    background: var(--face);
    box-shadow:
      inset 1px 1px 0 var(--sh),
      inset -1px -1px 0 var(--hl);
  }
  .look {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 8px;
    padding-right: 6px;
  }
  .share {
    flex: 1 1 260px;
    min-width: 0;
  }
</style>
