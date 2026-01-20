#!/usr/bin/env python3
"""
Launcher script for TodoTracker.

This launches the web server for any given project's todo list.
The user usually launches from within the project's directory
with todotracker_webserer.sh.

Runs both the web server and optionally displays MCP server instructions.
Supports per-project databases via TODOTRACKER_DB_PATH environment variable.
Features adaptive port management - automatically finds available ports.
"""

import sys
import os
import subprocess
import webbrowser
from pathlib import Path
import time
import signal
import atexit
import argparse

# Environment detection and setup
def setup_uv_environment():
    """Detect and setup uv environment if available."""
    try:
        import subprocess
        # Check if uv is available
        result = subprocess.run(['which', 'uv'], capture_output=True, text=True)
        if result.returncode == 0:
            # uv is available, check if we're already running under uv
            # UV_RUN_RECURSION_DEPTH is set when running under uv
            if 'UV_RUN_RECURSION_DEPTH' not in os.environ:
                # We're not running under uv, restart with uv
                print("🔄 Restarting with uv environment...")
                env = os.environ.copy()
                env['__UV_RESTARTED'] = '1'
                os.execvpe('uv', ['uv', 'run', '--script', sys.argv[0]] + sys.argv[1:], env)
    except Exception:
        # If anything fails, just continue with current environment
        pass

# Setup uv environment if available
setup_uv_environment()

# Handle --version flag early
if "--version" in sys.argv or "-v" in sys.argv:
    try:
        from src.version import __version__, SCHEMA_VERSION
        print(f"TodoTracker v{__version__}")
        print(f"Schema version: v{SCHEMA_VERSION}")
    except ImportError:
        print("Version information not available")
    sys.exit(0)

# Parse command line arguments
parser = argparse.ArgumentParser(description="TodoTracker Web Server")
parser.add_argument('-n', '--no-browser', action='store_true',
                   help='Do not open browser automatically')
args, unknown = parser.parse_known_args()

# Put the parsed args back into sys.argv for compatibility
sys.argv = [sys.argv[0]] + unknown


def check_dependencies():
    """Check if required packages are installed."""
    try:
        import fastapi
        import uvicorn
        import sqlalchemy
        import mcp
        return True
    except ImportError as e:
        print(f"❌ Missing dependency: {e.name}")
        print("\n📦 Please install dependencies:")

        # Try uv first
        try:
            import subprocess
            result = subprocess.run(['which', 'uv'], capture_output=True, text=True)
            if result.returncode == 0:
                print("   uv pip install -r requirements.txt")
                return False
        except Exception:
            pass

        # Fall back to pip options
        print("   pip install -r requirements.txt")
        print("   # or")
        print("   python -m pip install -r requirements.txt")
        print("   # or")
        print("   python3 -m pip install -r requirements.txt")
        return False


def init_database():
    """Initialize the database."""
    try:
        from src.db import init_db, get_db_path
        init_db()
        db_path = get_db_path()
        print(f"✓ Database initialized: {db_path}")
        return True
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        return False


def run_web_server(no_browser=False):
    """Run the FastAPI web server with adaptive port management."""
    from src.port_manager import (
        find_available_port, 
        register_server, 
        get_project_server,
        unregister_server
    )
    from src.db import get_db_path
    
    db_path = get_db_path()
    
    # Check if this project already has a server running
    existing = get_project_server(db_path)
    if existing:
        port = existing.get('port')
        project_name = existing.get('project_name', 'unknown')
        print("\n" + "="*60)
        print("⚠️  Server Already Running")
        print("="*60)
        print(f"\n🔍 Project: {project_name}")
        print(f"🌐 Port: {port}")
        print(f"📋 Web UI: http://localhost:{port}")
        print(f"📚 API Docs: http://localhost:{port}/docs")
        print(f"\n💡 To restart, stop the existing server first (Ctrl+C in its terminal)")
        print(f"💡 Or visit the dashboard: http://localhost:8069")
        return
    
    # Find available port
    try:
        port = find_available_port(start_port=8070)
    except RuntimeError as e:
        print(f"\n❌ Error: {e}")
        print("💡 Try closing some TodoTracker instances or check port availability")
        sys.exit(1)
    
    # Get project name
    project_name = os.environ.get("TODOTRACKER_PROJECT_NAME")
    if not project_name:
        # Try to derive from current directory or database path
        if os.environ.get("TODOTRACKER_DB_PATH"):
            project_name = Path(db_path).parent.parent.name
        else:
            project_name = Path.cwd().name
    
    print("\n" + "="*60)
    print("🚀 Starting TodoTracker Web Server")
    print("="*60)
    print(f"\n🔍 Project: {project_name}")
    print(f"🌐 Port: {port}")
    print(f"📋 Web UI: http://localhost:{port}")
    print(f"📚 API Docs: http://localhost:{port}/docs")
    print(f"📊 Dashboard: http://localhost:8069")
    print("\nPress Ctrl+C to stop the server\n")
    
    # Register server
    pid = os.getpid()
    register_server(project_name, db_path, port, pid)
    
    # Setup cleanup on exit
    def cleanup():
        unregister_server(port)
    
    atexit.register(cleanup)
    
    # Handle signals for graceful shutdown
    def signal_handler(signum, frame):
        print("\n\n🛑 Shutting down gracefully...")
        unregister_server(port)
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Open browser after a short delay (unless disabled)
    if not no_browser:
        def open_browser():
            time.sleep(2)
            webbrowser.open(f"http://localhost:{port}")

        import threading
        browser_thread = threading.Thread(target=open_browser, daemon=True)
        browser_thread.start()
    else:
        print("💡 Browser auto-open disabled (--no-browser flag used)")
    
    # Run the web server
    try:
        import uvicorn
        uvicorn.run(
            "src.web_server:app",
            host="0.0.0.0",
            port=port,
            reload=True,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n\n✓ Web server stopped")
        cleanup()
    except Exception as e:
        print(f"\n❌ Server error: {e}")
        cleanup()
        sys.exit(1)


def show_mcp_instructions():
    """Display instructions for running the MCP server."""
    print("\n" + "="*60)
    print("🤖 MCP Server Instructions")
    print("="*60)
    print("\nThe MCP server allows AI assistants (like Claude, Cursor AI)")
    print("to interact with your todos programmatically.")
    print("\n📖 To use the MCP server with Cursor:")
    print("\n1. Create a Cursor MCP settings file (if not exists):")
    print("   ~/.cursor/mcp.json")
    print("\n2. Add this configuration:")
    todotracker_root = Path(__file__).resolve().parent
    project_root = Path.cwd()
    print("""
{
  "mcpServers": {
    "todotracker": {
      "command": "bash",
      "args": ["%s/run_mcp_server.sh", "%s"]
    }
  }
}
""" % (todotracker_root, project_root))
    print("\n3. Restart Cursor IDE")
    print("\n4. The AI can now use these tools:")
    print("   - list_todos")
    print("   - get_todo")
    print("   - create_todo")
    print("   - update_todo")
    print("   - add_concern")
    print("   - create_note")
    print("   - search_todos")
    print("   - add_dependency")
    print("   - check_dependencies")
    print("\n📚 For other MCP clients, use:")
    print(f"   bash {todotracker_root}/run_mcp_server.sh \"{project_root}\"")
    print("\n" + "="*60)


def main():
    """Main entry point."""
    print("╔" + "="*58 + "╗")
    print("║" + " "*15 + "📋 TodoTracker" + " "*30 + "║")
    print("║" + " "*10 + "AI-Powered Todo Management" + " "*21 + "║")
    print("╚" + "="*58 + "╝")
    
    # Check dependencies first (before importing from src)
    if not check_dependencies():
        sys.exit(1)
    
    # Show database path info (after dependencies check)
    from src.db import get_db_path, find_project_database
    
    # Determine how the database was selected
    if "TODOTRACKER_DB_PATH" in os.environ:
        db_source = "environment variable"
    elif find_project_database():
        db_source = "auto-detected"
    else:
        db_source = "default location"
    
    print(f"\n📂 Database: {get_db_path()} ({db_source})")
    
    # Initialize database
    if not init_database():
        sys.exit(1)
    
    # Show MCP instructions
    show_mcp_instructions()
    
    # Run web server
    print("\n⏳ Starting web server in 3 seconds...")
    time.sleep(3)
    
    try:
        run_web_server(no_browser=args.no_browser)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

