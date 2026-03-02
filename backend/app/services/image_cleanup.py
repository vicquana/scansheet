from pathlib import Path

from PIL import Image, ImageFilter, ImageOps


class ImageCleanupError(RuntimeError):
    """Raised when cleaned image generation fails."""


def generate_clean_sheet_outputs(source_image: Path, jpeg_output: Path, pdf_output: Path) -> None:
    """Create cleaned JPEG + PDF artifacts from the pre-OMR sheet image."""
    try:
        image = Image.open(source_image).convert("L")
    except Exception as exc:
        raise ImageCleanupError(f"Failed to open image for cleanup: {exc}") from exc

    # Improve readability: autocontrast -> denoise -> binary threshold.
    processed = ImageOps.autocontrast(image)
    processed = processed.filter(ImageFilter.MedianFilter(size=3))
    processed = processed.point(lambda p: 255 if p > 160 else 0, mode="1")
    processed_rgb = processed.convert("RGB")

    try:
        processed_rgb.save(jpeg_output, format="JPEG", quality=95, optimize=True)
        processed_rgb.save(pdf_output, format="PDF", resolution=300.0)
    except Exception as exc:
        raise ImageCleanupError(f"Failed to save cleaned image outputs: {exc}") from exc
