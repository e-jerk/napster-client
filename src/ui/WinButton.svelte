<script lang="ts">
  let {
    label,
    onclick,
    disabled = false,
    small = false,
    primary = false,
    type = 'button',
  }: {
    label: string
    onclick?: (e: MouseEvent) => void
    disabled?: boolean
    small?: boolean
    primary?: boolean
    type?: 'button' | 'submit'
  } = $props()
</script>

<button class="btn" class:small class:primary {type} {disabled} {onclick}>{@html label}</button>
