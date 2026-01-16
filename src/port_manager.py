"""
Port Management and Server Registry for TodoTracker.
Manages multiple TodoTracker instances across different projects.
"""

import json
import os
import socket
import psutil
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict
import fcntl
import time


# Registry file location
REGISTRY_DIR = Path.home() / ".todotracker"
REGISTRY_FILE = REGISTRY_DIR / "servers.json"


def ensure_registry_dir():
    """Ensure the registry directory exists."""
    REGISTRY_DIR.mkdir(parents=True, exist_ok=True)


def load_registry() -> Dict:
    """Load the server registry from disk."""
    ensure_registry_dir()
    
    if not REGISTRY_FILE.exists():
        return {"servers": []}
    
    try:
        with open(REGISTRY_FILE, 'r') as f:
            # Use file locking to prevent race conditions
            fcntl.flock(f.fileno(), fcntl.LOCK_SH)
            try:
                data = json.load(f)
            finally:
                fcntl.flock(f.fileno(), fcntl.LOCK_UN)
            return data
    except (json.JSONDecodeError, IOError):
        return {"servers": []}


def save_registry(registry: Dict):
    """Save the server registry to disk."""
    ensure_registry_dir()
    
    # Write to a temp file first, then atomic rename
    temp_file = REGISTRY_FILE.with_suffix('.tmp')
    
    try:
        with open(temp_file, 'w') as f:
            # Use file locking to prevent race conditions
            fcntl.flock(f.fileno(), fcntl.LOCK_EX)
            try:
                json.dump(registry, f, indent=2)
                f.flush()
                os.fsync(f.fileno())
            finally:
                fcntl.flock(f.fileno(), fcntl.LOCK_UN)
        
        # Atomic rename
        temp_file.replace(REGISTRY_FILE)
    except Exception as e:
        if temp_file.exists():
            temp_file.unlink()
        raise e


def is_port_available(port: int) -> bool:
    """Check if a port is available for binding."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            s.bind(('0.0.0.0', port))
            return True
    except OSError:
        return False


def is_process_running(pid: int) -> bool:
    """Check if a process with given PID is running."""
    try:
        process = psutil.Process(pid)
        return process.is_running()
    except (psutil.NoSuchProcess, psutil.AccessDenied):
        return False


def cleanup_stale_servers():
    """Remove registry entries for servers that are no longer running."""
    registry = load_registry()
    active_servers = []
    
    for server in registry.get("servers", []):
        pid = server.get("pid")
        port = server.get("port")
        
        # Check if process is still running
        if pid and is_process_running(pid):
            # Update heartbeat
            server["last_heartbeat"] = datetime.now().isoformat()
            active_servers.append(server)
        else:
            # Process is dead, clean up
            print(f"🧹 Cleaning up stale server entry: {server.get('project_name', 'unknown')} on port {port}")
    
    registry["servers"] = active_servers
    save_registry(registry)
    
    return active_servers


def find_available_port(start_port: int = 8070, max_attempts: int = 100) -> int:
    """
    Find the next available port starting from start_port.
    Skips port 8069 (reserved for dashboard).
    """
    cleanup_stale_servers()  # Clean up first
    
    for i in range(max_attempts):
        port = start_port + i
        
        # Skip port 8069 (reserved for dashboard)
        if port == 8069:
            continue
        
        # Check if port is available
        if is_port_available(port):
            return port
    
    raise RuntimeError(f"No available ports found in range {start_port}-{start_port + max_attempts}")


def get_project_server(db_path: str) -> Optional[Dict]:
    """
    Check if a server is already running for this project database.
    Returns server info if found, None otherwise.
    """
    cleanup_stale_servers()
    registry = load_registry()
    
    # Normalize the database path for comparison
    db_path_normalized = str(Path(db_path).resolve())
    
    for server in registry.get("servers", []):
        server_db_path = str(Path(server.get("db_path", "")).resolve())
        
        if server_db_path == db_path_normalized:
            # Verify process is still running
            if is_process_running(server.get("pid")):
                return server
    
    return None


def register_server(project_name: str, db_path: str, port: int, pid: int):
    """Register a running server in the registry."""
    registry = load_registry()
    
    # Remove any existing entry for this port or db_path
    servers = [s for s in registry.get("servers", []) 
               if s.get("port") != port and str(Path(s.get("db_path", "")).resolve()) != str(Path(db_path).resolve())]
    
    # Add new entry
    now = datetime.now().isoformat()
    servers.append({
        "project_name": project_name,
        "db_path": str(Path(db_path).resolve()),
        "port": port,
        "pid": pid,
        "started_at": now,
        "last_heartbeat": now
    })
    
    registry["servers"] = servers
    save_registry(registry)
    
    print(f"✓ Registered server: {project_name} on port {port} (PID: {pid})")


def unregister_server(port: int):
    """Remove a server from the registry by port."""
    registry = load_registry()
    
    # Filter out the server with this port
    original_count = len(registry.get("servers", []))
    registry["servers"] = [s for s in registry.get("servers", []) if s.get("port") != port]
    
    if len(registry["servers"]) < original_count:
        save_registry(registry)
        print(f"✓ Unregistered server on port {port}")


def get_all_servers() -> List[Dict]:
    """Get all registered servers (after cleanup)."""
    cleanup_stale_servers()
    registry = load_registry()
    
    servers = registry.get("servers", [])
    
    # Enrich with uptime information
    for server in servers:
        started_at = server.get("started_at")
        if started_at:
            try:
                start_time = datetime.fromisoformat(started_at)
                uptime_seconds = (datetime.now() - start_time).total_seconds()
                
                # Format uptime
                if uptime_seconds < 60:
                    server["uptime"] = f"{int(uptime_seconds)}s"
                elif uptime_seconds < 3600:
                    server["uptime"] = f"{int(uptime_seconds / 60)}m"
                else:
                    hours = int(uptime_seconds / 3600)
                    minutes = int((uptime_seconds % 3600) / 60)
                    server["uptime"] = f"{hours}h {minutes}m"
            except (ValueError, TypeError):
                server["uptime"] = "unknown"
        else:
            server["uptime"] = "unknown"
        
        # Check if process is still alive
        server["is_running"] = is_process_running(server.get("pid"))
    
    return servers


def get_dashboard_server() -> Optional[Dict]:
    """Check if the dashboard server is running on port 8069."""
    registry = load_registry()
    
    for server in registry.get("servers", []):
        if server.get("port") == 8069:
            if is_process_running(server.get("pid")):
                return server
    
    return None


def kill_dashboard_if_running():
    """Kill the dashboard server if it's running on port 8069."""
    dashboard = get_dashboard_server()
    
    if dashboard:
        pid = dashboard.get("pid")
        print(f"🔄 Stopping existing dashboard (PID: {pid})...")
        
        try:
            process = psutil.Process(pid)
            process.terminate()
            
            # Wait up to 5 seconds for graceful shutdown
            for _ in range(50):
                if not process.is_running():
                    break
                time.sleep(0.1)
            
            # Force kill if still running
            if process.is_running():
                process.kill()
            
            # Clean up registry
            unregister_server(8069)
            print(f"✓ Stopped existing dashboard")
            time.sleep(0.5)  # Brief pause before restarting
            
        except (psutil.NoSuchProcess, psutil.AccessDenied) as e:
            # Process already dead or can't access it
            unregister_server(8069)

