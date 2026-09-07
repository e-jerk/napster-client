<script lang="ts">
  import { cmdShop } from '../lib/commands'
</script>

<button class="cdnow" type="button" title="Shop for music at CDNOW" onclick={() => cmdShop()}>
  <span class="mark">CDNOW</span>
  <span class="sub">Buy the CD</span>
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
    background: linear-gradient(#fff6c8, #f0c000);
    box-shadow:
      inset -1px -1px 0 #806000,
      inset 1px 1px 0 #fff8d0;
    color: #9b0000;
    font-weight: 700;
    line-height: 1.1;
  }
  .mark {
    font-size: 12px;
    letter-spacing: 0.4px;
  }
  .sub {
    font-size: 9px;
    font-weight: 600;
    color: #333;
  }
  .cdnow:active {
    box-shadow: inset 1px 1px 0 #806000;
  }
</style>
