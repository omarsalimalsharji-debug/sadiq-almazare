#!/bin/sh
set -eu

mkdir -p "$DATA_DIR" "$MEDIA_STORE_DIR"

# Copy bundled media into the writable store without replacing existing files.
cp -rn /app/seed-media/. "$MEDIA_STORE_DIR"/ 2>/dev/null || true

exec npm start

