"""
Workspace Page Embedder API
===========================

Public APIs for page embed management, rendering, and integration.
All endpoints require appropriate permissions.
"""

from __future__ import annotations

from typing import Optional

import frappe
from frappe import _
from frappe.utils import cint


@frappe.whitelist()
def get_embed_html(embed_name: str) -> str:
	"""
	Get the HTML for a specific page embed.

	Args:
	    embed_name: Name of the Page Embed document

	Returns:
	    HTML string for embedding or error message

	Raises:
	    PermissionError: If user doesn't have access
	    DoesNotExistError: If embed doesn't exist
	"""
	if not embed_name:
		frappe.throw(_("Embed name is required"))

	if not frappe.db.exists("Page Embed", embed_name):
		frappe.throw(_("Page Embed '{0}' not found").format(embed_name))

	embed_doc = frappe.get_doc("Page Embed", embed_name)

	if not embed_doc.has_embed_permission():
		frappe.throw(_("You don't have permission to view this embed"), frappe.PermissionError)

	return embed_doc.get_embed_html()


@frappe.whitelist()
def list_available_pages(search: str = "", limit: int = 20) -> list[dict]:
	"""
	List available pages that can be embedded.

	Args:
	    search: Search term to filter pages
	    limit: Maximum number of results

	Returns:
	    List of available pages with metadata
	"""
	limit = cint(limit) or 20
	if limit > 500:
		limit = 500  # Safety limit

	filters = {}
	if search:
		filters = {"title": ["like", f"%{search}%"], "name": ["like", f"%{search}%"]}

	pages = frappe.get_all(
		"Page",
		filters=filters,
		fields=["name", "title", "module"],
		limit_page_length=limit,
		order_by="modified desc",
	)

	# Filter out pages user doesn't have access to
	accessible_pages = []
	for page in pages:
		try:
			page_doc = frappe.get_doc("Page", page.name)
			if page_doc.has_permission("read"):
				accessible_pages.append(
					{
						"name": page.name,
						"title": page.title or page.name,
						"module": page.module,
						"label": f"{page.title or page.name} ({page.module})",
					}
				)
		except Exception:
			pass  # Skip pages user can't access

	return accessible_pages


@frappe.whitelist()
def test_page_access(page_name: str) -> dict:
	"""
	Test if user has access to a specific page.

	Args:
	    page_name: Name of the page to test

	Returns:
	    Dictionary with access status and details
	"""
	if not page_name:
		frappe.throw(_("Page name is required"))

	if not frappe.db.exists("Page", page_name):
		return {"success": False, "message": _("Page '{0}' not found").format(page_name), "accessible": False}

	try:
		page_doc = frappe.get_doc("Page", page_name)
		has_access = page_doc.has_permission("read")

		return {
			"success": True,
			"message": _("✅ You have access to this page") if has_access else _("❌ Access denied"),
			"accessible": has_access,
			"page_title": page_doc.title or page_name,
			"page_url": f"/app/{page_name}",
		}
	except Exception as e:
		return {"success": False, "message": str(e), "accessible": False}


@frappe.whitelist()
def get_embed_preview(embed_name: str) -> dict:
	"""
	Get preview data for an embed (for admin interface).

	Args:
	    embed_name: Name of the Page Embed

	Returns:
	    Dictionary with preview HTML and metadata
	"""
	if not frappe.has_permission("Page Embed", "read", embed_name):
		frappe.throw(_("You don't have permission to view this embed"), frappe.PermissionError)

	embed_doc = frappe.get_doc("Page Embed", embed_name)
	return embed_doc.preview_embed()


@frappe.whitelist()
def list_workspace_embeds(workspace_name: str) -> list[dict]:
	"""
	List all page embeds in a specific workspace.

	Args:
	    workspace_name: Name of the workspace

	Returns:
	    List of embeds configured for the workspace
	"""
	if not frappe.db.exists("Workspace", workspace_name):
		frappe.throw(_("Workspace '{0}' not found").format(workspace_name))

	if not frappe.has_permission("Workspace", "read", workspace_name):
		frappe.throw(_("You don't have permission to access this workspace"), frappe.PermissionError)

	embeds = frappe.get_all(
		"Page Embed",
		filters={"workspace": workspace_name, "enabled": 1},
		fields=["name", "embed_name", "target_page", "display_height", "display_width"],
		order_by="position asc",
	)

	# Filter by user permissions
	accessible_embeds = []
	for embed in embeds:
		embed_doc = frappe.get_doc("Page Embed", embed.name)
		if embed_doc.has_embed_permission():
			accessible_embeds.append(
				{
					"name": embed.name,
					"embed_name": embed.embed_name,
					"target_page": embed.target_page,
					"dimensions": {"height": embed.display_height, "width": embed.display_width},
				}
			)

	return accessible_embeds


@frappe.whitelist()
def add_embed_to_workspace(workspace_name: str, embed_name: str) -> dict:
	"""
	Add a page embed to a workspace by creating a Custom HTML Block and updating workspace.

	Args:
	    workspace_name: Name of the workspace to update
	    embed_name: Name of the Page Embed to add

	Returns:
	    Dictionary with success status and details
	"""
	if not frappe.has_permission("Workspace", "write", workspace_name):
		frappe.throw(_("You don't have permission to modify this workspace"), frappe.PermissionError)

	if not frappe.db.exists("Page Embed", embed_name):
		frappe.throw(_("Page Embed '{0}' not found").format(embed_name))

	embed_doc = frappe.get_doc("Page Embed", embed_name)
	if not embed_doc.has_embed_permission():
		frappe.throw(_("You don't have permission to view this embed"), frappe.PermissionError)

	# Create Custom HTML Block for this embed
	custom_block_name = f"Page Embed - {embed_name}"

	if not frappe.db.exists("Custom HTML Block", custom_block_name):
		# Combine embed custom CSS with auto-responsive CSS
		combined_css = get_auto_responsive_css()
		if embed_doc.custom_css:
			combined_css += "\n\n/* Custom CSS from Page Embed */\n" + embed_doc.custom_css

		custom_block = frappe.get_doc(
			{
				"doctype": "Custom HTML Block",
				"name": custom_block_name,
				"html": f'<div class="page-embed-custom-block" data-page-embed-name="{embed_name}"></div>',
				"script": """
                $(document).ready(function() {
                    setTimeout(() => {
                        if (typeof WorkspacePageEmbedder !== 'undefined') {
                            WorkspacePageEmbedder.initPageEmbeds();
                        }
                    }, 200);
                });
            """,
				"style": combined_css,
			}
		)
		custom_block.insert(ignore_permissions=True)

	# Add to workspace
	workspace_doc = frappe.get_doc("Workspace", workspace_name)

	# Check if already added
	for custom_block in workspace_doc.custom_blocks:
		if custom_block.custom_block_name == custom_block_name:
			return {
				"success": True,
				"message": _("Page embed already exists in this workspace"),
				"already_exists": True,
			}

	# Add to custom blocks
	workspace_doc.append(
		"custom_blocks", {"custom_block_name": custom_block_name, "label": f"📄 {embed_name}"}
	)

	# Update workspace content to include the custom block
	try:
		content = frappe.parse_json(workspace_doc.content or "[]")
	except Exception:
		content = []

	if not isinstance(content, list):
		content = []

	# Add custom block to content
	content.append(
		{
			"id": frappe.generate_hash(length=8),
			"type": "custom_block",
			"data": {"custom_block_name": custom_block_name, "col": 12},
		}
	)

	workspace_doc.content = frappe.as_json(content)
	workspace_doc.save(ignore_permissions=True)

	return {
		"success": True,
		"message": _("Page embed added to workspace successfully"),
		"custom_block_name": custom_block_name,
	}


@frappe.whitelist()
def remove_embed_from_workspace(workspace_name: str, embed_name: str) -> dict:
	"""
	Remove a page embed from a workspace by removing its Custom HTML Block.

	Args:
	    workspace_name: Name of the workspace to update
	    embed_name: Name of the Page Embed to remove

	Returns:
	    Dictionary with success status
	"""
	if not frappe.has_permission("Workspace", "write", workspace_name):
		frappe.throw(_("You don't have permission to modify this workspace"), frappe.PermissionError)

	custom_block_name = f"Page Embed - {embed_name}"

	# Get workspace
	workspace_doc = frappe.get_doc("Workspace", workspace_name)

	# Remove from custom blocks
	blocks_to_remove = []
	for i, custom_block in enumerate(workspace_doc.custom_blocks):
		if custom_block.custom_block_name == custom_block_name:
			blocks_to_remove.append(i)

	for i in reversed(blocks_to_remove):
		workspace_doc.custom_blocks.pop(i)

	# Update workspace content to remove the custom block
	try:
		content = frappe.parse_json(workspace_doc.content or "[]")
	except Exception:
		content = []

	if isinstance(content, list):
		# Remove custom blocks with this name
		content = [
			item
			for item in content
			if not (
				isinstance(item, dict)
				and item.get("type") == "custom_block"
				and (item.get("data") or {}).get("custom_block_name") == custom_block_name
			)
		]

		workspace_doc.content = frappe.as_json(content)

	workspace_doc.save(ignore_permissions=True)

	# Delete the Custom HTML Block if it exists
	if frappe.db.exists("Custom HTML Block", custom_block_name):
		frappe.delete_doc("Custom HTML Block", custom_block_name, ignore_permissions=True)

	return {"success": True, "message": _("Page embed removed from workspace successfully")}


def override_get_doctype_json(doctype_name: str, **kwargs) -> dict:
	"""
	Override get_doctype_json to add custom workspace block type.
	"""
	result = frappe.get_attr("frappe.desk.form.utils.get_doctype_json")(doctype_name, **kwargs)

	# Add custom workspace block type if this is Workspace doctype
	if doctype_name == "Workspace":
		if "custom_blocks" not in result:
			result["custom_blocks"] = []

		result["custom_blocks"].append(
			{
				"type": "page_embed",
				"label": _("Embedded Page"),
				"icon": "monitor",
				"template": "workspace_page_embedder/templates/page_embed_block.html",
			}
		)

	return result


@frappe.whitelist()
def get_workspace_page_embeds(workspace_name: str) -> list[dict]:
	"""
	Get all Page Embeds configured for a specific workspace.

	Args:
		workspace_name: Name of the workspace (URL format)

	Returns:
		List of enabled page embeds for the workspace
	"""
	if not workspace_name:
		frappe.throw(_("Workspace name is required"))

	# Find actual workspace name from URL name
	actual_workspace_name = _find_workspace_by_url_name(workspace_name)

	if not actual_workspace_name:
		print(f"🔍 API DEBUG: No workspace found for URL: '{workspace_name}'")
		return []

	# Get enabled Page Embeds for the actual workspace name
	embeds = frappe.get_all(
		"Page Embed",
		filters={
			"workspace": actual_workspace_name,
			"enabled": 1
		},
		fields=[
			"name", "embed_name", "target_page", "description",
			"display_height", "display_width", "responsive", "custom_css"
		],
		order_by="modified desc",
		limit_page_length=50
	)

	print(f"🔍 API DEBUG: Found {len(embeds)} embeds for workspace '{actual_workspace_name}'")

	# Filter by user permissions
	accessible_embeds = []
	for embed in embeds:
		embed_doc = frappe.get_doc("Page Embed", embed.name)
		if embed_doc.has_embed_permission():
			accessible_embeds.append(embed)

	print(f"🔍 API DEBUG: Returning {len(accessible_embeds)} accessible embeds")

	return accessible_embeds


def _find_workspace_by_url_name(url_name: str) -> str | None:
	"""
	Find workspace name in database from URL name.

	Reverses Frappe's workspace URL generation logic.

	Args:
		url_name: URL-formatted workspace name (e.g., 'ai-agent-demo---techparts')

	Returns:
		Actual workspace name in database or None if not found
	"""
	import re

	# First try direct match (in case URL name matches database name)
	if frappe.db.exists("Workspace", url_name):
		return url_name

	# Get all workspaces from database
	all_workspaces = frappe.get_all(
		"Workspace",
		fields=["name", "title", "label"],
		limit_page_length=200
	)

	# Try different URL generation patterns to find match
	for ws in all_workspaces:
		workspace_display_name = ws.name

		# Pattern 1: Frappe's standard URL generation
		# Convert to lowercase, replace spaces and special chars
		generated_url = workspace_display_name.lower()
		generated_url = re.sub(r'[^\w\s-]', '', generated_url)  # Remove special chars except hyphens
		generated_url = re.sub(r'\s+', '-', generated_url)  # Replace spaces with hyphens
		generated_url = re.sub(r'-+', '-', generated_url)  # Collapse multiple hyphens
		generated_url = generated_url.strip('-')  # Remove leading/trailing hyphens

		if generated_url == url_name:
			print(f"🎯 Found workspace match: '{workspace_display_name}' -> URL: '{generated_url}'")
			return workspace_display_name

		# Pattern 2: Alternative generation (handle special characters differently)
		alt_url = workspace_display_name.lower()
		alt_url = alt_url.replace(' - ', '---')  # Convert " - " to "---"
		alt_url = alt_url.replace(' ', '-')      # Convert remaining spaces to "-"
		alt_url = re.sub(r'[^\w\-]', '', alt_url)  # Remove other special chars

		if alt_url == url_name:
			print(f"🎯 Found workspace match (alt): '{workspace_display_name}' -> URL: '{alt_url}'")
			return workspace_display_name

		# Pattern 3: Handle title/label if different from name
		for field_name in ['title', 'label']:
			field_value = ws.get(field_name)
			if field_value and field_value != workspace_display_name:
				field_url = field_value.lower()
				field_url = re.sub(r'[^\w\s-]', '', field_url)
				field_url = re.sub(r'\s+', '-', field_url)
				field_url = re.sub(r'-+', '-', field_url)
				field_url = field_url.strip('-')

				if field_url == url_name:
					print(f"🎯 Found workspace match ({field_name}): '{workspace_display_name}' -> URL: '{field_url}'")
					return workspace_display_name

	print(f"❌ No workspace found for URL name: '{url_name}'")
	print(f"Available workspaces:")
	for ws in all_workspaces[:10]:  # Show first 10 for debugging
		debug_url = ws.name.lower().replace(' ', '-').replace('--', '---')
		print(f"  - '{ws.name}' -> '{debug_url}'")

	return None


@frappe.whitelist()
def debug_workspace_names(url_name: str) -> dict:
	"""
	Debug method to see what workspace names exist in DB.
	"""
	print(f"🔍 DEBUG: Looking for workspace with URL name: '{url_name}'")

	# Get all workspaces
	all_workspaces = frappe.get_all(
		"Workspace",
		fields=["name", "title", "label"],
		limit_page_length=100
	)

	print(f"🔍 DEBUG: Found {len(all_workspaces)} total workspaces")
	for ws in all_workspaces:
		print(f"   - name: '{ws.name}', title: '{ws.title}', label: '{ws.label}'")

	# Try to find exact match
	exact_match = None
	try:
		exact_match = frappe.get_doc("Workspace", url_name)
		print(f"🔍 DEBUG: EXACT MATCH FOUND: {exact_match.name} -> {exact_match.title}")
	except frappe.DoesNotExistError:
		print(f"🔍 DEBUG: No exact match for '{url_name}'")

	# Get all Page Embeds to see what workspace names they use
	all_embeds = frappe.get_all(
		"Page Embed",
		fields=["name", "workspace", "enabled"],
		limit_page_length=100
	)

	print(f"🔍 DEBUG: Found {len(all_embeds)} Page Embeds:")
	for embed in all_embeds:
		print(f"   - {embed.name}: workspace='{embed.workspace}', enabled={embed.enabled}")

	return {
		"url_name": url_name,
		"all_workspaces": all_workspaces,
		"exact_match": exact_match.as_dict() if exact_match else None,
		"all_embeds": all_embeds
	}


def get_auto_responsive_css():
	"""Get automatically applied responsive CSS for page embeds."""
	return """
/* Auto-Responsive Page Embed CSS */
.page-embed-container {
	border: 1px solid #dee2e6;
	border-radius: 8px;
	overflow: hidden;
	margin: 20px 0;
	box-shadow: 0 2px 4px rgba(0,0,0,0.1);
	background: white;
	width: 100%;
	position: relative;
}

.page-embed-container iframe {
	width: 100% !important;
	height: 600px;
	border: none;
	display: block;
	background: white;
}

/* Responsive iframe sizing */
.page-embed-container iframe.responsive {
	height: 500px;
}

/* Custom block specific styling */
.page-embed-custom-block {
	width: 100% !important;
	margin: 0;
	padding: 0;
}

.page-embed-custom-block .page-embed-container {
	margin: 0;
	border-radius: 6px;
}

/* Mobile responsive breakpoints */
@media (max-width: 1200px) {
	.page-embed-container iframe { height: 550px; }
}

@media (max-width: 992px) {
	.page-embed-container iframe { height: 500px; }
}

@media (max-width: 768px) {
	.page-embed-container {
		margin: 10px 0;
		border-radius: 6px;
	}
	.page-embed-container iframe {
		height: 450px !important;
	}
}

@media (max-width: 576px) {
	.page-embed-container {
		margin: 5px 0;
		border-radius: 4px;
		box-shadow: 0 1px 3px rgba(0,0,0,0.1);
	}
	.page-embed-container iframe {
		height: 400px !important;
	}
}

@media (max-width: 480px) {
	.page-embed-container iframe {
		height: 350px !important;
	}
}

/* Loading state */
.page-embed-loading {
	background: #f8f9fa;
}

.page-embed-placeholder {
	padding: 40px 20px;
	text-align: center;
	background: #f8f9fa;
	border-radius: 6px;
}
"""
