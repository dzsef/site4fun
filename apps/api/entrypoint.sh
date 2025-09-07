#!/usr/bin/env bash
set -e

alembic upgrade head || true

if [ -n "${ADMIN_EMAIL}" ] && [ -n "${ADMIN_PASSWORD}" ]; then
  python -m app.scripts.create_admin || true
fi

exec gunicorn -k uvicorn.workers.UvicornWorker app.main:app   --bind 0.0.0.0:8000 --workers 2 --timeout 60
