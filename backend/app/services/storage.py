import os
import time
import uuid
from pathlib import Path

DOWNLOAD_TTL_SECONDS = int(os.getenv("DOWNLOAD_TTL_SECONDS", "3600"))


class DownloadStore:
    """Stores generated files for short-lived downloads."""

    def __init__(self, base_dir: Path):
        self.base_dir = base_dir
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def cleanup(self) -> None:
        now = time.time()
        for file_path in self.base_dir.glob("*.musicxml"):
            try:
                if now - file_path.stat().st_mtime > DOWNLOAD_TTL_SECONDS:
                    file_path.unlink(missing_ok=True)
            except OSError:
                continue

    def create_download_path(self) -> tuple[str, Path]:
        file_id = uuid.uuid4().hex
        target = self.base_dir / f"{file_id}.musicxml"
        return file_id, target

    def resolve(self, file_id: str) -> Path:
        return self.base_dir / f"{file_id}.musicxml"
