# -------- Frontend build --------
FROM node:20-bookworm AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# -------- Runtime --------
FROM python:3.11-slim-bookworm

ARG AUDIVERIS_VERSION=5.4.0
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV AUDIVERIS_BIN=/usr/local/bin/audiveris

WORKDIR /app

# Java is required by Audiveris CLI.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openjdk-17-jre-headless wget unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Audiveris CLI from official release archive.
RUN wget -q -O /tmp/audiveris.zip "https://github.com/Audiveris/audiveris/releases/download/${AUDIVERIS_VERSION}/Audiveris-${AUDIVERIS_VERSION}-linux-x86_64.zip" \
    && unzip /tmp/audiveris.zip -d /opt \
    && AUD_DIR=$(find /opt -maxdepth 1 -type d -name 'Audiveris*' | head -n1) \
    && ln -s "$AUD_DIR/bin/audiveris" /usr/local/bin/audiveris \
    && rm /tmp/audiveris.zip

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend ./backend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 8000
CMD ["python", "backend/run.py"]
