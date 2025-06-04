<script lang="ts">
  import type { Writable } from 'svelte/store';
  import type { PDFHandler } from './index';
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { debounce } from '$lib/helpers/utils';
  import type { Match } from './PageInternals/drawing';
  import { featureFlags } from '$lib/stores/feature_flag';

  export let handler: Writable<PDFHandler>;

  let searchInput: Input;

  let currentMatchIndex = 0;
  const PADDING_SIZE = 5;

  let searchValue = '';

  function invalidateAllCurrentBoxes() {
    if (!$handler?.search_matches || $handler?.search_matches.length === 0) {
      return;
    }
    handler.update((h) => {
      const match = h.search_matches.find((_match) => _match.page === h.currentPage - 1);
      match?.boundingBoxes?.forEach((b) => {
        b.active = false;
        b.text = '';
      });
      return h;
    });
  }

  function scrollToMatch(match: Match, count = 0) {
    const box = match.boundingBoxes[currentMatchIndex - count];
    invalidateAllCurrentBoxes();
    box.active = true;
    box.text = searchValue;
    handler.update((h) => {
      h.search_matches = h.search_matches;
      return h;
    });
    // get the virtual list to scroll within
    const virtualListWrapper = document.getElementsByClassName('virtual-list-wrapper')?.[0];
    const divSlot = virtualListWrapper?.querySelector('div.pdf-page') as HTMLElement;
    // get the height of the page
    const height = divSlot.clientHeight - PADDING_SIZE;
    // scale the y1 based on the height of the page and add the height of the page to account for the page number
    const top = (box.y1 / 100) * height + height * match.page;
    virtualListWrapper?.scrollTo({ top, behavior: 'instant' });
  }

  function navigateSearch(direction: 'prev' | 'next') {
    if ($handler.search_matches.length === 0) return;

    const totalMatchesInAllPages = $handler.search_matches.reduce(
      (sum, match) => sum + match.boundingBoxes.length,
      0
    );

    if (direction === 'next') {
      currentMatchIndex = (currentMatchIndex + 1) % totalMatchesInAllPages;
    } else {
      currentMatchIndex = (currentMatchIndex - 1 + totalMatchesInAllPages) % totalMatchesInAllPages;
    }

    // Find the page for the current match
    let count = 0;
    for (const match of $handler.search_matches) {
      if (count + match.boundingBoxes.length > currentMatchIndex) {
        scrollToMatch(match, count);
        break;
      }
      count += match.boundingBoxes.length;
    }
  }

  const debouncedInputChange = debounce(async (value: string) => {
    if ($handler.current_doc && $handler.current_doc.search) {
      if (value === '') {
        handler.update((h) => {
          h.search_matches = [];
          return h;
        });
      } else {
        $handler.current_doc.search(value);
        currentMatchIndex = 0;
        setTimeout(() => {
          if ($handler.search_matches && $handler.search_matches.length > 0) {
            scrollToMatch($handler.search_matches[0], 0);
          }
        }, 0);
      }
    }
  }, 300);

  onMount(() => {
    if (!$featureFlags['searchVirtualList']) {
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        if (searchInput) {
          searchInput.focus();
        }
      } else if (e.key === 'Enter' || e.key === 'Return') {
        e.preventDefault();
        navigateSearch('next');
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  });

  $: totalMatches = ($handler?.search_matches ?? []).reduce(
    (sum, match) => sum + match.boundingBoxes.length,
    0
  );
</script>

<!-- NOTE: the py-1 and ml-[2px] are to account for the outline of the input when focused -->
<div class="flex items-center w-[98%] py-1 ml-[2px] gap-2">
  <div class="relative flex-1">
    <Input
      class="w-full bg-background text-foreground"
      bind:element={searchInput}
      bind:value={searchValue}
      on:input={(e) => debouncedInputChange(e.currentTarget.value)}
      placeholder="Search ..."
    />
    {#if $handler?.search_matches?.length > 0}
      <span class="absolute right-10 top-1/2 -translate-y-1/2 text-sm text-gray-500">
        {currentMatchIndex + 1} of {totalMatches}
      </span>
    {/if}
  </div>
  <Button
    variant="ghost"
    size="sm"
    eventId="search-previous"
    disabled={totalMatches === 0}
    on:click={() => navigateSearch('prev')}
  >
    ↑
  </Button>
  <Button
    variant="ghost"
    size="sm"
    eventId="search-next"
    disabled={totalMatches === 0}
    on:click={() => navigateSearch('next')}
  >
    ↓
  </Button>
</div>
