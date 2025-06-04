<script lang="ts">
  import type { PDFPageProxy, RenderTask } from 'pdfjs-dist';
  import { RenderingCancelledException } from 'pdfjs-dist';
  import type { PageViewport } from 'pdfjs-dist/types/src/display/display_utils.js';
  import { createEventDispatcher, getContext, tick } from 'svelte';
  import type { Writable } from 'svelte/store';
  import type { PDFHandler } from '../index';
  import AnnotationLayer from './AnnotationLayer.svelte';
  import { descale, descalePoint, getSpans } from './drawing';
  import TextLayer from './TextLayer.svelte';

  const dispatch = createEventDispatcher<{
    pagerendersuccess: PDFPageProxy;
    pagerendererror: unknown;
  }>();

  export let handler: Writable<PDFHandler>;

  export let page: PDFPageProxy;
  export let viewport: PageViewport;
  export let textLayer: HTMLDivElement;
  export let canvasStyles = 'margin: 0 auto;';
  export let num: number;

  let highlights: any[] = [];
  let selectedHighlight: any = null;
  let canvas: HTMLCanvasElement;

  let render_task: RenderTask;

  function extractRange(node: any, start: number, end: number): DOMRect[] {
    try {
      const children = [...node.childNodes].filter((c) => c.nodeType === 3);
      const range = document.createRange();
      let idx = 0;
      let offset = 0;

      while (children[idx]) {
        if (children[idx].length + offset >= start) {
          range.setStart(children[idx], start - offset);
          break;
        }
        offset += children[idx].length;
        idx++;
      }
      while (children[idx]) {
        if (children[idx].length + offset >= end) {
          range.setEnd(children[idx], end - offset);
          break;
        }
        offset += children[idx].length;
        idx++;
      }

      return [...range.getClientRects()];
    } catch {
      return [];
    }
  }

  const matches = $handler?.search_matches ?? [];
  function highlightMatches(v: any) {
    const ranges = (v ?? [])
      .filter((h: any) => h.page === page.pageNumber)
      .reduce((a: any[], c: any) => {
        return a.concat(
          c.matches.map((m: any, idx: number) => ({
            start: m,
            length: c.matchesLength[idx]
          }))
        );
      }, []);

    highlights = [];

    if (!ranges.length) {
      return;
    }

    const spans = getSpans(textLayer.container);
    let count = 0;
    let currRange = 0;

    const divRect = canvas.getBoundingClientRect();
    const descaled = descalePoint(divRect, divRect);

    for (let ni = 0; currRange < ranges.length && ni < spans.length; ni++) {
      if (spans[ni].node?.textContent.length + count <= ranges[currRange].start) {
        count += spans[ni].node?.textContent.length;
        continue;
      }

      if (
        count + spans[ni].node?.textContent.length >
        ranges[currRange].start + ranges[currRange].length
      ) {
        highlights = highlights.concat(
          extractRange(
            spans[ni].node,
            ranges[currRange].start - count,
            ranges[currRange].start - count + ranges[currRange].length
          )
            .map((d) => descale(d, viewport))
            .map((c) => {
              c.x1 -= descaled.x1;
              c.x2 -= descaled.x1;
              c.y1 -= descaled.y1;
              c.y2 -= descaled.y1;
              return c;
            })
        );
        currRange++;
      }

      // connect all ranges that exist within the node
      while (
        currRange < ranges.length &&
        count + spans[ni].node.textContent.length >
          ranges[currRange].start + ranges[currRange].length
      ) {
        highlights = highlights.concat(
          extractRange(
            spans[ni].node,
            ranges[currRange].start - count,
            ranges[currRange].start - count + ranges[currRange].length
          )
            .map((d) => descale(d, viewport))
            .map((c) => {
              c.x1 -= descaled.x1;
              c.x2 -= descaled.x1;
              c.y1 -= descaled.y1;
              c.y2 -= descaled.y1;
              return c;
            })
        );
        currRange++;
      }

      count += spans[ni].node?.textContent.length;

      // TODO: handle case where match range overlaps multiple span elements
    }
  }

  const selectedMatchIdx = getContext('svelte_pdfjs_selected_match_idx');
  function highlightSelectedMatch(matches: any, highlights: any[], selectedMatchIdx: any) {
    // Find the selected match in the list of matches for this page
    let selectedMatchIdxInPage = 0;
    let selectedMatchPage = 0;
    let matchCount = 0;
    for (const match of matches) {
      if (matchCount + match.matches.length >= selectedMatchIdx) {
        selectedMatchIdxInPage = selectedMatchIdx - matchCount - 1;
        selectedMatchPage = match.page;
        break;
      }

      matchCount += match.matches.length;
    }

    // Only highlight the selected match if it is on the current page
    if (selectedMatchPage === page.pageNumber) {
      // Sometimes, the search results pick on elements that are not picked by the highlight method
      // and so, when that happens, we select the last highlight on the page
      selectedHighlight = highlights[selectedMatchIdxInPage] ?? highlights[highlights.length - 1];
    } else {
      selectedHighlight = null; // Necessary to clear previous selection
    }
  }

  $: {
    if (canvas) {
      highlightMatches(matches);
      canvas.style.width = `${Math.ceil(viewport.width) / (window.devicePixelRatio || 1)}px`;
      canvas.style.height = `${Math.ceil(viewport.height) / (window.devicePixelRatio || 1)}px`;
    }
  }

  $: {
    if (highlights && matches && selectedMatchIdx) {
      highlightSelectedMatch(matches, highlights, $selectedMatchIdx);
    }
  }

  let prevViewport: PageViewport | null = null;

  let isRendering = false;

  async function render_page() {
    if (isRendering) {
      render_task?.cancel();
      await tick();
    }

    isRendering = true;
    try {
      render_task = page.render({
        canvasContext: canvas.getContext('2d')!,
        viewport: viewport
      });

      await render_task.promise;
      highlightMatches(matches);
      dispatch('pagerendersuccess', page);
    } catch (err) {
      if (!(err instanceof RenderingCancelledException)) {
        dispatch('pagerendererror', err);
        throw err;
      }
    } finally {
      isRendering = false;
    }
  }

  $: if (viewport && canvas && (!prevViewport || viewport !== prevViewport)) {
    render_page().catch((err) => {
      if (!(err instanceof RenderingCancelledException)) {
        console.error('Error rendering PDF page:', err);
      }
    });
    prevViewport = viewport;
  }
</script>

<canvas
  data-testid="pdf-page-canvas"
  class="pdf-page"
  bind:this={canvas}
  width={viewport?.width}
  height={viewport?.height}
  style={canvasStyles}
/>
<AnnotationLayer {handler} {viewport} {textLayer} {highlights} {selectedHighlight} {num} />
<TextLayer bind:this={textLayer} {handler} {page} {viewport} />

<style>
  canvas.pdf-page {
    display: block;
    margin: 0;
  }
</style>
