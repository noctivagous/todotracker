#!/bin/bash
# Smart TodoTracker installer with multiple package management options
# Supports: uv, pipx, venv, Poetry, PDM, pip, and more

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TODOTRACKER_ROOT="$(dirname "$SCRIPT_DIR")"

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║           TodoTracker Smart Installer                  ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Function to detect available tools
detect_available_tools() {
    local tools=()
    
    command -v uv >/dev/null 2>&1 && tools+=("uv")
    command -v pipx >/dev/null 2>&1 && tools+=("pipx")
    command -v poetry >/dev/null 2>&1 && tools+=("poetry")
    command -v pdm >/dev/null 2>&1 && tools+=("pdm")
    command -v pip >/dev/null 2>&1 && tools+=("pip")
    python3 -m venv --help >/dev/null 2>&1 && tools+=("venv")
    
    echo "${tools[@]}"
}

# Function to check if in virtual environment
is_in_venv() {
    [[ "$VIRTUAL_ENV" != "" ]]
}

# Function to check for PEP 668 externally managed environment
is_externally_managed() {
    if ! is_in_venv; then
        local pep668_marker="/usr/lib/python$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')/EXTERNALLY-MANAGED"
        [[ -f "$pep668_marker" ]]
    else
        return 1
    fi
}

# Function to show installation method menu
show_installation_menu() {
    local available_tools
    available_tools=$(detect_available_tools)
    
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  Available Installation Methods${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    
    # Show current environment status
    if is_in_venv; then
        echo -e "${GREEN}📍 Current Environment:${NC} Virtual environment active"
        echo -e "   ${VIRTUAL_ENV}"
        echo ""
    elif is_externally_managed; then
        echo -e "${YELLOW}📍 Current Environment:${NC} PEP 668 externally managed system"
        echo ""
    else
        echo -e "${BLUE}📍 Current Environment:${NC} System Python"
        echo ""
    fi
    
    echo -e "${BLUE}Available tools:${NC} ${available_tools:-none detected}"
    echo ""
    echo -e "${CYAN}─────────────────────────────────────────────────────────${NC}"
    echo ""
    
    local option_num=1
    local -a methods=()
    local -a descriptions=()
    
    # Option 0: Auto-detect (always available)
    echo -e "${MAGENTA}[0]${NC} ${YELLOW}Auto-detect${NC} (Recommended)"
    echo "    Let the installer choose the best method for your system"
    echo ""

    # Option 1: Best day-to-day compromise — venv with system packages (if venv available)
    if [[ "$available_tools" == *"venv"* ]]; then
        methods+=("venv-system-packages")
        descriptions+=("venv + system packages - Best day-to-day compromise")
        echo -e "${MAGENTA}[$option_num]${NC} ${GREEN}venv + system packages${NC} - Best day-to-day compromise ${GREEN}✓${NC}"
        echo "    Create base venv once with common packages, then lightweight per-project venvs"
        echo "    → Get heavy packages for free while maintaining project isolation"
        echo ""
        ((option_num++))
    fi

    # Option 2: Modern & very fast — uv (if available)
    if [[ "$available_tools" == *"uv"* ]]; then
        methods+=("uv-system")
        descriptions+=("uv - Modern & very fast (astral.sh)")
        echo -e "${MAGENTA}[$option_num]${NC} ${GREEN}uv${NC} - Modern & very fast ${GREEN}✓${NC}"
        echo "    Astral's uv: 5-20× faster than pip, automatic venv management"
        echo "    → Biggest change of 2024-2025, many switched completely from pip+venv"
        echo ""
        ((option_num++))

        methods+=("uv-tools")
        descriptions+=("uv tool - Isolated tool environment")
        echo -e "${MAGENTA}[$option_num]${NC} ${GREEN}uv tool${NC} - Isolated tool environment ${GREEN}✓${NC}"
        echo "    Installs as an isolated tool (like pipx, recommended for CLI apps)"
        echo ""
        ((option_num++))
    else
        echo -e "${MAGENTA}[2-3]${NC} ${BLUE}uv${NC} - Not installed"
        echo "    Modern & very fast: ${CYAN}curl -LsSf https://astral.sh/uv/install.sh | sh${NC}"
        echo "    → 5-20× faster than pip, biggest change of 2024-2025"
        echo ""
        option_num=$((option_num+2))
    fi
    
    # Option 3: pipx (if available)
    if [[ "$available_tools" == *"pipx"* ]]; then
        methods+=("pipx")
        descriptions+=("pipx - Isolated tool environment")
        echo -e "${MAGENTA}[$option_num]${NC} ${GREEN}pipx${NC} - Isolated tool environment ${GREEN}✓${NC}"
        echo "    Best for CLI tools, each app in its own environment"
        echo ""
        ((option_num++))
    else
        echo -e "${MAGENTA}[$option_num]${NC} ${BLUE}pipx${NC} - Not installed"
        echo "    Install: ${CYAN}pip install --user pipx && pipx ensurepath${NC}"
        echo ""
        ((option_num++))
    fi
    
    # venv options moved to prioritize system-packages and uv
    
    # Option 5: Poetry (if available)
    if [[ "$available_tools" == *"poetry"* ]]; then
        methods+=("poetry")
        descriptions+=("Poetry - Professional dependency management")
        echo -e "${MAGENTA}[$option_num]${NC} ${GREEN}Poetry${NC} - Professional dependency management ${GREEN}✓${NC}"
        echo "    Best for proper applications with complex dependencies"
        echo ""
        ((option_num++))
    else
        echo -e "${MAGENTA}[$option_num]${NC} ${BLUE}Poetry${NC} - Not installed"
        echo "    Install: ${CYAN}curl -sSL https://install.python-poetry.org | python3 -${NC}"
        echo ""
        ((option_num++))
    fi
    
    # Option 6: PDM (if available)
    if [[ "$available_tools" == *"pdm"* ]]; then
        methods+=("pdm")
        descriptions+=("PDM - Modern dependency management (PEP 582)")
        echo -e "${MAGENTA}[$option_num]${NC} ${GREEN}PDM${NC} - Modern dependency management ${GREEN}✓${NC}"
        echo "    Supports PEP 582, modern approach for applications"
        echo ""
        ((option_num++))
    else
        echo -e "${MAGENTA}[$option_num]${NC} ${BLUE}PDM${NC} - Not installed"
        echo "    Install: ${CYAN}curl -sSL https://pdm-project.org/install-pdm.py | python3 -${NC}"
        echo ""
        ((option_num++))
    fi
    
    # Option X: Classic venv (traditional approach)
    if [[ "$available_tools" == *"venv"* ]]; then
        methods+=("venv-create")
        descriptions+=("Classic venv - Traditional approach")
        echo -e "${MAGENTA}[$option_num]${NC} ${GREEN}Classic venv${NC} - Traditional approach ${GREEN}✓${NC}"
        echo "    Creates a .venv in project directory (traditional pip+venv workflow)"
        echo ""
        ((option_num++))
    fi

    # Option X: pip --user (always available)
    methods+=("pip-user")
    descriptions+=("pip --user - User-level installation")
    echo -e "${MAGENTA}[$option_num]${NC} pip --user - User-level installation"
    echo "    Installs to ~/.local (no sudo required)"
    echo ""
    ((option_num++))
    
    # Option 9: pip --break-system-packages (for PEP 668 systems)
    if is_externally_managed; then
        methods+=("pip-break-system")
        descriptions+=("pip --break-system-packages")
        echo -e "${MAGENTA}[$option_num]${NC} ${YELLOW}pip --break-system-packages${NC}"
        echo "    Override PEP 668 protection (use with caution)"
        echo ""
        ((option_num++))
    fi
    
    # If in active venv, offer to use it
    if is_in_venv; then
        methods+=("venv-active")
        descriptions+=("Use active virtual environment")
        echo -e "${MAGENTA}[$option_num]${NC} ${GREEN}Use active venv${NC} ${GREEN}✓${NC}"
        echo "    Install to currently active virtual environment"
        echo ""
        ((option_num++))
    fi
    
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    
    # Export for use in selection
    export INSTALL_METHODS="${methods[*]}"
    export METHOD_COUNT=${#methods[@]}
}

# Function to auto-detect best installation method (2026 Debian reality)
detect_installation_method() {
    # Priority 1: Use active virtual environment if available
    if is_in_venv; then
        echo -e "${GREEN}✓${NC} Active virtual environment detected"
        echo "venv-active"
        return
    fi

    # Priority 2: Modern & very fast — uv (biggest change of 2024-2025)
    if command -v uv >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} uv detected (5-20× faster, automatic venv management)"
        echo "uv-system"
        return
    fi

    # Priority 3: Best day-to-day compromise — venv with system packages
    if python3 -m venv --help >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Will use venv + system packages (most practical for Debian)"
        echo "venv-system-packages"
        return
    fi

    # Priority 4: Check for pipx (good for CLI tools)
    if command -v pipx >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} pipx detected (good for CLI tools)"
        echo "pipx"
        return
    fi

    # Priority 5: Check for Poetry (good for applications)
    if command -v poetry >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Poetry detected (professional tool)"
        echo "poetry"
        return
    fi

    # Priority 6: Check for PDM
    if command -v pdm >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} PDM detected (modern tool)"
        echo "pdm"
        return
    fi

    # Priority 7: Check for PEP 668 externally managed
    if is_externally_managed; then
        echo -e "${YELLOW}⚠${NC}  PEP 668 externally managed environment"
        # Prefer user installation over breaking system packages
        echo "pip-user"
        return
    fi

    # Fallback: pip --user
    echo -e "${BLUE}ℹ${NC}  Fallback to pip --user"
    echo "pip-user"
}

# Function to check if packages are already installed
check_installed() {
    python3 -c "
import sys
try:
    import fastapi
    import uvicorn
    import sqlalchemy
    import mcp
    sys.exit(0)
except ImportError:
    sys.exit(1)
" 2>/dev/null
}

# Function to install dependencies based on selected method
install_dependencies() {
    local method="$1"
    
    echo ""
    echo -e "${BLUE}📦 Installing dependencies using: ${GREEN}$method${NC}"
    echo ""
    
    case "$method" in
        "venv-active")
            echo -e "${GREEN}→ Installing in active virtual environment${NC}"
            echo "   $VIRTUAL_ENV"
            pip install -r "$TODOTRACKER_ROOT/requirements.txt"
            ;;
            
        "uv-system")
            echo -e "${GREEN}→ Installing with uv (managed Python)${NC}"
            # uv works best with its own Python installation
            if uv pip install -r "$TODOTRACKER_ROOT/requirements.txt"; then
                echo -e "${GREEN}✓${NC} Installed with uv"
            else
                echo -e "${YELLOW}⚠  uv install failed, falling back to pip --user${NC}"
                pip install --user -r "$TODOTRACKER_ROOT/requirements.txt"
            fi
            ;;

        "uv-tools")
            echo -e "${GREEN}→ Installing with uv tool (isolated)${NC}"
            echo -e "${YELLOW}⚠  Note:${NC} This creates an isolated environment"
            # Use uv tool to install in isolated environment
            uv tool install --from "$TODOTRACKER_ROOT" todotracker 2>/dev/null || true
            echo -e "${BLUE}  Note: uv tool installs CLI apps, not libraries${NC}"
            echo -e "${BLUE}  Falling back to pip --user for libraries${NC}"
            pip install --user -r "$TODOTRACKER_ROOT/requirements.txt"
            echo -e "${GREEN}✓${NC} Installed libraries to user directory"
            ;;
            
        "pipx")
            echo -e "${GREEN}→ Installing with pipx (isolated)${NC}"
            echo -e "${YELLOW}⚠  Note:${NC} TodoTracker is not a pure CLI tool"
            echo "   Installing dependencies in isolated environment..."
            # pipx doesn't directly support libraries, so inject dependencies
            if pipx list | grep -q "todotracker"; then
                pipx uninstall todotracker 2>/dev/null || true
            fi
            # Use pip --user as fallback since pipx is for apps
            echo -e "${BLUE}  Using pip --user instead (better for libraries)${NC}"
            pip install --user -r "$TODOTRACKER_ROOT/requirements.txt"
            ;;
            
        "venv-create")
            echo -e "${GREEN}→ Creating new virtual environment${NC}"
            local venv_path="$TODOTRACKER_ROOT/.venv"
            
            if [[ -d "$venv_path" ]]; then
                echo -e "${YELLOW}⚠  Virtual environment already exists at: $venv_path${NC}"
                read -p "Remove and recreate? [y/N]: " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    rm -rf "$venv_path"
                else
                    echo -e "${BLUE}  Using existing virtual environment${NC}"
                fi
            fi
            
            if [[ ! -d "$venv_path" ]]; then
                python3 -m venv "$venv_path"
                echo -e "${GREEN}✓${NC} Virtual environment created at: $venv_path"
            fi
            
            # Activate and install
            source "$venv_path/bin/activate"
            pip install --upgrade pip
            pip install -r "$TODOTRACKER_ROOT/requirements.txt"
            
            echo ""
            echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
            echo -e "${GREEN}✓ Installed in virtual environment${NC}"
            echo ""
            echo -e "${YELLOW}To use TodoTracker, activate the venv:${NC}"
            echo "  source $venv_path/bin/activate"
            echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
            ;;
            
        "venv-system-packages")
            echo -e "${GREEN}→ Creating venv with --system-site-packages${NC}"
            local venv_path="$TODOTRACKER_ROOT/.venv"
            
            if [[ -d "$venv_path" ]]; then
                echo -e "${YELLOW}⚠  Virtual environment already exists${NC}"
                read -p "Remove and recreate? [y/N]: " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    rm -rf "$venv_path"
                fi
            fi
            
            if [[ ! -d "$venv_path" ]]; then
                python3 -m venv --system-site-packages "$venv_path"
                echo -e "${GREEN}✓${NC} Virtual environment created with system package access"
            fi
            
            source "$venv_path/bin/activate"
            pip install --upgrade pip
            pip install -r "$TODOTRACKER_ROOT/requirements.txt"
            
            echo ""
            echo -e "${GREEN}✓ Installed with access to system packages${NC}"
            echo -e "${YELLOW}Activate with:${NC} source $venv_path/bin/activate"
            ;;
            
        "poetry")
            echo -e "${GREEN}→ Installing with Poetry${NC}"
            
            # Check if pyproject.toml exists
            if [[ ! -f "$TODOTRACKER_ROOT/pyproject.toml" ]]; then
                echo -e "${BLUE}  Creating pyproject.toml from requirements.txt...${NC}"
                cd "$TODOTRACKER_ROOT"
                poetry init --no-interaction --name todotracker --dependency requirements.txt 2>/dev/null || true
            fi
            
            cd "$TODOTRACKER_ROOT"
            poetry install
            echo -e "${GREEN}✓${NC} Installed with Poetry"
            echo -e "${YELLOW}Run commands with:${NC} poetry run python <script>"
            ;;
            
        "pdm")
            echo -e "${GREEN}→ Installing with PDM${NC}"
            
            # Check if pyproject.toml exists
            if [[ ! -f "$TODOTRACKER_ROOT/pyproject.toml" ]]; then
                echo -e "${BLUE}  Initializing PDM project...${NC}"
                cd "$TODOTRACKER_ROOT"
                pdm init --non-interactive
            fi
            
            cd "$TODOTRACKER_ROOT"
            # Add dependencies from requirements.txt
            while IFS= read -r line; do
                [[ -z "$line" || "$line" =~ ^# ]] && continue
                pdm add "$line"
            done < "$TODOTRACKER_ROOT/requirements.txt"
            
            echo -e "${GREEN}✓${NC} Installed with PDM"
            echo -e "${YELLOW}Run commands with:${NC} pdm run python <script>"
            ;;
            
        "pip-user")
            echo -e "${GREEN}→ Installing with pip --user${NC}"
            echo "   Packages will be installed to ~/.local"
            pip install --user -r "$TODOTRACKER_ROOT/requirements.txt"
            echo -e "${GREEN}✓${NC} Installed to user directory"
            ;;
            
        "pip-break-system")
            echo -e "${YELLOW}→ Installing with --break-system-packages${NC}"
            echo -e "${RED}⚠  Warning:${NC} This overrides PEP 668 protection"
            echo "   Use this if you understand the implications."
            echo ""
            read -p "Continue? [y/N]: " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                echo "Installation cancelled."
                exit 1
            fi
            pip install --break-system-packages -r "$TODOTRACKER_ROOT/requirements.txt"
            echo -e "${GREEN}✓${NC} Installed to system Python"
            ;;
            
        *)
            echo -e "${RED}❌ Unknown installation method: $method${NC}"
            exit 1
            ;;
    esac
}

# Function to configure MCP server in common locations
configure_mcp_servers() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo -e "${BLUE}🔧 Auto-configuring MCP servers...${NC}"
    echo ""
    
    local configured_count=0
    local mcp_locations=(
        "$HOME/.cursor/mcp.json|Cursor IDE"
        "$HOME/.claude/mcp.json|Claude Code"
        "$HOME/.windsurf/mcp.json|Windsurf"
    )
    
    # Python script to safely update JSON config
    local update_script=$(cat <<'PYTHON_SCRIPT'
import json
import sys
import os

config_path = sys.argv[1]
todotracker_path = sys.argv[2]

# Prepare the new server config
new_server = {
    "command": "bash",
    "args": [f"{todotracker_path}/run_mcp_server.sh"]
}

# Pass workspace path as an argument for clients that support workspace variables.
# This avoids relying on the MCP client's "cwd" setting.
if "cursor" in config_path or "windsurf" in config_path:
    if "cursor" in config_path:
        # Cursor supports VS Code-style variables.
        # (Some older docs used {{workspaceFolder}}, which may not expand.)
        new_server["args"].append("${workspaceFolder}")
    else:
        new_server["args"].append("${workspaceRoot}")

# Read existing config or create new one
config = {"mcpServers": {}}
if os.path.exists(config_path):
    try:
        with open(config_path, 'r') as f:
            content = f.read().strip()
            if content:  # Only parse if file has content
                config = json.loads(content)
    except json.JSONDecodeError:
        pass  # Use default empty config

# Ensure mcpServers key exists
if "mcpServers" not in config:
    config["mcpServers"] = {}

# Check if todotracker already exists
if "todotracker" in config["mcpServers"]:
    existing = config["mcpServers"]["todotracker"]
    # Check if it's pointing to the same location
    if existing.get("args", []) and len(existing["args"]) > 0:
        existing_path = existing["args"][0]
        new_path = new_server["args"][0]
        if os.path.normpath(existing_path) == os.path.normpath(new_path):
            print("ALREADY_CONFIGURED")
            sys.exit(0)

# Add or update todotracker config
config["mcpServers"]["todotracker"] = new_server

# Ensure directory exists
os.makedirs(os.path.dirname(config_path), exist_ok=True)

# Write config
with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)

print("SUCCESS")
PYTHON_SCRIPT
)
    
    # Try to configure each location
    for location_info in "${mcp_locations[@]}"; do
        IFS='|' read -r config_path client_name <<< "$location_info"
        config_path=$(eval echo "$config_path")  # Expand ~ to home directory
        
        # Check if the parent directory exists (indicates the client is installed)
        config_dir=$(dirname "$config_path")
        if [[ -d "$config_dir" ]]; then
            echo -e "${BLUE}→ Configuring ${client_name}...${NC}"
            
            # Run Python script to update config
            result=$(python3 -c "$update_script" "$config_path" "$TODOTRACKER_ROOT" 2>&1)
            
            if [[ "$result" == "SUCCESS" ]]; then
                echo -e "${GREEN}  ✓ Configured successfully: $config_path${NC}"
                ((configured_count++))
            elif [[ "$result" == "ALREADY_CONFIGURED" ]]; then
                echo -e "${YELLOW}  ⊙ Already configured (same path): $config_path${NC}"
            else
                echo -e "${RED}  ✗ Failed to configure: $result${NC}"
            fi
        fi
    done
    
    # Check for VS Code workspace config
    if [[ -n "$TODOTRACKER_WORKSPACE" ]] && [[ -d "$TODOTRACKER_WORKSPACE" ]]; then
        local vscode_config="$TODOTRACKER_WORKSPACE/.vscode/mcp.json"
        local vscode_dir="$TODOTRACKER_WORKSPACE/.vscode"
        
        if [[ -d "$vscode_dir" ]] || [[ -d "$TODOTRACKER_WORKSPACE" ]]; then
            echo -e "${BLUE}→ Configuring VS Code (workspace)...${NC}"
            
            result=$(python3 -c "$update_script" "$vscode_config" "$TODOTRACKER_ROOT" 2>&1)
            
            if [[ "$result" == "SUCCESS" ]]; then
                echo -e "${GREEN}  ✓ Configured successfully: $vscode_config${NC}"
                ((configured_count++))
            elif [[ "$result" == "ALREADY_CONFIGURED" ]]; then
                echo -e "${YELLOW}  ⊙ Already configured (same path): $vscode_config${NC}"
            else
                echo -e "${RED}  ✗ Failed to configure: $result${NC}"
            fi
        fi
    fi
    
    echo ""
    
    # Report results
    if [[ $configured_count -eq 0 ]]; then
        echo -e "${YELLOW}⚠  No MCP clients found for auto-configuration${NC}"
        echo ""
        echo "To manually configure, add this to your MCP client's config:"
        echo ""
        echo "  Location examples:"
        echo "    • ~/.cursor/mcp.json (Cursor IDE)"
        echo "    • ~/.claude/mcp.json (Claude Code)"
        echo "    • ~/.windsurf/mcp.json (Windsurf)"
        echo ""
        echo "  Configuration:"
        cat << EOF
  {
    "mcpServers": {
      "todotracker": {
        "command": "bash",
        "args": ["$TODOTRACKER_ROOT/run_mcp_server.sh", "\${workspaceFolder}"]
      }
    }
  }
EOF
        echo ""
    else
        echo -e "${GREEN}✓ Successfully configured $configured_count MCP client(s)!${NC}"
        echo ""
        echo -e "${BLUE}📝 Note:${NC} You may need to restart your IDE/editor for changes to take effect."
    fi
}

# Function to get user selection
get_user_selection() {
    local max_option="$1"
    local choice
    
    while true; do
        read -p "Enter your choice [0-$max_option]: " choice
        
        if [[ "$choice" =~ ^[0-9]+$ ]] && [[ "$choice" -ge 0 ]] && [[ "$choice" -le "$max_option" ]]; then
            echo "$choice"
            return 0
        else
            echo -e "${RED}Invalid choice. Please enter a number between 0 and $max_option${NC}"
        fi
    done
}

# Main installation flow
main() {
    local interactive_mode=true
    local selected_method=""
    
    # Check for non-interactive flags
    if [[ "$1" == "--auto" ]] || [[ "$1" == "-a" ]]; then
        interactive_mode=false
        echo -e "${BLUE}Running in auto-detect mode...${NC}"
        echo ""
    fi
    
    # Check if already installed
    if check_installed; then
        echo -e "${GREEN}✓ TodoTracker dependencies already installed!${NC}"
        echo ""
        echo "Checking versions..."
        python3 -c "
import fastapi, uvicorn, sqlalchemy, mcp
print(f'  FastAPI: {fastapi.__version__}')
print(f'  Uvicorn: {uvicorn.__version__}')
print(f'  SQLAlchemy: {sqlalchemy.__version__}')
print(f'  MCP: {mcp.__version__}')
"
        echo ""
        
        if [[ "$interactive_mode" == true ]]; then
            read -p "Reinstall anyway? [y/N]: " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                echo "Installation cancelled."
                exit 0
            fi
        fi
    fi
    
    # Determine installation method
    if [[ "$interactive_mode" == true ]]; then
        # Show menu
        show_installation_menu
        
        # Get user choice
        local methods_array
        IFS=' ' read -ra methods_array <<< "$INSTALL_METHODS"
        local max_choice=${#methods_array[@]}
        
        echo -e "${CYAN}Choose installation method:${NC}"
        local choice=$(get_user_selection "$max_choice")
        
        if [[ "$choice" -eq 0 ]]; then
            # Auto-detect
            echo ""
            echo -e "${BLUE}🔍 Auto-detecting best installation method...${NC}"
            selected_method=$(detect_installation_method | tail -n 1)
        else
            # User selected specific method
            selected_method="${methods_array[$((choice-1))]}"
            echo ""
            echo -e "${GREEN}Selected:${NC} $selected_method"
        fi
    else
        # Auto-detect mode
        echo -e "${BLUE}🔍 Auto-detecting best installation method...${NC}"
        selected_method=$(detect_installation_method | tail -n 1)
    fi
    
    echo ""
    
    # Install dependencies
    install_dependencies "$selected_method"
    
    # Verify installation
    echo ""
    echo -e "${BLUE}🔍 Verifying installation...${NC}"
    if check_installed; then
        echo -e "${GREEN}✓ All dependencies installed successfully!${NC}"
    else
        echo -e "${YELLOW}⚠  Installation verification incomplete${NC}"
        echo ""
        echo "This may be normal for some installation methods (venv, poetry, pdm, uv)."
        echo "Dependencies should be available when you activate the environment."
        echo ""

        # Don't fail if using venv/poetry/pdm/uv methods
        if [[ ! "$selected_method" =~ ^(venv|poetry|pdm|uv) ]]; then
            echo -e "${RED}❌ Installation verification failed${NC}"
            echo ""
            echo "Please try manually:"
            echo "  pip install --user -r $TODOTRACKER_ROOT/requirements.txt"
            exit 1
        fi
    fi
    
    # Auto-configure MCP servers
    configure_mcp_servers
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo -e "${GREEN}✓ TodoTracker installation complete!${NC}"
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo ""
    
    # Show activation instructions if needed
    if [[ "$selected_method" == "venv-create" ]] || [[ "$selected_method" == "venv-system-packages" ]]; then
        echo "1. Activate the virtual environment:"
        echo -e "   ${CYAN}source $TODOTRACKER_ROOT/.venv/bin/activate${NC}"
        echo ""
        echo "2. Restart your IDE/editor to load the new MCP configuration"
    elif [[ "$selected_method" == "poetry" ]]; then
        echo "1. Use Poetry to run commands:"
        echo -e "   ${CYAN}cd $TODOTRACKER_ROOT && poetry shell${NC}"
        echo ""
        echo "2. Restart your IDE/editor to load the new MCP configuration"
    elif [[ "$selected_method" == "pdm" ]]; then
        echo "1. Use PDM to run commands:"
        echo -e "   ${CYAN}cd $TODOTRACKER_ROOT && pdm run python ...${NC}"
        echo ""
        echo "2. Restart your IDE/editor to load the new MCP configuration"
    else
        echo "1. Restart your IDE/editor to load the new MCP configuration"
    fi

    echo ""
    echo "2. Set up TodoTracker in your project:"
    echo -e "   ${CYAN}cd /path/to/your/project${NC}"
    echo -e "   ${CYAN}$TODOTRACKER_ROOT/scripts/setup-project-todos.sh${NC}"
    echo ""
    echo "3. The MCP server will auto-setup your project on first use!"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

# Show installation recommendations based on OS
show_recommendations() {
    echo -e "${BLUE}💡 Installation Recommendations:${NC}"
    echo ""
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v apt >/dev/null 2>&1; then
            echo "  ${CYAN}Ubuntu/Debian/Raspberry Pi OS:${NC}"
            echo "    ${GREEN}uv${NC} (recommended): curl -LsSf https://astral.sh/uv/install.sh | sh"
            echo "    ${GREEN}pipx${NC}: sudo apt install pipx && pipx ensurepath"
            echo ""
        elif command -v dnf >/dev/null 2>&1; then
            echo "  ${CYAN}Fedora/RHEL:${NC}"
            echo "    ${GREEN}uv${NC}: curl -LsSf https://astral.sh/uv/install.sh | sh"
            echo "    ${GREEN}pipx${NC}: sudo dnf install pipx"
            echo ""
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "  ${CYAN}macOS:${NC}"
        echo "    ${GREEN}uv${NC} (recommended): brew install uv"
        echo "    ${GREEN}pipx${NC}: brew install pipx"
        echo "    ${GREEN}Poetry${NC}: brew install poetry"
        echo ""
    fi
    
    echo -e "${BLUE}Professional Tools:${NC}"
    echo "  ${GREEN}Poetry${NC}: curl -sSL https://install.python-poetry.org | python3 -"
    echo "  ${GREEN}PDM${NC}: curl -sSL https://pdm-project.org/install-pdm.py | python3 -"
    echo ""
}

# Show help message
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "TodoTracker Smart Installer - Multiple installation methods supported"
    echo ""
    echo "Options:"
    echo "  (no flags)         Interactive mode - choose installation method"
    echo "  -a, --auto         Auto-detect best installation method"
    echo "  -r, --recommend    Show recommended tools for your OS"
    echo "  -h, --help         Show this help message"
    echo ""
echo "Top Priorities (2026 Debian Reality):"
echo "  • venv + system packages    Best day-to-day compromise"
echo "  • uv                        Modern & very fast (5-20× faster)"
echo ""
echo "Other Installation Methods:"
echo "  • pipx                      Isolated tool environments"
echo "  • Poetry                    Professional dependency management"
echo "  • PDM                       Modern Python Development Master"
echo "  • Classic venv              Traditional virtual environments"
echo "  • pip                       Traditional pip installation"
    echo ""
    echo "Examples:"
    echo "  $0                 # Interactive mode with menu"
    echo "  $0 --auto          # Auto-detect and install"
    echo "  $0 --recommend     # Show installation recommendations"
    echo ""
}

# Parse command line arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    -r|--recommend)
        show_recommendations
        exit 0
        ;;
    -a|--auto)
        main --auto
        exit 0
        ;;
    "")
        # No arguments - run in interactive mode
        main
        exit 0
        ;;
    *)
        echo -e "${RED}Unknown option: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac

