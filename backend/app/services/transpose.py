import copy
from pathlib import Path
import xml.etree.ElementTree as ET
import zipfile

from music21 import converter, interval, key, layout, pitch, spanner, stream


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


def _read_musicxml_bytes(source_path: Path) -> bytes:
    if source_path.suffix.lower() != ".mxl":
        return source_path.read_bytes()

    with zipfile.ZipFile(source_path, "r") as zf:
        container_xml = zf.read("META-INF/container.xml")
        root = ET.fromstring(container_xml)
        rootfile = root.find(".//{*}rootfile")
        if rootfile is None:
            raise TransposeError("Missing rootfile in MXL container")

        full_path = rootfile.attrib.get("full-path")
        if not full_path:
            raise TransposeError("Invalid rootfile path in MXL")
        return zf.read(full_path)


def _xml_level_transpose_to_c_major(
    source_path: Path, output_path: Path, transpose_interval: interval.Interval
) -> None:
    xml_bytes = _read_musicxml_bytes(source_path)
    root = ET.fromstring(xml_bytes)

    # Update key signatures to C major.
    for fifths in root.findall(".//{*}key/{*}fifths"):
        fifths.text = "0"

    # Transpose every notated pitch.
    for pitch_node in root.findall(".//{*}note/{*}pitch"):
        step_node = pitch_node.find("{*}step")
        octave_node = pitch_node.find("{*}octave")
        alter_node = pitch_node.find("{*}alter")
        if step_node is None or octave_node is None or not step_node.text or not octave_node.text:
            continue

        alter_value = 0
        if alter_node is not None and alter_node.text:
            try:
                alter_value = int(float(alter_node.text))
            except ValueError:
                alter_value = 0

        note_name = step_node.text + ("#" * max(alter_value, 0)) + ("-" * max(-alter_value, 0))
        p = pitch.Pitch(f"{note_name}{octave_node.text}")
        p = p.transpose(transpose_interval)

        step_node.text = p.step
        octave_node.text = str(p.octave if p.octave is not None else octave_node.text)
        if p.accidental is None or p.accidental.alter == 0:
            if alter_node is not None:
                pitch_node.remove(alter_node)
        else:
            if alter_node is None:
                alter_node = ET.SubElement(pitch_node, "alter")
            alter_node.text = str(int(p.accidental.alter))

    ET.ElementTree(root).write(output_path, encoding="utf-8", xml_declaration=True)


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

    try:
        _write_musicxml_with_fallback(transposed, output_path)
    except TransposeError:
        # Final fallback for writer edge-cases: apply transposition directly in MusicXML.
        _xml_level_transpose_to_c_major(source_path, output_path, transpose_interval)

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
        output_path.write_bytes(_read_musicxml_bytes(source_path))
    except Exception as exc:
        raise TransposeError(f"Failed to export original MusicXML: {exc}") from exc
