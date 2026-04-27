app_name = "workspace_embedder"
app_title = "Frappe Workspace Embedder"
app_publisher = "siasty3@gmail.com"
app_description = "Advanced workspace page embedding system for Frappe Framework"
app_email = "siasty3@gmail.com"
app_license = "mit"

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "workspace_embedder",
# 		"logo": "/assets/workspace_embedder/logo.png",
# 		"title": "Frappe Workspace Embedder",
# 		"route": "/workspace_embedder",
# 		"has_permission": "workspace_embedder.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
app_include_css = [
    "/assets/workspace_embedder/css/page_embed.css"
]
app_include_js = [
    "/assets/workspace_embedder/js/page_embed.js",
    "/assets/workspace_embedder/js/workspace_extensions.js"
]

# include js, css files in header of web template
# web_include_css = "/assets/workspace_embedder/css/workspace_embedder.css"
# web_include_js = "/assets/workspace_embedder/js/workspace_embedder.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "workspace_embedder/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
doctype_js = {
    "Workspace": "workspace_embedder/frappe_workspace_embedder/doctype/workspace_extension/workspace_extension.js"
}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "workspace_embedder/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Fixtures
# --------

fixtures = [
    {
        "doctype": "DocType",
        "filters": {
            "name": ["in", [
                "Page Embed",
                "Page Embed Permission"
            ]]
        }
    }
]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "workspace_embedder.utils.jinja_methods",
# 	"filters": "workspace_embedder.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "workspace_embedder.install.before_install"
# after_install = "workspace_embedder.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "workspace_embedder.uninstall.before_uninstall"
# after_uninstall = "workspace_embedder.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "workspace_embedder.utils.before_app_install"
# after_app_install = "workspace_embedder.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "workspace_embedder.utils.before_app_uninstall"
# after_app_uninstall = "workspace_embedder.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "workspace_embedder.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

permission_query_conditions = {
    "Page Embed": "workspace_embedder.workspace_page_embedder.permissions.get_page_embed_conditions"
}

has_permission = {
    "Page Embed": "workspace_embedder.workspace_page_embedder.permissions.has_page_embed_permission"
}

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"workspace_embedder.tasks.all"
# 	],
# 	"daily": [
# 		"workspace_embedder.tasks.daily"
# 	],
# 	"hourly": [
# 		"workspace_embedder.tasks.hourly"
# 	],
# 	"weekly": [
# 		"workspace_embedder.tasks.weekly"
# 	],
# 	"monthly": [
# 		"workspace_embedder.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "workspace_embedder.install.before_tests"

# Overriding Methods
# ------------------------------

override_whitelisted_methods = {
    "frappe.desk.form.utils.get_doctype_json": "workspace_embedder.workspace_page_embedder.api.override_get_doctype_json"
}
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "workspace_embedder.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["workspace_embedder.utils.before_request"]
# after_request = ["workspace_embedder.utils.after_request"]

# Job Events
# ----------
# before_job = ["workspace_embedder.utils.before_job"]
# after_job = ["workspace_embedder.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"workspace_embedder.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# Translation
# ------------
# List of apps whose translatable strings should be excluded from this app's translations.
# ignore_translatable_strings_from = []

