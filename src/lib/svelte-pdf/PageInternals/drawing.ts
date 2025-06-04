import type TextLayer from './TextLayer.svelte';

interface Point {
  x: number;
  y: number;
}

interface ScaleInvarientPoint {
  x1: number;
  y1: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ScaleInvarientRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface MeasuredNode {
  box: ScaleInvarientRect;
  node: HTMLElement;
}

interface Sentence {
  text: string;
  boxes: ScaleInvarientRect[];
}

interface Annotation extends ScaleInvarientRect {
  text: string[];
  sentence?: Sentence;
}

interface SearchBoundingBoxes extends ScaleInvarientRect {
  active?: boolean;
  text?: string;
}

export interface Match {
  boundingBoxes: SearchBoundingBoxes[];
  page: number;
  matches: number[];
  matchesLength: number[];
}

export enum AnnotationMode {
  Disabled = 'disabled',
  MultiStep = 'multistep',
  Coarse = 'coarse',
  Fine = 'fine'
}

const PADDING_SIZE = 5;
const COMPENSATED_PADDING_SIZE = PADDING_SIZE * 2;

export function descalePoint(point: Point, scale: Rect): ScaleInvarientPoint {
  return {
    x1: point.x / scale.width,
    y1: point.y / scale.height
  };
}

export function createRect(p1: ScaleInvarientPoint, p2: ScaleInvarientPoint) {
  const r = {} as ScaleInvarientRect;

  if (p1.x1 < p2.x1) {
    r.x1 = p1.x1;
    r.x2 = p2.x1;
  } else {
    r.x1 = p2.x1;
    r.x2 = p1.x1;
  }

  if (p1.y1 < p2.y1) {
    r.y1 = p1.y1;
    r.y2 = p2.y1;
  } else {
    r.y1 = p2.y1;
    r.y2 = p1.y1;
  }

  return r;
}

export function descale(rect: Rect, scale: Rect): ScaleInvarientRect {
  return {
    x1: rect.x / scale.width,
    y1: rect.y / scale.height,
    x2: (rect.x + rect.width) / scale.width,
    y2: (rect.y + rect.height) / scale.height
  };
}

export function rescale(rect: ScaleInvarientRect, scale: Rect): Rect {
  // incoming scale data is represented as 0 - 100.
  // to determine the correct scale dimensions, we need to divide by 100
  const width = scale.width / 100;
  const height = scale.height / 100;
  return {
    x: rect.x1 * width - PADDING_SIZE,
    y: rect.y1 * height - PADDING_SIZE,
    width: (rect.x2 - rect.x1 || 1) * width + COMPENSATED_PADDING_SIZE,
    height: (rect.y2 - rect.y1 || 1) * height + COMPENSATED_PADDING_SIZE
  };
}

export function pointIntersecting(p: ScaleInvarientPoint, r: ScaleInvarientRect) {
  return p.x1 > r.x1 && p.x1 < r.x2 && p.y1 > r.y1 && p.y1 < r.y2;
}

export function rectIntersecting(r1: ScaleInvarientRect, r2: ScaleInvarientRect) {
  if (!r2 || !r1) {
    return false;
  }

  return r1.x1 < r2.x2 && r1.x2 > r2.x1 && r1.y1 < r2.y2 && r1.y2 > r2.y1;
}

export function drawFineAnnotation(
  context: CanvasRenderingContext2D,
  scale: Rect,
  annotation: Sentence
) {
  annotation.boxes.forEach((b) => {
    const sbox = rescale(b, scale);
    context.fillStyle = 'rgba(57,126,170, 0.2)';
    context.fillRect(sbox.x, sbox.y, sbox.width, sbox.height);
  });
}

export function drawCoarseAnnotation(
  context: CanvasRenderingContext2D,
  scale: Rect,
  annotation: Annotation
) {
  if (!context) {
    return;
  }

  // edge case to allow for "fine" mode
  // TODO: uncomment this
  if (annotation.x1 === annotation.x2 || annotation.y1 === annotation.y2) {
    return;
  }

  context.lineWidth = 2;
  context.strokeStyle = 'rgb(57,126,170)';
  context.fillStyle = 'rgba(57,126,170, 0.2)';

  const box = rescale(annotation, scale);
  context.strokeRect(box.x, box.y, box.width, box.height);
  context.fillRect(box.x, box.y, box.width, box.height);
}

function textIsInsideAnnotation(
  textSpanRect: DOMRect,
  textLayerRect: DOMRect,
  annotationBox: Rect
) {
  // 1. Does a check to make sure the span is inside the X,Y boundaries of the annotation
  const textSpanOffsetFromLeft =
    (textSpanRect.x - textLayerRect.x) * (window.devicePixelRatio || 1);
  const textSpanOffsetFromTop = (textSpanRect.y - textLayerRect.y) * (window.devicePixelRatio || 1);
  if (textSpanOffsetFromLeft <= annotationBox.x || textSpanOffsetFromTop <= annotationBox.y) {
    return false;
  }

  // 2. Does a check to make sure it is not after the height at which the annotation ends
  if (annotationBox.y + annotationBox.height - COMPENSATED_PADDING_SIZE <= textSpanOffsetFromTop) {
    return false;
  }

  // 3. Does a check to make sure it is not after the width at which the annotation ends
  if (annotationBox.x + annotationBox.width - COMPENSATED_PADDING_SIZE <= textSpanOffsetFromLeft) {
    return false;
  }

  return true;
}

export function findOverlappingSpans(spans: HTMLSpanElement[], text: string): HTMLSpanElement[] {
  const overlappingSpans: HTMLSpanElement[] = [];
  spans.sort((a, b) => {
    const rectA = a.getBoundingClientRect();
    const rectB = b.getBoundingClientRect();
    if (rectA.x === rectB.x) {
      return rectA.y - rectB.y;
    }
    return rectA.x - rectB.x;
  });

  const smallWords = new Set(['a', 'of', 'and', 'the', 'in', 'on', 'at', 'to', 'is', 'it']);
  const textWords = new Set(text.split(' ').filter((word) => !smallWords.has(word.toLowerCase())));
  for (let i = 0; i < spans.length; i++) {
    const spanText = spans[i].textContent ?? '';
    const spanWords = new Set(
      spanText.split(' ').filter((word) => !smallWords.has(word.toLowerCase()))
    );
    const commonWords = new Set([...textWords].filter((word) => spanWords.has(word)));
    if (commonWords.size / Math.min(textWords.size, spanWords.size) + 0.000001 >= 0.5) {
      overlappingSpans.push(spans[i]);
    }
  }

  return overlappingSpans;
}

export function drawTextHighlight(
  context: CanvasRenderingContext2D | null,
  scale: Rect,
  annotation: Annotation,
  textLayer: typeof Proxy<TextLayer>,
  color = 'rgb(57, 125, 224)'
) {
  if (!context) {
    return;
  }

  // edge case to allow for "fine" mode
  if (annotation.x1 === annotation.x2 || annotation.y1 === annotation.y2) {
    return;
  }

  const annotationBox = rescale(annotation, scale);

  // Obtains the page text by looking at the textLayer
  const pageTextDiv =
    textLayer.container instanceof HTMLDivElement
      ? textLayer.container
      : ([...textLayer.container.children].find(
          (div) => div instanceof HTMLDivElement
        ) as HTMLDivElement);
  if (!pageTextDiv) {
    console.error('no text layer div found');
    throw new Error('no annotations found');
  }
  const textLayerBox = pageTextDiv.getBoundingClientRect();
  // Iterates through the text spans on the page and finds the spans that are within the annotation
  const spansInsideAnnotation: HTMLSpanElement[] = [];
  for (const textSpan of pageTextDiv.children) {
    const spanBox = textSpan.getBoundingClientRect();
    if (textIsInsideAnnotation(spanBox, textLayerBox, annotationBox)) {
      spansInsideAnnotation.push(textSpan as HTMLSpanElement);
    }
  }

  // TODO (malik): Once we have removed the duplicate text layer, uncomment this
  // To only show the relevant spans.
  // const enclosingSpans = annotation.text
  //   .map((t) => findOverlappingSpans(spansInsideAnnotation, t))
  //   .flat();

  // // Highlights the spans inside the annotation
  for (const span of spansInsideAnnotation) {
    span.style.backgroundColor = color;
    span.setAttribute('data-status', 'annotated');
  }
}

export function drawSearchTextHighlight(
  context: CanvasRenderingContext2D | null,
  scale: Rect,
  annotation: SearchBoundingBoxes,
  textLayer: typeof Proxy<TextLayer>,
  color = 'rgb(57, 125, 224)'
) {
  if (!context) {
    return;
  }

  // edge case to allow for "fine" mode
  if (annotation.x1 === annotation.x2) {
    return;
  }

  const annotationBox = rescale(annotation, scale);

  // Obtains the page text by looking at the textLayer
  const pageTextDiv =
    textLayer.container instanceof HTMLDivElement
      ? textLayer.container
      : ([...textLayer.container.children].find(
          (div) => div instanceof HTMLDivElement
        ) as HTMLDivElement);
  if (!pageTextDiv) {
    console.error('no text layer div found');
    throw new Error('no annotations found');
  }
  const textLayerBox = pageTextDiv.getBoundingClientRect();

  // Iterates through the text spans on the page and finds the spans that are within the annotation
  const spansInsideAnnotation: HTMLSpanElement[] = [];
  for (const textSpan of pageTextDiv.children) {
    const spanBox = textSpan.getBoundingClientRect();
    if (textIsInsideAnnotation(spanBox, textLayerBox, annotationBox)) {
      spansInsideAnnotation.push(textSpan as HTMLSpanElement);
    }
  }

  // TODO (malik): Once we have removed the duplicate text layer, uncomment this
  // To only show the relevant spans.
  // const enclosingSpans = annotation.text
  //   .map((t) => findOverlappingSpans(spansInsideAnnotation, t))
  //   .flat();

  // // Highlights the spans inside the annotation
  for (const span of spansInsideAnnotation) {
    span.setAttribute('data-status', 'annotated');
    const spanText = span?.textContent?.toLocaleLowerCase() ?? '';
    const text = annotation?.text?.toLocaleLowerCase() ?? '';
    if (annotation.active && (spanText?.includes(text) || text?.includes(spanText))) {
      span.style.backgroundColor = color;
    } else {
      // TODO(ariel): figure out how to fine tune the bounding boxes to resolve the override here
      // span.style.backgroundColor = 'rgba(57, 125, 224, 0.2)';
    }
  }
}

function closest(elems: MeasuredNode[], point: ScaleInvarientPoint): MeasuredNode {
  const clone = elems.slice();
  return clone.sort((a, b) => {
    const yDiff =
      Math.min(Math.abs(a.box.y1 - point.y1), Math.abs(a.box.y2 - point.y1)) -
      Math.min(Math.abs(b.box.y1 - point.y1), Math.abs(b.box.y2 - point.y1));
    if (yDiff !== 0) {
      return yDiff;
    }
    if (a.box.x1 < point.x1 && a.box.x2 > point.x1) {
      return -1;
    }
    if (b.box.x1 < point.x1 && b.box.x2 > point.x1) {
      return 1;
    }
    return (
      Math.min(Math.abs(a.box.x1 - point.x1), Math.abs(a.box.x2 - point.x1)) -
      Math.min(Math.abs(b.box.x1 - point.x1), Math.abs(b.box.x2 - point.x1))
    );
  })[0];
}

interface Cursor extends ScaleInvarientRect {
  range: Range;
}

export function getSpans(textLayer: HTMLDivElement, limit?: ScaleInvarientRect) {
  if (!textLayer) {
    return [];
  }
  const div = textLayer.children.find((item) => item instanceof HTMLDivElement);
  if (!div) {
    console.warn('No div element found in textLayer context');
    return [];
  }
  const nodes = [];
  const divRect = div.getBoundingClientRect();
  const descaled = descalePoint(divRect, divRect);
  const walker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT, null, false);
  let node;

  while ((node = walker.nextNode())) {
    nodes.push(node);
  }

  const out = nodes
    .map((c) => ({
      box: descale(c.parentNode.getBoundingClientRect(), divRect),
      node: c.parentNode
    }))
    .map((c) => {
      c.box.x1 -= descaled.x1;
      c.box.x2 -= descaled.x1;
      c.box.y1 -= descaled.y1;
      c.box.y2 -= descaled.y1;
      return c;
    });

  if (!limit) {
    return out;
  }

  return out.filter((c) => rectIntersecting(limit, c.box));
}

export function getCursor(elems: MeasuredNode[], point: ScaleInvarientPoint): Cursor | undefined {
  const elem = closest(elems, point);

  if (!elem) {
    return;
  }

  const range = document.createRange();
  range.selectNodeContents(elem.node.childNodes[0]);

  let size = range.getBoundingClientRect();
  const width = size.width;
  let end = (size.width / width) * (elem.box.x2 - elem.box.x1) + elem.box.x1;
  let lastDist = Math.abs(end - point.x1);
  let dist;

  while (true) {
    if (range.endOffset === 0) {
      break;
    }

    range.setEnd(elem.node.childNodes[0], range.endOffset - 1);
    size = range.getBoundingClientRect();
    end = (size.width / width) * (elem.box.x2 - elem.box.x1) + elem.box.x1;
    dist = Math.abs(end - point.x1);

    if (dist > lastDist) {
      range.setEnd(elem.node.childNodes[0], range.endOffset + 1);
      break;
    }

    lastDist = dist;
  }

  size = range.getBoundingClientRect();
  const x1 = (size.width / width) * (elem.box.x2 - elem.box.x1) + elem.box.x1;
  range.collapse(false);

  return {
    x1,
    y1: elem.box.y1,
    x2: x1,
    y2: elem.box.y2,
    range: range.cloneRange()
  };
}

export function drawCursor(
  context: CanvasRenderingContext2D,
  scale: Rect,
  cursor: ScaleInvarientRect
) {
  context.lineWidth = 2;
  context.strokeStyle = 'rgb(57,126,170)';
  const box = rescale(cursor, scale);
  context.beginPath();
  context.moveTo(box.x, box.y);
  context.lineTo(box.x + box.width, box.y + box.height);
  context.stroke();
}

export function clear(context: CanvasRenderingContext2D, scale: Rect) {
  context.clearRect(0, 0, scale.width, scale.height);
}
