<script lang="ts">
  import { iconUrl } from '../lib/icons'

  let { compact = false }: { compact?: boolean } = $props()
</script>

{#if compact}
  <img class="logo compact" src={iconUrl('app-16')} width="16" height="16" alt="" draggable="false" />
{:else}
  <img class="logo wordmark" src={iconUrl('logo')} alt="napster" draggable="false" />
{/if}

<style>
  .logo {
    display: block;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    user-select: none;
  }
  .wordmark {
    width: min(320px, 100%);
    height: auto;
    margin: 0 auto 8px;
  }
</style>
