<script lang="ts">
  import { onMount } from 'svelte'
  import { networkReady } from './lib/network'
  import { app } from './lib/session.svelte'
  import Desktop from './views/Desktop.svelte'

  let ready = $state(false)
  let bootError = $state('')

  onMount(() => {
    void networkReady
      .then(() => {
        ready = true
      })
      .catch((err: unknown) => {
        bootError = err instanceof Error ? err.message : 'Failed to start the in-browser hub'
      })
  })

</script>

{#if bootError}
  <div class="boot-err">{bootError}</div>
{:else if !ready}
  <div class="boot">{app.hub === 'wss' ? 'Starting Napster…' : 'Starting napster.local…'}</div>
{:else}
  <div class="fill" data-theme={app.theme}>
    <Desktop />
  </div>
{/if}

<style>
  .fill,
  .boot,
  .boot-err {
    height: 100%;
  }
  .boot,
  .boot-err {
    display: grid;
    place-items: center;
    background: #008080;
    color: #fff;
    font: 12px/1.25 Tahoma, 'MS Sans Serif', sans-serif;
  }
  .boot-err {
    color: #fff0c0;
    padding: 24px;
  }
</style>
