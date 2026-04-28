/**
 * Workspace Page Embedder - Frontend Integration
 * ==============================================
 *
 * Extends Frappe Workspace to support page embedding through Custom HTML Blocks
 * and workspace content manipulation.
 */

(function () {
	"use strict";

	if (typeof frappe === "undefined") return;

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
		console.log('Attempting to load embeds for workspace:', workspaceName);

		// Get page embeds for this workspace
		frappe.call({
			method: "workspace_embedder.workspace_page_embedder.api.get_workspace_page_embeds",
			args: { workspace_name: workspaceName },
			callback: function(r) {
				console.log('API response:', r);
				if (r.message && r.message.length > 0) {
					console.log('Found', r.message.length, 'embeds, injecting...');
					WorkspacePageEmbedder.injectWorkspaceEmbeds(r.message);
				} else {
					console.log('No embeds found for workspace:', workspaceName);
				}
			},
			error: function(r) {
				console.error("Error loading workspace embeds:", r);
			}
		});
	};

	/**
	 * Inject page embeds into workspace content
	 */
	WorkspacePageEmbedder.injectWorkspaceEmbeds = function(embeds) {
		const workspaceContent = $(".workspace-container, .layout-main-section");

		if (workspaceContent.length === 0) {
			console.log("Workspace container not found");
			return;
		}

		// Create container for page embeds
		let embedsContainer = $(".workspace-page-embeds");
		if (embedsContainer.length === 0) {
			embedsContainer = $('<div class="workspace-page-embeds"></div>');
			workspaceContent.append(embedsContainer);
		}

		// Clear existing embeds
		embedsContainer.empty();

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
							src="/app/${embed.target_page}"
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

	// Alternative detection method - check for workspace elements after page load
	setTimeout(function() {
		// Check if we have workspace elements in DOM
		if ($(".workspace-container").length > 0 || $("[data-route]").length > 0) {
			const pathParts = window.location.pathname.split('/');
			if (pathParts.length >= 3) {
				const workspaceName = pathParts[2];
				console.log('Alternative detection - workspace found:', workspaceName);
				WorkspacePageEmbedder.loadWorkspaceEmbeds(workspaceName);
			}
		}
	}, 1500);

	// Initialize on page load if workspace is already present
	if ($(".workspace-container").length > 0) {
		setTimeout(() => {
			WorkspacePageEmbedder.initPageEmbeds();
		}, 500);
	}
})();
