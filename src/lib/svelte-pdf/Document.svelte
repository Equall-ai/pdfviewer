<script lang="ts">
  import Page from './Page.svelte';
  import Wrap from './Wrap.svelte';
  import VirtualList from 'svelte-tiny-virtual-list';
  import type { Writable } from 'svelte/store';
  import type { PDFHandler } from './index';
  import { onMount, onDestroy, type Snippet } from 'svelte';
  interface Props {
    handler: Writable<PDFHandler>;
    file?: string | URL | undefined;
    loadOptions?: any | undefined;
    docHeader?: Snippet;
  }

  let { handler, file = undefined, loadOptions = undefined, docHeader }: Props = $props();

  let scale = $derived(1 * $handler?.zoom);
  let rotation = 0;
  let numPages = $state(0);
  let container: HTMLElement = $state();
  let pageHeights: number[] = $state([]);
  let listHeight = $state(0);
  let currentAnnotations: any[] = [];

  let scrollToIndex: number | undefined = $state();
  let scrollToAlignment: 'start' | 'center' | 'end' | 'auto' = 'start';
  let scrollToBehaviour: 'auto' | 'smooth' | 'instant' = 'instant';

  let isLoading = $state(true);
  function handleDocumentLoaded(event: CustomEvent<{ numPages: number }>) {
    isLoading = false;
    numPages = event.detail.numPages;
    handler.update((h) => {
      h.numPages = numPages;
      return h;
    });
    const containerHeight = container?.clientHeight ?? 0;
    listHeight = containerHeight;

    // Initialize page heights array
    pageHeights = Array(numPages).fill(1000); // Default height
    scrollToIndex = 0;
  }

  let hasError = $state(false);
  function handleDocumentError(_err) {
    hasError = true;
  }

  let hasScrolled = false;

  const PADDING_SIZE = 5;

  function calculateScrollOffset() {
    const virtualListWrapper = document.getElementsByClassName('virtual-list-wrapper')?.[0];
    if (!virtualListWrapper) return;
    const divSlot = virtualListWrapper?.querySelector('div.pdf-page') as HTMLElement;
    if (!divSlot) return;
    const height = divSlot.clientHeight - PADDING_SIZE;
    if ($handler.currentAnnotation === undefined) return;
    const [box] = $handler.annotations;
    if (!box) return;
    if (scrollToIndex == null) return;
    const top = (box.y1 / 100) * height + height * scrollToIndex + 1;
    virtualListWrapper?.scrollTo({ top, behavior: 'instant' });
  }

  function handleAfterScroll() {
    hasScrolled = true;
    scrollToIndex = undefined;
  }

  function getViewport(page: any) {
    if (!container) {
      return page.getViewport({ scale: 1 });
    }

    const virtualListWrapper = container.querySelector('.virtual-list-wrapper');
    let totalHorizontalSize = 0;
    if (virtualListWrapper) {
      const computedStyle = window.getComputedStyle(virtualListWrapper);
      const horizontalMargin =
        parseFloat(computedStyle.marginLeft) + parseFloat(computedStyle.marginRight);
      const horizontalPadding =
        parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight);
      const horizontalBorder =
        parseFloat(computedStyle.borderLeftWidth) + parseFloat(computedStyle.borderRightWidth);
      totalHorizontalSize = horizontalMargin + horizontalPadding + horizontalBorder;
    }

    const containerWidth =
      container.clientWidth - totalHorizontalSize * (window.devicePixelRatio || 1);
    const pageWidth = page.getViewport({ scale: 1 }).width;
    const defaultScale = containerWidth / pageWidth;

    const viewport = page.getViewport({
      scale: defaultScale * scale * (window.devicePixelRatio || 1)
    });

    // Update height for this page
    const pageHeight = Math.max(viewport.height / (window.devicePixelRatio || 1), 1) + 8;
    pageHeights[page.pageNumber - 1] = pageHeight;
    pageHeights = [...pageHeights];

    return viewport;
  }

  onMount(() => {
    const unsubscribe = handler.subscribe((h) => {
      if (
        window.btoa(JSON.stringify(h?.annotations)) !==
        window.btoa(JSON.stringify(currentAnnotations))
      ) {
        hasScrolled = false;
      }
      if (h?.annotations?.length > 0 && h.currentAnnotation !== undefined && !hasScrolled) {
        currentAnnotations = h.annotations;
        scrollToIndex = Math.max(h.currentAnnotation, 0);
        calculateScrollOffset();
      } else {
        scrollToIndex = undefined;
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      if (container) {
        listHeight = container.clientHeight;
      }
    });

    if (container) {
      resizeObserver.observe(container);
    }

    return () => {
      unsubscribe();
      resizeObserver.disconnect();
    };
  });

  onDestroy(() => {
    handler.update((h) => {
      h?.cleanup();
      return h;
    });
  });
</script>

<div
  class="flex flex-col overflow-hidden w-full h-full border border-border rounded"
  data-testid="pdf-document-viewer"
  bind:this={container}
>
  {#if hasError}
    <div class="flex items-center justify-center mt-20">
      <h2 class="text-xl text-muted-foreground">
        File cannot be displayed at this time.
      </h2>
    </div>
  {:else if $handler}
    {@render docHeader?.()}
    <div class="h-full w-full">
      <Wrap
        {handler}
        {file}
        {loadOptions}
        on:loadsuccess={handleDocumentLoaded}
        on:loaderror={handleDocumentError}
      >
        {#if isLoading}
          <div class="flex justify-center items-center h-full">
            <p class="text-light-foreground text-sm">
              Loading Document...
            </p>
          </div>
        {/if}
        {#if numPages > 0 && listHeight > 0}
          <VirtualList
            class="virtual-list-wrapper"
            data-testid="pdf-virtual-list"
            {scrollToAlignment}
            {scrollToBehaviour}
            {scrollToIndex}
            width="100%"
            height={listHeight}
            itemCount={numPages}
            itemSize={pageHeights}
            on:afterScroll={handleAfterScroll}
          >
            {#snippet item({ index, style })}
              <div {style} class="pdf-page">
                <Page {handler} num={index} {scale} {rotation} {getViewport} />
              </div>
            {/snippet}
          </VirtualList>
        {/if}
      </Wrap>
    </div>
  {/if}
</div>

<style>
  :global(.virtual-list-wrapper) {
    @apply bg-secondary p-2 overflow-x-hidden;
    max-height: 100vh;
  }
</style>
