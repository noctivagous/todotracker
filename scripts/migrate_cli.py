#!/usr/bin/env python3
"""
CLI tool for TodoTracker database migrations.
Provides commands for checking, migrating, and managing database schema versions.
"""

import sys
import argparse
from pathlib import Path

# Environment detection and setup
def setup_uv_environment():
    """Detect and setup uv environment if available."""
    try:
        import subprocess
        import os
        # Check if uv is available
        result = subprocess.run(['which', 'uv'], capture_output=True, text=True)
        if result.returncode == 0:
            # uv is available, check if we're already running under uv
            # UV_RUN_RECURSION_DEPTH is set when running under uv
            if 'UV_RUN_RECURSION_DEPTH' not in os.environ:
                # We're not running under uv, restart with uv
                print("🔄 Restarting with uv environment...")
                env = os.environ.copy()
                env['__UV_RESTARTED'] = '1'
                os.execvpe('uv', ['uv', 'run', '--script', sys.argv[0]] + sys.argv[1:], env)
    except Exception:
        # If anything fails, just continue with current environment
        pass

# Setup uv environment if available
setup_uv_environment()

sys.path.insert(0, str(Path(__file__).parent.parent))
from src.migrations import migrate_database, check_compatibility
from src.db import get_db_path
from src.version import __version__, SCHEMA_VERSION, get_changelog


def cmd_check(args):
    """Check migration status of a database."""
    db_path = args.db or get_db_path()
    
    if not Path(db_path).exists():
        print(f"❌ Database not found: {db_path}")
        return 2
    
    print(f"📋 TodoTracker Database Status")
    print("=" * 60)
    print(f"Database: {db_path}")
    print()
    
    status = check_compatibility(db_path)
    
    print(f"TodoTracker version: {status['app_version']}")
    print(f"Schema version:      v{status['target_schema']} (current)")
    print(f"Database schema:     v{status['current_schema']}")
    print()
    
    if status['needs_migration']:
        print("⚠️  Migration required")
        print()
        print("To migrate, run:")
        print(f"  python migrate_cli.py --migrate --db {db_path}")
        return 1
    elif status['needs_upgrade']:
        print("❌ TodoTracker upgrade required")
        print()
        print("This database was created with a newer version of TodoTracker.")
        print("Please upgrade TodoTracker to use this database.")
        return 2
    else:
        print("✅ Database is up to date")
        return 0


def cmd_migrate(args):
    """Run database migrations."""
    db_path = args.db or get_db_path()
    
    if not Path(db_path).exists():
        print(f"❌ Database not found: {db_path}")
        print()
        print("To create a new database, run:")
        print("  python todotracker_webserver.py")
        return 2
    
    success = migrate_database(db_path, interactive=not args.force)
    return 0 if success else 1


def cmd_info(args):
    """Display version and changelog information."""
    print(f"📋 TodoTracker v{__version__}")
    print("=" * 60)
    print(f"Current schema version: v{SCHEMA_VERSION}")
    print()
    
    if args.changelog:
        print("Schema Changelog:")
        print("-" * 60)
        
        for version in sorted(get_changelog().keys()):
            changelog = get_changelog(version)
            print(f"\nv{version} - {changelog['version']} ({changelog['date']})")
            print(f"  {changelog['description']}")
            print("  Changes:")
            for change in changelog['changes']:
                print(f"    • {change}")
        print()
    
    return 0


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="TodoTracker database migration tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Check migration status
  python migrate_cli.py --check
  
  # Run migrations (interactive)
  python migrate_cli.py --migrate
  
  # Run migrations (non-interactive)
  python migrate_cli.py --migrate --force
  
  # Check specific database
  python migrate_cli.py --check --db /path/to/project.db
  
  # Show version and changelog
  python migrate_cli.py --info --changelog
"""
    )
    
    parser.add_argument(
        "--check",
        action="store_true",
        help="Check migration status without making changes"
    )
    
    parser.add_argument(
        "--migrate",
        action="store_true",
        help="Run database migrations"
    )
    
    parser.add_argument(
        "--info",
        action="store_true",
        help="Display version and schema information"
    )
    
    parser.add_argument(
        "--db",
        metavar="PATH",
        help="Database path (default: from TODOTRACKER_DB_PATH env var or ./project.db)"
    )
    
    parser.add_argument(
        "--force",
        action="store_true",
        help="Skip confirmation prompts (for scripts)"
    )
    
    parser.add_argument(
        "--changelog",
        action="store_true",
        help="Show detailed changelog (with --info)"
    )
    
    parser.add_argument(
        "--version",
        action="version",
        version=f"TodoTracker v{__version__} (schema v{SCHEMA_VERSION})"
    )
    
    args = parser.parse_args()
    
    # Determine which command to run
    if args.info:
        return cmd_info(args)
    elif args.check:
        return cmd_check(args)
    elif args.migrate:
        return cmd_migrate(args)
    else:
        parser.print_help()
        return 0


if __name__ == "__main__":
    sys.exit(main())

