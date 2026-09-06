<script lang="ts">
  let { title, children }: { title: string; children: import('svelte').Snippet } = $props()
</script>

<section class="group">
  <div class="group-title">{title}</div>
  {@render children()}
</section>
