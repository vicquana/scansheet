import os
import subprocess
from pathlib import Path


class AudiverisError(RuntimeError):
    """Raised when Audiveris fails to generate a MusicXML output."""


def run_audiveris(image_path: Path, output_dir: Path) -> Path:
    """Run Audiveris in batch mode and return the generated MusicXML path."""
    audiveris_bin = os.getenv("AUDIVERIS_BIN", "audiveris")

    command = [
        audiveris_bin,
        "-batch",
        "-export",
        "-output",
        str(output_dir),
        str(image_path),
    ]

    try:
        completed = subprocess.run(
            command,
            check=False,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError as exc:
        raise AudiverisError(
            f"Audiveris binary not found. Set AUDIVERIS_BIN or install audiveris. ({exc})"
        ) from exc

    if completed.returncode != 0:
        message = completed.stderr.strip() or completed.stdout.strip() or "Unknown Audiveris error"
        raise AudiverisError(f"Audiveris failed: {message}")

    musicxml_candidates = sorted(
        output_dir.rglob("*.musicxml")
    ) + sorted(output_dir.rglob("*.xml")) + sorted(output_dir.rglob("*.mxl"))

    if not musicxml_candidates:
        raise AudiverisError(
            "Audiveris finished but no MusicXML file was found in output directory."
        )

    return musicxml_candidates[0]
