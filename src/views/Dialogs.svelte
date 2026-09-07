<script lang="ts">
  import { SHOP_SNAPSHOT } from '../lib/ads'
  import { CHANNELS, DISCOVER } from '../lib/catalog'
  import { addIgnore, removeIgnore } from '../lib/commands'
  import { SHOP_NAPSTER } from '../lib/menus'
  import { formatBitrate, formatDuration, formatSize, speedLabel } from '../lib/format'
  import { HELP } from '../lib/help'
  import { servedFromOpenNap } from '../lib/hub'
  import { client, ensureDemoHub } from '../lib/network'
  import { app } from '../lib/session.svelte'
  import { SPEEDS } from '../lib/types'
  import CatLogo from '../ui/CatLogo.svelte'
  import TitleBar from '../ui/TitleBar.svelte'
  import WinButton from '../ui/WinButton.svelte'
  import WinGroup from '../ui/WinGroup.svelte'
  import WinInput from '../ui/WinInput.svelte'
  import WinListView from '../ui/WinListView.svelte'
  import WinSelect from '../ui/WinSelect.svelte'

  const speedOpts = SPEEDS.map((s) => ({ value: s.id, label: s.label }))
  const hubOpts = [
    { value: 'wss', label: 'This OpenNAP server (WebSocket)' },
    { value: 'demo', label: 'In-browser demo hub' },
  ]
  const onOpenNap = servedFromOpenNap()

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
    void (async () => {
      if (app.hub === 'demo') await ensureDemoHub()
      await client.connect(nick, app.speed === 0 ? 4 : app.speed)
    })()
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
    if (kind === 'whois' && arg) client.say(`/whois ${arg}`)
    if (kind === 'ignore' && arg) {
      addIgnore(arg)
      if (app.connected) client.say(`/ignore ${arg}`)
    }
    if (kind === 'info' && arg) app.dialogs.userInfo = arg
    if (kind === 'clear') {
      app.search.results = []
      app.search.selected = null
    }
    if (kind === 'unignore' && arg) removeIgnore(arg)
    if (kind === 'removehot' && arg) client.removeHot(arg)
    if (kind === 'play' && arg) playLibrary(arg)
    if (kind === 'rename' && arg) renameLibrary(arg)
    if (kind === 'delete' && arg) deleteLibrary(arg)
    if (kind === 'refresh') app.status = 'Refresh and Sort — My Files list is current.'
    if (kind === 'paths' && arg) app.prefs.pathMode = arg as typeof app.prefs.pathMode
    if (kind === 'abort' && arg) client.abort(arg)
    if (kind === 'cancel' && arg) client.abort(arg)
    if (kind === 'clearfinished') client.clearFinished()
    if (kind === 'force' && arg) {
      const t = app.transfers.find((x) => x.id === arg)
      if (t) app.status = `Force Transfer — still queued from ${t.nick}.`
    }
    if (kind === 'xferplay' && arg) {
      const t = app.transfers.find((x) => x.id === arg)
      if (t?.blob) {
        if (app.player.url) URL.revokeObjectURL(app.player.url)
        app.player.url = URL.createObjectURL(t.blob)
        app.player.title = t.filename
        app.player.playing = true
        app.view = 'library'
      } else app.status = 'Download has not yet started, we are still getting file-transfer information!'
    }
  }

  function playLibrary(id: string) {
    const item = app.library.find((f) => f.id === id)
    if (!item?.blob) return
    if (app.player.url) URL.revokeObjectURL(app.player.url)
    app.player.url = URL.createObjectURL(item.blob)
    app.player.id = item.id
    app.player.title = `${item.artist} — ${item.title}`
    app.player.playing = true
  }

  function renameLibrary(id: string) {
    const item = app.library.find((f) => f.id === id)
    if (!item) return
    const next = window.prompt('New file name:', item.filename)
    if (!next?.trim()) return
    item.filename = next.trim()
    app.library = app.library.slice()
  }

  function deleteLibrary(id: string) {
    const item = app.library.find((f) => f.id === id)
    if (!item) return
    if (app.prefs.promptDelete && !window.confirm(`Delete ${item.filename} from file list and disk?`)) return
    app.library = app.library.filter((f) => f.id !== id)
  }

  const userInfo = $derived.by(() => {
    const nick = app.dialogs.userInfo
    if (!nick) return null
    const hit = app.search.results.find((r) => r.nick === nick)
    const hot = app.hotlist.find((h) => h.nick === nick)
    const chat = app.chat.users.find((u) => u.nick === nick)
    return {
      nick,
      files: hit ? 1 : (hot?.files ?? chat?.files ?? 0),
      speed: hit?.speed ?? hot?.speed ?? chat?.speed ?? 0,
      ping: hit?.ping,
      online: Boolean(chat || hit || hot?.online),
      firewalled: hit?.firewalled ?? false,
    }
  })

  let ignoreNick = $state('')

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

{#if app.ui !== 'chat' && app.phase === 'setup'}
  <div class="dialog-backdrop">
    <div class="window dialog">
      <TitleBar title="Connection Information" buttons="close" onclose={() => (app.win.open = false)} />
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
            <WinButton label="<u>P</u>roxy Setup..." onclick={() => (app.dialogs.proxy = true)} />
          </div>
        </WinGroup>
        <div class="btns">
          <WinButton label="Help" onclick={() => (app.dialogs.help = 'start')} />
          <span class="spacer"></span>
          <WinButton label="Cancel" onclick={() => (app.win.open = false)} />
          <WinButton primary label="<u>N</u>ext &gt;" onclick={() => (app.phase = 'login')} />
        </div>
      </div>
    </div>
  </div>
{/if}

{#if app.ui !== 'chat' && app.phase === 'login'}
  <div class="dialog-backdrop">
    <div class="window dialog">
      <TitleBar title="Choose a Nickname" buttons="close" onclose={() => (app.phase = 'setup')} />
      <div class="body">
        <CatLogo />
        <p>
          {#if app.hub === 'wss'}
            Your nickname is how other users will see you on this OpenNAP hub. The client speaks
            classic Napster frames over WebSocket (<code>naps-1</code>).
          {:else}
            Your nickname is how other users will see you on the Napster network. The hub at
            napster.local:8888 is a zero-native OpenNap replica running in this browser.
          {/if}
        </p>
        <label class="row">
          <span>Connect to:</span>
          <WinSelect bind:value={app.hub} options={hubOpts} width="260px" />
        </label>
        <label class="row">
          <span>Nickname:</span>
          <WinInput bind:value={app.nick} width="220px" onenter={connect} />
        </label>
        {#if app.hub === 'wss'}
          <label class="row">
            <span>Password:</span>
            <WinInput bind:value={app.password} type="password" width="220px" placeholder="empty = new nick" onenter={connect} />
          </label>
          {#if !onOpenNap}
            <label class="row">
              <span>Server:</span>
              <WinInput bind:value={app.wssUrl} width="220px" placeholder="ws://host:8890/" onenter={connect} />
            </label>
          {/if}
          <p class="muted">The client asks the metaserver over HTTP/WSS, then pulls files from each peer over WebRTC into a folder you pick.</p>
        {:else}
          <label class="row">
            <span>Email:</span>
            <WinInput bind:value={app.email} width="220px" placeholder="optional" />
          </label>
        {/if}
        {#if app.error}
          <p class="err">{app.error}</p>
        {/if}
        <div class="btns">
          <WinButton label="&lt; Back" onclick={() => (app.phase = 'setup')} />
          <span class="spacer"></span>
          <WinButton label="Cancel" onclick={() => (app.win.open = false)} />
          <WinButton primary label="Connect" onclick={connect} />
        </div>
      </div>
    </div>
  </div>
{/if}

{#if app.ui !== 'chat' && app.phase === 'connecting'}
  <div class="dialog-backdrop">
    <div class="window dialog slim">
      <TitleBar title="Napster" />
      <div class="body">
        <p>Logging into {app.hub === 'wss' ? app.wssUrl : 'napster.local:8888'}…</p>
        <p class="muted">{app.status}</p>
      </div>
    </div>
  </div>
{/if}

{#if app.dialogs.proxy}
  <div class="dialog-backdrop" style:z-index="30">
    <div class="window dialog slim">
      <TitleBar title="Proxy Setup" buttons="close" onclose={() => (app.dialogs.proxy = false)} />
      <div class="body">
        <p>SOCKS settings are stored only in this page. The zero-native bridge never leaves the browser, so a proxy is not used.</p>
        <label class="row"><span>Host</span><WinInput bind:value={app.proxy.host} width="180px" /></label>
        <label class="row"><span>Port</span><WinInput bind:value={app.proxy.port} width="80px" /></label>
        <div class="btns">
          <span class="spacer"></span>
          <WinButton primary label="OK" onclick={() => (app.dialogs.proxy = false)} />
        </div>
      </div>
    </div>
  </div>
{/if}

{#if app.dialogs.join}
  <div class="dialog-backdrop">
    <div class="window dialog">
      <TitleBar title="Napster Chat Rooms" buttons="close" onclose={() => (app.dialogs.join = false)} />
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
            primary
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

{#if app.dialogs.preferences}
  <div class="dialog-backdrop">
    <div class="window dialog">
      <TitleBar title="Napster Preferences" buttons="close" onclose={() => (app.dialogs.preferences = false)} />
      <div class="body">
        <div class="tabs">
          <button class:on={app.dialogs.prefTab === 'personal'} onclick={() => (app.dialogs.prefTab = 'personal')}>Personal</button>
          <button class:on={app.dialogs.prefTab === 'chat'} onclick={() => (app.dialogs.prefTab = 'chat')}>Chat</button>
          <button class:on={app.dialogs.prefTab === 'transfer'} onclick={() => (app.dialogs.prefTab = 'transfer')}>Transfer</button>
          <button class:on={app.dialogs.prefTab === 'proxy'} onclick={() => (app.dialogs.prefTab = 'proxy')}>Proxy</button>
          <button class:on={app.dialogs.prefTab === 'files'} onclick={() => (app.dialogs.prefTab = 'files')}>My Files</button>
        </div>
        {#if app.dialogs.prefTab === 'personal'}
          <WinGroup title="Personal">
            <label class="row"><span>User Name:</span><WinInput bind:value={app.nick} width="180px" /></label>
            <label class="row"><span>E-Mail Address:</span><WinInput bind:value={app.email} width="180px" /></label>
            <label class="row">
              <span>Connection Type:</span>
              <WinSelect bind:value={app.speed} options={speedOpts} width="180px" />
            </label>
            <label class="row">
              <input type="radio" name="player" checked={app.player.internal} onchange={() => (app.player.internal = true)} />
              <span>Napster Internal Player</span>
            </label>
            <label class="row">
              <input type="radio" name="player" checked={!app.player.internal} onchange={() => (app.player.internal = false)} />
              <span>Default Media Player</span>
            </label>
            <label class="row">
              <input type="checkbox" bind:checked={app.prefs.beepDownload} />
              <span>Beep when each Download completes</span>
            </label>
            <label class="row">
              <input type="checkbox" bind:checked={app.prefs.beepUpload} />
              <span>Beep when each Upload completes</span>
            </label>
          </WinGroup>
        {:else if app.dialogs.prefTab === 'chat'}
          <WinGroup title="Chat">
            <label class="row">
              <input type="checkbox" bind:checked={app.prefs.autoJoinChat} />
              <span>Automatically join my previous chat rooms when signing on to Napster.</span>
            </label>
            <label class="row">
              <input type="checkbox" bind:checked={app.prefs.filterOffensive} />
              <span>Do not display offensive words in private messages or public chat rooms.</span>
            </label>
            <label class="row">
              <input type="checkbox" bind:checked={app.prefs.separatePM} />
              <span>Display my incoming private messages in separate windows.</span>
            </label>
            <label class="row">
              <input type="checkbox" bind:checked={app.prefs.notifyJoinLeave} />
              <span>Display notification when a user enters or exits a chat room.</span>
            </label>
          </WinGroup>
        {:else if app.dialogs.prefTab === 'transfer'}
          <WinGroup title="Folder for Downloading and Sharing">
            <p class="muted">Pick a share folder (or files) and a download folder. Browser peers move bytes over WebRTC; the hub only relays signaling.</p>
            <label class="row">
              <span>Maximum simultaneous inbound transfers:</span>
              <WinInput bind:value={app.prefs.maxInbound} width="48px" />
            </label>
            <label class="row">
              <span>Maximum simultaneous outbound transfers per user:</span>
              <WinInput bind:value={app.prefs.maxOutbound} width="48px" />
            </label>
            <label class="row">
              <input type="checkbox" bind:checked={app.prefs.deletePartial} />
              <span>Delete partial files when download fails</span>
            </label>
            <label class="row">
              <input type="checkbox" bind:checked={app.prefs.removeSuccessful} />
              <span>Remove successful downloads from transfer window</span>
            </label>
            <label class="row">
              <span>Share files with Napster users on TCP port:</span>
              <WinInput bind:value={app.prefs.dataPort} width="64px" />
            </label>
            <label class="row">
              <input type="checkbox" bind:checked={app.prefs.firewalled} />
              <span>I am behind a firewall that restricts inbound TCP and I can do nothing about it.</span>
            </label>
          </WinGroup>
        {:else if app.dialogs.prefTab === 'proxy'}
          <WinGroup title="Proxy">
            <p class="muted">WARNING: If you have NO IDEA what a 'Proxy' is, leave these settings alone!</p>
            <label class="row">
              <span>Proxy Type:</span>
              <WinSelect
                bind:value={app.proxy.transfer}
                options={[
                  { value: 'direct', label: 'No proxy server' },
                  { value: 'proxy4', label: 'SOCKS 4 proxy server' },
                  { value: 'proxy5', label: 'SOCKS 5 proxy server' },
                ]}
                width="200px"
              />
            </label>
            <label class="row"><span>Proxy Server:</span><WinInput bind:value={app.proxy.host} width="180px" /></label>
            <label class="row"><span>Proxy Port:</span><WinInput bind:value={app.proxy.port} width="80px" /></label>
            <label class="row"><span>Proxy User Name:</span><WinInput bind:value={app.proxy.user} width="180px" /></label>
            <p class="muted">SOCKS is stored only. The zero-native stack never leaves the browser.</p>
          </WinGroup>
        {:else}
          <WinGroup title="My Files">
            <p>When deleting files:</p>
            <label class="row">
              <input type="radio" name="del" checked={app.prefs.promptDelete} onchange={() => (app.prefs.promptDelete = true)} />
              <span>Prompt me to confirm each file deletion.</span>
            </label>
            <label class="row">
              <input type="radio" name="del" checked={!app.prefs.promptDelete} onchange={() => (app.prefs.promptDelete = false)} />
              <span>Do not prompt me, go ahead and delete the file.</span>
            </label>
            <p>Display files by:</p>
            <label class="row">
              <input type="radio" name="path" checked={app.prefs.pathMode === 'filename'} onchange={() => (app.prefs.pathMode = 'filename')} />
              <span>Filename Only (without the path specifier).</span>
            </label>
            <label class="row">
              <input type="radio" name="path" checked={app.prefs.pathMode === 'partial'} onchange={() => (app.prefs.pathMode = 'partial')} />
              <span>Partial Path (one directory and filename).</span>
            </label>
            <label class="row">
              <input type="radio" name="path" checked={app.prefs.pathMode === 'full'} onchange={() => (app.prefs.pathMode = 'full')} />
              <span>Full Path (e.g.: "C:\Program Files\Napster\My Files\File.mp3").</span>
            </label>
          </WinGroup>
        {/if}
        <div class="btns">
          <span class="spacer"></span>
          <WinButton primary label="OK" onclick={() => (app.dialogs.preferences = false)} />
        </div>
      </div>
    </div>
  </div>
{/if}

{#if app.dialogs.ignore}
  <div class="dialog-backdrop">
    <div class="window dialog slim">
      <TitleBar title="Ignore List" buttons="close" onclose={() => (app.dialogs.ignore = false)} />
      <div class="body">
        <p>Public chat from these nicknames is hidden. Instant messages still arrive.</p>
        <div class="list-wrap" style="height: 140px">
          {#if app.ignore.length}
            {#each app.ignore as n (n)}
              <button class="ignore-row" onclick={() => (ignoreNick = n)}>{n}</button>
            {/each}
          {:else}
            <p class="muted">No ignored users.</p>
          {/if}
        </div>
        <div class="btns">
          <WinInput bind:value={ignoreNick} width="140px" placeholder="nickname" />
          <WinButton label="Add" onclick={() => { addIgnore(ignoreNick); ignoreNick = '' }} />
          <WinButton label="Remove" disabled={!ignoreNick} onclick={() => { removeIgnore(ignoreNick); ignoreNick = '' }} />
          <WinButton label="Clear" disabled={!app.ignore.length} onclick={() => (app.ignore = [])} />
          <span class="spacer"></span>
          <WinButton primary label="Close" onclick={() => (app.dialogs.ignore = false)} />
        </div>
      </div>
    </div>
  </div>
{/if}

{#if app.dialogs.logon}
  <div class="dialog-backdrop">
    <div class="window dialog slim">
      <TitleBar title="Logon Server" buttons="close" onclose={() => (app.dialogs.logon = false)} />
      <div class="body">
        <p>Enter the IP-address and port specification of a Napster Server and press "OK".</p>
        <label class="row"><span>Server:</span><WinInput bind:value={app.logon.host} width="180px" /></label>
        <label class="row"><span>Port:</span><WinInput bind:value={app.logon.port} width="80px" /></label>
        <p class="muted">Last logged-in Server: {app.hub === 'wss' ? app.wssUrl : 'napster.local:8888'}</p>
        <div class="btns">
          <span class="spacer"></span>
          <WinButton label="Cancel" onclick={() => (app.dialogs.logon = false)} />
          <WinButton
            primary
            label="OK"
            onclick={() => {
              const host = app.logon.host.trim()
              const port = app.logon.port.trim()
              if (host === 'napster.local' || host === 'demo') {
                app.hub = 'demo'
              } else {
                app.hub = 'wss'
                app.wssUrl = host.includes('://') ? host : `ws://${host}:${port || '8888'}/`
              }
              app.dialogs.logon = false
              app.status = `Logon Server set to ${host}:${port}`
            }}
          />
        </div>
      </div>
    </div>
  </div>
{/if}

{#if app.dialogs.feedback}
  <div class="dialog-backdrop">
    <div class="window dialog">
      <TitleBar title="Send Us Some Feedback!" buttons="close" onclose={() => (app.dialogs.feedback = false)} />
      <div class="body">
        <p>Your feedback helps make Napster a better product, please drop us a line with your comments and criticisms:</p>
        <textarea class="feedback" bind:value={app.feedback} rows="6"></textarea>
        <p class="muted">The original client mailed this to mail.napster.com with subject “napster {app.nick} feedback.” Nothing leaves this tab.</p>
        <div class="btns">
          <WinButton label="Clear" onclick={() => (app.feedback = '')} />
          <span class="spacer"></span>
          <WinButton label="Cancel" onclick={() => (app.dialogs.feedback = false)} />
          <WinButton
            primary
            label="Submit"
            onclick={() => {
              app.status = app.feedback.trim()
                ? `Feedback queued for mail.napster.com (not sent): ${app.feedback.trim().slice(0, 60)}`
                : 'Write something first.'
              if (app.feedback.trim()) {
                app.feedback = ''
                app.dialogs.feedback = false
              }
            }}
          />
        </div>
      </div>
    </div>
  </div>
{/if}

{#if app.dialogs.shop}
  <div class="dialog-backdrop">
    <div class="window dialog">
      <TitleBar title="Shop for music at CDNOW" buttons="close" onclose={() => (app.dialogs.shop = false)} />
      <div class="body">
        <div class="shop-hero">
          <strong>CDNOW</strong>
          <span>Heard it on Napster? Buy the CD.</span>
        </div>
        <p>
          napster.exe opens <code>{SHOP_NAPSTER}</code> from Actions → Shop for Music at CDNOW and
          from BITMAP 452 (the 50×12 CDNOW wordmark). These titles are original demo albums, not store SKUs.
        </p>
        <ul class="shop-list">
          {#each DISCOVER as d (d.artist)}
            <li><b>{d.artist}</b> — {d.genre}. {d.blurb}</li>
          {/each}
        </ul>
        <div class="btns">
          <WinButton
            label="Open shop.napster.com (archive.org)"
            onclick={() => window.open(SHOP_SNAPSHOT, '_blank', 'noreferrer')}
          />
          <span class="spacer"></span>
          <WinButton primary label="Close" onclick={() => (app.dialogs.shop = false)} />
        </div>
      </div>
    </div>
  </div>
{/if}

{#if userInfo}
  <div class="dialog-backdrop">
    <div class="window dialog slim">
      <TitleBar title="User Information — {userInfo.nick}" buttons="close" onclose={() => (app.dialogs.userInfo = null)} />
      <div class="body">
        <div class="row"><span>Nickname</span><b>{userInfo.nick}</b></div>
        <div class="row"><span>Connection</span><span>{speedLabel(userInfo.speed)}</span></div>
        <div class="row"><span>Files</span><span>{userInfo.files}</span></div>
        {#if userInfo.ping != null}
          <div class="row"><span>Ping</span><span>{userInfo.ping} ms</span></div>
        {/if}
        <div class="row"><span>Status</span><span>{userInfo.online ? 'Online' : 'Offline'}</span></div>
        <div class="row"><span>Firewall</span><span>{userInfo.firewalled ? 'Firewalled (push)' : 'Direct'}</span></div>
        <div class="btns">
          <WinButton label="Hot List" onclick={() => { client.addHot(userInfo.nick); app.dialogs.userInfo = null }} />
          <WinButton label="Message" onclick={() => { client.msg(userInfo.nick, ''); app.dialogs.userInfo = null }} />
          <span class="spacer"></span>
          <WinButton primary label="OK" onclick={() => (app.dialogs.userInfo = null)} />
        </div>
      </div>
    </div>
  </div>
{/if}

{#if app.dialogs.help}
  <div class="dialog-backdrop">
    <div class="window dialog">
      <TitleBar title={HELP[app.dialogs.help].title} buttons="close" onclose={() => (app.dialogs.help = null)} />
      <div class="body">
        {#each HELP[app.dialogs.help].body as para (para.slice(0, 40))}
          <p>{para}</p>
        {/each}
        <div class="btns">
          <WinButton label="Getting Started" small onclick={() => (app.dialogs.help = 'start')} />
          <WinButton label="FAQ" small onclick={() => (app.dialogs.help = 'faq')} />
          <span class="spacer"></span>
          <WinButton primary label="OK" onclick={() => (app.dialogs.help = null)} />
        </div>
      </div>
    </div>
  </div>
{/if}

{#if app.dialogs.about}
  <div class="dialog-backdrop">
    <div class="window dialog">
      <TitleBar title="About Napster" buttons="close" onclose={() => (app.dialogs.about = false)} />
      <div class="body">
        <CatLogo />
        <p><b>BETA 10.3 Napster Client Application</b></p>
        <p>This is the Napster Music Community Client software for Windows (web recreation).</p>
        <p>
          Original Windows client preserved at
          <a href="https://archive.org/details/napv2b10-3" target="_blank" rel="noreferrer">archive.org/details/napv2b10-3</a>
          as <code>napv2b10-3.exe</code> (2,044,147 bytes). VISE overlay unpacked to
          <code>napster.exe</code> (581,632 bytes, MD5 6d121b97…).
        </p>
        <p>
          MP3 playback/decoding by AMP. Source and object code Copyright 1996–2001 PlayMedia
          Labs/PlayMedia Systems, Inc. (USA). For more information about AMP products, visit
          www.playmediasystems.com.
        </p>
        <p>
          Portions utilize Microsoft Windows Media Technologies. Audio fingerprint technology
          provided by Relatable™ (2001). This hub does not run that filter.
        </p>
        <p>Shared titles are original demo recordings, not commercial releases.</p>
        <div class="btns">
          <span class="spacer"></span>
          <WinButton primary label="OK" onclick={() => (app.dialogs.about = false)} />
        </div>
      </div>
    </div>
  </div>
{/if}

{#if app.dialogs.bridge}
  <div class="dialog-backdrop">
    <div class="window dialog wide">
      <TitleBar title="TCP Bridge — zero native" buttons="close" onclose={() => (app.dialogs.bridge = false)} />
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
      <TitleBar title="Browse — {app.browse.nick}" buttons="close" onclose={() => (app.browse.open = false)} />
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
    <TitleBar
      title="Private Message — {pm.nick}"
      buttons="close"
      onclose={() => (pm.open = false)}
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
    />
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
  .shop-hero {
    background: linear-gradient(#1a1a6e, #000040);
    color: #ffcc00;
    padding: 10px 12px;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-weight: 700;
  }
  .shop-hero span {
    color: #fff8d0;
    font-weight: 400;
    min-width: 0;
  }
  .shop-list {
    margin: 0;
    padding-left: 18px;
    max-height: 180px;
    overflow: auto;
  }
  .ignore-row {
    display: block;
    width: 100%;
    text-align: left;
    padding: 3px 6px;
    background: #fff;
  }
  .ignore-row:hover {
    background: var(--sel);
    color: var(--sel-text);
  }
  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0;
    border-bottom: 1px solid var(--sh);
  }
  .tabs button {
    padding: 3px 10px;
    background: var(--face);
    box-shadow: inset 1px 1px 0 var(--hl), inset -1px 0 0 var(--sh);
  }
  .tabs button.on {
    background: #fff;
    font-weight: 700;
  }
  .feedback {
    width: 100%;
    min-height: 90px;
    font: inherit;
    background: #fff;
    border: 0;
    box-shadow: inset 1px 1px 0 var(--sh), inset -1px -1px 0 var(--hl);
    padding: 4px;
    resize: vertical;
  }
</style>
