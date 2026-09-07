<script lang="ts">
  import { CLIENT_HOME } from '../lib/menus'
  import { cmdHelp, cmdShop, cmdView } from '../lib/commands'
  import { app } from '../lib/session.svelte'
  import WinButton from '../ui/WinButton.svelte'

  const posts = [
    {
      date: 'July 2, 2001',
      title: 'File transfers temporarily suspended',
      body: 'File transfers have been temporarily suspended while Napster upgrades the databases that support our new file identification technology. Keep checking this space for updates.',
    },
    {
      date: 'June 27, 2001',
      title: 'You must use Napster 2.0 BETA 10.3',
      body: 'We launched our new application using file identification last week. As of Wednesday, June 27, we are no longer supporting earlier versions. You must upgrade your client at http://www.napster.com/',
    },
    {
      date: 'January 11, 2001',
      title: 'Shop for music at CDNOW',
      body: 'Actions → Shop for Music at CDNOW and the toolbar wordmark open http://shop.napster.com (Bertelsmann / CDNOW, shipped in beta 9). BITMAP 452 in napster.exe is the 50×12 CDNOW mark.',
    },
  ]
</script>

<div class="home">
  <div class="url raised">
    <span class="proto">http://</span>
    <span class="addr">{CLIENT_HOME.replace('http://', '')}</span>
  </div>
  <div class="hero raised">
    <div>
      <h2>Napster Music Community</h2>
      <p>
        Home is the embedded IE pane from napster.exe — what Napster was up to that week. You are
        {app.connected ? `online as ${app.nick}` : 'offline'}.
      </p>
    </div>
    <div class="hero-btns">
      <WinButton label="Search" onclick={() => cmdView('search')} />
      <WinButton label="Discover" onclick={() => cmdView('discover')} />
      <WinButton label="CDNOW" onclick={() => cmdShop()} />
    </div>
  </div>
  <div class="posts">
    {#each posts as p (p.title)}
      <article class="sunken">
        <div class="meta">{p.date}</div>
        <h3>{p.title}</h3>
        <p>{p.body}</p>
      </article>
    {/each}
  </div>
  <div class="row">
    <WinButton label="Getting Started" small onclick={() => cmdHelp('start')} />
    <WinButton label="FAQ" small onclick={() => cmdHelp('faq')} />
    <span class="hint">Sharing {app.library.length} files from My Files.</span>
  </div>
</div>

<style>
  .home {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px;
    overflow: auto;
  }
  .url {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    font-size: 11px;
    background: #fff;
  }
  .proto {
    color: #808080;
  }
  .addr {
    color: #000080;
  }
  .hero {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    align-items: center;
  }
  .hero-btns {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  h2,
  h3,
  p {
    margin: 0;
  }
  h2 {
    font-size: 14px;
  }
  h3 {
    font-size: 12px;
    margin: 2px 0 4px;
  }
  .posts {
    display: grid;
    gap: 8px;
  }
  article {
    padding: 8px 10px;
    background: #fff;
  }
  .meta {
    color: #404040;
    font-size: 10px;
  }
  .row {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .hint {
    margin-left: auto;
    color: #404040;
  }
</style>
