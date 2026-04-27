/**
 * Page Embed DocType Client Script
 * =================================
 *
 * Provides rich admin interface for configuring page embeds with:
 * - Live preview functionality
 * - Form validation and UX improvements
 * - Target page selection with autocomplete
 * - Dimension validation and helpers
 * - Permission management interface
 */

frappe.ui.form.on("Page Embed", {
	refresh: function (frm) {
		// Add custom buttons for better UX
		frm.add_custom_button(
			__("Preview Embed"),
			function () {
				preview_embed(frm);
			},
			__("Actions")
		);

		frm.add_custom_button(
			__("Test Page Access"),
			function () {
				test_page_access(frm);
			},
			__("Actions")
		);

		frm.add_custom_button(
			__("Add to Workspace"),
			function () {
				add_to_workspace(frm);
			},
			__("Actions")
		);

		frm.add_custom_button(
			__("Generate CSS Template"),
			function () {
				generate_css_template(frm);
			},
			__("Helpers")
		);

		// Set up field watchers for live updates
		setup_field_watchers(frm);

		// Add help text and formatting
		add_help_text(frm);
	},

	target_page: function (frm) {
		// Auto-fill embed name based on page
		if (frm.doc.target_page && !frm.doc.embed_name) {
			frm.set_value(
				"embed_name",
				frm.doc.target_page.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) +
					" Embed"
			);
		}

		// Validate page access
		if (frm.doc.target_page) {
			validate_page_access(frm);
		}
	},

	display_height: function (frm) {
		validate_dimensions(frm);
	},

	display_width: function (frm) {
		validate_dimensions(frm);
	},

	custom_css: function (frm) {
		// Add CSS syntax highlighting if available
		if (frm.fields_dict.custom_css.ace) {
			frm.fields_dict.custom_css.ace.getSession().setMode("ace/mode/css");
		}
	},

	responsive: function (frm) {
		// Show/hide width setting based on responsive mode
		frm.toggle_display("display_width", !frm.doc.responsive);

		if (frm.doc.responsive) {
			frm.set_df_property("display_width", "read_only", 1);
			frm.set_value("display_width", 100);
		} else {
			frm.set_df_property("display_width", "read_only", 0);
		}
	},
});

/**
 * Preview the embed in a dialog
 */
function preview_embed(frm) {
	if (!frm.doc.target_page) {
		frappe.msgprint(__("Please select a target page first"));
		return;
	}

	frappe.call({
		method: "preview_embed",
		doc: frm.doc,
		callback: function (r) {
			if (r.message) {
				show_preview_dialog(r.message);
			}
		},
	});
}

/**
 * Show preview in a modal dialog
 */
function show_preview_dialog(preview_data) {
	const d = new frappe.ui.Dialog({
		title: __("Page Embed Preview"),
		size: "extra-large",
		fields: [
			{
				fieldname: "preview_html",
				fieldtype: "HTML",
				label: __("Preview"),
				options: `
                    <div class="preview-container" style="border: 1px solid #d1d8dd; border-radius: 6px; padding: 15px; background: #f8f9fa;">
                        <h5>Live Preview:</h5>
                        ${preview_data.html}
                    </div>
                    <div class="preview-details" style="margin-top: 15px; padding: 10px; background: #e8f4fd; border-radius: 4px;">
                        <strong>Page URL:</strong> ${preview_data.page_url}<br>
                        <strong>Dimensions:</strong> ${preview_data.dimensions.width}% × ${preview_data.dimensions.height}px
                    </div>
                `,
			},
		],
	});
	d.show();
}

/**
 * Test if current user has access to target page
 */
function test_page_access(frm) {
	if (!frm.doc.target_page) {
		frappe.msgprint(__("Please select a target page first"));
		return;
	}

	frappe.call({
		method: "frappe.client.get",
		args: {
			doctype: "Page",
			name: frm.doc.target_page,
		},
		callback: function (r) {
			if (r.message) {
				frappe.msgprint({
					message: __("✅ Page access confirmed. You can embed this page."),
					indicator: "green",
				});
			}
		},
		error: function (_r) {
			frappe.msgprint({
				message: __("❌ Cannot access this page. Check permissions."),
				indicator: "red",
			});
		},
	});
}

/**
 * Generate CSS template for common styling
 */
function generate_css_template(frm) {
	const css_template = `/* Page Embed Custom Styling */
.page-embed-container {
    border: 1px solid #dee2e6;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    margin: 20px 0;
}

.page-embed-iframe {
    display: block;
    border: none;
    width: 100%;
}

.page-embed-iframe.responsive {
    max-width: 100%;
    height: auto;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
    .page-embed-container {
        margin: 10px 0;
        border-radius: 4px;
    }

    .page-embed-iframe {
        height: 400px !important;
    }
}`;

	frm.set_value("custom_css", css_template);
	frappe.msgprint(__("CSS template added! Customize as needed."));
}

/**
 * Validate dimensions are within acceptable ranges
 */
function validate_dimensions(frm) {
	if (
		frm.doc.display_height &&
		(frm.doc.display_height < 100 || frm.doc.display_height > 2000)
	) {
		frappe.msgprint({
			message: __("Height should be between 100-2000 pixels for optimal display"),
			indicator: "yellow",
		});
	}

	if (frm.doc.display_width && (frm.doc.display_width < 10 || frm.doc.display_width > 100)) {
		frappe.msgprint({
			message: __("Width should be between 10-100% for proper layout"),
			indicator: "yellow",
		});
	}
}

/**
 * Validate page access and show status
 */
function validate_page_access(frm) {
	frappe.db.get_value("Page", frm.doc.target_page, "title").then((r) => {
		if (r.message && r.message.title) {
			frm.dashboard.add_comment(
				__("Target page found: {0}", [r.message.title]),
				"green",
				true
			);
		}
	});
}

/**
 * Set up field watchers for live form updates
 */
function setup_field_watchers(frm) {
	// Auto-generate embed name from target page
	frm.fields_dict.target_page.input.addEventListener("blur", function () {
		if (!frm.doc.embed_name && this.value) {
			const embed_name =
				this.value.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) + " Embed";
			frm.set_value("embed_name", embed_name);
		}
	});
}

/**
 * Add helpful descriptions and examples
 */
function add_help_text(frm) {
	// Add description for iframe sandbox
	frm.set_df_property(
		"iframe_sandbox",
		"description",
		__("Security attributes for iframe. Default: allow-scripts allow-same-origin allow-forms")
	);

	// Add description for custom CSS
	frm.set_df_property(
		"custom_css",
		"description",
		__(
			"Add custom CSS to style the embedded page container. Use CSS class: .page-embed-container"
		)
	);

	// Add description for permissions
	frm.set_df_property(
		"permissions",
		"description",
		__("Define which roles can view this embedded page in workspace")
	);
}

/**
 * Add page embed to a workspace
 */
function add_to_workspace(frm) {
	if (!frm.doc.name) {
		frappe.msgprint(__("Please save the Page Embed first"));
		return;
	}

	if (!frm.doc.enabled) {
		frappe.msgprint(__("Please enable the Page Embed first"));
		return;
	}

	const d = new frappe.ui.Dialog({
		title: __("Add to Workspace"),
		fields: [
			{
				fieldname: "workspace",
				fieldtype: "Link",
				label: __("Select Workspace"),
				options: "Workspace",
				reqd: 1,
				get_query: function () {
					return {
						filters: {
							public: 1,
						},
					};
				},
			},
			{
				fieldname: "section_break",
				fieldtype: "Section Break",
			},
			{
				fieldname: "info",
				fieldtype: "HTML",
				options: `
                    <div class="alert alert-info">
                        <strong>Note:</strong> This will create a Custom HTML Block and add it to the selected workspace.
                        The page embed will appear as a new section in the workspace.
                    </div>
                `,
			},
		],
		primary_action_label: __("Add to Workspace"),
		primary_action: function (values) {
			frappe.call({
				method: "workspace_page_embedder.api.add_embed_to_workspace",
				args: {
					workspace_name: values.workspace,
					embed_name: frm.doc.name,
				},
				callback: function (r) {
					if (r.message && r.message.success) {
						frappe.msgprint({
							message:
								r.message.message +
								`<br><br><a href="/app/workspace/${values.workspace}" target="_blank">View Workspace</a>`,
							title: __("Success"),
							indicator: "green",
						});
						d.hide();
					}
				},
			});
		},
	});
	d.show();
}
