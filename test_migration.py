#!/usr/bin/env python3
"""
Workspace Embedder Migration Test
=================================

Verification script to test that the workspace embedder migration was successful.
"""

import json
import os
import sys


def test_app_structure():
	"""Test that all required files and directories exist."""
	print("🔍 Testing app structure...")

	base_path = "/home/frappe/frappe-bench/apps/workspace_embedder/workspace_embedder"
	required_paths = [
		# Main app files
		f"{base_path}/__init__.py",
		f"{base_path}/hooks.py",
		# DocTypes
		f"{base_path}/frappe_workspace_embedder/doctype/page_embed/page_embed.json",
		f"{base_path}/frappe_workspace_embedder/doctype/page_embed/page_embed.py",
		f"{base_path}/frappe_workspace_embedder/doctype/page_embed/page_embed.js",
		f"{base_path}/frappe_workspace_embedder/doctype/page_embed_permission/page_embed_permission.json",
		f"{base_path}/frappe_workspace_embedder/doctype/page_embed_permission/page_embed_permission.py",
		# Workspace embedder module
		f"{base_path}/workspace_page_embedder/api.py",
		f"{base_path}/workspace_page_embedder/permissions.py",
		# Assets
		f"{base_path}/public/js/page_embed.js",
		f"{base_path}/public/js/workspace_extensions.js",
		f"{base_path}/public/css/page_embed.css",
		# Workspace extension
		f"{base_path}/frappe_workspace_embedder/doctype/workspace_extension/workspace_extension.js",
	]

	missing = []
	existing = []

	for path in required_paths:
		if os.path.exists(path):
			existing.append(path.split("/")[-1])
		else:
			missing.append(path)

	print(f"✅ Found {len(existing)} required files:")
	for file in existing:
		print(f"   • {file}")

	if missing:
		print(f"❌ Missing {len(missing)} files:")
		for file in missing:
			print(f"   • {file}")
		return False

	return True


def test_hooks_configuration():
	"""Test hooks.py configuration."""
	print("\n🔧 Testing hooks configuration...")

	hooks_path = "/home/frappe/frappe-bench/apps/workspace_embedder/workspace_embedder/hooks.py"

	try:
		with open(hooks_path) as f:
			content = f.read()

		required_hooks = [
			"app_include_css",
			"app_include_js",
			"doctype_js",
			"permission_query_conditions",
			"has_permission",
			"fixtures",
			"override_whitelisted_methods",
		]

		configured = []
		missing = []

		for hook in required_hooks:
			if hook in content and not content.count(f"# {hook}") == content.count(hook):
				configured.append(hook)
			else:
				missing.append(hook)

		print(f"✅ Configured hooks ({len(configured)}):")
		for hook in configured:
			print(f"   • {hook}")

		if missing:
			print(f"❌ Missing hooks ({len(missing)}):")
			for hook in missing:
				print(f"   • {hook}")
			return False

		return True

	except Exception as e:
		print(f"❌ Error reading hooks.py: {e!s}")
		return False


def test_assets_linking():
	"""Test that assets are properly linked."""
	print("\n🎨 Testing assets linking...")

	assets_path = "/home/frappe/frappe-bench/sites/assets/workspace_embedder"

	if not os.path.exists(assets_path):
		print(f"❌ Assets directory not found: {assets_path}")
		return False

	if not os.path.islink(assets_path):
		print(f"❌ Assets path is not a symlink: {assets_path}")
		return False

	required_assets = [
		f"{assets_path}/js/page_embed.js",
		f"{assets_path}/js/workspace_extensions.js",
		f"{assets_path}/css/page_embed.css",
	]

	missing = []
	existing = []

	for asset in required_assets:
		if os.path.exists(asset):
			existing.append(asset.split("/")[-1])
		else:
			missing.append(asset)

	print(f"✅ Assets properly linked ({len(existing)}):")
	for asset in existing:
		print(f"   • {asset}")

	if missing:
		print(f"❌ Missing assets ({len(missing)}):")
		for asset in missing:
			print(f"   • {asset.split('/')[-1]}")
		return False

	return True


def test_app_installation():
	"""Test that the app is properly installed."""
	print("\n📦 Testing app installation...")

	try:
		# This would require frappe context, so we'll just check basic markers
		apps_txt_path = "/home/frappe/frappe-bench/sites/apps.txt"

		if os.path.exists(apps_txt_path):
			with open(apps_txt_path) as f:
				apps = f.read().strip().split("\n")

			if "workspace_embedder" in apps:
				print("✅ App listed in apps.txt")
				return True
			else:
				print("❌ App not found in apps.txt")
				return False
		else:
			print("❌ apps.txt not found")
			return False

	except Exception as e:
		print(f"❌ Error checking app installation: {e!s}")
		return False


def main():
	"""Run all tests."""
	print("🚀 Workspace Embedder Migration Verification")
	print("=" * 50)

	tests = [
		("App Structure", test_app_structure),
		("Hooks Configuration", test_hooks_configuration),
		("Assets Linking", test_assets_linking),
		("App Installation", test_app_installation),
	]

	results = {}

	for test_name, test_func in tests:
		try:
			results[test_name] = test_func()
		except Exception as e:
			print(f"❌ {test_name} failed with exception: {e!s}")
			results[test_name] = False

	print("\n" + "=" * 50)
	print("📊 Test Results Summary")
	print("=" * 50)

	passed = sum(results.values())
	total = len(results)

	for test_name, result in results.items():
		status = "✅ PASS" if result else "❌ FAIL"
		print(f"{status} {test_name}")

	print(f"\nOverall: {passed}/{total} tests passed")

	if passed == total:
		print("🎉 Migration completed successfully! 🎉")
		print("\nNext steps:")
		print("1. Run: bench --site your-site migrate")
		print("2. Run: bench build --app workspace_embedder")
		print("3. Test creating a Page Embed in the web interface")
		return True
	else:
		print("❌ Migration incomplete. Please review the failed tests.")
		return False


if __name__ == "__main__":
	success = main()
	sys.exit(0 if success else 1)
