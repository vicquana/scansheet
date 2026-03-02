import os
import mimetypes
import shutil
import tempfile
from pathlib import Path
from typing import List

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.services.omr import AudiverisError, run_audiveris
from app.services.storage import DownloadStore
from app.services.transpose import TransposeError, transpose_to_c_major
from app.services.image_cleanup import ImageCleanupError, generate_clean_sheet_outputs

app = FastAPI(title="ScoreTransposer API", version="0.1.0")

# CORS keeps local split-dev (Vite + FastAPI) simple.
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ALLOW_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DOWNLOAD_DIR = Path(os.getenv("DOWNLOAD_DIR", "backend/app/downloads"))
store = DownloadStore(DOWNLOAD_DIR)


def _readiness_status() -> dict:
    audiveris_bin = os.getenv("AUDIVERIS_BIN", "audiveris")
    audiveris_available = shutil.which(audiveris_bin) is not None

    download_dir_writable = True
    try:
        store.base_dir.mkdir(parents=True, exist_ok=True)
        probe = store.base_dir / ".healthcheck.tmp"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink(missing_ok=True)
    except OSError:
        download_dir_writable = False

    ready = audiveris_available and download_dir_writable
    return {
        "ready": ready,
        "checks": {
            "audiveris_available": audiveris_available,
            "download_dir_writable": download_dir_writable,
        },
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/ready")
def readiness():
    status = _readiness_status()
    if not status["ready"]:
        raise HTTPException(status_code=503, detail=status)
    return status


@app.post("/api/convert")
async def convert_sheet_music(request: Request, files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    store.cleanup()
    results = []

    for upload in files:
        if upload.content_type not in {"image/jpeg", "image/png"}:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type for {upload.filename}. Use JPG or PNG.",
            )

        suffix = Path(upload.filename or "input.png").suffix or ".png"

        with tempfile.TemporaryDirectory(prefix="scoretransposer-") as tmp_dir:
            tmp_path = Path(tmp_dir)
            input_image = tmp_path / f"input{suffix}"
            output_dir = tmp_path / "audiveris-output"
            output_dir.mkdir(parents=True, exist_ok=True)

            data = await upload.read()
            input_image.write_bytes(data)

            try:
                musicxml_path = run_audiveris(input_image, output_dir)
                original_musicxml_id, original_musicxml_target = store.create_download_path(".musicxml")
                transposed_musicxml_id, transposed_musicxml_target = store.create_download_path(".musicxml")
                cleaned_jpeg_id, cleaned_jpeg_target = store.create_download_path(".jpg")
                cleaned_pdf_id, cleaned_pdf_target = store.create_download_path(".pdf")

                shutil.copyfile(musicxml_path, original_musicxml_target)
                original_key = transpose_to_c_major(musicxml_path, transposed_musicxml_target)
                generate_clean_sheet_outputs(input_image, cleaned_jpeg_target, cleaned_pdf_target)
            except (AudiverisError, TransposeError, ImageCleanupError, OSError) as exc:
                raise HTTPException(status_code=500, detail=str(exc)) from exc

            transposed_musicxml_url = str(
                request.url_for("download_artifact", artifact_name=transposed_musicxml_id)
            )
            original_musicxml_url = str(
                request.url_for("download_artifact", artifact_name=original_musicxml_id)
            )
            cleaned_jpeg_url = str(
                request.url_for("download_artifact", artifact_name=cleaned_jpeg_id)
            )
            cleaned_pdf_url = str(
                request.url_for("download_artifact", artifact_name=cleaned_pdf_id)
            )
            results.append(
                {
                    "filename": upload.filename,
                    "original_key": original_key,
                    "download_url": transposed_musicxml_url,
                    "downloads": {
                        "transposed_musicxml_url": transposed_musicxml_url,
                        "original_musicxml_url": original_musicxml_url,
                        "original_clean_jpeg_url": cleaned_jpeg_url,
                        "original_pdf_url": cleaned_pdf_url,
                    },
                }
            )

    # Keep a flat shape for single-file clients while supporting true batch responses.
    if len(results) == 1:
        return {
            "original_key": results[0]["original_key"],
            "download_url": results[0]["download_url"],
            "results": results,
        }

    return {"results": results}


@app.get("/api/download/{artifact_name}", name="download_artifact")
def download_artifact(artifact_name: str):
    try:
        file_path = store.resolve(artifact_name)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found or expired")

    media_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
    return FileResponse(
        file_path,
        media_type=media_type,
        filename=file_path.name,
    )


# Serve built React app when available.
FRONTEND_DIST = Path("frontend/dist")
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
