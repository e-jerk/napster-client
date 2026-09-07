<script lang="ts">
  import { cmdHelp, cmdShop, cmdView } from '../lib/commands'
  import { app } from '../lib/session.svelte'
  import WinButton from '../ui/WinButton.svelte'

  const posts = [
    {
      date: 'July 2, 2001',
      title: 'File transfers temporarily suspended',
      body: 'File transfers have been temporarily suspended while Napster upgrades the databases that support our new file identification technology. Keep checking this space for updates. (Quoted from the July 2001 community bulletin — this hub still serves the original demo catalog.)',
    },
    {
      date: 'June 27, 2001',
      title: 'You must use Napster 2.0 BETA 10.3',
      body: 'We launched our new application using file identification last week. As of Wednesday, June 27, we are no longer supporting earlier versions. The server message was: You must upgrade your client at http://www.napster.com/',
    },
    {
      date: 'June 2001',
      title: 'Shop for music at CDNOW',
      body: 'Click the yellow CDNOW button to buy the CD when you hear something you love. The button shipped in 2.0 beta 9 and stayed through 10.3.',
    },
  ]
</script>

<div class="home">
  <div class="hero raised">
    <div>
      <h2>Napster Music Community</h2>
      <p>
        Home is the bulletin the 2.0 client opened onto — what Napster was up to that week. You are
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
    <span class="hint">Sharing {app.library.length} files from this library.</span>
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
