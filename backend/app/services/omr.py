import os
import subprocess
from pathlib import Path
from typing import Sequence

from PIL import Image


class AudiverisError(RuntimeError):
    """Raised when Audiveris fails to generate a MusicXML output."""


def build_ordered_pdf(image_paths: Sequence[Path], output_pdf: Path) -> Path:
    """Combine ordered images into a single multi-page PDF."""
    if not image_paths:
        raise AudiverisError("No images available to build a combined PDF.")

    try:
        pages = [Image.open(path).convert("RGB") for path in image_paths]
    except Exception as exc:
        raise AudiverisError(f"Failed to read input images for PDF merge: {exc}") from exc

    try:
        first, *rest = pages
        first.save(output_pdf, format="PDF", save_all=True, append_images=rest, resolution=300.0)
    except Exception as exc:
        raise AudiverisError(f"Failed to build ordered PDF for OMR: {exc}") from exc
    finally:
        for page in pages:
            page.close()

    return output_pdf


def run_audiveris(image_path: Path, output_dir: Path) -> Path:
    """Run Audiveris in batch mode and return the generated MusicXML path."""
    audiveris_bin = os.getenv("AUDIVERIS_BIN", "audiveris")

    command = [
        audiveris_bin,
        "-batch",
        "-transcribe",
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

    def _candidates(root: Path) -> list[Path]:
        return [
            path
            for path in root.rglob("*")
            if path.is_file() and path.suffix.lower() in {".musicxml", ".xml", ".mxl"}
        ]

    musicxml_candidates = sorted(_candidates(output_dir))
    if not musicxml_candidates:
        # Audiveris sometimes writes output outside the requested directory on some setups.
        musicxml_candidates = sorted(_candidates(image_path.parent))

    if not musicxml_candidates:
        stderr = completed.stderr.strip()
        stdout = completed.stdout.strip()
        raise AudiverisError(
            "Audiveris finished but no MusicXML file was found. "
            f"stdout={stdout[:300]} stderr={stderr[:300]}"
        )

    return musicxml_candidates[0]
