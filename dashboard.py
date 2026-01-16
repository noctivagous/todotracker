#!/usr/bin/env python3
"""
TodoTracker Dashboard
Runs on port 8069 and displays all active TodoTracker instances.
Automatically stops and restarts if already running.
"""

import sys
import os
import signal
import atexit
import time
from pathlib import Path

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

# Add src directory to path
sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import uvicorn

from src.port_manager import (
    get_all_servers,
    cleanup_stale_servers,
    register_server,
    unregister_server,
    kill_dashboard_if_running,
    is_port_available
)


# Initialize FastAPI app
app = FastAPI(
    title="TodoTracker Dashboard",
    description="Central dashboard for all TodoTracker instances",
    version="1.0.0"
)

# Mount static files and templates
try:
    app.mount("/static", StaticFiles(directory="static"), name="static")
except Exception:
    pass  # Static directory might not exist or already mounted

templates = Jinja2Templates(directory="templates")


@app.get("/", response_class=HTMLResponse)
async def dashboard_home(request: Request):
    """Main dashboard page showing all running TodoTracker servers."""
    servers = get_all_servers()
    
    # Sort by port number
    servers.sort(key=lambda x: x.get("port", 0))
    
    # Calculate summary stats
    total_servers = len(servers)
    running_servers = sum(1 for s in servers if s.get("is_running", False))
    
    return templates.TemplateResponse(
        "dashboard.html",
        {
            "request": request,
            "servers": servers,
            "total_servers": total_servers,
            "running_servers": running_servers,
        }
    )


@app.get("/api/servers", response_model=list)
async def api_get_servers():
    """API endpoint to get all servers as JSON."""
    servers = get_all_servers()
    return servers


@app.get("/api/cleanup")
async def api_cleanup():
    """API endpoint to manually trigger cleanup of stale servers."""
    servers = cleanup_stale_servers()
    return {
        "message": "Cleanup completed",
        "active_servers": len(servers)
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "todotracker-dashboard",
        "port": 8069
    }


@app.on_event("startup")
async def startup_event():
    """Initialize on startup."""
    print("✓ TodoTracker Dashboard initialized")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    print("✓ TodoTracker Dashboard shutting down")
    unregister_server(8069)


def main():
    """Main entry point."""
    print("╔" + "="*58 + "╗")
    print("║" + " "*12 + "📊 TodoTracker Dashboard" + " "*22 + "║")
    print("║" + " "*10 + "Multi-Project Server Manager" + " "*19 + "║")
    print("╚" + "="*58 + "╝")
    
    # Check if port 8069 is already in use
    if not is_port_available(8069):
        print("\n🔄 Port 8069 is in use. Attempting to stop existing dashboard...")
        kill_dashboard_if_running()
        
        # Double-check port is now available
        if not is_port_available(8069):
            print("\n❌ Error: Could not free port 8069")
            print("💡 Another process might be using it. Try manually stopping it:")
            print("   sudo lsof -ti:8069 | xargs kill -9")
            sys.exit(1)
    
    print("\n" + "="*60)
    print("🚀 Starting TodoTracker Dashboard")
    print("="*60)
    print(f"\n📊 Dashboard URL: http://localhost:8069")
    print(f"🌐 API Docs: http://localhost:8069/docs")
    print("\nThe dashboard shows all running TodoTracker instances.")
    print("Press Ctrl+C to stop the dashboard\n")
    
    # Register dashboard server
    pid = os.getpid()
    register_server("TodoTracker Dashboard", "dashboard", 8069, pid)
    
    # Setup cleanup on exit
    def cleanup():
        unregister_server(8069)
    
    atexit.register(cleanup)
    
    # Handle signals for graceful shutdown
    def signal_handler(signum, frame):
        print("\n\n🛑 Shutting down dashboard gracefully...")
        unregister_server(8069)
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Run the dashboard server
    try:
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=8069,
            reload=False,  # Disable reload for dashboard
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n\n✓ Dashboard stopped")
        cleanup()
    except Exception as e:
        print(f"\n❌ Dashboard error: {e}")
        cleanup()
        sys.exit(1)


if __name__ == "__main__":
    main()

