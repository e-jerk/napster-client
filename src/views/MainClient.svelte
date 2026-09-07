<script lang="ts">
  import { client } from '../lib/network'
  import { app, setTheme } from '../lib/session.svelte'
  import type { AppView } from '../lib/types'
  import CatLogo from '../ui/CatLogo.svelte'
  import ThemeSwitch from '../ui/ThemeSwitch.svelte'
  import TitleBar from '../ui/TitleBar.svelte'
  import ChatView from './ChatView.svelte'
  import Dialogs from './Dialogs.svelte'
  import HotlistView from './HotlistView.svelte'
  import LibraryView from './LibraryView.svelte'
  import SearchView from './SearchView.svelte'
  import TransferView from './TransferView.svelte'

  const tools: { id: AppView; label: string }[] = [
    { id: 'chat', label: 'Chat' },
    { id: 'library', label: 'Library' },
    { id: 'search', label: 'Search' },
    { id: 'hotlist', label: 'Hot List' },
    { id: 'transfer', label: 'Transfer' },
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

  function onlineOnly(): boolean {
    return app.connected
  }

  const style = $derived.by(() => {
    if (!app.win.maximized) {
      return `left:${app.win.x}px;top:${app.win.y}px;width:${app.win.w}px;height:${app.win.h}px;`
    }
    if (app.theme === 'mac') return 'inset: 28px 10px 76px 10px; width: auto; height: auto;'
    return 'inset: 8px 8px 38px 8px; width: auto; height: auto;'
  })
</script>

<svelte:window onpointermove={dragMove} onpointerup={dragEnd} />

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
      <div class="menu-pop" style="left: 8px; top: 44px">
        <button onclick={() => { app.dialogs.menu = null; if (app.connected) client.disconnect(); app.phase = 'setup' }}>Connect…</button>
        <button disabled={!app.connected} onclick={() => { app.dialogs.menu = null; client.disconnect() }}>Disconnect</button>
        <div class="sep"></div>
        <button onclick={() => { app.dialogs.menu = null; app.win.open = false }}>Exit</button>
      </div>
    {:else if app.dialogs.menu === 'view'}
      <div class="menu-pop" style="left: 40px; top: 44px">
        {#each tools as t (t.id)}
          <button onclick={() => { app.view = t.id; app.dialogs.menu = null }}>{t.label}</button>
        {/each}
        <div class="sep"></div>
        <button onclick={() => setTheme('windows')}>Windows 98 look</button>
        <button onclick={() => setTheme('mac')}>Mac OS X look</button>
      </div>
    {:else if app.dialogs.menu === 'actions'}
      <div class="menu-pop" style="left: 78px; top: 44px">
        <button disabled={!onlineOnly()} onclick={() => { app.view = 'search'; app.dialogs.menu = null }}>Find…</button>
        <button
          disabled={!app.search.selected}
          onclick={() => {
            const hit = app.search.results.find((r) => r.id === app.search.selected)
            if (hit) client.download(hit)
            app.dialogs.menu = null
          }}>Download</button
        >
        <button disabled={!onlineOnly()} onclick={() => { app.dialogs.join = true; app.dialogs.menu = null }}>Join Channel…</button>
        <div class="sep"></div>
        <button disabled={!onlineOnly()} onclick={() => { app.dialogs.bridge = true; app.dialogs.menu = null }}>TCP Bridge…</button>
      </div>
    {:else if app.dialogs.menu === 'help'}
      <div class="menu-pop" style="left: 132px; top: 44px">
        <button onclick={() => { app.dialogs.about = true; app.dialogs.menu = null }}>About Napster</button>
        <button onclick={() => { window.open('https://archive.org/details/napv2b10-3', '_blank'); app.dialogs.menu = null }}>Original EXE on archive.org</button>
        {#if app.hub === 'wss'}
          <button onclick={() => { window.location.href = '/'; app.dialogs.menu = null }}>OpenNAP</button>
          <button onclick={() => { window.location.href = '/?ui=win'; app.dialogs.menu = null }}>Napster</button>
          <button onclick={() => { window.location.href = '/?ui=mac'; app.dialogs.menu = null }}>Mac</button>
        {/if}
      </div>
    {/if}
  {/if}

  <div class="toolbar groove">
    {#each tools as t (t.id)}
      <button class="tool" class:active={app.view === t.id} onclick={() => (app.view = t.id)} disabled={app.phase === 'setup'}>
        {#if t.id === 'chat'}
          <svg viewBox="0 0 32 32"><rect x="2" y="4" width="18" height="12" fill="#fff" stroke="#000" /><rect x="10" y="14" width="18" height="12" fill="#c6e4ff" stroke="#000" /></svg>
        {:else if t.id === 'library'}
          <svg viewBox="0 0 32 32"><path d="M4 10h10l2 3h12v13H4z" fill="#f4d060" stroke="#000" /><path d="M12 18c6 0 8 4 8 4s-1-8-8-8-8 8-8 8 2-4 8-4z" fill="#1e4ea8" /></svg>
        {:else if t.id === 'search'}
          <svg viewBox="0 0 32 32"><circle cx="12" cy="14" r="6" fill="none" stroke="#000" stroke-width="2" /><circle cx="20" cy="14" r="6" fill="none" stroke="#000" stroke-width="2" /></svg>
        {:else if t.id === 'hotlist'}
          <svg viewBox="0 0 32 32"><path d="M16 4c6 8 10 12 10 18a10 10 0 1 1-20 0c0-6 4-10 10-18z" fill="#e67a00" stroke="#000" /></svg>
        {:else}
          <svg viewBox="0 0 32 32"><path d="M6 10h8V6l8 8-8 8v-4H6z" fill="#2f7d32" stroke="#000" /><path d="M26 22h-8v4l-8-8 8-8v4h8z" fill="#1565c0" stroke="#000" /></svg>
        {/if}
        {t.label}
      </button>
    {/each}
    <div class="look">
      <ThemeSwitch />
    </div>
  </div>

  <div class="workspace">
    {#if app.view === 'chat'}
      <ChatView />
    {:else if app.view === 'library'}
      <LibraryView />
    {:else if app.view === 'search'}
      <SearchView />
    {:else if app.view === 'hotlist'}
      <HotlistView />
    {:else}
      <TransferView />
    {/if}
  </div>

  <div class="statusbar">
    <div style="flex: 1 1 220px">{app.status}</div>
    <div>{app.stats.files.toLocaleString()} files</div>
    <div>{Number.isFinite(app.stats.gigs) ? app.stats.gigs.toFixed(1) : '0.0'} GB</div>
    <div>{app.stats.users} users</div>
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
    padding-right: 6px;
  }
</style>
