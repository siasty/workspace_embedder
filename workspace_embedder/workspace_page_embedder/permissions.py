"""
Permission System for Workspace Page Embedder
=============================================

Handles access control for page embeds with role-based and condition-based permissions.
"""

from __future__ import annotations

import frappe
from frappe import _


def get_page_embed_conditions(user: str | None = None) -> str:
	"""
	Get SQL conditions for Page Embed list view based on user permissions.

	Args:
	    user: Username (defaults to current user)

	Returns:
	    SQL WHERE clause fragment
	"""
	if not user:
		user = frappe.session.user

	if user == "Administrator":
		return ""

	user_roles = ",".join(f"'{role}'" for role in frappe.get_roles(user))

	# Return condition that allows access if:
	# 1. User created the embed, OR
	# 2. User's role is in the embed's permissions with read access
	condition = f"""
        (
            `tabPage Embed`.owner = '{user}'
            OR
            EXISTS (
                SELECT 1 FROM `tabPage Embed Permission`
                WHERE `tabPage Embed Permission`.parent = `tabPage Embed`.name
                AND `tabPage Embed Permission`.role IN ({user_roles})
                AND `tabPage Embed Permission`.read = 1
            )
        )
    """

	return condition


def has_page_embed_permission(doc, ptype, user=None, debug=False):
	"""
	Check if user has specific permission on a Page Embed document.

	This function is called by Frappe's permission system.

	Args:
	    doc: Document instance or name
	    ptype: Permission type ('read', 'write', 'create', 'delete', etc.)
	    user: Username (defaults to current user)
	    debug: Debug mode flag

	Returns:
	    bool: True if user has permission
	"""
	if not user:
		user = frappe.session.user

	# Administrator always has permission
	if user == "Administrator":
		return True

	# Get document instance
	try:
		if isinstance(doc, str):
			if not frappe.db.exists("Page Embed", doc):
				return False
			embed_doc = frappe.get_doc("Page Embed", doc)
		else:
			embed_doc = doc
	except Exception:
		return False

	# Document owner can always access their own documents
	if embed_doc.owner == user:
		return ptype in ["read", "write"]

	# For read permission, check role-based permissions
	if ptype == "read":
		return embed_doc.has_embed_permission(user)

	# For write/delete, only owner and System Manager can modify
	user_roles = frappe.get_roles(user)
	return "System Manager" in user_roles


def check_embed_access(embed_name: str, action: str = "read") -> bool:
	"""
	Check if current user can perform action on embed.

	Args:
	    embed_name: Name of the Page Embed
	    action: Action to check ('read', 'write', 'delete')

	Returns:
	    bool: True if user has permission

	Raises:
	    PermissionError: If access denied
	"""
	user = frappe.session.user

	if not has_page_embed_permission(embed_name, action, user):
		frappe.throw(
			_("You don't have permission to {0} this page embed").format(action), frappe.PermissionError
		)

	return True


def get_user_accessible_embeds(user: str | None = None) -> list:
	"""
	Get all page embeds accessible to a specific user.

	Args:
	    user: Username (defaults to current user)

	Returns:
	    List of accessible Page Embed documents
	"""
	if not user:
		user = frappe.session.user

	embeds = frappe.get_all("Page Embed", fields=["name"])

	accessible = []
	for embed in embeds:
		if has_page_embed_permission(embed.name, "read", user, False):
			accessible.append(embed.name)

	return accessible
