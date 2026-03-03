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

    def fake_cleanup(_source: Path, jpeg_output: Path, pdf_output: Path) -> None:
        jpeg_output.write_bytes(b"jpeg")
        pdf_output.write_bytes(b"%PDF-1.4")

    monkeypatch.setattr(main_module, "run_audiveris", fake_run_audiveris)
    monkeypatch.setattr(main_module, "transpose_to_c_major", fake_transpose)
    monkeypatch.setattr(main_module, "generate_clean_sheet_outputs", fake_cleanup)

    files = {"files": ("score.png", b"image-bytes", "image/png")}
    response = client.post("/api/convert", files=files, data={"file_last_modified": "100"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["original_key"] == "G major"
    assert len(payload["results"]) == 1
    assert payload["results"][0]["filename"] == "combined-song"
    assert payload["results"][0]["source_files"] == ["score.png"]
    assert payload["download_url"] == payload["results"][0]["download_url"]
    assert "/api/download/" in payload["download_url"]
    assert payload["results"][0]["downloads"]["original_pdf_url"].endswith(".pdf")
    assert payload["results"][0]["downloads"]["original_clean_jpeg_url"].endswith(".jpg")
    assert payload["results"][0]["downloads"]["original_musicxml_url"].endswith(".musicxml")


def test_convert_multiple_files_combines_into_one_result(client, monkeypatch):
    def fake_build_ordered_pdf(image_paths, output_pdf):
        output_pdf.write_bytes(b"%PDF-1.4")
        return output_pdf

    def fake_run_audiveris(_image_path: Path, output_dir: Path) -> Path:
        mock_musicxml = output_dir / "mock.musicxml"
        mock_musicxml.write_text("<score-partwise/>", encoding="utf-8")
        return mock_musicxml

    def fake_export_original(_source: Path, output_path: Path) -> None:
        output_path.write_text("<score-partwise/>", encoding="utf-8")

    def fake_transpose(_source: Path, output_path: Path) -> str:
        output_path.write_text("<score-partwise version='4.0' />", encoding="utf-8")
        return "F major"

    def fake_cleanup_many(_images, jpeg_output: Path, pdf_output: Path) -> None:
        jpeg_output.write_bytes(b"jpeg")
        pdf_output.write_bytes(b"%PDF-1.4")

    monkeypatch.setattr(main_module, "build_ordered_pdf", fake_build_ordered_pdf)
    monkeypatch.setattr(main_module, "run_audiveris", fake_run_audiveris)
    monkeypatch.setattr(main_module, "export_original_musicxml", fake_export_original)
    monkeypatch.setattr(main_module, "transpose_to_c_major", fake_transpose)
    monkeypatch.setattr(main_module, "generate_clean_sheet_outputs_from_images", fake_cleanup_many)

    files = [
        ("files", ("page2.png", b"img-2", "image/png")),
        ("files", ("page1.png", b"img-1", "image/png")),
    ]
    data = [("file_last_modified", "200"), ("file_last_modified", "100")]
    response = client.post("/api/convert", files=files, data=data)

    assert response.status_code == 200
    payload = response.json()
    assert payload["original_key"] == "F major"
    assert len(payload["results"]) == 1
    assert payload["results"][0]["source_files"] == ["page1.png", "page2.png"]
    assert payload["results"][0]["downloads"]["transposed_musicxml_url"].endswith(".musicxml")


def test_convert_rejects_non_image_file(client):
    files = {"files": ("notes.txt", b"hello", "text/plain")}
    response = client.post("/api/convert", files=files)

    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]


def test_download_404_when_missing(client):
    response = client.get("/api/download/does-not-exist")
    assert response.status_code == 404
