"""
FastAPI Web Server for TodoTracker.
Provides a web UI for humans to interact with the todo system.
"""

from fastapi import FastAPI, Request, Depends, HTTPException, Form
from fastapi.responses import HTMLResponse, RedirectResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from typing import Optional
from pathlib import Path
import os
import uvicorn
import json
import csv
import io
from datetime import datetime

from .db import init_db, get_db, get_db_path, TodoCategory, TodoStatus, Note, TodoDependency, Tag
from .schemas import (
    TodoCreate, TodoUpdate, TodoInDB, TodoWithChildren,
    NoteCreate, NoteUpdate, NoteInDB,
    DependencyCreate, DependencyInDB, TodoDetail,
    TodoSearch, MessageResponse
)
from . import crud
from .project_config import ProjectConfig


# Initialize FastAPI app
app = FastAPI(
    title="TodoTracker",
    description="AI-powered todo management system with MCP integration",
    version="1.0.0"
)

# Mount static files and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

def _get_project_name() -> Optional[str]:
    """
    Best-effort project name for display in the UI header.
    Priority:
    - project .todos/config.json (project_name)
    - TODOTRACKER_PROJECT_NAME env var
    - derived from DB path (.../<project>/.todos/project.db)
    - current working directory name
    """
    # Prefer reading from the project config associated with the active DB.
    try:
        db_path = Path(get_db_path()).resolve()
        # Typical layout: <project_root>/.todos/project.db
        if db_path.name == "project.db" and db_path.parent.name == ".todos":
            project_root = db_path.parent.parent
            config = ProjectConfig(project_root).load_config()
            if config and config.get("project_name"):
                return config["project_name"]
            return project_root.name
    except Exception:
        pass

    env_name = os.environ.get("TODOTRACKER_PROJECT_NAME")
    if env_name:
        return env_name

    try:
        return Path.cwd().name
    except Exception:
        return None

# Expose as a Jinja global so every page (base template) can display it
templates.env.globals["project_name"] = _get_project_name()


def _redirect_back(request: Request, default: str = "/") -> RedirectResponse:
    """Best-effort redirect back to the page that initiated an action (keeps filters)."""
    referer = request.headers.get("referer")
    return RedirectResponse(url=referer or default, status_code=303)


# ============================================================================
# WEB UI ROUTES (HTML) - SPA Mode
# ============================================================================

@app.get("/", response_class=HTMLResponse)
async def spa_index(request: Request):
    """Serve SPA entry point."""
    return templates.TemplateResponse("spa.html", {"request": request})


# Legacy routes kept for backward compatibility, but redirect to SPA
@app.get("/search", response_class=HTMLResponse)
async def search_page_legacy(request: Request):
    """Legacy search page - redirects to SPA."""
    return RedirectResponse(url="/", status_code=303)


@app.get("/notes", response_class=HTMLResponse)
async def notes_page_legacy(request: Request):
    """Legacy notes page - redirects to SPA."""
    return RedirectResponse(url="/#/notes", status_code=303)


@app.get("/todo/{todo_id}", response_class=HTMLResponse)
async def todo_detail_legacy(request: Request, todo_id: int):
    """Legacy todo detail page - redirects to SPA."""
    return RedirectResponse(url=f"/#/todo/{todo_id}", status_code=303)


# Legacy multi-page routes have been removed - SPA mode is now active
# The old templates (todos.html, notes.html, todo_detail.html) are kept for reference
# but are no longer served by the web server


# ============================================================================
# API ROUTES (JSON)
# ============================================================================

# Todo endpoints

@app.get("/api/todos", response_model=list[TodoWithChildren])
async def api_list_todos(db: Session = Depends(get_db)):
    """Get all todos in tree structure."""
    return crud.get_todo_tree(db)


@app.get("/api/todos/{todo_id}", response_model=TodoInDB)
async def api_get_todo(todo_id: int, db: Session = Depends(get_db)):
    """Get a specific todo."""
    todo = crud.get_todo(db, todo_id)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    return todo


@app.get("/api/todos/{todo_id}/detail", response_model=TodoDetail)
async def api_get_todo_detail(todo_id: int, db: Session = Depends(get_db)):
    """
    Get a specific todo with related entities for the SPA inspector:
    - notes
    - dependency prerequisites + dependents
    - dependency readiness status
    """
    todo = crud.get_todo(db, todo_id)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    prerequisites = crud.get_dependencies(db, todo_id)
    dependents = crud.get_dependents(db, todo_id)
    deps_met = crud.check_dependencies_met(db, todo_id)

    # Base todo fields/tags
    data = TodoInDB.model_validate(todo).model_dump()
    # Related collections
    data["notes"] = [NoteInDB.model_validate(n).model_dump() for n in getattr(todo, "notes", []) or []]
    data["dependencies"] = prerequisites
    data["dependents"] = dependents
    data["dependencies_met"] = bool(deps_met)
    return data


@app.post("/api/todos", response_model=TodoInDB)
async def api_create_todo(todo: TodoCreate, db: Session = Depends(get_db)):
    """Create a new todo."""
    return crud.create_todo(db, todo)


@app.post("/api/todos/form")
async def api_create_todo_form(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    category: str = Form("feature"),
    parent_id: Optional[int] = Form(None),
    topic: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),  # Comma-separated tag names
    db: Session = Depends(get_db)
):
    """Create a new todo from form data."""
    # Parse tags from comma-separated string
    tag_list = []
    if tags:
        tag_list = [t.strip() for t in tags.split(',') if t.strip()]
    
    todo_create = TodoCreate(
        title=title,
        description=description,
        category=TodoCategory(category),
        parent_id=parent_id,
        topic=topic if topic else None,
        tag_names=tag_list
    )
    crud.create_todo(db, todo_create)
    return RedirectResponse(url="/", status_code=303)


@app.put("/api/todos/{todo_id}", response_model=TodoInDB)
async def api_update_todo(
    todo_id: int,
    todo_update: TodoUpdate,
    db: Session = Depends(get_db)
):
    """Update a todo."""
    todo = crud.update_todo(db, todo_id, todo_update)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    return todo


@app.post("/api/todos/{todo_id}/update")
async def api_update_todo_form(
    todo_id: int,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    status: Optional[str] = Form(None),
    topic: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),  # Comma-separated tag names
    work_completed: Optional[str] = Form(None),
    work_remaining: Optional[str] = Form(None),
    implementation_issues: Optional[str] = Form(None),
    queue: Optional[str] = Form(None),
    task_size: Optional[str] = Form(None),
    priority_class: Optional[str] = Form(None),
    progress_summary: Optional[str] = Form(None),  # Legacy
    remaining_work: Optional[str] = Form(None),  # Legacy
    db: Session = Depends(get_db)
):
    """Update a todo from form data."""
    update_data = {}
    
    if title:
        update_data["title"] = title
    if description is not None:
        update_data["description"] = description
    if category:
        update_data["category"] = TodoCategory(category)
    if status:
        update_data["status"] = TodoStatus(status)
    if topic is not None:
        update_data["topic"] = topic if topic else None
    if tags is not None:
        # Parse tags from comma-separated string
        tag_list = [t.strip() for t in tags.split(',') if t.strip()]
        update_data["tag_names"] = tag_list
    # New progress tracking fields
    if work_completed is not None:
        update_data["work_completed"] = work_completed
    if work_remaining is not None:
        update_data["work_remaining"] = work_remaining
    if implementation_issues is not None:
        update_data["implementation_issues"] = implementation_issues

    # Execution & priority metadata
    if queue is not None:
        q = queue.strip()
        if q == "":
            update_data["queue"] = 0
        else:
            try:
                qv = int(q)
            except ValueError:
                raise HTTPException(status_code=400, detail="queue must be an integer")
            if qv < 0:
                raise HTTPException(status_code=400, detail="queue must be >= 0")
            update_data["queue"] = qv

    if task_size is not None:
        ts = task_size.strip()
        if ts == "":
            update_data["task_size"] = None
        else:
            try:
                tsv = int(ts)
            except ValueError:
                raise HTTPException(status_code=400, detail="task_size must be an integer (1-5)")
            if tsv < 1 or tsv > 5:
                raise HTTPException(status_code=400, detail="task_size must be between 1 and 5")
            update_data["task_size"] = tsv

    if priority_class is not None:
        pc = priority_class.strip().upper()
        if pc == "":
            update_data["priority_class"] = None
        else:
            if pc not in {"A", "B", "C", "D", "E"}:
                raise HTTPException(status_code=400, detail="priority_class must be one of A, B, C, D, E")
            update_data["priority_class"] = pc
    # Legacy fields (still supported for backwards compatibility)
    if progress_summary is not None:
        update_data["progress_summary"] = progress_summary
    if remaining_work is not None:
        update_data["remaining_work"] = remaining_work
    
    todo_update = TodoUpdate(**update_data)
    todo = crud.update_todo(db, todo_id, todo_update)
    
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    
    return RedirectResponse(url=f"/todo/{todo_id}", status_code=303)


# Queue endpoints (web UI helpers)

@app.post("/api/todos/{todo_id}/queue/add")
async def api_queue_add(request: Request, todo_id: int, db: Session = Depends(get_db)):
    todo = crud.add_to_queue(db, todo_id)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    return _redirect_back(request)


@app.post("/api/todos/{todo_id}/queue/remove")
async def api_queue_remove(request: Request, todo_id: int, db: Session = Depends(get_db)):
    todo = crud.remove_from_queue(db, todo_id)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    return _redirect_back(request)


@app.post("/api/todos/{todo_id}/queue/up")
async def api_queue_up(request: Request, todo_id: int, db: Session = Depends(get_db)):
    todo = crud.move_queue_up(db, todo_id)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    return _redirect_back(request)


@app.post("/api/todos/{todo_id}/queue/down")
async def api_queue_down(request: Request, todo_id: int, db: Session = Depends(get_db)):
    todo = crud.move_queue_down(db, todo_id)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    return _redirect_back(request)


@app.get("/api/queue", response_model=list[TodoInDB])
async def api_get_queued_todos(
    limit: Optional[int] = None,
    min_size: Optional[int] = None,
    max_size: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get all todos that are in the queue (queue > 0), sorted by queue value (ascending).
    Optionally filter by task_size range (min_size, max_size) and limit results.
    """
    # Validate min_size and max_size
    if min_size is not None and (min_size < 1 or min_size > 5):
        raise HTTPException(status_code=400, detail="min_size must be between 1 and 5")
    if max_size is not None and (max_size < 1 or max_size > 5):
        raise HTTPException(status_code=400, detail="max_size must be between 1 and 5")
    if min_size is not None and max_size is not None and min_size > max_size:
        raise HTTPException(status_code=400, detail="min_size must be <= max_size")
    
    todos = crud.get_queued_todos(db, limit=limit, min_size=min_size, max_size=max_size)
    return todos


@app.get("/api/queue/top/{count}", response_model=list[TodoInDB])
async def api_get_queue_top(
    count: int,
    min_size: Optional[int] = None,
    max_size: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get the top N todos in queue order. Convenience wrapper for getting the next X items in queue.
    Optionally filter by task_size range (min_size, max_size).
    """
    if count < 1:
        raise HTTPException(status_code=400, detail="count must be >= 1")
    
    # Validate min_size and max_size
    if min_size is not None and (min_size < 1 or min_size > 5):
        raise HTTPException(status_code=400, detail="min_size must be between 1 and 5")
    if max_size is not None and (max_size < 1 or max_size > 5):
        raise HTTPException(status_code=400, detail="max_size must be between 1 and 5")
    if min_size is not None and max_size is not None and min_size > max_size:
        raise HTTPException(status_code=400, detail="min_size must be <= max_size")
    
    todos = crud.get_queued_todos(db, limit=count, min_size=min_size, max_size=max_size)
    return todos


@app.delete("/api/todos/{todo_id}", response_model=MessageResponse)
async def api_delete_todo(todo_id: int, db: Session = Depends(get_db)):
    """Delete a todo."""
    success = crud.delete_todo(db, todo_id)
    if not success:
        raise HTTPException(status_code=404, detail="Todo not found")
    return MessageResponse(message="Todo deleted successfully")


@app.post("/api/todos/{todo_id}/delete")
async def api_delete_todo_form(todo_id: int, db: Session = Depends(get_db)):
    """Delete a todo from form submission."""
    success = crud.delete_todo(db, todo_id)
    if not success:
        raise HTTPException(status_code=404, detail="Todo not found")
    return RedirectResponse(url="/", status_code=303)


@app.post("/api/search", response_model=list[TodoInDB])
async def api_search_todos(search: TodoSearch, db: Session = Depends(get_db)):
    """Search/filter todos."""
    return crud.search_todos(db, search)


# Note endpoints

@app.get("/api/notes", response_model=list[NoteInDB])
async def api_list_notes(
    todo_id: Optional[int] = None,
    note_type: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all notes, optionally filtered by todo_id, note_type, and category."""
    try:
        return crud.get_notes(db, todo_id=todo_id, note_type=note_type, category=category, limit=1000)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/notes/{note_id}", response_model=NoteInDB)
async def api_get_note(note_id: int, db: Session = Depends(get_db)):
    """Get a specific note."""
    note = crud.get_note(db, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@app.post("/api/notes", response_model=NoteInDB)
async def api_create_note(note: NoteCreate, db: Session = Depends(get_db)):
    """Create a new note."""
    return crud.create_note(db, note)


@app.post("/api/notes/form")
async def api_create_note_form(
    content: str = Form(...),
    todo_id: Optional[int] = Form(None),
    category: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Create a new note from form data."""
    note_create = NoteCreate(content=content, todo_id=todo_id, category=category)
    crud.create_note(db, note_create)
    
    if todo_id:
        return RedirectResponse(url=f"/todo/{todo_id}", status_code=303)
    return RedirectResponse(url="/notes", status_code=303)


@app.delete("/api/notes/{note_id}", response_model=MessageResponse)
async def api_delete_note(note_id: int, db: Session = Depends(get_db)):
    """Delete a note."""
    success = crud.delete_note(db, note_id)
    if not success:
        raise HTTPException(status_code=404, detail="Note not found")
    return MessageResponse(message="Note deleted successfully")


@app.post("/api/notes/{note_id}/delete")
async def api_delete_note_form(note_id: int, db: Session = Depends(get_db)):
    """Delete a note from form submission."""
    note = crud.get_note(db, note_id)
    todo_id = note.todo_id if note else None
    
    success = crud.delete_note(db, note_id)
    if not success:
        raise HTTPException(status_code=404, detail="Note not found")
    
    if todo_id:
        return RedirectResponse(url=f"/todo/{todo_id}", status_code=303)
    return RedirectResponse(url="/notes", status_code=303)


# Dependency endpoints

@app.post("/api/dependencies")
async def api_create_dependency(
    todo_id: int = Form(...),
    depends_on_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """Create a dependency relationship."""
    try:
        dependency = crud.create_dependency(db, todo_id, depends_on_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not dependency:
        raise HTTPException(status_code=400, detail="Failed to create dependency (one or both todos not found)")
    return RedirectResponse(url=f"/todo/{todo_id}", status_code=303)


@app.post("/api/dependencies/json", response_model=DependencyInDB)
async def api_create_dependency_json(dep: DependencyCreate, db: Session = Depends(get_db)):
    """Create a dependency relationship (JSON, SPA-friendly)."""
    try:
        dependency = crud.create_dependency(db, dep.todo_id, dep.depends_on_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not dependency:
        raise HTTPException(status_code=400, detail="Failed to create dependency (one or both todos not found)")
    return dependency


@app.delete("/api/dependencies/{dependency_id}", response_model=MessageResponse)
async def api_delete_dependency(dependency_id: int, db: Session = Depends(get_db)):
    """Delete a dependency relationship (SPA-friendly)."""
    ok = crud.delete_dependency(db, dependency_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Dependency not found")
    return MessageResponse(message="Dependency deleted successfully")


# Export endpoints

@app.get("/api/export/json")
async def export_json(db: Session = Depends(get_db)):
    """Export entire database to JSON format."""
    # Get all data
    todos = crud.get_todos(db, limit=100000)
    notes = db.query(Note).all()
    dependencies = db.query(TodoDependency).all()
    
    # Build export structure
    export_data = {
        "export_date": datetime.utcnow().isoformat(),
        "database_path": get_db_path(),
        "todos": [
            {
                "id": todo.id,
                "title": todo.title,
                "description": todo.description,
                "category": todo.category.value,
                "status": todo.status.value,
                "parent_id": todo.parent_id,
                "topic": todo.topic,
                "tags": [tag.name for tag in todo.tags],
                "queue": getattr(todo, "queue", 0) or 0,
                "task_size": getattr(todo, "task_size", None),
                "priority_class": getattr(todo, "priority_class", None),
                "progress_summary": todo.progress_summary,
                "remaining_work": todo.remaining_work,
                "created_at": todo.created_at.isoformat(),
                "updated_at": todo.updated_at.isoformat(),
            }
            for todo in todos
        ],
        "notes": [
            {
                "id": note.id,
                "content": note.content,
                "todo_id": note.todo_id,
                "note_type": note.note_type.value if getattr(note, "note_type", None) else None,
                "category": getattr(note, "category", None),
                "created_at": note.created_at.isoformat(),
            }
            for note in notes
        ],
        "dependencies": [
            {
                "id": dep.id,
                "todo_id": dep.todo_id,
                "depends_on_id": dep.depends_on_id,
                "created_at": dep.created_at.isoformat(),
            }
            for dep in dependencies
        ],
    }
    
    # Create JSON string
    json_str = json.dumps(export_data, indent=2)
    
    # Generate filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"todotracker_export_{timestamp}.json"
    
    # Return as downloadable file
    return StreamingResponse(
        io.BytesIO(json_str.encode()),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@app.get("/api/export/csv")
async def export_csv(db: Session = Depends(get_db)):
    """Export todos to CSV format."""
    todos = crud.get_todos(db, limit=100000)
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        "ID", "Title", "Description", "Category", "Status", 
        "Topic", "Tags", "Parent ID", "Queue", "Task Size", "Priority Class", "Progress Summary", "Remaining Work",
        "Created At", "Updated At"
    ])
    
    # Write todos
    for todo in todos:
        writer.writerow([
            todo.id,
            todo.title,
            todo.description or "",
            todo.category.value,
            todo.status.value,
            todo.topic or "",
            ", ".join([tag.name for tag in todo.tags]) if todo.tags else "",
            todo.parent_id or "",
            getattr(todo, "queue", 0) or 0,
            getattr(todo, "task_size", "") if getattr(todo, "task_size", None) is not None else "",
            getattr(todo, "priority_class", "") if getattr(todo, "priority_class", None) is not None else "",
            todo.progress_summary or "",
            todo.remaining_work or "",
            todo.created_at.isoformat(),
            todo.updated_at.isoformat(),
        ])
    
    # Generate filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"todotracker_export_{timestamp}.csv"
    
    # Return as downloadable file
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@app.get("/api/tags")
async def api_list_tags(db: Session = Depends(get_db)):
    """Get all tags."""
    tags = crud.get_all_tags(db)
    return [{"name": tag.name, "description": tag.description} for tag in tags]


@app.get("/api/topics")
async def api_list_topics(db: Session = Depends(get_db)):
    """Get all unique topics."""
    return crud.get_all_topics(db)


@app.get("/api/health")
async def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint with version and compatibility information.
    Useful for monitoring and detecting migration needs.
    """
    from .version import __version__, SCHEMA_VERSION
    from .migrations import check_compatibility
    from .db import get_db_schema_version
    
    db_path = get_db_path()
    db_schema = get_db_schema_version(db)
    
    # Get compatibility status
    try:
        compat = check_compatibility(db_path)
        status = "ok"
        
        if compat["needs_migration"]:
            status = "needs_migration"
        elif compat["needs_upgrade"]:
            status = "incompatible"
    except Exception as e:
        status = "error"
        compat = {"error": str(e)}
    
    return {
        "status": status,
        "todotracker": {
            "version": __version__,
            "schema_version": SCHEMA_VERSION,
        },
        "database": {
            "path": db_path,
            "schema_version": db_schema,
            "needs_migration": compat.get("needs_migration", False),
            "needs_upgrade": compat.get("needs_upgrade", False),
        },
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/export/markdown")
async def export_markdown(db: Session = Depends(get_db)):
    """Export todos to Markdown format with hierarchy."""
    todos = crud.get_todo_tree(db)
    
    # Build markdown content
    lines = ["# TodoTracker Export\n"]
    lines.append(f"**Export Date:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}\n")
    lines.append(f"**Database:** {get_db_path()}\n")
    lines.append("\n---\n\n")
    
    def render_todo(todo, level=0):
        """Recursively render a todo and its children."""
        indent = "  " * level
        status_emoji = {
            "pending": "⏳",
            "in_progress": "🔄",
            "completed": "✅",
            "cancelled": "❌"
        }
        category_emoji = {
            "feature": "✨",
            "issue": "⚠️",
            "bug": "🐛"
        }
        
        emoji = f"{category_emoji.get(todo.category.value, '📌')} {status_emoji.get(todo.status.value, '❓')}"
        lines.append(f"{indent}- {emoji} **{todo.title}** [{todo.status.value}]\n")
        
        if todo.topic:
            lines.append(f"{indent}  - 📁 Topic: {todo.topic}\n")
        
        if todo.tags:
            tag_list = ", ".join([f"🏷️ {tag.name}" for tag in todo.tags])
            lines.append(f"{indent}  - Tags: {tag_list}\n")
        
        if todo.description:
            lines.append(f"{indent}  > {todo.description}\n")
        
        if todo.progress_summary:
            lines.append(f"{indent}  - 📊 Progress: {todo.progress_summary}\n")
        
        if todo.remaining_work:
            lines.append(f"{indent}  - 🔜 Remaining: {todo.remaining_work}\n")
        
        if todo.notes:
            for note in todo.notes:
                lines.append(f"{indent}  - 📝 Note: {note.content}\n")
        
        lines.append("\n")
        
        # Render children recursively
        for child in todo.children:
            render_todo(child, level + 1)
    
    # Render all root todos
    for todo in todos:
        render_todo(todo)
    
    markdown_content = "".join(lines)
    
    # Generate filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"todotracker_export_{timestamp}.md"
    
    # Return as downloadable file
    return StreamingResponse(
        io.BytesIO(markdown_content.encode()),
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ============================================================================
# STARTUP/SHUTDOWN
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup."""
    init_db()
    db_path = get_db_path()
    print("✓ Database initialized")
    print(f"✓ Using database: {db_path}")
    # Note: Port is displayed by todotracker_webserver.py, not here


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    print("✓ Web server shutting down")


# ============================================================================
# MAIN
# ============================================================================

def main():
    """Run the web server (deprecated - use todotracker_webserver.py instead)."""
    import sys
    print("⚠️  Warning: Running web_server.py directly is deprecated.")
    print("💡 Use 'python todotracker_webserver.py' instead for proper port management.")
    print("\nStarting on default port 8070...")
    
    uvicorn.run(
        "web_server:app",
        host="0.0.0.0",
        port=8070,
        reload=True,
        log_level="info"
    )


if __name__ == "__main__":
    main()

