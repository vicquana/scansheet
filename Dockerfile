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
    AUDIVERIS_URL="$(api="$api" arch="$arch" python -c 'import json, os, re, urllib.request; api=os.environ["api"]; arch=os.environ["arch"]; data=json.load(urllib.request.urlopen(api)); pats=[r"x86_64", r"amd64"] if arch=="amd64" else ([r"arm64", r"aarch64"] if arch=="arm64" else []); c=[];\
for a in data.get("assets", []):\
 n=a.get("name",""); u=a.get("browser_download_url","");\
 if not n.lower().endswith(".deb"): continue;\
 s=0;\
 if "ubuntu" in n.lower(): s+=3;\
 if pats and any(re.search(p,n,re.I) for p in pats): s+=10;\
 c.append((s,n,u));\
print(sorted(c, reverse=True)[0][2] if c else "")')"; \
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
