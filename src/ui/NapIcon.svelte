<script lang="ts">
  import { iconUrl } from '../lib/icons'

  let {
    name,
    size = 16,
    alt = '',
    title,
  }: {
    name: string
    size?: number
    alt?: string
    title?: string
  } = $props()
</script>

<img
  class="nap-icon"
  src={iconUrl(name)}
  width={size}
  height={size}
  {alt}
  title={title}
  draggable="false"
/>

<style>
  .nap-icon {
    display: block;
    flex: 0 0 auto;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    user-select: none;
  }
</style>
