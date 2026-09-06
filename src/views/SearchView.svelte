<script lang="ts">
  import { formatBitrate, formatDuration, formatFreq, formatSize, speedLabel } from '../lib/format'
  import { client } from '../lib/network'
  import { app } from '../lib/session.svelte'
  import WinButton from '../ui/WinButton.svelte'
  import WinInput from '../ui/WinInput.svelte'
  import WinListView from '../ui/WinListView.svelte'
  import WinSelect from '../ui/WinSelect.svelte'

  const bitrateOpts = [
    { value: 0, label: 'any' },
    { value: 64, label: '64 kbps+' },
    { value: 96, label: '96 kbps+' },
    { value: 128, label: '128 kbps+' },
    { value: 160, label: '160 kbps+' },
    { value: 192, label: '192 kbps+' },
  ]

  const maxOpts = [50, 100, 200, 500].map((n) => ({ value: n, label: String(n) }))

  const columns = [
    { key: 'file', label: 'Filename', width: '240px' },
    { key: 'size', label: 'Size', width: '72px', align: 'right' as const },
    { key: 'br', label: 'Bitrate', width: '72px' },
    { key: 'freq', label: 'Freq', width: '56px' },
    { key: 'len', label: 'Length', width: '56px' },
    { key: 'user', label: 'User', width: '100px' },
    { key: 'ping', label: 'Ping', width: '64px', align: 'right' as const },
    { key: 'line', label: 'Connection', width: '110px' },
  ]

  const rows = $derived(
    app.search.results.map((r) => ({
      id: r.id,
      values: [
        r.filename,
        formatSize(r.size),
        formatBitrate(r.bitrate),
        formatFreq(r.freq),
        formatDuration(r.duration),
        r.nick,
        `${r.ping} ms`,
        speedLabel(r.speed),
      ],
    })),
  )

  function downloadId(id: string) {
    const hit = app.search.results.find((r) => r.id === id)
    if (hit) client.download(hit)
  }

  function context(id: string, e: MouseEvent) {
    const hit = app.search.results.find((r) => r.id === id)
    if (!hit) return
    app.dialogs.context = {
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: 'Download', action: `download:${id}` },
        { label: `Browse ${hit.nick}`, action: `browse:${hit.nick}` },
        { label: 'Add to Hot List', action: `hot:${hit.nick}` },
        { label: 'Private Message', action: `pm:${hit.nick}` },
      ],
    }
  }
</script>

<div class="search">
  <div class="form">
    <label>
      <span>Artist</span>
      <WinInput bind:value={app.search.artist} width="100%" onenter={() => client.search()} />
    </label>
    <label>
      <span>Title / Filename</span>
      <WinInput bind:value={app.search.title} width="100%" onenter={() => client.search()} />
    </label>
    <label class="narrow">
      <span>Max Results</span>
      <WinSelect bind:value={app.search.maxResults} options={maxOpts} width="100%" />
    </label>
    <label class="narrow">
      <span>Bitrate</span>
      <WinSelect bind:value={app.search.minBitrate} options={bitrateOpts} width="100%" />
    </label>
    <div class="go">
      <WinButton
        label={app.search.searching ? 'Searching…' : '<u>F</u>ind It!'}
        disabled={!app.connected || app.search.searching}
        onclick={() => client.search()}
      />
    </div>
  </div>
  <WinListView
    persistKey="search"
    {columns}
    {rows}
    bind:selected={app.search.selected}
    empty={app.search.searching
      ? 'Searching the Napster network…'
      : 'Enter an artist or song title and click Find It!'}
    ondblclick={downloadId}
    oncontext={context}
  />
</div>

<style>
  .search {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px;
  }
  .form {
    display: grid;
    grid-template-columns: 1.4fr 1.4fr 0.7fr 0.8fr auto;
    gap: 8px;
    align-items: end;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .go {
    padding-bottom: 1px;
  }
  @media (max-width: 800px) {
    .form {
      grid-template-columns: 1fr 1fr;
    }
    .go {
      grid-column: 1 / -1;
    }
  }
</style>
