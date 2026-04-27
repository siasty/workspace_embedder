# Frappe Workspace Embedder

Advanced workspace page embedding system for Frappe Framework. Embed any Frappe page directly into your workspaces with full permission control and responsive design.

## Features

🛡️ **Security First**
- Role-based permission system
- XSS protection with CSS/HTML sanitization
- Sandbox iframe isolation
- Permission inheritance from target pages

🎨 **Responsive Design**
- Mobile-friendly embedded pages
- Customizable dimensions and styling
- CSS customization support
- Loading states and error handling

🚀 **Easy Integration**
- Direct workspace integration
- Custom HTML blocks support
- One-click embed creation
- Drag & drop workspace management

⚙️ **Enterprise Features**
- Audit trail and logging
- Bulk embed management
- Permission query optimization
- Background processing ready

## Installation

### Prerequisites

- Frappe Framework v13+ or ERPNext
- Python 3.8+
- Redis (for caching)

### Quick Start

1. **Get the app**
   ```bash
   bench get-app workspace_embedder
   ```

2. **Install on your site**
   ```bash
   bench --site your-site install-app workspace_embedder
   ```

3. **Migrate and build**
   ```bash
   bench --site your-site migrate
   bench build --app workspace_embedder
   ```

## Usage

### Creating Page Embeds

1. Go to **Page Embed** doctype
2. Select a target page to embed
3. Configure dimensions and permissions
4. Enable the embed
5. Add to workspace via the "Add to Workspace" button

### Workspace Integration

The app extends Frappe workspaces with:

- **Add Page Embed** button in workspace forms
- **Manage Page Embeds** for bulk operations
- Drag & drop support for embedded content
- Real-time preview functionality

### Permission System

Page embeds inherit permissions from:
1. Target page permissions
2. Custom embed permissions (role-based)
3. Workspace access permissions
4. User ownership rights

## Configuration

### Security Settings

```python
# In your site's site_config.json
{
    "page_embed_sandbox": "allow-scripts allow-same-origin allow-forms",
    "page_embed_max_height": 2000,
    "page_embed_max_width": 100
}
```

### Custom Styling

Add custom CSS directly in the Page Embed form:

```css
.page-embed-container {
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.page-embed-iframe {
    border: none;
    width: 100%;
}
```

## API Reference

### Python API

```python
# Get embed HTML
embed_doc = frappe.get_doc("Page Embed", "My Embed")
html = embed_doc.get_embed_html()

# Check permissions
has_access = embed_doc.has_embed_permission(user="user@example.com")

# Add to workspace
from workspace_embedder.workspace_page_embedder.api import add_embed_to_workspace
result = add_embed_to_workspace("My Workspace", "My Embed")
```

### REST API

```javascript
// Get embed HTML
frappe.call({
    method: "workspace_embedder.workspace_page_embedder.api.get_embed_html",
    args: { embed_name: "My Embed" },
    callback: (r) => console.log(r.message)
});

// List available pages
frappe.call({
    method: "workspace_embedder.workspace_page_embedder.api.list_available_pages",
    args: { search: "sales", limit: 10 },
    callback: (r) => console.log(r.message)
});
```

## Architecture

### DocTypes

- **Page Embed**: Main configuration for embedded pages
- **Page Embed Permission**: Role-based access control

### Key Components

- **Permission System**: `workspace_page_embedder/permissions.py`
- **API Layer**: `workspace_page_embedder/api.py`  
- **Frontend Assets**: JavaScript and CSS for workspace integration
- **Hooks Integration**: Extends Frappe core functionality

### Database Schema

```sql
-- Page Embed fields
- name (PK)
- embed_name 
- target_page
- display_width/height
- enabled
- custom_css/html
- workspace (FK)
- permissions (Child Table)
```

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - Check target page permissions
   - Verify embed permissions are configured
   - Ensure user has workspace access

2. **Assets Not Loading**
   ```bash
   bench build --app workspace_embedder
   bench clear-cache
   ```

3. **Embed Not Appearing**
   - Check if embed is enabled
   - Verify workspace has the custom block
   - Clear browser cache

### Debug Mode

Enable debug logging:

```python
# In site_config.json
{
    "developer_mode": 1,
    "log_level": "DEBUG"
}
```

## Development

### Local Setup

```bash
# Clone and install
git clone <your-repo> apps/workspace_embedder
bench install-app workspace_embedder

# Development build
bench build --app workspace_embedder --dev

# Run tests
bench run-tests --app workspace_embedder
```

### Contributing

This app uses `pre-commit` for code formatting and linting. Please [install pre-commit](https://pre-commit.com/#installation) and enable it for this repository:

```bash
cd apps/workspace_embedder
pre-commit install
```

Pre-commit is configured to use the following tools for checking and formatting your code:

- ruff
- eslint  
- prettier
- pyupgrade

### Code Style

- Follow [Frappe Framework conventions](https://frappeframework.com/docs/user/en/guides/basics/python-code-quality)
- Use type hints for Python 3.8+
- Maximum line length: 120 characters
- Use conventional commits

## License

MIT License - see [LICENSE](license.txt) for details.

## Support

- 📧 Email: admin@techparts.pl
- 🐛 Issues: [GitHub Issues](https://github.com/techparts/workspace_embedder/issues)
- 💬 Discuss: [Frappe Community](https://discuss.frappe.io/)

## Changelog

### v0.0.1 (2026-04-27)

- Initial release
- Basic page embedding functionality
- Workspace integration
- Permission system
- Responsive design
- Security features

---

**Built with ❤️ by TechParts Sp. z o.o.**