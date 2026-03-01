# ScoreTransposer

ScoreTransposer is an MVP full-stack web app that:
- uploads one or more sheet music images (`.jpg/.png`),
- runs Audiveris CLI (`audiveris -batch`) to produce MusicXML,
- detects the original key with `music21`,
- transposes to C major,
- returns download links for transposed MusicXML files.

## Project Structure

```text
scoretransposer/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   └── services/
│   │       ├── omr.py
│   │       ├── storage.py
│   │       └── transpose.py
│   └── run.py
├── frontend/
│   ├── src/
│   │   ├── components/ResultCard.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── Dockerfile
├── requirements.txt
└── .env.example
```

## Local Development

### 1) Backend

Prerequisites:
- Python 3.11+
- Java 17+
- Audiveris CLI available as `audiveris` (or set `AUDIVERIS_BIN` in `.env`)

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
export $(grep -v '^#' .env | xargs)
python backend/run.py
```

Backend runs on `http://localhost:8000`.

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and proxies `/api` to `http://localhost:8000`.

## API

### `POST /api/convert`
- Content-Type: `multipart/form-data`
- Field name: `files` (one or multiple image files)

Single-file response (MVP compatibility):

```json
{
  "original_key": "G major",
  "download_url": "http://localhost:8000/api/download/<id>",
  "results": [
    {
      "filename": "score.png",
      "original_key": "G major",
      "download_url": "http://localhost:8000/api/download/<id>"
    }
  ]
}
```

Batch response:

```json
{
  "results": [
    {
      "filename": "score1.png",
      "original_key": "D major",
      "download_url": "http://localhost:8000/api/download/<id1>"
    },
    {
      "filename": "score2.jpg",
      "original_key": "A major",
      "download_url": "http://localhost:8000/api/download/<id2>"
    }
  ]
}
```

### `GET /api/health`
Liveness endpoint for container/process checks. Returns:

```json
{
  "status": "ok"
}
```

### `GET /api/ready`
Readiness endpoint for platform health checks. Verifies Audiveris binary visibility and writable download storage.
- `200`: dependencies are ready
- `503`: one or more readiness checks failed

### `GET /api/health`
Liveness endpoint for process/container checks.

```json
{
  "status": "ok"
}
```

### `GET /api/ready`
Readiness endpoint for platform health checks.
- `200`: Audiveris binary is available and download directory is writable
- `503`: one or more readiness checks failed

### `GET /api/download/{file_id}`
Downloads the transposed `.musicxml` file.

## Tests

Run backend tests:

```bash
PYTHONPATH=backend pytest backend/tests
```

Test coverage includes:
- `/api/health` and `/api/ready`
- `/api/convert` response shape using mocked OMR/transposition
- missing-file behavior for `/api/download/{file_id}`

## Tests

Run backend tests with:

```bash
PYTHONPATH=backend pytest backend/tests
```

These tests cover:
- `/api/health` and `/api/ready`
- `/api/convert` request/response shape (with mocked OMR/transposition)
- missing download file behavior

## Docker

Build:

```bash
docker build -t scoretransposer .
```

Run:

```bash
docker run -p 8000:8000 --env-file .env scoretransposer
```

Then open `http://localhost:8000`.

## Deploy to Render.com (Docker)

1. Push this project to GitHub.
2. In Render, create a new **Web Service** from the repo.
3. Choose **Docker** environment.
4. Set environment variables from `.env.example`.
5. Deploy.

Render exposes one port; this app serves both frontend static files and FastAPI on port `8000` from one container.
