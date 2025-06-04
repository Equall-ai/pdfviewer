<script lang="ts">
  import { browser } from '$app/environment';
  import { createPDFHandler, SpreadsheetHandler } from '$lib/svelte-pdf';
  import { onMount, setContext } from 'svelte';
  import { writable } from 'svelte/store';

  const handler = writable(null);
  const PageCanvas = writable(null);
  const spreadSheetHandler = writable<SpreadsheetHandler>(new SpreadsheetHandler());
  
  setContext('equall_svelte_pdfjs_page_canvas', PageCanvas);
  setContext('equall_svelte_pdfjs_handler', handler);
  setContext('equall_svelte_spreadsheet_handler', spreadSheetHandler);

  onMount(async () => {
    if (!import.meta.env.SSR) {
      const _handler = await createPDFHandler();
      handler.set(_handler);

      const _pageCanvas = await import('../lib/svelte-pdf/PageInternals/PageCanvas.svelte');
      PageCanvas.set(_pageCanvas.default);
    }
  });
</script>

<svelte:head>
  <title>PDF Viewer</title>
</svelte:head>

<slot />

<style lang="postcss" global>
  html,
  body {
    width: 100%;
    height: 100%;
    padding: 0;
    margin: 0;
    overflow: hidden;
  }
</style>