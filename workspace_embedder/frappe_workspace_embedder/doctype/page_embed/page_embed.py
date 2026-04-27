"""
Page Embed DocType Controller
============================

Manages page embedding configuration with security validation,
permission checks, and workspace integration.

Business Logic:
- Validates target page exists and is accessible
- Enforces permission-based access control
- Sanitizes custom CSS/HTML for security
- Manages workspace integration
- Provides rendering API for workspace blocks
"""

from __future__ import annotations

import re

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint, get_url


class PageEmbed(Document):
	"""Page Embed controller with enterprise-grade security and validation."""

	def validate(self):
		"""Comprehensive validation for page embed configuration."""
		self.validate_target_page()
		self.validate_permissions()
		self.validate_dimensions()
		self.sanitize_custom_code()
		self.validate_workspace()

	def validate_target_page(self):
		"""Ensure target page exists and is accessible."""
		if not self.target_page:
			frappe.throw(_("Target Page is required"))

		if not frappe.db.exists("Page", self.target_page):
			frappe.throw(_("Target Page '{0}' does not exist").format(self.target_page))

		# Check if user has access to the target page
		page_doc = frappe.get_doc("Page", self.target_page)
		if not page_doc.has_permission("read"):
			frappe.throw(_("You don't have permission to embed page '{0}'").format(self.target_page))

	def validate_permissions(self):
		"""Validate role permissions for embed access."""
		if not self.permissions:
			# Add default permission for System Manager if no permissions specified
			self.append("permissions", {"role": "System Manager", "read": 1})

	def validate_dimensions(self):
		"""Validate display dimensions are within acceptable ranges."""
		if self.display_height:
			if not (100 <= cint(self.display_height) <= 2000):
				frappe.throw(_("Display height must be between 100 and 2000 pixels"))

		if self.display_width:
			if not (10 <= cint(self.display_width) <= 100):
				frappe.throw(_("Display width must be between 10% and 100%"))

	def sanitize_custom_code(self):
		"""Sanitize custom CSS and HTML to prevent XSS attacks."""
		if self.custom_css:
			self.custom_css = self._sanitize_css(self.custom_css)

		if self.custom_html_before:
			self.custom_html_before = self._sanitize_html(self.custom_html_before)

		if self.custom_html_after:
			self.custom_html_after = self._sanitize_html(self.custom_html_after)

	def validate_workspace(self):
		"""Validate workspace reference if specified."""
		if self.workspace and not frappe.db.exists("Workspace", self.workspace):
			frappe.throw(_("Workspace '{0}' does not exist").format(self.workspace))

	def _sanitize_css(self, css_code: str) -> str:
		"""Remove dangerous CSS patterns."""
		if not css_code:
			return ""

		# Remove dangerous CSS patterns
		dangerous_patterns = [
			r"javascript\s*:",
			r"expression\s*\(",
			r"@import",
			r'url\s*\(\s*["\']?\s*javascript:',
		]

		for pattern in dangerous_patterns:
			css_code = re.sub(pattern, "", css_code, flags=re.IGNORECASE)

		return css_code

	def _sanitize_html(self, html_code: str) -> str:
		"""Remove dangerous HTML patterns."""
		if not html_code:
			return ""

		# Remove script tags and dangerous attributes
		dangerous_patterns = [
			r"<script[^>]*>.*?</script>",
			r'on\w+\s*=\s*["\'][^"\']*["\']',
			r"javascript\s*:",
		]

		for pattern in dangerous_patterns:
			html_code = re.sub(pattern, "", html_code, flags=re.IGNORECASE | re.DOTALL)

		return html_code

	def has_embed_permission(self, user: str | None = None) -> bool:
		"""Check if user has permission to view this embed."""
		if not user:
			user = frappe.session.user

		if user == "Administrator":
			return True

		user_roles = frappe.get_roles(user)

		for perm in self.permissions:
			if perm.role in user_roles and perm.read:
				return True

		return False

	def get_embed_html(self) -> str:
		"""Generate the HTML for embedding this page."""
		if not self.enabled:
			return f'<div class="alert alert-warning">Page embed "{self.embed_name}" is disabled</div>'

		if not self.has_embed_permission():
			return f'<div class="alert alert-danger">Access denied to page embed "{self.embed_name}"</div>'

		# Use dedicated embed page for ai-agent-demo, fallback to regular for others
		if self.target_page == "ai-agent-demo":
			page_url = get_url("/ai_agent_embed")
		else:
			page_url = get_url(f"/app/{self.target_page}")

		# Build iframe attributes
		iframe_attrs = {
			"src": page_url,
			"width": f"{self.display_width}%" if self.display_width else "100%",
			"height": f"{self.display_height}px" if self.display_height else "600px",
			"frameborder": "0",
			"sandbox": self.iframe_sandbox or "allow-scripts allow-same-origin allow-forms",
			"loading": "lazy",
			"class": "page-embed-iframe" + (" responsive" if self.responsive else ""),
		}

		iframe_html = "<iframe " + " ".join([f'{k}="{v}"' for k, v in iframe_attrs.items()]) + ">"
		iframe_html += f"{self.loading_message or 'Loading page...'}</iframe>"

		# Wrap with custom HTML and CSS
		embed_html = ""

		if self.custom_html_before:
			embed_html += self.custom_html_before

		embed_html += f'<div class="page-embed-container" data-embed="{self.name}">'

		if self.custom_css:
			embed_html += f"<style>{self.custom_css}</style>"

		embed_html += iframe_html
		embed_html += "</div>"

		if self.custom_html_after:
			embed_html += self.custom_html_after

		return embed_html

	@frappe.whitelist()
	def preview_embed(self) -> dict:
		"""Generate preview of the embed for admin interface."""
		return {
			"html": self.get_embed_html(),
			"page_url": get_url("/ai_agent_embed")
			if self.target_page == "ai-agent-demo"
			else get_url(f"/app/{self.target_page}"),
			"dimensions": {"width": self.display_width, "height": self.display_height},
		}

	@frappe.whitelist()
	def add_to_workspace(self, workspace_name: str) -> dict:
		"""Add this page embed to a specific workspace."""
		return frappe.get_doc("workspace_page_embedder.api", "add_embed_to_workspace").run(
			workspace_name=workspace_name, embed_name=self.name
		)

	def get_custom_block_html(self) -> str:
		"""Get HTML suitable for Custom HTML Block usage."""
		return f"""
            <div class="page-embed-custom-block" data-page-embed-name="{self.name}">
                <div class="page-embed-header">
                    <h4><i class="fa fa-monitor"></i> {self.embed_name}</h4>
                    {f'<p class="text-muted">{self.description}</p>' if self.description else ''}
                </div>
                <div class="page-embed-placeholder">
                    <div class="text-center p-4">
                        <i class="fa fa-spinner fa-spin fa-2x text-muted"></i>
                        <p class="text-muted mt-3">{self.loading_message or "Loading page embed..."}</p>
                    </div>
                </div>
            </div>
        """

	def get_custom_block_script(self) -> str:
		"""Get JavaScript for Custom HTML Block."""
		return """
            $(document).ready(function() {
                setTimeout(() => {
                    if (typeof WorkspacePageEmbedder !== 'undefined') {
                        WorkspacePageEmbedder.initPageEmbeds();
                    }
                }, 100);
            });
        """
