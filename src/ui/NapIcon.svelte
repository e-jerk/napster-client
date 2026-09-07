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
  style={`--nap-size:${size}px`}
  {alt}
  title={title}
  draggable="false"
/>

<style>
  .nap-icon {
    display: block;
    width: var(--nap-size, 16px);
    height: var(--nap-size, 16px);
    flex: 0 0 var(--nap-size, 16px);
    object-fit: fill;
    object-position: center;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    user-select: none;
  }
</style>
