<script lang="ts">
  import { cmdAbout, cmdConnect, cmdDisconnect, cmdExit, cmdView } from '../lib/commands'
  import { iconUrl } from '../lib/icons'
  import { app, setTheme } from '../lib/session.svelte'
  import AppMenus from '../ui/AppMenus.svelte'
  import ThemeSwitch from '../ui/ThemeSwitch.svelte'
  import MainClient from './MainClient.svelte'

  let clock = $state(formatClock())

  function formatClock() {
    return new Date().toLocaleString([], {
      weekday: app.theme === 'mac' ? 'short' : undefined,
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  $effect(() => {
    app.theme
    clock = formatClock()
    const id = setInterval(() => {
      clock = formatClock()
    }, 10000)
    return () => clearInterval(id)
  })

  function openNapster() {
    app.win.open = true
    app.win.minimized = false
    app.dialogs.start = false
    app.dialogs.menu = null
    if (app.phase === 'online' && !app.connected) app.phase = 'login'
  }

  function toggleMenu(name: string) {
    app.dialogs.menu = app.dialogs.menu === name ? null : name
    app.dialogs.start = false
  }

  function closeMenus() {
    app.dialogs.menu = null
    app.dialogs.start = false
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="desk"
  class:mac={app.theme === 'mac'}
  class:win={app.theme === 'windows'}
  onclick={(e) => {
    const t = e.target as HTMLElement
    if (!t.closest('.os-menubar, .menubar, .menu-pop, .dock, .start-btn, .taskbar')) closeMenus()
  }}
>
  {#if app.theme === 'mac'}
    <header class="os-menubar">
      <button
        class="apple"
        class:open={app.dialogs.start}
        aria-label="Apple menu"
        onclick={() => {
          app.dialogs.start = !app.dialogs.start
          app.dialogs.menu = null
        }}
      >
        <svg viewBox="0 0 17 20" width="12" height="14">
          <path
            fill="currentColor"
            d="M13.6 10.6c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9s-1.9-1-3.2-.9c-1.6 0-3.1 1-4 2.4-1.7 2.9-.4 7.3 1.2 9.6.8 1.2 1.8 2.5 3 2.4 1.2-.1 1.7-.8 3.1-.8s1.9.8 3.2.7c1.4 0 2.2-1.2 3-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.3-.9-2.5-3.8zM11.4 3.3c.6-.8 1.1-1.9.9-3-1 .1-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.2-.5 2.9-1.4z"
          />
        </svg>
      </button>
      <button class="app-name" class:open={app.dialogs.menu === 'app'} onclick={() => toggleMenu('app')}>Napster</button>
      <button class:open={app.dialogs.menu === 'file'} onclick={() => toggleMenu('file')}>File</button>
      <button class:open={app.dialogs.menu === 'view'} onclick={() => toggleMenu('view')}>View</button>
      <button class:open={app.dialogs.menu === 'actions'} onclick={() => toggleMenu('actions')}>Actions</button>
      <button class:open={app.dialogs.menu === 'window'} onclick={() => toggleMenu('window')}>Window</button>
      <button class:open={app.dialogs.menu === 'help'} onclick={() => toggleMenu('help')}>Help</button>
      <div class="status-items">
        <ThemeSwitch compact />
        <span class="sig">{app.connected ? '100%' : 'AirPort'}</span>
        <span class="clock">{clock}</span>
      </div>
    </header>

    {#if app.dialogs.start}
      <div class="menu-pop apple-menu">
        <button onclick={() => { app.dialogs.about = true; closeMenus() }}>About This Mac</button>
        <button onclick={() => { app.dialogs.about = true; closeMenus() }}>About Napster</button>
        <div class="sep"></div>
        <button onclick={() => setTheme('windows')}>Windows 98 look</button>
        <button onclick={() => setTheme('mac')}>Mac OS X look</button>
        <div class="sep"></div>
        <button onclick={() => { window.open('https://archive.org/details/napv2b10-3', '_blank'); closeMenus() }}>archive.org client</button>
        <div class="sep"></div>
        <button onclick={() => { closeMenus(); app.win.minimized = true }}>Sleep</button>
        <button onclick={() => { closeMenus(); app.status = 'You can close the tab whenever you like.' }}>Shut Down…</button>
      </div>
    {:else if app.dialogs.menu === 'app'}
      <div class="menu-pop" style="left: 28px; top: 24px">
        <button onclick={() => cmdAbout()}>About Napster</button>
        <div class="sep"></div>
        <button onclick={() => cmdConnect()}>Connect…</button>
        <button disabled={!app.connected} onclick={() => cmdDisconnect()}>Disconnect</button>
        <div class="sep"></div>
        <button onclick={() => cmdExit()}>Quit Napster</button>
      </div>
    {:else if app.dialogs.menu === 'file'}
      <AppMenus which="file" left="92px" top="24px" />
    {:else if app.dialogs.menu === 'view'}
      <AppMenus which="view" left="124px" top="24px" />
    {:else if app.dialogs.menu === 'actions'}
      <AppMenus which="actions" left="164px" top="24px" />
    {:else if app.dialogs.menu === 'window'}
      <div class="menu-pop" style="left: 224px; top: 24px">
        <button onclick={() => { openNapster(); closeMenus() }}>Napster</button>
        <button onclick={() => { app.win.maximized = !app.win.maximized; closeMenus() }}>{app.win.maximized ? 'Restore' : 'Zoom'}</button>
      </div>
    {:else if app.dialogs.menu === 'help'}
      <AppMenus which="help" left="280px" top="24px" />
    {/if}

    <button class="desktop-icon hd" onclick={() => (app.status = 'Macintosh HD — 6.4 GB available')}>
      <div class="glyph">
        <svg viewBox="0 0 48 48">
          <rect x="6" y="12" width="36" height="24" rx="4" fill="#d0d6de" stroke="#5c6570" />
          <rect x="10" y="16" width="28" height="10" rx="2" fill="#c5d0dc" />
          <circle cx="33" cy="30" r="2" fill="#4d5560" />
        </svg>
      </div>
      Macintosh HD
    </button>
    <button class="desktop-icon nap" ondblclick={openNapster}>
      <div class="glyph">
        <img src={iconUrl('app-32')} width="32" height="32" alt="" draggable="false" />
      </div>
      Napster
    </button>
  {:else}
    <button class="desktop-icon" style="position:absolute;left:16px;top:16px">
      <div class="glyph">
        <svg viewBox="0 0 32 32">
          <rect x="4" y="6" width="24" height="16" fill="#008080" stroke="#fff" />
          <rect x="10" y="22" width="12" height="3" fill="#c0c0c0" />
          <rect x="6" y="25" width="20" height="2" fill="#c0c0c0" />
        </svg>
      </div>
      My Computer
    </button>
    <button class="desktop-icon" style="position:absolute;left:16px;top:96px">
      <div class="glyph">
        <svg viewBox="0 0 32 32">
          <rect x="8" y="6" width="16" height="20" fill="#9aa" stroke="#fff" />
          <rect x="11" y="10" width="10" height="8" fill="#cfe" />
        </svg>
      </div>
      Recycle Bin
    </button>
    <button class="desktop-icon" style="position:absolute;left:16px;top:176px" ondblclick={openNapster}>
      <div class="glyph">
        <img src={iconUrl('app-32')} width="32" height="32" alt="" draggable="false" />
      </div>
      Napster
    </button>

    {#if app.dialogs.start}
      <div class="menu-pop start-menu">
        <div class="banner">Windows 98</div>
        <button onclick={openNapster}>Napster v2.0 BETA 10.3</button>
        <div class="sep"></div>
        <button onclick={() => setTheme('windows')}>Windows 98 look</button>
        <button onclick={() => setTheme('mac')}>Mac OS X look</button>
        <div class="sep"></div>
        <button onclick={() => { app.dialogs.about = true; closeMenus() }}>About Napster</button>
        <button onclick={() => { window.open('https://archive.org/details/napv2b10-3', '_blank'); closeMenus() }}>archive.org client</button>
        <div class="sep"></div>
        <button onclick={() => { closeMenus(); app.status = "It's now safe to close this tab." }}>Shut Down…</button>
      </div>
    {/if}

    <div class="taskbar">
      <button class="btn start-btn" class:pressed={app.dialogs.start} onclick={() => (app.dialogs.start = !app.dialogs.start)}>
        <svg width="16" height="16" viewBox="0 0 16 16">
          <rect width="16" height="16" fill="#000080" />
          <path d="M3 3h4v4H3z" fill="#ff0" />
          <path d="M9 3h4v4H9z" fill="#0f0" />
          <path d="M3 9h4v4H3z" fill="#f00" />
          <path d="M9 9h4v4H9z" fill="#00f" />
        </svg>
        Start
      </button>
      <button class="btn task-btn" class:pressed={app.win.open && !app.win.minimized} onclick={openNapster}>
        <img class="task-ico" src={iconUrl('app-16')} width="16" height="16" alt="" draggable="false" />
        Napster v2.0 BETA 10.3
      </button>
      <div class="tray">
        <ThemeSwitch compact />
        <div class="clock">{clock}</div>
      </div>
    </div>
  {/if}

  <MainClient />

  {#if app.theme === 'mac'}
    <nav class="dock" aria-label="Dock">
      <button class="dock-item" title="Finder" onclick={() => (app.status = 'Finder — Macintosh HD')}>☺</button>
      <button class="dock-item running" title="Napster" onclick={openNapster}>
        <img src={iconUrl('app-32')} width="32" height="32" alt="Napster" draggable="false" />
      </button>
      <button class="dock-item" title="Search" onclick={() => { openNapster(); cmdView('search') }}>⌕</button>
      <button class="dock-item" title="Chat" onclick={() => { openNapster(); cmdView('chat') }}>💬</button>
      <div class="dock-sep"></div>
      <button class="dock-item" title="Trash" onclick={() => (app.status = 'Trash is empty.')}>🗑</button>
    </nav>
  {/if}
</div>

<style>
  .desk {
    position: relative;
    height: 100%;
    overflow: hidden;
    background: var(--desktop);
  }

  .desk.mac {
    background:
      radial-gradient(ellipse at 20% 0%, #8fd4f0 0%, transparent 45%),
      radial-gradient(ellipse at 90% 110%, #0b3b73 0%, transparent 50%),
      linear-gradient(180deg, #5eb0d8 0%, #2a6eab 42%, #163e72 100%);
  }

  .os-menubar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 60;
    height: var(--menubar-h);
    display: flex;
    align-items: center;
    padding: 0 10px 0 8px;
    gap: 1px;
    background: linear-gradient(#fbfbfb, #d8d8d8);
    border-bottom: 1px solid #6e6e6e;
    font-size: 13px;
  }

  .os-menubar > button {
    padding: 1px 8px;
    border-radius: 3px;
    line-height: 18px;
  }

  .os-menubar > button:hover,
  .os-menubar > button.open {
    background: #3875d7;
    color: #fff;
  }

  .os-menubar .app-name {
    font-weight: 700;
  }

  .apple {
    display: grid;
    place-items: center;
    width: 22px;
    padding: 0;
  }

  .status-items {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
  }

  .apple-menu {
    position: absolute;
    left: 4px;
    top: 24px;
    z-index: 80;
  }

  .hd {
    position: absolute;
    right: 18px;
    top: 40px;
  }

  .nap {
    position: absolute;
    right: 18px;
    top: 128px;
  }

  .taskbar {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 50;
  }

  .start-menu {
    position: absolute;
    left: 4px;
    bottom: 32px;
    z-index: 51;
    min-width: 220px;
    display: grid;
    grid-template-columns: 22px 1fr;
  }

  .banner {
    grid-row: 1 / span 12;
    background: linear-gradient(#000080, #1084d0);
    color: #fff;
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    font-weight: 700;
    padding: 8px 2px;
  }

  .start-menu button,
  .start-menu .sep {
    grid-column: 2;
  }

  .tray {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .tray .clock {
    margin-left: 0;
  }

  .dock {
    position: absolute;
    left: 50%;
    bottom: 6px;
    transform: translateX(-50%);
    z-index: 55;
    display: flex;
    align-items: flex-end;
    gap: 8px;
    padding: 6px 12px 8px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.38), rgba(180, 190, 205, 0.28));
    border: 1px solid rgba(255, 255, 255, 0.45);
    border-radius: 16px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
    backdrop-filter: blur(10px);
    font-size: 22px;
  }

  .dock-item {
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    transition: transform 0.12s ease;
  }

  .dock-item:hover {
    transform: translateY(-6px) scale(1.12);
  }

  .dock-sep {
    width: 1px;
    height: 36px;
    background: rgba(0, 0, 0, 0.25);
  }

  @media (max-width: 720px) {
    .status-items .sig {
      display: none;
    }
  }
</style>
