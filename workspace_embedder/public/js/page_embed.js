/**
 * Workspace Page Embedder - Frontend Module
 * =========================================
 *
 * Handles page embed rendering, lifecycle management,
 * and user interactions in workspaces.
 */

(function() {
    'use strict';

    // Global namespace
    window.WorkspacePageEmbedder = window.WorkspacePageEmbedder || {};

    /**
     * Page Embed Manager
     */
    WorkspacePageEmbedder.EmbedManager = {
        /**
         * Initialize all embeds in the current workspace
         */
        init: function() {
            this.initializeEmbeds();
            this.setupResizeObserver();
            this.setupEventHandlers();
        },

        /**
         * Initialize individual embed instances
         */
        initializeEmbeds: function() {
            const embeds = document.querySelectorAll('.page-embed-container');
            embeds.forEach(embed => {
                this.initializeEmbed(embed);
            });
        },

        /**
         * Initialize a single embed
         */
        initializeEmbed: function(container) {
            const embedName = container.dataset.embed;
            if (!embedName) return;

            const iframe = container.querySelector('.page-embed-iframe');
            if (!iframe) return;

            // Add loading state
            this.showLoading(container);

            // Setup iframe load/error handlers
            iframe.addEventListener('load', () => {
                this.hideLoading(container);
                this.setupIframeComm(iframe, embedName);
            });

            iframe.addEventListener('error', () => {
                this.showError(container, 'Failed to load page');
            });

            // Setup message handler for cross-origin communication
            window.addEventListener('message', (event) => {
                this.handleIframeMessage(event, embedName);
            });
        },

        /**
         * Setup resize observer for responsive behavior
         */
        setupResizeObserver: function() {
            if (!window.ResizeObserver) return;

            const observer = new ResizeObserver((entries) => {
                entries.forEach(entry => {
                    const container = entry.target;
                    const iframe = container.querySelector('.page-embed-iframe');

                    if (iframe && container.classList.contains('responsive')) {
                        // Adjust height based on container width
                        const width = entry.contentRect.width;
                        if (width < 768) {
                            iframe.style.height = '300px';
                        } else if (width < 1024) {
                            iframe.style.height = '400px';
                        } else {
                            iframe.style.height = '600px';
                        }
                    }
                });
            });

            document.querySelectorAll('.page-embed-container').forEach(el => {
                observer.observe(el);
            });
        },

        /**
         * Setup event handlers
         */
        setupEventHandlers: function() {
            // Refresh button
            document.querySelectorAll('[data-embed-refresh]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const embedName = e.target.dataset.embedRefresh;
                    this.refreshEmbed(embedName);
                });
            });

            // Fullscreen button
            document.querySelectorAll('[data-embed-fullscreen]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const embedName = e.target.dataset.embedFullscreen;
                    this.toggleFullscreen(embedName);
                });
            });
        },

        /**
         * Show loading state
         */
        showLoading: function(container) {
            const iframe = container.querySelector('.page-embed-iframe');
            if (iframe) {
                iframe.style.display = 'none';
            }

            let loader = container.querySelector('.page-embed-loading');
            if (!loader) {
                loader = document.createElement('div');
                loader.className = 'page-embed-loading';
                container.appendChild(loader);
            }
            loader.style.display = 'flex';
        },

        /**
         * Hide loading state
         */
        hideLoading: function(container) {
            const loader = container.querySelector('.page-embed-loading');
            if (loader) {
                loader.style.display = 'none';
            }

            const iframe = container.querySelector('.page-embed-iframe');
            if (iframe) {
                iframe.style.display = 'block';
            }
        },

        /**
         * Show error state
         */
        showError: function(container, message) {
            let error = container.querySelector('.page-embed-error');
            if (!error) {
                error = document.createElement('div');
                error.className = 'page-embed-error';
                container.appendChild(error);
            }

            error.textContent = message || 'Error loading page';
            error.style.display = 'flex';

            const iframe = container.querySelector('.page-embed-iframe');
            if (iframe) {
                iframe.style.display = 'none';
            }
        },

        /**
         * Setup iframe communication
         */
        setupIframeComm: function(iframe, embedName) {
            try {
                // Send init message to iframe
                iframe.contentWindow.postMessage({
                    type: 'EMBED_INIT',
                    embedName: embedName
                }, '*');
            } catch (e) {
                // Cross-origin - expected
            }
        },

        /**
         * Handle messages from iframes
         */
        handleIframeMessage: function(event, embedName) {
            const data = event.data;

            if (typeof data !== 'object' || !data.type) return;

            switch (data.type) {
                case 'EMBED_HEIGHT_CHANGED':
                    this.adjustHeight(embedName, data.height);
                    break;

                case 'EMBED_RELOAD':
                    this.refreshEmbed(embedName);
                    break;

                case 'EMBED_ERROR':
                    const container = document.querySelector(`[data-embed="${embedName}"]`);
                    if (container) {
                        this.showError(container, data.message);
                    }
                    break;
            }
        },

        /**
         * Refresh embed
         */
        refreshEmbed: function(embedName) {
            const container = document.querySelector(`[data-embed="${embedName}"]`);
            if (!container) return;

            const iframe = container.querySelector('.page-embed-iframe');
            if (iframe) {
                this.showLoading(container);
                iframe.src = iframe.src;
            }
        },

        /**
         * Adjust iframe height
         */
        adjustHeight: function(embedName, height) {
            const iframe = document.querySelector(`[data-embed="${embedName}"] .page-embed-iframe`);
            if (iframe && height) {
                iframe.style.height = height + 'px';
            }
        },

        /**
         * Toggle fullscreen mode
         */
        toggleFullscreen: function(embedName) {
            const container = document.querySelector(`[data-embed="${embedName}"]`);
            if (!container) return;

            if (container.classList.contains('fullscreen')) {
                document.exitFullscreen?.();
                container.classList.remove('fullscreen');
            } else {
                container.requestFullscreen?.();
                container.classList.add('fullscreen');
            }
        }
    };

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', () => {
        WorkspacePageEmbedder.EmbedManager.init();
    });

    // Re-initialize on Frappe page change
    if (typeof frappe !== 'undefined') {
        frappe.ui.form.on('Workspace', {
            onload: function() {
                WorkspacePageEmbedder.EmbedManager.init();
            }
        });
    }
})();