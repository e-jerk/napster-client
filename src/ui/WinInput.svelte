<script lang="ts">
  let {
    value = $bindable(''),
    placeholder = '',
    type = 'text',
    id,
    onenter,
    width,
  }: {
    value?: string
    placeholder?: string
    type?: string
    id?: string
    onenter?: () => void
    width?: string
  } = $props()
</script>

<input
  class="field"
  {id}
  {type}
  {placeholder}
  bind:value
  style:width
  onkeydown={(e) => {
    if (e.key === 'Enter') onenter?.()
  }}
/>
