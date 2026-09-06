<script lang="ts">
  import { basename, formatSize, speedLabel } from '../lib/format'
  import { client } from '../lib/network'
  import { app } from '../lib/session.svelte'
  import WinButton from '../ui/WinButton.svelte'

  function rows(dir: 'download' | 'upload') {
    return app.transfers.filter((t) => t.direction === dir)
  }

  let selected = $state<string | null>(null)
</script>

<div class="xfer">
  <div class="pane">
    <div class="label">Downloads</div>
    <div class="listview">
      <table>
        <thead>
          <tr>
            <th>Filename</th>
            <th>Size</th>
            <th>User</th>
            <th>Status</th>
            <th>Progress</th>
            <th>Speed</th>
            <th>Line</th>
          </tr>
        </thead>
        <tbody>
          {#each rows('download') as t (t.id)}
            <tr class:sel={selected === t.id} onclick={() => (selected = t.id)}>
              <td>{basename(t.filename)}</td>
              <td>{formatSize(t.size)}</td>
              <td>{t.nick}</td>
              <td>{t.status}</td>
              <td>
                <div class="progress"><i style:width={`${t.percent}%`}></i></div>
                {Math.round(t.percent)}%
              </td>
              <td>{t.bps ? `${Math.round(t.bps / 1024)} KB/s` : '—'}</td>
              <td>{speedLabel(t.speed)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      {#if !rows('download').length}
        <div class="empty-hint">No downloads. Double-click a search result to start one.</div>
      {/if}
    </div>
  </div>
  <div class="pane">
    <div class="label">Uploads</div>
    <div class="listview">
      <table>
        <thead>
          <tr>
            <th>Filename</th>
            <th>Size</th>
            <th>User</th>
            <th>Status</th>
            <th>Progress</th>
          </tr>
        </thead>
        <tbody>
          {#each rows('upload') as t (t.id)}
            <tr class:sel={selected === t.id} onclick={() => (selected = t.id)}>
              <td>{basename(t.filename)}</td>
              <td>{formatSize(t.size)}</td>
              <td>{t.nick}</td>
              <td>{t.status}</td>
              <td>
                <div class="progress"><i style:width={`${t.percent}%`}></i></div>
                {Math.round(t.percent)}%
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
      {#if !rows('upload').length}
        <div class="empty-hint">Nobody is downloading from your share folder yet.</div>
      {/if}
    </div>
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
  td .progress {
    display: inline-block;
    width: 90px;
    vertical-align: middle;
    margin-right: 6px;
  }
</style>
