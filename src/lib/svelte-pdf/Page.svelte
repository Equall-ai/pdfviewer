<script lang="ts">
  import type { PageViewport } from 'pdfjs-dist/types/src/display/display_utils.js';
  import { onDestroy, onMount } from 'svelte';
  import type { Writable } from 'svelte/store';
  import type { PDFHandler } from './index';
  import { getContext } from 'svelte';

  export let handler: Writable<PDFHandler>;
  export let renderer: 'canvas' | 'svg' = 'canvas';
  export let num: number;
  export let scale = 1 * ($handler?.zoom ?? 1);
  export let rotation = 0;
  export const renderTextLayer = false;

  export let getViewport: ((page: any, rotation: number) => PageViewport) | undefined = undefined;

  const PageCanvas = getContext('equall_svelte_pdfjs_page_canvas');

  // eslint-disable-next-line
  interface $$Events {
    pagerendersuccess: CustomEvent<any>;
    pagerendererror: CustomEvent<unknown>;
    pageannotation: CustomEvent<unknown>;
  }

  onDestroy(() => {
    if ($handler.current_page) {
      $handler.current_page.cleanup();
    }
  });

  let page: any;
  let viewport: PageViewport;
  let container: HTMLDivElement;

  // /* <========================================================================================> */

  handler.subscribe((_handler) => {
    if (_handler?.current_doc && _handler?.current_doc?.numPages > num) {
      _handler?.current_doc?.getPage(num + 1)?.then((p) => {
        page = p;
      });
    } else {
      page = null;
    }
  });

  $: _get_viewport = getViewport ?? ((p, r) => p.getViewport({ scale, rotation: r }));

  $: if (page) viewport = _get_viewport(page, rotation);

  let timer: ReturnType<typeof setTimeout> | undefined;

  onMount(() => {
    const resizeObserver = new ResizeObserver(() => {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        if (page) {
          viewport = _get_viewport(page, rotation);
        }
      }, 50);
    });

    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          handler.update((h) => {
            h.currentPage = num + 1;
            return h;
          });
        }
      });
    });

    intersectionObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  });
</script>

<div bind:this={container} data-testid={`pdf-page-${num}`}>
  {#if page && viewport}
    <svelte:component
      this={$PageCanvas}
      {handler}
      {page}
      {viewport}
      {num}
      on:pagerendersuccess
      on:pagerendererror
    />
  {/if}
</div>

<style>
</style>
