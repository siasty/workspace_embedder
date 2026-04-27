"""
Scheduled Tasks for Workspace Page Embedder
==========================================

Background jobs and maintenance tasks.
"""

from __future__ import annotations

from datetime import datetime, timedelta

import frappe
from frappe import _


def daily_cleanup():
	"""
	Daily cleanup task:
	- Remove inactive embeds
	- Log audit trail
	- Generate usage statistics
	"""
	cleanup_inactive_embeds()
	cleanup_old_audit_logs()
	generate_usage_statistics()


def cleanup_inactive_embeds():
	"""Remove disabled embeds that haven't been used in 90 days."""
	cutoff_date = datetime.now() - timedelta(days=90)

	inactive_embeds = frappe.db.get_list(
		"Page Embed", filters={"enabled": 0, "modified": ["<", cutoff_date.isoformat()]}, fields=["name"]
	)

	for embed in inactive_embeds:
		try:
			frappe.delete_doc("Page Embed", embed.name)
			frappe.logger().info(f"Deleted inactive embed: {embed.name}")
		except Exception as e:
			frappe.logger().error(f"Error deleting embed {embed.name}: {e!s}")


def cleanup_old_audit_logs():
	"""Remove audit logs older than 180 days."""
	cutoff_date = datetime.now() - timedelta(days=180)

	frappe.db.delete("Page Embed Audit Log", filters={"creation": ["<", cutoff_date.isoformat()]})


def generate_usage_statistics():
	"""Generate daily usage statistics for embeds."""
	try:
		today = datetime.now().date()

		# Count embeds by status
		total_embeds = frappe.db.count("Page Embed")
		enabled_embeds = frappe.db.count("Page Embed", filters={"enabled": 1})
		disabled_embeds = total_embeds - enabled_embeds

		# Log statistics
		stats = {
			"date": today,
			"total_embeds": total_embeds,
			"enabled_embeds": enabled_embeds,
			"disabled_embeds": disabled_embeds,
		}

		frappe.logger().info(f"Daily embed statistics: {stats}")

	except Exception as e:
		frappe.logger().error(f"Error generating usage statistics: {e!s}")
