<script lang="ts">
  import { speedLabel } from '../lib/format'
  import { sameChannel } from '../lib/hub'
  import { client } from '../lib/network'
  import { app } from '../lib/session.svelte'
  import WinButton from '../ui/WinButton.svelte'
  import WinInput from '../ui/WinInput.svelte'

  let logEl: HTMLDivElement | undefined = $state()

  $effect(() => {
    app.chat.messages.length
    queueMicrotask(() => {
      if (logEl) logEl.scrollTop = logEl.scrollHeight
    })
  })

  function send() {
    client.say(app.chat.input)
    app.chat.input = ''
  }

  function userContext(nick: string, e: MouseEvent) {
    app.chat.selectedUser = nick
    app.dialogs.context = {
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: 'Private Message', action: `pm:${nick}` },
        { label: 'Whois', action: `whois:${nick}` },
        { label: 'Add to Hot List', action: `hot:${nick}` },
        { label: 'Browse Files', action: `browse:${nick}` },
        { label: 'Ignore', action: `ignore:${nick}` },
      ],
    }
  }
</script>

<div class="chat">
  <div class="main">
    <div class="chat-log" bind:this={logEl}>
      {#each app.chat.messages.filter((m) => !m.channel || sameChannel(m.channel, app.chat.channel) || m.kind === 'system' || m.kind === 'private') as line (line.id)}
        {#if line.kind === 'system'}
          <div class="sys">*** {line.text}</div>
        {:else if line.kind === 'private'}
          <div class="priv">*{line.nick}* {line.text}</div>
        {:else if line.kind === 'action'}
          <div class="act" title={line.msgid ?? ''}>* {line.nick} {line.text}</div>
        {:else}
          <div class:me={line.nick === app.nick} title={line.msgid ?? ''}>
            &lt;{line.nick}&gt; {line.text}
          </div>
        {/if}
      {/each}
    </div>
    <aside class="users sunken">
      <div class="uh">Channel users ({app.chat.users.length})</div>
      {#each app.chat.users as u (u.nick)}
        <button
          class="u"
          class:sel={app.chat.selectedUser === u.nick}
          onclick={() => (app.chat.selectedUser = u.nick)}
          ondblclick={() => client.msg(u.nick, '')}
          oncontextmenu={(e) => {
            e.preventDefault()
            userContext(u.nick, e)
          }}
          title={`${speedLabel(u.speed)} · ${u.files} files`}
        >
          {u.op ? '@' : ''}{u.nick}
        </button>
      {/each}
    </aside>
  </div>
  <div class="composer">
    <WinInput bind:value={app.chat.input} width="100%" onenter={send} placeholder="message, /help /join /me /msg /whois /away /topic /history" />
    <WinButton label="Send" onclick={send} disabled={!app.connected} />
    <span class="ch">#{app.chat.channel}</span>
    <WinButton label="Join" small onclick={() => (app.dialogs.join = true)} disabled={!app.connected} />
  </div>
</div>

<style>
  .chat {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px;
  }
  .main {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: 1fr 150px;
    gap: 6px;
  }
  .users {
    background: #fff;
    overflow: auto;
    padding: 2px;
  }
  .uh {
    padding: 3px 4px;
    font-weight: 700;
    background: var(--face);
  }
  .u {
    display: block;
    width: 100%;
    text-align: left;
    padding: 2px 4px;
    background: transparent;
  }
  .u.sel {
    background: var(--sel);
    color: #fff;
  }
  .composer {
    display: grid;
    grid-template-columns: 1fr auto auto auto;
    gap: 6px;
    align-items: center;
  }
  .act {
    color: #008080;
    font-style: italic;
  }
  .ch {
    min-width: 90px;
  }
  @media (max-width: 700px) {
    .main {
      grid-template-columns: 1fr;
    }
    .users {
      max-height: 120px;
    }
  }
</style>
