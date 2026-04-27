# Changelog

All notable changes to the Frappe Workspace Embedder project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.1] - 2026-04-27

### Added
- **Page Embed DocType**: Core configuration for embedded pages with full validation
- **Page Embed Permission DocType**: Role-based access control system
- **Workspace Integration**: Direct embedding into Frappe workspaces via Custom HTML Blocks
- **Permission System**: Advanced role-based permissions with SQL condition optimization
- **Security Features**: 
  - XSS protection with CSS/HTML sanitization
  - Iframe sandbox isolation
  - Permission inheritance from target pages
- **Responsive Design**: 
  - Mobile-friendly embedded content
  - Customizable dimensions and styling
  - CSS override support
- **API Layer**: 
  - REST endpoints for embed management
  - Page availability testing
  - Workspace bulk operations
- **Frontend Assets**: 
  - Page embed JavaScript functionality
  - Workspace extension integration
  - Responsive CSS styling
- **Management Tools**:
  - "Add Page Embed" button in workspace forms
  - "Manage Page Embeds" bulk operations interface
  - Real-time embed preview
- **Background Tasks**: 
  - Cleanup of inactive embeds
  - Usage statistics generation
  - Audit log maintenance
- **Developer Tools**: 
  - Migration verification script
  - Comprehensive test coverage
  - Pre-commit hooks integration

### Technical Details
- **Architecture**: Clean separation between DocTypes, API layer, and frontend
- **Performance**: Optimized permission queries and lazy loading
- **Compatibility**: Frappe Framework v13+ and ERPNext support
- **Database**: Proper indexing and relationship management
- **Code Quality**: ESLint, Prettier, and Ruff integration

### Migration
- Successfully migrated from `ai_agent_demo` app to standalone `workspace_embedder`
- Preserved all functionality while achieving clean separation
- Updated all import paths and references
- Maintained backward compatibility for existing embeds

### Documentation
- Comprehensive README with usage examples
- API documentation with code samples
- Troubleshooting guide
- Development setup instructions
- Marketplace preparation

---

## Release Notes

### v0.0.1 Initial Release

This is the first stable release of Frappe Workspace Embedder, providing a complete solution for embedding Frappe pages into workspaces with enterprise-grade security and permission controls.

**Key Highlights:**
- 🛡️ **Enterprise Security**: Role-based permissions with XSS protection
- 🎨 **Responsive Design**: Works perfectly on desktop and mobile
- 🚀 **Easy Integration**: One-click embedding into any workspace
- ⚙️ **Developer Friendly**: Clean APIs and comprehensive documentation

**Perfect for:**
- Dashboard consolidation
- Custom workspace layouts
- Cross-module integrations
- Multi-tenant deployments

**Next Steps:**
1. Install: `bench install-app workspace_embedder`
2. Migrate: `bench --site your-site migrate`
3. Start embedding pages in your workspaces!

---

## Contributing

Please see [README.md](README.md) for contribution guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](license.txt) file for details.