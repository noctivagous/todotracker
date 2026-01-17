"""
TodoTracker version and schema management.

Version format: MAJOR.MINOR.PATCH
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes

Schema version increments when database structure changes.

Schema Version Convention:
- Schema versions must increment by 1 (1, 2, 3, 4, ...)
- Migration function names use format: migrate_N_to_N+1 (e.g., migrate_2_to_3)
- Even if written with a dash (e.g., "2-3" in function names), the version numbers 
  always increment by exactly 1 between consecutive versions
- Never skip versions or use non-sequential numbering
"""

__version__ = "1.3.0"
SCHEMA_VERSION = 5  # Current database schema version

# Schema version history and changelog
SCHEMA_CHANGELOG = {
    1: {
        "version": "0.1.0",
        "date": "2026-01-14",
        "description": "Initial schema",
        "changes": [
            "todos table with hierarchical structure",
            "notes table for todo annotations",
            "todo_dependencies for task dependencies",
        ]
    },
    2: {
        "version": "1.0.0",
        "date": "2026-01-15",
        "description": "Topics and Tags feature",
        "changes": [
            "Added topic column to todos table",
            "Added tags table for reusable tags",
            "Added todo_tags association table",
            "34 stock tags pre-populated",
        ]
    },
    3: {
        "version": "1.1.0",
        "date": "2026-01-15",
        "description": "AI Progress Tracking",
        "changes": [
            "Added work_completed field (what has been done)",
            "Added work_remaining field (what needs to be done)",
            "Added implementation_issues field (problems, blockers, concerns)",
            "MCP server updated with clear instructions for AI progress tracking",
            "Web UI updated to display and edit all three progress fields",
        ]
    },
    4: {
        "version": "1.2.0",
        "date": "2026-01-15",
        "description": "Execution queue + priority metadata",
        "changes": [
            "Added queue field (integer >= 0; 0 means not queued; lower numbers execute first)",
            "Added task_size field (optional integer 1-5)",
            "Added priority_class field (optional letter A-E)",
        ]
    },
    5: {
        "version": "1.3.0",
        "date": "2026-01-17",
        "description": "Notes: project vs attached + categories",
        "changes": [
            "Added note_type field to notes (project vs attached)",
            "Added category field to notes (e.g., research)",
            "Web API + MCP updated to support note categories and note types",
            "SPA Notes view updated with filters for type and category",
        ]
    },
}

def get_version():
    """Get current TodoTracker version."""
    return __version__

def get_schema_version():
    """Get current schema version."""
    return SCHEMA_VERSION

def get_changelog(schema_version: int = None):
    """
    Get changelog for a specific schema version or all versions.
    
    Args:
        schema_version: Specific version to get, or None for all
    
    Returns:
        Dictionary with changelog information
    """
    if schema_version is not None:
        return SCHEMA_CHANGELOG.get(schema_version)
    return SCHEMA_CHANGELOG

