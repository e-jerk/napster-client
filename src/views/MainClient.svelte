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

  let dragging = $state(false)
  let dx = 0
  let dy = 0

  function dragStart(e: PointerEvent) {
    if (app.win.maximized) return
    dragging = true
    dx = e.clientX - app.win.x
    dy = e.clientY - app.win.y
  }

  function dragMove(e: PointerEvent) {
    if (!dragging) return
    app.win.x = Math.max(0, e.clientX - dx)
    app.win.y = Math.max(app.theme === 'mac' ? 24 : 0, e.clientY - dy)
  }

  function dragEnd() {
    dragging = false
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

<svelte:window onpointermove={dragMove} onpointerup={dragEnd} onkeydown={onKey} />

<section class="window client" class:hidden={app.win.minimized || !app.win.open} style={style}>
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
</section>

<style>
  .client {
    position: absolute;
    z-index: 5;
    min-width: 320px;
    min-height: 280px;
  }
  .hidden {
    display: none;
  }
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
