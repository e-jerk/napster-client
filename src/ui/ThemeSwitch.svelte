<script lang="ts">
  import { app, setTheme } from '../lib/session.svelte'

  let { compact = false }: { compact?: boolean } = $props()
</script>

<div class="theme-switch" class:compact role="group" aria-label="Window style">
  <button type="button" class:on={app.theme === 'windows'} onclick={() => setTheme('windows')}>Windows</button>
  <button type="button" class:on={app.theme === 'mac'} onclick={() => setTheme('mac')}>Mac</button>
</div>

<style>
  .theme-switch {
    display: flex;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid var(--sh);
    background: var(--window);
  }

  .theme-switch button {
    padding: 2px 9px;
    font-size: 11px;
    background: transparent;
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
