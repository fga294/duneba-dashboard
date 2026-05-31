#!/usr/bin/env bash
#
# restore-env-mini.sh — push this (dev) machine's .env.local to the production Mac Mini.
#
# Why this exists: .env.local is gitignored, so a clean re-clone / disk swap / NAS
# migration leaves the Mini with NO env file. NextAuth then aborts at startup with
# [next-auth][error][NO_SECRET] (MissingSecretError) — the loud first symptom of a
# wholly-absent env file. The dev Mac is the source of truth for these secrets; this
# script pushes that copy back to the Mini.
#
# Usage:
#   ./scripts/restore-env-mini.sh
# Override the target if the host/path ever changes:
#   MINI_HOST=maclinux@192.168.1.26 MINI_REPO=/home/maclinux/duneba-dashboard \
#     ./scripts/restore-env-mini.sh
#
# Safe to commit: this transfers the file, it does not embed any secret values.

set -euo pipefail

MINI_HOST="${MINI_HOST:-maclinux@192.168.1.26}"
MINI_REPO="${MINI_REPO:-/home/maclinux/duneba-dashboard}"

# Resolve repo root from this script's location, so it runs from any CWD.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_ENV="$SCRIPT_DIR/../.env.local"

# Required keys (CLAUDE.md "Environment variables"). WEATHER_LOCATION_NAME and
# PHOTOS_DIR are intentionally optional and not listed.
REQUIRED_KEYS=(
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  NEXTAUTH_SECRET
  NEXTAUTH_URL
  ALLOWED_EMAIL
  WEATHERAPI_KEY
  WEATHER_LOCATION
  CALENDAR_NAME
)

# The Mini is a localhost-only kiosk; NEXTAUTH_URL must always be this on the Mini,
# regardless of what the dev machine uses locally (e.g. a tunnel for testing).
KIOSK_NEXTAUTH_URL="http://localhost:3000"

die() { printf '✗ %s\n' "$1" >&2; exit 1; }

# --- Pre-flight: validate the local source before touching the Mini -----------------
[ -f "$LOCAL_ENV" ] || die "No .env.local found at $LOCAL_ENV — nothing to push."

missing=()
for key in "${REQUIRED_KEYS[@]}"; do
  # match KEY=<at least one non-whitespace char>, ignoring surrounding quotes/space
  grep -qE "^${key}=[[:space:]]*[\"']?[^[:space:]\"']" "$LOCAL_ENV" || missing+=("$key")
done
if [ "${#missing[@]}" -gt 0 ]; then
  die "Local .env.local is missing/empty keys: ${missing[*]} — refusing to push a partial file."
fi
echo "✓ Pre-flight: all ${#REQUIRED_KEYS[@]} required keys present in local .env.local"

# --- Build a sanitized copy with the kiosk NEXTAUTH_URL forced ----------------------
TMP_ENV="$(mktemp)"
trap 'rm -f "$TMP_ENV"' EXIT
# Replace any existing NEXTAUTH_URL line with the kiosk value (idempotent).
sed "s|^NEXTAUTH_URL=.*|NEXTAUTH_URL=${KIOSK_NEXTAUTH_URL}|" "$LOCAL_ENV" > "$TMP_ENV"

# --- Push + lock down permissions ---------------------------------------------------
echo "→ Copying to ${MINI_HOST}:${MINI_REPO}/.env.local …"
scp -q "$TMP_ENV" "${MINI_HOST}:${MINI_REPO}/.env.local"
ssh "$MINI_HOST" "chmod 600 ${MINI_REPO}/.env.local"

# --- Verify on the Mini (key names + perms only, never values) ----------------------
echo "✓ Pushed. Verifying on the Mini:"
ssh "$MINI_HOST" "ls -la ${MINI_REPO}/.env.local; \
  echo '  keys:'; grep -oE '^[A-Z_]+=' ${MINI_REPO}/.env.local | sed 's/=//' | sed 's/^/    /'; \
  grep -q '^NEXTAUTH_SECRET=.\{16,\}' ${MINI_REPO}/.env.local \
    && echo '  ✓ NEXTAUTH_SECRET present' || echo '  ✗ NEXTAUTH_SECRET MISSING'"

cat <<EOF

Done. The dashboard runs manually in a foreground terminal and only reads env at
startup, so restart it on the Mini to pick up the change:

    Ctrl-C
    npm run start

(No rebuild needed — NEXTAUTH_SECRET is read at request time, not baked into .next.)
EOF
