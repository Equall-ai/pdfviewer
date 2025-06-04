<script lang="ts">
  import { run } from 'svelte/legacy';

  import type { PDFHandler } from '$lib/svelte-pdf';
  import Document from '$lib/svelte-pdf/Document.svelte';
  import { getContext } from 'svelte';
  import type { Writable } from 'svelte/store';

  interface Props {
    url: string;
  }

  let { url }: Props = $props();

  const handler = getContext<Writable<PDFHandler>>('equall_svelte_pdfjs_handler');


  run(() => {
    if (url) {
      handler?.update((h) => {
        h?.setFileUrl(url);
        return h;
      });
    }
  });
</script>

<Document {handler} file={url} loadOptions={{}} />
