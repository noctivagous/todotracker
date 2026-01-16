#!/usr/bin/env bash
# Wrapper script to run the MCP server with the correct Python environment

set -e  # Exit on any error

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Preserve the original working directory (the project directory when launched by MCP)
ORIGINAL_CWD="$(pwd)"

# Allow passing the project root (directory) OR an explicit db path as the first argument (recommended).
# This avoids relying on the MCP client's "cwd" setting and works even when the server is launched from
# a sandboxed cwd (e.g. uv/uvx caches).
PROJECT_ROOT="${ORIGINAL_CWD}"

# If set by the client/config, prefer it (Cursor/Cline can expand ${workspaceFolder} into env/cwd).
if [ -n "${TODOTRACKER_PROJECT_ROOT:-}" ] && [ -d "${TODOTRACKER_PROJECT_ROOT}" ]; then
    PROJECT_ROOT="$(cd "${TODOTRACKER_PROJECT_ROOT}" && pwd)"
fi

# Some MCP clients/documentation use template variables for workspace paths.
# If the client fails to expand them, we must NOT treat them as real paths.
is_unexpanded_workspace_template() {
    case "${1:-}" in
        *'{{workspaceFolder}}'*|*'${workspaceFolder}'*|*'${workspaceRoot}'*)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

looks_like_project_db_path() {
    case "${1:-}" in
        */.todos/project.db) return 0 ;;
        *) return 1 ;;
    esac
}

first_existing_dir_from_list() {
    # Accept common separators: newline, ':', ';', ','
    # Returns first existing directory on stdout; empty if none found.
    local raw="${1:-}"
    [ -z "${raw}" ] && return 1

    # Convert separators to newlines for iteration
    raw="${raw//:/$'\n'}"
    raw="${raw//;/$'\n'}"
    raw="${raw//,/$'\n'}"

    while IFS= read -r p; do
        [ -z "${p}" ] && continue
        if [ -d "${p}" ]; then
            (cd "${p}" && pwd)
            return 0
        fi
    done <<< "${raw}"
    return 1
}

# Best-effort fallback: some launchers export a list of workspace roots.
if [ -z "${TODOTRACKER_PROJECT_ROOT:-}" ] && [ -n "${WORKSPACE_FOLDER_PATHS:-}" ]; then
    if ws="$(first_existing_dir_from_list "${WORKSPACE_FOLDER_PATHS}")"; then
        PROJECT_ROOT="${ws}"
    fi
fi

if [ $# -gt 0 ]; then
    if is_unexpanded_workspace_template "$1"; then
        echo "⚠️  TodoTracker MCP: workspace path argument appears unexpanded: '$1'" >&2
        echo "   Your MCP client likely did not substitute the workspace variable." >&2
        echo "   Configure it to pass an absolute project path, or set TODOTRACKER_DB_PATH." >&2
        shift
    elif looks_like_project_db_path "$1"; then
        # Accept explicit db paths; infer root as <project>/.todos/project.db -> <project>
        PROJECT_ROOT="$(cd "$(dirname "$(dirname "$1")")" && pwd)"
        export TODOTRACKER_DB_PATH="$(cd "$(dirname "$1")" && pwd)/project.db"
        shift
    elif [ -d "$1" ]; then
        PROJECT_ROOT="$(cd "$1" && pwd)"
        shift
    fi
fi

# Debug / validation mode: print what we resolved and exit.
if [ "${1:-}" = "--detect-only" ]; then
    shift
    if [ -z "${TODOTRACKER_DB_PATH:-}" ]; then
        export TODOTRACKER_DB_PATH="${PROJECT_ROOT}/.todos/project.db"
    fi
    cat >&2 <<EOF
TodoTracker MCP detection:
  ORIGINAL_CWD=${ORIGINAL_CWD}
  SCRIPT_DIR=${SCRIPT_DIR}
  PROJECT_ROOT=${PROJECT_ROOT}
  TODOTRACKER_PROJECT_ROOT=${TODOTRACKER_PROJECT_ROOT:-}
  WORKSPACE_FOLDER_PATHS=${WORKSPACE_FOLDER_PATHS:-}
  TODOTRACKER_DB_PATH=${TODOTRACKER_DB_PATH}
EOF
    exit 0
fi

# Export project root for the Python server (it will derive DB paths from this).
export TODOTRACKER_PROJECT_ROOT="${PROJECT_ROOT}"

# Always set the project database path based on the original CWD (workspace folder).
# This is critical because after `cd` to the script directory, the MCP server would
# otherwise auto-detect from the todotracker installation directory instead of the
# user's project. We set this even if the file doesn't exist yet - init_db() will
# create it when needed.
#
# If we couldn't determine a project root (common when the client runs this script
# from the TodoTracker installation directory), fail fast instead of silently using
# TodoTracker's own .todos/project.db.
if [ -z "${TODOTRACKER_DB_PATH:-}" ] && [ "${PROJECT_ROOT}" = "${SCRIPT_DIR}" ]; then
    echo "❌ TodoTracker MCP: could not determine your project root." >&2
    echo "   The MCP process started in the TodoTracker install directory:" >&2
    echo "     ${SCRIPT_DIR}" >&2
    echo "   Fix your MCP config to pass your workspace path as an argument, e.g.:" >&2
    echo "     \"cwd\": \"\${workspaceFolder}\"," >&2
    echo "     \"args\": [\"${SCRIPT_DIR}/run_mcp_server.sh\", \"\${workspaceFolder}\"]" >&2
    echo "   Or set TODOTRACKER_DB_PATH to an absolute .db file." >&2
    exit 2
fi

if [ -z "${TODOTRACKER_DB_PATH:-}" ]; then
    export TODOTRACKER_DB_PATH="${PROJECT_ROOT}/.todos/project.db"
fi

# Change to the todotracker directory (so imports and relative paths work)
cd "${SCRIPT_DIR}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if dependencies are installed
check_dependencies() {
    local python_cmd="$1"
    echo "Checking dependencies..."

    # Try to import required modules
    if ! "$python_cmd" -c "import mcp, fastapi, sqlalchemy, uvicorn" 2>/dev/null; then
        echo "❌ Required dependencies not found."
        echo "Please install dependencies first:"
        echo ""
        echo "Option 1 (recommended): uv pip install -r requirements.txt"
        echo "Option 2: pip install -r requirements.txt"
        echo "Option 3: python -m pip install -r requirements.txt"
        echo ""
        exit 1
    fi

    echo "✅ Dependencies are installed."
}

# Try uv first (preferred)
if command_exists uv; then
    echo "Using uv environment..."

    # Check if dependencies are available via uv (run from TodoTracker directory)
    if ! uv run --directory "${SCRIPT_DIR}" python -c "import mcp, fastapi, sqlalchemy, uvicorn" 2>/dev/null; then
        echo "❌ Dependencies not available in uv environment."
        echo "Installing dependencies with uv..."
        uv pip install -r requirements.txt
    fi

    echo "Launching MCP server with uv..."
    # If we have an explicit DB path, pass it as argv[1] so the MCP server cannot
    # accidentally re-auto-detect using its own cwd.
    if [ -n "${TODOTRACKER_DB_PATH:-}" ]; then
        exec uv run --directory "${SCRIPT_DIR}" python -m src.mcp_server "${TODOTRACKER_DB_PATH}" "$@"
    fi
    exec uv run --directory "${SCRIPT_DIR}" python -m src.mcp_server "$@"

# Fall back to virtual environment
elif [ -f ".venv/bin/python" ]; then
    echo "Using virtual environment (.venv)..."

    VENV_PYTHON=".venv/bin/python"
    check_dependencies "$VENV_PYTHON"

    echo "Launching MCP server with venv..."
    if [ -n "${TODOTRACKER_DB_PATH:-}" ]; then
        exec "$VENV_PYTHON" -m src.mcp_server "${TODOTRACKER_DB_PATH}" "$@"
    fi
    exec "$VENV_PYTHON" -m src.mcp_server "$@"

# Fall back to system Python
elif command_exists python3; then
    echo "Using system Python3 (no uv or venv found)..."

    check_dependencies "python3"

    echo "Launching MCP server with system Python..."
    if [ -n "${TODOTRACKER_DB_PATH:-}" ]; then
        exec python3 -m src.mcp_server "${TODOTRACKER_DB_PATH}" "$@"
    fi
    exec python3 -m src.mcp_server "$@"

# No Python found
else
    echo "❌ No Python environment found!"
    echo ""
    echo "Please install Python 3.10+ and set up the environment:"
    echo ""
    echo "1. Install uv (recommended):"
    echo "   curl -LsSf https://astral.sh/uv/install.sh | sh"
    echo ""
    echo "2. Install dependencies:"
    echo "   uv pip install -r requirements.txt"
    echo ""
    echo "3. Or create a virtual environment:"
    echo "   python3 -m venv .venv"
    echo "   source .venv/bin/activate"
    echo "   pip install -r requirements.txt"
    echo ""
    exit 1
fi

