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
        for file_path in self.base_dir.glob("*"):
            if not file_path.is_file():
                continue
            try:
                if now - file_path.stat().st_mtime > DOWNLOAD_TTL_SECONDS:
                    file_path.unlink(missing_ok=True)
            except OSError:
                continue

    def create_download_path(self, extension: str) -> tuple[str, Path]:
        normalized_ext = extension if extension.startswith(".") else f".{extension}"
        artifact_name = f"{uuid.uuid4().hex}{normalized_ext}"
        target = self.base_dir / artifact_name
        return artifact_name, target

    def resolve(self, artifact_name: str) -> Path:
        safe_name = Path(artifact_name).name
        if safe_name != artifact_name:
            raise ValueError("Invalid download id")
        return self.base_dir / safe_name
