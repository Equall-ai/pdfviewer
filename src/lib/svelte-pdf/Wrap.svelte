<script lang="ts">
  import { browser } from '$app/environment';
  import type { PDFDocumentProxy } from 'pdfjs-dist';
  import type {
    DocumentInitParameters,
    OnProgressParameters
  } from 'pdfjs-dist/types/src/display/api.js';
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { normalize, getOriginalIndex, SPECIAL_CHARS_REG_EXP } from './PageInternals/text';
  import type { Writable } from 'svelte/store';
  import type { Match } from './PageInternals/drawing';
  import type { PDFHandler } from './index';
  import { Loading } from '$lib/types/loading';

  const matchDiacritics = true;
  const DIACRITICS_EXCEPTION = new Set([
    // UNICODE_COMBINING_CLASS_KANA_VOICING
    // https://www.compart.com/fr/unicode/combining/8
    0x3099, 0x309a,
    // UNICODE_COMBINING_CLASS_VIRAMA (under 0xFFFF)
    // https://www.compart.com/fr/unicode/combining/9
    0x094d, 0x09cd, 0x0a4d, 0x0acd, 0x0b4d, 0x0bcd, 0x0c4d, 0x0ccd, 0x0d3b, 0x0d3c, 0x0d4d, 0x0dca,
    0x0e3a, 0x0eba, 0x0f84, 0x1039, 0x103a, 0x1714, 0x1734, 0x17d2, 0x1a60, 0x1b44, 0x1baa, 0x1bab,
    0x1bf2, 0x1bf3, 0x2d7f, 0xa806, 0xa82c, 0xa8c4, 0xa953, 0xa9c0, 0xaaf6, 0xabed,
    // 91
    // https://www.compart.com/fr/unicode/combining/91
    0x0c56,
    // 129
    // https://www.compart.com/fr/unicode/combining/129
    0x0f71,
    // 130
    // https://www.compart.com/fr/unicode/combining/130
    0x0f72, 0x0f7a, 0x0f7b, 0x0f7c, 0x0f7d, 0x0f80,
    // 132
    // https://www.compart.com/fr/unicode/combining/132
    0x0f74
  ]);
  let DIACRITICS_EXCEPTION_STR;
  const dispatch = createEventDispatcher();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface $$Events {
    /** Dispatched when a document is successfully loaded. */
    loadsuccess: CustomEvent<PDFDocumentProxy>;
    /** Dispatched when there's an error while loading the document. */
    loaderror: CustomEvent<any>;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Matches {
    [pageIdx: number]: Match;
  }

  /** The URL of the file to load. */
  export let file: string | URL | undefined = undefined;
  /**
   * Extra options provided to PDFJS.getDocument.
   * @see https://github.com/mozilla/pdf.js/blob/41dab8e7b6c1e2684d4afabb8f02e40a874d8e85/src/display/api.js#L126
   */
  export let loadOptions: DocumentInitParameters | undefined = undefined;
  /**
   * Callback that fires everytime a part of the PDF is downloaded. Can be useful for showing a progress bar.
   */
  export let onProgress: undefined | ((params: OnProgressParameters) => void) = undefined;

  export let handler: Writable<PDFHandler>;

  let prevFile: string | URL | null | undefined = null;

  onDestroy(() => {
    prevFile = null;
    $handler.current_doc?.destroy();
    $handler.current_doc?.cleanup(false);
  });

  async function load_document() {
    if (
      $handler.loading_task &&
      $handler.loading_task._transport &&
      !$handler.loading_task._capability.settled
    ) {
      $handler.loading_task._transport.destroy();
      $handler.loading_task.destroy();
    }

    const prev_doc = $handler.current_doc;

    const _handler = $handler;
    _handler.current_doc = null;
    _handler.loadingState = Loading.NotStarted;
    handler.set(_handler);

    if (!$handler.pdfjs) {
      return;
    }

    const { getDocument } = $handler.pdfjs;
    $handler.loadingState = Loading.Running;
    $handler.loading_task = getDocument({ url: file, worker: $handler.worker, ...loadOptions });
    $handler.loading_task.onProgress = onProgress!;
    $handler.loading_task.promise
      .then(
        async (doc: PDFDocumentProxy & { search: (query: string) => void }) => {
          prev_doc?.destroy();
          prev_doc?.cleanup();

          const text = await Promise.all(
            Array(doc.numPages)
              .fill(null)
              .map((_, i) => {
                return doc
                  .getPage(i + 1)
                  .then((p) => {
                    return p.getTextContent({ disableNormalization: true });
                  })
                  .then((t) => {
                    const strBuf = [];
                    for (const textItem of t.items) {
                      strBuf.push(textItem.str);
                      if (textItem.hasEOL) {
                        strBuf.push('\n');
                      }
                    }

                    return { textContent: t, normalized: normalize(strBuf.join('')) };
                  })
                  .then(({ normalized, textContent }) => {
                    const [normalizedText, diffs, hasDiacritics] = normalized;

                    return {
                      page: i + 1,
                      textContent,
                      text: normalizedText,
                      diffs: diffs,
                      hasDiacritics
                    };
                  });
              })
          );

          doc.search = async (query: string) => {
            const [q] = normalize(query);

            // Get both text content and page references for bounding box calculations

            const matches = await Promise.all(
              text.map(async (p) => {
                let isUnicode = false;
                let _q = q.replaceAll(
                  SPECIAL_CHARS_REG_EXP,
                  (
                    match,
                    p1 /* to escape */,
                    p2 /* punctuation */,
                    p3 /* whitespaces */,
                    p4 /* diacritics */,
                    p5 /* letters */
                  ) => {
                    // We don't need to use a \s for whitespaces since all the different
                    // kind of whitespaces are replaced by a single " ".

                    if (p1) {
                      // Escape characters like *+?... to not interfer with regexp syntax.
                      return `[ ]*\\${p1}[ ]*`;
                    }
                    if (p2) {
                      // Allow whitespaces around punctuation signs.
                      return `[ ]*${p2}[ ]*`;
                    }
                    if (p3) {
                      // Replace spaces by \s+ to be sure to match any spaces.
                      return '[ ]+';
                    }
                    if (matchDiacritics) {
                      return p4 || p5;
                    }

                    if (p4) {
                      // Diacritics are removed with few exceptions.
                      return DIACRITICS_EXCEPTION.has(p4.charCodeAt(0)) ? p4 : '';
                    }

                    // A letter has been matched and it can be followed by any diacritics
                    // in normalized text.
                    if (p.hasDiacritics) {
                      isUnicode = true;
                      return `${p5}\\p{M}*`;
                    }
                    return p5;
                  }
                );

                const trailingSpaces = '[ ]*';
                if (_q.endsWith(trailingSpaces)) {
                  // The [ ]* has been added in order to help to match "foo . bar" but
                  // it doesn't make sense to match some whitespaces after the dot
                  // when it's the last character.
                  _q = _q.slice(0, _q.length - trailingSpaces.length);
                }

                if (matchDiacritics) {
                  // aX must not match aXY.
                  if (p.hasDiacritics) {
                    DIACRITICS_EXCEPTION_STR ||= String.fromCharCode(...DIACRITICS_EXCEPTION);

                    isUnicode = true;
                    _q = `${_q}(?=[${DIACRITICS_EXCEPTION_STR}]|[^\\p{M}]|$)`;
                  }
                }

                const flags = `g${isUnicode ? 'u' : ''}i`;
                const regexpQuery = new RegExp(_q, flags);

                const matches = [];
                const matchesLength = [];
                const boundingBoxes = [];
                let match;

                const canvas = document.querySelector('canvas.pdf-page');
                if (!canvas) {
                  throw new Error('No canvas found');
                }
                const rect = canvas.getBoundingClientRect();
                const width = rect.width;
                const height = rect.height;
                const page = await doc.getPage(p.page);
                // rely upon the viewport with the hard coded scale
                const viewport = page.getViewport({ scale: 1 });
                const scaleX = rect.width / viewport.width;
                const scaleY = rect.height / viewport.height;
                // Use the same scale factor for both dimensions to maintain aspect ratio
                const _scale = Math.min(scaleX, scaleY);

                while ((match = regexpQuery.exec(p.text)) !== null) {
                  const [matchPos, matchLen] = getOriginalIndex(
                    p.diffs,
                    match.index,
                    match[0].length
                  );

                  if (matchLen) {
                    // Find the text items that contain this match
                    let currentPos = 0;
                    let startItem = null;
                    let endItem = null;

                    for (const item of p.textContent.items) {
                      const itemLength = item.str.length;
                      const itemEnd = currentPos + itemLength;

                      if (!startItem && currentPos <= matchPos && matchPos < itemEnd) {
                        startItem = item;
                      }

                      if (
                        !endItem &&
                        currentPos <= matchPos + matchLen &&
                        matchPos + matchLen <= itemEnd
                      ) {
                        endItem = item;
                      }

                      if (startItem && endItem) break;
                      currentPos += itemLength;
                    }

                    if (startItem && endItem) {
                      // Calculate text width using font size and transform scale
                      const startX = startItem.transform[4];
                      let endX;

                      if (startItem === endItem) {
                        // If match is within single item, calculate end position based on text width
                        endX = startX + startItem.width * startItem.transform[0];
                      } else if (Math.abs(startItem.transform[5] - endItem.transform[5]) < 1) {
                        // If on same line (y positions are close), use endItem's position + width
                        endX = endItem.transform[4] + endItem.width * endItem.transform[0];
                      } else {
                        // If multi-line, extend to edge of page
                        endX = width / _scale; // Convert page width to PDF coordinates
                      }

                      const newBox = {
                        x1: ((startX * _scale) / width) * 100,
                        y1:
                          ((height - (startItem.transform[5] + startItem.height) * _scale) /
                            height) *
                          100,
                        x2: ((endX * _scale) / width) * 100,
                        y2: ((height - endItem.transform[5] * _scale) / height) * 100,
                        active: false
                      };

                      // Check if we should merge with an existing box using rounded y-coordinates
                      const lastBox = boundingBoxes[boundingBoxes.length - 1];
                      if (
                        lastBox &&
                        (Math.round(lastBox.y1) === Math.round(newBox.y1) ||
                          Math.round(lastBox.y2) === Math.round(newBox.y2))
                      ) {
                        // Merge boxes by taking min/max of coordinates
                        lastBox.x1 = Math.min(lastBox.x1, newBox.x1);
                        lastBox.x2 = Math.max(lastBox.x2, newBox.x2);
                        lastBox.y1 = Math.min(lastBox.y1, newBox.y1);
                        lastBox.y2 = Math.max(lastBox.y2, newBox.y2);
                      } else {
                        boundingBoxes.push(newBox);
                      }
                    }

                    matches.push(matchPos);
                    matchesLength.push(matchLen);
                  }
                }

                return {
                  page: p.page - 1,
                  matches,
                  matchesLength,
                  boundingBoxes
                };
              })
            );

            handler.update((h) => {
              h.search_matches = matches.filter((m) => m.matches.length);
              return h;
            });
          };
          dispatch('loadsuccess', doc);
          return doc;
        },
        (err) => {
          dispatch('loaderror', err);
          return prev_doc;
        }
      )
      .then((doc) => {
        const _handler = $handler;
        _handler.current_doc = doc;
        _handler.loadingState = Loading.Done;
        handler.set(_handler);
      });
  }

  $: {
    if (browser && loadOptions && (!prevFile || prevFile !== file)) {
      load_document();
      prevFile = file;
    }
  }
</script>

<slot />
