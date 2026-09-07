<script lang="ts">
  import { formatBitrate, formatDuration, formatSize } from '../lib/format'
  import { app } from '../lib/session.svelte'
  import WinButton from '../ui/WinButton.svelte'
  import WinListView from '../ui/WinListView.svelte'

  const columns = [
    { key: 'file', label: 'Filename', width: '240px' },
    { key: 'artist', label: 'Artist', width: '120px' },
    { key: 'title', label: 'Title', width: '140px' },
    { key: 'size', label: 'Size', width: '72px', align: 'right' as const },
    { key: 'br', label: 'Bitrate', width: '72px' },
    { key: 'len', label: 'Length', width: '64px' },
    { key: 'src', label: 'Source', width: '80px' },
  ]

  function displayName(filename: string) {
    if (app.prefs.pathMode === 'full') return `C:\\Program Files\\Napster\\My Files\\${filename}`
    if (app.prefs.pathMode === 'partial') return `My Files\\${filename}`
    return filename
  }

  const rows = $derived(
    app.library.map((f) => ({
      id: f.id,
      values: [
        displayName(f.filename),
        f.artist,
        f.title,
        formatSize(f.size),
        formatBitrate(f.bitrate),
        formatDuration(f.duration),
        f.origin === 'download' ? 'Download' : 'Shared',
      ],
    })),
  )

  function playId(id: string) {
    const item = app.library.find((f) => f.id === id)
    if (!item?.blob) return
    if (!app.player.internal) {
      app.status = `Default Media Player would open ${item.filename} (AMP / PlayMedia is the Napster Internal Player).`
      return
    }
    if (app.player.url) URL.revokeObjectURL(app.player.url)
    app.player.url = URL.createObjectURL(item.blob)
    app.player.id = item.id
    app.player.title = `${item.artist} - ${item.title}`
    app.player.playing = true
  }

  function stop() {
    app.player.playing = false
    const audio = document.getElementById('nap-audio') as HTMLAudioElement | null
    audio?.pause()
  }
</script>

<div class="lib">
  <WinListView
    persistKey="library"
    {columns}
    {rows}
    bind:selected={app.librarySelected}
    empty="No Files shared."
    ondblclick={playId}
    oncontext={(id, e) => {
      app.librarySelected = id
      app.dialogs.context = {
        x: e.clientX,
        y: e.clientY,
        items: [
          { label: 'Play File!', action: `play:${id}` },
          { label: 'Add to Playlist', action: `play:${id}` },
          { label: 'Rename File', action: `rename:${id}` },
          { label: 'Delete (from disk)', action: `delete:${id}` },
          { label: 'Refresh and Sort', action: 'refresh' },
          { label: 'No Paths', action: 'paths:filename' },
          { label: 'Partial Paths', action: 'paths:partial' },
          { label: 'Full Paths', action: 'paths:full' },
        ],
      }
    }}
  />
  <div class="player raised">
    <div class="now">
      {app.player.title || 'Napster Internal Player — double-click a file (AMP)'}
    </div>
    <WinButton label="Play" small onclick={() => app.librarySelected && playId(app.librarySelected)} />
    <WinButton label="Stop" small onclick={stop} />
    <span class="meta">{app.library.length} files · {formatSize(app.library.reduce((n, f) => n + f.size, 0))}</span>
  </div>
  {#if app.player.url}
    <audio
      id="nap-audio"
      src={app.player.url}
      autoplay={app.player.playing}
      onended={() => (app.player.playing = false)}
    ></audio>
  {/if}
</div>

<style>
  .lib {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px;
  }
  .player {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px;
  }
  .now {
    flex: 1;
    background: #000;
    color: #00ff66;
    font-family: 'Courier New', monospace;
    padding: 4px 8px;
    min-height: 22px;
  }
  audio {
    display: none;
  }
</style>
