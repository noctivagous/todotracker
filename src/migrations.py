"""
Database migration system for TodoTracker.
Handles schema upgrades/downgrades safely with automatic backups.
"""

import shutil
import os
from pathlib import Path
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.exc import OperationalError
from .version import SCHEMA_VERSION, __version__, get_changelog


class MigrationError(Exception):
    """Raised when migration fails."""
    pass


def backup_database(db_path: str) -> str:
    """
    Create a backup before migration.
    
    Args:
        db_path: Path to database file
    
    Returns:
        Path to backup file, or None if database doesn't exist
    """
    db_file = Path(db_path)
    if not db_file.exists():
        return None
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = db_file.parent / f"{db_file.stem}_backup_{timestamp}{db_file.suffix}"
    
    # Copy database file
    shutil.copy2(db_path, backup_path)
    
    # Copy WAL and SHM files if they exist
    for ext in ['-wal', '-shm']:
        wal_file = Path(str(db_file) + ext)
        if wal_file.exists():
            shutil.copy2(wal_file, str(backup_path) + ext)
    
    return str(backup_path)


def migrate_1_to_2(db):
    """
    Migration from schema v1 to v2.
    Adds topic column and tags tables for the Topics & Tags feature.
    """
    print("  → Adding 'topic' column to todos table...")
    try:
        db.execute(text("ALTER TABLE todos ADD COLUMN topic VARCHAR(200)"))
        db.execute(text("CREATE INDEX ix_todos_topic ON todos(topic)"))
    except OperationalError as e:
        if "duplicate column" in str(e).lower():
            print("    (column already exists, skipping)")
        else:
            raise
    
    print("  → Creating tags table...")
    try:
        db.execute(text("""
            CREATE TABLE tags (
                id INTEGER PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL,
                description VARCHAR(200),
                created_at TIMESTAMP NOT NULL
            )
        """))
        db.execute(text("CREATE INDEX ix_tags_name ON tags(name)"))
    except OperationalError as e:
        if "already exists" in str(e).lower():
            print("    (table already exists, skipping)")
        else:
            raise
    
    print("  → Creating todo_tags association table...")
    try:
        db.execute(text("""
            CREATE TABLE todo_tags (
                id INTEGER PRIMARY KEY,
                todo_id INTEGER NOT NULL,
                tag_id INTEGER NOT NULL,
                created_at TIMESTAMP NOT NULL,
                FOREIGN KEY (todo_id) REFERENCES todos(id),
                FOREIGN KEY (tag_id) REFERENCES tags(id)
            )
        """))
    except OperationalError as e:
        if "already exists" in str(e).lower():
            print("    (table already exists, skipping)")
        else:
            raise
    
    # Create stock tags
    print("  → Creating stock tags...")
    stock_tags = [
        # Technical areas
        ("ui", "User Interface"),
        ("gui", "Graphical User Interface"),
        ("backend", "Backend/Server-side"),
        ("frontend", "Frontend/Client-side"),
        ("api", "API Development"),
        ("database", "Database related"),
        ("authentication", "Auth/Login/Security"),
        ("performance", "Performance optimization"),
        ("testing", "Testing and QA"),
        ("documentation", "Documentation"),
        
        # Task types
        ("refactoring", "Code refactoring"),
        ("cleanup", "Code cleanup"),
        ("optimization", "Optimization"),
        ("security", "Security related"),
        ("accessibility", "Accessibility"),
        
        # Priority/urgency
        ("urgent", "Urgent task"),
        ("blocker", "Blocking other work"),
        ("nice-to-have", "Nice to have"),
        
        # Complexity
        ("simple", "Simple task"),
        ("complex", "Complex task"),
        
        # Specific features
        ("layout", "Layout and positioning"),
        ("styling", "CSS/Styling"),
        ("responsive", "Responsive design"),
        ("mobile", "Mobile specific"),
        ("desktop", "Desktop specific"),
        ("forms", "Forms and input"),
        ("validation", "Input validation"),
        ("error-handling", "Error handling"),
        ("logging", "Logging"),
        ("monitoring", "Monitoring"),
        
        # Integration
        ("integration", "Third-party integration"),
        ("deployment", "Deployment related"),
        ("devops", "DevOps"),
        ("ci-cd", "CI/CD pipeline"),
    ]
    
    inserted = 0
    for tag_name, tag_desc in stock_tags:
        try:
            db.execute(text(
                "INSERT INTO tags (name, description, created_at) VALUES (:name, :desc, :now)"
            ), {"name": tag_name, "desc": tag_desc, "now": datetime.utcnow()})
            inserted += 1
        except Exception:
            # Tag might already exist, skip
            pass
    
    print(f"  → Created {inserted} stock tags")
    db.commit()


def migrate_2_to_3(db):
    """
    Migration from schema v2 to v3.
    Adds three progress tracking fields: work_completed, work_remaining, implementation_issues.
    These fields help AI track progress and maintain context when revisiting tasks.
    """
    print("  → Adding progress tracking columns to todos table...")
    
    # Add work_completed column
    try:
        db.execute(text("ALTER TABLE todos ADD COLUMN work_completed TEXT"))
        print("    ✓ Added work_completed column")
    except OperationalError as e:
        if "duplicate column" in str(e).lower():
            print("    (work_completed column already exists, skipping)")
        else:
            raise
    
    # Add work_remaining column
    try:
        db.execute(text("ALTER TABLE todos ADD COLUMN work_remaining TEXT"))
        print("    ✓ Added work_remaining column")
    except OperationalError as e:
        if "duplicate column" in str(e).lower():
            print("    (work_remaining column already exists, skipping)")
        else:
            raise
    
    # Add implementation_issues column
    try:
        db.execute(text("ALTER TABLE todos ADD COLUMN implementation_issues TEXT"))
        print("    ✓ Added implementation_issues column")
    except OperationalError as e:
        if "duplicate column" in str(e).lower():
            print("    (implementation_issues column already exists, skipping)")
        else:
            raise
    
    print("  → Migration complete: AI can now track progress with three dedicated fields")
    db.commit()


def migrate_3_to_4(db):
    """
    Migration from schema v3 to v4.
    Adds execution queue + priority metadata fields:
      - queue (INTEGER, default 0; 0 means not queued; lower executes first)
      - task_size (INTEGER, optional; 1-5)
      - priority_class (TEXT, optional; A-E)
    """
    print("  → Adding execution/priority columns to todos table...")

    # queue (default 0)
    try:
        db.execute(text("ALTER TABLE todos ADD COLUMN queue INTEGER NOT NULL DEFAULT 0"))
        print("    ✓ Added queue column")
    except OperationalError as e:
        if "duplicate column" in str(e).lower():
            print("    (queue column already exists, skipping)")
        else:
            raise

    # index for queue ordering
    try:
        db.execute(text("CREATE INDEX ix_todos_queue ON todos(queue)"))
        print("    ✓ Added ix_todos_queue index")
    except OperationalError as e:
        if "already exists" in str(e).lower():
            print("    (ix_todos_queue already exists, skipping)")
        else:
            raise

    # task_size (nullable)
    try:
        db.execute(text("ALTER TABLE todos ADD COLUMN task_size INTEGER"))
        print("    ✓ Added task_size column")
    except OperationalError as e:
        if "duplicate column" in str(e).lower():
            print("    (task_size column already exists, skipping)")
        else:
            raise

    # priority_class (nullable)
    try:
        db.execute(text("ALTER TABLE todos ADD COLUMN priority_class TEXT"))
        print("    ✓ Added priority_class column")
    except OperationalError as e:
        if "duplicate column" in str(e).lower():
            print("    (priority_class column already exists, skipping)")
        else:
            raise

    db.commit()


def migrate_4_to_5(db):
    """
    Migration from schema v4 to v5.
    Adds note typing and categories:
      - notes.note_type: 'project' | 'attached' (derived from todo_id for existing data)
      - notes.category: freeform category string (defaults to 'general')
    """
    print("  → Adding note_type/category columns to notes table...")

    # note_type (nullable during migration, then backfilled)
    try:
        db.execute(text("ALTER TABLE notes ADD COLUMN note_type TEXT"))
        print("    ✓ Added note_type column")
    except OperationalError as e:
        if "duplicate column" in str(e).lower():
            print("    (note_type column already exists, skipping)")
        else:
            raise

    # category (nullable during migration, then backfilled)
    try:
        db.execute(text("ALTER TABLE notes ADD COLUMN category TEXT"))
        print("    ✓ Added category column")
    except OperationalError as e:
        if "duplicate column" in str(e).lower():
            print("    (category column already exists, skipping)")
        else:
            raise

    # Backfill existing rows
    print("  → Backfilling note_type based on todo_id...")
    # NOTE: SQLAlchemy's Enum mapping stores Enum member *names* by default.
    # Our Python enum values are lowercase ("attached"/"project"), but the DB
    # should store "ATTACHED"/"PROJECT" to round-trip safely.
    db.execute(text("""
        UPDATE notes
        SET note_type = CASE
            WHEN todo_id IS NULL THEN 'PROJECT'
            ELSE 'ATTACHED'
        END
        WHERE note_type IS NULL OR TRIM(note_type) = ''
    """))

    # Normalize any previously written lowercase values (idempotent).
    db.execute(text("""
        UPDATE notes
        SET note_type = 'ATTACHED'
        WHERE note_type = 'attached'
    """))
    db.execute(text("""
        UPDATE notes
        SET note_type = 'PROJECT'
        WHERE note_type = 'project'
    """))

    print("  → Backfilling category defaults...")
    db.execute(text("""
        UPDATE notes
        SET category = 'general'
        WHERE category IS NULL OR TRIM(category) = ''
    """))

    # Helpful indexes for filtering
    print("  → Creating indexes for notes filtering...")
    try:
        db.execute(text("CREATE INDEX ix_notes_note_type ON notes(note_type)"))
        print("    ✓ Added ix_notes_note_type index")
    except OperationalError as e:
        if "already exists" in str(e).lower():
            print("    (ix_notes_note_type already exists, skipping)")
        else:
            raise

    try:
        db.execute(text("CREATE INDEX ix_notes_category ON notes(category)"))
        print("    ✓ Added ix_notes_category index")
    except OperationalError as e:
        if "already exists" in str(e).lower():
            print("    (ix_notes_category already exists, skipping)")
        else:
            raise

    db.commit()


def migrate_5_to_6(db):
    """
    Migration from schema v5 to v6.
    Adds vNext todo metadata and relations/attachments, plus optional note titles:
      - todos.completion_percentage: INTEGER nullable (0-100; validated in app)
      - todos.ai_instructions: TEXT NOT NULL DEFAULT '{}' (JSON text)
      - notes.title: TEXT nullable
      - todo_relations: (todo_id, relates_to_id) informational links
      - todo_attachments: basic file attachment metadata
    """
    print("  → Adding vNext todo metadata columns...")

    # completion_percentage (nullable)
    try:
        db.execute(text("ALTER TABLE todos ADD COLUMN completion_percentage INTEGER"))
        print("    ✓ Added completion_percentage column")
    except OperationalError as e:
        if "duplicate column" in str(e).lower():
            print("    (completion_percentage column already exists, skipping)")
        else:
            raise

    # ai_instructions (TEXT NOT NULL DEFAULT '{}')
    # NOTE: Store as JSON text for extensibility. App layer parses/validates.
    try:
        db.execute(text("ALTER TABLE todos ADD COLUMN ai_instructions TEXT NOT NULL DEFAULT '{}'"))
        print("    ✓ Added ai_instructions column")
    except OperationalError as e:
        if "duplicate column" in str(e).lower():
            print("    (ai_instructions column already exists, skipping)")
        else:
            raise

    print("  → Adding notes.title (optional) ...")
    try:
        db.execute(text("ALTER TABLE notes ADD COLUMN title TEXT"))
        print("    ✓ Added notes.title column")
    except OperationalError as e:
        if "duplicate column" in str(e).lower():
            print("    (notes.title column already exists, skipping)")
        else:
            raise

    print("  → Creating todo_relations table...")
    try:
        db.execute(text("""
            CREATE TABLE todo_relations (
                id INTEGER PRIMARY KEY,
                todo_id INTEGER NOT NULL,
                relates_to_id INTEGER NOT NULL,
                created_at TIMESTAMP NOT NULL,
                FOREIGN KEY (todo_id) REFERENCES todos(id),
                FOREIGN KEY (relates_to_id) REFERENCES todos(id)
            )
        """))
        # Avoid duplicates for same pair.
        db.execute(text("CREATE UNIQUE INDEX ux_todo_relations_pair ON todo_relations(todo_id, relates_to_id)"))
        db.execute(text("CREATE INDEX ix_todo_relations_todo_id ON todo_relations(todo_id)"))
        db.execute(text("CREATE INDEX ix_todo_relations_relates_to_id ON todo_relations(relates_to_id)"))
        print("    ✓ Created todo_relations table + indexes")
    except OperationalError as e:
        if "already exists" in str(e).lower():
            print("    (todo_relations already exists, skipping)")
        else:
            raise

    print("  → Creating todo_attachments table...")
    try:
        db.execute(text("""
            CREATE TABLE todo_attachments (
                id INTEGER PRIMARY KEY,
                todo_id INTEGER NOT NULL,
                file_path TEXT NOT NULL,
                file_name TEXT NOT NULL,
                file_size INTEGER,
                uploaded_at TIMESTAMP NOT NULL,
                FOREIGN KEY (todo_id) REFERENCES todos(id)
            )
        """))
        db.execute(text("CREATE INDEX ix_todo_attachments_todo_id ON todo_attachments(todo_id)"))
        print("    ✓ Created todo_attachments table + index")
    except OperationalError as e:
        if "already exists" in str(e).lower():
            print("    (todo_attachments already exists, skipping)")
        else:
            raise

    db.commit()


# Migration map: from_version -> migration_function
MIGRATIONS = {
    2: migrate_1_to_2,
    3: migrate_2_to_3,
    4: migrate_3_to_4,
    5: migrate_4_to_5,
    6: migrate_5_to_6,
}


def needs_migration(db, db_path: str = None) -> tuple[bool, int, int]:
    """
    Check if database needs migration.
    
    Args:
        db: Database session
        db_path: Optional path to database (for display)
    
    Returns:
        Tuple of (needs_migration, current_version, target_version)
    """
    from .db import get_db_schema_version
    
    current_version = get_db_schema_version(db)
    target_version = SCHEMA_VERSION
    
    return (current_version != target_version, current_version, target_version)


def migrate_database(db_path: str, interactive: bool = True) -> bool:
    """
    Migrate database to current schema version.
    
    Args:
        db_path: Path to database file
        interactive: If True, ask user for confirmation
    
    Returns:
        True if migration successful or not needed, False if skipped or failed
    """
    from .db import SessionLocal, get_db_schema_version, set_db_schema_version
    
    # Set the database path for this session
    os.environ['TODOTRACKER_DB_PATH'] = db_path
    
    db = SessionLocal()
    
    try:
        needs_mig, current, target = needs_migration(db, db_path)
        
        if not needs_mig:
            if interactive:
                print(f"✓ Database schema is up to date (v{current})")
            return True
        
        # Show migration plan
        print("\n" + "="*60)
        print("📋 DATABASE MIGRATION REQUIRED")
        print("="*60)
        print(f"Database path:          {db_path}")
        print(f"Current schema version: {current}")
        print(f"Target schema version:  {target}")
        print(f"TodoTracker version:    {__version__}")
        print()
        
        if current > target:
            print("⚠️  WARNING: Database is NEWER than this TodoTracker version!")
            print("   This may indicate you're running an older version.")
            print("   Please upgrade TodoTracker or use a compatible version.")
            return False
        
        # Show what will be migrated
        print("Migration steps:")
        for version in range(current + 1, target + 1):
            changelog = get_changelog(version)
            if changelog:
                print(f"  • v{version - 1} → v{version}: {changelog.get('description', 'No description')}")
        print()
        
        if interactive:
            response = input("Proceed with migration? [y/N]: ").strip().lower()
            if response not in ['y', 'yes']:
                print("Migration cancelled.")
                return False
        
        # Create backup
        print("\n📦 Creating backup...")
        backup_path = backup_database(db_path)
        if backup_path:
            print(f"✓ Backup created: {backup_path}")
        else:
            print("⚠️  No existing database to backup")
        
        # Run migrations
        print("\n🔄 Applying migrations...")
        for version in range(current + 1, target + 1):
            if version in MIGRATIONS:
                print(f"\n→ Migrating to v{version}...")
                try:
                    MIGRATIONS[version](db)
                    
                    # Record migration in schema_version table
                    changelog = get_changelog(version)
                    description = changelog.get('description', '') if changelog else ''
                    set_db_schema_version(db, version, __version__, description)
                    
                    print(f"✓ Migration to v{version} complete")
                except Exception as e:
                    print(f"\n❌ Migration failed at v{version}: {e}")
                    if backup_path:
                        print(f"\n⚠️  Database backup available at: {backup_path}")
                        print(f"   To restore: cp {backup_path} {db_path}")
                    db.rollback()
                    raise MigrationError(f"Migration failed: {e}")
        
        print("\n" + "="*60)
        print("✅ All migrations completed successfully!")
        print("="*60)
        return True
        
    except Exception as e:
        print(f"\n❌ Migration error: {e}")
        return False
    finally:
        db.close()


def check_compatibility(db_path: str) -> dict:
    """
    Check version compatibility and return status.
    
    Args:
        db_path: Path to database file
    
    Returns:
        Dictionary with compatibility information:
        - compatible: bool - Is database compatible?
        - current_schema: int - Current database schema version
        - target_schema: int - Target schema version
        - needs_migration: bool - Does database need migration?
        - needs_upgrade: bool - Is TodoTracker too old for this database?
        - app_version: str - Current TodoTracker version
    """
    from .db import SessionLocal, get_db_schema_version
    
    # Set the database path for this session
    os.environ['TODOTRACKER_DB_PATH'] = db_path
    
    db = SessionLocal()
    
    try:
        current = get_db_schema_version(db)
        target = SCHEMA_VERSION
        
        return {
            "compatible": current <= target,
            "current_schema": current,
            "target_schema": target,
            "needs_migration": current < target,
            "needs_upgrade": current > target,
            "app_version": __version__,
        }
    finally:
        db.close()


if __name__ == "__main__":
    # Simple CLI interface when run directly
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python migrations.py <database_path>")
        print("Example: python migrations.py .todos/project.db")
        sys.exit(1)
    
    db_path = sys.argv[1]
    
    if not Path(db_path).exists():
        print(f"❌ Database not found: {db_path}")
        sys.exit(1)
    
    success = migrate_database(db_path, interactive=True)
    sys.exit(0 if success else 1)

