#!/bin/sh
set -eu
cd /app
# Render's generateValue is a stable, base64-encoded 256-bit value.
if [ -z "${APP_KEY:-}" ] && [ -n "${APP_KEY_BASE64:-}" ]; then
    export APP_KEY="base64:${APP_KEY_BASE64}"
fi
: "${APP_KEY:?Set a stable APP_KEY or APP_KEY_BASE64 in Render}"
if [ -n "${RENDER_EXTERNAL_URL:-}" ]; then
    export APP_URL="$RENDER_EXTERNAL_URL"
fi
# Free Render services have no pre-deploy jobs. Run idempotent setup at startup.
php artisan restaurant:prepare-database
php artisan migrate --force
php artisan db:seed --force
php artisan restaurant:demo
exec supervisord -c /etc/supervisord.conf
