# Legacy Jinja2 Templates (Archived)

This directory contains legacy Jinja2 templates that were used in the multi-page version of TodoTracker before the SPA (Single Page Application) migration.

## Archived Templates

- **`base.html`** - Old base template (replaced by `spa.html`)
- **`todos.html`** - Legacy multi-page todos list template
- **`notes.html`** - Legacy multi-page notes list template  
- **`todo_detail.html`** - Legacy multi-page todo detail template

## Current Active Templates

The following templates are still actively used and remain in `/templates/`:

- **`spa.html`** - Main SPA entry point (served for all routes)
- **`dashboard.html`** - Dashboard page (used by `dashboard.py` on port 8069)
- **`base_dashboard.html`** - Base template for dashboard

## Migration Notes

As of the SPA migration, all web routes now serve `spa.html` as the entry point. The application uses client-side JavaScript (with JsRender templates in `/static/templates/`) to render views dynamically.

These legacy templates are kept for reference only and are no longer served by the web server.

