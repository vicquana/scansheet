from pathlib import Path

import app.main as main_module


def test_convert_single_file_returns_flat_and_results_shape(client, monkeypatch):
    def fake_run_audiveris(_image_path: Path, output_dir: Path) -> Path:
        mock_musicxml = output_dir / "mock.musicxml"
        mock_musicxml.write_text("<score-partwise/>", encoding="utf-8")
        return mock_musicxml

    def fake_transpose(_source: Path, output_path: Path) -> str:
        output_path.write_text("<score-partwise version='4.0' />", encoding="utf-8")
        return "G major"

    monkeypatch.setattr(main_module, "run_audiveris", fake_run_audiveris)
    monkeypatch.setattr(main_module, "transpose_to_c_major", fake_transpose)

    files = {"files": ("score.png", b"image-bytes", "image/png")}
    response = client.post("/api/convert", files=files)

    assert response.status_code == 200
    payload = response.json()
    assert payload["original_key"] == "G major"
    assert len(payload["results"]) == 1
    assert payload["results"][0]["filename"] == "score.png"
    assert payload["download_url"] == payload["results"][0]["download_url"]
    assert "/api/download/" in payload["download_url"]


def test_convert_rejects_non_image_file(client):
    files = {"files": ("notes.txt", b"hello", "text/plain")}
    response = client.post("/api/convert", files=files)

    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]


def test_download_404_when_missing(client):
    response = client.get("/api/download/does-not-exist")
    assert response.status_code == 404
