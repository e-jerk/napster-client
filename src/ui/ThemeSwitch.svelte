<script lang="ts">
  import { servedFromOpenNap } from '../lib/hub'
  import { app, setTheme } from '../lib/session.svelte'

  let { compact = false }: { compact?: boolean } = $props()
  const showChat = servedFromOpenNap() || app.hub === 'wss'

  function go(ui: 'chat' | 'win' | 'mac') {
    if (ui === 'chat') {
      location.href = '/'
      return
    }
    setTheme(ui === 'mac' ? 'mac' : 'windows')
    if (!showChat) return
    const next = ui === 'mac' ? '/?ui=mac' : '/?ui=win'
    if (`${location.pathname}${location.search}` !== next) history.replaceState(null, '', next)
  }
</script>

<div class="theme-switch" class:compact role="group" aria-label="Interface">
  {#if showChat}
    <a href="/" onpointerdown={(e) => e.stopPropagation()}>OpenNAP</a>
  {/if}
  <button
    type="button"
    class:on={app.theme === 'windows'}
    onpointerdown={(e) => {
      e.stopPropagation()
      go('win')
    }}
  >
    Napster
  </button>
  <button
    type="button"
    class:on={app.theme === 'mac'}
    onpointerdown={(e) => {
      e.stopPropagation()
      go('mac')
    }}
  >
    Mac
  </button>
</div>

<style>
  .theme-switch {
    display: flex;
    position: relative;
    z-index: 23;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid var(--sh);
    background: var(--window);
    pointer-events: auto;
  }

  .theme-switch button,
  .theme-switch a {
    padding: 2px 9px;
    font-size: 11px;
    background: transparent;
    color: inherit;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
  }

  .theme-switch.compact button,
  .theme-switch.compact a {
    padding: 1px 7px;
    font-size: 11px;
  }

  .theme-switch button.on {
    background: var(--sel);
    color: var(--sel-text);
  }
</style>
