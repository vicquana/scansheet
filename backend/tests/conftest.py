from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.storage import DownloadStore


@pytest.fixture
def client(tmp_path: Path):
    # Keep generated artifacts isolated per test run.
    test_store = DownloadStore(tmp_path / "downloads")

    # Swap global store used by the API module.
    import app.main as main_module

    original_store = main_module.store
    main_module.store = test_store
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        main_module.store = original_store
