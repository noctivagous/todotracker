# Adaptive Port Management & Dashboard

## Overview

TodoTracker now features intelligent port management that automatically handles multiple running instances across different projects. No more "Address already in use" errors!

## Key Components

### 1. Port Manager (`src/port_manager.py`)

The core module that handles:
- **Port availability detection**: Checks if ports are free before binding
- **Automatic port allocation**: Finds next available port in sequence (8070, 8071, 8072...)
- **Server registry**: Maintains list of running servers at `~/.todotracker/servers.json`
- **Process monitoring**: Verifies servers are actually running (not just registered)
- **Automatic cleanup**: Removes stale entries for crashed servers

### 2. TodoTracker Dashboard (`dashboard.py`)

A web-based dashboard that runs on **port 8069** (reserved) and provides:
- Overview of all running TodoTracker instances
- Port assignments and project names
- Server status (running/offline)
- Uptime tracking
- Quick links to access each project's web UI and API docs
- Auto-refresh every 10 seconds

### 3. Updated Launch Script (`todotracker_webserver.py`)

Enhanced with:
- Automatic port detection (no hardcoded ports)
- Project duplicate detection (prevents running same project twice)
- Graceful shutdown with registry cleanup
- Signal handlers for SIGINT/SIGTERM
- Informative messages showing dashboard URL

## How It Works

### Port Allocation

```
Port 8069  → Reserved for Dashboard
Port 8070+ → Dynamically assigned to projects
```

When you start a TodoTracker instance:

1. **Check for existing server**: If this project already has a running server, display its URL and exit
2. **Find available port**: Starting at 8070, check each port until finding one that's free
3. **Register server**: Add entry to `~/.todotracker/servers.json` with:
   - Project name
   - Database path
   - Port number
   - Process ID (PID)
   - Start time
4. **Start web server**: Launch FastAPI on the allocated port
5. **Setup cleanup**: Register shutdown handlers to clean registry on exit

### Server Registry

Location: `~/.todotracker/servers.json`

Structure:
```json
{
  "servers": [
    {
      "project_name": "my-frontend",
      "db_path": "/home/user/projects/frontend/.todos/project.db",
      "port": 8070,
      "pid": 12345,
      "started_at": "2026-01-15T10:30:00",
      "last_heartbeat": "2026-01-15T10:35:00"
    },
    {
      "project_name": "my-backend",
      "db_path": "/home/user/projects/backend/.todos/project.db",
      "port": 8071,
      "pid": 12346,
      "started_at": "2026-01-15T10:31:00",
      "last_heartbeat": "2026-01-15T10:35:00"
    }
  ]
}
```

### Stale Server Cleanup

The system automatically removes entries for:
- Servers whose process (PID) is no longer running
- Crashed or killed servers
- Servers stopped without proper shutdown

This happens:
- When starting any new server
- When accessing the dashboard
- When calling `cleanup_stale_servers()` API endpoint

## Usage

### Start a Project Server

```bash
cd /path/to/your/project
python /path/to/todotracker/todotracker_webserver.py

# Output shows:
# 🚀 Starting TodoTracker Web Server
# 🔍 Project: my-project
# 🌐 Port: 8070
# 📋 Web UI: http://localhost:8070
# 📊 Dashboard: http://localhost:8069
```

### Start Another Project (Automatic Port Increment)

```bash
cd /path/to/another/project
python /path/to/todotracker/todotracker_webserver.py

# Automatically gets port 8071 since 8070 is in use
```

### View All Running Servers

```bash
python /path/to/todotracker/dashboard.py
# Opens http://localhost:8069
```

### Try to Start Same Project Twice

```bash
cd /path/to/your/project
python /path/to/todotracker/todotracker_webserver.py

# Output:
# ⚠️  Server Already Running
# 🔍 Project: my-project
# 🌐 Port: 8070
# 📋 Web UI: http://localhost:8070
# 💡 To restart, stop the existing server first
```

## API Endpoints (Dashboard)

### GET `/`
HTML dashboard showing all servers

### GET `/api/servers`
JSON list of all registered servers

### GET `/api/cleanup`
Manually trigger cleanup of stale servers

### GET `/api/health`
Health check for the dashboard itself

## Implementation Details

### Race Condition Prevention

The port manager uses file locking (`fcntl`) to prevent race conditions when multiple processes try to:
- Read the registry simultaneously
- Write to the registry at the same time
- Register servers concurrently

### Process Verification

Uses `psutil` library to:
- Check if a process ID is still running
- Verify server processes are active
- Clean up entries for dead processes

### Atomic Operations

Registry updates use atomic file operations:
1. Write to temporary file (`.tmp`)
2. Flush and sync to disk
3. Atomic rename to replace registry file

### Port Detection

Uses socket binding to check port availability:
```python
with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    s.bind(('0.0.0.0', port))
    # If no exception, port is available
```

## Benefits

✅ **No Port Conflicts**: Multiple projects run simultaneously without errors  
✅ **Project Awareness**: Same project can't be started twice accidentally  
✅ **Central Dashboard**: See all running instances in one place  
✅ **Automatic Cleanup**: Dead servers don't clutter the registry  
✅ **Robust**: Handles crashes, kills, and improper shutdowns  
✅ **Thread-Safe**: File locking prevents race conditions  
✅ **User-Friendly**: Clear messages and automatic port assignment  

## Troubleshooting

### Port 8069 Won't Free

If the dashboard port is stuck:

```bash
# Find process using port 8069
sudo lsof -ti:8069

# Kill it
sudo lsof -ti:8069 | xargs kill -9
```

### Registry Corruption

If registry file becomes corrupted:

```bash
# Remove and start fresh
rm ~/.todotracker/servers.json
```

The registry will be automatically recreated.

### Server Shows as Running But Isn't

The cleanup process should handle this automatically. To manually trigger cleanup:

```bash
# Visit the cleanup endpoint
curl http://localhost:8069/api/cleanup
```

Or run the dashboard, which triggers cleanup on startup.

## Future Enhancements

Potential improvements:
- Web-based server stop/restart from dashboard
- Server resource usage monitoring (CPU, memory)
- Log viewing in dashboard
- Email/notification when servers crash
- Configurable port ranges
- Server groups by organization/team
- Remote server monitoring (not just localhost)

## Testing

Run the test suite:

```bash
python test_port_management.py
```

This verifies:
- Port availability detection
- Port allocation algorithm
- Registry operations (save/load)
- Server registration/unregistration
- Project detection
- Stale server cleanup

