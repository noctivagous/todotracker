# 📋 TodoTracker with MCP Server


Description

TodoTracker is an AI-powered todo management system with **Model Context Protocol (MCP)** integration for agentic code editors (AI assistants like Claude, Windsurf, Cursor IDE, Codex, etc. ) plus a web UI for manual management.

Use the power of AI to enter todos in the AI chat of the agentic IDE


Purpose

When using AI to make code, the software development process changes.  The software developer spends more time on planning
and todo lists: making features, functionality, and issue descriptions large and small.  Integrating this with AI
chat allows the power of AI to bring in different considerations into the to-dos that were previously made manually, 
which then allows the software developer to review them before instructing the AI to implement them.



How It Works

Each project gets its own isolated todo database. The installation creates the .todo directory
if it doesn't exist and puts a project.db file in it.  The MCP server is passed the path to this
db and uses it to make and update todos according to your commands.



Benefits

You can take todos you typed out previously in a plain text file, paste them into the chat, and instruct 
the AI to put them in the database and it will do that.  Then you can use the web UI to add and edit
anything.

You can ask the AI to carry out any tasks in the database. If you put notes in the task, the AI will see it 
and use it during work.

You can have AI analyze requirements for any todos and add notes to them
after doing research.  ("Research [todo item] and add notes it about how to do it").

You can have it make todos by itself with any kind of command: "Go through the project
and look for ... and make todos."  Then afterwards, you can inspect the todos it made
in the web ui and edit them.   Then you can have it carry out those todos.

Short todos you tell the AI to add to the database will be automatically expanded by it with improved
descriptions, with more accurate and specific terms than you would want to bother coming up with for just a 
todo item, resulting in a readable todo directory as if you had an expert team member working with you.

You can tell your AI to carry out entire categories of todos and it will retrieve them,
execute them, then mark them as completed.  If something isn't completed fully, the AI
is provided fields to update what is finished and what is not.

You can use AI to update the todo list for you in whatever way you need.  It will automatically
fill in the provided "work completed", "work remaining", and "implementation issues" after
doing work, and this allows you to keep track of a partially completed or larger task.  

For AI research that shouldn't turn immediately into a todo item, you can have it do research
add the results to the "notes" section, such as a generated report on how to execute a feature or the status
of the code base.  This allows you to come back later.

Reference multiple todo items in an instruction and the AI can update them.


## 🌟 Key Features

- **Per-Project Databases**: Each project has its own `.todos/project.db` - isolated and organized
- **Adaptive Port Management**: No more "Address already in use" errors - automatic port allocation (8070+)
- **Multi-Project Dashboard**: Central dashboard on port 8069 to monitor all running TodoTracker instances
- **AI Integration**: MCP server lets AI assistants manage todos intelligently  
- **Progress Tracking**: Three dedicated fields for AI to log work completed, remaining, and issues
- **Execution Queue (Active Work Only)**: The `queue` field only applies to todos in `pending` or `in_progress`. If a todo becomes `completed`/`cancelled`, its `queue` is automatically cleared (set to `0`) and the queue control is disabled on the detail page.
- **Hierarchical Todos**: Unlimited subtasks and concerns
- **Modern Web UI**: Beautiful, responsive interface with automatic port selection
- **Smart Organization**: Categories (feature/functionality, issue, bug), status tracking, topics, and tags.
      Feature/Functionality - covers major features and minor functionality.
      Issue - Covers bugs, overall comments on the project.
      Bugs - For small glitches.
- **Dependencies**: Define and track task dependencies
- **Notes**: Attach context and updates to any todo

## 🔗 Understanding Dependencies

**What Are Todo Dependencies?**

Dependencies let you specify that one todo must be completed before another can start.

**Example:**

- **Todo A**: "Design the database schema"
- **Todo B**: "Implement user authentication" 
- **Todo C**: "Add login page"

You can mark:
- Todo B **depends on** Todo A (can't implement auth until the schema is designed)
- Todo C **depends on** Todo B (can't build the login page until auth is implemented)

**How It Works:**

1. **Create a dependency**: "Todo B depends on Todo A"
   - Todo A is the prerequisite (must be done first)
   - Todo B is blocked until Todo A is completed

2. **Check dependencies**: Before starting Todo B, the system checks if Todo A is done
   - If Todo A is completed → Todo B can be worked on
   - If Todo A is not completed → Todo B is blocked

**Practical Use:**

- **Project planning**: Enforce task order
- **Visibility**: See which tasks are ready vs. blocked
- **AI assistance**: Help prioritize work
- **Automation**: Check readiness before starting tasks

## 📖 Documentation

- **[INSTALLATION.md](docs/INSTALLATION.md)** - Detailed installation guide for all environments
- **[QUICKSTART.md](docs/QUICKSTART.md)** - Get running in 3 minutes
- **[ADAPTIVE_PORTS.md](docs/ADAPTIVE_PORTS.md)** - Multi-project port management & dashboard
- **[AI_PROGRESS_TRACKING.md](docs/AI_PROGRESS_TRACKING.md)** - How AI tracks work on tasks

## 🏗️ Architecture

```
┌─────────────────┐         ┌──────────────────┐
│   Web Browser   │────────▶│   Web Server     │
│   (Human UI)    │         │   (FastAPI)      │
└─────────────────┘         └──────────────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
┌─────────────────┐         │   SQLite DB      │
│  Agentic IDE    │         │   (WAL mode)     │
│  (AI Agent)     │         └──────────────────┘
└─────────────────┘                  ▲
         │                           │
         ▼                           │
┌─────────────────┐                  │
│   MCP Server    │──────────────────┘
│   (stdio)       │
└─────────────────┘
```


## 📦 Installation

### Prerequisites

- Python 3.10 or higher
- pip, pipx, or uv (package manager)



### Install Dependences


```bash
# Option 1: Using uv (fastest, recommended for 2026)
uv pip install -r requirements.txt

# Option 2: Using pip with --user (PEP 668 compliant)
pip install --user -r requirements.txt

# Option 3: In a virtual environment
python3 -m venv venv
source venv/bin/activate  # On Linux/Mac
pip install -r requirements.txt
```



## 🚀 Quick Start

### 1. Set Up Your Project


**Option A: Manual Setup**

```bash
# Navigate to your project
cd /path/to/your/project

# Run the setup script (interactive or with project path)
/path/to/todotracker/scripts/setup-project-todos.sh

# Or specify a project path:
/path/to/todotracker/scripts/setup-project-todos.sh /path/to/your/project

# This creates:
#   - .todos/project.db (your project's todo database)
#   - Updates .gitignore
```

**Option B: Automatic Setup (via MCP)**

Go to 4. AI Integration (MCP Configuration)
and install the MCP server in your agentic code editor.

See Step 4 below for configuration examples for:
- Cursor IDE
- Claude Desktop
- Windsurf
- Generic MCP clients

You can simply say "set up a todo tracker for this project and 
launch the web server" and the AI will handle both steps automatically.

Then TodoTracker auto-sets up each project on first use.


When you open a project, TodoTracker automatically creates `.todos/project.db`!



### 2. Launch the Web UI

```bash
# From your project directory
python /path/to/todotracker/todotracker_webserver.py
```

The web UI opens at an available port (8070+) showing your project's todos.

### 3. Monitor Multiple Projects (Optional)

Run the **TodoTracker Dashboard** to see all running instances:

```bash
python /path/to/todotracker/dashboard.py
```

The dashboard opens at **http://localhost:8069** and shows:
- All running TodoTracker servers
- Port assignments for each project
- Quick links to access each project's UI

### 4. AI Integration (MCP Configuration)

Configure your MCP client to use TodoTracker. Examples for different tools:

**Cursor IDE** (`~/.cursor/mcp.json`):
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

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):
```json
{
  "mcpServers": {
    "todotracker": {
      "command": "python",
      "args": ["/absolute/path/to/todotracker/src/mcp_server.py"],
      "env": {
        "TODOTRACKER_DB_PATH": "${workspaceFolder}/.todos/project.db"
      }
    }
  }
}
```

**Windsurf** (`~/.windsurf/mcp.json`):
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
      "args": [
        "-c",
        "cd \"$PROJECT_DIR\" && python /absolute/path/to/todotracker/src/mcp_server.py"
      ]
    }
  }
}
```

**Note:** TodoTracker no longer relies on the MCP client's `cwd` to determine the project.
If your client supports workspace variables, pass the workspace/project root as the
second argument to `run_mcp_server.sh` (examples above).

After configuration, restart your IDE/client and ask:
```
"Create a feature todo for implementing user authentication"
"What should I work on next?"
"Mark todo #5 as completed"
```

The AI automatically:
- ✅ Sets up new projects on first use
- ✅ Finds your project's database
- ✅ Tracks progress on tasks
- ✅ Manages subtasks and dependencies

## 🎯 How Per-Project Databases Work

### Automatic Detection

The MCP server automatically finds your project's database:

1. **Cursor opens your project** (e.g., `/home/user/projects/my-app`)
2. **MCP server looks for** `.todos/project.db` in that folder
3. **If not found**, walks up parent directories to find it
4. **AI works with that database** - no configuration needed per project!

### File Structure

```
your-project/
├── .todos/
│   └── project.db          # Your project's todos (SQLite)
├── .gitignore              # .todos/ added here
├── src/
└── ...
```

### Multiple Projects

Each project is completely isolated:

```bash
# Example: Recipe sharing website project
cd ~/projects/recipe-sharing-app
./todos_webserver.sh  # Shows recipe-sharing-app todos on port 8070

# Example: API service project  
cd ~/projects/payment-gateway-api
./todos_webserver.sh  # Shows payment-gateway-api todos on port 8071

# Example: Mobile application project
cd ~/projects/fitness-tracker-app
./todos_webserver.sh  # Shows fitness-tracker-app todos on port 8072
```

## 🚀 Adaptive Port Management

TodoTracker automatically manages ports across multiple projects:

### How It Works

- **Ports 8070+**: Automatically assigned to projects
- **Port 8069**: Reserved for the TodoTracker Dashboard (Optionally Launched)
- **No Conflicts**: If a port is busy, the system tries the next one (8070 → 8071 → 8072...)
- **Project Detection**: Running the same project twice connects to the existing server instead of starting a new one

### The Dashboard

The **TodoTracker Dashboard** runs on port **8069** and provides:

✅ **Overview** of all running TodoTracker instances  
✅ **Port assignments** for each project  
✅ **Quick access** links to each project's UI  
✅ **Status monitoring** with uptime tracking  
✅ **Auto-cleanup** of stale server entries  

```bash
# Start the dashboard
python /path/to/todotracker/dashboard.py

# Visit http://localhost:8069
```

### Server Registry

TodoTracker maintains a registry at `~/.todotracker/servers.json` tracking:
- Active server ports and PIDs
- Project names and database paths
- Start times and health status

This enables seamless multi-project workflows without port conflicts!

Switch projects in Cursor, and the AI automatically switches to that project's todos!

## 🤖 Using with AI (Cursor IDE)

### Creating Todos

```
You: Create a feature todo for implementing the user profile page 
     with avatar upload and crop functionality.

AI: ✓ Created: "Implement user profile page with avatar upload"
    - Category: feature
    - Status: pending
```

### Creating Subtasks

```
You: Add subtasks to that todo:
     - Design profile layout
     - Implement avatar upload
     - Add image cropping UI
     - Connect to backend API

AI: ✓ Created 4 subtasks under "Implement user profile page"
```

### Tracking Progress

The AI automatically tracks its work using three progress fields:

```
You: I've finished the avatar upload implementation. Update the subtask.

AI: ✓ Updated: "Implement avatar upload"
    - Status: completed
    - Work Completed: Implemented file upload with drag-drop, 
      added validation (max 5MB, jpg/png), integrated with S3 storage
    - Work Remaining: None
```

### Querying Todos

```
You: What pending bugs do I have?

AI: Here are your pending bugs:
    1. [Bug] Database connection timeout - Status: pending
    2. [Bug] API rate limiting not working - Status: pending
    3. [Bug] Memory leak in worker process - Status: pending
```

### Checking Status

```
You: Give me an overview of my todos.

AI: Project: /home/user/projects/my-app
    - Total: 15 todos
    - Completed: 8 (53%)
    - In Progress: 3
    - Pending: 4
```

## 🌐 Web UI Features

Access at **http://localhost:8070** (after running `python /path/to/todotracker/todotracker_webserver.py`)

### GUI Layout (SPA)

TodoTracker’s main UI is a Calcite-based single-page app with a **master/detail layout**:

- **Header**
  - **Status segmented control (with counts)**: `All / Pending / In Progress / Completed / Cancelled / Queue`  
    Selecting one updates **both** the left list panel and the main panel.
  - **Secondary navigation (`navigation-secondary`)**
    - **Search** (`Enter`): runs a full-text search and updates both panels.
    - **Filter (live)**: a lightweight, client-side filter that narrows results in both panels without leaving the page.

- **Left panel (browser/list panel)**
  - **List-only** view for quickly selecting a todo to open in the detail drawer.
  - **Minimize/expand toggle**: collapses the panel down to a narrow width so you can use the main panel as a “single page” browsing experience, then expand the list when needed.

- **Main panel**
  - **View mode control**: `Grid | List | Table` (replaces the old top-of-page status buttons).
  - **Pagination**: the main panel is paginated; use the pagination control at the bottom to navigate pages.

### Main Pages

- **Home (/)** - Hierarchical todo tree with live statistics
- **Todo Detail (/todo/{id})** - Full info, subtasks, notes, dependencies
- **Notes (/notes)** - All notes (linked and standalone)
- **API Docs (/docs)** - Interactive API documentation

### Todo Management

- ✅ Create, update, delete todos
- 📝 Add descriptions and notes
- 🏷️ Assign categories: feature/functionality, issue, bug
- 📊 Track status: pending, in_progress, completed, cancelled
- 🔗 Create subtasks (unlimited nesting)
- 📎 Add dependencies between todos
- 🏷️ Organize with topics and tags
- 📈 View progress tracking (work completed, remaining, issues)

## 📊 MCP Tools Available

The AI can use these tools:

| Tool | Description |
|------|-------------|
| `list_todos` | Get hierarchical list of all todos |
| `get_todo` | Get detailed info about a specific todo |
| `get_todos_batch` | Get detailed info about multiple todos by ID in one call |
| `create_todo` | Create a new todo or subtask |
| `create_todos_batch` | Create multiple todos/subtasks in one call |
| `add_concern` | Add a concern under a todo |
| `update_todo` | Update todo status, progress, etc. |
| `update_todos_batch` | Update multiple todos in one call |
| `create_note` | Create a note (linked or standalone) |
| `get_notes_batch` | Get multiple notes by ID in one call |
| `create_notes_batch` | Create multiple notes in one call |
| `update_note` | Update a note's content (and/or associated todo_id) |
| `delete_note` | Delete a note by ID |
| `search_todos` | Search/filter todos by criteria |
| `add_dependency` | Create dependency between todos |
| `add_dependencies_batch` | Create multiple dependency relationships in one call |
| `check_dependencies` | Check if todo dependencies are met |

### MCP batch “get” examples

```json
// Get several todos at once (reduces repetitive get_todo calls)
{
  "tool": "get_todos_batch",
  "args": {
    "project_root": "/path/to/project",
    "todo_ids": [10, 13, 14],
    "include_dependency_status": true,
    "include_dependencies": true
  }
}
```

```json
// Get several notes at once (reduces repetitive get_note/get_notes calls)
{
  "tool": "get_notes_batch",
  "args": {
    "project_root": "/path/to/project",
    "note_ids": [1, 4, 7]
  }
}
```

### MCP Resources

| Resource | Description |
|----------|-------------|
| `todos://tree` | Complete hierarchical todo tree |
| `todos://stats` | Statistics about todos |

## 🔧 Advanced Usage

### Custom Database Location

```bash
# Use any location
export TODOTRACKER_DB_PATH="/custom/path/todos.db"
python /path/to/todotracker/todotracker_webserver.py
```

### Project Aliases

Add to `~/.bashrc` or `~/.zshrc`:

```bash
alias fe-todos='cd ~/projects/frontend && python /path/to/todotracker/todotracker_webserver.py'
alias be-todos='cd ~/projects/backend && python /path/to/todotracker/todotracker_webserver.py'
alias app-todos='cd ~/projects/mobile && python /path/to/todotracker/todotracker_webserver.py'
```

### Backup Project Todos

```bash
# Backup
cp .todos/project.db .todos/backup-$(date +%Y%m%d).db

# Restore
cp .todos/backup-20260115.db .todos/project.db
```

### Share Todos with Team

The database is just a file! Options:

1. **Commit to git**: Remove `.todos/` from `.gitignore`
2. **Share file directly**: Send `.todos/project.db`
3. **Sync via cloud**: Dropbox, Google Drive, etc.

⚠️ **Note**: SQLite doesn't handle concurrent writes well over networks. For team use:
- One person runs the web server
- Others access via web UI
- Or each person maintains their own database

## 🧪 Development Database

**Note:** When you run `python todotracker_webserver.py` directly in the todotracker directory without setting `TODOTRACKER_DB_PATH`, it uses `./data/project.db` as a **development/testing database**. This is intentional for testing TodoTracker itself, not for managing your actual project todos.

To use TodoTracker for your projects:
1. Run the setup script in your project directory
2. Run `python todotracker_webserver.py` from your project directory (auto-detects `.todos/project.db`)
3. Or set `TODOTRACKER_DB_PATH` to your project's `.todos/project.db`

## 📋 Database Schema

### Core Tables

**todos**
- Hierarchical structure (parent_id)
- Categories: feature/functionality, issue, bug
- Status: pending, in_progress, completed, cancelled
- Progress tracking: work_completed, work_remaining, implementation_issues
- Topics and tags for organization

**notes**
- Can be linked to todos or standalone
- Full-text content with timestamps

**todo_dependencies**
- Define task dependencies
- Check if prerequisites are met

**tags**
- Reusable tags for organization
- 34 stock tags pre-populated

## 📁 Project Structure

```
todotracker/
├── src/                    # Python source code
│   ├── crud.py             # Database operations
│   ├── db.py               # SQLAlchemy models
│   ├── schemas.py          # Pydantic schemas
│   ├── web_server.py       # FastAPI web server
│   ├── mcp_server.py       # MCP server for AI
│   ├── migrations.py       # Database migrations
│   └── version.py          # Version tracking
├── scripts/                # Utility scripts
│   ├── setup-project-todos.sh
│   └── migrate_cli.py
├── docs/                   # Documentation
├── data/                   # Development database
├── templates/              # Jinja2 HTML templates
├── static/                 # CSS/JS assets
├── todotracker_webserver.py              # Main launcher
└── requirements.txt        # Python dependencies
```

## 🔒 Security

- **Local Only**: Servers run on localhost by default
- **No Authentication**: Designed for single-user, local use
- **MCP Consent**: Cursor shows prompts for AI tool invocations
- **SQLite WAL**: Safe concurrent access between web UI and MCP

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Kill process on port 8070
lsof -ti:8070 | xargs kill -9
```

### MCP Not Connecting

1. Check `~/.cursor/mcp.json` has absolute paths
2. Test manually: `bash /path/to/todotracker/run_mcp_server.sh "$(pwd)"`
3. Check Cursor's MCP logs (Help → Show MCP Logs)
4. Restart Cursor IDE

### Database Issues

```bash
# Check database version
python scripts/migrate_cli.py --check

# Run migration if needed
python scripts/migrate_cli.py --migrate

# Verify version
python todotracker_webserver.py --version
```

### AI Not Finding Project Database

1. Ensure `.todos/project.db` exists in your project
2. Check Cursor is opened to correct folder
3. Verify MCP config passes your workspace folder to `run_mcp_server.sh` (and does not rely on `cwd`)

## 🎯 Common Workflows

### Starting a New Project

```bash
# 1. Navigate to project
cd ~/projects/my-new-app

# 2. Initialize todos
/path/to/todotracker/scripts/setup-project-todos.sh

# 3. Launch web UI
python /path/to/todotracker/todotracker_webserver.py

# 4. Or use AI in Cursor/Claude/Windsurf
"Create a todo for setting up the project structure"
```

### Daily Development

```bash
# Check todos in web UI
python /path/to/todotracker/todotracker_webserver.py

# Or ask AI
"What should I work on next?"
"Mark todo #5 as in progress"
"I've completed the API endpoint, update todo #7"
```

### Switching Projects

```bash
# No special steps needed!
cd ~/projects/frontend  # AI uses frontend todos
cd ~/projects/backend   # AI uses backend todos
```

## 💡 Best Practices

1. **Run setup script** for each project (one-time)
2. **Use descriptive titles** - helps AI understand context
3. **Break down complex features** into subtasks
4. **Let AI track progress** - it updates work_completed, work_remaining, issues
5. **Use topics and tags** to organize related todos
6. **Add concerns** when you spot potential issues
7. **Check dependencies** before starting work
8. **Review in web UI** for visual overview

## 🤝 Contributing

Contributions welcome! Check out [docs/futurefeatures.txt](docs/futurefeatures.txt) for ideas.

## 📄 License

MIT License

## 🙏 Acknowledgments

- **Anthropic** - Model Context Protocol
- **FastAPI** - Web framework
- **Tailwind CSS** - UI styling
- **SQLAlchemy** - Database ORM
- **HTMX** - Interactive UI

## 📚 Resources

- [Model Context Protocol Docs](https://modelcontextprotocol.io)
- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk)
- [FastAPI Documentation](https://fastapi.tiangolo.com)

---

**Made with ❤️ for developers who want AI assistance with their todos**

**Current Version**: 1.1.0 (Schema v3)
