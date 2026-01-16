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
# WEB UI ROUTES (HTML)
# ============================================================================

@app.get("/", response_class=HTMLResponse)
async def home(
    request: Request,
    status: Optional[str] = None,
    queued: Optional[bool] = None,
    sort_by: Optional[str] = None,
    sort_dir: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Home page showing todo tree, optionally filtered by status. Defaults to 'pending'."""
    todos = crud.get_todo_tree(db)
    
    # Default to 'pending' if no status is provided
    if status is None:
        status = "pending"
    
    # Filter by status if provided (skip if status is 'all')
    if status and status != "all":
        try:
            status_enum = TodoStatus(status)
            # Filter todos recursively to only show those matching the status
            def filter_by_status(todo_list):
                filtered = []
                for todo in todo_list:
                    if todo.status == status_enum:
                        # Create a copy with filtered children
                        filtered_todo = todo
                        if todo.children:
                            filtered_todo.children = filter_by_status(todo.children)
                        filtered.append(filtered_todo)
                    else:
                        # Check children even if parent doesn't match
                        if todo.children:
                            filtered_children = filter_by_status(todo.children)
                            if filtered_children:
                                # Create a copy with filtered children
                                filtered_todo = todo
                                filtered_todo.children = filtered_children
                                filtered.append(filtered_todo)
                return filtered
            todos = filter_by_status(todos)
        except ValueError:
            # Invalid status, ignore filter
            pass

    # Optional queue-only filter
    if queued is True:
        def filter_in_queue(todo_list):
            filtered = []
            for todo in todo_list:
                if (getattr(todo, "queue", 0) or 0) > 0:
                    filtered_todo = todo
                    if todo.children:
                        filtered_todo.children = filter_in_queue(todo.children)
                    filtered.append(filtered_todo)
                else:
                    if todo.children:
                        filtered_children = filter_in_queue(todo.children)
                        if filtered_children:
                            filtered_todo = todo
                            filtered_todo.children = filtered_children
                            filtered.append(filtered_todo)
            return filtered
        todos = filter_in_queue(todos)

    # Sort (within each sibling group) while preserving hierarchy.
    # Supported: activity/updated_at/created_at/title/status/category/queue/task_size/priority_class, asc / desc.
    sort_by_norm = (sort_by or "").strip().lower()
    sort_dir_norm = (sort_dir or "").strip().lower()

    sort_field_map = {
        "activity": "activity",
        "created": "created_at",
        "created_at": "created_at",
        "updated": "updated_at",
        "updated_at": "updated_at",
        "title": "title",
        "status": "status",
        "category": "category",
        "queue": "queue",
        "task_size": "task_size",
        "priority": "priority_class",
        "priority_class": "priority_class",
    }
    sort_field = sort_field_map.get(sort_by_norm, "updated_at")
    reverse = sort_dir_norm != "asc"  # default to desc

    status_order = {
        TodoStatus.PENDING: 0,
        TodoStatus.IN_PROGRESS: 1,
        TodoStatus.COMPLETED: 2,
        TodoStatus.CANCELLED: 3,
    }
    category_order = {
        TodoCategory.FEATURE: 0,
        TodoCategory.ISSUE: 1,
        TodoCategory.BUG: 2,
    }
    priority_order = {"A": 0, "B": 1, "C": 2, "D": 3, "E": 4}

    def _get_status_value(todo_obj):
        st = getattr(todo_obj, "status", None)
        # could be enum or str (defensive)
        if isinstance(st, TodoStatus):
            return st
        try:
            return TodoStatus(str(st))
        except Exception:
            return None

    def _get_category_value(todo_obj):
        cat = getattr(todo_obj, "category", None)
        if isinstance(cat, TodoCategory):
            return cat
        try:
            return TodoCategory(str(cat))
        except Exception:
            return None

    def _sort_key(todo_obj):
        """
        Return a tuple that sorts consistently and keeps 'None' values last where it makes sense.
        Always ends with id as a stable tie-breaker.
        """
        tid = getattr(todo_obj, "id", 0) or 0

        if sort_field == "activity":
            # Updated first, but if updated is missing use created.
            u = getattr(todo_obj, "updated_at", None)
            c = getattr(todo_obj, "created_at", None)
            primary = u or c
            secondary = c or u
            return (primary, secondary, tid)

        if sort_field in {"created_at", "updated_at"}:
            primary = getattr(todo_obj, sort_field, None)
            secondary = getattr(todo_obj, "created_at" if sort_field == "updated_at" else "updated_at", None)
            return (primary, secondary, tid)

        if sort_field == "title":
            title = (getattr(todo_obj, "title", "") or "").lower()
            return (title, tid)

        if sort_field == "status":
            st = _get_status_value(todo_obj)
            ordv = status_order.get(st, 999)
            return (ordv, tid)

        if sort_field == "category":
            cat = _get_category_value(todo_obj)
            ordv = category_order.get(cat, 999)
            return (ordv, tid)

        if sort_field == "priority_class":
            pc = (getattr(todo_obj, "priority_class", None) or "").strip().upper()
            if pc == "":
                return (1, 999, tid)  # missing last
            return (0, priority_order.get(pc, 998), tid)

        if sort_field == "task_size":
            ts = getattr(todo_obj, "task_size", None)
            if ts is None:
                return (1, 999, tid)  # missing last
            return (0, int(ts), tid)

        if sort_field == "queue":
            qv = getattr(todo_obj, "queue", 0) or 0
            # Keep "not queued" last regardless of direction; within queued, sort by queue value.
            if qv <= 0:
                return (1, 999999, tid)
            return (0, int(qv), tid)

        # Fallback: sort by id
        return (tid,)

    def sort_tree(todo_list):
        if not todo_list:
            return todo_list
        try:
            todo_list.sort(key=_sort_key, reverse=reverse)
        except Exception:
            # Defensive: never break the page due to unexpected datetime types.
            todo_list.sort(key=lambda t: getattr(t, "id", 0) or 0, reverse=False)
        for t in todo_list:
            children = getattr(t, "children", None)
            if children:
                sort_tree(children)
        return todo_list

    todos = sort_tree(todos)
    
    # Calculate statistics (always show all todos for stats)
    all_todos = crud.get_todos(db, limit=10000)
    max_queue = crud.get_max_queue(db)
    stats = {
        "total": len(all_todos),
        "pending": sum(1 for t in all_todos if t.status == TodoStatus.PENDING),
        "in_progress": sum(1 for t in all_todos if t.status == TodoStatus.IN_PROGRESS),
        "completed": sum(1 for t in all_todos if t.status == TodoStatus.COMPLETED),
        "queued": sum(1 for t in all_todos if (getattr(t, "queue", 0) or 0) > 0),
    }
    
    return templates.TemplateResponse(
        "todos.html",
        {
            "request": request,
            "todos": todos,
            "stats": stats,
            "categories": [c.value for c in TodoCategory],
            "statuses": [s.value for s in TodoStatus],
            "current_status_filter": status,
            "queued_filter": queued,
            "max_queue": max_queue,
            "current_sort_by": sort_field,
            "current_sort_dir": "asc" if not reverse else "desc",
        }
    )


@app.get("/search", response_class=HTMLResponse)
async def search_page(
    request: Request,
    q: Optional[str] = None,
    status: Optional[str] = None,
    queued: Optional[bool] = None,
    sort_by: Optional[str] = None,
    sort_dir: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Search results page showing todos matching the query."""
    if not q or not q.strip():
        # No search query, redirect to home
        return RedirectResponse(url="/", status_code=303)
    
    # Create search object
    search = TodoSearch(query=q.strip())
    
    # Apply status filter if provided
    if status and status != "all":
        try:
            search.status = TodoStatus(status)
        except ValueError:
            pass
    
    # Apply queue filter if provided
    if queued is True:
        search.in_queue = True
    elif queued is False:
        search.in_queue = False
    
    # Perform search
    search_results = crud.search_todos(db, search)
    
    # Build tree structure from search results (preserve parent-child relationships)
    def build_tree_from_results(results):
        """Build a tree structure from flat search results."""
        # Create a map of all todos
        todo_map = {todo.id: todo for todo in results}
        
        # Find root todos (no parent or parent not in results)
        root_todos = []
        for todo in results:
            if todo.parent_id is None or todo.parent_id not in todo_map:
                root_todos.append(todo)
            else:
                # Add to parent's children if parent is in results
                parent = todo_map.get(todo.parent_id)
                if parent:
                    if not hasattr(parent, 'children') or parent.children is None:
                        parent.children = []
                    parent.children.append(todo)
        
        return root_todos
    
    todos = build_tree_from_results(search_results)
    
    # Sort (reuse sorting logic from home route)
    sort_by_norm = (sort_by or "").strip().lower()
    sort_dir_norm = (sort_dir or "").strip().lower()
    
    sort_field_map = {
        "activity": "activity",
        "created": "created_at",
        "created_at": "created_at",
        "updated": "updated_at",
        "updated_at": "updated_at",
        "title": "title",
        "status": "status",
        "category": "category",
        "queue": "queue",
        "priority_class": "priority_class",
        "task_size": "task_size",
    }
    sort_field = sort_field_map.get(sort_by_norm, "activity")
    reverse = sort_dir_norm != "asc"
    
    # Reuse sorting logic from home route
    status_order = {TodoStatus.PENDING: 0, TodoStatus.IN_PROGRESS: 1, TodoStatus.COMPLETED: 2, TodoStatus.CANCELLED: 3}
    category_order = {TodoCategory.FEATURE: 0, TodoCategory.ISSUE: 1, TodoCategory.BUG: 2}
    priority_order = {"A": 0, "B": 1, "C": 2, "D": 3, "E": 4}
    
    def _get_status_value(todo_obj):
        st = getattr(todo_obj, "status", None)
        if isinstance(st, TodoStatus):
            return st.value
        return str(st) if st else ""
    
    def _get_category_value(todo_obj):
        cat = getattr(todo_obj, "category", None)
        if isinstance(cat, TodoCategory):
            return cat.value
        try:
            return TodoCategory(str(cat))
        except Exception:
            return None
    
    def _sort_key(todo_obj):
        tid = getattr(todo_obj, "id", 0) or 0
        if sort_field == "activity":
            u = getattr(todo_obj, "updated_at", None)
            c = getattr(todo_obj, "created_at", None)
            primary = u or c
            secondary = c or u
            return (primary, secondary, tid)
        if sort_field in {"created_at", "updated_at"}:
            primary = getattr(todo_obj, sort_field, None)
            secondary = getattr(todo_obj, "created_at" if sort_field == "updated_at" else "updated_at", None)
            return (primary, secondary, tid)
        if sort_field == "title":
            title = (getattr(todo_obj, "title", "") or "").lower()
            return (title, tid)
        if sort_field == "status":
            st = _get_status_value(todo_obj)
            ordv = status_order.get(st, 999)
            return (ordv, tid)
        if sort_field == "category":
            cat = _get_category_value(todo_obj)
            ordv = category_order.get(cat, 999)
            return (ordv, tid)
        if sort_field == "priority_class":
            pc = (getattr(todo_obj, "priority_class", None) or "").strip().upper()
            if pc == "":
                return (1, 999, tid)
            return (0, priority_order.get(pc, 998), tid)
        if sort_field == "task_size":
            ts = getattr(todo_obj, "task_size", None)
            if ts is None:
                return (1, 999, tid)
            return (0, int(ts), tid)
        if sort_field == "queue":
            qv = getattr(todo_obj, "queue", 0) or 0
            if qv <= 0:
                return (1, 999999, tid)
            return (0, int(qv), tid)
        return (tid,)
    
    def sort_tree(todo_list):
        if not todo_list:
            return todo_list
        try:
            todo_list.sort(key=_sort_key, reverse=reverse)
        except Exception:
            todo_list.sort(key=lambda t: getattr(t, "id", 0) or 0, reverse=False)
        for t in todo_list:
            children = getattr(t, "children", None)
            if children:
                sort_tree(children)
        return todo_list
    
    todos = sort_tree(todos)
    
    # Calculate statistics
    all_todos = crud.get_todos(db, limit=10000)
    max_queue = crud.get_max_queue(db)
    stats = {
        "total": len(all_todos),
        "pending": sum(1 for t in all_todos if t.status == TodoStatus.PENDING),
        "in_progress": sum(1 for t in all_todos if t.status == TodoStatus.IN_PROGRESS),
        "completed": sum(1 for t in all_todos if t.status == TodoStatus.COMPLETED),
        "queued": sum(1 for t in all_todos if (getattr(t, "queue", 0) or 0) > 0),
    }
    
    return templates.TemplateResponse(
        "todos.html",
        {
            "request": request,
            "todos": todos,
            "stats": stats,
            "categories": [c.value for c in TodoCategory],
            "statuses": [s.value for s in TodoStatus],
            "current_status_filter": status or "all",
            "queued_filter": queued,
            "max_queue": max_queue,
            "current_sort_by": sort_field,
            "current_sort_dir": "asc" if not reverse else "desc",
            "search_query": q,
            "is_search_page": True,
        }
    )


@app.get("/notes", response_class=HTMLResponse)
async def notes_page(request: Request, db: Session = Depends(get_db)):
    """Notes page showing all notes."""
    notes = crud.get_notes(db, limit=1000)
    return templates.TemplateResponse(
        "notes.html",
        {
            "request": request,
            "notes": notes,
        }
    )


@app.get("/todo/{todo_id}", response_class=HTMLResponse)
async def todo_detail(request: Request, todo_id: int, db: Session = Depends(get_db)):
    """Detail view for a specific todo."""
    todo = crud.get_todo(db, todo_id)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    
    return templates.TemplateResponse(
        "todo_detail.html",
        {
            "request": request,
            "todo": todo,
            "categories": [c.value for c in TodoCategory],
            "statuses": [s.value for s in TodoStatus],
        }
    )


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
    db: Session = Depends(get_db)
):
    """Get all notes, optionally filtered by todo_id."""
    return crud.get_notes(db, todo_id=todo_id, limit=1000)


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
    db: Session = Depends(get_db)
):
    """Create a new note from form data."""
    note_create = NoteCreate(content=content, todo_id=todo_id)
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
    dependency = crud.create_dependency(db, todo_id, depends_on_id)
    if not dependency:
        raise HTTPException(status_code=400, detail="Failed to create dependency")
    return RedirectResponse(url=f"/todo/{todo_id}", status_code=303)


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

