<script lang="ts">
  import { DISCOVER } from '../lib/catalog'
  import { cmdShop, cmdView } from '../lib/commands'
  import { app } from '../lib/session.svelte'
  import WinButton from '../ui/WinButton.svelte'

  function searchArtist(artist: string) {
    app.search.artist = artist
    app.search.title = ''
    cmdView('search')
  }
</script>

<div class="disc">
  <p>
    Discover lists independent artists who promoted themselves through Napster. The 2.0 client
    refreshed this pane daily. Titles here are original demo recordings from the in-browser catalog.
  </p>
  <div class="grid">
    {#each DISCOVER as d (d.artist)}
      <article class="raised">
        <div class="genre">{d.genre}</div>
        <h3>{d.artist}</h3>
        <p>{d.blurb}</p>
        <div class="row">
          <WinButton label="Find It!" small onclick={() => searchArtist(d.artist)} />
          <WinButton label="CDNOW" small onclick={() => cmdShop()} />
        </div>
      </article>
    {/each}
  </div>
</div>

<style>
  .disc {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 8px;
  }
  p {
    margin: 0 0 8px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 8px;
  }
  article {
    padding: 8px 10px 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  h3 {
    margin: 0;
    font-size: 13px;
  }
  .genre {
    color: #000080;
    font-size: 10px;
    font-weight: 700;
  }
  .row {
    display: flex;
    gap: 6px;
    margin-top: 4px;
  }
</style>
