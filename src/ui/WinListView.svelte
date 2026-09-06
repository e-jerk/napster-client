<script lang="ts">
  import { onMount } from 'svelte'

  export type Column = {
    key: string
    label: string
    width?: string
    align?: 'left' | 'right'
  }

  export type CellValue = string | { text: string; bar?: number }

  let {
    columns,
    rows,
    selected = $bindable<string | null>(null),
    empty = 'Nothing to display.',
    persistKey,
    ondblclick,
    oncontext,
  }: {
    columns: Column[]
    rows: { id: string; values: CellValue[] }[]
    selected?: string | null
    empty?: string
    persistKey?: string
    ondblclick?: (id: string) => void
    oncontext?: (id: string, e: MouseEvent) => void
  } = $props()

  const MIN_W = 36
  const MAX_W = 640

  let sort = $state(0)
  let asc = $state(true)
  let widths = $state<Record<string, number>>({})
  let resizing = $state<number | null>(null)
  let startX = 0
  let startW = 0
  let skipSort = false

  function parseWidth(w: string | undefined, index: number): number {
    if (!w) return index === 0 ? 220 : 88
    if (w.endsWith('%')) return Math.round((parseFloat(w) / 100) * 860)
    const n = parseInt(w, 10)
    return Number.isFinite(n) && n > 0 ? n : index === 0 ? 220 : 88
  }

  function widthOf(col: Column, index: number): number {
    return widths[col.key] ?? parseWidth(col.width, index)
  }

  const tableWidth = $derived(columns.reduce((sum, col, i) => sum + widthOf(col, i), 0))

  function cellText(cell: CellValue | undefined): string {
    if (cell == null) return ''
    return typeof cell === 'string' ? cell : cell.text
  }

  const sorted = $derived.by(() => {
    const copy = [...rows]
    copy.sort((a, b) => {
      const av = cellText(a.values[sort])
      const bv = cellText(b.values[sort])
      const an = Number(av.replace(/[^\d.-]/g, ''))
      const bn = Number(bv.replace(/[^\d.-]/g, ''))
      if (!Number.isNaN(an) && !Number.isNaN(bn) && av !== '' && bv !== '') {
        return asc ? an - bn : bn - an
      }
      return asc ? av.localeCompare(bv) : bv.localeCompare(av)
    })
    return copy
  })

  function persist() {
    if (!persistKey) return
    try {
      localStorage.setItem(`nap-cols:${persistKey}`, JSON.stringify(widths))
    } catch {
      /* ignore */
    }
  }

  onMount(() => {
    if (!persistKey) return
    try {
      const raw = localStorage.getItem(`nap-cols:${persistKey}`)
      if (!raw) return
      const parsed = JSON.parse(raw) as Record<string, number>
      if (parsed && typeof parsed === 'object') widths = parsed
    } catch {
      /* ignore */
    }
  })

  function header(i: number) {
    if (skipSort) {
      skipSort = false
      return
    }
    if (sort === i) asc = !asc
    else {
      sort = i
      asc = true
    }
  }

  function gripDown(i: number, e: PointerEvent) {
    e.preventDefault()
    e.stopPropagation()
    resizing = i
    startX = e.clientX
    startW = widthOf(columns[i]!, i)
    skipSort = false
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    document.body.style.cursor = 'col-resize'
  }

  function gripMove(e: PointerEvent) {
    if (resizing === null) return
    const dx = e.clientX - startX
    if (Math.abs(dx) > 2) skipSort = true
    const col = columns[resizing]
    if (!col) return
    widths = { ...widths, [col.key]: Math.max(MIN_W, Math.min(MAX_W, startW + dx)) }
  }

  function gripUp() {
    if (resizing === null) return
    resizing = null
    document.body.style.cursor = ''
    persist()
  }

  function textWidth(text: string): number {
    const fallback = text.length * 7
    const span = document.createElement('span')
    span.style.cssText =
      'position:absolute;left:-9999px;top:0;white-space:nowrap;font:11px Tahoma,"MS Sans Serif",sans-serif;'
    span.textContent = text
    document.body.appendChild(span)
    const w = span.getBoundingClientRect().width
    span.remove()
    return Math.ceil(w > 1 ? w : fallback)
  }

  function autosize(i: number, e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const col = columns[i]
    if (!col) return
    let w = textWidth(col.label) + 20
    for (const row of rows) w = Math.max(w, textWidth(cellText(row.values[i])) + 16)
    widths = { ...widths, [col.key]: Math.max(MIN_W, Math.min(MAX_W, w)) }
    persist()
  }
</script>

<svelte:window
  onpointermove={(e) => {
    if (resizing !== null) gripMove(e)
  }}
  onpointerup={gripUp}
/>

<div class="listview" class:resizing={resizing !== null}>
  <table style:width={`${tableWidth}px`}>
    <colgroup>
      {#each columns as col, i (col.key)}
        <col style:width={`${widthOf(col, i)}px`} />
      {/each}
    </colgroup>
    <thead>
      <tr>
        {#each columns as col, i (col.key)}
          <th
            style:text-align={col.align ?? 'left'}
            class:sizing={resizing === i}
            onclick={() => header(i)}
          >
            <span class="lbl">{col.label}</span>
            <button
              type="button"
              class="grip"
              aria-label={`Resize ${col.label} column`}
              title="Drag to resize · double-click to fit"
              onclick={(e) => e.stopPropagation()}
              onpointerdown={(e) => gripDown(i, e)}
              onpointermove={gripMove}
              onpointerup={gripUp}
              ondblclick={(e) => autosize(i, e)}
            ></button>
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
            <td style:text-align={columns[i]?.align ?? 'left'}>
              {#if typeof cell === 'object' && cell.bar != null}
                <span class="cell-bar">
                  <span class="progress"><i style:width={`${cell.bar}%`}></i></span>
                  {cell.text}
                </span>
              {:else}
                {cellText(cell)}
              {/if}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
  {#if !rows.length}
    <div class="empty-hint">{empty}</div>
  {/if}
</div>

<style>
  .lbl {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  th {
    position: relative;
  }

  .grip {
    position: absolute;
    top: 0;
    right: 0;
    width: 8px;
    height: 100%;
    min-width: 0;
    padding: 0;
    cursor: col-resize;
    z-index: 3;
    background: transparent;
    box-shadow: none;
  }

  .grip:hover,
  th.sizing .grip {
    background: #000080;
    opacity: 0.25;
  }

  .cell-bar {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .cell-bar .progress {
    width: 72px;
    flex: 0 0 72px;
  }
</style>
