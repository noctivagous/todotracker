#!/usr/bin/env python3
"""
Test script to verify lazy database initialization works correctly.
"""
import os
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

def test_lazy_init():
    """Test that database initialization is lazy and respects environment variables."""

    # Import db module
    from db import get_db_path, _init_engine, engine, DB_PATH

    # Before initialization, engine should be None
    assert engine is None, "Engine should be None before initialization"
    assert DB_PATH is None, "DB_PATH should be None before initialization"

    # Set environment variable
    test_db_path = "/tmp/test_todotracker.db"
    os.environ["TODOTRACKER_DB_PATH"] = test_db_path

    # Now get_db_path() should initialize the engine
    returned_path = get_db_path()

    # Should return our test path
    assert returned_path == test_db_path, f"Expected {test_db_path}, got {returned_path}"

    # Engine should now be initialized
    assert engine is not None, "Engine should be initialized after get_db_path()"

    # DB_PATH should be set
    assert DB_PATH == test_db_path, f"DB_PATH should be {test_db_path}, got {DB_PATH}"

    print("✅ Lazy initialization test passed!")

    # Test that subsequent calls don't re-initialize
    original_engine = engine
    get_db_path()  # Should not create new engine
    assert engine is original_engine, "Engine should not be recreated"

    print("✅ No re-initialization test passed!")

if __name__ == "__main__":
    test_lazy_init()


