# 📦 TodoTracker Installation Guide

Complete installation guide for all environments and package managers.

## Table of Contents

- [Quick Install (Recommended)](#quick-install-recommended)
- [Installation by Environment](#installation-by-environment)
- [Package Manager Comparison](#package-manager-comparison)
- [Troubleshooting](#troubleshooting)
- [Verification](#verification)

## Quick Install (Recommended)

TodoTracker features **smart installation** that automatically detects your environment and chooses the best installation method.

```bash
# 1. Clone or download TodoTracker
git clone https://github.com/youruser/todotracker.git
cd todotracker

# 2. Run the smart installer
./scripts/install_todotracker.sh
```

The installer handles:
- ✅ PEP 668 externally managed environments (Debian/Ubuntu/Fedora)
- ✅ Virtual environments (venv)
- ✅ Modern package managers (uv, pipx)
- ✅ System-wide installations
- ✅ User-local installations (`--user`)

## Installation by Environment

### Ubuntu/Debian (PEP 668 Compliant)

Modern Debian-based systems have PEP 668 "externally managed environment" protection:

**Option 1: Use uv (Recommended for 2026)**
```bash
# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install TodoTracker dependencies
cd /path/to/todotracker
uv pip install -r requirements.txt
```

**Option 2: Use pip with --user flag**
```bash
cd /path/to/todotracker
pip install --user -r requirements.txt

# Ensure ~/.local/bin is in your PATH
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

**Option 3: Use a virtual environment**
```bash
cd /path/to/todotracker
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### macOS

**Option 1: Using Homebrew and uv**
```bash
# Install uv via Homebrew
brew install uv

# Install TodoTracker dependencies
cd /path/to/todotracker
uv pip install -r requirements.txt
```

**Option 2: Using pipx**
```bash
# Install pipx
brew install pipx
pipx ensurepath

# Note: pipx is best for CLI tools, but TodoTracker needs library access
# Use pip --user instead:
pip install --user -r requirements.txt
```

**Option 3: Traditional venv**
```bash
cd /path/to/todotracker
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Windows

**Option 1: Using uv**
```powershell
# Install uv
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# Install TodoTracker dependencies
cd C:\path\to\todotracker
uv pip install -r requirements.txt
```

**Option 2: Using virtual environment**
```powershell
cd C:\path\to\todotracker
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

### Fedora/RHEL/CentOS

Similar to Debian, modern Fedora uses PEP 668:

```bash
# Install with --user flag
pip install --user -r requirements.txt

# Or use a virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Arch Linux

```bash
# Arch typically allows system pip
cd /path/to/todotracker
pip install -r requirements.txt

# Or use a virtual environment for isolation
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Enterprise/Corporate Environment

For locked-down environments:

```bash
# 1. Create a local virtual environment
python3 -m venv ~/todotracker-venv
source ~/todotracker-venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Create a wrapper script
cat > ~/bin/todotracker << 'EOF'
#!/bin/bash
source ~/todotracker-venv/bin/activate
python /path/to/todotracker/src/mcp_server.py "$@"
EOF
chmod +x ~/bin/todotracker
```

## Package Manager Comparison

| Approach | Disk Usage | Speed | Maintenance | Best For | 2026 Status |
|----------|-----------|-------|-------------|----------|-------------|
| **uv** | Low-Medium | ⚡ Very Fast | Low | Modern workflow | 🔥 Rising fast |
| **venv per project** | High | Slow | Medium | Serious projects | ✅ Most common |
| **pip --user** | Medium | Medium | Low | Single user | ✅ PEP 668 standard |
| **pipx** | Low | Fast | Very Low | CLI tools only | ⚠️ Limited use case |
| **System pip** | Low | Fast | High risk | Legacy systems | ⚠️ Deprecated |

### Recommendation by Use Case

| If you are... | Use this approach |
|---------------|-------------------|
| New to Python | Smart installer → venv |
| On Debian/Ubuntu 2024+ | Smart installer → uv or --user |
| On macOS | uv or venv |
| On Windows | uv or venv |
| In enterprise | venv in home directory |
| Testing TodoTracker | Smart installer |
| Contributing to TodoTracker | venv with editable install |

## Installation for Development

If you're contributing to TodoTracker:

```bash
# 1. Fork and clone the repository
git clone https://github.com/youruser/todotracker.git
cd todotracker

# 2. Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate

# 3. Install in editable mode with dev dependencies
pip install -e .
pip install -r requirements.txt

# 4. Run tests (if available)
python -m pytest
```

## Post-Installation Setup

### 1. Verify Installation

```bash
# Check dependencies
python3 -c "
import fastapi
import uvicorn
import sqlalchemy
import mcp
print('✓ All dependencies installed successfully!')
print(f'  FastAPI: {fastapi.__version__}')
print(f'  Uvicorn: {uvicorn.__version__}')
print(f'  SQLAlchemy: {sqlalchemy.__version__}')
print(f'  MCP: {mcp.__version__}')
"
```

### 2. Configure MCP Client

TodoTracker works with any MCP-enabled AI tool. Configuration varies by client:

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

**Claude Desktop (macOS)** - Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:
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

**Claude Desktop (Windows)** - Edit `%APPDATA%/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "todotracker": {
      "command": "bash",
      "args": ["C:\\absolute\\path\\to\\todotracker\\run_mcp_server.sh", "C:\\absolute\\path\\to\\your\\project"]
    }
  }
}
```

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

**VS Code with MCP Extension** - Edit `.vscode/mcp.json` in your workspace:
```json
{
  "mcpServers": {
    "todotracker": {
      "command": "bash",
      "args": ["${workspaceFolder}/../../todotracker/run_mcp_server.sh", "${workspaceFolder}"]
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
- Use **absolute paths** (not `~/` or relative paths)
- Replace `/absolute/path/to/todotracker` with your actual path
- Different clients use different workspace variables:
  - Cursor IDE: `${workspaceFolder}`
  - Windsurf: `${workspaceRoot}`
  - VS Code: `${workspaceFolder}`
  - Claude Desktop: Usually runs from a fixed location
- Restart your IDE/client after configuration
- The MCP server will auto-setup projects on first use!

**Workspace Variable Support:**
- If your client supports workspace variables, pass the workspace/project root as the second argument to `run_mcp_server.sh`
- If not, pass an absolute project path as that second argument
- As a fallback, you can set `TODOTRACKER_DB_PATH` environment variable

### 3. Set Up Your First Project

**Option A: Automatic (via MCP)**

Just open a project in Cursor and ask the AI:
```
"Create a todo for setting up the project"
```

TodoTracker automatically creates `.todos/project.db` on first use!

**Option B: Manual**

```bash
cd /path/to/your/project
/path/to/todotracker/scripts/setup-project-todos.sh

# Or with interactive prompt:
/path/to/todotracker/scripts/setup-project-todos.sh
```

## Troubleshooting

### "externally-managed-environment" Error

**Problem:** 
```
error: externally-managed-environment
```

**Solutions:**

1. Use the smart installer (detects this automatically):
   ```bash
   ./scripts/install_todotracker.sh
   ```

2. Or manually use `--user` flag:
   ```bash
   pip install --user -r requirements.txt
   ```

3. Or create a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

### PATH Issues with --user Installation

**Problem:** Commands not found after `pip install --user`

**Solution:**

```bash
# Add to ~/.bashrc or ~/.zshrc
export PATH="$HOME/.local/bin:$PATH"

# Reload shell configuration
source ~/.bashrc  # or: source ~/.zshrc
```

### Import Errors

**Problem:**
```python
ModuleNotFoundError: No module named 'fastapi'
```

**Solutions:**

1. Ensure you've activated your virtual environment:
   ```bash
   source venv/bin/activate  # Linux/Mac
   .\venv\Scripts\activate   # Windows
   ```

2. Reinstall dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Check your Python version:
   ```bash
   python --version  # Should be 3.10 or higher
   ```

### MCP Server Not Connecting

**Problem:** Cursor IDE doesn't recognize TodoTracker MCP server

**Solutions:**

1. Verify absolute paths in `~/.cursor/mcp.json`
2. Check Python is in your PATH:
   ```bash
   which python3
   ```
3. Test MCP server manually:
   ```bash
   cd /path/to/your/project
   python /path/to/todotracker/src/mcp_server.py
   # Should print: "Auto-detected project database: ..."
   # Press Ctrl+C to exit
   ```
4. Check Cursor's MCP logs: Help → Show MCP Logs
5. Restart Cursor IDE

### Permission Denied Errors

**Problem:**
```
PermissionError: [Errno 13] Permission denied
```

**Solutions:**

1. Don't use `sudo pip install` (security risk)
2. Use `pip install --user` or a virtual environment
3. Check file permissions in TodoTracker directory
4. On macOS/Linux, ensure scripts are executable:
   ```bash
   chmod +x scripts/*.sh
   ```

### Database Lock Errors

**Problem:**
```
sqlite3.OperationalError: database is locked
```

**Solutions:**

1. Close any running TodoTracker web servers
2. Close Cursor IDE (releases MCP connections)
3. Check for stale lock files:
   ```bash
   rm .todos/project.db-wal
   rm .todos/project.db-shm
   ```

## Verification Checklist

After installation, verify everything works:

- [ ] Dependencies installed: `python -c "import fastapi, uvicorn, sqlalchemy, mcp"`
- [ ] Scripts executable: `ls -l scripts/*.sh`
- [ ] MCP config added: `cat ~/.cursor/mcp.json`
- [ ] Test project setup: `./scripts/setup-project-todos.sh /tmp/test-project`
- [ ] MCP server starts: `python src/mcp_server.py` (Ctrl+C to exit)
- [ ] Web server starts: `python todotracker_webserver.py` (Ctrl+C to exit)

## Getting Help

- Check [README.md](../README.md) for usage guide
- Check [QUICKSTART.md](QUICKSTART.md) for quick setup
- Check [Troubleshooting section in README](../README.md#-troubleshooting)
- Review MCP logs: Help → Show MCP Logs in Cursor

## What's Next?

1. Set up your first project
2. Configure MCP in Cursor
3. Read [QUICKSTART.md](QUICKSTART.md) for usage examples
4. Explore the web UI at http://localhost:8070

---

**Made with ❤️ for developers who want AI assistance with their todos**

**Current Version**: 1.1.0 (Schema v3)

