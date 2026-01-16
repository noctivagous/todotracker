#!/bin/bash
# Setup script for per-project TodoTracker database
# Usage: ./setup-project-todos.sh [project-path] [options]
# Options:
#   --from-mcp-tool   Silent mode for MCP tool integration
#   --quiet           Suppress interactive prompts

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the absolute path to the todotracker installation
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TODOTRACKER_PATH="$(cd "$SCRIPT_DIR/.." && pwd)"

# Parse flags
QUIET_MODE=false
FROM_MCP=false

PROJECT_ARG=""

# Robust arg parsing (supports flags in any position)
while [ $# -gt 0 ]; do
    case "$1" in
        --from-mcp-tool)
            FROM_MCP=true
            QUIET_MODE=true
            shift
            ;;
        --quiet)
            QUIET_MODE=true
            shift
            ;;
        *)
            # First non-flag argument is treated as project path/name
            if [ -z "$PROJECT_ARG" ]; then
                PROJECT_ARG="$1"
            fi
            shift
            ;;
    esac
done

# Choose a Python runner that has TodoTracker deps available (sqlalchemy, etc.)
PY_RUNNER="python3"
if command -v uv >/dev/null 2>&1; then
    if uv run --directory "$TODOTRACKER_PATH" python3 -c "import sqlalchemy" >/dev/null 2>&1; then
        PY_RUNNER="uv"
    fi
fi
if [ "$PY_RUNNER" != "uv" ] && [ -x "$TODOTRACKER_PATH/.venv/bin/python" ]; then
    PY_RUNNER="$TODOTRACKER_PATH/.venv/bin/python"
fi

run_python() {
    if [ "$PY_RUNNER" = "uv" ]; then
        uv run --directory "$TODOTRACKER_PATH" python3 "$@"
    else
        "$PY_RUNNER" "$@"
    fi
}

# Determine project path
if [ -n "$PROJECT_ARG" ] && [ -d "$PROJECT_ARG" ]; then
    # Explicit directory provided
    PROJECT_PATH="$(cd "$PROJECT_ARG" && pwd)"
elif [ -n "$PROJECT_ARG" ] && [ "${PROJECT_ARG#--}" = "$PROJECT_ARG" ]; then
    # Argument provided but not a directory - could be project name
    echo -e "${YELLOW}⚠  Directory not found: $PROJECT_ARG${NC}"
    echo "Using current directory instead."
    PROJECT_PATH=$(pwd)
elif [ "$FROM_MCP" = true ]; then
    # MCP mode - use current directory silently
    PROJECT_PATH=$(pwd)
else
    # Interactive mode - prompt for directory
    echo ""
    echo -e "${BLUE}📁 TodoTracker Project Setup${NC}"
    echo ""
    echo "Where would you like to set up TodoTracker?"
    echo -e "${YELLOW}Current directory: $(pwd)${NC}"
    echo ""
    echo "Enter project directory path (or press Enter for current directory):"
    read -r user_input
    
    if [ -n "$user_input" ]; then
        if [ -d "$user_input" ]; then
            PROJECT_PATH="$(cd "$user_input" && pwd)"
        else
            echo -e "${RED}❌ Directory does not exist: $user_input${NC}"
            exit 1
        fi
    else
        PROJECT_PATH=$(pwd)
    fi
fi

# Determine project name
PROJECT_NAME=$(basename "$PROJECT_PATH")
TODO_DIR="$PROJECT_PATH/.todos"
TODO_DB_PATH="$TODO_DIR/project.db"

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║     Setting up TodoTracker for: $PROJECT_NAME"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check if .todos directory and database already exist
if [ -d "$TODO_DIR" ] && [ -f "$TODO_DB_PATH" ]; then
    echo -e "${YELLOW}⚠️  Existing TodoTracker database found${NC}"
    echo ""
    
    # Run version check using Python
    echo "Checking database version compatibility..."
    VERSION_CHECK=$(run_python -c "
import sys
sys.path.insert(0, '$TODOTRACKER_PATH')
try:
    from src.migrations import check_compatibility
    import json
    status = check_compatibility('$TODO_DB_PATH')
    print(json.dumps(status))
except Exception as e:
    print(json.dumps({'error': str(e)}))
")
    
    if echo "$VERSION_CHECK" | grep -q '"error"'; then
        echo -e "${RED}❌ Unable to check database version${NC}"
        echo "   Error: $(echo "$VERSION_CHECK" | python3 -c "import sys, json; print(json.load(sys.stdin).get('error', 'Unknown'))" 2>/dev/null || echo "Unknown error")"
        echo ""
        if [ "$QUIET_MODE" = true ]; then
            echo -e "${YELLOW}ℹ${NC}  Quiet/MCP mode: continuing without version check."
        else
        read -p "Continue anyway? [y/N]: " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Setup cancelled."
            exit 1
            fi
        fi
    else
        CURRENT_SCHEMA=$(echo "$VERSION_CHECK" | python3 -c "import sys, json; print(json.load(sys.stdin)['current_schema'])")
        TARGET_SCHEMA=$(echo "$VERSION_CHECK" | python3 -c "import sys, json; print(json.load(sys.stdin)['target_schema'])")
        NEEDS_MIGRATION=$(echo "$VERSION_CHECK" | python3 -c "import sys, json; print(json.load(sys.stdin)['needs_migration'])")
        NEEDS_UPGRADE=$(echo "$VERSION_CHECK" | python3 -c "import sys, json; print(json.load(sys.stdin)['needs_upgrade'])")
        
        if [ "$NEEDS_UPGRADE" = "True" ]; then
            echo -e "${RED}❌ Database is from a NEWER version of TodoTracker!${NC}"
            echo "   Database schema: v$CURRENT_SCHEMA"
            echo "   TodoTracker schema: v$TARGET_SCHEMA"
            echo ""
            echo "   Please upgrade TodoTracker to use this database."
            exit 1
        fi
        
        if [ "$NEEDS_MIGRATION" = "True" ]; then
            echo -e "${YELLOW}📋 Database migration required${NC}"
            echo "   Current schema: v$CURRENT_SCHEMA"
            echo "   Target schema:  v$TARGET_SCHEMA"
            echo ""
            if [ "$QUIET_MODE" = true ]; then
                echo -e "${YELLOW}ℹ${NC}  Quiet/MCP mode: skipping migration (run manually if desired)."
                echo "  python3 $TODOTRACKER_PATH/scripts/migrate_cli.py --migrate --db $TODO_DB_PATH"
            else
            read -p "Run migration now? [y/N]: " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                    cd "$TODOTRACKER_PATH" && run_python scripts/migrate_cli.py --migrate --db "$TODO_DB_PATH" --force
                if [ $? -eq 0 ]; then
                    echo -e "${GREEN}✓ Migration completed successfully${NC}"
                else
                    echo -e "${RED}❌ Migration failed${NC}"
                    exit 1
                fi
            else
                echo "Skipping migration. You can run it later with:"
                echo "  python3 $TODOTRACKER_PATH/scripts/migrate_cli.py --migrate --db $TODO_DB_PATH"
                fi
            fi
        else
            echo -e "${GREEN}✓ Database is up to date (schema v$CURRENT_SCHEMA)${NC}"
        fi
    fi
    echo ""
else
    # Create .todos directory
    echo -e "${BLUE}📁 Creating .todos directory...${NC}"
    mkdir -p "$TODO_DIR"
    echo -e "${GREEN}✓${NC} Created: $TODO_DIR"
fi

# Save TodoTracker installation path to config
echo -e "${BLUE}💾 Saving configuration...${NC}"
cat > "$TODO_DIR/config.json" << EOF
{
  "todotracker_path": "$TODOTRACKER_PATH",
  "project_name": "$PROJECT_NAME",
  "project_root": "$PROJECT_PATH"
}
EOF
echo -e "${GREEN}✓${NC} Configuration saved"

# Create launcher script in project root
echo -e "${BLUE}🚀 Creating launcher script...${NC}"
cat > "$PROJECT_PATH/launch_todotracker_webserver.sh" << 'LAUNCHER_EOF'
#!/bin/bash
# TodoTracker Web Server Launcher
# Auto-generated by setup-project-todos.sh

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load configuration
CONFIG_FILE="$SCRIPT_DIR/.todos/config.json"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Configuration file not found: $CONFIG_FILE"
    echo "   Please run setup-project-todos.sh first"
    exit 1
fi

# Extract TodoTracker path from config
TODOTRACKER_PATH=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['todotracker_path'])")

if [ ! -d "$TODOTRACKER_PATH" ]; then
    echo "❌ TodoTracker installation not found: $TODOTRACKER_PATH"
    echo "   Please reinstall TodoTracker or run setup-project-todos.sh again"
    exit 1
fi

# Change to project directory
cd "$SCRIPT_DIR"

# Set environment variables for this project
export TODOTRACKER_DB_PATH="$SCRIPT_DIR/.todos/project.db"
export TODOTRACKER_PROJECT_NAME="$(basename "$SCRIPT_DIR")"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Launch the web server
echo "🚀 Launching TodoTracker Web Server..."
echo "📁 Project: $TODOTRACKER_PROJECT_NAME"
echo "📂 Database: $TODOTRACKER_DB_PATH"
echo ""

# Try uv first (preferred)
if command_exists uv; then
    echo "Using uv environment..."
    # Run from TodoTracker directory to use its dependencies
    cd "$TODOTRACKER_PATH"
    exec uv run --directory "$TODOTRACKER_PATH" python todotracker_webserver.py "$@"

# Fall back to virtual environment
elif [ -f "$TODOTRACKER_PATH/.venv/bin/python" ]; then
    echo "Using virtual environment..."
    exec "$TODOTRACKER_PATH/.venv/bin/python" "$TODOTRACKER_PATH/todotracker_webserver.py" "$@"

# Fall back to system Python
elif command_exists python3; then
    echo "Using system Python3..."
    # Add TodoTracker to Python path
    export PYTHONPATH="$TODOTRACKER_PATH:$PYTHONPATH"
    exec python3 "$TODOTRACKER_PATH/todotracker_webserver.py" "$@"

# No Python found
else
    echo "❌ No Python environment found!"
    echo "Please install Python 3.10+ and set up TodoTracker properly."
    exit 1
fi
LAUNCHER_EOF

chmod +x "$PROJECT_PATH/launch_todotracker_webserver.sh"
echo -e "${GREEN}✓${NC} Created: $PROJECT_PATH/launch_todotracker_webserver.sh"

# Add to .gitignore if it exists
if [ -f .gitignore ]; then
    if ! grep -q "^\.todos/$" .gitignore; then
        echo -e "${BLUE}📝 Adding .todos/ to .gitignore...${NC}"
        echo "" >> .gitignore
        echo "# TodoTracker database" >> .gitignore
        echo ".todos/" >> .gitignore
        echo -e "${GREEN}✓${NC} Updated .gitignore"
    else
        echo -e "${YELLOW}ℹ${NC}  .todos/ already in .gitignore"
    fi
else
    echo -e "${BLUE}📝 Creating .gitignore...${NC}"
    echo "# TodoTracker database" > .gitignore
    echo ".todos/" >> .gitignore
    echo -e "${GREEN}✓${NC} Created .gitignore"
fi

echo ""
echo -e "${GREEN}✓ Setup complete!${NC}"

# Output JSON for MCP tool integration
if [ "$FROM_MCP" = true ]; then
    cat << EOF
{
  "success": true,
  "project_name": "$PROJECT_NAME",
  "project_path": "$PROJECT_PATH",
  "database_path": "$TODO_DB_PATH",
  "message": "TodoTracker initialized successfully"
}
EOF
    exit 0
fi

# Regular output for human users
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}📋 Todo database location:${NC}"
echo "   $TODO_DB_PATH"
echo ""
echo -e "${BLUE}🔧 To launch the web server:${NC}"
echo ""
echo -e "${GREEN}✨ Use the project launcher script:${NC}"
echo ""
echo "   cd $PROJECT_PATH"
echo "   ./launch_todotracker_webserver.sh"
echo ""
echo "   This launcher:"
echo "   • Uses your project's TodoTracker configuration"
echo "   • Automatically points to: $TODO_DB_PATH"
echo "   • Can be run from the project root"
echo ""
echo -e "${YELLOW}Note:${NC} The launcher script can also be run from any subdirectory"
echo "      and will automatically find your project's database."
echo ""
echo -e "${BLUE}🤖 To use with Cursor MCP:${NC}"
echo ""
echo -e "${GREEN}✨ Universal single-server configuration!${NC}"
echo "Add this ONE configuration to ~/.cursor/mcp.json (works for ALL projects):"
echo ""
cat << EOF
{
  "mcpServers": {
    "todotracker": {
      "command": "bash",
      "args": [
        "$TODOTRACKER_PATH/run_mcp_server.sh",
        "${workspaceFolder}"
      ]
    }
  }
}
EOF
echo ""
echo -e "${YELLOW}Note:${NC} This config does not rely on the MCP client's \"cwd\" setting."
echo "      It passes your workspace folder to TodoTracker, which then uses"
echo "      <workspace>/.todos/project.db for that project."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}💡 Advanced: Override auto-detection${NC}"
echo ""
echo "  If you need to use a specific database path, set:"
echo "  export TODOTRACKER_DB_PATH=\"/path/to/your/database.db\""
echo ""

