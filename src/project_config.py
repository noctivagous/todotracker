"""
Project configuration management for TodoTracker.
Stores and retrieves project-specific settings like the TodoTracker installation path.
"""

import json
from pathlib import Path
from typing import Optional


class ProjectConfig:
    """Manages project-specific TodoTracker configuration."""
    
    CONFIG_FILENAME = "config.json"
    
    def __init__(self, project_root: Path):
        """
        Initialize config for a project.
        
        Args:
            project_root: Path to the project root (where .todos directory is)
        """
        self.project_root = Path(project_root)
        self.todos_dir = self.project_root / ".todos"
        self.config_file = self.todos_dir / self.CONFIG_FILENAME
    
    def save_config(self, todotracker_path: str, project_name: str = None) -> None:
        """
        Save configuration to the project's .todos directory.
        
        Args:
            todotracker_path: Absolute path to the TodoTracker installation
            project_name: Optional project name (defaults to directory name)
        """
        self.todos_dir.mkdir(parents=True, exist_ok=True)
        
        if project_name is None:
            project_name = self.project_root.name
        
        config = {
            "todotracker_path": str(Path(todotracker_path).resolve()),
            "project_name": project_name,
            "project_root": str(self.project_root),
        }
        
        self.config_file.write_text(json.dumps(config, indent=2))
    
    def load_config(self) -> Optional[dict]:
        """
        Load configuration from the project's .todos directory.
        
        Returns:
            Configuration dictionary or None if not found
        """
        if not self.config_file.exists():
            return None
        
        try:
            return json.loads(self.config_file.read_text())
        except (json.JSONDecodeError, OSError):
            return None
    
    def get_todotracker_path(self) -> Optional[str]:
        """Get the TodoTracker installation path from config."""
        config = self.load_config()
        return config.get("todotracker_path") if config else None
    
    def get_project_name(self) -> Optional[str]:
        """Get the project name from config."""
        config = self.load_config()
        return config.get("project_name") if config else None


def find_project_config(start_path: Optional[Path] = None) -> Optional[ProjectConfig]:
    """
    Find the project configuration by walking up the directory tree.
    
    Args:
        start_path: Starting directory (defaults to current working directory)
    
    Returns:
        ProjectConfig instance if found, None otherwise
    """
    if start_path is None:
        start_path = Path.cwd()
    
    current = Path(start_path).resolve()
    
    # Walk up the directory tree looking for .todos/config.json
    for parent in [current] + list(current.parents):
        config_file = parent / ".todos" / ProjectConfig.CONFIG_FILENAME
        if config_file.exists():
            return ProjectConfig(parent)
    
    return None

