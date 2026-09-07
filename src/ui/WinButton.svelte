<script lang="ts">
  import NapIcon from './NapIcon.svelte'

  let {
    label,
    onclick,
    disabled = false,
    small = false,
    primary = false,
    type = 'button',
    icon,
  }: {
    label: string
    onclick?: (e: MouseEvent) => void
    disabled?: boolean
    small?: boolean
    primary?: boolean
    type?: 'button' | 'submit'
    icon?: string
  } = $props()
</script>

<button class="btn" class:small class:primary class:has-icon={!!icon} {type} {disabled} {onclick}>
  {#if icon}
    <NapIcon name={icon} size={small ? 12 : 16} />
  {/if}
  {@html label}
</button>
