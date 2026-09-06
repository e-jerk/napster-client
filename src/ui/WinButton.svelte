<script lang="ts">
  let {
    label,
    onclick,
    disabled = false,
    small = false,
    type = 'button',
  }: {
    label: string
    onclick?: (e: MouseEvent) => void
    disabled?: boolean
    small?: boolean
    type?: 'button' | 'submit'
  } = $props()
</script>

<button class="btn" class:small {type} {disabled} {onclick}>{@html label}</button>
