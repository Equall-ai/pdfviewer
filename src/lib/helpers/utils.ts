import { browser, dev } from '$app/environment';
import type { Session } from '$lib/stores/auth';
import type { Annotation, Reference, ScaleInvarientRect } from '$lib/types/annotations';

export const BLOG_URL = dev ? 'http://blog:5174' : 'https://blog.equall.com';
// Use the same protocol as the current page to avoid mixed content warnings
export const FRONTEND_BLOG_URL = dev
  ? typeof window !== 'undefined'
    ? `${window.location.protocol}//localhost:5174`
    : 'http://localhost:5174'
  : 'https://blog.equall.com';

let debounceTimer: ReturnType<typeof setTimeout>;

export function isJSON(value: unknown) {
  try {
    JSON.parse(value as string);
    return true;
  } catch (e) {
    return false;
  }
}
export function debounce(func: any, delay: number) {
  return (...args: any[]) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => func(...args), delay);
  };
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Receives a thrown error and returns a string representing the error.
 *
 * @param error error caught in a catch clause
 * @returns string error message
 */
export function errorToMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

interface OutClickMeta {
  original: any;
}

export function clickOutside(node: HTMLElement) {
  const handleClick = (event: MouseEvent) => {
    if (!node.contains(event.target)) {
      node.dispatchEvent(
        new CustomEvent<OutClickMeta>('outclick', {
          detail: {
            original: event.target
          }
        })
      );
    }
  };

  document.addEventListener('click', handleClick, true);

  return {
    destroy() {
      document.removeEventListener('click', handleClick, true);
    }
  };
}

type ResizeCallback = (entry: ResizeObserverEntry) => void;
const resizeCallbacks = new WeakMap<Element, ResizeCallback>();

// defined outside of action, so we only create a single instance
let resizeObserver: ResizeObserver;

export function resize(target: Element, callback: ResizeCallback) {
  // create on first use, inside the action, so we're SSR friendly
  resizeObserver =
    resizeObserver ||
    new ResizeObserver((entries) => {
      for (const entry of entries) {
        const callback = resizeCallbacks.get(entry.target);
        if (callback) {
          callback(entry);
        }
      }
    });

  resizeCallbacks.set(target, callback);
  resizeObserver.observe(target);

  return {
    destroy() {
      resizeObserver.unobserve(target);
      resizeCallbacks.delete(target);
    }
  };
}

interface Parameters {
  text: string;
}

interface Attributes {
  'on:svelte-copy': (event: CustomEvent<string>) => void;
  'on:svelte-copy:error': (event: CustomEvent<Error>) => void;
}

async function copyText(text: string) {
  if ('clipboard' in navigator) {
    await navigator.clipboard.writeText(text);
  } else {
    const element = document.createElement('input');

    element.type = 'text';
    element.disabled = true;

    element.style.setProperty('position', 'fixed');
    element.style.setProperty('z-index', '-100');
    element.style.setProperty('pointer-events', 'none');
    element.style.setProperty('opacity', '0');

    element.value = text;

    document.body.appendChild(element);

    element.click();
    element.select();
    document.execCommand('copy');

    document.body.removeChild(element);
  }
}

export const copy: Action<HTMLElement, Parameters | string, Attributes> = (
  element: HTMLElement,
  params: Parameters | string | undefined
) => {
  let text = '';

  async function handle() {
    if (!text) {
      return;
    }

    try {
      await copyText(text);

      element.dispatchEvent(new CustomEvent('svelte-copy', { detail: text }));
    } catch (e) {
      element.dispatchEvent(new CustomEvent('svelte-copy:error', { detail: e }));
    }
  }

  element.addEventListener('click', handle, true);

  if (params) {
    text = typeof params == 'string' ? params : params.text;
  }

  return {
    update: (newParams: Parameters | string) => {
      text = typeof newParams == 'string' ? newParams : newParams.text;
    },
    destroy: () => {
      element.removeEventListener('click', handle, true);
    }
  };
};

export function computeUnionReferences(references: Reference[]): Reference | null {
  if (references.length === 0) {
    return null; // Return null if the list is empty
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const ref of references) {
    minX = Math.min(minX, ref.value.x_min);
    minY = Math.min(minY, ref.value.y_min);
    maxX = Math.max(maxX, ref.value.x_max);
    maxY = Math.max(maxY, ref.value.y_max);
  }
  const newText = references.map((r) => r.text).join(' ');
  const newHighlights = references.map((r) => r.highlight).flat();

  return {
    type: 'bounding_box',
    value: {
      page: references[0].value.page,
      x_min: minX,
      y_min: minY,
      x_max: maxX,
      y_max: maxY
    },
    text: newText,
    highlight: newHighlights
  } as Reference;
}
function convertReferenceToAnnotation(reference: Reference): Annotation {
  if (
    reference.type?.toLowerCase() === 'bounding_box' ||
    reference.__typename === 'BoundingBoxReference' ||
    reference.__typename === 'FlatBoundingBoxReference'
  ) {
    return {
      x1: reference.value.x_min,
      y1: reference.value.y_min,
      x2: reference.value.x_max,
      y2: reference.value.y_max,
      page: reference.value.page,
      text: reference.highlight ?? []
    } as Annotation;
  }
  throw new Error('Only bounding_box references can be converted to annotations');
}

function scopeReferencesToPage(references: Reference[]) {
  return references.reduce(
    (acc, curr) => {
      if (acc[curr.value.page]) {
        acc[curr.value.page].push(curr);
      } else {
        acc[curr.value.page] = [curr];
      }
      return acc;
    },
    {} as Record<number, ScaleInvarientRect[]>
  );
}

export function convertReferencesToAnnotations(references: Reference[]) {
  const groupedReferences = scopeReferencesToPage(references);
  return Object.entries(groupedReferences)
    .map(([_page, refs]) => computeUnionReferences(refs))
    .filter((r) => r !== null)
    .map(convertReferenceToAnnotation) as Annotation[];
}

export const animationSpeed = {
  small: 150, // --small-animation-timing
  medium: 250, // --medium-animation-timing
  large: 320, // --large-animation-timing
  extraLarge: 800 // --extra-large-animation-timing
};

export function replaceCitationLinks(_answer: string, references: any[], status: string): string {
  const refs = {};
  let modifiedAnswer = _answer;
  for (const ref of references ?? []) {
    const r = refs[ref.id];
    if (r) {
      continue;
    }
    refs[ref.id] = ref;
    const references = ref.references;
    let annotations: Omit<Annotation, 'text'>[] = [];
    if (references.map((r: any) => r.type).every((t: any) => t === 'bounding_box')) {
      annotations = convertReferencesToAnnotations(references);
    }
    modifiedAnswer = modifiedAnswer.replaceAll(
      ref.id,
      `?ref=${ref.id}&page=${annotations?.[0]?.page}`
    );
  }
  if (status !== 'completed') {
    modifiedAnswer = modifiedAnswer.replaceAll(/\[[0-9 ,-\]]*|,?\s*CHUNK ID\s*/g, '');
  }
  return modifiedAnswer.trimStart();
}

export function scrollToTabs() {
  if (browser) {
    const scrollElement = document.getElementById('qas-wrapper');
    const topOfQuestion =
      document.getElementById('tabs-header')?.parentElement?.parentElement?.parentElement
        ?.parentElement?.parentElement;
    // @todo(dani): this is super brittle and will only work if the user only has one diligence UI on the screen
    if (scrollElement && topOfQuestion) {
      scrollElement.scrollTo({
        top: topOfQuestion.offsetTop,
        behavior: 'smooth'
      });
    }
  }
}

export function isEquallUser(session: Session | undefined, dataroomId?: string) {
  if (!session) return false;
  if (browser && dataroomId && document.cookie.includes(`preview_${dataroomId}=true`)) {
    return false;
  }
  return (
    session?.user?.email?.endsWith('@equall.com') ||
    session?.user?.email?.endsWith('@equall.ai') ||
    'impersonator' in session
  );
}

/**
 * Uses feature flags and user information to determine if the workflow should be
 *  decompressed or released immediately after upload. Used in the upload flows.
 *
 * @param session - The user session object containing user and equallUser information
 * @param blockUserUploadFlag - A boolean flag indicating if user upload should be blocked
 * @returns An object containing decompress and is_released states
 */
export function getWorkflowReleaseState(
  session: Session | undefined,
  blockUserUploadFlag: boolean
): {
  decompress: boolean;
  isReleased: {
    documents: boolean;
    company_details: boolean;
    parties: boolean;
    ownership: boolean;
    dashboards: boolean;
  };
} {
  let decompress = false;
  const isReleased = {
    documents: false,
    company_details: false,
    parties: false,
    ownership: false,
    dashboards: false
  };
  const isEquall = isEquallUser(session, '');

  if (session && isEquall) {
    decompress = true;
    if (!session.impersonator) {
      // when we're impersonating, we'll release these manually
      isReleased.documents = true;
      isReleased.company_details = true;
      isReleased.parties = true;
      isReleased.ownership = true;
      isReleased.dashboards = true;
    }
  } else if (!blockUserUploadFlag) {
    decompress = true;
    isReleased.documents = true;
    isReleased.company_details = true;
    isReleased.parties = true;
    isReleased.ownership = true;
    isReleased.dashboards = true;
  }

  return { decompress, isReleased };
}
