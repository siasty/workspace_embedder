"""
Setup and Migration for Workspace Page Embedder
==============================================

Handles initial setup, migrations, and module initialization.
"""

from __future__ import annotations

import frappe
from frappe import _


def after_migrate():
	"""Called after every migration to ensure proper setup."""
	create_default_role()
	update_workspace_config()
	create_sample_embeds()


def create_default_role():
	"""Create 'Workspace Manager' role if it doesn't exist."""
	if frappe.db.exists("Role", "Workspace Manager"):
		return

	role = frappe.get_doc({"doctype": "Role", "role_name": "Workspace Manager", "desk_access": 1})

	# Add permissions for the role
	perms = [
		{"doctype": "Page Embed", "read": 1, "write": 1, "create": 1},
		{"doctype": "Page Embed Permission", "read": 1, "write": 1, "create": 1},
		{"doctype": "Workspace", "read": 1, "write": 1},
	]

	for perm in perms:
		role.append("role_permissions", perm)

	role.insert(ignore_if_duplicate=True)
	frappe.msgprint(_("✅ Created 'Workspace Manager' role"))


def update_workspace_config():
	"""Update workspace configuration for page embed support."""
	# This can be extended for future workspace customizations
	pass


def create_sample_embeds():
	"""Create sample page embeds for demonstration (only in dev/demo)."""
	if frappe.conf.get("developer_mode") or frappe.conf.get("demo_mode"):
		# Check if we should create samples
		if not frappe.db.get_single_value("Workspace Page Embedder Settings", "create_samples"):
			return

		# Sample embed: User profile page
		sample_pages = ["user-profile", "home"]

		for page_name in sample_pages:
			if frappe.db.exists("Page", page_name):
				embed_name = f"{page_name.replace('-', ' ').title()} Embed"

				if not frappe.db.exists("Page Embed", embed_name):
					embed = frappe.get_doc(
						{
							"doctype": "Page Embed",
							"embed_name": embed_name,
							"target_page": page_name,
							"display_height": 600,
							"display_width": 100,
							"responsive": 1,
							"enabled": 0,  # Disabled by default
							"permissions": [{"role": "System Manager", "read": 1}],
						}
					)

					embed.insert(ignore_if_duplicate=True)


class WorkspacePageEmbedderSettings:
	"""Settings for Workspace Page Embedder module."""

	@staticmethod
	def get_settings() -> dict:
		"""Get all settings."""
		settings = (
			frappe.get_doc("Workspace Page Embedder Settings", "Workspace Page Embedder Settings")
			if frappe.db.exists("Workspace Page Embedder Settings", "Workspace Page Embedder Settings")
			else {}
		)
		return settings

	@staticmethod
	def enable_samples():
		"""Enable sample embed creation."""
		pass

	@staticmethod
	def disable_samples():
		"""Disable sample embed creation."""
		pass
