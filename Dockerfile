# -------- Frontend build --------
FROM node:20-bookworm AS frontend-builder
WORKDIR /app/frontend
RUN npm i -g pnpm
COPY frontend/package.json frontend/pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm build

# -------- Runtime --------
FROM ubuntu:24.04

ARG AUDIVERIS_VERSION=5.8.1
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV AUDIVERIS_BIN=/usr/local/bin/audiveris

WORKDIR /app

# Python runtime + Java + native libs required by Audiveris.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
      wget \
      xdg-utils \
      python3 \
      python3-pip \
      python3-venv \
      openjdk-17-jre-headless \
      fontconfig \
      libasound2t64 \
      libasound2-data \
      libfreetype6 \
      libxi6 \
      libxext6 \
      libxrender1 \
      libxtst6 \
    && rm -rf /var/lib/apt/lists/*

# Resolve Audiveris .deb URL by release + architecture, then unpack without postinst scripts.
RUN set -eux; \
    arch="$(dpkg --print-architecture)"; \
    if [ "$arch" = "amd64" ]; then \
      aud_arch="x86_64"; \
    elif [ "$arch" = "arm64" ]; then \
      aud_arch="aarch64"; \
    else \
      echo "Unsupported architecture: $arch"; exit 1; \
    fi; \
    base="https://github.com/Audiveris/audiveris/releases/download/${AUDIVERIS_VERSION}"; \
    url24="$base/Audiveris-${AUDIVERIS_VERSION}-ubuntu24.04-${aud_arch}.deb"; \
    url22="$base/Audiveris-${AUDIVERIS_VERSION}-ubuntu22.04-${aud_arch}.deb"; \
    if wget -q -O /tmp/audiveris.deb "$url24"; then \
      echo "Using $url24"; \
    elif wget -q -O /tmp/audiveris.deb "$url22"; then \
      echo "Using $url22"; \
    else \
      echo "Could not download Audiveris .deb for ${AUDIVERIS_VERSION} (${aud_arch})"; \
      exit 1; \
    fi; \
    rm -rf /opt/audiveris; \
    mkdir -p /opt/audiveris; \
    dpkg-deb -x /tmp/audiveris.deb /opt/audiveris; \
    if [ -x /opt/audiveris/opt/audiveris/bin/Audiveris ]; then \
      ln -sf /opt/audiveris/opt/audiveris/bin/Audiveris /usr/local/bin/audiveris; \
    elif [ -x /opt/audiveris/bin/Audiveris ]; then \
      ln -sf /opt/audiveris/bin/Audiveris /usr/local/bin/audiveris; \
    else \
      echo "Audiveris binary not found after extracting package"; \
      find /opt/audiveris -maxdepth 5 -type f -name 'Audiveris' || true; \
      exit 1; \
    fi; \
    rm -f /tmp/audiveris.deb; \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN python3 -m pip install --break-system-packages --no-cache-dir -r requirements.txt

COPY backend ./backend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 8000
CMD ["python3", "backend/run.py"]
