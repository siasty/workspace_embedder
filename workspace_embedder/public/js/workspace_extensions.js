/**
 * Workspace Page Embedder - Frontend Integration
 * ==============================================
 *
 * Extends Frappe Workspace to support page embedding through Custom HTML Blocks
 * and workspace content manipulation.
 */

(function () {
	"use strict";

	// Debug log to confirm JS is loading
	console.log("🚀 WorkspacePageEmbedder JavaScript loaded successfully!");

	if (typeof frappe === "undefined") {
		console.warn("⚠️ Frappe not available, WorkspacePageEmbedder disabled");
		return;
	}

	// Namespace for workspace page embedder
	window.WorkspacePageEmbedder = window.WorkspacePageEmbedder || {};

	/**
	 * Initialize workspace page embedder when workspace loads
	 */
	$(document).on("workspace-loaded", function () {
		WorkspacePageEmbedder.initPageEmbeds();
	});

	/**
	 * Initialize on workspace page load
	 */
	$(document).ready(function() {
		// Skip embedding if this is an embedded iframe
		const urlParams = new URLSearchParams(window.location.search);
		if (urlParams.get('no_embed') === '1' || urlParams.get('embedded') === '1') {
			console.log('🚫 Skipping workspace embedder - page is embedded');
			return;
		}

		// Check if we're on a workspace page (URL pattern: /app/{workspace-name})
		if (window.location.pathname.startsWith('/app/')) {
			const pathParts = window.location.pathname.split('/');
			if (pathParts.length >= 3) {
				const possibleWorkspaceName = pathParts[2];

				// Skip if it's a known non-workspace route
				const nonWorkspaceRoutes = ['desk', 'query-report', 'print', 'form', 'list', 'tree', 'File'];
				if (!nonWorkspaceRoutes.includes(possibleWorkspaceName)) {
					console.log('Detected workspace:', possibleWorkspaceName);
					WorkspacePageEmbedder.loadWorkspaceEmbeds(possibleWorkspaceName);
				}
			}
		}
	});

	// Clean up embeds on navigation/workspace change
	let currentWorkspaceName = null;

	// Proper Frappe navigation event listeners
	$(document).on('page-change app-change', function() {
		setTimeout(() => {
			WorkspacePageEmbedder.handleNavigationChange();
		}, 500);
	});

	// Listen for route changes in Frappe
	frappe.router.on('change', function() {
		setTimeout(() => {
			WorkspacePageEmbedder.handleNavigationChange();
		}, 300);
	});

	// Listen for app-specific events
	$(document).on('workspace-loaded page-loaded', function() {
		setTimeout(() => {
			WorkspacePageEmbedder.handleNavigationChange();
		}, 200);
	});

	// Listen for URL changes
	let lastUrl = location.href;
	new MutationObserver(() => {
		const url = location.href;
		if (url !== lastUrl) {
			lastUrl = url;
			setTimeout(() => {
				WorkspacePageEmbedder.handleNavigationChange();
			}, 300);
		}
	}).observe(document, {subtree: true, childList: true});

	/**
	 * Initialize page embeds in the current workspace
	 */
	WorkspacePageEmbedder.initPageEmbeds = function () {
		// Find all page embed containers in workspace
		$(".workspace-container [data-page-embed-name]").each(function () {
			const container = $(this);
			const embedName = container.data("page-embed-name");

			if (embedName && !container.hasClass("page-embed-loaded")) {
				WorkspacePageEmbedder.loadPageEmbed(embedName, container);
			}
		});
	};

	/**
	 * Load a specific page embed into a container
	 */
	WorkspacePageEmbedder.loadPageEmbed = function (embedName, container) {
		container.addClass("page-embed-loading");
		container.html(`
            <div class="page-embed-placeholder">
                <div class="text-center p-5">
                    <i class="fa fa-spinner fa-spin fa-2x text-muted"></i>
                    <p class="text-muted mt-3">Loading ${embedName}...</p>
                </div>
            </div>
        `);

		frappe.call({
			method: "workspace_embedder.workspace_page_embedder.api.get_embed_html",
			args: { embed_name: embedName },
			callback: function (r) {
				if (r.message) {
					container.html(r.message);
					container.addClass("page-embed-loaded");
					container.removeClass("page-embed-loading");

					// Initialize any iframe communication if needed
					WorkspacePageEmbedder.setupIframeComm(container);

					// Add CSS to hide navigation elements in iframe
					WorkspacePageEmbedder.injectCleanCSS(container);

					// Trigger custom event
					container.trigger("page-embed-loaded", [embedName]);
				} else {
					WorkspacePageEmbedder.showEmbedError(container, "No content returned");
				}
			},
			error: function (r) {
				const errorMsg = r.message || "Failed to load page embed";
				WorkspacePageEmbedder.showEmbedError(container, errorMsg);
			},
		});
	};

	/**
	 * Show error message in embed container
	 */
	WorkspacePageEmbedder.showEmbedError = function (container, errorMsg) {
		container.removeClass("page-embed-loading");
		container.html(`
            <div class="alert alert-warning">
                <i class="fa fa-exclamation-triangle"></i>
                <strong>Page Embed Error:</strong> ${errorMsg}
                <button class="btn btn-sm btn-default pull-right" onclick="location.reload()">
                    <i class="fa fa-refresh"></i> Retry
                </button>
            </div>
        `);
	};

	/**
	 * Setup iframe communication and responsive handling
	 */
	WorkspacePageEmbedder.setupIframeComm = function (container) {
		const iframes = container.find("iframe.page-embed-iframe");

		iframes.each(function () {
			const iframe = $(this);

			// Add responsive handling
			if (iframe.hasClass("responsive")) {
				WorkspacePageEmbedder.makeIframeResponsive(iframe);
			}

			// Setup iframe load event
			iframe.on("load", function () {
				iframe.fadeIn();
			});
		});
	};

	/**
	 * Make iframe responsive
	 */
	WorkspacePageEmbedder.makeIframeResponsive = function (iframe) {
		const handleResize = () => {
			const containerWidth = iframe.parent().width();
			if (containerWidth < 768) {
				iframe.css("height", "500px");
			} else if (containerWidth < 1024) {
				iframe.css("height", "600px");
			} else {
				iframe.css("height", iframe.data("height") || "700px");
			}
		};

		// Initial resize
		handleResize();

		// Resize on window resize
		$(window).on("resize.page-embed", frappe.utils.debounce(handleResize, 250));
	};

	/**
	 * Utility function to create page embed custom block
	 */
	WorkspacePageEmbedder.createCustomBlock = function (embedName, options = {}) {
		const blockHtml = `
            <div class="page-embed-custom-block" data-page-embed-name="${embedName}">
                <div class="page-embed-placeholder">
                    <div class="text-center p-3">
                        <i class="fa fa-monitor"></i>
                        <p class="text-muted">${embedName}</p>
                    </div>
                </div>
            </div>
        `;

		return {
			html: blockHtml,
			script: `
                $(document).ready(function() {
                    setTimeout(() => {
                        WorkspacePageEmbedder.initPageEmbeds();
                    }, 100);
                });
            `,
			css: options.customCss || "",
		};
	};

	/**
	 * Helper function for workspace managers to add page embeds
	 */
	WorkspacePageEmbedder.addToWorkspace = function (workspaceName, embedName) {
		frappe.confirm(
			`Add page embed "${embedName}" to workspace "${workspaceName}"?`,
			function () {
				frappe.call({
					method: "workspace_embedder.workspace_page_embedder.api.add_embed_to_workspace",
					args: {
						workspace_name: workspaceName,
						embed_name: embedName,
					},
					callback: function (r) {
						if (r.message) {
							frappe.msgprint("Page embed added successfully!");
							setTimeout(() => location.reload(), 1000);
						}
					},
				});
			}
		);
	};

	/**
	 * Inject CSS to hide navigation elements in iframes
	 */
	WorkspacePageEmbedder.injectCleanCSS = function (container) {
		const iframes = container.find("iframe.page-embed-iframe");

		iframes.each(function () {
			const iframe = $(this);

			iframe.on("load", function () {
				try {
					// Try to inject CSS into iframe to hide navigation
					const iframeDoc = this.contentDocument || this.contentWindow.document;

					// Check if we can access iframe content (same-origin)
					if (iframeDoc) {
						// Create style element
						const style = iframeDoc.createElement("style");
						style.type = "text/css";
						style.innerHTML = `
							/* Hide Frappe navigation elements */
							.navbar, .navbar-fixed-top,
							.desk-sidebar, #page-sidebar,
							.page-head .page-title,
							.page-actions, .standard-actions,
							.awesomebar-wrapper,
							.layout-side-section,
							.page-head .breadcrumbs,
							.page-head .page-title-actions,
							.menu-btn-group,
							#navbar-breadcrumbs,
							.page-form .form-sidebar {
								display: none !important;
							}

							/* Adjust layout */
							.page-container {
								padding-top: 0 !important;
							}

							.layout-main-section {
								width: 100% !important;
								margin: 0 !important;
								padding: 15px !important;
							}

							.container {
								max-width: 100% !important;
								width: 100% !important;
							}

							/* Style the content */
							body {
								background: #f8f9fa !important;
							}

							.page-content {
								background: white;
								border-radius: 8px;
								padding: 20px;
								margin: 0;
								box-shadow: 0 2px 4px rgba(0,0,0,0.1);
							}

							/* Mobile responsive */
							@media (max-width: 768px) {
								.layout-main-section {
									padding: 10px !important;
								}
								.page-content {
									padding: 15px;
									border-radius: 6px;
								}
							}
						`;

						// Append to iframe head
						if (iframeDoc.head) {
							iframeDoc.head.appendChild(style);
						}
					}
				} catch (e) {
					// Cross-origin restriction - expected for external pages
					console.log("Cannot inject CSS into iframe due to cross-origin restrictions");
				}
			});
		});
	};

	/**
	 * Load page embeds for a specific workspace
	 */
	WorkspacePageEmbedder.loadWorkspaceEmbeds = function(workspaceName) {
		// Clean up existing embeds first
		if (currentWorkspaceName && currentWorkspaceName !== workspaceName) {
			WorkspacePageEmbedder.cleanupEmbeds();
		}
		currentWorkspaceName = workspaceName;

		console.log('Attempting to load embeds for workspace:', workspaceName);

		frappe.call({
			method: "workspace_embedder.workspace_page_embedder.api.get_workspace_page_embeds",
			args: { workspace_name: workspaceName },
			callback: function(r) {
				if (r.message && r.message.length > 0) {
					console.log('✅ Found', r.message.length, 'embeds, injecting...');
					WorkspacePageEmbedder.injectWorkspaceEmbeds(r.message);
				} else {
					console.log('❌ No embeds found for workspace:', workspaceName);
					// Clean up if no embeds found
					WorkspacePageEmbedder.cleanupEmbeds();
				}
			},
			error: function(r) {
				console.error("Error loading workspace embeds:", r);
				WorkspacePageEmbedder.cleanupEmbeds();
			}
		});
	};

	/**
	 * Clean up embedded pages
	 */
	WorkspacePageEmbedder.cleanupEmbeds = function() {
		console.log('🧹 Cleaning up workspace embeds');
		$(".workspace-page-embeds").remove();
		$("#workspace-embeds-css").remove();

		// Restore editor-js-container when cleaning up
		const editorJsContainer = $('.editor-js-container');
		if (editorJsContainer.length > 0) {
			editorJsContainer.show();
			console.log('👁️ Restored editor-js-container');
		}
	};

	/**
	 * Handle navigation changes
	 */
	WorkspacePageEmbedder.handleNavigationChange = function() {
		const urlParams = new URLSearchParams(window.location.search);
		if (urlParams.get('no_embed') === '1' || urlParams.get('embedded') === '1') {
			return;
		}

		const pathParts = window.location.pathname.split('/');
		if (pathParts.length >= 3 && window.location.pathname.startsWith('/app/')) {
			const newWorkspaceName = pathParts[2];
			const nonWorkspaceRoutes = ['desk', 'query-report', 'print', 'form', 'list', 'tree', 'File'];

			if (!nonWorkspaceRoutes.includes(newWorkspaceName)) {
				if (currentWorkspaceName !== newWorkspaceName) {
					console.log('🔄 Workspace changed from', currentWorkspaceName, 'to', newWorkspaceName);
					WorkspacePageEmbedder.loadWorkspaceEmbeds(newWorkspaceName);
				}
			} else {
				// Not a workspace, clean up embeds
				WorkspacePageEmbedder.cleanupEmbeds();
				currentWorkspaceName = null;
			}
		} else {
			// Not a workspace URL, clean up embeds
			WorkspacePageEmbedder.cleanupEmbeds();
			currentWorkspaceName = null;
		}
	};

	/**
	 * Inject page embeds into workspace content
	 */
	WorkspacePageEmbedder.injectWorkspaceEmbeds = function(embeds) {
		// Try different selectors to find the main content area
		const contentSelectors = [
			".layout-main-section",
			".container",
			".workspace-container",
			".page-content"
		];

		let workspaceContent = null;
		for (const selector of contentSelectors) {
			const element = $(selector);
			if (element.length > 0) {
				workspaceContent = element.first();
				console.log('🎯 Found workspace content container:', selector);
				break;
			}
		}

		if (!workspaceContent || workspaceContent.length === 0) {
			console.log("❌ Workspace container not found, tried:", contentSelectors);
			return;
		}

		// Remove existing embeds container first
		$(".workspace-page-embeds").remove();

		// Create container for page embeds
		const embedsContainer = $('<div class="workspace-page-embeds"></div>');

		// Hide editor-js-container when we have page embeds
		const editorJsContainer = workspaceContent.find('.editor-js-container');
		if (editorJsContainer.length > 0) {
			editorJsContainer.hide();
			console.log('🙈 Hidden editor-js-container for page embeds');
		}

		// Insert embeds in the main content area
		let inserted = false;

		// Strategy 1: Insert in layout-main-section directly
		const layoutMain = workspaceContent.find('.layout-main-section').first();
		if (layoutMain.length > 0) {
			layoutMain.append(embedsContainer);
			console.log('📍 Inserted into layout-main-section');
			inserted = true;
		}

		// Strategy 2: Insert before workspace footer with margin reset
		if (!inserted) {
			const workspaceFooter = workspaceContent.find('.workspace-footer, .layout-footer, [class*="footer"]');
			if (workspaceFooter.length > 0) {
				// Add negative margin to counteract any spacing
				embedsContainer.css('margin-top', '-20px');
				embedsContainer.insertBefore(workspaceFooter.first());
				console.log('📍 Inserted before footer with margin adjustment');
				inserted = true;
			}
		}

		// Strategy 3: Insert at the very end of visible content, skipping hidden/overlay elements
		if (!inserted) {
			const allChildren = workspaceContent.children();
			let targetElement = null;

			// Find the last visible content element (not overlay, not footer)
			allChildren.each(function(index) {
				const $el = $(this);
				const classes = $el.attr('class') || '';

				// Skip overlay, footer, and hidden elements
				if (!classes.match(/(overlay|footer|hidden|script|style)/i) &&
					$el.is(':visible') &&
					$el.height() > 0) {
					targetElement = $el;
				}
			});

			if (targetElement) {
				embedsContainer.insertAfter(targetElement);
				console.log('📍 Inserted after last visible content');
				inserted = true;
			}
		}

		// Strategy 4: Force position with absolute positioning relative to layout-main-section
		if (!inserted) {
			const layoutMain = workspaceContent.find('.layout-main-section').first();
			if (layoutMain.length > 0) {
				embedsContainer.css({
					'position': 'relative',
					'margin-top': '20px',
					'margin-bottom': '20px'
				});
				layoutMain.append(embedsContainer);
				console.log('📍 Force inserted with positioning');
				inserted = true;
			}
		}

		// Strategy 5: Fallback with DOM manipulation to clear interfering elements
		if (!inserted) {
			// Find and temporarily hide interfering elements
			const interferingElements = workspaceContent.find('.codex-editor-overlay');
			interferingElements.hide();

			workspaceContent.append(embedsContainer);
			console.log('📍 Fallback: Inserted with interference cleanup');

			// Show them back after a delay
			setTimeout(() => {
				interferingElements.show();
			}, 100);
		}

		// Add each embed
		embeds.forEach(function(embed) {
			const embedHtml = `
				<div class="workspace-page-embed" data-embed="${embed.name}">
					<div class="page-embed-header">
						<h4><i class="fa fa-monitor"></i> ${embed.embed_name}</h4>
						${embed.description ? `<p class="text-muted">${embed.description}</p>` : ''}
					</div>
					<div class="page-embed-container">
						<iframe
							src="/app/${embed.target_page}?embedded=1&no_embed=1"
							class="page-embed-iframe ${embed.responsive ? 'responsive' : ''}"
							style="width: ${embed.display_width || 100}%; height: ${embed.display_height || 600}px;"
							frameborder="0"
							sandbox="allow-scripts allow-same-origin allow-forms"
						>
							Loading ${embed.embed_name}...
						</iframe>
					</div>
				</div>
			`;

			embedsContainer.append(embedHtml);
		});

		// Apply responsive CSS and hide navigation in iframes
		WorkspacePageEmbedder.setupWorkspaceEmbeds();
	};

	/**
	 * Setup workspace embeds after injection
	 */
	WorkspacePageEmbedder.setupWorkspaceEmbeds = function() {
		// Add CSS for workspace embeds
		const css = `
			<style id="workspace-embeds-css">
			.workspace-page-embeds {
				margin: 20px 0;
				clear: both;
				position: relative;
				z-index: 1;
			}

			.workspace-embeds-wrapper {
				clear: both;
				position: relative;
				z-index: 1;
			}

			/* Override any interfering spacing from preceding elements */
			.layout-main-section .workspace-page-embeds {
				margin-top: 0 !important;
				padding-top: 20px;
			}

			/* Reset spacing if preceded by overlay elements */
			.codex-editor-overlay + .workspace-page-embeds,
			.codex-editor + .workspace-page-embeds {
				margin-top: 10px !important;
			}

			/* Ensure proper positioning relative to main content */
			.layout-main-section {
				position: relative;
			}

			.layout-main-section > .workspace-page-embeds {
				position: static !important;
				width: 100%;
			}

			.workspace-page-embed {
				margin-bottom: 30px;
				border: 1px solid #dee2e6;
				border-radius: 8px;
				overflow: hidden;
				box-shadow: 0 2px 4px rgba(0,0,0,0.1);
			}

			.workspace-page-embed .page-embed-header {
				background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
				color: white;
				padding: 15px 20px;
				border-bottom: 1px solid rgba(255,255,255,0.1);
			}

			.workspace-page-embed .page-embed-header h4 {
				margin: 0;
				font-size: 16px;
				font-weight: 600;
			}

			.workspace-page-embed .page-embed-header p {
				margin: 5px 0 0 0;
				opacity: 0.9;
				font-size: 14px;
			}

			.workspace-page-embed .page-embed-container {
				background: white;
				margin: 0;
			}

			.workspace-page-embed .page-embed-iframe {
				width: 100% !important;
				border: none;
				display: block;
			}

			/* Responsive */
			@media (max-width: 768px) {
				.workspace-page-embed .page-embed-iframe {
					height: 450px !important;
				}
			}

			@media (max-width: 576px) {
				.workspace-page-embed .page-embed-iframe {
					height: 400px !important;
				}
				.workspace-page-embed .page-embed-header {
					padding: 10px 15px;
				}
			}
			</style>
		`;

		// Remove existing CSS and add new
		$("#workspace-embeds-css").remove();
		$("head").append(css);

		// Setup iframe hiding for navigation elements
		setTimeout(() => {
			$(".workspace-page-embed .page-embed-iframe").each(function() {
				WorkspacePageEmbedder.injectCleanCSS($(this).parent());
			});
		}, 1000);
	};

	// Multiple detection attempts for workspace (only if not embedded)
	const urlParams = new URLSearchParams(window.location.search);
	if (urlParams.get('no_embed') !== '1' && urlParams.get('embedded') !== '1') {
		let detectionAttempts = 0;
		function attemptWorkspaceDetection() {
			detectionAttempts++;
			console.log(`🔍 Workspace detection attempt #${detectionAttempts}`);
			console.log('Current URL:', window.location.pathname);
			console.log('DOM ready state:', document.readyState);

			const pathParts = window.location.pathname.split('/');
			if (pathParts.length >= 3) {
				const workspaceName = pathParts[2];
				console.log('Potential workspace name from URL:', workspaceName);
				WorkspacePageEmbedder.loadWorkspaceEmbeds(workspaceName);
				return true;
			}
			return false;
		}

		// Try immediate detection
		attemptWorkspaceDetection();

		// Try after short delay
		setTimeout(attemptWorkspaceDetection, 500);
		setTimeout(attemptWorkspaceDetection, 1500);
		setTimeout(attemptWorkspaceDetection, 3000);
	} else {
		console.log('🚫 Multiple detection skipped - page is embedded');
	}

	// Initialize on page load if workspace is already present
	if ($(".workspace-container").length > 0) {
		setTimeout(() => {
			WorkspacePageEmbedder.initPageEmbeds();
		}, 500);
	}
})();
