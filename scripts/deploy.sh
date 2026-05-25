#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="${PM2_APP_NAME:-archivist}"
PORT="${PORT:-5000}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:${PORT}/health}"

step() {
  printf '\n==> %s\n' "$1"
}

fail() {
  printf '\nDEPLOY FAILED: %s\n' "$1" >&2
  printf 'The app was only restarted after a successful build step. If the restart or health check failed, run: bash scripts/rollback.sh\n' >&2
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

step "Checking deploy folder safety"
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  git status --short --untracked-files=no
  fail "This deploy folder has local tracked file changes. Commit them or reset them before deploying."
fi

mkdir -p .deploy
BEFORE_COMMIT="$(git rev-parse HEAD)"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
printf '%s\n' "$BEFORE_COMMIT" > .deploy/rollback-commit
printf '%s\n' "$BRANCH" > .deploy/rollback-branch

step "Current version"
printf 'Folder: %s\n' "$ROOT"
printf 'Branch: %s\n' "$BRANCH"
printf 'Current commit: %s\n' "$BEFORE_COMMIT"
printf 'PM2 app name: %s\n' "$APP_NAME"

step "Pulling latest GitHub changes"
git pull --ff-only origin "$BRANCH"
AFTER_COMMIT="$(git rev-parse HEAD)"
printf 'Now at commit: %s\n' "$AFTER_COMMIT"

step "Installing dependencies on the droplet"
if [ -f "package-lock.json" ]; then
  npm ci
else
  npm install
fi

step "Running code checks"
npm run check

step "Building production files"
npm run build

step "Verifying build output"
npm run verify:build-output

step "Restarting PM2 only after successful install, checks, and build"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME" --update-env
else
  printf 'PM2 app "%s" was not found, so it will be started with npm run start.\n' "$APP_NAME"
  pm2 start npm --name "$APP_NAME" -- run start
fi

step "Waiting for app health"
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
    printf 'Health URL failed: %s\n' "$HEALTH_URL" >&2
    cat /tmp/archivist-health.err >&2 || true
    printf '\nAttempting automatic rollback to previous commit %s...\n' "$BEFORE_COMMIT" >&2
    bash scripts/rollback.sh --auto
    fail "Health check failed after deploy, so rollback was attempted."
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

printf '\nDEPLOY COMPLETE\n'
printf 'Previous version saved for rollback: %s\n' "$BEFORE_COMMIT"
printf 'Live version: %s\n' "$AFTER_COMMIT"
