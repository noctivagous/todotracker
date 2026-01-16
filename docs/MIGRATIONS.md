# TodoTracker Database Migrations

This document describes the database migration system for TodoTracker and how to manage schema changes.

## Overview

TodoTracker uses a version-aware database schema system that:
- Tracks the schema version in the database
- Automatically detects when migrations are needed
- Creates backups before applying migrations
- Provides tools for manual migration control

## Schema Version History

### v1 - Initial Schema (TodoTracker v0.1.0)
**Released:** 2026-01-14

Initial database structure:

- **todos** table
  - Hierarchical structure with parent_id
  - Categories: feature (features/functionality), issue, bug
  - Statuses: pending, in_progress, completed, cancelled
  - Progress tracking fields

- **notes** table
  - Standalone or attached to todos
  - Simple text content

- **todo_dependencies** table
  - Track which todos depend on others
  - Enable blocking relationships

### v2 - Topics and Tags (TodoTracker v1.0.0)
**Released:** 2026-01-15

Added organization features:

- **topic** column in todos table
  - Optional grouping field (e.g., "window layout", "authentication")
  - Indexed for fast queries

- **tags** table
  - Reusable tags with descriptions
  - 34 stock tags pre-populated

- **todo_tags** association table
  - Many-to-many relationship between todos and tags

- **schema_version** table
  - Tracks applied migrations
  - Records TodoTracker version at migration time

### v3 - AI Progress Tracking (TodoTracker v1.1.0)
**Released:** 2026-01-15

Added three dedicated progress tracking fields:

- **work_completed** (TEXT)
  - What has been done so far
- **work_remaining** (TEXT)
  - What still needs to be done
- **implementation_issues** (TEXT)
  - Problems, blockers, or concerns encountered

These fields are designed for both humans and AI agents to keep consistent, high-signal progress logs.

### v4 - Execution Queue + Priority Metadata (TodoTracker v1.2.0)
**Released:** 2026-01-15

Added three optional fields to support better planning and execution:

- **queue** (INTEGER, default 0)
  - 0 = not in queue
  - Lower numbers = earlier execution order
- **task_size** (INTEGER, nullable)
  - Optional 1–5 scale (effort/complexity estimate)
- **priority_class** (TEXT, nullable)
  - Optional A–E scale (importance)

## Using Migrations

### Automatic Migration (Recommended)

When you run TodoTracker, it automatically detects if migration is needed:

```bash
python todotracker_webserver.py
```

If migration is needed, you'll see:
```
⚠️  Database schema v1, current version is v2
   Migration required. Run: python migrate_cli.py --migrate
```

### Manual Migration

Use the migration CLI tool for manual control:

```bash
# Check migration status
python migrate_cli.py --check

# Run migration (interactive - asks for confirmation)
python migrate_cli.py --migrate

# Run migration (non-interactive - for scripts)
python migrate_cli.py --migrate --force

# Check specific database
python migrate_cli.py --check --db /path/to/project.db

# Show version info and changelog
python migrate_cli.py --info --changelog
```

### Per-Project Migration

When setting up a project with `setup-project-todos.sh`, the script automatically:
1. Detects existing databases
2. Checks schema version compatibility
3. Offers to run migrations if needed

```bash
./setup-project-todos.sh my-project
```

## Migration Process

When you run a migration:

1. **Compatibility Check**
   - Verifies database can be migrated
   - Warns if database is from a newer version

2. **Backup Creation**
   - Automatic backup: `project_backup_YYYYMMDD_HHMMSS.db`
   - Includes WAL and SHM files if present

3. **Migration Steps**
   - Applies each migration sequentially
   - Records progress in schema_version table
   - Commits after each successful step

4. **Verification**
   - Confirms final schema version
   - Reports success or failure

## Backup and Restore

### Automatic Backups

Migrations automatically create backups before making changes:

```bash
.todos/
├── project.db                          # Current database
├── project_backup_20260115_123456.db  # Backup from migration
└── project_backup_20260115_234567.db  # Another backup
```

### Manual Backup

```bash
# Create manual backup
cp .todos/project.db .todos/project_backup_manual.db

# Or use the system backup function
python -c "from migrations import backup_database; backup_database('.todos/project.db')"
```

### Restore from Backup

If something goes wrong:

```bash
# Stop TodoTracker if running
pkill -f "python todotracker_webserver.py"

# Restore from backup
cp .todos/project_backup_20260115_123456.db .todos/project.db

# Restart TodoTracker
python todotracker_webserver.py
```

## Version Compatibility

### Compatible Scenarios

✅ **Database v1, TodoTracker v2** - Migration available  
✅ **Database v2, TodoTracker v2** - No migration needed  
✅ **New database, any version** - Initializes to current version  

### Incompatible Scenarios

❌ **Database v2, TodoTracker v1** - TodoTracker too old  
❌ **Database v3, TodoTracker v2** - TodoTracker needs upgrade  

### Handling Incompatibility

If your database is from a newer version:

```
❌ Database is from a NEWER version of TodoTracker!
   Database schema: v3
   TodoTracker schema: v2

   Please upgrade TodoTracker to use this database.
```

**Solution:** Upgrade TodoTracker to the latest version:
```bash
cd /path/to/todotracker
git pull origin main
# or download latest release
```

## Health Checks

### Via API

Check version status programmatically:

```bash
curl http://localhost:8070/api/health | python -m json.tool
```

Response:
```json
{
  "status": "ok",
  "todotracker": {
    "version": "1.0.0",
    "schema_version": 2
  },
  "database": {
    "path": "./project.db",
    "schema_version": 2,
    "needs_migration": false,
    "needs_upgrade": false
  },
  "timestamp": "2026-01-15T12:34:56"
}
```

Status values:
- `ok` - Everything up to date
- `needs_migration` - Migration required
- `incompatible` - TodoTracker too old
- `error` - Something went wrong

### Via CLI

```bash
# Quick status check
python migrate_cli.py --check

# Detailed version info
python migrate_cli.py --info --changelog
```

## Troubleshooting

### Migration Fails

If migration fails midway:

1. Check the error message
2. Restore from automatic backup
3. Report the issue with error details

```bash
# Restore from backup
cp .todos/project_backup_LATEST.db .todos/project.db

# Check logs for error details
python migrate_cli.py --check
```

### Schema Version Mismatch

If you see schema version warnings:

```bash
# Check current status
python migrate_cli.py --info

# Force re-check
rm .todos/project.db
python todotracker_webserver.py  # Will create fresh database
```

### Multiple Projects

Each project database migrates independently:

```bash
# Migrate all projects
for project in project1 project2 project3; do
    python migrate_cli.py --migrate --force --db /path/to/$project/.todos/project.db
done
```

## Development

### Creating New Migrations

**Important: Schema Version Convention**
- Schema versions must increment by **exactly 1** for each new version (1, 2, 3, 4, ...)
- Migration function names use format: `migrate_N_to_N+1` (e.g., `migrate_2_to_3`)
- Even if written with a dash in function names (e.g., "2-3"), the version numbers always increment by exactly 1 between consecutive versions
- **Never skip versions** or use non-sequential numbering (e.g., don't go from v3 to v5)

When adding a new feature that changes the schema:

1. **Update version.py:**
   ```python
   SCHEMA_VERSION = 3  # Increment by 1 from previous version
   
   SCHEMA_CHANGELOG = {
       # ... existing versions ...
       3: {
           "version": "1.1.0",
           "date": "2026-01-20",
           "description": "Add priority field",
           "changes": [
               "Added priority column to todos table",
           ]
       }
   }
   ```

2. **Create migration function in migrations.py:**
   ```python
   def migrate_2_to_3(db):
       """Add priority field to todos."""
       print("  → Adding 'priority' column...")
       db.execute(text("ALTER TABLE todos ADD COLUMN priority INTEGER DEFAULT 0"))
       db.commit()
   
   MIGRATIONS = {
       2: migrate_1_to_2,
       3: migrate_2_to_3,  # Add new migration (from previous to new version)
   }
   ```

3. **Test migration:**
   ```bash
   # Test on a copy of real database
   cp production.db test.db
   python migrate_cli.py --migrate --db test.db
   ```

4. **Update documentation:**
   - Add entry to MIGRATIONS.md
   - Update CHANGES.md
   - Document in README.md if user-facing

### Testing Migrations

```bash
# Create test database with old schema
python -c "from db import init_db; init_db()"

# Run migration
python migrate_cli.py --migrate --force

# Verify result
python migrate_cli.py --check
```

## Best Practices

### For Users

✅ **Always backup** before running migrations manually  
✅ **Let setup script handle migrations** for per-project databases  
✅ **Check health endpoint** in production deployments  
✅ **Keep TodoTracker updated** to avoid compatibility issues  

### For Developers

✅ **Increment schema version** for any structural change  
✅ **Test migrations** on real data before release  
✅ **Make migrations idempotent** (safe to run multiple times)  
✅ **Document breaking changes** in CHANGES.md  
✅ **Update changelog** in version.py  

## Support

If you encounter migration issues:

1. **Check the error message** - Often self-explanatory
2. **Restore from backup** - Automatic backups are created
3. **Check compatibility** - Run `migrate_cli.py --check`
4. **Report issues** - Include TodoTracker version and error details

For questions or help, see the project repository or documentation.

---

**Last Updated:** 2026-01-15  
**TodoTracker Version:** 1.0.0  
**Schema Version:** 2

