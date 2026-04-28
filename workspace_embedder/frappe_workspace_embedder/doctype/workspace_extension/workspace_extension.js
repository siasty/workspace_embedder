/**
 * Workspace Form Extensions
 * =========================
 *
 * Extends the Workspace form to include Page Embed functionality
 * directly in the workspace editor interface.
 */

frappe.ui.form.on("Workspace", {
	refresh: function (frm) {
		// Add Page Embed management button
		if (frm.doc.name) {
			frm.add_custom_button(
				__("Manage Page Embeds"),
				function () {
					show_page_embed_manager(frm);
				},
				__("Actions")
			);

			frm.add_custom_button(
				__("Add Page Embed"),
				function () {
					add_page_embed_to_workspace(frm);
				},
				__("Actions")
			);
		}

		// Show current page embeds info
		if (frm.doc.name && frm.doc.content) {
			show_current_embeds_info(frm);
		}
	},
});

/**
 * Show Page Embed Manager Dialog
 */
function show_page_embed_manager(frm) {
	// Get current page embeds in this workspace
	frappe.call({
		method: "workspace_embedder.frappe_workspace_embedder.api.list_workspace_embeds",
		args: { workspace_name: frm.doc.name },
		callback: function (r) {
			if (r.message) {
				show_embed_manager_dialog(frm, r.message);
			}
		},
	});
}

/**
 * Show embed manager dialog with current embeds
 */
function show_embed_manager_dialog(frm, current_embeds) {
	let embed_list_html = "";

	if (current_embeds.length === 0) {
		embed_list_html =
			'<div class="alert alert-info">No page embeds found in this workspace.</div>';
	} else {
		embed_list_html = '<div class="page-embeds-list">';
		current_embeds.forEach((embed) => {
			embed_list_html += `
                <div class="embed-item" style="border: 1px solid #ddd; padding: 10px; margin: 5px 0; border-radius: 4px;">
                    <div class="row">
                        <div class="col-md-8">
                            <strong>${embed.embed_name}</strong><br>
                            <small class="text-muted">Target: ${embed.target_page}</small><br>
                            <small>Size: ${embed.dimensions.width}% × ${embed.dimensions.height}px</small>
                        </div>
                        <div class="col-md-4 text-right">
                            <button class="btn btn-sm btn-default" onclick="edit_page_embed('${embed.name}')">
                                <i class="fa fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="remove_embed_from_workspace('${frm.doc.name}', '${embed.name}')">
                                <i class="fa fa-trash"></i> Remove
                            </button>
                        </div>
                    </div>
                </div>
            `;
		});
		embed_list_html += "</div>";
	}

	const d = new frappe.ui.Dialog({
		title: __("Manage Page Embeds - {0}", [frm.doc.label]),
		size: "large",
		fields: [
			{
				fieldname: "current_embeds",
				fieldtype: "HTML",
				options: embed_list_html,
			},
			{
				fieldname: "section_break",
				fieldtype: "Section Break",
				label: __("Add New Embed"),
			},
			{
				fieldname: "add_embed_btn",
				fieldtype: "Button",
				label: __("Add New Page Embed"),
				click: function () {
					d.hide();
					add_page_embed_to_workspace(frm);
				},
			},
		],
	});

	d.show();
}

/**
 * Add page embed directly from workspace
 */
function add_page_embed_to_workspace(frm) {
	const d = new frappe.ui.Dialog({
		title: __("Add Page Embed to Workspace"),
		size: "large",
		fields: [
			{
				fieldname: "method",
				fieldtype: "Select",
				label: __("Method"),
				options: "Create New Page Embed\nUse Existing Page Embed",
				default: "Create New Page Embed",
				change: function () {
					const method = this.get_value();
					d.get_field("existing_embed").toggle(method === "Use Existing Page Embed");
					d.get_field("new_embed_section").toggle(method === "Create New Page Embed");
				},
			},
			{
				fieldname: "existing_embed",
				fieldtype: "Link",
				label: __("Select Existing Page Embed"),
				options: "Page Embed",
				depends_on: 'eval:doc.method=="Use Existing Page Embed"',
				get_query: function () {
					return {
						filters: {
							enabled: 1,
						},
					};
				},
			},
			{
				fieldname: "new_embed_section",
				fieldtype: "Section Break",
				label: __("Create New Page Embed"),
				depends_on: 'eval:doc.method=="Create New Page Embed"',
			},
			{
				fieldname: "embed_name",
				fieldtype: "Data",
				label: __("Embed Name"),
				reqd: 1,
				depends_on: 'eval:doc.method=="Create New Page Embed"',
			},
			{
				fieldname: "target_page",
				fieldtype: "Link",
				label: __("Target Page"),
				options: "Page",
				reqd: 1,
				depends_on: 'eval:doc.method=="Create New Page Embed"',
				change: function () {
					if (this.get_value() && !d.get_value("embed_name")) {
						const pageName = this.get_value();
						const embedName =
							pageName.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) +
							" Embed";
						d.set_value("embed_name", embedName);
					}
				},
			},
			{
				fieldname: "column_break_1",
				fieldtype: "Column Break",
			},
			{
				fieldname: "display_height",
				fieldtype: "Int",
				label: __("Height (px)"),
				default: 600,
				depends_on: 'eval:doc.method=="Create New Page Embed"',
			},
			{
				fieldname: "display_width",
				fieldtype: "Percent",
				label: __("Width (%)"),
				default: 100,
				depends_on: 'eval:doc.method=="Create New Page Embed"',
			},
			{
				fieldname: "responsive",
				fieldtype: "Check",
				label: __("Responsive Design"),
				default: 1,
				depends_on: 'eval:doc.method=="Create New Page Embed"',
			},
			{
				fieldname: "styling_section",
				fieldtype: "Section Break",
				label: __("Styling (Optional)"),
				collapsible: 1,
				depends_on: 'eval:doc.method=="Create New Page Embed"',
			},
			{
				fieldname: "custom_css",
				fieldtype: "Code",
				label: __("Custom CSS"),
				options: "CSS",
				depends_on: 'eval:doc.method=="Create New Page Embed"',
			},
		],
		primary_action_label: __("Add to Workspace"),
		primary_action: function (values) {
			if (values.method === "Use Existing Page Embed") {
				// Use existing embed
				add_existing_embed_to_workspace(frm, values.existing_embed, d);
			} else {
				// Create new embed and add to workspace
				create_and_add_embed_to_workspace(frm, values, d);
			}
		},
	});

	d.show();
	// Initial toggle
	d.get_field("existing_embed").toggle(false);
}

/**
 * Add existing page embed to workspace
 */
function add_existing_embed_to_workspace(frm, embed_name, dialog) {
	frappe.call({
		method: "workspace_embedder.frappe_workspace_embedder.api.add_embed_to_workspace",
		args: {
			workspace_name: frm.doc.name,
			embed_name: embed_name,
		},
		callback: function (r) {
			if (r.message && r.message.success) {
				frappe.msgprint({
					message: r.message.message,
					title: __("Success"),
					indicator: "green",
				});
				dialog.hide();
				frm.reload_doc();
			}
		},
	});
}

/**
 * Create new page embed and add to workspace
 */
function create_and_add_embed_to_workspace(frm, values, dialog) {
	// First create the page embed
	frappe.call({
		method: "frappe.client.insert",
		args: {
			doc: {
				doctype: "Page Embed",
				embed_name: values.embed_name,
				target_page: values.target_page,
				display_height: values.display_height,
				display_width: values.display_width,
				responsive: values.responsive,
				custom_css: values.custom_css,
				enabled: 1,
				permissions: [
					{ role: "System Manager", read: 1 },
					{ role: "Workspace Manager", read: 1 },
				],
			},
		},
		callback: function (r) {
			if (r.message) {
				// Now add it to workspace
				add_existing_embed_to_workspace(frm, r.message.name, dialog);
			}
		},
	});
}

/**
 * Show current embeds info in form
 */
function show_current_embeds_info(frm) {
	frappe.call({
		method: "workspace_embedder.frappe_workspace_embedder.api.list_workspace_embeds",
		args: { workspace_name: frm.doc.name },
		callback: function (r) {
			if (r.message && r.message.length > 0) {
				const embed_count = r.message.length;
				frm.dashboard.add_comment(
					__("This workspace has {0} page embed(s)", [embed_count]),
					"blue",
					true
				);
			}
		},
	});
}

/**
 * Global functions for embed management
 */
window.edit_page_embed = function (embed_name) {
	frappe.set_route("Form", "Page Embed", embed_name);
};

window.remove_embed_from_workspace = function (workspace_name, embed_name) {
	frappe.confirm(
		__('Remove page embed "{0}" from workspace "{1}"?', [embed_name, workspace_name]),
		function () {
			frappe.call({
				method: "workspace_embedder.frappe_workspace_embedder.api.remove_embed_from_workspace",
				args: {
					workspace_name: workspace_name,
					embed_name: embed_name,
				},
				callback: function (r) {
					if (r.message && r.message.success) {
						frappe.msgprint("Page embed removed successfully!");
						setTimeout(() => location.reload(), 1000);
					}
				},
			});
		}
	);
};
