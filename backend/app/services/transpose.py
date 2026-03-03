import copy
from pathlib import Path
import xml.etree.ElementTree as ET
import zipfile

from music21 import converter, interval, key, layout, spanner, stream


class TransposeError(RuntimeError):
    """Raised when parsing or transposition fails."""


def _write_musicxml_with_fallback(score: stream.Score, output_path: Path) -> None:
    try:
        score.write("musicxml", fp=str(output_path))
        return
    except Exception as primary_exc:
        primary_error = repr(primary_exc)

    # Some OMR edge-cases fail in music21 exporter (for example KeyError-like failures).
    # Retry after removing non-essential layout/spanner metadata and normalizing notation.
    try:
        fallback_score = copy.deepcopy(score)

        for layout_cls in (layout.PageLayout, layout.SystemLayout, layout.StaffLayout):
            for element in list(fallback_score.recurse().getElementsByClass(layout_cls)):
                if element.activeSite is not None:
                    element.activeSite.remove(element)

        for element in list(fallback_score.recurse().getElementsByClass(spanner.Spanner)):
            if element.activeSite is not None:
                element.activeSite.remove(element)

        fallback_score.makeNotation(inPlace=True)
        fallback_score.write("musicxml", fp=str(output_path))
    except Exception as fallback_exc:
        raise TransposeError(
            "Failed to write transposed MusicXML: "
            f"primary={primary_error}; fallback={repr(fallback_exc)}"
        ) from fallback_exc


def transpose_to_c_major(source_path: Path, output_path: Path) -> str:
    """Analyze key and transpose score so tonic maps to C."""
    try:
        score: stream.Score = converter.parse(str(source_path))
    except Exception as exc:  # music21 raises several parser-specific exceptions.
        raise TransposeError(f"Failed to parse MusicXML: {exc}") from exc

    try:
        detected_key = score.analyze("key")
    except Exception as exc:
        raise TransposeError(f"Failed to analyze key: {exc}") from exc

    transpose_interval = interval.Interval(detected_key.tonic, key.Key("C").tonic)
    transposed = score.transpose(transpose_interval)

    # Normalize key signatures to C major (0 sharps/flats) in the resulting score.
    for key_signature in transposed.recurse().getElementsByClass(key.KeySignature):
        key_signature.sharps = 0

    _write_musicxml_with_fallback(transposed, output_path)

    return f"{detected_key.tonic.name} {detected_key.mode}"


def export_original_musicxml(source_path: Path, output_path: Path) -> None:
    """Normalize OMR output (including .mxl) to an uncompressed MusicXML file."""
    try:
        score: stream.Score = converter.parse(str(source_path))
        score.write("musicxml", fp=str(output_path))
        return
    except Exception:
        # Fall through to archive extraction fallback for problematic .mxl files.
        pass

    if source_path.suffix.lower() != ".mxl":
        raise TransposeError("Failed to export original MusicXML: unsupported non-MXL fallback")

    try:
        with zipfile.ZipFile(source_path, "r") as zf:
            container_xml = zf.read("META-INF/container.xml")
            root = ET.fromstring(container_xml)
            rootfile = root.find(".//{*}rootfile")
            if rootfile is None:
                raise TransposeError("Failed to export original MusicXML: missing rootfile in MXL container")

            full_path = rootfile.attrib.get("full-path")
            if not full_path:
                raise TransposeError("Failed to export original MusicXML: invalid rootfile path in MXL")

            xml_bytes = zf.read(full_path)
            output_path.write_bytes(xml_bytes)
    except Exception as exc:
        raise TransposeError(f"Failed to export original MusicXML: {exc}") from exc
