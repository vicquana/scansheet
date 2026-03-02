SHELL := /bin/bash

.PHONY: setup-backend dev-backend test install-frontend dev-frontend

setup-backend:
	uv venv
	source .venv/bin/activate && uv pip install -r requirements.txt

dev-backend:
	source .venv/bin/activate && export $$(grep -v '^#' .env | xargs) && uv run python backend/run.py

test:
	source .venv/bin/activate && PYTHONPATH=backend uv run pytest backend/tests -q

install-frontend:
	cd frontend && pnpm install

dev-frontend:
	cd frontend && pnpm dev
