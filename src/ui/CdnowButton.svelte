<script lang="ts">
  import { cmdShop } from '../lib/commands'
  import { iconUrl } from '../lib/icons'
</script>

<button class="cdnow" type="button" title="Shop for music at CDNOW — http://shop.napster.com" onclick={() => cmdShop()}>
  <img class="mark" src={iconUrl('cdnow')} width="50" height="12" alt="CDNOW" draggable="false" />
  <span class="sub">Shop for music at</span>
</button>

<style>
  .cdnow {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 72px;
    height: 48px;
    padding: 4px 8px;
    background: #000080;
    box-shadow:
      inset -1px -1px 0 #000040,
      inset 1px 1px 0 #3d5aa8;
    color: #fff;
    font-weight: 700;
    line-height: 1.1;
  }
  .mark {
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    width: 50px;
    height: 12px;
  }
  .sub {
    font-size: 8px;
    font-weight: 600;
    color: #ffcc00;
    margin-top: 3px;
  }
  .cdnow:active {
    box-shadow: inset 1px 1px 0 #000040;
  }
</style>
