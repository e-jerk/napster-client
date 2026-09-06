<script lang="ts">
  import { app } from '../lib/session.svelte'
  import MainClient from './MainClient.svelte'

  let clock = $state(
    new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
  )

  $effect(() => {
    const id = setInterval(() => {
      clock = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    }, 10000)
    return () => clearInterval(id)
  })

  function openNapster() {
    app.win.open = true
    app.win.minimized = false
    app.dialogs.start = false
    if (app.phase === 'online' && !app.connected) app.phase = 'setup'
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="desk"
  onclick={(e) => {
    const t = e.target as HTMLElement
    if (!t.closest('.start-btn, .start-menu')) app.dialogs.start = false
    if (!t.closest('.menubar, .menu-pop')) app.dialogs.menu = null
  }}
>
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
      <svg viewBox="0 0 32 32">
        <rect width="32" height="32" rx="3" fill="#000080" />
        <ellipse cx="16" cy="18" rx="9" ry="8" fill="#d9a066" />
        <circle cx="12.5" cy="17" r="2" fill="#1a7a2a" />
        <circle cx="19.5" cy="17" r="2" fill="#1a7a2a" />
        <path d="M6 14c0-3 2-5 5-4 3-4 10-4 13 0 3-1 5 1 5 4v3c-1 2-3 3-5 3h-1v-5c0-4-3-7-6-7s-6 3-6 7v5H11c-2 0-4-1-5-3v-3z" fill="#1e4ea8" />
      </svg>
    </div>
    Napster
  </button>

  <MainClient />

  {#if app.dialogs.start}
    <div class="menu-pop start-menu">
      <div class="banner">Windows 98</div>
      <button onclick={openNapster}>Napster v2.0 BETA 10.3</button>
      <div class="sep"></div>
      <button onclick={() => { app.dialogs.about = true; app.dialogs.start = false }}>About Napster</button>
      <button
        onclick={() => {
          window.open('https://archive.org/details/napv2b10-3', '_blank')
          app.dialogs.start = false
        }}>archive.org client</button
      >
      <div class="sep"></div>
      <button
        onclick={() => {
          app.dialogs.start = false
          app.status = "It's now safe to close this tab."
        }}>Shut Down…</button
      >
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
    <button
      class="btn task-btn"
      class:pressed={app.win.open && !app.win.minimized}
      onclick={openNapster}
    >
      Napster v2.0 BETA 10.3
    </button>
    <div class="clock">{clock}</div>
  </div>
</div>

<style>
  .desk {
    position: relative;
    height: 100%;
    background: var(--desktop);
    overflow: hidden;
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
    grid-row: 1 / span 8;
    background: linear-gradient(#000080, #1084d0);
    color: #fff;
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    font-weight: 700;
    padding: 8px 2px;
    letter-spacing: 1px;
  }
  .start-menu button,
  .start-menu .sep {
    grid-column: 2;
  }
</style>
