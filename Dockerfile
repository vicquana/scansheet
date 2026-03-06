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
ARG AUDIVERIS_UBUNTU_FLAVOR=24.04
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV AUDIVERIS_BIN=/usr/local/bin/audiveris

WORKDIR /app

# Install runtime libs and Audiveris Linux installer (.deb).
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      ca-certificates \
      wget \
      openjdk-17-jre-headless \
      fontconfig \
      libfreetype6 \
      libxi6 \
      libxext6 \
      libxrender1 \
      libxtst6 \
    && rm -rf /var/lib/apt/lists/*

RUN set -eux; \
    downloaded=""; \
    for flavor in "${AUDIVERIS_UBUNTU_FLAVOR}" "24.04" "22.04"; do \
      url="https://github.com/Audiveris/audiveris/releases/download/${AUDIVERIS_VERSION}/Audiveris-${AUDIVERIS_VERSION}-ubuntu${flavor}-x86_64.deb"; \
      if wget -q -O /tmp/audiveris.deb "$url"; then \
        downloaded="yes"; \
        break; \
      fi; \
    done; \
    test -n "$downloaded"; \
    dpkg -i /tmp/audiveris.deb || (apt-get update && apt-get install -y -f && dpkg -i /tmp/audiveris.deb); \
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
