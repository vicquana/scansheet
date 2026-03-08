from pathlib import Path

from PIL import Image, ImageFilter, ImageOps


class PreprocessError(RuntimeError):
    """Raised when image normalization for OMR fails."""


def _otsu_threshold(gray: Image.Image) -> int:
    histogram = gray.histogram()
    total = sum(histogram)
    if total == 0:
        return 128

    sum_total = 0
    for index, count in enumerate(histogram):
        sum_total += index * count

    sum_background = 0.0
    weight_background = 0
    max_variance = -1.0
    threshold = 128

    for value in range(256):
        weight_background += histogram[value]
        if weight_background == 0:
            continue

        weight_foreground = total - weight_background
        if weight_foreground == 0:
            break

        sum_background += value * histogram[value]
        mean_background = sum_background / weight_background
        mean_foreground = (sum_total - sum_background) / weight_foreground
        variance_between = (
            weight_background * weight_foreground * (mean_background - mean_foreground) ** 2
        )

        if variance_between > max_variance:
            max_variance = variance_between
            threshold = value

    return threshold


def normalize_image_for_omr(source_path: Path, target_path: Path) -> Path:
    """Normalize page image to OMR-friendly format and 300 DPI metadata."""
    try:
        image = Image.open(source_path).convert("RGB")
    except Exception as exc:
        raise PreprocessError(f"Failed to open image for OMR normalization: {exc}") from exc

    try:
        dpi_info = image.info.get("dpi", (0, 0))
        x_dpi = float(dpi_info[0]) if dpi_info and dpi_info[0] else 0.0

        # If DPI is low (or missing), upscale moderately for better note recognition.
        # Keep scaling bounded to avoid huge files from mobile captures.
        if x_dpi <= 0:
            scale = 2.0
        elif x_dpi < 300:
            scale = min(300.0 / x_dpi, 2.5)
        else:
            scale = 1.0

        if scale > 1.0:
            width = int(image.width * scale)
            height = int(image.height * scale)
            image = image.resize((width, height), Image.Resampling.LANCZOS)

        # Force high-contrast black/white sheet:
        # - background => pure white
        # - notation/staff lines => pure black
        gray = ImageOps.autocontrast(image.convert("L"))
        denoised = gray.filter(ImageFilter.MedianFilter(size=3))
        threshold = _otsu_threshold(denoised)
        binary = denoised.point(lambda p: 255 if p > threshold else 0, mode="1")
        image = binary.convert("RGB")

        target_path.parent.mkdir(parents=True, exist_ok=True)
        image.save(target_path, format="PNG", optimize=True, dpi=(300, 300))
        return target_path
    except Exception as exc:
        raise PreprocessError(f"Failed to normalize image for OMR: {exc}") from exc
    finally:
        image.close()
