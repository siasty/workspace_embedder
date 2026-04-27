"""
Workspace Page Embedder API
===========================

Public APIs for page embed management, rendering, and integration.
All endpoints require appropriate permissions.
"""

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import cint
from typing import Optional, Dict, List


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
def list_available_pages(search: str = "", limit: int = 20) -> List[Dict]:
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
        filters = {
            "title": ["like", f"%{search}%"],
            "name": ["like", f"%{search}%"]
        }

    pages = frappe.get_all(
        "Page",
        filters=filters,
        fields=["name", "title", "module"],
        limit_page_length=limit,
        order_by="modified desc"
    )

    # Filter out pages user doesn't have access to
    accessible_pages = []
    for page in pages:
        try:
            page_doc = frappe.get_doc("Page", page.name)
            if page_doc.has_permission("read"):
                accessible_pages.append({
                    "name": page.name,
                    "title": page.title or page.name,
                    "module": page.module,
                    "label": f"{page.title or page.name} ({page.module})"
                })
        except:
            pass  # Skip pages user can't access

    return accessible_pages


@frappe.whitelist()
def test_page_access(page_name: str) -> Dict:
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
        return {
            "success": False,
            "message": _("Page '{0}' not found").format(page_name),
            "accessible": False
        }

    try:
        page_doc = frappe.get_doc("Page", page_name)
        has_access = page_doc.has_permission("read")

        return {
            "success": True,
            "message": _("✅ You have access to this page") if has_access else _("❌ Access denied"),
            "accessible": has_access,
            "page_title": page_doc.title or page_name,
            "page_url": f"/app/{page_name}"
        }
    except Exception as e:
        return {
            "success": False,
            "message": str(e),
            "accessible": False
        }


@frappe.whitelist()
def get_embed_preview(embed_name: str) -> Dict:
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
def list_workspace_embeds(workspace_name: str) -> List[Dict]:
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
        filters={
            "workspace": workspace_name,
            "enabled": 1
        },
        fields=["name", "embed_name", "target_page", "display_height", "display_width"],
        order_by="position asc"
    )

    # Filter by user permissions
    accessible_embeds = []
    for embed in embeds:
        embed_doc = frappe.get_doc("Page Embed", embed.name)
        if embed_doc.has_embed_permission():
            accessible_embeds.append({
                "name": embed.name,
                "embed_name": embed.embed_name,
                "target_page": embed.target_page,
                "dimensions": {
                    "height": embed.display_height,
                    "width": embed.display_width
                }
            })

    return accessible_embeds


@frappe.whitelist()
def add_embed_to_workspace(workspace_name: str, embed_name: str) -> Dict:
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
        custom_block = frappe.get_doc({
            "doctype": "Custom HTML Block",
            "name": custom_block_name,
            "html": f'<div class="page-embed-custom-block" data-page-embed-name="{embed_name}"></div>',
            "script": """
                $(document).ready(function() {
                    setTimeout(() => {
                        if (typeof WorkspacePageEmbedder !== 'undefined') {
                            WorkspacePageEmbedder.initPageEmbeds();
                        }
                    }, 100);
                });
            """,
            "style": embed_doc.custom_css or ""
        })
        custom_block.insert(ignore_permissions=True)

    # Add to workspace
    workspace_doc = frappe.get_doc("Workspace", workspace_name)

    # Check if already added
    for custom_block in workspace_doc.custom_blocks:
        if custom_block.custom_block_name == custom_block_name:
            return {
                "success": True,
                "message": _("Page embed already exists in this workspace"),
                "already_exists": True
            }

    # Add to custom blocks
    workspace_doc.append("custom_blocks", {
        "custom_block_name": custom_block_name,
        "label": f"📄 {embed_name}"
    })

    # Update workspace content to include the custom block
    try:
        content = frappe.parse_json(workspace_doc.content or "[]")
    except:
        content = []

    if not isinstance(content, list):
        content = []

    # Add custom block to content
    content.append({
        "id": frappe.generate_hash(length=8),
        "type": "custom_block",
        "data": {
            "custom_block_name": custom_block_name,
            "col": 12
        }
    })

    workspace_doc.content = frappe.as_json(content)
    workspace_doc.save(ignore_permissions=True)

    return {
        "success": True,
        "message": _("Page embed added to workspace successfully"),
        "custom_block_name": custom_block_name
    }


@frappe.whitelist()
def remove_embed_from_workspace(workspace_name: str, embed_name: str) -> Dict:
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
    except:
        content = []

    if isinstance(content, list):
        # Remove custom blocks with this name
        content = [
            item for item in content
            if not (isinstance(item, dict) and
                   item.get("type") == "custom_block" and
                   (item.get("data") or {}).get("custom_block_name") == custom_block_name)
        ]

        workspace_doc.content = frappe.as_json(content)

    workspace_doc.save(ignore_permissions=True)

    # Delete the Custom HTML Block if it exists
    if frappe.db.exists("Custom HTML Block", custom_block_name):
        frappe.delete_doc("Custom HTML Block", custom_block_name, ignore_permissions=True)

    return {
        "success": True,
        "message": _("Page embed removed from workspace successfully")
    }


def override_get_doctype_json(doctype_name: str, **kwargs) -> Dict:
    """
    Override get_doctype_json to add custom workspace block type.
    """
    result = frappe.get_attr("frappe.desk.form.utils.get_doctype_json")(doctype_name, **kwargs)

    # Add custom workspace block type if this is Workspace doctype
    if doctype_name == "Workspace":
        if "custom_blocks" not in result:
            result["custom_blocks"] = []

        result["custom_blocks"].append({
            "type": "page_embed",
            "label": _("Embedded Page"),
            "icon": "monitor",
            "template": "workspace_page_embedder/templates/page_embed_block.html"
        })

    return result