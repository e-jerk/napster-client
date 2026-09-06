<script lang="ts">
  import { CHANNELS } from '../lib/catalog'
  import { formatBitrate, formatDuration, formatSize, speedLabel } from '../lib/format'
  import { client } from '../lib/network'
  import { app } from '../lib/session.svelte'
  import { SPEEDS } from '../lib/types'
  import CatLogo from '../ui/CatLogo.svelte'
  import WinButton from '../ui/WinButton.svelte'
  import WinGroup from '../ui/WinGroup.svelte'
  import WinInput from '../ui/WinInput.svelte'
  import WinListView from '../ui/WinListView.svelte'
  import WinSelect from '../ui/WinSelect.svelte'

  const speedOpts = SPEEDS.map((s) => ({ value: s.id, label: s.label }))

  function persistNick() {
    try {
      localStorage.setItem('napster-nick', app.nick.trim())
    } catch {
      /* ignore */
    }
  }

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

  function runAction(action: string) {
    app.dialogs.context = null
    const [kind, arg] = action.split(':')
    if (kind === 'download' && arg) {
      const hit = app.search.results.find((r) => r.id === arg)
      if (hit) client.download(hit)
    }
    if (kind === 'browse' && arg) client.browse(arg)
    if (kind === 'hot' && arg) client.addHot(arg)
    if (kind === 'pm' && arg) client.msg(arg, '')
  }

  function sendPm(nick: string) {
    const thread = app.pms.find((p) => p.nick === nick)
    if (!thread || !thread.input.trim()) return
    client.msg(nick, thread.input)
    thread.input = ''
  }

  const channelRows = $derived(
    (app.channels.length
      ? app.channels
      : CHANNELS.map((c) => ({ name: c.name, users: 0, topic: c.topic }))
    ).map((c) => ({
      id: c.name,
      values: [c.name, String(c.users), c.topic],
    })),
  )

  const packetRows = $derived(
    app.packets.map((p) => ({
      id: p.id,
      values: [p.dir, String(p.type), p.name, p.payload],
    })),
  )

  const browseRows = $derived(
    app.browse.files.map((f, i) => ({
      id: `br-${i}`,
      values: [f.filename, formatSize(f.size), formatBitrate(f.bitrate), formatDuration(f.duration)],
    })),
  )

  let browseSelected = $state<string | null>(null)
  let joinSelected = $state<string | null>(app.chat.channel)

  function downloadBrowse(id: string) {
    const i = Number(id.replace('br-', ''))
    const f = app.browse.files[i]
    if (!f) return
    client.download({
      id,
      filename: f.filename,
      artist: f.artist,
      title: f.title,
      size: f.size,
      bitrate: f.bitrate,
      freq: f.freq,
      duration: f.duration,
      md5: f.md5,
      nick: f.nick,
      ip: '',
      port: 6699,
      speed: 7,
      ping: 80,
      firewalled: false,
    })
    app.browse.open = false
  }
</script>

{#if app.phase === 'setup'}
  <div class="dialog-backdrop">
    <div class="window dialog">
      <div class="caption">
        <span>Connection Information</span>
        <div class="caption-btns">
          <button class="caption-btn" onclick={() => (app.win.open = false)}>×</button>
        </div>
      </div>
      <div class="body">
        <CatLogo />
        <WinGroup title="Connection Information">
          <p>To maximize system performance, please select your connection speed from the list below.</p>
          <label class="row">
            <span><u>C</u>onnection Speed:</span>
            <WinSelect bind:value={app.speed} options={speedOpts} width="180px" />
          </label>
        </WinGroup>
        <WinGroup title="Proxy Server Information">
          <div class="proxy-row">
            <p>
              If you access the internet via a SOCKS 4 or 5 proxy server, click 'Proxy Setup' to set
              up your proxy. If you have NO IDEA what a 'Proxy' is, just hit Next!
            </p>
            <WinButton label="Proxy Setup..." onclick={() => (app.dialogs.proxy = true)} />
          </div>
        </WinGroup>
        <div class="btns">
          <WinButton label="Help" onclick={() => (app.dialogs.about = true)} />
          <span class="spacer"></span>
          <WinButton label="Cancel" onclick={() => (app.win.open = false)} />
          <WinButton label="<u>N</u>ext &gt;" onclick={() => (app.phase = 'login')} />
        </div>
      </div>
    </div>
  </div>
{/if}

{#if app.phase === 'login'}
  <div class="dialog-backdrop">
    <div class="window dialog">
      <div class="caption">
        <span>Choose a Nickname</span>
        <div class="caption-btns">
          <button class="caption-btn" onclick={() => (app.phase = 'setup')}>×</button>
        </div>
      </div>
      <div class="body">
        <CatLogo />
        <p>
          Your nickname is how other users will see you on the Napster network. The hub at
          napster.local:8888 is a zero-native OpenNap replica running in this browser.
        </p>
        <label class="row">
          <span>Nickname:</span>
          <WinInput bind:value={app.nick} width="220px" onenter={connect} />
        </label>
        <label class="row">
          <span>Email:</span>
          <WinInput bind:value={app.email} width="220px" placeholder="optional" />
        </label>
        {#if app.error}
          <p class="err">{app.error}</p>
        {/if}
        <div class="btns">
          <WinButton label="&lt; Back" onclick={() => (app.phase = 'setup')} />
          <span class="spacer"></span>
          <WinButton label="Cancel" onclick={() => (app.win.open = false)} />
          <WinButton label="Connect" onclick={connect} />
        </div>
      </div>
    </div>
  </div>
{/if}

{#if app.phase === 'connecting'}
  <div class="dialog-backdrop">
    <div class="window dialog slim">
      <div class="caption"><span>Napster</span></div>
      <div class="body">
        <p>Logging into napster.local:8888…</p>
        <p class="muted">{app.status}</p>
      </div>
    </div>
  </div>
{/if}

{#if app.dialogs.proxy}
  <div class="dialog-backdrop" style:z-index="30">
    <div class="window dialog slim">
      <div class="caption">
        <span>Proxy Setup</span>
        <div class="caption-btns">
          <button class="caption-btn" onclick={() => (app.dialogs.proxy = false)}>×</button>
        </div>
      </div>
      <div class="body">
        <p>SOCKS settings are stored only in this page. The zero-native bridge never leaves the browser, so a proxy is not used.</p>
        <label class="row"><span>Host</span><WinInput bind:value={app.proxy.host} width="180px" /></label>
        <label class="row"><span>Port</span><WinInput bind:value={app.proxy.port} width="80px" /></label>
        <div class="btns">
          <span class="spacer"></span>
          <WinButton label="OK" onclick={() => (app.dialogs.proxy = false)} />
        </div>
      </div>
    </div>
  </div>
{/if}

{#if app.dialogs.join}
  <div class="dialog-backdrop">
    <div class="window dialog">
      <div class="caption">
        <span>Join Channel</span>
        <div class="caption-btns">
          <button class="caption-btn" onclick={() => (app.dialogs.join = false)}>×</button>
        </div>
      </div>
      <div class="body">
        <div class="list-wrap">
          <WinListView
            persistKey="join"
            columns={[
              { key: 'ch', label: 'Channel', width: '110px' },
              { key: 'users', label: 'Users', width: '56px', align: 'right' },
              { key: 'topic', label: 'Topic', width: '240px' },
            ]}
            rows={channelRows}
            bind:selected={joinSelected}
            empty="No channels."
            ondblclick={(id) => {
              client.join(id)
              app.dialogs.join = false
              app.view = 'chat'
            }}
          />
        </div>
        <div class="btns">
          <span class="spacer"></span>
          <WinButton label="Cancel" onclick={() => (app.dialogs.join = false)} />
          <WinButton
            label="Join"
            onclick={() => {
              client.join(joinSelected || app.chat.channel)
              app.dialogs.join = false
              app.view = 'chat'
            }}
          />
        </div>
      </div>
    </div>
  </div>
{/if}

{#if app.dialogs.about}
  <div class="dialog-backdrop">
    <div class="window dialog">
      <div class="caption">
        <span>About Napster</span>
        <div class="caption-btns">
          <button class="caption-btn" onclick={() => (app.dialogs.about = false)}>×</button>
        </div>
      </div>
      <div class="body">
        <CatLogo />
        <p><b>Napster v2.0 BETA 10.3</b> (web recreation)</p>
        <p>
          Original Windows client preserved at
          <a href="https://archive.org/details/napv2b10-3" target="_blank" rel="noreferrer">archive.org/details/napv2b10-3</a>
          as <code>napv2b10-3.exe</code> (2,044,147 bytes, 2001).
        </p>
        <p>
          This page redraws that MFC client in Svelte. Search, chat, hot list, library, and
          transfers talk to an in-browser OpenNap hub through a zero-native virtual TCP stack — no
          Electron, no Node sockets, no raw Winsock.
        </p>
        <p>Shared titles are original demo recordings, not commercial releases.</p>
        <div class="btns">
          <span class="spacer"></span>
          <WinButton label="OK" onclick={() => (app.dialogs.about = false)} />
        </div>
      </div>
    </div>
  </div>
{/if}

{#if app.dialogs.bridge}
  <div class="dialog-backdrop">
    <div class="window dialog wide">
      <div class="caption">
        <span>TCP Bridge — zero native</span>
        <div class="caption-btns">
          <button class="caption-btn" onclick={() => (app.dialogs.bridge = false)}>×</button>
        </div>
      </div>
      <div class="body">
        <p>
          Virtual NIC {app.localIp} · hub napster.local:8888 · data port 6699 · packets framed as
          u16le length + u16le type (OpenNap).
        </p>
        <div class="list-wrap tall">
          <WinListView
            persistKey="bridge"
            columns={[
              { key: 'dir', label: 'Dir', width: '48px' },
              { key: 'type', label: 'Type', width: '48px' },
              { key: 'name', label: 'Name', width: '120px' },
              { key: 'payload', label: 'Payload', width: '280px' },
            ]}
            rows={packetRows}
            empty="Connect to see framed Napster messages on the virtual TCP stack."
          />
        </div>
        <div class="btns">
          <span class="spacer"></span>
          <WinButton label="Close" onclick={() => (app.dialogs.bridge = false)} />
        </div>
      </div>
    </div>
  </div>
{/if}

{#if app.browse.open}
  <div class="dialog-backdrop">
    <div class="window dialog wide">
      <div class="caption">
        <span>Browse — {app.browse.nick}</span>
        <div class="caption-btns">
          <button class="caption-btn" onclick={() => (app.browse.open = false)}>×</button>
        </div>
      </div>
      <div class="body">
        <div class="list-wrap tall">
          <WinListView
            persistKey="browse"
            columns={[
              { key: 'file', label: 'Filename', width: '240px' },
              { key: 'size', label: 'Size', width: '72px', align: 'right' },
              { key: 'br', label: 'Bitrate', width: '72px' },
              { key: 'len', label: 'Length', width: '64px' },
            ]}
            rows={browseRows}
            bind:selected={browseSelected}
            empty="Waiting for browse results…"
            ondblclick={downloadBrowse}
          />
        </div>
        <div class="btns">
          <span class="spacer"></span>
          <WinButton label="Close" onclick={() => (app.browse.open = false)} />
        </div>
      </div>
    </div>
  </div>
{/if}

{#each app.pms.filter((p) => p.open) as pm (pm.nick)}
  <div class="pm window" style:left={`${pm.x}px`} style:top={`${pm.y}px`}>
    <div
      class="caption"
      role="toolbar"
      tabindex="0"
      onpointerdown={(e) => {
        const sx = e.clientX - pm.x
        const sy = e.clientY - pm.y
        const move = (ev: PointerEvent) => {
          pm.x = ev.clientX - sx
          pm.y = ev.clientY - sy
        }
        const up = () => {
          window.removeEventListener('pointermove', move)
          window.removeEventListener('pointerup', up)
        }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
      }}
    >
      <span>Private Message — {pm.nick}</span>
      <div class="caption-btns">
        <button class="caption-btn" onclick={() => (pm.open = false)}>×</button>
      </div>
    </div>
    <div class="pm-body">
      <div class="chat-log">
        {#each pm.messages as line (line.id)}
          <div>&lt;{line.nick}&gt; {line.text}</div>
        {/each}
        {#if !pm.messages.length}
          <div class="sys">*** Private chat with {pm.nick} ({speedLabel(7)})</div>
        {/if}
      </div>
      <div class="pm-send">
        <WinInput bind:value={pm.input} width="100%" onenter={() => sendPm(pm.nick)} />
        <WinButton label="Send" small onclick={() => sendPm(pm.nick)} />
      </div>
    </div>
  </div>
{/each}

{#if app.dialogs.context}
  <button
    class="scrim"
    aria-label="Dismiss menu"
    onclick={() => (app.dialogs.context = null)}
    oncontextmenu={(e) => {
      e.preventDefault()
      app.dialogs.context = null
    }}
  ></button>
  <div class="menu-pop ctx" style:left={`${app.dialogs.context.x}px`} style:top={`${app.dialogs.context.y}px`}>
    {#each app.dialogs.context.items as item (item.action)}
      <button disabled={item.disabled} onclick={() => runAction(item.action)}>{item.label}</button>
    {/each}
  </div>
{/if}

<style>
  .body {
    padding: 12px 14px 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .row span {
    min-width: 120px;
  }
  .proxy-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px;
    align-items: center;
  }
  .btns {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 4px;
  }
  .spacer {
    flex: 1;
  }
  .err {
    color: #800000;
  }
  .muted {
    color: #404040;
  }
  .slim {
    width: min(340px, 100%);
  }
  .wide {
    width: min(560px, 100%);
  }
  .pm {
    position: absolute;
    z-index: 25;
    width: 320px;
    height: 220px;
  }
  .pm-body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px;
  }
  .pm-send {
    display: flex;
    gap: 6px;
  }
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 35;
    background: transparent;
  }
  .ctx {
    position: fixed;
    z-index: 36;
  }
  .list-wrap {
    height: 220px;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .list-wrap.tall {
    height: 260px;
  }
  p {
    margin: 0;
  }
  code {
    font-size: 11px;
  }
</style>
