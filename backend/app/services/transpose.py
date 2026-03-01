from pathlib import Path

from music21 import converter, interval, key, stream


class TransposeError(RuntimeError):
    """Raised when parsing or transposition fails."""


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
        transposed.write("musicxml", fp=str(output_path))
    except Exception as exc:
        raise TransposeError(f"Failed to write transposed MusicXML: {exc}") from exc

    return f"{detected_key.tonic.name} {detected_key.mode}"
