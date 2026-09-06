<script lang="ts">
  type Opt = { value: string | number; label: string }
  let {
    value = $bindable<string | number>(''),
    options,
    width,
    id,
  }: {
    value?: string | number
    options: Opt[]
    width?: string
    id?: string
  } = $props()
</script>

<select
  class="field"
  {id}
  value={String(value)}
  style:width
  onchange={(e) => {
    const next = e.currentTarget.value
    value = typeof value === 'number' ? Number(next) : next
  }}
>
  {#each options as opt (String(opt.value))}
    <option value={opt.value}>{opt.label}</option>
  {/each}
</select>
