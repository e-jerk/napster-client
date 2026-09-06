<script lang="ts">
  export type Column = {
    key: string
    label: string
    width?: string
    align?: 'left' | 'right'
  }

  let {
    columns,
    rows,
    selected = $bindable<string | null>(null),
    empty = 'Nothing to display.',
    ondblclick,
    oncontext,
  }: {
    columns: Column[]
    rows: { id: string; values: string[] }[]
    selected?: string | null
    empty?: string
    ondblclick?: (id: string) => void
    oncontext?: (id: string, e: MouseEvent) => void
  } = $props()

  let sort = $state(0)
  let asc = $state(true)

  const sorted = $derived.by(() => {
    const copy = [...rows]
    copy.sort((a, b) => {
      const av = a.values[sort] ?? ''
      const bv = b.values[sort] ?? ''
      const an = Number(av.replace(/[^\d.-]/g, ''))
      const bn = Number(bv.replace(/[^\d.-]/g, ''))
      if (!Number.isNaN(an) && !Number.isNaN(bn) && av !== '' && bv !== '') {
        return asc ? an - bn : bn - an
      }
      return asc ? av.localeCompare(bv) : bv.localeCompare(av)
    })
    return copy
  })

  function header(i: number) {
    if (sort === i) asc = !asc
    else {
      sort = i
      asc = true
    }
  }
</script>

<div class="listview">
  <table>
    <thead>
      <tr>
        {#each columns as col, i (col.key)}
          <th
            style:width={col.width}
            style:text-align={col.align ?? 'left'}
            onclick={() => header(i)}
          >
            {col.label}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each sorted as row (row.id)}
        <tr
          class:sel={selected === row.id}
          onclick={() => (selected = row.id)}
          ondblclick={() => ondblclick?.(row.id)}
          oncontextmenu={(e) => {
            e.preventDefault()
            selected = row.id
            oncontext?.(row.id, e)
          }}
        >
          {#each row.values as cell, i (columns[i]?.key ?? i)}
            <td style:text-align={columns[i]?.align ?? 'left'}>{cell}</td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
  {#if !rows.length}
    <div class="empty-hint">{empty}</div>
  {/if}
</div>
