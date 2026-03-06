# -------- Frontend build --------
FROM node:20-bookworm AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# -------- Runtime --------
FROM python:3.11-slim-bookworm

ARG AUDIVERIS_VERSION=5.8.1
ARG AUDIVERIS_UBUNTU_FLAVOR=24.04
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV AUDIVERIS_BIN=/usr/local/bin/audiveris

WORKDIR /app

# Install Audiveris Linux installer (.deb). Since Audiveris 5.5+, official assets are .deb packages.
RUN apt-get update \
    && apt-get install -y --no-install-recommends wget ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN wget -q -O /tmp/audiveris.deb "https://github.com/Audiveris/audiveris/releases/download/${AUDIVERIS_VERSION}/Audiveris-${AUDIVERIS_VERSION}-ubuntu${AUDIVERIS_UBUNTU_FLAVOR}-x86_64.deb" \
    && apt-get update \
    && apt-get install -y --no-install-recommends /tmp/audiveris.deb \
    && ln -sf /opt/audiveris/bin/Audiveris /usr/local/bin/audiveris \
    && rm -f /tmp/audiveris.deb \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend ./backend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 8000
CMD ["python", "backend/run.py"]
