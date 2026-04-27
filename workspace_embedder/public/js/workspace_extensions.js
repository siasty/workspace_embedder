/**
 * Workspace Page Embedder - Frontend Integration
 * ==============================================
 *
 * Extends Frappe Workspace to support page embedding through Custom HTML Blocks
 * and workspace content manipulation.
 */

(function() {
    'use strict';

    if (typeof frappe === 'undefined') return;

    // Namespace for workspace page embedder
    window.WorkspacePageEmbedder = window.WorkspacePageEmbedder || {};

    /**
     * Initialize workspace page embedder when workspace loads
     */
    $(document).on('workspace-loaded', function() {
        WorkspacePageEmbedder.initPageEmbeds();
    });

    /**
     * Initialize page embeds in the current workspace
     */
    WorkspacePageEmbedder.initPageEmbeds = function() {
        // Find all page embed containers in workspace
        $('.workspace-container [data-page-embed-name]').each(function() {
            const container = $(this);
            const embedName = container.data('page-embed-name');

            if (embedName && !container.hasClass('page-embed-loaded')) {
                WorkspacePageEmbedder.loadPageEmbed(embedName, container);
            }
        });
    };

    /**
     * Load a specific page embed into a container
     */
    WorkspacePageEmbedder.loadPageEmbed = function(embedName, container) {
        container.addClass('page-embed-loading');
        container.html(`
            <div class="page-embed-placeholder">
                <div class="text-center p-5">
                    <i class="fa fa-spinner fa-spin fa-2x text-muted"></i>
                    <p class="text-muted mt-3">Loading ${embedName}...</p>
                </div>
            </div>
        `);

        frappe.call({
            method: 'workspace_page_embedder.api.get_embed_html',
            args: { embed_name: embedName },
            callback: function(r) {
                if (r.message) {
                    container.html(r.message);
                    container.addClass('page-embed-loaded');
                    container.removeClass('page-embed-loading');

                    // Initialize any iframe communication if needed
                    WorkspacePageEmbedder.setupIframeComm(container);

                    // Trigger custom event
                    container.trigger('page-embed-loaded', [embedName]);
                } else {
                    WorkspacePageEmbedder.showEmbedError(container, 'No content returned');
                }
            },
            error: function(r) {
                const errorMsg = r.message || 'Failed to load page embed';
                WorkspacePageEmbedder.showEmbedError(container, errorMsg);
            }
        });
    };

    /**
     * Show error message in embed container
     */
    WorkspacePageEmbedder.showEmbedError = function(container, errorMsg) {
        container.removeClass('page-embed-loading');
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
    WorkspacePageEmbedder.setupIframeComm = function(container) {
        const iframes = container.find('iframe.page-embed-iframe');

        iframes.each(function() {
            const iframe = $(this);

            // Add responsive handling
            if (iframe.hasClass('responsive')) {
                WorkspacePageEmbedder.makeIframeResponsive(iframe);
            }

            // Setup iframe load event
            iframe.on('load', function() {
                iframe.fadeIn();
            });
        });
    };

    /**
     * Make iframe responsive
     */
    WorkspacePageEmbedder.makeIframeResponsive = function(iframe) {
        const handleResize = () => {
            const containerWidth = iframe.parent().width();
            if (containerWidth < 768) {
                iframe.css('height', '500px');
            } else if (containerWidth < 1024) {
                iframe.css('height', '600px');
            } else {
                iframe.css('height', iframe.data('height') || '700px');
            }
        };

        // Initial resize
        handleResize();

        // Resize on window resize
        $(window).on('resize.page-embed', frappe.utils.debounce(handleResize, 250));
    };

    /**
     * Utility function to create page embed custom block
     */
    WorkspacePageEmbedder.createCustomBlock = function(embedName, options = {}) {
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
            css: options.customCss || ''
        };
    };

    /**
     * Helper function for workspace managers to add page embeds
     */
    WorkspacePageEmbedder.addToWorkspace = function(workspaceName, embedName) {
        frappe.confirm(
            `Add page embed "${embedName}" to workspace "${workspaceName}"?`,
            function() {
                frappe.call({
                    method: 'workspace_page_embedder.api.add_embed_to_workspace',
                    args: {
                        workspace_name: workspaceName,
                        embed_name: embedName
                    },
                    callback: function(r) {
                        if (r.message) {
                            frappe.msgprint('Page embed added successfully!');
                            setTimeout(() => location.reload(), 1000);
                        }
                    }
                });
            }
        );
    };

    // Initialize on page load if workspace is already present
    if ($('.workspace-container').length > 0) {
        setTimeout(() => {
            WorkspacePageEmbedder.initPageEmbeds();
        }, 500);
    }

})();