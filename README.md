# PDF Viewer with Ctrl+F Implementation

## Getting Started

```bash
pnpm install
pnpm run dev
```

This starts a server on **localhost:8888** and renders a PDF for testing.

## Task

Implement Ctrl+F search functionality for the PDF viewer component.

### Current State
- **Vendored Library**: Based on [svelte-pdf](https://github.com/vinodnimbalkar/svelte-pdf) for faster updates
- **Framework**: Built on Svelte 4, with Svelte 5 available ([migration guide](https://svelte.dev/docs/svelte/v5-migration-guide))
- **Current Implementation**: Located in `@src/lib/svelte-pdf/` and `@src/lib/components/documents/DocRenderer.svelte`
- **Issues**: Messy implementation, constant re-rendering, hard to follow

### Requirements
- [ ] **Ctrl+F Keyboard Shortcut**: Trigger search interface
- [ ] **Search Input UI**: Modal or overlay search box
- [ ] **Real-time Search**: Search as user types
- [ ] **Result Navigation**: Previous/Next result buttons
- [ ] **Result Counter**: "X of Y results" display
- [ ] **Search Highlighting**: Visual highlighting of matches
- [ ] **Auto-scroll**: Navigate to search results automatically

### Reference Implementation
Mozilla's PDF.js provides excellent reference:
- [PDF Find Controller](https://github.com/mozilla/pdf.js/blob/18d7aafc94d06a0332a40572d8fdecefcf23dfff/web/pdf_find_controller.js#L413)
- [Text Highlighter](https://github.com/mozilla/pdf.js/blob/18d7aafc94d06a0332a40572d8fdecefcf23dfff/web/text_highlighter.js#L31)

### Implementation Flexibility
This task is **fully open-ended**. You have complete freedom to:
- Switch to different PDF rendering libraries
- Completely rewrite the implementation
- Refactor existing components
- Upgrade to Svelte 5 patterns
- Implement any architecture that achieves the goals

**Only requirements:**
1. Must remain in Svelte within this project
2. Must have functional Ctrl+F search
3. Must render PDFs correctly
