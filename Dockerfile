# -------- Frontend build --------
FROM node:20-bookworm AS frontend-builder
WORKDIR /app/frontend
RUN npm i -g pnpm
COPY frontend/package.json frontend/pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm build

# -------- Runtime --------
FROM python:3.11-slim-bookworm

ARG AUDIVERIS_VERSION=5.8.1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV AUDIVERIS_BIN=/usr/local/bin/audiveris

WORKDIR /app

# Runtime libs + Java required by Audiveris.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
      wget \
      openjdk-17-jre-headless \
      fontconfig \
      libfreetype6 \
      libxi6 \
      libxext6 \
      libxrender1 \
      libxtst6 \
    && rm -rf /var/lib/apt/lists/*

# Resolve Audiveris .deb URL from GitHub release assets by version + architecture.
RUN set -eux; \
    arch="$(dpkg --print-architecture)"; \
    api="https://api.github.com/repos/Audiveris/audiveris/releases/tags/${AUDIVERIS_VERSION}"; \
    if [ "$arch" = "amd64" ]; then \
      arch_regex='(x86_64|amd64)'; \
    elif [ "$arch" = "arm64" ]; then \
      arch_regex='(arm64|aarch64)'; \
    else \
      arch_regex=''; \
    fi; \
    release_json="$(curl -fsSL "$api")"; \
    AUDIVERIS_URL="$(printf '%s\n' "$release_json" | grep -oE 'https://[^"]+\.deb' | grep -Ei 'ubuntu' | grep -Ei "$arch_regex" | head -n1)"; \
    if [ -z "$AUDIVERIS_URL" ]; then \
      AUDIVERIS_URL="$(printf '%s\n' "$release_json" | grep -oE 'https://[^"]+\.deb' | grep -Ei 'ubuntu' | head -n1)"; \
    fi; \
    test -n "$AUDIVERIS_URL"; \
    wget -q -O /tmp/audiveris.deb "$AUDIVERIS_URL"; \
    dpkg -i /tmp/audiveris.deb || (apt-get update && apt-get install -y -f); \
    if [ -x /opt/audiveris/bin/Audiveris ]; then \
      ln -sf /opt/audiveris/bin/Audiveris /usr/local/bin/audiveris; \
    elif command -v Audiveris >/dev/null 2>&1; then \
      ln -sf "$(command -v Audiveris)" /usr/local/bin/audiveris; \
    fi; \
    rm -f /tmp/audiveris.deb; \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend ./backend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 8000
CMD ["python", "backend/run.py"]
