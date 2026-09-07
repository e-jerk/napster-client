<script lang="ts">
  import { app } from '../lib/session.svelte'
  import CatLogo from './CatLogo.svelte'
  import MacTitleBar from './MacTitleBar.svelte'

  let {
    title,
    inactive = false,
    buttons = 'close',
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

{#if app.theme === 'mac'}
  <MacTitleBar {title} {inactive} {buttons} {onclose} {onmin} {onzoom} {onpointerdown} />
{:else}
  <div class="caption" class:inactive role="toolbar" tabindex="0" {onpointerdown}>
    <CatLogo compact />
    <span>{title}</span>
    {#if onclose || onmin || onzoom}
      <div class="caption-btns">
        {#if buttons === 'all'}
          <button
            class="caption-btn"
            title="Minimize"
            onpointerdown={(e) => e.stopPropagation()}
            onclick={() => onmin?.()}>▬</button
          >
          <button
            class="caption-btn"
            title="Maximize"
            onpointerdown={(e) => e.stopPropagation()}
            onclick={() => onzoom?.()}>{app.win.maximized ? '❐' : '□'}</button
          >
        {/if}
        {#if onclose}
          <button
            class="caption-btn"
            title="Close"
            onpointerdown={(e) => e.stopPropagation()}
            onclick={() => onclose?.()}>×</button
          >
        {/if}
      </div>
    {/if}
  </div>
{/if}
