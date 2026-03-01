import os
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
                file_id, download_target = store.create_download_path()
                original_key = transpose_to_c_major(musicxml_path, download_target)
            except (AudiverisError, TransposeError) as exc:
                raise HTTPException(status_code=500, detail=str(exc)) from exc

            download_url = str(request.url_for("download_transposed", file_id=file_id))
            results.append(
                {
                    "filename": upload.filename,
                    "original_key": original_key,
                    "download_url": download_url,
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


@app.get("/api/download/{file_id}", name="download_transposed")
def download_transposed(file_id: str):
    file_path = store.resolve(file_id)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found or expired")

    return FileResponse(
        file_path,
        media_type="application/vnd.recordare.musicxml+xml",
        filename=f"transposed-{file_id}.musicxml",
    )


# Serve built React app when available.
FRONTEND_DIST = Path("frontend/dist")
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
