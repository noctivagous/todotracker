#!/usr/bin/env python3
"""
Manual sanity-check for MCP bulk tools: create_todos / update_todos.

This uses a temporary SQLite DB file so it won't touch any project database.
Run:
  python3 scripts/test_bulk_mcp_tools.py
"""

import asyncio
import json
import os
import sys
import tempfile
from pathlib import Path


async def main() -> None:
    # Ensure repository root is on sys.path so `import src...` works when run as a script
    repo_root = Path(__file__).resolve().parent.parent
    sys.path.insert(0, str(repo_root))

    with tempfile.TemporaryDirectory(prefix="todotracker-bulk-test-") as d:
        db_path = str(Path(d) / "project.db")
        os.environ["TODOTRACKER_DB_PATH"] = db_path

        # Import AFTER setting env var so the DB engine uses our temp path
        from src.db import init_db
        from src.mcp_server import call_tool

        init_db()

        # Bulk create
        created = await call_tool(
            "create_todos_batch",
            {
                "todos": [
                    {"title": "Bulk Tool Test 1", "description": "created via create_todos"},
                    {"title": "Bulk Tool Test 2", "description": "created via create_todos"},
                ]
            },
        )
        payload = json.loads(created[0].text)
        assert payload["created_count"] == 2, payload
        ids = [t["id"] for t in payload["todos"]]

        # Bulk update
        updated = await call_tool(
            "update_todos_batch",
            {"todos": [{"todo_id": ids[0], "status": "completed"}, {"todo_id": ids[1], "status": "completed"}]},
        )
        payload2 = json.loads(updated[0].text)
        assert payload2["updated_count"] == 2, payload2
        assert all(t["status"] == "completed" for t in payload2["todos"]), payload2

        print("✅ Bulk MCP tools OK")


if __name__ == "__main__":
    asyncio.run(main())


