<script lang="ts">
  import { servedFromOpenNap } from '../lib/hub'
  import { app, setUi } from '../lib/session.svelte'

  let { compact = false }: { compact?: boolean } = $props()
  const showChat = servedFromOpenNap() || app.hub === 'wss'
</script>

<div class="theme-switch" class:compact role="group" aria-label="Interface">
  {#if showChat}
    <button
      type="button"
      class:on={app.ui === 'chat'}
      onpointerdown={(e) => {
        e.stopPropagation()
        setUi('chat')
      }}
    >
      OpenNAP
    </button>
  {/if}
  <button
    type="button"
    class:on={app.ui === 'win'}
    onpointerdown={(e) => {
      e.stopPropagation()
      setUi('win')
    }}
  >
    Win98
  </button>
  <button
    type="button"
    class:on={app.ui === 'mac'}
    onpointerdown={(e) => {
      e.stopPropagation()
      setUi('mac')
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

  .theme-switch button {
    padding: 2px 9px;
    font-size: 11px;
    background: transparent;
    color: inherit;
  }

  .theme-switch.compact button {
    padding: 1px 7px;
    font-size: 11px;
  }

  .theme-switch button.on {
    background: var(--sel);
    color: var(--sel-text);
  }
</style>
