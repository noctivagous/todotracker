# 🔄 Changes: Per-Project Database Support

## Summary

TodoTracker has been updated to support **per-project databases**! You can now maintain separate todo lists for different projects while using a single TodoTracker installation.

## What Changed

### 1. Core Files Updated

#### `db.py`
- ✅ Added support for `TODOTRACKER_DB_PATH` environment variable
- ✅ Automatically creates database directory if it doesn't exist
- ✅ Added `get_db_path()` function to retrieve current database path
- ✅ Default path remains `./project.db` for backward compatibility

#### `mcp_server.py`
- ✅ Accepts database path as command-line argument
- ✅ Logs which database is being used (stderr)
- ✅ Supports both environment variable and CLI argument

**Usage:**
```bash
# Via environment variable
export TODOTRACKER_DB_PATH="/path/to/project/.todos/project.db"
python mcp_server.py

# Via command-line argument
python mcp_server.py /path/to/project/.todos/project.db
```

#### `web_server.py`
- ✅ Displays current database path on startup
- ✅ Uses environment variable automatically

#### `todotracker_webserver.py`
- ✅ Shows database path in welcome message
- ✅ Displays which database is initialized

### 2. New Files Created

#### `setup-project-todos.sh` ⭐
Automated setup script for per-project databases.

**Features:**
- Creates `.todos/` directory in project
- Adds `.todos/` to `.gitignore`
- Creates `todos.sh` launcher script
- Shows MCP configuration for Cursor

**Usage:**
```bash
cd /path/to/your/project
/path/to/todotracker/setup-project-todos.sh my-project-name
```

#### Documentation Updated
Merged per-project usage guide into README.md:
- Setup instructions
- MCP configuration examples
- Common workflows
- Tips & tricks
- FAQ

### 3. Documentation Updated

#### `README.md`
- ✅ Added "Per-Project Databases" section
- ✅ Updated MCP configuration examples
- ✅ Added project structure examples

#### `QUICKSTART.md`
- ✅ Added Option A (global) vs Option B (per-project)
- ✅ Quick setup instructions

## Migration Guide

### Existing Users (No Action Required)

If you're already using TodoTracker, **nothing changes** unless you want per-project databases. Your existing `project.db` will continue to work exactly as before.

### New Per-Project Setup

#### For Each Project:

1. **Navigate to project:**
   ```bash
   cd /path/to/your/project
   ```

2. **Run setup script:**
   ```bash
   /path/to/todotracker/setup-project-todos.sh my-project
   ```

3. **Update MCP config** (copy from script output):
   ```json
   {
     "mcpServers": {
       "todotracker": {
         "command": "bash",
         "args": ["/absolute/path/to/todotracker/run_mcp_server.sh", "${workspaceFolder}"]
       }
     }
   }
   ```

4. **Restart Cursor IDE**

5. **Use with AI:**
   ```
   "List my todos"  # Automatically uses current project!
   ```

## Backward Compatibility

✅ **100% Backward Compatible**

- Default behavior unchanged (uses `./project.db`)
- Existing installations continue to work
- No breaking changes to API or MCP tools
- All existing features preserved

## Use Cases

### Single Project Developer
Continue using global database - no changes needed!

### Multi-Project Developer
Configure separate databases per project:
```
Frontend Project  → .todos/project.db
Backend Project   → .todos/project.db
Mobile App        → .todos/project.db
```

### Team Collaboration
Each team member can:
- Use their own todo database
- Or share a project database
- Keep project todos in version control (optional)

## Testing

All changes have been tested for:
- ✅ No linting errors
- ✅ Backward compatibility
- ✅ Environment variable handling
- ✅ Command-line argument parsing
- ✅ Database path creation
- ✅ MCP server functionality

## Examples

### Example 1: Web UI with Project Database

```bash
# Terminal 1
cd ~/projects/my-frontend
export TODOTRACKER_DB_PATH="$PWD/.todos/project.db"
python /path/to/todotracker/todotracker_webserver.py
```

### Example 2: Multiple Projects in Cursor

`~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "todotracker": {
      "command": "bash",
      "args": ["/absolute/path/to/todotracker/run_mcp_server.sh", "${workspaceFolder}"]
    }
  }
}
```

**Note:** Only ONE configuration needed! The server auto-detects which project based on Cursor's workspace folder.

### Example 3: Quick Launch Script

Each project gets a `todos.sh`:
```bash
#!/bin/bash
export TODOTRACKER_DB_PATH="/path/to/project/.todos/project.db"
cd /path/to/todotracker
python todotracker_webserver.py
```

Simply run: `./todos.sh`

## Benefits

1. **Organization**: Separate todos per project
2. **Flexibility**: One TodoTracker installation, many databases
3. **Simplicity**: Automatic setup with script
4. **Clean**: .todos/ in .gitignore by default
5. **Portable**: Share project with todos if desired

## Questions?

See:
- `README.md` - Complete usage guide
- `QUICKSTART.md` - Quick start guide
- `AI_PROGRESS_TRACKING.md` - AI progress tracking guide

## Version

**TodoTracker v1.1.0** - Per-Project Database Support

---

**Changes made on:** January 14, 2026  
**Status:** ✅ Complete and tested

