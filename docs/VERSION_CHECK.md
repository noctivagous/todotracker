# Version Checking and Compatibility

This document provides quick commands for checking TodoTracker versions and compatibility.

## Quick Commands

### Check TodoTracker Version

```bash
python todotracker_webserver.py --version
```

Output:
```
TodoTracker v1.5.0
Schema version: v7
```

### Check Database Status

```bash
python migrate_cli.py --check
```

Output when up to date:
```
📋 TodoTracker Database Status
============================================================
Database: ./project.db

TodoTracker version: 1.5.0
Schema version:      v7 (current)
Database schema:     v7

✅ Database is up to date
```

Output when migration needed:
```
📋 TodoTracker Database Status
============================================================
Database: ./project.db

TodoTracker version: 1.5.0
Schema version:      v7 (current)
Database schema:     v6

⚠️  Migration required

To migrate, run:
  python migrate_cli.py --migrate --db ./project.db
```

### Check via API

```bash
curl http://localhost:8070/api/health | python -m json.tool
```

Response:
```json
{
  "status": "ok",
  "todotracker": {
    "version": "1.5.0",
    "schema_version": 7
  },
  "database": {
    "path": "./project.db",
    "schema_version": 7,
    "needs_migration": false,
    "needs_upgrade": false
  },
  "timestamp": "2026-01-15T12:34:56"
}
```

## Status Values

### CLI Status

- `✅ Database is up to date` - No action needed
- `⚠️  Migration required` - Run migration
- `❌ TodoTracker upgrade required` - Database from newer version

### API Status

- `ok` - Everything current
- `needs_migration` - Migration required
- `incompatible` - Version mismatch
- `error` - Something wrong

## Common Scenarios

### New Installation

```bash
# First run creates database at current version
python todotracker_webserver.py

# Check confirms current
python migrate_cli.py --check
# Output: ✅ Database is up to date
```

### Upgrading TodoTracker

```bash
# Pull latest version
git pull origin main

# Check if migration needed
python migrate_cli.py --check

# If migration needed, run it
python migrate_cli.py --migrate
```

### Multiple Projects

```bash
# Check each project
for project in project1 project2 project3; do
    echo "Checking $project..."
    python migrate_cli.py --check --db /path/to/$project/.todos/project.db
done
```

### CI/CD Integration

```bash
#!/bin/bash
# In deployment script

# Check version compatibility
python migrate_cli.py --check --db /path/to/production.db
if [ $? -eq 1 ]; then
    echo "Migration required, running..."
    python migrate_cli.py --migrate --force --db /path/to/production.db
elif [ $? -eq 2 ]; then
    echo "ERROR: Database incompatible!"
    exit 1
fi

# Start service
python todotracker_webserver.py
```

### Monitoring

```bash
# Health check in cron or monitoring system
#!/bin/bash

HEALTH=$(curl -s http://localhost:8070/api/health)
STATUS=$(echo $HEALTH | python -c "import sys, json; print(json.load(sys.stdin)['status'])")

if [ "$STATUS" != "ok" ]; then
    echo "ALERT: TodoTracker status is $STATUS"
    echo $HEALTH | python -m json.tool
    exit 1
fi
```

## Exit Codes

### migrate_cli.py

- `0` - Success / up to date
- `1` - Migration needed
- `2` - Incompatible / error

Use these in scripts:

```bash
python migrate_cli.py --check
case $? in
    0) echo "All good" ;;
    1) echo "Needs migration" ;;
    2) echo "Error or incompatible" ;;
esac
```

## Version History

See [MIGRATIONS.md](MIGRATIONS.md) for complete version history and changelog.

Current versions:
- **TodoTracker:** v1.5.0
- **Schema:** v7

---

**Last Updated:** 2026-01-18

