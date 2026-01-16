"""
Pydantic schemas for request/response validation and serialization.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict, field_validator
from .db import TodoCategory, TodoStatus


# Todo Schemas

class TagBase(BaseModel):
    """Base schema for Tag."""
    name: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None


class TagCreate(TagBase):
    """Schema for creating a new tag."""
    pass


class TagInDB(TagBase):
    """Schema for Tag in database."""
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class TodoBase(BaseModel):
    """Base schema for Todo."""
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    category: TodoCategory = TodoCategory.FEATURE
    status: TodoStatus = TodoStatus.PENDING
    parent_id: Optional[int] = None
    topic: Optional[str] = Field(None, max_length=200)
    tag_names: Optional[List[str]] = []  # Tag names to associate

    # Execution & priority metadata
    queue: int = Field(0, ge=0, description="Execution queue position. 0 means not queued. Lower numbers execute first.")
    task_size: Optional[int] = Field(None, ge=1, le=5, description="Optional task size (effort) on a 1-5 scale.")
    priority_class: Optional[str] = Field(None, description="Optional priority class (A-E).")
    
    # Progress tracking fields (for AI and user)
    work_completed: Optional[str] = Field(None, description="What has been done on this task")
    work_remaining: Optional[str] = Field(None, description="What still needs to be done")
    implementation_issues: Optional[str] = Field(None, description="Problems, blockers, or concerns encountered")

    @field_validator("priority_class", mode="before")
    @classmethod
    def _normalize_priority_class(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            s = v.strip().upper()
            if s == "":
                return None
            if s not in {"A", "B", "C", "D", "E"}:
                raise ValueError("priority_class must be one of A, B, C, D, E")
            return s
        raise ValueError("priority_class must be a string")


class TodoCreate(TodoBase):
    """Schema for creating a new todo."""
    pass


class TodoUpdate(BaseModel):
    """Schema for updating a todo. All fields are optional."""
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    category: Optional[TodoCategory] = None
    status: Optional[TodoStatus] = None
    parent_id: Optional[int] = None
    topic: Optional[str] = Field(None, max_length=200)
    tag_names: Optional[List[str]] = None  # Tag names to update

    # Execution & priority metadata
    queue: Optional[int] = Field(None, ge=0, description="Execution queue position. 0 means not queued.")
    task_size: Optional[int] = Field(None, ge=1, le=5, description="Optional task size (1-5).")
    priority_class: Optional[str] = Field(None, description="Optional priority class (A-E).")
    
    # Progress tracking fields (AI should update these regularly)
    work_completed: Optional[str] = Field(None, description="What has been done on this task")
    work_remaining: Optional[str] = Field(None, description="What still needs to be done")
    implementation_issues: Optional[str] = Field(None, description="Problems, blockers, or concerns encountered")
    
    # Legacy fields (deprecated, use new progress fields above)
    progress_summary: Optional[str] = None
    remaining_work: Optional[str] = None

    @field_validator("priority_class", mode="before")
    @classmethod
    def _normalize_priority_class_update(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            s = v.strip().upper()
            if s == "":
                return None
            if s not in {"A", "B", "C", "D", "E"}:
                raise ValueError("priority_class must be one of A, B, C, D, E")
            return s
        raise ValueError("priority_class must be a string")


class TodoInDB(TodoBase):
    """Schema for Todo in database."""
    id: int
    created_at: datetime
    updated_at: datetime
    tags: List[TagInDB] = []
    
    # Legacy fields (deprecated)
    progress_summary: Optional[str] = None
    remaining_work: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class TodoWithChildren(TodoInDB):
    """Schema for Todo with children (recursive)."""
    children: List["TodoWithChildren"] = []
    
    model_config = ConfigDict(from_attributes=True)


# Note Schemas

class NoteBase(BaseModel):
    """Base schema for Note."""
    content: str = Field(..., min_length=1)
    todo_id: Optional[int] = None


class NoteCreate(NoteBase):
    """Schema for creating a new note."""
    pass


class NoteUpdate(BaseModel):
    """Schema for updating a note."""
    content: Optional[str] = Field(None, min_length=1)
    todo_id: Optional[int] = None


class NoteInDB(NoteBase):
    """Schema for Note in database."""
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Dependency Schemas

class DependencyCreate(BaseModel):
    """Schema for creating a todo dependency."""
    todo_id: int
    depends_on_id: int


class DependencyInDB(DependencyCreate):
    """Schema for Dependency in database."""
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Search/Filter Schemas

class TodoSearch(BaseModel):
    """Schema for searching/filtering todos."""
    query: Optional[str] = None
    category: Optional[TodoCategory] = None
    status: Optional[TodoStatus] = None
    parent_id: Optional[int] = None
    topic: Optional[str] = None
    tags: Optional[List[str]] = None  # Filter by tag names

    # Execution & priority metadata filters
    in_queue: Optional[bool] = None
    queue: Optional[int] = Field(None, ge=0)
    task_size: Optional[int] = Field(None, ge=1, le=5)
    priority_class: Optional[str] = None

    @field_validator("priority_class", mode="before")
    @classmethod
    def _normalize_priority_class_search(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            s = v.strip().upper()
            if s == "":
                return None
            if s not in {"A", "B", "C", "D", "E"}:
                raise ValueError("priority_class must be one of A, B, C, D, E")
            return s
        raise ValueError("priority_class must be a string")


# Response Schemas

class TodoTree(BaseModel):
    """Schema for hierarchical todo tree."""
    root_todos: List[TodoWithChildren]
    total_count: int


class MessageResponse(BaseModel):
    """Generic message response."""
    message: str
    data: Optional[dict] = None

