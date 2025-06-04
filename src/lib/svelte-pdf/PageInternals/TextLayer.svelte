<script lang="ts">
  import { browser } from '$app/environment';
  import type { PageViewport, PDFPageProxy, TextLayer as RenderTask } from 'pdfjs-dist';
  import type { Writable } from 'svelte/store';
  import type { PDFHandler } from '../index';

  export let container: HTMLDivElement;
  export let handler: Writable<PDFHandler>;
  export let page: PDFPageProxy;
  export let viewport: PageViewport;

  let render_task: RenderTask;
  let prevViewport: PageViewport | null = null;

  async function render_text_layer() {
    render_task?.cancel();
    while (container.firstChild) container.firstChild.remove();
    const { TextLayer } = $handler.pdfjs;

    // TODO(ariel): make this not a hack
    const HACK_SCALE_FACTOR = 1.01;

    container.style.setProperty(
      '--scale-factor',
      `${(viewport.scale * HACK_SCALE_FACTOR) / (window.devicePixelRatio || 1)}`
    );

    render_task = new TextLayer({
      container,
      textContentSource: page.streamTextContent(),
      viewport
    });

    try {
      await render_task.render();
    } catch (err: any) {
      // Ignore AbortException - this is expected when render is cancelled
      if (err?.name !== 'AbortException') {
        console.error('Error rendering text layer:', err);
        throw err;
      }
    }
  }

  $: {
    if (browser && container && viewport && (!prevViewport || viewport !== prevViewport)) {
      render_text_layer().catch((err) => {
        // Only log non-cancellation errors
        if (err?.name !== 'AbortException') {
          console.error('Error in text layer render:', err);
        }
      });
      prevViewport = viewport;
    }
  }
</script>

<div class="text-layer" bind:this={container} data-testid="pdf-text-layer" />

<style>
  .text-layer {
    position: absolute;
    inset: 0;
    overflow: clip;
    opacity: 0.2;
    line-height: 1;
    margin: 0 auto;
  }

  .text-layer > :global(span) {
    color: transparent;
    position: absolute;
    white-space: pre;
    cursor: text;
    transform-origin: 0% 0%;
  }
</style>
