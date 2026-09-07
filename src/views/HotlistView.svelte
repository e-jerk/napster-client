<script lang="ts">
  import { speedLabel } from '../lib/format'
  import { client } from '../lib/network'
  import { app } from '../lib/session.svelte'
  import WinButton from '../ui/WinButton.svelte'
  import WinInput from '../ui/WinInput.svelte'
  import WinListView from '../ui/WinListView.svelte'

  let addNick = $state('')

  const columns = [
    { key: 'user', label: 'User', width: '140px' },
    { key: 'st', label: 'Status', width: '80px' },
    { key: 'files', label: 'Files', width: '64px', align: 'right' as const },
    { key: 'line', label: 'Connection', width: '120px' },
  ]

  const rows = $derived(
    app.hotlist.map((h) => ({
      id: h.nick,
      values: [h.nick, h.online ? 'Online' : 'Offline', h.online ? String(h.files) : '—', h.online ? speedLabel(h.speed) : '—'],
    })),
  )

  function browse() {
    if (app.hotSelected) client.browse(app.hotSelected)
  }
</script>

<div class="hot">
  <WinListView
    persistKey="hotlist"
    {columns}
    {rows}
    bind:selected={app.hotSelected}
    empty="Your hot list is empty. Right-click a user in Search or Chat and choose Add to Hot List."
    ondblclick={browse}
    oncontext={(id, e) => {
      app.hotSelected = id
      app.dialogs.context = {
        x: e.clientX,
        y: e.clientY,
        items: [
          { label: 'Instant Message', action: `pm:${id}` },
          { label: 'View User Information', action: `info:${id}` },
          { label: 'Browse Files', action: `browse:${id}` },
          { label: 'Remove User', action: `removehot:${id}` },
        ],
      }
    }}
  />
  <div class="row">
    <WinInput bind:value={addNick} placeholder="nickname" width="160px" onenter={() => {
      if (addNick.trim()) client.addHot(addNick.trim())
      addNick = ''
    }} />
    <WinButton
      label="Add"
      onclick={() => {
        if (addNick.trim()) client.addHot(addNick.trim())
        addNick = ''
      }}
    />
    <WinButton label="Remove" disabled={!app.hotSelected} onclick={() => app.hotSelected && client.removeHot(app.hotSelected)} />
    <WinButton label="Browse" disabled={!app.hotSelected} onclick={browse} />
    <WinButton
      label="Message"
      disabled={!app.hotSelected}
      onclick={() => {
        if (app.hotSelected) client.msg(app.hotSelected, '')
      }}
    />
  </div>
</div>

<style>
  .hot {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }
</style>
