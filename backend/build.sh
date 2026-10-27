#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
export DJANGO_SETTINGS_MODULE=config.settings.production
python -m pip install -r requirements/production.txt
python manage.py check --deploy --fail-level WARNING
python manage.py collectstatic --no-input
