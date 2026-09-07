<script lang="ts">
  import { onMount } from 'svelte'
  import { startNetwork } from './lib/network'
  import { app } from './lib/session.svelte'
  import Desktop from './views/Desktop.svelte'

  let bootError = $state('')

  onMount(() => {
    void startNetwork().catch((err: unknown) => {
      bootError = err instanceof Error ? err.message : 'Failed to start the in-browser hub'
    })
  })
</script>

{#if bootError}
  <div class="boot-err">{bootError}</div>
{:else}
  <div class="fill" data-theme={app.theme}>
    <Desktop />
  </div>
{/if}

<style>
  .fill,
  .boot-err {
    height: 100%;
  }
  .boot-err {
    display: grid;
    place-items: center;
    background: #008080;
    color: #fff0c0;
    font: 12px/1.25 Tahoma, 'MS Sans Serif', sans-serif;
    padding: 24px;
  }
</style>
