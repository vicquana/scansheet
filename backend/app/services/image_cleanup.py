from pathlib import Path
from typing import Sequence

from PIL import Image, ImageFilter, ImageOps


class ImageCleanupError(RuntimeError):
    """Raised when cleaned image generation fails."""


def _clean_page(source_image: Path) -> Image.Image:
    try:
        image = Image.open(source_image).convert("L")
    except Exception as exc:
        raise ImageCleanupError(f"Failed to open image for cleanup: {exc}") from exc

    # Improve readability: autocontrast -> denoise -> binary threshold.
    processed = ImageOps.autocontrast(image)
    processed = processed.filter(ImageFilter.MedianFilter(size=3))
    processed = processed.point(lambda p: 255 if p > 160 else 0, mode="1")
    return processed.convert("RGB")


def generate_clean_sheet_outputs(source_image: Path, jpeg_output: Path, pdf_output: Path) -> None:
    """Create cleaned JPEG + PDF artifacts from a single sheet image."""
    processed_rgb = _clean_page(source_image)

    try:
        processed_rgb.save(jpeg_output, format="JPEG", quality=95, optimize=True)
        processed_rgb.save(pdf_output, format="PDF", resolution=300.0)
    except Exception as exc:
        raise ImageCleanupError(f"Failed to save cleaned image outputs: {exc}") from exc
    finally:
        processed_rgb.close()


def generate_clean_sheet_outputs_from_images(
    source_images: Sequence[Path], jpeg_output: Path, pdf_output: Path
) -> None:
    """Create cleaned combined JPEG + multi-page PDF from ordered sheet images."""
    if not source_images:
        raise ImageCleanupError("No images were provided for cleanup.")

    pages = [_clean_page(path) for path in source_images]

    # Build one long JPEG so users can quickly preview all pages on mobile.
    max_width = max(page.width for page in pages)
    total_height = sum(page.height for page in pages)
    combined = Image.new("RGB", (max_width, total_height), color="white")
    cursor_y = 0
    for page in pages:
        offset_x = (max_width - page.width) // 2
        combined.paste(page, (offset_x, cursor_y))
        cursor_y += page.height

    try:
        combined.save(jpeg_output, format="JPEG", quality=95, optimize=True)
        first, *rest = pages
        first.save(pdf_output, format="PDF", save_all=True, append_images=rest, resolution=300.0)
    except Exception as exc:
        raise ImageCleanupError(f"Failed to save cleaned combined outputs: {exc}") from exc
    finally:
        combined.close()
        for page in pages:
            page.close()
