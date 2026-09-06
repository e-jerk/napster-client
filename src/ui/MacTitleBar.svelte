<script lang="ts">
  let {
    title,
    inactive = false,
    buttons = 'all',
    onclose,
    onmin,
    onzoom,
    onpointerdown,
  }: {
    title: string
    inactive?: boolean
    buttons?: 'all' | 'close'
    onclose?: () => void
    onmin?: () => void
    onzoom?: () => void
    onpointerdown?: (e: PointerEvent) => void
  } = $props()
</script>

<div
  class="caption mac-title"
  class:inactive
  role="toolbar"
  tabindex="0"
  {onpointerdown}
>
  <div class="lights">
    <button
      class="tl close"
      title="Close"
      aria-label="Close"
      onpointerdown={(e) => e.stopPropagation()}
      onclick={() => onclose?.()}
    >
      <span>×</span>
    </button>
    {#if buttons === 'all'}
      <button
        class="tl min"
        title="Minimize"
        aria-label="Minimize"
        onpointerdown={(e) => e.stopPropagation()}
        onclick={() => onmin?.()}
      >
        <span>−</span>
      </button>
      <button
        class="tl zoom"
        title="Zoom"
        aria-label="Zoom"
        onpointerdown={(e) => e.stopPropagation()}
        onclick={() => onzoom?.()}
      >
        <span>+</span>
      </button>
    {:else}
      <span class="tl dummy"></span>
      <span class="tl dummy"></span>
    {/if}
  </div>
  <div class="mac-title-text">{title}</div>
</div>
