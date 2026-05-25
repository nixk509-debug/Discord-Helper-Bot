#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="${PM2_APP_NAME:-archivist}"
PORT="${PORT:-5000}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:${PORT}/health}"
AUTO_MODE="0"

if [ "${1:-}" = "--auto" ]; then
  AUTO_MODE="1"
  shift
fi

TARGET_COMMIT="${1:-}"

step() {
  printf '\n==> %s\n' "$1"
}

fail() {
  printf '\nROLLBACK FAILED: %s\n' "$1" >&2
  exit 1
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$ROOT" ]; then
  fail "This folder is not inside a Git repo. Go to the project folder first."
fi

cd "$ROOT"

if [ ! -f "package.json" ] || [ ! -f "server/index.ts" ]; then
  fail "This does not look like the Archivist app root. Expected package.json and server/index.ts."
fi

step "Checking required tools"
command_exists git || fail "git is not installed on this server."
command_exists npm || fail "npm is not installed on this server."
command_exists pm2 || fail "pm2 is not installed on this server."

if [ -z "$TARGET_COMMIT" ]; then
  if [ ! -f ".deploy/rollback-commit" ]; then
    fail "No rollback commit was found. Deploy once with scripts/deploy.sh before using rollback."
  fi
  TARGET_COMMIT="$(tr -d '[:space:]' < .deploy/rollback-commit)"
fi

if [ -z "$TARGET_COMMIT" ]; then
  fail "Rollback commit is empty."
fi

if ! git cat-file -e "${TARGET_COMMIT}^{commit}" 2>/dev/null; then
  fail "Commit ${TARGET_COMMIT} is not available in this repo."
fi

step "Rollback target"
printf 'Folder: %s\n' "$ROOT"
printf 'Restoring commit: %s\n' "$TARGET_COMMIT"
printf 'PM2 app name: %s\n' "$APP_NAME"
printf 'This uses git reset for tracked source files only. It does not delete .env, uploads, database files, logs, or other untracked storage.\n'

if [ "$AUTO_MODE" != "1" ]; then
  printf '\nPress Ctrl+C now if this is not what you wanted. Continuing in 5 seconds...\n'
  sleep 5
fi

mkdir -p .deploy
git rev-parse HEAD > .deploy/failed-version-before-rollback

step "Restoring tracked source files"
git reset --hard "$TARGET_COMMIT"

step "Installing dependencies for the restored version"
if [ -f "package-lock.json" ]; then
  npm ci
else
  npm install
fi

step "Running checks on restored version"
npm run check

step "Building restored version"
npm run build

step "Verifying restored build output"
npm run verify:build-output

step "Restarting PM2 with restored version"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME" --update-env
else
  printf 'PM2 app "%s" was not found, so it will be started with npm run start.\n' "$APP_NAME"
  pm2 start npm --name "$APP_NAME" -- run start
fi

step "Checking restored app health"
if command_exists curl; then
  HEALTH_OK=0
  for attempt in 1 2 3 4 5 6 7 8 9 10; do
    if curl -fsS "$HEALTH_URL" >/tmp/archivist-health.json 2>/tmp/archivist-health.err; then
      HEALTH_OK=1
      break
    fi
    printf 'Health check attempt %s failed; waiting 3 seconds...\n' "$attempt"
    sleep 3
  done

  if [ "$HEALTH_OK" -ne 1 ]; then
    cat /tmp/archivist-health.err >&2 || true
    fail "Rollback build restarted, but health check did not pass at ${HEALTH_URL}."
  fi

  printf 'Health check passed: %s\n' "$HEALTH_URL"
  cat /tmp/archivist-health.json || true
  printf '\n'
else
  printf 'curl is not installed, so the script could not check %s.\n' "$HEALTH_URL"
fi

step "Saving PM2 process list and showing app status"
pm2 save --force
pm2 status "$APP_NAME"

printf '\nROLLBACK COMPLETE\n'
printf 'Restored version: %s\n' "$TARGET_COMMIT"
