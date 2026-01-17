#!/usr/bin/env python3
"""
Test script to verify MCP server functionality without Cursor.
"""

import asyncio
import json
import sys
import os
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from mcp_server import app, get_db_session
from mcp.types import CallToolRequest

async def test_mcp_server():
    """Test the MCP server by creating a todo and listing todos."""

    print("Testing MCP server...")

    # Test 1: Create a todo
    print("\n1. Creating a test todo...")
    create_request = CallToolRequest(
        method="tools/call",
        params={
            "name": "create_todo",
            "arguments": {
                "title": "MCP Test Todo",
                "description": "Test todo created by MCP test script",
                "category": "feature"
            }
        }
    )

    # Simulate the call_tool function
    db = get_db_session()
    try:
        # This mimics what happens in call_tool
        arguments = create_request.params["arguments"]
        from schemas import TodoCreate, TodoCategory
        from crud import create_todo

        todo_create = TodoCreate(
            title=arguments["title"],
            description=arguments.get("description"),
            category=TodoCategory(arguments.get("category", "feature")),
        )
        todo = create_todo(db, todo_create)

        print("✅ Todo created successfully!")
        print(f"   ID: {todo.id}")
        print(f"   Title: {todo.title}")

    except Exception as e:
        print(f"❌ Failed to create todo: {e}")
    finally:
        db.close()

    # Test 2: List todos
    print("\n2. Listing todos...")
    db = get_db_session()
    try:
        from crud import get_todo_tree
        todos = get_todo_tree(db)
        print(f"✅ Found {len(todos)} todos")

        for todo in todos:
            print(f"   - ID {todo.id}: {todo.title}")

    except Exception as e:
        print(f"❌ Failed to list todos: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    # Set up environment like the MCP server does
    from mcp_server import find_project_database, init_db
    db_path = find_project_database()
    if db_path:
        os.environ["TODOTRACKER_DB_PATH"] = db_path
        init_db()
        print(f"Using database: {db_path}")
        asyncio.run(test_mcp_server())
    else:
        print("❌ Could not find project database")














