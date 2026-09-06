<script lang="ts">
  import { formatBitrate, formatDuration, formatSize } from '../lib/format'
  import { app } from '../lib/session.svelte'
  import WinButton from '../ui/WinButton.svelte'
  import WinListView from '../ui/WinListView.svelte'

  const columns = [
    { key: 'file', label: 'Filename', width: '36%' },
    { key: 'artist', label: 'Artist', width: '16%' },
    { key: 'title', label: 'Title', width: '16%' },
    { key: 'size', label: 'Size', width: '8%', align: 'right' as const },
    { key: 'br', label: 'Bitrate', width: '8%' },
    { key: 'len', label: 'Length', width: '8%' },
    { key: 'src', label: 'Source', width: '8%' },
  ]

  const rows = $derived(
    app.library.map((f) => ({
      id: f.id,
      values: [
        f.filename,
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
    {columns}
    {rows}
    bind:selected={app.librarySelected}
    empty="Your share folder is empty."
    ondblclick={playId}
  />
  <div class="player raised">
    <div class="now">
      {app.player.title || 'Napster internal player — double-click a file'}
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
