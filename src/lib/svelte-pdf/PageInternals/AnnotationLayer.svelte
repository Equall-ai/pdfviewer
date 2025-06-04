<script lang="ts">
  import type { PageViewport } from 'pdfjs-dist';
  import { onMount } from 'svelte';
  import type { Writable } from 'svelte/store';
  import type { PDFHandler } from '../index';
  import { featureFlags } from '$lib/stores/feature_flag';
  import {
    AnnotationMode,
    clear,
    createRect,
    descalePoint,
    drawCoarseAnnotation,
    drawCursor,
    drawFineAnnotation,
    drawSearchTextHighlight,
    drawTextHighlight,
    getCursor,
    getSpans,
    pointIntersecting
  } from './drawing';
  import type { Match } from './drawing';

  export let handler: Writable<PDFHandler>;
  export let highlights = [];
  export let selectedHighlight = null;
  export let mode = AnnotationMode.Disabled;
  export let viewport: PageViewport;
  export let textLayer: HTMLDivElement;
  export let num: number;

  let canvas: HTMLCanvasElement;

  let motionStart;
  let motionCurrent;
  let intersecting;
  let cursor;

  onMount(() => {
    function _draw() {
      if (!canvas) {
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      clear(ctx, viewport);
      highlights.forEach((h) => {
        drawCoarseAnnotation(ctx, viewport, h);
      });

      if (selectedHighlight) {
        // By drawing twice on top of the highlight, it becomes more visible
        drawCoarseAnnotation(ctx, viewport, selectedHighlight);
      }

      // Iterates through all pages and clears the background of the text before drawing the new highlights.
      // We have to do this because some highlights are drawn in another page and the text is not cleared.
      const pageTextDiv = textLayer?.children;
      // this isn't fully removing things
      for (const textSpan of pageTextDiv ?? []) {
        if (textSpan instanceof HTMLElement) {
          textSpan.style.backgroundColor = '';
          textSpan.removeAttribute('data-status');
        }
      }

      const pageAnnotations = ($handler?.annotations ?? []).filter((a) => a.page === num);
      // Now that all the previous highlights are cleared, we can draw the new highlights
      pageAnnotations.forEach((a) => {
        drawTextHighlight(ctx, viewport, a, textLayer);
      });

      if ($featureFlags['searchVirtualList'] && $handler?.search_matches?.length > 0) {
        const matches: Match = $handler.search_matches.find((m) => m.page === num) ?? ({} as Match);
        if (matches.boundingBoxes) {
          matches.boundingBoxes.forEach((b) => {
            drawSearchTextHighlight(ctx, viewport, b, textLayer);
          });
        }
      }

      if (mode === AnnotationMode.Coarse) {
        if (motionStart && motionCurrent) {
          drawCoarseAnnotation(ctx, viewport, createRect(motionStart, motionCurrent));
        }
      }

      if (mode === AnnotationMode.MultiStep && !intersecting) {
        if (motionStart && motionCurrent) {
          drawCoarseAnnotation(ctx, viewport, createRect(motionStart, motionCurrent));
        }
      }

      pageAnnotations
        .map((a) => a.sentence)
        .filter((s) => !!s)
        .forEach((a) => {
          drawFineAnnotation(ctx, viewport, a);
        });

      if (cursor) {
        drawCursor(ctx, viewport, cursor);
      }

      window.requestAnimationFrame(_draw);
    }
    window.requestAnimationFrame(_draw);
  });

  const handleStart = ({ offsetX: x, offsetY: y }) => {
    if (mode === AnnotationMode.Disabled) {
      return;
    }

    if (mode === AnnotationMode.Fine) {
      return;
    }

    motionStart = descalePoint({ x, y }, viewport);

    if (mode === AnnotationMode.Coarse) {
      return;
    }

    if (mode === AnnotationMode.MultiStep) {
      intersecting = ($handler?.annotations ?? [])
        .filter((c) => c.page === num)
        .filter((c) => pointIntersecting(motionStart, c))[0];
      return;
    }
  };

  const handleEnd = () => {
    if (mode === AnnotationMode.Disabled) {
      return;
    }

    if (mode === AnnotationMode.Coarse || (mode === AnnotationMode.MultiStep && !intersecting)) {
      if (!motionStart || !motionCurrent) {
        motionStart = motionCurrent = null;
        return;
      }
      const BUFFER = 5; // pixels
      if (
        Math.abs(motionStart.x1 - motionCurrent.x1) < BUFFER / viewport.width &&
        Math.abs(motionStart.y1 - motionCurrent.y1) < BUFFER / viewport.height
      ) {
        // errant click
        motionStart = motionCurrent = null;
        return;
      }
      const rect = createRect(motionStart, motionCurrent);
      const spans = getSpans(textLayer, rect);

      motionStart = motionCurrent = null;

      if (!spans.length) {
        $handler.setAnnotation({
          ...rect,
          text: '',
          page: num
        });
        return;
      }

      // if we have access to the text, refit the annotation
      const fit = spans.reduce(
        (a, c) => {
          if (!a.x1 || a.x1 > c.box.x1) {
            a.x1 = c.box.x1;
          }
          if (!a.x2 || a.x2 < c.box.x2) {
            a.x2 = c.box.x2;
          }
          if (!a.y1 || a.y1 > c.box.y1) {
            a.y1 = c.box.y1;
          }
          if (!a.y2 || a.y2 < c.box.y2) {
            a.y2 = c.box.y2;
          }
          if (a.lastY !== c.box.y1) {
            if (a.lastY) {
              a.main.innerHTML += '<span> </span>';
            }

            a.lastY = c.box.y1;
          }
          const _elem = c.node.cloneNode();
          if (_elem instanceof HTMLElement && c.node instanceof HTMLElement) {
            _elem.innerHTML = c.node.innerHTML;
          }
          a.main.appendChild(_elem);

          return a;
        },
        { main: document.createElement('div') }
      );

      const hPadding = 8 / viewport.width;
      const vPadding = 4 / viewport.height;

      fit.x1 -= hPadding;
      fit.x2 += hPadding;
      fit.y1 -= vPadding;
      fit.y2 += vPadding;

      fit.text = fit.main.textContent;

      const { main: _main, lastY: _lastY, ...fitWithoutMainAndLastY } = fit;

      $handler.setAnnotation({ ...fitWithoutMainAndLastY, page: num });
      return;
    }
  };

  const handleMove = ({ offsetX: x, offsetY: y }) => {
    if (mode === AnnotationMode.Disabled) {
      return;
    }

    motionCurrent = descalePoint({ x, y }, viewport);

    if (mode === AnnotationMode.Coarse) {
      return;
    }

    if (mode === AnnotationMode.Fine) {
      // update cursor
      cursor = getCursor(getSpans(textLayer), motionCurrent);
      return;
    }

    if (mode === AnnotationMode.MultiStep) {
      const intersecting = ($handler?.getAnnotations(num) || [])
        .filter((c) => c.page === num)
        .filter((c) => pointIntersecting(motionCurrent, c));

      if (intersecting.length) {
        cursor = getCursor(getSpans(textLayer, intersecting[0]), motionCurrent);
      } else {
        cursor = null;
      }

      return;
    }
  };

  $: {
    if (canvas) {
      canvas.style.width = `${Math.ceil(viewport.width) / (window.devicePixelRatio || 1)}px`;
      canvas.style.height = `${Math.ceil(viewport.height) / (window.devicePixelRatio || 1)}px`;
    }
  }
</script>

<canvas
  data-testid="pdf-annotation-layer"
  class="annotation-layer"
  bind:this={canvas}
  width={viewport.width}
  height={viewport.height}
  on:mousedown={handleStart}
  on:mouseup={handleEnd}
  on:mouseleave={handleEnd}
  on:mousemove={handleMove}
/>

<style>
  canvas.annotation-layer {
    position: absolute;
    margin: 0;
    inset: 0;

    overflow: clip;
  }
</style>
