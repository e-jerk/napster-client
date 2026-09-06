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
        <div class="listview" style="max-height: 240px">
          <table>
            <thead>
              <tr>
                <th>Channel</th>
                <th>Users</th>
                <th>Topic</th>
              </tr>
            </thead>
            <tbody>
              {#each (app.channels.length ? app.channels : CHANNELS.map((c) => ({ name: c.name, users: 0, topic: c.topic }))) as c (c.name)}
                <tr
                  class:sel={app.chat.channel === c.name}
                  onclick={() => (app.chat.channel = c.name)}
                  ondblclick={() => {
                    client.join(c.name)
                    app.dialogs.join = false
                    app.view = 'chat'
                  }}
                >
                  <td>{c.name}</td>
                  <td>{c.users}</td>
                  <td>{c.topic}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <div class="btns">
          <span class="spacer"></span>
          <WinButton label="Cancel" onclick={() => (app.dialogs.join = false)} />
          <WinButton
            label="Join"
            onclick={() => {
              client.join(app.chat.channel)
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
        <div class="listview" style="max-height: 280px">
          <table>
            <thead>
              <tr>
                <th>Dir</th>
                <th>Type</th>
                <th>Name</th>
                <th>Payload</th>
              </tr>
            </thead>
            <tbody>
              {#each app.packets as p (p.id)}
                <tr>
                  <td>{p.dir}</td>
                  <td>{p.type}</td>
                  <td>{p.name}</td>
                  <td>{p.payload}</td>
                </tr>
              {/each}
            </tbody>
          </table>
          {#if !app.packets.length}
            <div class="empty-hint">Connect to see framed Napster messages on the virtual TCP stack.</div>
          {/if}
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
        <div class="listview" style="max-height: 280px">
          <table>
            <thead>
              <tr>
                <th>Filename</th>
                <th>Size</th>
                <th>Bitrate</th>
                <th>Length</th>
              </tr>
            </thead>
            <tbody>
              {#each app.browse.files as f, i (`${f.filename}-${i}`)}
                <tr
                  ondblclick={() => {
                    client.download({
                      id: `br-${i}`,
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
                  }}
                >
                  <td>{f.filename}</td>
                  <td>{formatSize(f.size)}</td>
                  <td>{formatBitrate(f.bitrate)}</td>
                  <td>{formatDuration(f.duration)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
          {#if !app.browse.files.length}
            <div class="empty-hint">Waiting for browse results…</div>
          {/if}
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
  p {
    margin: 0;
  }
  code {
    font-size: 11px;
  }
</style>
