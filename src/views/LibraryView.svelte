<script lang="ts">
  import { basename, formatBitrate, formatDuration, formatSize } from '../lib/format'
  import { hasFs, pickDownloads, readDownloadFile, readShareFile } from '../lib/fs'
  import { rememberDownloadDir } from '../lib/persist'
  import { client } from '../lib/network'
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
    const name = basename(filename)
    if (app.prefs.pathMode === 'full') return `My Files\\${name}`
    if (app.prefs.pathMode === 'partial') return `My Files\\${name}`
    return name
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

  async function playId(id: string) {
    const item = app.library.find((f) => f.id === id)
    if (!item) return
    const blob = item.blob ?? (await readShareFile(item.filename)) ?? (await readDownloadFile(item.filename))
    if (!blob) {
      app.status = `${basename(item.filename)} is not on disk in this session`
      return
    }
    if (!app.player.internal) {
      app.status = `Default Media Player would open ${basename(item.filename)} (AMP / PlayMedia is the Napster Internal Player).`
      return
    }
    if (app.player.url) URL.revokeObjectURL(app.player.url)
    app.player.url = URL.createObjectURL(blob)
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
    <WinButton icon="play" label="Play" small onclick={() => app.librarySelected && playId(app.librarySelected)} />
    <WinButton icon="stop" label="Stop" small onclick={stop} />
    <WinButton
      label="Share Folder…"
      small
      onclick={async () => {
        await client.pickAndShare()
      }}
    />
    {#if hasFs()}
      <WinButton
        label="Download Folder…"
        small
        onclick={async () => {
          const dir = await pickDownloads()
          if (dir) {
            await rememberDownloadDir(dir)
            app.status = `Downloads → ${dir.name}`
          }
        }}
      />
    {/if}
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
