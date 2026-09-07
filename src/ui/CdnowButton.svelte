<script lang="ts">
  import { cmdShop } from '../lib/commands'
</script>

<button class="cdnow" type="button" title="Shop for music at CDNOW — http://shop.napster.com" onclick={() => cmdShop()}>
  <span class="mark">CDNOW</span>
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
    background: #0b1a6e;
    box-shadow:
      inset -1px -1px 0 #000040,
      inset 1px 1px 0 #3d5aa8;
    color: #fff;
    font-weight: 700;
    line-height: 1.1;
  }
  .mark {
    font-size: 12px;
    letter-spacing: 0.6px;
  }
  .sub {
    font-size: 8px;
    font-weight: 600;
    color: #ffcc00;
  }
  .cdnow:active {
    box-shadow: inset 1px 1px 0 #000040;
  }
</style>
