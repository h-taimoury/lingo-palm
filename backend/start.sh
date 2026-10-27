#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
export DJANGO_SETTINGS_MODULE=config.settings.production
# Free Render services have no pre-deploy command. Apply migrations before
# accepting traffic. Only run one service instance with this demo setup.
python manage.py migrate --no-input
exec gunicorn config.wsgi:application \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers 1 --threads 4 --timeout 120 \
  --access-logfile - --error-logfile -
