/**
 * Workspace Embedder — page_embed block
 *
 * Registers an EditorJS block that mounts a Frappe Page directly inside a
 * workspace. The block stores only the target page name; the page is
 * rendered on the fly using the same mechanism frappe.views.pageview uses
 * for /app/<page>, with .page-head and .page-footer hidden via CSS so the
 * desk shell is not duplicated.
 */
(function () {
	"use strict";

	// Cached mounted page DOM, keyed by page name.
	// A given Frappe Page module is JS-stateful (`frappe.pages[name]` keeps
	// internal references), so re-evaluating its script on every workspace
	// switch produces broken second mounts. Instead we mount the page once,
	// keep the resulting DOM detached when not in view, and re-attach it the
	// next time a `page_embed` block for the same page renders.
	const PAGE_DOM_CACHE = Object.create(null);

	const TOOLBOX_ICON = `
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
			<rect x="2" y="3" width="12" height="10" rx="1.5"></rect>
			<line x1="2" y1="6" x2="14" y2="6"></line>
			<circle cx="4" cy="4.5" r="0.5" fill="currentColor"></circle>
			<circle cx="5.5" cy="4.5" r="0.5" fill="currentColor"></circle>
		</svg>`;

	function definePageEmbed() {
		const CustomBlock = frappe.workspace_block.blocks.custom_block;
		const Block = Object.getPrototypeOf(CustomBlock);

		return class PageEmbed extends Block {
			static get toolbox() {
				return { title: __("Embedded Page"), icon: TOOLBOX_ICON };
			}

			static get isReadOnlySupported() {
				return true;
			}

			constructor({ data, api, config, readOnly, block }) {
				super({ data, api, config, readOnly, block });
				this.col = this.data.col ? this.data.col : "12";
				this.allow_customization = !this.readOnly;
				this.options = {
					allow_sorting: this.allow_customization,
					allow_create: this.allow_customization,
					allow_delete: this.allow_customization,
					allow_hiding: false,
					allow_edit: true,
					allow_resize: true,
					min_width: 4,
				};
				this._instance_id = `wpe-${Math.random().toString(36).slice(2, 10)}`;
				this._injected_style_id = null;
				this._injected_script = null;
				this._mounted_page_name = null;
			}

			render() {
				this.wrapper = document.createElement("div");
				this.wrapper.classList.add("workspace-page-embed");
				this._build_widget_skeleton();

				if (this.data && this.data.target_page) {
					this._mount_page(this.data.target_page);
				} else if (!this.readOnly) {
					this._open_picker_dialog();
				} else {
					this._render_placeholder(__("No page selected"));
				}

				if (!this.readOnly) {
					this.add_settings_button();
					this.add_new_block_button();
				}

				return this.wrapper;
			}

			validate(savedData) {
				return Boolean(savedData && savedData.target_page);
			}

			save() {
				return {
					target_page: this.wrapper.getAttribute("data-target-page") || "",
					col: this.get_col(),
				};
			}

			_build_widget_skeleton() {
				this.wrapper.innerHTML = `
					<div class="widget page-embed-widget full-width">
						<div class="widget-head">
							<div class="widget-label">
								<div class="widget-title"></div>
								<div class="widget-subtitle"></div>
							</div>
							<div class="widget-control"></div>
						</div>
						<div class="widget-body">
							<div class="page-embed-host"></div>
						</div>
						<div class="widget-footer"></div>
					</div>
				`;
				this._host = this.wrapper.querySelector(".page-embed-host");
				this._title = this.wrapper.querySelector(".widget-title");
			}

			_render_placeholder(message) {
				this._host.innerHTML = `
					<div class="page-embed-placeholder">
						<div class="page-embed-placeholder-message">${frappe.utils.escape_html(message)}</div>
					</div>
				`;
			}

			_render_loading() {
				this._host.innerHTML = `
					<div class="page-embed-loading">
						<div class="page-embed-spinner"></div>
						<div>${__("Loading page...")}</div>
					</div>
				`;
			}

			_render_error(message) {
				this._host.innerHTML = `
					<div class="page-embed-error">
						<strong>${__("Failed to embed page")}</strong>
						<div>${frappe.utils.escape_html(message)}</div>
					</div>
				`;
			}

			_open_picker_dialog() {
				this._render_placeholder(__("Pick a page to embed"));
				const me = this;
				const dialog = new frappe.ui.Dialog({
					title: __("Embed a Page"),
					fields: [
						{
							fieldname: "target_page",
							fieldtype: "Link",
							label: __("Page"),
							options: "Page",
							reqd: 1,
							description: __("The selected page will be rendered inline, without the desk shell."),
						},
					],
					primary_action_label: __("Embed"),
					primary_action(values) {
						dialog.hide();
						me.data.target_page = values.target_page;
						me._mount_page(values.target_page);
					},
				});

				dialog.onhide = () => {
					if (!me.data.target_page) {
						const ce_block = me.wrapper.closest(".ce-block");
						if (ce_block) {
							ce_block.remove();
						}
					}
				};

				dialog.show();
			}

			async _mount_page(page_name) {
				if (!page_name) {
					this._render_placeholder(__("No page selected"));
					return;
				}

				this.wrapper.setAttribute("data-target-page", page_name);
				this._render_loading();

				try {
					await this._ensure_page_loaded(page_name);
				} catch (err) {
					console.error("[workspace_embedder] failed to load page", page_name, err);
					this._render_error(err && err.message ? err.message : String(err));
					return;
				}

				const pagedoc = locals.Page && locals.Page[page_name];
				if (!pagedoc) {
					this._render_error(__("Page '{0}' not found", [page_name]));
					return;
				}

				if (pagedoc.title) {
					this._title.textContent = pagedoc.title;
				}

				this._render_into_host(page_name, pagedoc);
			}

			_ensure_page_loaded(page_name) {
				return new Promise((resolve, reject) => {
					if (!frappe.views || !frappe.views.pageview) {
						reject(new Error("frappe.views.pageview is not available"));
						return;
					}
					frappe.model.with_doctype("Page", () => {
						frappe.views.pageview.with_page(page_name, (response) => {
							if (response && response.exc) {
								reject(new Error(__("Could not load page")));
								return;
							}
							resolve();
						});
					});
				});
			}

			_render_into_host(page_name, pagedoc) {
				this._cleanup_previous_mount();
				this._host.innerHTML = "";

				const cached = PAGE_DOM_CACHE[page_name];
				if (cached && cached.inner) {
					// Re-attach the page DOM mounted on a previous workspace
					// render. The page's `on_page_load` already ran against
					// this element, so we only fire `on_page_show` / `refresh`
					// to let the page repaint dynamic data.
					this._host.appendChild(cached.inner);
					this._mounted_page_name = page_name;
					try {
						if (typeof cached.inner.on_page_show === "function") {
							cached.inner.on_page_show(cached.inner);
						}
						if (typeof cached.inner.refresh === "function") {
							cached.inner.refresh(cached.inner);
						}
					} catch (err) {
						console.error(
							"[workspace_embedder] error refreshing cached page",
							page_name,
							err
						);
					}
					return;
				}

				const had_previous_registry_entry = Object.prototype.hasOwnProperty.call(
					frappe.pages,
					page_name
				);
				const previous_registry_entry = frappe.pages[page_name];

				const inner = document.createElement("div");
				inner.classList.add("workspace-page-embed-mount");
				inner.setAttribute("data-page-name", page_name);
				inner.page_name = page_name;
				this._host.appendChild(inner);

				frappe.pages[page_name] = inner;

				try {
					if (pagedoc.content) {
						inner.innerHTML = pagedoc.content;
					}
					this._inject_page_script(pagedoc.__script || pagedoc.script || "");
					this._inject_page_style(pagedoc.style || "");

					if (typeof inner.on_page_load === "function") {
						inner.on_page_load(inner);
					}
					if (typeof inner.on_page_show === "function") {
						inner.on_page_show(inner);
					}
					if (typeof inner.refresh === "function") {
						inner.refresh(inner);
					}

					this._mounted_page_name = page_name;
					PAGE_DOM_CACHE[page_name] = {
						inner,
						style_id: this._injected_style_id,
						script: this._injected_script,
					};
					// Once cached, the script and style outlive any single
					// block instance — block-level cleanup must not remove
					// them.
					this._injected_script = null;
					this._injected_style_id = null;
				} catch (err) {
					console.error("[workspace_embedder] error mounting page", page_name, err);
					this._render_error(err && err.message ? err.message : String(err));
				} finally {
					if (had_previous_registry_entry) {
						frappe.pages[page_name] = previous_registry_entry;
					} else {
						delete frappe.pages[page_name];
					}
				}
			}

			_inject_page_script(script_text) {
				if (!script_text) return;
				const el = document.createElement("script");
				el.setAttribute("data-page-embed-instance", this._instance_id);
				el.appendChild(document.createTextNode(script_text));
				document.head.appendChild(el);
				this._injected_script = el;
			}

			_inject_page_style(style_text) {
				if (!style_text) return;
				const id = `page-embed-style-${this._instance_id}`;
				const existing = document.getElementById(id);
				if (existing) existing.parentNode.removeChild(existing);

				const el = document.createElement("style");
				el.id = id;
				el.setAttribute("data-page-embed-instance", this._instance_id);
				el.appendChild(document.createTextNode(style_text));
				document.head.appendChild(el);
				this._injected_style_id = id;
			}

			_cleanup_previous_mount() {
				// If this block instance owns an injected style/script that
				// was NOT promoted into PAGE_DOM_CACHE (mount aborted before
				// caching), drop it now. Cached entries share their tags with
				// the global cache and must outlive individual block
				// instances.
				if (this._injected_style_id) {
					const el = document.getElementById(this._injected_style_id);
					if (el) el.parentNode.removeChild(el);
					this._injected_style_id = null;
				}
				if (this._injected_script && this._injected_script.parentNode) {
					this._injected_script.parentNode.removeChild(this._injected_script);
				}
				this._injected_script = null;

				// Detach the cached page DOM so EditorJS can clear our wrapper
				// without dragging the page subtree into the void. Re-attach
				// happens on the next `_render_into_host`.
				if (this._mounted_page_name) {
					const cached = PAGE_DOM_CACHE[this._mounted_page_name];
					if (cached && cached.inner && cached.inner.parentNode) {
						cached.inner.parentNode.removeChild(cached.inner);
					}
				}
				this._mounted_page_name = null;
			}

			destroy() {
				this._cleanup_previous_mount();
			}

			removed() {
				this._cleanup_previous_mount();
			}
		};
	}

	function patchInitializeEditorJS() {
		const proto = frappe.views && frappe.views.Workspace && frappe.views.Workspace.prototype;
		if (!proto || proto._page_embed_patched) return;

		const original = proto.initialize_editorjs;
		proto.initialize_editorjs = function (blocks) {
			// Run the original with an EMPTY blocks array. The original builds
			// `this.tools` (all stock blocks) and instantiates EditorJS in the
			// `#editorjs` holder. EditorJS adds its `.codex-editor` wrapper
			// ASYNCHRONOUSLY, so we must wait for `editor.isReady` before
			// destroying it — otherwise the wrapper appears in the DOM after
			// our cleanup and shows up as an empty `codex-editor--empty`
			// element pushing the real content down.
			original.call(this, []);

			if (!this.blocks.page_embed || !this.editor) {
				if (this.editor && this.editor.isReady && blocks && blocks.length) {
					this.editor.isReady.then(() => {
						this.editor.render({ blocks: blocks || [] });
					});
				}
				return;
			}

			const dummy = this.editor;
			const EditorJS = dummy.constructor;

			this.tools.page_embed = {
				class: this.blocks.page_embed,
				config: { page_data: this.page_data || [] },
			};

			const realTools = this.tools;
			const me = this;

			Promise.resolve(dummy.isReady)
				.then(() => Promise.resolve(dummy.destroy && dummy.destroy()))
				.then(() => {
					const holder = document.getElementById("editorjs");
					if (holder) holder.innerHTML = "";

					me.editor = new EditorJS({
						data: { blocks: blocks || [] },
						tools: realTools,
						autofocus: false,
						readOnly: true,
						logLevel: "ERROR",
					});
				})
				.catch((err) => {
					console.error("[workspace_embedder] editor rebuild failed", err);
				});
		};
		proto._page_embed_patched = true;
	}

	function register() {
		if (typeof frappe === "undefined") return;
		frappe.provide("frappe.workspace_block.blocks");

		if (!frappe.workspace_block.blocks.custom_block) {
			return false;
		}

		if (!frappe.workspace_block.blocks.page_embed) {
			frappe.workspace_block.blocks.page_embed = definePageEmbed();
		}

		patchInitializeEditorJS();
		return true;
	}

	$(document).ready(function () {
		if (register()) return;

		let attempts = 0;
		const max_attempts = 50;
		const interval = setInterval(() => {
			attempts++;
			if (register() || attempts >= max_attempts) {
				clearInterval(interval);
			}
		}, 100);
	});
})();
