# Frappe Workspace Embedder

Adds an **Embedded Page** block to the Frappe Workspace editor. Pick any
Frappe `Page` from the standard block-template menu and the page is
mounted directly inside the workspace, without iframes and without
duplicating the desk shell (navbar, page-head, breadcrumbs, footer).

## How it works

The app registers a custom EditorJS block (`page_embed`) into
`frappe.workspace_block.blocks` and patches
`frappe.views.Workspace.prototype.initialize_editorjs` so the block is
included in EditorJS's tool list. From the user's point of view the
**Embedded Page** entry sits next to *Heading*, *Card*, *Custom Block*
etc. in the block-template popover.

When the block renders, it uses Frappe's own page-loading mechanism
(`frappe.views.pageview.with_page` and `frappe.dom.eval` of the page's
script) to mount the target page into a host element inside the block.
A small CSS sheet hides `.page-head`, `.page-footer`, `.navbar`, and
side sections inside the embed wrapper, leaving only the page body.

## Block payload

The block stores nothing more than the target page name in the
workspace `content` JSON:

```json
{
	"type": "page_embed",
	"data": { "target_page": "my-page", "col": 12 }
}
```

There are no extra DocTypes, no fixtures, no server-side helpers — the
entire integration lives in:

```
workspace_embedder/
└── workspace_embedder/
    ├── hooks.py                              # only registers JS + CSS
    └── public/
        ├── js/page_embed_block.js            # block class + workspace patch
        └── css/page_embed_block.css          # hides desk chrome inside the embed
```

## Installation

```bash
bench get-app workspace_embedder <repo-url>
bench --site <site> install-app workspace_embedder
bench build --app workspace_embedder
bench --site <site> clear-cache
```

## Usage

1. Open a workspace, click **Edit**.
2. Add a new block — pick **Embedded Page** from the templates popover.
3. Choose the target page in the dialog. Save the workspace.

## Caveats

- Mounting a page registers it under `frappe.pages[<name>]` for the
  duration of the mount, then restores any previous entry. If the same
  page is opened as a route at the same time the route view will
  rebind. In practice embedded pages are dashboards and reports, so
  this is rarely an issue.
- Page scripts run in the desk JS context. Anything the page assumes
  about being the only top-level view (e.g. document title rewrites)
  will still happen — that's intentional, since we want the page to
  work normally.
- The block respects the page's own permission checks because the page
  module loads exactly the same way as via `/app/<page>`.

## License

MIT — see [license.txt](license.txt).
