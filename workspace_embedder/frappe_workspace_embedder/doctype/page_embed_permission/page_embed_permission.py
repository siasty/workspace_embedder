"""
Page Embed Permission Child DocType
===================================

Manages fine-grained access control for page embeds with support for:
- Role-based permissions
- Conditional access rules
- Dynamic permission evaluation
"""

from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document


class PageEmbedPermission(Document):
	"""Child table for managing page embed access permissions."""

	def validate(self):
		"""Validate permission configuration."""
		self.validate_role()
		self.validate_conditions()

	def validate_role(self):
		"""Ensure role exists and is valid."""
		if not self.role:
			frappe.throw(_("Role is required for permission entry"))

		if not frappe.db.exists("Role", self.role):
			frappe.throw(_("Role '{0}' does not exist").format(self.role))

	def validate_conditions(self):
		"""Validate access conditions if specified."""
		if self.conditions:
			try:
				# Basic syntax check for Python conditions
				compile(self.conditions, "<string>", "eval")
			except SyntaxError as e:
				frappe.throw(_("Invalid syntax in access conditions: {0}").format(str(e)))

	def evaluate_conditions(self, context: dict | None = None) -> bool:
		"""
		Evaluate access conditions with given context.

		Args:
		    context: Dictionary with user context (user, roles, etc.)

		Returns:
		    bool: True if conditions are met or no conditions specified
		"""
		if not self.conditions:
			return True

		if not context:
			context = {"user": frappe.session.user, "roles": frappe.get_roles(), "frappe": frappe}

		try:
			return bool(eval(self.conditions, {"__builtins__": {}}, context))
		except Exception as e:
			frappe.log_error(f"Error evaluating permission conditions: {e}")
			return False
