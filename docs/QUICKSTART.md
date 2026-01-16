# 🚀 Quick Start Guide

Get TodoTracker up and running in 3 minutes!

**For detailed information, see the [README.md](../README.md)**

## Step 1: Install Dependencies

**Quick Install (Recommended):**
```bash
cd /path/to/todotracker
./scripts/install_todotracker.sh
```

The smart installer automatically handles PEP 668, uv, pipx, venv, and more!

**Manual Install (Alternative):**
```bash
# Using uv (fast)
uv pip install -r requirements.txt

# Using pip --user (PEP 668 compliant)
pip install --user -r requirements.txt

# Using venv (traditional)
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

See [INSTALLATION.md](INSTALLATION.md) for detailed options.

## Step 2: Set Up Your Project

TodoTracker uses **per-project databases** - each project gets its own isolated todo list.

**Option A: Automatic Setup (via MCP - Easiest!)**

Configure Cursor MCP once (see Step 3), and projects auto-setup on first use!

**Option B: Manual Setup**

```bash
# Navigate to your project
cd /path/to/your/project

# Run the setup script (interactive mode)
/path/to/todotracker/scripts/setup-project-todos.sh

# Or specify project path:
/path/to/todotracker/scripts/setup-project-todos.sh /path/to/project

# Launch TodoTracker web UI
python /path/to/todotracker/todotracker_webserver.py
```

**What this does:**
- Creates `.todos/project.db` in your project directory
- Adds `.todos/` to your `.gitignore`
- Auto-detects database when you run the web server

That's it! The web UI opens at **http://localhost:8070** showing your project's todos.

## What You Get

✅ **Web Interface** at http://localhost:8070
- Beautiful UI to manage todos
- Create hierarchical todos (features/functionality, issues, bugs)
- Add notes and track progress
- View statistics and status

✅ **API Documentation** at http://localhost:8070/docs
- Interactive API explorer
- Test endpoints directly in browser

✅ **AI Integration** via MCP
- AI can create, update, and track todos
- Automatic progress tracking
- Works with your current project automatically

## First Steps in Web UI

1. **Create your first todo**
   - Click "+ New Todo" button
   - Fill in title, description, category
   - Click "Create"

2. **Add a subtask**
   - Click on a todo to view details
   - Scroll to subtasks section
   - Create subtask with parent ID

3. **Track progress**
   - View todo detail page
   - Click "Update Todo"
   - Fill in work completed, remaining, and any issues

4. **Add notes**
   - Go to todo detail page
   - Click "+ Add Note"
   - Write your note

## Step 3: AI Integration (MCP Setup)

**Universal single-server setup** - works for all projects and auto-sets them up!

### Configuration by MCP Client

**Cursor IDE** - Edit `~/.cursor/mcp.json`:
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

**Claude Desktop** - Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%/Claude/claude_desktop_config.json` (Windows):
```json
{
  "mcpServers": {
    "todotracker": {
      "command": "python",
      "args": ["/absolute/path/to/todotracker/src/mcp_server.py"]
    }
  }
}
```
*Note: Claude Desktop may need you to cd into your project first, or use TODOTRACKER_DB_PATH environment variable*

**Windsurf** - Edit `~/.windsurf/mcp.json`:
```json
{
  "mcpServers": {
    "todotracker": {
      "command": "bash",
      "args": ["/absolute/path/to/todotracker/run_mcp_server.sh", "${workspaceRoot}"]
    }
  }
}
```

**Generic MCP Client**:
```json
{
  "mcpServers": {
    "todotracker": {
      "command": "bash",
      "args": ["/absolute/path/to/todotracker/run_mcp_server.sh", "/absolute/path/to/your/project"]
    }
  }
}
```

**Important Notes:**
- Always use **absolute paths** (e.g., `/home/user/todotracker/run_mcp_server.sh`)
- Different clients use different workspace variables:
  - Cursor: `${workspaceFolder}`
  - Windsurf: `${workspaceRoot}`
  - Others: pass an absolute project path, or use environment variables

### Using It

1. Restart your IDE/client after configuration

2. Open any project and ask the AI:
   - `"Create a feature todo for user authentication"`
   - `"List all pending bugs"`
   - `"What should I work on next?"`

**Magic:** The MCP server automatically:
- ✅ Creates `.todos/project.db` if not present
- ✅ Uses your current project's database
- ✅ Switches databases when you switch projects!

## Working with Multiple Projects

Each project is isolated:

```bash
# Frontend project
cd ~/projects/frontend
python /path/to/todotracker/todotracker_webserver.py  # Shows frontend todos

# Backend project
cd ~/projects/backend
python /path/to/todotracker/todotracker_webserver.py  # Shows backend todos
```

Switch projects in Cursor, and the AI automatically switches too!

## Development/Testing Database

**Note:** If you run `python todotracker_webserver.py` directly in the todotracker directory without setting `TODOTRACKER_DB_PATH`, it uses `./data/project.db` as a development database. This is only for testing TodoTracker itself.

For your actual projects, always:
1. Run the setup script in your project directory
2. Run `python todotracker_webserver.py` from your project directory (auto-detects database)
3. Or set `TODOTRACKER_DB_PATH=/path/to/your/project/.todos/project.db`

## Troubleshooting

**Port 8070 already in use?**
```bash
lsof -ti:8070 | xargs kill -9
```

**Dependencies not installing?**
```bash
# Check Python version (need 3.10+)
python --version

# Upgrade pip
pip install --upgrade pip
```

**MCP not connecting?**
- Verify path in `~/.cursor/mcp.json` is absolute
- Test manually: `python /path/to/todotracker/src/mcp_server.py`
- Check Cursor's MCP logs (Help → Show MCP Logs)
- Restart Cursor IDE

**Need help?**
- Read the [README.md](../README.md)
- Check API docs at http://localhost:8070/docs
- View progress tracking guide: [AI_PROGRESS_TRACKING.md](AI_PROGRESS_TRACKING.md)

---

**Enjoy using TodoTracker! 📋✨**
