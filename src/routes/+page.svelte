<script lang="ts">
  import DocRenderer from '$lib/components/documents/DocRenderer.svelte';
</script>

<div class="w-full h-screen flex flex-col overflow-hidden">
  <div class="flex-1 overflow-auto">
    <DocRenderer url="/files/R-0706.pdf" />
  </div>
</div>
