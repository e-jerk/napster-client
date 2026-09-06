<script lang="ts">
  import { basename, formatSize, speedLabel } from '../lib/format'
  import { client } from '../lib/network'
  import { app } from '../lib/session.svelte'
  import WinButton from '../ui/WinButton.svelte'
  import WinListView from '../ui/WinListView.svelte'

  const downloadCols = [
    { key: 'file', label: 'Filename', width: '200px' },
    { key: 'size', label: 'Size', width: '72px', align: 'right' as const },
    { key: 'user', label: 'User', width: '90px' },
    { key: 'status', label: 'Status', width: '110px' },
    { key: 'prog', label: 'Progress', width: '140px' },
    { key: 'speed', label: 'Speed', width: '72px' },
    { key: 'line', label: 'Line', width: '100px' },
  ]

  const uploadCols = [
    { key: 'file', label: 'Filename', width: '220px' },
    { key: 'size', label: 'Size', width: '72px', align: 'right' as const },
    { key: 'user', label: 'User', width: '90px' },
    { key: 'status', label: 'Status', width: '110px' },
    { key: 'prog', label: 'Progress', width: '140px' },
  ]

  const downloads = $derived(
    app.transfers
      .filter((t) => t.direction === 'download')
      .map((t) => ({
        id: t.id,
        values: [
          basename(t.filename),
          formatSize(t.size),
          t.nick,
          t.status,
          { text: `${Math.round(t.percent)}%`, bar: t.percent },
          t.bps ? `${Math.round(t.bps / 1024)} KB/s` : '—',
          speedLabel(t.speed),
        ],
      })),
  )

  const uploads = $derived(
    app.transfers
      .filter((t) => t.direction === 'upload')
      .map((t) => ({
        id: t.id,
        values: [
          basename(t.filename),
          formatSize(t.size),
          t.nick,
          t.status,
          { text: `${Math.round(t.percent)}%`, bar: t.percent },
        ],
      })),
  )

  let selected = $state<string | null>(null)
</script>

<div class="xfer">
  <div class="pane">
    <div class="label">Downloads</div>
    <WinListView
      persistKey="downloads"
      columns={downloadCols}
      rows={downloads}
      bind:selected
      empty="No downloads. Double-click a search result to start one."
    />
  </div>
  <div class="pane">
    <div class="label">Uploads</div>
    <WinListView
      persistKey="uploads"
      columns={uploadCols}
      rows={uploads}
      bind:selected
      empty="Nobody is downloading from your share folder yet."
    />
  </div>
  <div class="actions">
    <WinButton
      label="Abort"
      disabled={!selected}
      onclick={() => selected && client.abort(selected)}
    />
    <WinButton label="Clear Finished" onclick={() => client.clearFinished()} />
  </div>
</div>

<style>
  .xfer {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px;
  }
  .pane {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .label {
    font-weight: 700;
  }
  .actions {
    display: flex;
    gap: 8px;
  }
</style>
