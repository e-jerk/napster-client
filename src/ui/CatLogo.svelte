<script lang="ts">
  let { compact = false }: { compact?: boolean } = $props()
</script>

<div class="logo" class:compact aria-hidden="true">
  <svg viewBox="0 0 72 64" width={compact ? 18 : 56} height={compact ? 16 : 50}>
    <ellipse cx="36" cy="38" rx="22" ry="18" fill="#d9a066" />
    <path d="M16 34c1-16 8-28 13-28 4 0 5 6 7 14 2-8 3-14 7-14 5 0 12 12 13 28" fill="#c4864a" />
    <path d="M22 18l8 14H16z" fill="#e8b87a" />
    <path d="M50 18l-8 14h14z" fill="#e8b87a" />
    <circle cx="28" cy="36" r="5" fill="#1a7a2a" />
    <circle cx="44" cy="36" r="5" fill="#1a7a2a" />
    <circle cx="29.4" cy="34.6" r="1.6" fill="#fff" />
    <circle cx="45.4" cy="34.6" r="1.6" fill="#fff" />
    <ellipse cx="36" cy="44" rx="2.4" ry="1.5" fill="#7a3c2a" />
    <path d="M36 45.4c-3 3-6 3-8 1" stroke="#7a3c2a" fill="none" stroke-width="1" />
    <path d="M36 45.4c3 3 6 3 8 1" stroke="#7a3c2a" fill="none" stroke-width="1" />
    <path
      d="M10 28c0-7 6-12 13-10 3-6 8-9 13-5 5-4 10-1 13 5 7-2 13 3 13 10v8c0 5-4 8-8 8h-3V32c0-9-5-16-12-16s-12 7-12 16v12h-3c-4 0-8-3-8-8v-8z"
      fill="#1e4ea8"
    />
    <rect x="7" y="26" width="8" height="13" rx="3.5" fill="#1e4ea8" />
    <rect x="57" y="26" width="8" height="13" rx="3.5" fill="#1e4ea8" />
  </svg>
  {#if !compact}
    <span class="word">napster</span>
  {/if}
</div>

<style>
  .logo {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .word {
    font: italic 700 28px/1 Georgia, 'Times New Roman', serif;
    color: #1e4ea8;
    letter-spacing: -0.5px;
  }
  .compact {
    gap: 0;
  }
</style>
