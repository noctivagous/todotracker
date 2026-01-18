"""
Database models and configuration for the TodoTracker system.
Uses SQLAlchemy with SQLite and WAL mode for concurrent access.
Auto-detects per-project databases in .todos/project.db directories.
Falls back to TODOTRACKER_DB_PATH environment variable if not found.
"""

import os
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Set
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    Enum as SQLEnum,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, backref
from sqlalchemy.pool import StaticPool
from sqlalchemy.sql import text
from sqlalchemy.engine import Engine
import enum

Base = declarative_base()

_AUTO_MIGRATED_DB_PATHS: Set[str] = set()


class TodoCategory(str, enum.Enum):
    """Todo categories as specified in the requirements."""
    FEATURE = "feature"
    ISSUE = "issue"
    BUG = "bug"


class TodoStatus(str, enum.Enum):
    """Todo status options."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class NoteType(str, enum.Enum):
    """Note type options."""
    ATTACHED = "attached"
    PROJECT = "project"


class Todo(Base):
    """
    Todo model with hierarchical structure via parent_id.
    Supports categories (feature/issue/bug) and tracks progress.
    """
    __tablename__ = "todos"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(SQLEnum(TodoCategory), nullable=False, default=TodoCategory.FEATURE)
    status = Column(SQLEnum(TodoStatus), nullable=False, default=TodoStatus.PENDING)
    
    # Topic and organization
    topic = Column(String(200), nullable=True, index=True)  # e.g., "window layout", "authentication"

    # Execution & priority metadata
    # queue: 0 means not in queue; lower numbers execute first
    queue = Column(Integer, nullable=False, default=0, index=True)
    # task_size: optional 1-5 scale (effort/complexity)
    task_size = Column(Integer, nullable=True)
    # priority_class: optional A-E scale (importance)
    priority_class = Column(String(1), nullable=True)

    # v6: Numeric progress + per-todo AI instructions (JSON text)
    completion_percentage = Column(Integer, nullable=True)  # 0-100 (validated in app)
    ai_instructions = Column(Text, nullable=False, default="{}")
    
    # Hierarchical structure
    parent_id = Column(Integer, ForeignKey("todos.id"), nullable=True)
    
    # Progress tracking (AI and user update these)
    # These three fields help AI maintain context when revisiting tasks
    work_completed = Column(Text, nullable=True)  # What has been done
    work_remaining = Column(Text, nullable=True)  # What needs to be done
    implementation_issues = Column(Text, nullable=True)  # Problems, blockers, concerns
    
    # Legacy fields (deprecated, kept for migration compatibility)
    progress_summary = Column(Text, nullable=True)
    remaining_work = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    #
    # Self-referential relationship:
    # - parent: scalar (many-to-one)
    # - children: list (one-to-many)
    #
    # NOTE: remote_side must be declared on the *parent* side. Putting it on the
    # children side can cause SQLAlchemy to treat `children` as a scalar, which
    # then becomes `None` when there are no children and breaks tree iteration.
    parent = relationship(
        "Todo",
        remote_side=[id],
        backref=backref(
            "children",
            cascade="all, delete",  # Removed "orphan" - children become root todos when parent deleted
        ),
    )
    notes = relationship("Note", back_populates="todo", cascade="all, delete-orphan")
    
    # Dependencies (many-to-many)
    dependencies = relationship(
        "TodoDependency",
        foreign_keys="TodoDependency.todo_id",
        back_populates="todo",
        cascade="all, delete-orphan"
    )
    
    # Tags (many-to-many)
    tags = relationship("Tag", secondary="todo_tags", back_populates="todos")

    # v6: Informational relations ("relates to")
    relations = relationship(
        "TodoRelation",
        foreign_keys="TodoRelation.todo_id",
        back_populates="todo",
        cascade="all, delete-orphan",
    )
    related_from = relationship(
        "TodoRelation",
        foreign_keys="TodoRelation.relates_to_id",
        cascade="all, delete-orphan",
        overlaps="relations,todo",
    )

    # v6: File attachments
    attachments = relationship("TodoAttachment", back_populates="todo", cascade="all, delete-orphan")


class Note(Base):
    """
    Notes that can be attached to todos or standalone.
    """
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=True)
    content = Column(Text, nullable=False)
    todo_id = Column(Integer, ForeignKey("todos.id"), nullable=True)
    # New in schema v5:
    # - note_type: explicit type (project vs attached) for filtering/UX
    # - category: lightweight categorization (e.g., "research")
    note_type = Column(SQLEnum(NoteType), nullable=False, default=NoteType.PROJECT, index=True)
    category = Column(String(80), nullable=False, default="general", index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    todo = relationship("Todo", back_populates="notes")


class TodoRelation(Base):
    """
    Informational relationship between todos (NOT a dependency).
    Example: todo A "relates to" todo B.
    """
    __tablename__ = "todo_relations"

    id = Column(Integer, primary_key=True, index=True)
    todo_id = Column(Integer, ForeignKey("todos.id"), nullable=False)
    relates_to_id = Column(Integer, ForeignKey("todos.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    todo = relationship("Todo", foreign_keys=[todo_id], back_populates="relations", overlaps="related_from")
    relates_to = relationship("Todo", foreign_keys=[relates_to_id], overlaps="related_from,relations")


class TodoAttachment(Base):
    """
    File attachment metadata for a todo. The file is stored on disk; the DB stores metadata + path.
    """
    __tablename__ = "todo_attachments"

    id = Column(Integer, primary_key=True, index=True)
    todo_id = Column(Integer, ForeignKey("todos.id"), nullable=False)
    file_path = Column(Text, nullable=False)
    file_name = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    todo = relationship("Todo", back_populates="attachments")


class TodoDependency(Base):
    """
    Many-to-many relationship for todo dependencies.
    A todo can depend on other todos being completed first.
    """
    __tablename__ = "todo_dependencies"

    id = Column(Integer, primary_key=True, index=True)
    todo_id = Column(Integer, ForeignKey("todos.id"), nullable=False)
    depends_on_id = Column(Integer, ForeignKey("todos.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    todo = relationship("Todo", foreign_keys=[todo_id], back_populates="dependencies")
    depends_on = relationship("Todo", foreign_keys=[depends_on_id])


class Tag(Base):
    """
    Tags that can be applied to todos for organization and filtering.
    """
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    todos = relationship("Todo", secondary="todo_tags", back_populates="tags")


class TodoTag(Base):
    """
    Association table for many-to-many relationship between todos and tags.
    """
    __tablename__ = "todo_tags"

    id = Column(Integer, primary_key=True, index=True)
    todo_id = Column(Integer, ForeignKey("todos.id"), nullable=False)
    tag_id = Column(Integer, ForeignKey("tags.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class SchemaVersion(Base):
    """
    Track database schema version for migrations.
    Allows detection of version mismatches and migration needs.
    """
    __tablename__ = "schema_version"
    
    id = Column(Integer, primary_key=True, index=True)
    version = Column(Integer, nullable=False, index=True)
    applied_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    todotracker_version = Column(String(20), nullable=False)
    description = Column(Text, nullable=True)


def find_project_database(start_path: Optional[str] = None) -> Optional[str]:
    """
    Find the project's .todos/project.db by walking up from the start path.
    Returns the absolute path to the database or None if not found.
    
    This allows TodoTracker to automatically detect and use per-project databases
    without requiring environment variables.
    """
    if start_path is None:
        start_path = os.getcwd()
    
    current = Path(start_path).resolve()
    
    # Walk up the directory tree looking for .todos/project.db
    for parent in [current] + list(current.parents):
        db_path = parent / ".todos" / "project.db"
        if db_path.exists():
            return str(db_path)
    
    return None


# Database configuration
# Priority order:
# 1. Auto-detect .todos/project.db in current directory or parent directories
# 2. TODOTRACKER_DB_PATH environment variable
# 3. Default ./data/project.db
def get_database_path() -> str:
    """Determine the database path using auto-detection."""
    # Check for explicit environment variable first (for backwards compatibility)
    if "TODOTRACKER_DB_PATH" in os.environ:
        return os.environ["TODOTRACKER_DB_PATH"]

    # Try auto-detection
    detected_path = find_project_database()
    if detected_path:
        return detected_path

    # Fall back to default
    return "./data/project.db"


# Global variables - will be initialized lazily
engine = None
_SessionLocalMaker = None
DB_PATH = None
DATABASE_URL = None

# Per-db cache for multi-project usage (e.g., per MCP tool call).
# Keyed by absolute db_path.
_ENGINE_BY_DB_PATH: Dict[str, Engine] = {}
_SESSIONMAKER_BY_DB_PATH: Dict[str, sessionmaker] = {}
_INITIALIZED_DB_PATHS: Set[str] = set()


def _normalize_db_path(db_path: str) -> str:
    return str(Path(db_path).expanduser().resolve())


def _ensure_db_directory(db_path: str) -> None:
    db_dir = Path(db_path).parent
    if not db_dir.exists():
        db_dir.mkdir(parents=True, exist_ok=True)


def _create_engine_for_db_path(db_path: str) -> Engine:
    database_url = f"sqlite:///{db_path}"
    eng = create_engine(
        database_url,
        connect_args={
            "timeout": 15,
            "check_same_thread": False,
        },
        poolclass=StaticPool,
        echo=False,  # Set to True for SQL debugging
    )

    # Enable WAL mode for better concurrency
    with eng.connect() as conn:
        conn.execute(text("PRAGMA journal_mode=WAL"))
        conn.execute(text("PRAGMA busy_timeout=15000"))
        conn.commit()
    return eng


def _get_or_create_engine_and_sessionmaker(db_path: str) -> tuple[Engine, sessionmaker]:
    norm = _normalize_db_path(db_path)
    if norm in _ENGINE_BY_DB_PATH and norm in _SESSIONMAKER_BY_DB_PATH:
        return _ENGINE_BY_DB_PATH[norm], _SESSIONMAKER_BY_DB_PATH[norm]

    _ensure_db_directory(norm)
    eng = _create_engine_for_db_path(norm)
    maker = sessionmaker(autocommit=False, autoflush=False, bind=eng)
    _ENGINE_BY_DB_PATH[norm] = eng
    _SESSIONMAKER_BY_DB_PATH[norm] = maker
    return eng, maker


def _init_engine():
    """Initialize the database engine lazily."""
    global engine, _SessionLocalMaker, DB_PATH, DATABASE_URL

    if engine is not None:
        return  # Already initialized

    DB_PATH = get_database_path()

    # Ensure the directory exists
    db_dir = Path(DB_PATH).parent
    if not db_dir.exists():
        db_dir.mkdir(parents=True, exist_ok=True)

    DATABASE_URL = f"sqlite:///{DB_PATH}"

    engine = create_engine(
        DATABASE_URL,
        connect_args={
            "timeout": 15,
            "check_same_thread": False,
        },
        poolclass=StaticPool,
        echo=False,  # Set to True for SQL debugging
    )

    # Enable WAL mode for better concurrency
    with engine.connect() as conn:
        conn.execute(text("PRAGMA journal_mode=WAL"))
        conn.execute(text("PRAGMA busy_timeout=15000"))
        conn.commit()

    _SessionLocalMaker = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def SessionLocal(db_path: Optional[str] = None):
    """
    Return a new SQLAlchemy Session.

    This is intentionally a function (not a sessionmaker variable) so imports like
    `from .db import SessionLocal` always stay callable even with lazy init.
    """
    if db_path is None:
        _init_engine()
        return _SessionLocalMaker()

    # Per-call / per-project DB path
    eng, maker = _get_or_create_engine_and_sessionmaker(db_path)

    # Ensure schema exists once per db_path. We keep this lightweight: create tables,
    # and then let callers run migrations as needed.
    norm = _normalize_db_path(db_path)
    if norm not in _INITIALIZED_DB_PATHS:
        Base.metadata.create_all(bind=eng)
        _INITIALIZED_DB_PATHS.add(norm)

    return maker()


def get_db_path():
    """Get the current database path."""
    if DB_PATH is None:
        _init_engine()
    return DB_PATH


def get_db_schema_version(db) -> int:
    """
    Get current database schema version.
    Returns 0 if schema_version table doesn't exist (new or very old database).
    """
    try:
        latest = db.query(SchemaVersion).order_by(
            SchemaVersion.version.desc()
        ).first()
        return latest.version if latest else 0
    except Exception:
        # Table doesn't exist - could be new database or pre-versioning
        return 0


def set_db_schema_version(db, version: int, app_version: str, description: str = None):
    """Set database schema version after migration or initialization."""
    schema_version = SchemaVersion(
        version=version,
        todotracker_version=app_version,
        description=description
    )
    db.add(schema_version)
    db.commit()


def init_db():
    """Initialize the database, creating all tables with version tracking."""
    from .version import SCHEMA_VERSION, __version__, get_changelog
    from .migrations import migrate_database

    # Ensure engine is initialized
    _init_engine()

    Base.metadata.create_all(bind=engine)
    
    # Check and set schema version
    db = SessionLocal()
    try:
        current_version = get_db_schema_version(db)
        
        if current_version == 0:
            # New database - set to current version
            changelog = get_changelog(SCHEMA_VERSION)
            description = changelog.get('description', 'Initial setup') if changelog else 'Initial setup'
            set_db_schema_version(db, SCHEMA_VERSION, __version__, description)
            print(f"✓ Database initialized with schema v{SCHEMA_VERSION}")
        elif current_version < SCHEMA_VERSION:
            # Existing database needs migration
            print(f"⚠️  Database schema v{current_version}, current version is v{SCHEMA_VERSION}")
            print("   Auto-migrating database (non-interactive)...")
            db.close()
            ok = migrate_database(get_db_path(), interactive=False)
            if not ok:
                raise RuntimeError("Database migration failed or was skipped")
            # Re-open session to reflect new schema/version
            db = SessionLocal()
            current_version = get_db_schema_version(db)
            if current_version < SCHEMA_VERSION:
                raise RuntimeError(f"Database still at schema v{current_version} after migration (target v{SCHEMA_VERSION})")
        elif current_version > SCHEMA_VERSION:
            print(f"⚠️  WARNING: Database schema v{current_version} is NEWER than TodoTracker v{SCHEMA_VERSION}")
            print("   Please upgrade TodoTracker to use this database.")

        # Queue is only meaningful for active work (pending/in_progress). Clean up any
        # stale queue values on completed/cancelled items, and renumber queue contiguously.
        try:
            db.execute(text(
                "UPDATE todos SET queue = 0 "
                "WHERE status NOT IN ('pending', 'in_progress') AND queue <> 0"
            ))
            # Renumber queued items to 1..N in current ordering.
            db.execute(text("""
                WITH ranked AS (
                    SELECT id, ROW_NUMBER() OVER (ORDER BY queue ASC, id ASC) AS rn
                    FROM todos
                    WHERE queue > 0 AND status IN ('pending', 'in_progress')
                )
                UPDATE todos
                SET queue = (SELECT rn FROM ranked WHERE ranked.id = todos.id)
                WHERE id IN (SELECT id FROM ranked)
            """))
            db.commit()
        except Exception:
            # Best-effort cleanup; if the DB is old/unusual, runtime CRUD enforcement still applies.
            db.rollback()

        # Notes: normalize enum storage for note_type (historical v5 migration wrote lowercase in some DBs).
        # SQLAlchemy Enum mapping expects member names ("ATTACHED"/"PROJECT").
        try:
            db.execute(text("UPDATE notes SET note_type = 'ATTACHED' WHERE note_type = 'attached'"))
            db.execute(text("UPDATE notes SET note_type = 'PROJECT' WHERE note_type = 'project'"))
            db.commit()
        except Exception:
            db.rollback()
        
        # Create stock tags if they don't exist
        existing_tags = db.query(Tag).count()
        if existing_tags == 0:
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
            
            for tag_name, tag_desc in stock_tags:
                tag = Tag(name=tag_name, description=tag_desc)
                db.add(tag)
            
            db.commit()
            print(f"✓ Created {len(stock_tags)} stock tags")
    finally:
        db.close()


def get_db():
    """Dependency to get database session."""
    # Ensure engine is initialized
    _init_engine()

    db = SessionLocal()
    try:
        # Best-effort auto-migration for old databases, once per DB path.
        from .version import SCHEMA_VERSION
        db_path = get_db_path()
        if db_path and db_path not in _AUTO_MIGRATED_DB_PATHS:
            try:
                current_version = get_db_schema_version(db)
                if current_version < SCHEMA_VERSION:
                    from .migrations import migrate_database
                    db.close()
                    ok = migrate_database(db_path, interactive=False)
                    if not ok:
                        raise RuntimeError("Database migration failed or was skipped")
                    db = SessionLocal()
                # Normalize note_type enum storage (see init_db note).
                try:
                    db.execute(text("UPDATE notes SET note_type = 'ATTACHED' WHERE note_type = 'attached'"))
                    db.execute(text("UPDATE notes SET note_type = 'PROJECT' WHERE note_type = 'project'"))
                    db.commit()
                except Exception:
                    db.rollback()
                _AUTO_MIGRATED_DB_PATHS.add(db_path)
            except Exception:
                # If migration fails, let normal request handling surface the error.
                pass
        yield db
    finally:
        db.close()

