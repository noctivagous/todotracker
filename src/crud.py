"""
CRUD (Create, Read, Update, Delete) operations for the database.
These functions are used by both the MCP server and web server.
"""

from typing import List, Optional
import json
from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, func
from .db import (
    Todo,
    Note,
    TodoDependency,
    TodoStatus,
    TodoCategory,
    Tag,
    TodoTag,
    NoteType,
    TodoRelation,
    TodoAttachment,
)
from .schemas import TodoCreate, TodoUpdate, NoteCreate, NoteUpdate, TodoSearch


# Todo CRUD operations

# -----------------------------------------------------------------------------
# Queue rules
# -----------------------------------------------------------------------------

QUEUE_RELEVANT_STATUSES = {TodoStatus.PENDING, TodoStatus.IN_PROGRESS}


def _is_queue_relevant(status: Optional[TodoStatus]) -> bool:
    """Queue only applies to active work (pending/in_progress)."""
    return status in QUEUE_RELEVANT_STATUSES

def get_todo(db: Session, todo_id: int) -> Optional[Todo]:
    """Get a single todo by ID with all relationships loaded."""
    return db.query(Todo).options(
        joinedload(Todo.children),
        joinedload(Todo.notes),
        joinedload(Todo.dependencies),
        joinedload(Todo.relations),
        joinedload(Todo.attachments),
    ).filter(Todo.id == todo_id).first()


def get_todos(db: Session, skip: int = 0, limit: int = 100) -> List[Todo]:
    """Get all todos with pagination."""
    return db.query(Todo).offset(skip).limit(limit).all()


def get_root_todos(db: Session) -> List[Todo]:
    """Get all top-level todos (no parent)."""
    return db.query(Todo).filter(Todo.parent_id == None).all()


def get_todo_tree(db: Session) -> List[Todo]:
    """
    Get hierarchical todo tree (root todos with all children loaded).
    Uses recursive loading through relationships.
    """
    def _as_children_list(children_value):
        """
        Normalize `Todo.children` to a list.
        Defensive: misconfigured ORM relationships or older mappings can yield
        `None` (no children) or a scalar Todo (single child).
        """
        if children_value is None:
            return []
        # SQLAlchemy's InstrumentedList is list-like; keep it as-is.
        if isinstance(children_value, (list, tuple)):
            return list(children_value)
        # Scalar relationship (unexpected) — wrap.
        return [children_value]

    def load_children(todo: Todo):
        """Recursively load children."""
        for child in _as_children_list(getattr(todo, "children", None)):
            load_children(child)
        return todo
    
    root_todos = get_root_todos(db)
    if root_todos is None:
        return []
    return [load_children(todo) for todo in root_todos]


def create_todo(db: Session, todo: TodoCreate) -> Todo:
    """Create a new todo with optional tags."""
    requested_queue = getattr(todo, "queue", 0) or 0
    if not _is_queue_relevant(getattr(todo, "status", None)):
        requested_queue = 0

    ai_instr = getattr(todo, "ai_instructions", None)
    if ai_instr is None:
        ai_instr_json = "{}"
    else:
        try:
            ai_instr_json = json.dumps(ai_instr)
        except Exception:
            # Be defensive: fall back to empty.
            ai_instr_json = "{}"

    db_todo = Todo(
        title=todo.title,
        description=todo.description,
        category=todo.category,
        status=todo.status,
        parent_id=todo.parent_id,
        topic=todo.topic,
        queue=requested_queue,
        task_size=getattr(todo, "task_size", None),
        priority_class=getattr(todo, "priority_class", None),
        work_completed=todo.work_completed,
        work_remaining=todo.work_remaining,
        implementation_issues=todo.implementation_issues,
        completion_percentage=getattr(todo, "completion_percentage", None),
        ai_instructions=ai_instr_json,
    )
    db.add(db_todo)
    db.flush()  # Get the ID before adding tags
    
    # Add tags if provided
    if todo.tag_names:
        for tag_name in todo.tag_names:
            tag = db.query(Tag).filter(Tag.name == tag_name).first()
            if not tag:
                # Create new tag if it doesn't exist
                tag = Tag(name=tag_name)
                db.add(tag)
                db.flush()
            db_todo.tags.append(tag)
    
    db.commit()
    db.refresh(db_todo)
    return db_todo


def update_todo(db: Session, todo_id: int, todo_update: TodoUpdate) -> Optional[Todo]:
    """Update an existing todo with optional tags."""
    db_todo = get_todo(db, todo_id)
    if not db_todo:
        return None
    
    prev_queue = int(getattr(db_todo, "queue", 0) or 0)
    update_data = todo_update.model_dump(exclude_unset=True)

    # v6: Serialize ai_instructions dict to JSON text for DB storage.
    if "ai_instructions" in update_data:
        ai_instr = update_data.get("ai_instructions")
        if ai_instr is None:
            update_data["ai_instructions"] = "{}"
        else:
            update_data["ai_instructions"] = json.dumps(ai_instr)
    
    # Handle tags separately
    tag_names = update_data.pop('tag_names', None)
    
    # Update regular fields
    for field, value in update_data.items():
        setattr(db_todo, field, value)

    # Enforce: queue is only meaningful for pending/in_progress
    queue_cleared = False
    if not _is_queue_relevant(getattr(db_todo, "status", None)):
        if int(getattr(db_todo, "queue", 0) or 0) != 0:
            db_todo.queue = 0
            queue_cleared = True
    
    # Update tags if provided
    if tag_names is not None:
        # Clear existing tags
        db_todo.tags.clear()
        # Add new tags
        for tag_name in tag_names:
            tag = db.query(Tag).filter(Tag.name == tag_name).first()
            if not tag:
                tag = Tag(name=tag_name)
                db.add(tag)
                db.flush()
            db_todo.tags.append(tag)
    
    db.commit()

    # If this update removed an item from the queue (including status changes),
    # normalize queue positions so they stay contiguous.
    if queue_cleared or (prev_queue > 0 and int(getattr(db_todo, "queue", 0) or 0) == 0):
        normalize_queue(db)

    db.refresh(db_todo)
    return db_todo


def delete_todo(db: Session, todo_id: int) -> bool:
    """Delete a todo (cascades to children and notes)."""
    db_todo = get_todo(db, todo_id)
    if not db_todo:
        return False
    
    db.delete(db_todo)
    db.commit()
    return True


def search_todos(db: Session, search: TodoSearch) -> List[Todo]:
    """
    Search/filter todos based on query, category, status, parent_id, topic, and tags.
    Deep search includes title, description, progress fields, notes content, and tag names.
    """
    query = db.query(Todo)
    
    if search.query:
        search_term = f"%{search.query}%"
        # Deep search: include notes content and tag names
        # Use subqueries to avoid complex joins that might cause duplicates
        from sqlalchemy import exists
        notes_match = exists().where(
            and_(Note.todo_id == Todo.id, Note.content.ilike(search_term))
        )
        tags_match = exists().where(
            and_(
                TodoTag.todo_id == Todo.id,
                TodoTag.tag_id == Tag.id,
                Tag.name.ilike(search_term)
            )
        )
        query = query.filter(
            or_(
                Todo.title.ilike(search_term),
                Todo.description.ilike(search_term),
                Todo.progress_summary.ilike(search_term),
                Todo.remaining_work.ilike(search_term),
                Todo.work_completed.ilike(search_term),
                Todo.work_remaining.ilike(search_term),
                Todo.implementation_issues.ilike(search_term),
                Todo.topic.ilike(search_term),
                notes_match,
                tags_match,
            )
        ).distinct()  # Use distinct to avoid duplicates from subqueries
    
    if search.category:
        query = query.filter(Todo.category == search.category)
    
    if search.status:
        query = query.filter(Todo.status == search.status)
    
    if search.parent_id is not None:
        query = query.filter(Todo.parent_id == search.parent_id)
    
    if search.topic:
        topic_term = f"%{search.topic}%"
        query = query.filter(Todo.topic.ilike(topic_term))
    
    if search.tags:
        # Filter by tags (todos that have ALL specified tags)
        for tag_name in search.tags:
            query = query.join(Todo.tags).filter(Tag.name == tag_name)

    # Execution & priority filters
    if getattr(search, "in_queue", None) is True:
        query = query.filter(Todo.queue > 0, Todo.status.in_(list(QUEUE_RELEVANT_STATUSES)))
    elif getattr(search, "in_queue", None) is False:
        query = query.filter(Todo.queue == 0)

    if getattr(search, "queue", None) is not None:
        query = query.filter(Todo.queue == search.queue, Todo.status.in_(list(QUEUE_RELEVANT_STATUSES)))

    if getattr(search, "task_size", None) is not None:
        query = query.filter(Todo.task_size == search.task_size)

    if getattr(search, "priority_class", None):
        query = query.filter(Todo.priority_class == search.priority_class)

    # Dependency readiness filters
    dep_status = getattr(search, "dependency_status", None)
    if dep_status and dep_status != "any":
        from sqlalchemy import exists
        from sqlalchemy.orm import aliased
        DependsOn = aliased(Todo)
        unmet_dep_exists = exists().where(
            and_(
                TodoDependency.todo_id == Todo.id,
                TodoDependency.depends_on_id == DependsOn.id,
                DependsOn.status != TodoStatus.COMPLETED,
            )
        )
        if dep_status == "ready":
            query = query.filter(~unmet_dep_exists)
        elif dep_status == "blocked":
            query = query.filter(unmet_dep_exists)
    
    return query.all()


# -----------------------------------------------------------------------------
# Queue helpers
# -----------------------------------------------------------------------------

def get_queued_todos(db: Session, limit: Optional[int] = None, min_size: Optional[int] = None, max_size: Optional[int] = None) -> List[Todo]:
    """
    Get todos in the execution queue (queue > 0), ordered by queue ascending.
    
    Args:
        db: Database session
        limit: Optional limit on number of results
        min_size: Optional minimum task_size (1-5, inclusive)
        max_size: Optional maximum task_size (1-5, inclusive)
    
    Returns:
        List of todos sorted by queue value (ascending)
    
    Note:
        If task_size filtering is used, todos with null task_size are excluded.
    """
    q = (
        db.query(Todo)
        .filter(Todo.queue > 0, Todo.status.in_(list(QUEUE_RELEVANT_STATUSES)))
        .order_by(Todo.queue.asc(), Todo.id.asc())
    )
    
    # Apply task_size filtering if provided
    if min_size is not None or max_size is not None:
        # When filtering by task_size, exclude nulls
        q = q.filter(Todo.task_size.isnot(None))
        if min_size is not None:
            q = q.filter(Todo.task_size >= min_size)
        if max_size is not None:
            q = q.filter(Todo.task_size <= max_size)
    
    if limit is not None:
        q = q.limit(limit)
    return q.all()


def get_max_queue(db: Session) -> int:
    """Get the current maximum queue value (0 if none)."""
    max_val = (
        db.query(func.max(Todo.queue))
        .filter(Todo.queue > 0, Todo.status.in_(list(QUEUE_RELEVANT_STATUSES)))
        .scalar()
    )
    return int(max_val or 0)


def normalize_queue(db: Session) -> None:
    """
    Normalize queue values to be contiguous starting at 1, in current queue order.
    Leaves non-queued items at 0.
    """
    queued = get_queued_todos(db)
    expected = 1
    changed = False
    for todo in queued:
        if todo.queue != expected:
            todo.queue = expected
            changed = True
        expected += 1
    if changed:
        db.commit()


def add_to_queue(db: Session, todo_id: int) -> Optional[Todo]:
    """Add a todo to the end of the queue (sets queue to max+1)."""
    todo = get_todo(db, todo_id)
    if not todo:
        return None
    # Queue only applies to active work.
    if not _is_queue_relevant(getattr(todo, "status", None)):
        if int(getattr(todo, "queue", 0) or 0) != 0:
            todo.queue = 0
            db.commit()
            normalize_queue(db)
            db.refresh(todo)
        return todo
    if (todo.queue or 0) > 0:
        return todo
    todo.queue = get_max_queue(db) + 1
    db.commit()
    db.refresh(todo)
    return todo


def remove_from_queue(db: Session, todo_id: int) -> Optional[Todo]:
    """Remove a todo from the queue (sets queue to 0) and normalizes queue."""
    todo = get_todo(db, todo_id)
    if not todo:
        return None
    if (todo.queue or 0) == 0:
        return todo
    todo.queue = 0
    db.commit()
    normalize_queue(db)
    db.refresh(todo)
    return todo


def move_queue_up(db: Session, todo_id: int) -> Optional[Todo]:
    """Move a queued todo up by one position (swap with previous)."""
    todo = get_todo(db, todo_id)
    if not todo or (todo.queue or 0) <= 1:
        return todo
    if not _is_queue_relevant(getattr(todo, "status", None)):
        # If it somehow still has a queue value, clear it.
        if int(getattr(todo, "queue", 0) or 0) != 0:
            todo.queue = 0
            db.commit()
            normalize_queue(db)
            db.refresh(todo)
        return todo
    current_pos = int(todo.queue)
    prev = (
        db.query(Todo)
        .filter(
            Todo.queue == current_pos - 1,
            Todo.status.in_(list(QUEUE_RELEVANT_STATUSES)),
        )
        .first()
    )
    if not prev:
        normalize_queue(db)
        return get_todo(db, todo_id)
    prev.queue, todo.queue = current_pos, current_pos - 1
    db.commit()
    db.refresh(todo)
    return todo


def move_queue_down(db: Session, todo_id: int) -> Optional[Todo]:
    """Move a queued todo down by one position (swap with next)."""
    todo = get_todo(db, todo_id)
    if not todo or (todo.queue or 0) == 0:
        return todo
    if not _is_queue_relevant(getattr(todo, "status", None)):
        # If it somehow still has a queue value, clear it.
        todo.queue = 0
        db.commit()
        normalize_queue(db)
        db.refresh(todo)
        return todo
    current_pos = int(todo.queue)
    next_todo = (
        db.query(Todo)
        .filter(
            Todo.queue == current_pos + 1,
            Todo.status.in_(list(QUEUE_RELEVANT_STATUSES)),
        )
        .first()
    )
    if not next_todo:
        # Might already be at bottom or queue is gapped
        normalize_queue(db)
        return get_todo(db, todo_id)
    next_todo.queue, todo.queue = current_pos, current_pos + 1
    db.commit()
    db.refresh(todo)
    return todo


def add_concern(db: Session, parent_id: int, title: str, description: str) -> Optional[Todo]:
    """
    Convenience function to add a concern (a special type of todo).
    Prefixes the title with "[Concern]".
    """
    parent = get_todo(db, parent_id)
    if not parent:
        return None
    
    concern_title = f"[Concern] {title}" if not title.startswith("[Concern]") else title
    
    concern = TodoCreate(
        title=concern_title,
        description=description,
        category=TodoCategory.ISSUE,
        status=TodoStatus.PENDING,
        parent_id=parent_id,
        topic=None,
        tag_names=[],
    )
    
    return create_todo(db, concern)


# Tag CRUD operations

def get_all_tags(db: Session) -> List[Tag]:
    """Get all tags, ordered by name."""
    return db.query(Tag).order_by(Tag.name).all()


def get_tag_by_name(db: Session, name: str) -> Optional[Tag]:
    """Get a tag by name."""
    return db.query(Tag).filter(Tag.name == name).first()


def create_tag(db: Session, name: str, description: Optional[str] = None) -> Tag:
    """Create a new tag."""
    tag = Tag(name=name, description=description)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


def get_all_topics(db: Session) -> List[str]:
    """Get all unique topics used in todos."""
    topics = db.query(Todo.topic).filter(Todo.topic.isnot(None)).distinct().all()
    return sorted([t[0] for t in topics if t[0]])


# Note CRUD operations

def get_note(db: Session, note_id: int) -> Optional[Note]:
    """Get a single note by ID."""
    return db.query(Note).filter(Note.id == note_id).first()


def get_notes(
    db: Session,
    todo_id: Optional[int] = None,
    note_type: Optional[str] = None,
    category: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Note]:
    """Get notes, optionally filtered by todo_id, note_type, and/or category."""
    query = db.query(Note)
    
    if todo_id is not None:
        query = query.filter(Note.todo_id == todo_id)

    if note_type:
        try:
            nt = NoteType(note_type)
        except Exception:
            raise ValueError("note_type must be one of: attached, project")
        query = query.filter(Note.note_type == nt)

    if category:
        query = query.filter(Note.category == category)
    
    return query.offset(skip).limit(limit).all()


def create_note(db: Session, note: NoteCreate) -> Note:
    """Create a new note."""
    todo_id = note.todo_id
    nt = NoteType.ATTACHED if todo_id is not None else NoteType.PROJECT
    cat = (note.category or "").strip() or "general"
    db_note = Note(
        title=getattr(note, "title", None),
        content=note.content,
        todo_id=todo_id,
        note_type=nt,
        category=cat,
    )
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note


def update_note(db: Session, note_id: int, note_update: NoteUpdate) -> Optional[Note]:
    """Update an existing note."""
    db_note = get_note(db, note_id)
    if not db_note:
        return None
    
    update_data = note_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_note, field, value)

    # Keep note_type consistent with todo_id.
    db_note.note_type = NoteType.ATTACHED if db_note.todo_id is not None else NoteType.PROJECT
    # Normalize default category if cleared
    if not (db_note.category or "").strip():
        db_note.category = "general"
    
    db.commit()
    db.refresh(db_note)
    return db_note


# -----------------------------------------------------------------------------
# v6: Todo relations ("relates to") + attachments
# -----------------------------------------------------------------------------

def get_relates_to_ids(db: Session, todo_id: int) -> List[int]:
    """Get IDs that this todo relates to (informational links)."""
    rows = db.query(TodoRelation.relates_to_id).filter(TodoRelation.todo_id == todo_id).all()
    return [r[0] for r in rows if r and r[0] is not None]


def set_relates_to_ids(db: Session, todo_id: int, relates_to_ids: List[int]) -> None:
    """
    Replace relates_to links for a todo. Idempotent.
    """
    db.query(TodoRelation).filter(TodoRelation.todo_id == todo_id).delete()
    seen: set[int] = set()
    for rid in relates_to_ids or []:
        try:
            rid_int = int(rid)
        except Exception:
            continue
        if rid_int == int(todo_id):
            continue
        if rid_int in seen:
            continue
        seen.add(rid_int)
        db.add(TodoRelation(todo_id=int(todo_id), relates_to_id=rid_int))
    db.commit()


def get_todo_attachments(db: Session, todo_id: int) -> List[TodoAttachment]:
    return db.query(TodoAttachment).filter(TodoAttachment.todo_id == todo_id).order_by(TodoAttachment.uploaded_at.desc()).all()


def create_todo_attachment(
    db: Session,
    *,
    todo_id: int,
    file_path: str,
    file_name: str,
    file_size: Optional[int] = None,
) -> TodoAttachment:
    att = TodoAttachment(
        todo_id=int(todo_id),
        file_path=file_path,
        file_name=file_name,
        file_size=file_size,
        uploaded_at=datetime.utcnow(),
    )
    db.add(att)
    db.commit()
    db.refresh(att)
    return att


def delete_todo_attachment(db: Session, attachment_id: int) -> bool:
    att = db.query(TodoAttachment).filter(TodoAttachment.id == int(attachment_id)).first()
    if not att:
        return False
    db.delete(att)
    db.commit()
    return True


def delete_note(db: Session, note_id: int) -> bool:
    """Delete a note."""
    db_note = get_note(db, note_id)
    if not db_note:
        return False
    
    db.delete(db_note)
    db.commit()
    return True


# Dependency CRUD operations

def create_dependency(db: Session, todo_id: int, depends_on_id: int) -> Optional[TodoDependency]:
    """Create a dependency relationship between todos."""
    if todo_id == depends_on_id:
        raise ValueError("A todo cannot depend on itself")

    # Check if both todos exist
    todo = get_todo(db, todo_id)
    depends_on = get_todo(db, depends_on_id)
    
    if not todo or not depends_on:
        return None

    # Detect circular dependencies (would this edge create a cycle?)
    def _would_create_cycle(start_id: int, target_id: int) -> bool:
        """
        Returns True if there is already a dependency path start_id -> ... -> target_id.
        If so, adding target_id depends_on start_id would create a cycle.
        """
        visited: set[int] = set()
        stack: list[int] = [start_id]
        while stack:
            current = stack.pop()
            if current == target_id:
                return True
            if current in visited:
                continue
            visited.add(current)
            next_deps = db.query(TodoDependency.depends_on_id).filter(TodoDependency.todo_id == current).all()
            stack.extend([row[0] for row in next_deps if row and row[0] is not None])
        return False

    # We are adding: todo_id depends on depends_on_id
    # Cycle exists if depends_on_id already (directly/indirectly) depends on todo_id.
    if _would_create_cycle(depends_on_id, todo_id):
        raise ValueError(
            f"Circular dependency detected: adding {todo_id} depends on {depends_on_id} would create a cycle"
        )
    
    # Check if dependency already exists
    existing = db.query(TodoDependency).filter(
        and_(
            TodoDependency.todo_id == todo_id,
            TodoDependency.depends_on_id == depends_on_id
        )
    ).first()
    
    if existing:
        return existing
    
    dependency = TodoDependency(
        todo_id=todo_id,
        depends_on_id=depends_on_id,
    )
    db.add(dependency)
    db.commit()
    db.refresh(dependency)
    return dependency


def get_dependencies(db: Session, todo_id: int) -> List[TodoDependency]:
    """Get all dependencies for a todo."""
    return (
        db.query(TodoDependency)
        .options(joinedload(TodoDependency.depends_on), joinedload(TodoDependency.todo))
        .filter(TodoDependency.todo_id == todo_id)
        .all()
    )


def get_dependents(db: Session, todo_id: int) -> List[TodoDependency]:
    """Get all dependents (todos that depend on this todo)."""
    return (
        db.query(TodoDependency)
        .options(joinedload(TodoDependency.depends_on), joinedload(TodoDependency.todo))
        .filter(TodoDependency.depends_on_id == todo_id)
        .all()
    )


def delete_dependency(db: Session, dependency_id: int) -> bool:
    """Delete a dependency."""
    dependency = db.query(TodoDependency).filter(TodoDependency.id == dependency_id).first()
    if not dependency:
        return False
    
    db.delete(dependency)
    db.commit()
    return True


def check_dependencies_met(db: Session, todo_id: int) -> bool:
    """
    Check if all dependencies for a todo are completed.
    Returns True if all dependencies are met (or if there are no dependencies).
    """
    dependencies = get_dependencies(db, todo_id)
    
    if not dependencies:
        return True
    
    for dep in dependencies:
        depends_on_todo = get_todo(db, dep.depends_on_id)
        if depends_on_todo and depends_on_todo.status != TodoStatus.COMPLETED:
            return False
    
    return True

