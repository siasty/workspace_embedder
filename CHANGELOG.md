# Changelog

All notable changes to the Frappe Workspace Embedder project will be
documented in this file. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this
project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Rewritten as a JS-only EditorJS block. The block (`page_embed`)
  registers itself in `frappe.workspace_block.blocks` and is added to
  the workspace EditorJS tool list by patching
  `frappe.views.Workspace.prototype.initialize_editorjs`. The
  **Embedded Page** option now appears in the standard block-template
  popover next to *Heading*, *Card*, *Custom Block*, etc.
- Pages are mounted in place using Frappe's own
  `frappe.views.pageview.with_page` + `frappe.dom.eval` flow, so the
  page body renders inline. CSS hides `.page-head`, `.page-footer`,
  `.navbar`, and side sections inside the embed wrapper, eliminating
  the desk-shell duplication.

### Removed
- `Page Embed Block`, `Page Embed`, `Page Embed Permission`,
  `Workspace Page Embed Block`, `Workspace Extension` DocTypes.
- BeautifulSoup-based HTML extractor (`utils/page_extractor.py`).
- Iframe-based embedding (`/app/<page>?embedded=1`).
- DOM-spying `MutationObserver` JS extension and the emergency-button
  fallback.
- `Workspace` controller override and `get_context` monkey patch.
- `www/embed.html`, `www/embed.py`, after_install setup, and all
  associated migration helpers.

## [0.0.1] - 2026-04-27

Initial release (legacy iframe / body-content extraction approach).
