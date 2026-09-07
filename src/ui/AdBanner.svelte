<script lang="ts">
  import { BANNERS } from '../lib/ads'
  import { cmdAbout, cmdShop, cmdView } from '../lib/commands'

  let i = $state(0)
  const ad = $derived(BANNERS[i % BANNERS.length]!)

  $effect(() => {
    const id = setInterval(() => {
      i = (i + 1) % BANNERS.length
    }, 8000)
    return () => clearInterval(id)
  })

  function click() {
    if (ad.action === 'shop') cmdShop()
    else if (ad.action === 'discover') cmdView('discover')
    else if (ad.action === 'home') cmdView('home')
    else if (ad.action === 'amp') cmdAbout()
    else if (ad.href) window.open(ad.href, '_blank', 'noreferrer')
  }
</script>

<button
  class="ad-banner"
  type="button"
  style:background={ad.colors.bg}
  style:color={ad.colors.fg}
  onclick={click}
  title="From napster.exe — Home/Discover HTML and shop.napster.com, not a live ad network"
>
  <span class="kicker" style:color={ad.colors.accent}>{ad.kicker}</span>
  <span class="copy">
    <strong>{ad.title}</strong>
    <em>{ad.line}</em>
  </span>
  <span class="dots" aria-hidden="true">
    {#each BANNERS as b, n (b.id)}
      <i class:on={n === i % BANNERS.length}></i>
    {/each}
  </span>
</button>

<style>
  .ad-banner {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 50px;
    margin: 0 3px 3px;
    padding: 0 10px;
    border: 1px solid #000;
    text-align: left;
    cursor: pointer;
    overflow: hidden;
  }
  .kicker {
    font: 700 11px Tahoma, sans-serif;
    letter-spacing: 1px;
    flex: 0 0 auto;
  }
  .copy {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }
  .copy strong {
    font-size: 12px;
  }
  .copy em {
    font-style: normal;
    font-size: 10px;
    opacity: 0.9;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .dots {
    margin-left: auto;
    display: flex;
    gap: 4px;
  }
  .dots i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.35);
  }
  .dots i.on {
    background: #fff;
  }
</style>
