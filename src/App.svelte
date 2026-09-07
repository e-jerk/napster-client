<script lang="ts">
  import { onMount } from 'svelte'
  import { uiFromLocation } from './lib/hub'
  import { startNetwork } from './lib/network'
  import { app, setUi } from './lib/session.svelte'
  import Desktop from './views/Desktop.svelte'
  import OpenNapView from './views/OpenNapView.svelte'

  let bootError = $state('')

  onMount(() => {
    setUi(uiFromLocation(), 'replace')
    const onPop = () => setUi(uiFromLocation(), 'none')
    window.addEventListener('popstate', onPop)
    void startNetwork().catch((err: unknown) => {
      bootError = err instanceof Error ? err.message : 'Failed to start the in-browser hub'
    })
    return () => window.removeEventListener('popstate', onPop)
  })
</script>

{#if bootError}
  <div class="boot-err">{bootError}</div>
{:else if app.ui === 'chat'}
  <OpenNapView />
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
