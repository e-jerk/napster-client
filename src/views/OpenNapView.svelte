<script lang="ts">
  import { hasFs, pickDownloads, pickShare } from '../lib/fs'
  import { displayChannel, sameChannel } from '../lib/hub'
  import { client } from '../lib/network'
  import { app, persistNick, setUi } from '../lib/session.svelte'

  let logEl: HTMLDivElement | undefined = $state()
  let joinName = $state(app.chat.channel || '#lobby')

  $effect(() => {
    if (app.chat.channel) joinName = displayChannel(app.chat.channel)
  })

  $effect(() => {
    app.chat.messages.length
    queueMicrotask(() => {
      if (logEl) logEl.scrollTop = logEl.scrollHeight
    })
  })

  const lines = $derived(
    app.chat.messages.filter(
      (m) => !m.channel || sameChannel(m.channel, app.chat.channel) || m.kind === 'system' || m.kind === 'private',
    ),
  )

  function connect() {
    const nick = app.nick.trim().replace(/\s+/g, '_')
    if (!nick) {
      app.error = 'Please enter a nickname.'
      return
    }
    app.nick = nick
    persistNick()
    app.error = ''
    void client.connect(nick, app.speed === 0 ? 4 : app.speed)
  }

  function toggle() {
    if (app.connected || app.phase === 'connecting') client.disconnect()
    else connect()
  }

  function join() {
    const name = joinName.trim() || '#lobby'
    joinName = name
    client.join(name)
  }

  function send() {
    client.say(app.chat.input)
    app.chat.input = ''
  }

  function msgNick(nick: string) {
    app.chat.input = `/msg ${nick} `
  }
</script>

<div class="onap">
  <header>
    <h1>OpenNAP</h1>
    <nav class="ifaces" aria-label="Interface">
      <button type="button" class="on" onclick={() => setUi('chat')}>OpenNAP</button>
      <button type="button" onclick={() => setUi('win')}>Napster</button>
      <button type="button" onclick={() => setUi('mac')}>Mac</button>
    </nav>
    <input bind:value={app.nick} placeholder="nick" autocomplete="username" maxlength="19" />
    <input bind:value={app.password} type="password" placeholder="password (empty = key login)" autocomplete="current-password" />
    <button type="button" onclick={toggle}>{app.connected ? 'Disconnect' : 'Connect'}</button>
    <input bind:value={joinName} maxlength="32" />
    <button type="button" onclick={join} disabled={!app.connected}>Join</button>
    {#if hasFs()}
      <button
        type="button"
        onclick={async () => {
          if (await pickShare()) await client.shareFolder()
        }}>Share folder</button
      >
      <button
        type="button"
        onclick={async () => {
          const dir = await pickDownloads()
          if (dir) app.status = `Downloads → ${dir.name}`
        }}>Save to</button
      >
    {/if}
    <span class="status">{app.error || app.status}</span>
  </header>
  <main>
    <div class="log" bind:this={logEl}>
      {#each lines as line (line.id)}
        {#if line.kind === 'system'}
          <div class="sys">{line.text}</div>
        {:else if line.kind === 'private'}
          <div class="pm">*{line.nick}* {line.text}</div>
        {:else if line.kind === 'action'}
          <div class="me">* {line.nick} {line.text}</div>
        {:else}
          <div class:me={line.nick === app.nick}>&lt;{line.nick}&gt; {line.text}</div>
        {/if}
      {/each}
    </div>
    <aside class="nicks" class:on={app.chat.users.length > 0}>
      <b>in channel</b>
      {#each app.chat.users as u (u.nick)}
        <div>
          <button type="button" onclick={() => msgNick(u.nick)}>{u.op ? '@' : ''}{u.nick}</button>
        </div>
      {/each}
    </aside>
  </main>
  <form
    class="composer"
    onsubmit={(e) => {
      e.preventDefault()
      send()
    }}
  >
    <input
      bind:value={app.chat.input}
      placeholder="message, /help /join /me /msg /whois /away /topic /history"
      disabled={!app.connected}
      autocomplete="off"
    />
    <button type="submit" disabled={!app.connected}>Send</button>
  </form>
</div>

<style>
  .onap {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: #0d1110;
    color: #d7e4dc;
    font: 15px/1.4 ui-sans-serif, system-ui, -apple-system, sans-serif;
  }
  header {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    padding: 10px 12px;
    border-bottom: 1px solid #2a3530;
    background: #161c1a;
  }
  h1 {
    margin: 0 4px 0 0;
    font-size: 16px;
    letter-spacing: 0.04em;
    color: #3dba7a;
  }
  .ifaces {
    display: flex;
    border: 1px solid #2a3530;
    border-radius: 6px;
    overflow: hidden;
  }
  .ifaces button {
    padding: 5px 9px;
    font-size: 12px;
    color: #7f9488;
    background: #0b0f0e;
    border: 0;
  }
  .ifaces button.on,
  .ifaces button:hover {
    color: #3dba7a;
    background: #1c2a22;
  }
  header input,
  header button,
  .composer input,
  .composer button {
    background: #0b0f0e;
    color: #d7e4dc;
    border: 1px solid #2a3530;
    border-radius: 6px;
    padding: 7px 9px;
    font: inherit;
  }
  header button,
  .composer button {
    background: #1c2a22;
    color: #3dba7a;
    cursor: pointer;
  }
  header button:disabled,
  .composer button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .status {
    margin-left: auto;
    font-size: 13px;
    color: #7f9488;
  }
  main {
    flex: 1;
    display: flex;
    min-height: 0;
  }
  .log {
    flex: 1;
    overflow: auto;
    padding: 12px;
    white-space: pre-wrap;
    word-break: break-word;
    font: 13px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  .nicks {
    display: none;
    width: 160px;
    border-left: 1px solid #2a3530;
    overflow: auto;
    padding: 10px 12px;
    font-size: 13px;
    color: #7f9488;
  }
  .nicks.on {
    display: block;
  }
  .nicks b {
    display: block;
    color: #d7e4dc;
    margin-bottom: 6px;
  }
  .nicks button {
    background: none;
    border: 0;
    color: inherit;
    font: inherit;
    padding: 2px 0;
    cursor: pointer;
  }
  .composer {
    display: flex;
    gap: 8px;
    padding: 10px 12px;
    border-top: 1px solid #2a3530;
    background: #161c1a;
  }
  .composer input {
    flex: 1;
  }
  .sys {
    color: #7f9488;
  }
  .pm {
    color: #8ab4ff;
  }
  .me {
    color: #3dba7a;
  }
</style>
