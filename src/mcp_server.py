"""
MCP (Model Context Protocol) Server for TodoTracker.
Exposes tools and resources for AI agents to interact with the todo system.
Prefers an explicit project root/DB path over process working directory.
"""

import asyncio
import json
import sys
import os
from pathlib import Path
from typing import Any, Optional
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import (
    Tool,
    TextContent,
    ImageContent,
    EmbeddedResource,
    INTERNAL_ERROR,
)
from pydantic import ValidationError

from .db import init_db, SessionLocal, TodoCategory, TodoStatus, TodoDependency, get_db_path
from .project_config import ProjectConfig, find_project_config
from .schemas import TodoCreate, TodoUpdate, NoteCreate, NoteUpdate, TodoSearch
from . import crud


def _todotracker_install_root() -> Path:
    """Absolute path to the TodoTracker installation (repo) root."""
    return Path(__file__).resolve().parent.parent


def _common_project_context_schema() -> dict:
    # Allow the client/agent to specify the intended project on each tool call.
    # This enables per-project databases even if the server's cwd/env is sandboxed.
    return {
        "project_root": {
            "type": "string",
            "description": "Absolute path to the target project's root directory. If provided, this call will use <project_root>/.todos/project.db",
        },
        "todos_dir": {
            "type": "string",
            "description": "Absolute path to the target project's .todos directory. If provided, this call will use <todos_dir>/project.db",
        },
        "db_path": {
            "type": "string",
            "description": "Absolute path to the target project's database file (usually <project_root>/.todos/project.db). If provided, this call will use it directly.",
        },
    }


def _with_project_context_schema(schema: dict) -> dict:
    props = dict(schema.get("properties", {}) or {})
    props.update(_common_project_context_schema())
    out = dict(schema)
    out["properties"] = props
    return out


def _resolve_db_path_from_arguments(arguments: Any) -> Optional[str]:
    """
    Resolve an explicit db_path for this tool call, if provided.
    Priority:
      1) arguments.db_path
      2) arguments.todos_dir + "/project.db"
      3) arguments.project_root + "/.todos/project.db"
    """
    if not isinstance(arguments, dict):
        return None

    raw_db = arguments.get("db_path")
    if raw_db:
        try:
            return str(Path(raw_db).expanduser().resolve())
        except Exception:
            return None

    raw_todos_dir = arguments.get("todos_dir")
    if raw_todos_dir:
        try:
            return str((Path(raw_todos_dir).expanduser().resolve() / "project.db"))
        except Exception:
            return None

    raw_root = arguments.get("project_root")
    if raw_root:
        try:
            return str((Path(raw_root).expanduser().resolve() / ".todos" / "project.db"))
        except Exception:
            return None

    return None


def _get_project_root() -> Optional[Path]:
    """
    Determine the intended *project root* for this MCP server.

    Priority:
    1) TODOTRACKER_PROJECT_ROOT (explicit, recommended)
    2) Infer from TODOTRACKER_DB_PATH if it points to <project>/.todos/project.db
    3) Infer from argv[1] if it looks like <project>/.todos/project.db
    """
    env_root = os.environ.get("TODOTRACKER_PROJECT_ROOT")
    if env_root:
        try:
            return Path(env_root).expanduser().resolve()
        except Exception:
            return None

    env_db = os.environ.get("TODOTRACKER_DB_PATH")
    if env_db:
        try:
            p = Path(env_db).expanduser().resolve()
            if p.name == "project.db" and p.parent.name == ".todos":
                return p.parent.parent
        except Exception:
            pass

    if len(sys.argv) > 1:
        try:
            p = Path(sys.argv[1]).expanduser().resolve()
            if p.name == "project.db" and p.parent.name == ".todos":
                return p.parent.parent
        except Exception:
            pass

    return None


def find_project_database(start_path: Optional[str] = None) -> Optional[str]:
    """
    Find the project's .todos/project.db by walking up from the start path.
    Returns the absolute path to the database or None if not found.
    """
    if start_path is None:
        # Prefer an explicit project root over process cwd (cwd may be the TodoTracker install dir).
        project_root = _get_project_root()
        start_path = str(project_root) if project_root else os.getcwd()
    
    current = Path(start_path).resolve()
    
    # Walk up the directory tree looking for .todos/project.db
    for parent in [current] + list(current.parents):
        db_path = parent / ".todos" / "project.db"
        if db_path.exists():
            return str(db_path)
    
    return None


# Initialize the MCP server
app = Server("todotracker")

def _subtasks_enabled_for_db_path(db_path: Optional[str]) -> bool:
    """
    Feature flag read from <project_root>/.todos/config.json.
    Defaults to enabled if missing/invalid.
    """
    try:
        if not db_path:
            return True
        p = Path(str(db_path)).expanduser().resolve()
        project_root: Optional[Path] = None
        if p.name == "project.db" and p.parent.name == ".todos":
            project_root = p.parent.parent
        # Fallback: locate .todos/config.json by walking up from the DB directory.
        if project_root is None:
            pc = find_project_config(p.parent)
            if pc:
                project_root = pc.project_root
        if project_root is None:
            return True
        cfg = ProjectConfig(project_root).load_config()
        if not isinstance(cfg, dict):
            return True
        features = cfg.get("features")
        if not isinstance(features, dict):
            return True
        return bool(features.get("subtasks_enabled", True))
    except Exception:
        return True

def _subtasks_enabled_for_call(arguments: Any) -> bool:
    override_db_path = _resolve_db_path_from_arguments(arguments) if isinstance(arguments, dict) else None
    if override_db_path:
        return _subtasks_enabled_for_db_path(override_db_path)
    try:
        return _subtasks_enabled_for_db_path(get_db_path())
    except Exception:
        return True


def get_db_session():
    """Helper to get a database session."""
    return SessionLocal()


# ============================================================================
# TOOLS (Functions AI can call)
# ============================================================================

@app.list_tools()
async def list_tools() -> list[Tool]:
    """List all available tools for the AI."""
    subtasks_enabled = _subtasks_enabled_for_call({})
    return [
        Tool(
            name="list_todos",
            description="Get hierarchical list of all todos. Returns the complete todo tree with nested children.",
            inputSchema=_with_project_context_schema({
                "type": "object",
                "properties": {
                    "include_dependencies": {
                        "type": "boolean",
                        "description": "If true, include dependency relationships (prerequisites + dependents) for each todo.",
                        "default": False,
                    },
                    "include_dependency_status": {
                        "type": "boolean",
                        "description": "If true, include computed dependency readiness status (ready/blocked) for each todo.",
                        "default": False,
                    },
                },
            }),
        ),
        Tool(
            name="get_todo",
            description="""Get detailed information about a specific todo by ID, including all children and notes.
            
Note: If you're starting work on this todo, use update_todo to set status='in_progress' and update 
work_completed/work_remaining/implementation_issues fields to track your progress.""",
            inputSchema=_with_project_context_schema({
                "type": "object",
                "properties": {
                    "todo_id": {
                        "type": "integer",
                        "description": "The ID of the todo to retrieve",
                    },
                    "include_dependencies": {
                        "type": "boolean",
                        "description": "If true, include dependency relationships (prerequisites + dependents).",
                        "default": False,
                    },
                    "include_dependency_status": {
                        "type": "boolean",
                        "description": "If true, include computed dependency readiness status (ready/blocked).",
                        "default": False,
                    },
                },
                "required": ["todo_id"],
            }),
        ),
        Tool(
            name="get_todos_batch",
            description="""Get detailed information about multiple todos by ID in one call.
            
Note: If you're starting work on any returned todo, use update_todo to set status='in_progress' and 
update work_completed/work_remaining/implementation_issues fields to track your progress.""",
            inputSchema=_with_project_context_schema({
                "type": "object",
                "properties": {
                    "todo_ids": {
                        "type": "array",
                        "items": {"type": "integer"},
                        "minItems": 1,
                        "description": "The todo IDs to retrieve",
                    },
                    "include_dependencies": {
                        "type": "boolean",
                        "description": "If true, include dependency relationships (prerequisites + dependents).",
                        "default": False,
                    },
                    "include_dependency_status": {
                        "type": "boolean",
                        "description": "If true, include computed dependency readiness status (ready/blocked).",
                        "default": False,
                    },
                },
                "required": ["todo_ids"],
            }),
        ),
        Tool(
            name="create_todo",
            description=(
                "Create a new todo (top-level) or subtask (child todo). "
                "To create a subtask, set parent_id to the parent todo ID. "
                "Subtasks are first-class todos (can be long, have notes/deps/queue/etc.) and are intended for breaking down work "
                "without cluttering the top-level listing (the web UI renders them nested under their parent). "
                "You can optionally include progress tracking fields to document initial plans."
            ) if subtasks_enabled else (
                "Create a new todo (top-level). NOTE: Subtasks are disabled for this project "
                "(project config features.subtasks_enabled=false), so parent_id must be omitted."
            ),
            inputSchema=_with_project_context_schema({
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "The title of the todo",
                    },
                    "description": {
                        "type": "string",
                        "description": "Detailed description of the todo",
                    },
                    "category": {
                        "type": "string",
                        "enum": ["feature", "issue", "bug"],
                        "description": "Category: 'feature' for features/functionality (major or minor), 'issue' for problems to address, 'bug' for defects",
                        "default": "feature",
                    },
                    "parent_id": {
                        "type": "integer",
                        "description": "Parent todo ID. If set, this todo is a subtask and will appear nested under its parent in the UI.",
                    },
                    "topic": {
                        "type": "string",
                        "description": "Optional topic/theme for grouping related todos (e.g., 'window layout', 'authentication')",
                    },
                    "tags": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Optional list of tags for categorization (e.g., ['ui', 'frontend', 'urgent'])",
                    },
                    "work_completed": {
                        "type": "string",
                        "description": "PROGRESS TRACKING: What has been done so far (optional at creation)",
                    },
                    "work_remaining": {
                        "type": "string",
                        "description": "PROGRESS TRACKING: What still needs to be done (optional at creation, useful for planning)",
                    },
                    "implementation_issues": {
                        "type": "string",
                        "description": "PROGRESS TRACKING: Known problems, blockers, or concerns (optional)",
                    },
                    "queue": {
                        "type": "integer",
                        "description": "Execution queue position. 0 means not in queue. Lower numbers execute first.",
                        "minimum": 0,
                        "default": 0,
                    },
                    "task_size": {
                        "type": "integer",
                        "description": "Optional task size (effort) on a 1-5 scale",
                        "minimum": 1,
                        "maximum": 5,
                    },
                    "priority_class": {
                        "type": "string",
                        "description": "Optional priority class (A-E)",
                    },
                    "completion_percentage": {
                        "type": "integer",
                        "description": "Optional numeric completion percentage (0-100).",
                        "minimum": 0,
                        "maximum": 100,
                    },
                    "ai_instructions": {
                        "type": "object",
                        "description": "Optional AI instruction flags (JSON object), e.g. {\"research_on_web\": true}.",
                    },
                },
                "required": ["title"],
            }),
        ),
        Tool(
            name="create_todos_batch",
            description=(
                "Create multiple todos/subtasks in one call. Each item uses the same fields as create_todo. "
                "Best practice: when you are breaking down a larger task, create subtasks by setting parent_id "
                "so they remain nested under the parent in the UI."
            ),
            inputSchema=_with_project_context_schema({
                "type": "object",
                "properties": {
                    "todos": {
                        "type": "array",
                        "minItems": 1,
                        "items": {
                            "type": "object",
                            "properties": {
                                "title": {"type": "string", "description": "The title of the todo"},
                                "description": {"type": "string", "description": "Detailed description of the todo"},
                                "category": {
                                    "type": "string",
                                    "enum": ["feature", "issue", "bug"],
                                    "description": "Category",
                                    "default": "feature",
                                },
                                "parent_id": {"type": "integer", "description": "Parent todo ID. If set, this todo is a subtask and will appear nested under its parent in the UI."},
                                "topic": {"type": "string", "description": "Optional topic/theme"},
                                "tags": {"type": "array", "items": {"type": "string"}, "description": "Optional list of tags"},
                                "depends_on_id": {
                                    "type": "integer",
                                    "description": "Optional: create a dependency so the new todo depends on this existing todo ID.",
                                },
                                "work_completed": {"type": "string", "description": "PROGRESS TRACKING: What has been done so far"},
                                "work_remaining": {"type": "string", "description": "PROGRESS TRACKING: What still needs to be done"},
                                "implementation_issues": {"type": "string", "description": "PROGRESS TRACKING: Known problems, blockers, or concerns"},
                                "queue": {"type": "integer", "description": "Execution queue position. 0 means not in queue.", "minimum": 0, "default": 0},
                                "task_size": {"type": "integer", "description": "Optional task size (1-5)", "minimum": 1, "maximum": 5},
                                "priority_class": {"type": "string", "description": "Optional priority class (A-E)"},
                                "completion_percentage": {"type": "integer", "description": "Optional numeric completion percentage (0-100).", "minimum": 0, "maximum": 100},
                                "ai_instructions": {"type": "object", "description": "Optional AI instruction flags (JSON object)"},
                            },
                            "required": ["title"],
                        },
                    }
                },
                "required": ["todos"],
            }),
        ),
        Tool(
            name="add_concern",
            description="Add a concern under an existing todo. Concerns are prefixed with '[Concern]' and categorized as issues.",
            inputSchema=_with_project_context_schema({
                "type": "object",
                "properties": {
                    "parent_id": {
                        "type": "integer",
                        "description": "The parent todo ID to attach the concern to",
                    },
                    "title": {
                        "type": "string",
                        "description": "Title of the concern",
                    },
                    "description": {
                        "type": "string",
                        "description": "Detailed description of the concern",
                    },
                },
                "required": ["parent_id", "title", "description"],
            }),
        ),
        Tool(
            name="update_concern",
            description="Update a concern's title or description. The '[Concern]' prefix will be maintained automatically.",
            inputSchema=_with_project_context_schema({
                "type": "object",
                "properties": {
                    "todo_id": {
                        "type": "integer",
                        "description": "The ID of the concern to update",
                    },
                    "title": {
                        "type": "string",
                        "description": "New title for the concern (prefix will be added if not present)",
                    },
                    "description": {
                        "type": "string",
                        "description": "New description for the concern",
                    },
                    "status": {
                        "type": "string",
                        "enum": ["pending", "in_progress", "completed", "cancelled"],
                        "description": "New status",
                    },
                },
                "required": ["todo_id"],
            }),
        ),
        Tool(
            name="delete_concern",
            description="Delete a concern. This is the same as deleting a todo but more explicit for concerns.",
            inputSchema=_with_project_context_schema({
                "type": "object",
                "properties": {
                    "todo_id": {
                        "type": "integer",
                        "description": "The ID of the concern to delete",
                    },
                },
                "required": ["todo_id"],
            }),
        ),
        Tool(
            name="delete_todo",
            description="Delete a todo and all its children (cascades). Use with caution.",
            inputSchema=_with_project_context_schema({
                "type": "object",
                "properties": {
                    "todo_id": {
                        "type": "integer",
                        "description": "The ID of the todo to delete",
                    },
                },
                "required": ["todo_id"],
            }),
        ),
        Tool(
            name="update_todo",
            description="""Update a todo's status, progress, topic, tags, or other fields. 
            
            CRITICAL - PROGRESS TRACKING: When working on ANY task, you MUST update the three progress tracking fields:
            1. work_completed: Log what you have accomplished (append to previous entries)
            2. work_remaining: Update what still needs to be done
            3. implementation_issues: Document any problems, blockers, or concerns encountered
            
            These fields allow you (and other AI instances) to revisit tasks later with full context of what has been done, 
            what remains, and what issues were encountered. Update these fields EVERY TIME you work on a task.""",
            inputSchema=_with_project_context_schema({
                "type": "object",
                "properties": {
                    "todo_id": {
                        "type": "integer",
                        "description": "The ID of the todo to update",
                    },
                    "title": {
                        "type": "string",
                        "description": "New title",
                    },
                    "description": {
                        "type": "string",
                        "description": "New description",
                    },
                    "status": {
                        "type": "string",
                        "enum": ["pending", "in_progress", "completed", "cancelled"],
                        "description": "New status",
                    },
                    "topic": {
                        "type": "string",
                        "description": "Topic/theme for grouping",
                    },
                    "tags": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of tag names",
                    },
                    "work_completed": {
                        "type": "string",
                        "description": "PROGRESS FIELD 1: What has been done on this task. Update this every time you work on the task. Be specific and detailed.",
                    },
                    "work_remaining": {
                        "type": "string",
                        "description": "PROGRESS FIELD 2: What still needs to be done. Update this to reflect current state. Empty string or 'None' if task is complete.",
                    },
                    "implementation_issues": {
                        "type": "string",
                        "description": "PROGRESS FIELD 3: Problems, blockers, or concerns encountered. Document any difficulties, edge cases, or decisions that need to be made.",
                    },
                    "progress_summary": {
                        "type": "string",
                        "description": "DEPRECATED: Use work_completed instead",
                    },
                    "remaining_work": {
                        "type": "string",
                        "description": "DEPRECATED: Use work_remaining instead",
                    },
                    "category": {
                        "type": "string",
                        "enum": ["feature", "issue", "bug"],
                        "description": "New category: 'feature' for features/functionality, 'issue' for problems, 'bug' for defects",
                    },
                    "queue": {
                        "type": "integer",
                        "description": "Execution queue position. 0 means not in queue. Lower numbers execute first.",
                        "minimum": 0,
                    },
                    "task_size": {
                        "type": "integer",
                        "description": "Optional task size (1-5)",
                        "minimum": 1,
                        "maximum": 5,
                    },
                    "priority_class": {
                        "type": "string",
                        "description": "Optional priority class (A-E)",
                    },
                    "completion_percentage": {
                        "type": "integer",
                        "description": "Optional numeric completion percentage (0-100).",
                        "minimum": 0,
                        "maximum": 100,
                    },
                    "ai_instructions": {
                        "type": "object",
                        "description": "Optional AI instruction flags (JSON object), e.g. {\"research_on_web\": true}.",
                    },
                },
                "required": ["todo_id"],
            }),
        ),
        Tool(
            name="update_todos_batch",
            description="Update multiple todos in one call. Each item matches update_todo fields, plus required todo_id.",
            inputSchema=_with_project_context_schema({
                "type": "object",
                "properties": {
                    "todos": {
                        "type": "array",
                        "minItems": 1,
                        "items": {
                            "type": "object",
                            "properties": {
                                "todo_id": {"type": "integer", "description": "The ID of the todo to update"},
                                "title": {"type": "string", "description": "New title"},
                                "description": {"type": "string", "description": "New description"},
                                "status": {"type": "string", "enum": ["pending", "in_progress", "completed", "cancelled"]},
                                "topic": {"type": "string", "description": "Topic/theme for grouping"},
                                "tags": {"type": "array", "items": {"type": "string"}, "description": "List of tag names"},
                                "work_completed": {"type": "string", "description": "PROGRESS FIELD 1"},
                                "work_remaining": {"type": "string", "description": "PROGRESS FIELD 2"},
                                "implementation_issues": {"type": "string", "description": "PROGRESS FIELD 3"},
                                "progress_summary": {"type": "string", "description": "DEPRECATED: Use work_completed instead"},
                                "remaining_work": {"type": "string", "description": "DEPRECATED: Use work_remaining instead"},
                                "category": {"type": "string", "enum": ["feature", "issue", "bug"], "description": "New category"},
                                "queue": {"type": "integer", "description": "Execution queue position. 0 means not in queue.", "minimum": 0},
                                "task_size": {"type": "integer", "description": "Optional task size (1-5)", "minimum": 1, "maximum": 5},
                                "priority_class": {"type": "string", "description": "Optional priority class (A-E)"},
                                "completion_percentage": {"type": "integer", "description": "Optional numeric completion percentage (0-100).", "minimum": 0, "maximum": 100},
                                "ai_instructions": {"type": "object", "description": "Optional AI instruction flags (JSON object)"},
                            },
                            "required": ["todo_id"],
                        },
                    }
                },
                "required": ["todos"],
            }),
        ),
        Tool(
            name="execute_queue_next",
            description="""Get (and optionally mark in progress) the next N todos in queue order (queue > 0, ascending).
            
IMPORTANT: When starting work on a returned todo, call update_todo to update progress tracking fields 
(work_completed, work_remaining, implementation_issues) to maintain context for future sessions.""",
            inputSchema=_with_project_context_schema({
                "type": "object",
                "properties": {
                    "count": {
                        "type": "integer",
                        "description": "How many queued items to fetch (in queue order).",
                        "minimum": 1,
                        "default": 1,
                    },
                    "mark_in_progress": {
                        "type": "boolean",
                        "description": "If true, set selected todos' status to in_progress (unless already completed/cancelled).",
                        "default": False,
                    },
                },
            }),
        ),
        Tool(
            name="get_queued_todos",
            description="""Get all todos that are in the queue (queue > 0), sorted by queue value (ascending). Optionally filter by task_size range (min_size, max_size) and limit results.
            
Note: When starting work on any returned todo, call update_todo to update progress tracking fields 
(work_completed, work_remaining, implementation_issues) to maintain context for future sessions.""",
            inputSchema=_with_project_context_schema({
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Optional limit on number of results. If not provided, returns all queued todos.",
                        "minimum": 1,
                    },
                    "min_size": {
                        "type": "integer",
                        "description": "Optional minimum task_size (1-5). Filter to only include todos with task_size >= min_size.",
                        "minimum": 1,
                        "maximum": 5,
                    },
                    "max_size": {
                        "type": "integer",
                        "description": "Optional maximum task_size (1-5). Filter to only include todos with task_size <= max_size.",
                        "minimum": 1,
                        "maximum": 5,
                    },
                },
            }),
        ),
        Tool(
            name="get_queue_top",
            description="""Convenience wrapper for getting the next X items in queue order. Takes count parameter (default: 10). Optionally filter by task_size range (min_size, max_size). Returns todos in execution order.
            
Note: When starting work on any returned todo, call update_todo to update progress tracking fields 
(work_completed, work_remaining, implementation_issues) to maintain context for future sessions.""",
            inputSchema=_with_project_context_schema({
                "type": "object",
                "properties": {
                    "count": {
                        "type": "integer",
                        "description": "How many queued items to fetch (in queue order).",
                        "minimum": 1,
                        "default": 10,
                    },
                    "min_size": {
                        "type": "integer",
                        "description": "Optional minimum task_size (1-5). Filter to only include todos with task_size >= min_size.",
                        "minimum": 1,
                        "maximum": 5,
                    },
                    "max_size": {
                        "type": "integer",
                        "description": "Optional maximum task_size (1-5). Filter to only include todos with task_size <= max_size.",
                        "minimum": 1,
                        "maximum": 5,
                    },
                },
            }),
        ),
        Tool(
            name="create_note",
            description="Create a note. Can be attached to a specific todo or standalone.",
            inputSchema=_with_project_context_schema({
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Optional note title",
                    },
                    "content": {
                        "type": "string",
                        "description": "The content of the note",
                    },
                    "todo_id": {
                        "type": "integer",
                        "description": "Optional: Todo ID to attach the note to",
                    },
                    "category": {
                        "type": "string",
                        "description": "Optional note category (e.g., research)",
                    },
                },
                "required": ["content"],
            }),
        ),
        Tool(
            name="get_notes_batch",
            description="Get multiple notes by ID in one call.",
            inputSchema=_with_project_context_schema({
                "type": "object",
                "properties": {
                    "note_ids": {
                        "type": "array",
                        "items": {"type": "integer"},
                        "minItems": 1,
                        "description": "The note IDs to retrieve",
                    },
                },
                "required": ["note_ids"],
            }),
        ),
        Tool(
            name="create_notes_batch",
            description="Create multiple notes in one call. Each item can optionally be attached to a todo via todo_id.",
            inputSchema=_with_project_context_schema({
                "type": "object",
                "properties": {
                    "notes": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "title": {"type": "string", "description": "Optional note title"},
                                "content": {"type": "string", "description": "The note content"},
                                "todo_id": {"type": "integer", "description": "Optional: Todo ID to attach the note to"},
                                "category": {"type": "string", "description": "Optional note category (e.g., research)"},
                            },
                            "required": ["content"],
                        },
                        "description": "List of notes to create",
                    }
                },
                "required": ["notes"],
            }),
        ),
        Tool(
            name="update_note",
            description="Update a note's content (and/or associated todo_id).",
            inputSchema=_with_project_context_schema({
                "type": "object",
                "properties": {
                    "note_id": {
                        "type": "integer",
                        "description": "The ID of the note to update",
                    },
                    "title": {
                        "type": "string",
                        "description": "Optional note title",
                    },
                    "content": {
                        "type": "string",
                        "description": "New note content",
                    },
                    "todo_id": {
                        "type": "integer",
                        "description": "Optional: (re)attach the note to a todo (or set null via omit; standalone notes are allowed)",
                    },
                    "category": {
                        "type": "string",
                        "description": "Optional note category (e.g., research)",
                    },
                },
                "required": ["note_id"],
            }),
        ),
        Tool(
            name="delete_note",
            description="Delete a note by ID.",
            inputSchema=_with_project_context_schema({
                "type": "object",
                "properties": {
                    "note_id": {
                        "type": "integer",
                        "description": "The ID of the note to delete",
                    },
                },
                "required": ["note_id"],
            }),
        ),
        Tool(
            name="search_todos",
            description="Search and filter todos by query text, category, status, topic, or tags. Use topic to find todos in a specific area (e.g., 'window layout'). Use tags to filter by characteristics (e.g., ['ui', 'urgent']).",
            inputSchema=_with_project_context_schema({
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query (searches title, description, progress, remaining work)",
                    },
                    "category": {
                        "type": "string",
                        "enum": ["feature", "issue", "bug"],
                        "description": "Filter by category: 'feature' (features/functionality), 'issue' (problems), 'bug' (defects)",
                    },
                    "status": {
                        "type": "string",
                        "enum": ["pending", "in_progress", "completed", "cancelled"],
                        "description": "Filter by status",
                    },
                    "topic": {
                        "type": "string",
                        "description": "Filter by topic (e.g., 'window layout', 'authentication')",
                    },
                    "tags": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Filter by tags (todos must have ALL specified tags)",
                    },
                    "in_queue": {
                        "type": "boolean",
                        "description": "Filter by whether a todo is in the execution queue (queue > 0).",
                    },
                    "queue": {
                        "type": "integer",
                        "description": "Filter by exact queue position.",
                        "minimum": 0,
                    },
                    "task_size": {
                        "type": "integer",
                        "description": "Filter by task size (1-5).",
                        "minimum": 1,
                        "maximum": 5,
                    },
                    "priority_class": {
                        "type": "string",
                        "description": "Filter by priority class (A-E).",
                    },
                    "dependency_status": {
                        "type": "string",
                        "enum": ["ready", "blocked", "any"],
                        "description": "Filter by dependency readiness: ready (all deps met), blocked (has unmet deps), any (no filter).",
                    },
                },
            }),
        ),
        Tool(
            name="list_topics",
            description="Get a list of all unique topics used across all todos. Useful for discovering existing topics before creating new ones.",
            inputSchema=_with_project_context_schema({
                "type": "object",
                "properties": {},
            }),
        ),
        Tool(
            name="list_tags",
            description="Get a list of all available tags with their descriptions. Includes stock tags and any custom tags created.",
            inputSchema=_with_project_context_schema({
                "type": "object",
                "properties": {},
            }),
        ),
        Tool(
            name="setup_project",
            description="Set up TodoTracker for the current project. Creates .todos directory and database if not already present. This should be called automatically if the database is not found.",
            inputSchema=_with_project_context_schema({
                "type": "object",
                "properties": {
                    "project_path": {
                        "type": "string",
                        "description": "Path to the project directory (optional, defaults to current directory)",
                    },
                },
            }),
        ),
        Tool(
            name="add_dependency",
            description="Add a dependency relationship: todo_id depends on depends_on_id being completed first.",
            inputSchema=_with_project_context_schema({
                "type": "object",
                "properties": {
                    "todo_id": {
                        "type": "integer",
                        "description": "The todo that has a dependency",
                    },
                    "depends_on_id": {
                        "type": "integer",
                        "description": "The todo that must be completed first",
                    },
                },
                "required": ["todo_id", "depends_on_id"],
            }),
        ),
        Tool(
            name="add_dependencies_batch",
            description="Create multiple dependency relationships in one call (array of {todo_id, depends_on_id}).",
            inputSchema=_with_project_context_schema({
                "type": "object",
                "properties": {
                    "dependencies": {
                        "type": "array",
                        "minItems": 1,
                        "items": {
                            "type": "object",
                            "properties": {
                                "todo_id": {"type": "integer"},
                                "depends_on_id": {"type": "integer"},
                            },
                            "required": ["todo_id", "depends_on_id"],
                        },
                    }
                },
                "required": ["dependencies"],
            }),
        ),
        Tool(
            name="check_dependencies",
            description="Check if all dependencies for a todo are met (all dependency todos completed).",
            inputSchema=_with_project_context_schema({
                "type": "object",
                "properties": {
                    "todo_id": {
                        "type": "integer",
                        "description": "The todo ID to check dependencies for",
                    },
                },
                "required": ["todo_id"],
            }),
        ),
        Tool(
            name="launch_web_server",
            description="Launch the TodoTracker web server for the current project. Uses the project's saved configuration to find and run the web server.",
            inputSchema=_with_project_context_schema({
                "type": "object",
                "properties": {
                    "open_browser": {
                        "type": "boolean",
                        "description": "Whether to open the browser automatically (default: false)",
                        "default": False,
                    },
                },
            }),
        ),
    ]


@app.call_tool()
async def call_tool(name: str, arguments: Any) -> list[TextContent]:
    """Handle tool calls from the AI."""
    # If the caller provided a project context, use that db for THIS call.
    override_db_path = _resolve_db_path_from_arguments(arguments)
    db = SessionLocal(override_db_path) if override_db_path else get_db_session()
    
    try:
        if name == "list_todos":
            include_dependencies = bool(arguments.get("include_dependencies", False))
            include_dependency_status = bool(arguments.get("include_dependency_status", False))
            todos = crud.get_todo_tree(db)
            if todos is None:
                todos = []
            result = []
            for todo in todos:
                result.append(_serialize_todo_tree(
                    todo,
                    db=db,
                    include_dependencies=include_dependencies,
                    include_dependency_status=include_dependency_status,
                ))
            return [TextContent(
                type="text",
                text=json.dumps({
                    "root_todos": result,
                    "total_count": len(todos)
                }, indent=2)
            )]
        
        elif name == "get_todo":
            todo_id = arguments["todo_id"]
            include_dependencies = bool(arguments.get("include_dependencies", False))
            include_dependency_status = bool(arguments.get("include_dependency_status", False))
            todo = crud.get_todo(db, todo_id)
            if not todo:
                return [TextContent(type="text", text=f"Todo with ID {todo_id} not found")]
            
            return [TextContent(
                type="text",
                text=json.dumps(_serialize_todo_tree(
                    todo,
                    db=db,
                    include_dependencies=include_dependencies,
                    include_dependency_status=include_dependency_status,
                ), indent=2)
            )]

        elif name == "get_todos_batch":
            todo_ids = arguments.get("todo_ids") or []
            include_dependencies = bool(arguments.get("include_dependencies", False))
            include_dependency_status = bool(arguments.get("include_dependency_status", False))

            found: list[dict] = []
            errors: list[dict] = []
            for idx, raw_id in enumerate(todo_ids):
                try:
                    todo_id = int(raw_id)
                    todo = crud.get_todo(db, todo_id)
                    if not todo:
                        errors.append({"index": idx, "todo_id": todo_id, "error": "Todo not found"})
                        continue
                    found.append(_serialize_todo_tree(
                        todo,
                        db=db,
                        include_dependencies=include_dependencies,
                        include_dependency_status=include_dependency_status,
                    ))
                except Exception as e:
                    errors.append({"index": idx, "todo_id": raw_id, "error": str(e)})

            return [TextContent(
                type="text",
                text=json.dumps({
                    "requested_count": len(todo_ids),
                    "found_count": len(found),
                    "error_count": len(errors),
                    "todos": found,
                    "errors": errors,
                }, indent=2)
            )]
        
        elif name == "create_todo":
            if not _subtasks_enabled_for_call(arguments) and arguments.get("parent_id") is not None:
                return [TextContent(type="text", text=json.dumps({
                    "success": False,
                    "error": "Subtasks are disabled for this project (features.subtasks_enabled=false). Omit parent_id.",
                }, indent=2))]
            todo_create = TodoCreate(
                title=arguments["title"],
                description=arguments.get("description"),
                category=TodoCategory(arguments.get("category", "feature")),
                parent_id=arguments.get("parent_id"),
                topic=arguments.get("topic"),
                tag_names=arguments.get("tags", []),
                queue=arguments.get("queue", 0),
                task_size=arguments.get("task_size"),
                priority_class=arguments.get("priority_class"),
                work_completed=arguments.get("work_completed"),
                work_remaining=arguments.get("work_remaining"),
                implementation_issues=arguments.get("implementation_issues"),
                completion_percentage=arguments.get("completion_percentage"),
                ai_instructions=arguments.get("ai_instructions"),
            )
            todo = crud.create_todo(db, todo_create)
            return [TextContent(
                type="text",
                text=json.dumps({
                    "message": "Todo created successfully",
                    "todo": _serialize_todo(todo)
                }, indent=2)
            )]

        # Back-compat alias
        elif name == "create_todos":
            name = "create_todos_batch"

        elif name == "create_todos_batch":
            if not _subtasks_enabled_for_call(arguments):
                for item in (arguments.get("todos") or []):
                    if isinstance(item, dict) and item.get("parent_id") is not None:
                        return [TextContent(type="text", text=json.dumps({
                            "success": False,
                            "error": "Subtasks are disabled for this project (features.subtasks_enabled=false). Omit parent_id on batch items.",
                        }, indent=2))]
            items = arguments.get("todos") or []
            created: list[dict] = []
            errors: list[dict] = []
            dependencies_created: list[dict] = []
            dependency_errors: list[dict] = []
            for idx, item in enumerate(items):
                try:
                    todo_create = TodoCreate(
                        title=item["title"],
                        description=item.get("description"),
                        category=TodoCategory(item.get("category", "feature")),
                        parent_id=item.get("parent_id"),
                        topic=item.get("topic"),
                        tag_names=item.get("tags", []),
                        queue=item.get("queue", 0),
                        task_size=item.get("task_size"),
                        priority_class=item.get("priority_class"),
                        work_completed=item.get("work_completed"),
                        work_remaining=item.get("work_remaining"),
                        implementation_issues=item.get("implementation_issues"),
                        completion_percentage=item.get("completion_percentage"),
                        ai_instructions=item.get("ai_instructions"),
                    )
                    todo = crud.create_todo(db, todo_create)
                    created.append(_serialize_todo(todo))
                    depends_on_id = item.get("depends_on_id")
                    if depends_on_id is not None:
                        try:
                            dep = crud.create_dependency(db, todo_id=todo.id, depends_on_id=int(depends_on_id))
                            if dep:
                                dependencies_created.append({
                                    "id": dep.id,
                                    "todo_id": dep.todo_id,
                                    "depends_on_id": dep.depends_on_id,
                                })
                            else:
                                dependency_errors.append({
                                    "index": idx,
                                    "todo_id": todo.id,
                                    "depends_on_id": depends_on_id,
                                    "error": "Failed to create dependency (one or both todos not found)",
                                })
                        except Exception as e:
                            dependency_errors.append({
                                "index": idx,
                                "todo_id": todo.id,
                                "depends_on_id": depends_on_id,
                                "error": str(e),
                            })
                except Exception as e:
                    errors.append({
                        "index": idx,
                        "title": item.get("title"),
                        "error": str(e),
                    })
            return [TextContent(
                type="text",
                text=json.dumps({
                    "message": "Bulk create complete",
                    "created_count": len(created),
                    "error_count": len(errors),
                    "todos": created,
                    "errors": errors,
                    "dependencies_created": dependencies_created,
                    "dependency_errors": dependency_errors,
                }, indent=2)
            )]
        
        elif name == "add_concern":
            concern = crud.add_concern(
                db,
                parent_id=arguments["parent_id"],
                title=arguments["title"],
                description=arguments["description"]
            )
            if not concern:
                return [TextContent(type="text", text=f"Parent todo with ID {arguments['parent_id']} not found")]
            
            return [TextContent(
                type="text",
                text=json.dumps({
                    "message": "Concern added successfully",
                    "concern": _serialize_todo(concern)
                }, indent=2)
            )]
        
        elif name == "update_concern":
            todo_id = arguments["todo_id"]
            update_data = {k: v for k, v in arguments.items() if k != "todo_id" and v is not None}
            
            # Ensure title has [Concern] prefix if provided
            if "title" in update_data:
                title = update_data["title"]
                if not title.startswith("[Concern]"):
                    update_data["title"] = f"[Concern] {title}"
            
            # Convert status to enum if provided
            if "status" in update_data:
                update_data["status"] = TodoStatus(update_data["status"])
            
            todo_update = TodoUpdate(**update_data)
            todo = crud.update_todo(db, todo_id, todo_update)
            
            if not todo:
                return [TextContent(type="text", text=f"Concern with ID {todo_id} not found")]
            
            return [TextContent(
                type="text",
                text=json.dumps({
                    "message": "Concern updated successfully",
                    "concern": _serialize_todo(todo)
                }, indent=2)
            )]
        
        elif name == "delete_concern" or name == "delete_todo":
            todo_id = arguments["todo_id"]
            success = crud.delete_todo(db, todo_id)
            
            if not success:
                item_type = "Concern" if name == "delete_concern" else "Todo"
                return [TextContent(type="text", text=f"{item_type} with ID {todo_id} not found")]
            
            item_type = "concern" if name == "delete_concern" else "todo"
            return [TextContent(
                type="text",
                text=json.dumps({
                    "message": f"{item_type.capitalize()} deleted successfully",
                    "todo_id": todo_id
                }, indent=2)
            )]
        
        elif name == "update_todo":
            todo_id = arguments["todo_id"]
            update_data = {k: v for k, v in arguments.items() if k != "todo_id" and v is not None}
            
            # Convert category and status to enums if provided
            if "category" in update_data:
                update_data["category"] = TodoCategory(update_data["category"])
            if "status" in update_data:
                update_data["status"] = TodoStatus(update_data["status"])
            
            # Rename 'tags' to 'tag_names' for schema
            if "tags" in update_data:
                update_data["tag_names"] = update_data.pop("tags")
            
            todo_update = TodoUpdate(**update_data)
            todo = crud.update_todo(db, todo_id, todo_update)
            
            if not todo:
                return [TextContent(type="text", text=f"Todo with ID {todo_id} not found")]
            
            return [TextContent(
                type="text",
                text=json.dumps({
                    "message": "Todo updated successfully",
                    "todo": _serialize_todo(todo)
                }, indent=2)
            )]

        # Back-compat alias
        elif name == "update_todos":
            name = "update_todos_batch"

        elif name == "update_todos_batch":
            items = arguments.get("todos") or []
            updated: list[dict] = []
            errors: list[dict] = []
            for idx, item in enumerate(items):
                todo_id = item.get("todo_id")
                try:
                    if todo_id is None:
                        raise ValueError("todo_id is required")
                    update_data = {k: v for k, v in item.items() if k != "todo_id" and v is not None}

                    # Convert category and status to enums if provided
                    if "category" in update_data:
                        update_data["category"] = TodoCategory(update_data["category"])
                    if "status" in update_data:
                        update_data["status"] = TodoStatus(update_data["status"])

                    # Rename 'tags' to 'tag_names' for schema
                    if "tags" in update_data:
                        update_data["tag_names"] = update_data.pop("tags")

                    todo_update = TodoUpdate(**update_data)
                    todo = crud.update_todo(db, int(todo_id), todo_update)
                    if not todo:
                        errors.append({
                            "index": idx,
                            "todo_id": todo_id,
                            "error": "Todo not found",
                        })
                    else:
                        updated.append(_serialize_todo(todo))
                except Exception as e:
                    errors.append({
                        "index": idx,
                        "todo_id": todo_id,
                        "error": str(e),
                    })
            return [TextContent(
                type="text",
                text=json.dumps({
                    "message": "Bulk update complete",
                    "updated_count": len(updated),
                    "error_count": len(errors),
                    "todos": updated,
                    "errors": errors,
                }, indent=2)
            )]
        
        elif name == "create_note":
            note_create = NoteCreate(
                title=arguments.get("title"),
                content=arguments["content"],
                todo_id=arguments.get("todo_id"),
                category=arguments.get("category"),
            )
            note = crud.create_note(db, note_create)
            return [TextContent(
                type="text",
                text=json.dumps({
                    "message": "Note created successfully",
                    "note": {
                        "id": note.id,
                        "title": getattr(note, "title", None),
                        "content": note.content,
                        "todo_id": note.todo_id,
                        "note_type": note.note_type.value if getattr(note, "note_type", None) else None,
                        "category": getattr(note, "category", None),
                        "created_at": note.created_at.isoformat()
                    }
                }, indent=2)
            )]

        elif name == "get_notes_batch":
            note_ids = arguments.get("note_ids") or []
            found: list[dict] = []
            errors: list[dict] = []
            for idx, raw_id in enumerate(note_ids):
                try:
                    note_id = int(raw_id)
                    note = crud.get_note(db, note_id)
                    if not note:
                        errors.append({"index": idx, "note_id": note_id, "error": "Note not found"})
                        continue
                    found.append({
                        "id": note.id,
                        "title": getattr(note, "title", None),
                        "content": note.content,
                        "todo_id": note.todo_id,
                        "note_type": note.note_type.value if getattr(note, "note_type", None) else None,
                        "category": getattr(note, "category", None),
                        "created_at": note.created_at.isoformat() if note.created_at else None,
                    })
                except Exception as e:
                    errors.append({"index": idx, "note_id": raw_id, "error": str(e)})

            return [TextContent(
                type="text",
                text=json.dumps({
                    "requested_count": len(note_ids),
                    "found_count": len(found),
                    "error_count": len(errors),
                    "notes": found,
                    "errors": errors,
                }, indent=2)
            )]

        elif name == "create_notes_batch":
            items = arguments.get("notes") or []
            created: list[dict] = []
            errors: list[dict] = []
            for idx, item in enumerate(items):
                try:
                    note_create = NoteCreate(
                        title=item.get("title"),
                        content=item["content"],
                        todo_id=item.get("todo_id"),
                        category=item.get("category"),
                    )
                    note = crud.create_note(db, note_create)
                    created.append({
                        "id": note.id,
                        "title": getattr(note, "title", None),
                        "content": note.content,
                        "todo_id": note.todo_id,
                        "note_type": note.note_type.value if getattr(note, "note_type", None) else None,
                        "category": getattr(note, "category", None),
                        "created_at": note.created_at.isoformat() if note.created_at else None,
                    })
                except Exception as e:
                    errors.append({
                        "index": idx,
                        "todo_id": item.get("todo_id"),
                        "error": str(e),
                    })
            return [TextContent(
                type="text",
                text=json.dumps({
                    "message": "Bulk note create complete",
                    "created_count": len(created),
                    "error_count": len(errors),
                    "notes": created,
                    "errors": errors,
                }, indent=2)
            )]

        elif name == "update_note":
            note_id = int(arguments["note_id"])
            update_data = {k: v for k, v in arguments.items() if k != "note_id" and v is not None}
            note_update = NoteUpdate(**update_data)
            note = crud.update_note(db, note_id, note_update)
            if not note:
                return [TextContent(type="text", text=f"Note with ID {note_id} not found")]
            return [TextContent(
                type="text",
                text=json.dumps({
                    "message": "Note updated successfully",
                    "note": {
                        "id": note.id,
                        "title": getattr(note, "title", None),
                        "content": note.content,
                        "todo_id": note.todo_id,
                        "note_type": note.note_type.value if getattr(note, "note_type", None) else None,
                        "category": getattr(note, "category", None),
                        "created_at": note.created_at.isoformat() if note.created_at else None,
                    }
                }, indent=2)
            )]

        elif name == "delete_note":
            note_id = int(arguments["note_id"])
            success = crud.delete_note(db, note_id)
            if not success:
                return [TextContent(type="text", text=f"Note with ID {note_id} not found")]
            return [TextContent(
                type="text",
                text=json.dumps({
                    "message": "Note deleted successfully",
                    "note_id": note_id,
                }, indent=2)
            )]
        
        elif name == "search_todos":
            search = TodoSearch(
                query=arguments.get("query"),
                category=TodoCategory(arguments["category"]) if "category" in arguments else None,
                status=TodoStatus(arguments["status"]) if "status" in arguments else None,
                topic=arguments.get("topic"),
                tags=arguments.get("tags"),
                in_queue=arguments.get("in_queue"),
                queue=arguments.get("queue"),
                task_size=arguments.get("task_size"),
                priority_class=arguments.get("priority_class"),
                dependency_status=arguments.get("dependency_status"),
            )
            todos = crud.search_todos(db, search)
            return [TextContent(
                type="text",
                text=json.dumps({
                    "results": [_serialize_todo(todo) for todo in todos],
                    "count": len(todos)
                }, indent=2)
            )]

        elif name == "execute_queue_next":
            count = int(arguments.get("count", 1))
            mark = bool(arguments.get("mark_in_progress", False))
            queued = crud.get_queued_todos(db, limit=count)

            updated = []
            if mark:
                for t in queued:
                    # Only bump into in_progress when it makes sense
                    if t.status not in (TodoStatus.COMPLETED, TodoStatus.CANCELLED):
                        t.status = TodoStatus.IN_PROGRESS
                        updated.append(t.id)
                if updated:
                    db.commit()

            # Re-fetch to ensure fresh state
            queued = crud.get_queued_todos(db, limit=count)
            return [TextContent(
                type="text",
                text=json.dumps({
                    "count": len(queued),
                    "marked_in_progress": updated,
                    "todos": [_serialize_todo(todo) for todo in queued],
                }, indent=2)
            )]
        
        elif name == "get_queued_todos":
            limit = arguments.get("limit")
            if limit is not None:
                limit = int(limit)
            min_size = arguments.get("min_size")
            if min_size is not None:
                min_size = int(min_size)
            max_size = arguments.get("max_size")
            if max_size is not None:
                max_size = int(max_size)
            
            queued = crud.get_queued_todos(db, limit=limit, min_size=min_size, max_size=max_size)
            return [TextContent(
                type="text",
                text=json.dumps({
                    "count": len(queued),
                    "todos": [_serialize_todo(todo) for todo in queued],
                }, indent=2)
            )]
        
        elif name == "get_queue_top":
            count = int(arguments.get("count", 10))
            min_size = arguments.get("min_size")
            if min_size is not None:
                min_size = int(min_size)
            max_size = arguments.get("max_size")
            if max_size is not None:
                max_size = int(max_size)
            
            queued = crud.get_queued_todos(db, limit=count, min_size=min_size, max_size=max_size)
            return [TextContent(
                type="text",
                text=json.dumps({
                    "count": len(queued),
                    "todos": [_serialize_todo(todo) for todo in queued],
                }, indent=2)
            )]
        
        elif name == "list_topics":
            topics = crud.get_all_topics(db)
            return [TextContent(
                type="text",
                text=json.dumps({
                    "topics": topics,
                    "count": len(topics)
                }, indent=2)
            )]
        
        elif name == "list_tags":
            tags = crud.get_all_tags(db)
            return [TextContent(
                type="text",
                text=json.dumps({
                    "tags": [{"name": tag.name, "description": tag.description} for tag in tags],
                    "count": len(tags)
                }, indent=2)
            )]
        
        elif name == "add_dependency":
            try:
                dependency = crud.create_dependency(
                    db,
                    todo_id=arguments["todo_id"],
                    depends_on_id=arguments["depends_on_id"]
                )
            except ValueError as e:
                return [TextContent(type="text", text=str(e))]
            if not dependency:
                return [TextContent(type="text", text="Failed to create dependency (one or both todos not found)")]
            
            return [TextContent(
                type="text",
                text=json.dumps({
                    "message": "Dependency created successfully",
                    "dependency": {
                        "id": dependency.id,
                        "todo_id": dependency.todo_id,
                        "depends_on_id": dependency.depends_on_id
                    }
                }, indent=2)
            )]

        elif name == "add_dependencies_batch":
            items = arguments.get("dependencies") or []
            created: list[dict] = []
            errors: list[dict] = []
            for idx, item in enumerate(items):
                try:
                    dep = crud.create_dependency(
                        db,
                        todo_id=int(item["todo_id"]),
                        depends_on_id=int(item["depends_on_id"]),
                    )
                    if not dep:
                        errors.append({
                            "index": idx,
                            "todo_id": item.get("todo_id"),
                            "depends_on_id": item.get("depends_on_id"),
                            "error": "Failed to create dependency (one or both todos not found)",
                        })
                    else:
                        created.append({
                            "id": dep.id,
                            "todo_id": dep.todo_id,
                            "depends_on_id": dep.depends_on_id,
                        })
                except Exception as e:
                    errors.append({
                        "index": idx,
                        "todo_id": item.get("todo_id"),
                        "depends_on_id": item.get("depends_on_id"),
                        "error": str(e),
                    })
            return [TextContent(
                type="text",
                text=json.dumps({
                    "message": "Bulk dependency create complete",
                    "created_count": len(created),
                    "error_count": len(errors),
                    "dependencies": created,
                    "errors": errors,
                }, indent=2)
            )]
        
        elif name == "check_dependencies":
            todo_id = arguments["todo_id"]
            all_met = crud.check_dependencies_met(db, todo_id)
            dependencies = crud.get_dependencies(db, todo_id)
            
            return [TextContent(
                type="text",
                text=json.dumps({
                    "todo_id": todo_id,
                    "all_dependencies_met": all_met,
                    "dependency_count": len(dependencies),
                    "message": "All dependencies met" if all_met else "Some dependencies not yet completed"
                }, indent=2)
            )]
        
        elif name == "setup_project":
            import subprocess
            default_root = _get_project_root()
            project_path = arguments.get("project_path", str(default_root) if default_root else os.getcwd())
            
            # Get path to setup script
            todotracker_root = Path(__file__).parent.parent
            setup_script = todotracker_root / "scripts" / "setup-project-todos.sh"
            
            if not setup_script.exists():
                return [TextContent(
                    type="text",
                    text=json.dumps({
                        "success": False,
                        "error": f"Setup script not found: {setup_script}"
                    }, indent=2)
                )]
            
            try:
                # Run setup script with from-mcp-tool flag (non-interactive)
                result = subprocess.run(
                    [str(setup_script), "--from-mcp-tool", project_path],
                    cwd=project_path,
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                
                if result.returncode == 0:
                    # Try to parse JSON output
                    try:
                        setup_result = json.loads(result.stdout)
                        return [TextContent(
                            type="text",
                            text=json.dumps({
                                "success": True,
                                "message": "TodoTracker setup complete for this project",
                                "details": setup_result
                            }, indent=2)
                        )]
                    except json.JSONDecodeError:
                        # Fallback if output isn't JSON
                        return [TextContent(
                            type="text",
                            text=json.dumps({
                                "success": True,
                                "message": "TodoTracker setup complete",
                                "output": result.stdout
                            }, indent=2)
                        )]
                else:
                    return [TextContent(
                        type="text",
                        text=json.dumps({
                            "success": False,
                            "error": f"Setup failed with code {result.returncode}",
                            "stderr": result.stderr,
                            "stdout": result.stdout
                        }, indent=2)
                    )]
            
            except subprocess.TimeoutExpired:
                return [TextContent(
                    type="text",
                    text=json.dumps({
                        "success": False,
                        "error": "Setup script timed out after 30 seconds"
                    }, indent=2)
                )]
            except Exception as e:
                return [TextContent(
                    type="text",
                    text=json.dumps({
                        "success": False,
                        "error": f"Setup failed: {str(e)}"
                    }, indent=2)
                )]
        
        elif name == "launch_web_server":
            import subprocess
            from .project_config import ProjectConfig
            
            # Use the same project detection as the MCP server itself
            # Find the database path (this is how MCP server determines the project)
            db_path = os.environ.get("TODOTRACKER_DB_PATH") or find_project_database()
            
            if not db_path:
                return [TextContent(
                    type="text",
                    text=json.dumps({
                        "success": False,
                        "error": "No TodoTracker database found. Run setup_project first.",
                        "hint": "Use the setup_project tool to initialize TodoTracker for this project",
                        "current_directory": os.getcwd()
                    }, indent=2)
                )]
            
            # Get project root from database path (database is at project_root/.todos/project.db)
            project_root = Path(db_path).parent.parent
            
            # Load project config from the detected project directory
            project_config = ProjectConfig(project_root)
            config = project_config.load_config()
            
            if not config:
                return [TextContent(
                    type="text",
                    text=json.dumps({
                        "success": False,
                        "error": f"Failed to load project configuration from {project_root}",
                        "hint": "Run setup_project to create the configuration"
                    }, indent=2)
                )]
            
            todotracker_path = config.get("todotracker_path")
            project_name = config.get("project_name")
            
            if not todotracker_path or not Path(todotracker_path).exists():
                return [TextContent(
                    type="text",
                    text=json.dumps({
                        "success": False,
                        "error": f"TodoTracker installation not found: {todotracker_path}",
                        "hint": "Re-run setup_project to update configuration"
                    }, indent=2)
                )]
            
            # Path to the launcher script
            launcher_script = Path(project_root) / "launch_todotracker_webserver.sh"
            
            if not launcher_script.exists():
                return [TextContent(
                    type="text",
                    text=json.dumps({
                        "success": False,
                        "error": f"Launcher script not found: {launcher_script}",
                        "hint": "Re-run setup_project to create the launcher script"
                    }, indent=2)
                )]
            
            try:
                # Launch the web server in the background
                # Use nohup to detach from current process
                process = subprocess.Popen(
                    [str(launcher_script)],
                    cwd=project_root,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    start_new_session=True,
                    text=True
                )
                
                # Give it a moment to start
                import time
                time.sleep(2)
                
                # Check if process is still running
                if process.poll() is not None:
                    # Process already exited - there was an error
                    stdout, stderr = process.communicate()
                    return [TextContent(
                        type="text",
                        text=json.dumps({
                            "success": False,
                            "error": "Web server failed to start",
                            "stderr": stderr,
                            "stdout": stdout
                        }, indent=2)
                    )]
                
                # Success - server is running
                db_path = Path(project_root) / ".todos" / "project.db"
                
                return [TextContent(
                    type="text",
                    text=json.dumps({
                        "success": True,
                        "message": f"TodoTracker web server launched for project: {project_name}",
                        "project_name": project_name,
                        "database": str(db_path),
                        "pid": process.pid,
                        "note": "Server is running in the background. Check port manager at http://localhost:8069 for the assigned port.",
                        "hint": "The web server will automatically find an available port (starting from 8070)"
                    }, indent=2)
                )]
            
            except Exception as e:
                return [TextContent(
                    type="text",
                    text=json.dumps({
                        "success": False,
                        "error": f"Failed to launch web server: {str(e)}"
                    }, indent=2)
                )]
        
        else:
            return [TextContent(type="text", text=f"Unknown tool: {name}")]
    
    except Exception as e:
        return [TextContent(type="text", text=f"Error: {str(e)}")]
    
    finally:
        db.close()


# ============================================================================
# RESOURCES (Context data AI can read)
# ============================================================================

@app.list_resources()
async def list_resources() -> list[dict]:
    """List available resources."""
    return [
        {
            "uri": "todos://tree",
            "name": "Todo Tree",
            "description": "Complete hierarchical todo tree",
            "mimeType": "application/json",
        },
        {
            "uri": "todos://stats",
            "name": "Todo Statistics",
            "description": "Statistics about todos (counts by status, category)",
            "mimeType": "application/json",
        },
    ]


@app.read_resource()
async def read_resource(uri: str) -> str:
    """Read a resource by URI."""
    db = get_db_session()
    
    try:
        if uri == "todos://tree":
            todos = crud.get_todo_tree(db)
            result = [_serialize_todo_tree(todo) for todo in todos]
            return json.dumps({"root_todos": result, "total_count": len(todos)}, indent=2)
        
        elif uri == "todos://stats":
            all_todos = crud.get_todos(db, limit=10000)
            
            stats = {
                "total": len(all_todos),
                "by_status": {
                    "pending": sum(1 for t in all_todos if t.status == TodoStatus.PENDING),
                    "in_progress": sum(1 for t in all_todos if t.status == TodoStatus.IN_PROGRESS),
                    "completed": sum(1 for t in all_todos if t.status == TodoStatus.COMPLETED),
                    "cancelled": sum(1 for t in all_todos if t.status == TodoStatus.CANCELLED),
                },
                "by_category": {
                    "feature": sum(1 for t in all_todos if t.category == TodoCategory.FEATURE),
                    "issue": sum(1 for t in all_todos if t.category == TodoCategory.ISSUE),
                    "bug": sum(1 for t in all_todos if t.category == TodoCategory.BUG),
                },
            }
            
            return json.dumps(stats, indent=2)
        
        else:
            return json.dumps({"error": f"Unknown resource URI: {uri}"})
    
    finally:
        db.close()


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _serialize_todo(todo) -> dict:
    """Serialize a todo to a dictionary."""
    ai_raw = getattr(todo, "ai_instructions", None)
    ai_obj = None
    if ai_raw is not None:
        try:
            ai_obj = json.loads(ai_raw) if isinstance(ai_raw, str) else ai_raw
        except Exception:
            ai_obj = None
    return {
        "id": todo.id,
        "title": todo.title,
        "description": todo.description,
        "category": todo.category.value if todo.category else None,
        "status": todo.status.value if todo.status else None,
        "parent_id": todo.parent_id,
        "topic": todo.topic,
        "tags": [tag.name for tag in todo.tags] if hasattr(todo, 'tags') else [],
        "queue": getattr(todo, "queue", 0) or 0,
        "task_size": getattr(todo, "task_size", None),
        "priority_class": getattr(todo, "priority_class", None),
        "completion_percentage": getattr(todo, "completion_percentage", None),
        "ai_instructions": ai_obj,
        # Progress tracking fields
        "work_completed": getattr(todo, 'work_completed', None),
        "work_remaining": getattr(todo, 'work_remaining', None),
        "implementation_issues": getattr(todo, 'implementation_issues', None),
        # Legacy fields
        "progress_summary": todo.progress_summary,
        "remaining_work": todo.remaining_work,
        "created_at": todo.created_at.isoformat() if todo.created_at else None,
        "updated_at": todo.updated_at.isoformat() if todo.updated_at else None,
    }


def _serialize_todo_tree(
    todo,
    *,
    db=None,
    include_dependencies: bool = False,
    include_dependency_status: bool = False,
) -> dict:
    """Recursively serialize a todo with all its children."""
    def _as_list(value):
        if value is None:
            return []
        if isinstance(value, (list, tuple)):
            return list(value)
        return [value]

    data = _serialize_todo(todo)
    data["children"] = [
        _serialize_todo_tree(
            child,
            db=db,
            include_dependencies=include_dependencies,
            include_dependency_status=include_dependency_status,
        )
        for child in _as_list(getattr(todo, "children", None))
    ]
    data["notes"] = [
        {
            "id": note.id,
            "title": getattr(note, "title", None),
            "content": note.content,
            "todo_id": getattr(note, "todo_id", None),
            "note_type": note.note_type.value if getattr(note, "note_type", None) else None,
            "category": getattr(note, "category", None),
            "created_at": note.created_at.isoformat() if note.created_at else None
        }
        for note in _as_list(getattr(todo, "notes", None))
    ]

    # v6: relations + attachments (best-effort)
    if db is not None:
        try:
            data["relates_to_ids"] = crud.get_relates_to_ids(db, todo.id)
        except Exception:
            data["relates_to_ids"] = []
        try:
            atts = crud.get_todo_attachments(db, todo.id)
            data["attachments"] = [
                {
                    "id": a.id,
                    "todo_id": a.todo_id,
                    "file_path": a.file_path,
                    "file_name": a.file_name,
                    "file_size": a.file_size,
                    "uploaded_at": a.uploaded_at.isoformat() if getattr(a, "uploaded_at", None) else None,
                }
                for a in (atts or [])
            ]
        except Exception:
            data["attachments"] = []

    if db is not None and include_dependency_status:
        try:
            data["dependency_status"] = "ready" if crud.check_dependencies_met(db, todo.id) else "blocked"
        except Exception:
            data["dependency_status"] = None

    if db is not None and include_dependencies:
        prereqs = []
        for dep in _as_list(getattr(todo, "dependencies", None)):
            depends_on = getattr(dep, "depends_on", None)
            prereqs.append({
                "id": dep.id,
                "todo_id": dep.todo_id,
                "depends_on_id": dep.depends_on_id,
                "depends_on": {
                    "id": depends_on.id,
                    "title": depends_on.title,
                    "status": depends_on.status.value if depends_on.status else None,
                } if depends_on is not None else None,
                "created_at": dep.created_at.isoformat() if getattr(dep, "created_at", None) else None,
            })

        dependents = db.query(TodoDependency).filter(TodoDependency.depends_on_id == todo.id).all()
        data["dependencies"] = {
            "prerequisites": prereqs,
            "dependents": [
                {
                    "id": d.id,
                    "todo_id": d.todo_id,
                    "depends_on_id": d.depends_on_id,
                    "created_at": d.created_at.isoformat() if getattr(d, "created_at", None) else None,
                }
                for d in dependents
            ],
        }
    return data


# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

async def ensure_project_setup() -> bool:
    """Ensure the project is set up. Returns True if setup was successful or already done."""
    import subprocess

    project_root = _get_project_root()
    install_root = _todotracker_install_root()

    # If we're running from the TodoTracker install directory and no explicit project root/DB
    # was provided, fail fast instead of silently using TodoTracker's own database.
    if project_root is None and Path.cwd().resolve() == install_root.resolve():
        print("❌ TodoTracker MCP: project root not provided.", file=sys.stderr)
        print("   This MCP server is running from the TodoTracker installation directory.", file=sys.stderr)
        print("   Fix your MCP config to pass your workspace folder (or set TODOTRACKER_DB_PATH).", file=sys.stderr)
        return False
    
    # If caller explicitly set a DB path, treat that as authoritative.
    # We trust the path even if it doesn't exist yet - init_db() will create it.
    env_db = os.environ.get("TODOTRACKER_DB_PATH")
    if env_db:
        env_db_path = Path(env_db)
        if env_db_path.exists():
            print(f"✓ Using explicit TODOTRACKER_DB_PATH: {env_db}", file=sys.stderr)
            return True
        else:
            # Path is set but DB doesn't exist - ensure parent directory exists
            # and let init_db() create the database later
            print(f"✓ Will create database at: {env_db}", file=sys.stderr)
            env_db_path.parent.mkdir(parents=True, exist_ok=True)
            return True

    # Otherwise, check if database already exists via auto-detection (from explicit project root if available)
    db_path = find_project_database(str(project_root) if project_root else None)
    if db_path:
        print(f"✓ Project database found: {db_path}", file=sys.stderr)
        return True
    
    # Database not found - run setup
    print("🔧 TodoTracker database not found. Setting up project...", file=sys.stderr)
    
    todotracker_root = _todotracker_install_root()
    setup_script = todotracker_root / "scripts" / "setup-project-todos.sh"
    
    if not setup_script.exists():
        print(f"❌ Setup script not found: {setup_script}", file=sys.stderr)
        print("   Using default database location instead.", file=sys.stderr)
        return False
    
    try:
        # Run setup script with from-mcp-tool flag
        # Prefer explicit project root if available; otherwise fall back to cwd.
        target_dir = str(project_root) if project_root else os.getcwd()
        result = subprocess.run(
            [str(setup_script), target_dir, "--from-mcp-tool"],
            cwd=target_dir,
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            print("✅ Project setup complete!", file=sys.stderr)
            try:
                setup_result = json.loads(result.stdout)
                print(f"   Database: {setup_result.get('database_path', 'unknown')}", file=sys.stderr)
            except json.JSONDecodeError:
                pass
            return True
        else:
            print(f"❌ Setup failed: {result.stderr}", file=sys.stderr)
            print("   Using default database location instead.", file=sys.stderr)
            return False
    
    except Exception as e:
        print(f"⚠️  Auto-setup error: {e}", file=sys.stderr)
        print("   Using default database location instead.", file=sys.stderr)
        return False


async def main():
    """Run the MCP server."""
    # Auto-setup project if needed
    ok = await ensure_project_setup()
    if not ok:
        # Avoid silently using TodoTracker's own installation directory as "the project".
        raise SystemExit(2)
    
    # Auto-detect project database or use provided path
    db_path = None
    
    # Option 1: Command-line argument (explicit path)
    if len(sys.argv) > 1:
        db_path = sys.argv[1]
        print(f"Using explicit database path: {db_path}", file=sys.stderr)

    # Option 2: Environment variable (preferred over auto-detection)
    if db_path is None and os.environ.get("TODOTRACKER_DB_PATH"):
        db_path = os.environ["TODOTRACKER_DB_PATH"]
        print(f"Using TODOTRACKER_DB_PATH: {db_path}", file=sys.stderr)

    # Option 3: Auto-detect from current working directory
    if db_path is None:
        # Avoid treating TodoTracker's *installation directory* as the project when the
        # MCP client didn't pass a workspace root (common misconfiguration).
        if Path.cwd().resolve() == _todotracker_install_root().resolve():
            print("❌ TodoTracker MCP: no project root/DB provided by client.", file=sys.stderr)
            print("   Configure your MCP client to pass a workspace folder (recommended) or set TODOTRACKER_DB_PATH.", file=sys.stderr)
            raise SystemExit(2)

        db_path = find_project_database()
        if db_path:
            print(f"Auto-detected project database: {db_path}", file=sys.stderr)
        else:
            # Option 4: Fall back to default
            db_path = "./project.db"
            print(f"Using default database: {db_path}", file=sys.stderr)
    
    # Set the database path
    os.environ["TODOTRACKER_DB_PATH"] = db_path
    
    # Initialize database
    init_db()
    
    current_db = get_db_path()
    print(f"TodoTracker MCP Server ready - Database: {current_db}", file=sys.stderr)
    
    # Run the server
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options()
        )


if __name__ == "__main__":
    asyncio.run(main())

