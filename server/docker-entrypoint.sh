#!/bin/sh
set -e
if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "entrypoint: applying migrations"
  python manage.py migrate --noinput
fi
exec "$@"
