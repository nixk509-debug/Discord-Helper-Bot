# Beginner Deployment Guide

This project is set up for LOW LAPTOP MODE:

- Codex edits the repo.
- GitHub stores the source of truth.
- The droplet installs, checks, builds, and deploys.
- Your laptop only reviews changes, prompts Codex, and SSHs into the droplet when needed.
- Avoid running `npm install`, `npm run build`, or `npm run dev` on the laptop unless there is no other choice.

## What This Project Is

- Framework: Vite + React frontend with an Express server.
- Language/runtime: Node.js with TypeScript source.
- Package manager: npm, because this repo has `package-lock.json`.
- Install command on droplet: `npm ci`.
- Check command on droplet: `npm run check`.
- Build command on droplet: `npm run build`.
- Production start command: `npm run start`.
- PM2 app name: `archivist`.
- Default app port: `5000`.
- Health check URL on the droplet: `http://127.0.0.1:5000/health`.

## Environment Variables

Keep these in `.env` on the droplet. Do not commit `.env` to GitHub.

Required for normal production:

```bash
APP_URL=https://your-real-domain.com
DATABASE_URL=postgres://user:password@host:5432/database
SESSION_SECRET=replace-with-a-long-random-secret
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
```

Common optional values:

```bash
PUBLIC_BASE_URL=https://your-real-domain.com
PORT=5000
TRUST_PROXY=1
DISCORD_BOT_TOKEN=your-discord-bot-token
OWNER_IDS=your-discord-user-id
OWNER_LOGIN_USERNAME=owner
OWNER_LOGIN_PASSWORD=your-owner-login-password
OWNER_LOGIN_SERVER_IDS=comma-separated-server-ids
STUDIO_ACTION_SECRET=replace-with-a-long-random-secret
EMBED_ACTION_SECRET=replace-with-a-long-random-secret
PREMIUM_CHECKOUT_URL=https://...
PREMIUM_MANAGE_URL=https://...
PREMIUM_SUPPORT_URL=https://...
LOCKR_WEBHOOK_SECRET=replace-if-used
```

If you do not know a secret, do not invent one. Ask Codex to help identify where it comes from.

## Recommended Droplet Folder Structure

Use one safe project folder for the GitHub repo:

```bash
/opt/archivist/Discord-Helper-Bot
```

Keep persistent files inside or beside that folder, but do not commit them:

```bash
/opt/archivist/Discord-Helper-Bot/.env
/opt/archivist/Discord-Helper-Bot/uploads
/opt/archivist/Discord-Helper-Bot/logs
```

The deploy scripts do not delete `.env`, uploads, logs, database files, or other untracked storage.

## First-Time Droplet Setup

SSH into the droplet:

```bash
ssh root@YOUR_DROPLET_IP
```

Go to the parent folder:

```bash
mkdir -p /opt/archivist
cd /opt/archivist
```

Clone the GitHub repo if it is not already there:

```bash
git clone https://github.com/nixk509-debug/Discord-Helper-Bot.git
cd Discord-Helper-Bot
```

Create the droplet-only `.env` file:

```bash
nano .env
```

Paste your real values, save, and exit. Do not put `.env` in GitHub.

Make the deploy scripts runnable:

```bash
chmod +x scripts/deploy.sh scripts/rollback.sh
```

## One-Command Deploy

Run this on the droplet from the project folder:

```bash
cd /opt/archivist/Discord-Helper-Bot
bash scripts/deploy.sh
```

What it does in plain English:

- Confirms you are in the right project folder.
- Stops if tracked files were edited directly on the droplet.
- Saves the current commit as the rollback target.
- Pulls the latest GitHub changes.
- Installs dependencies on the droplet.
- Runs TypeScript checks.
- Builds the production app.
- Verifies the build output exists.
- Restarts PM2 only after the build succeeds.
- Checks `/health`.
- Shows PM2 status.

## How To Know Deploy Worked

The deploy worked if you see:

```text
DEPLOY COMPLETE
```

Also check:

```bash
pm2 status archivist
curl -sS http://127.0.0.1:5000/health
```

The health check should return JSON with `ok` set to `true`.

## Rollback

Use rollback if a deploy fails or the new version behaves badly.

Run this on the droplet:

```bash
cd /opt/archivist/Discord-Helper-Bot
bash scripts/rollback.sh
```

What rollback does:

- Reads the previous commit saved by the deploy script.
- Restores tracked source files to that commit.
- Does not delete `.env`, uploads, logs, database files, or other untracked storage.
- Installs dependencies.
- Runs checks.
- Builds.
- Restarts PM2.
- Checks `/health`.

Rollback worked if you see:

```text
ROLLBACK COMPLETE
```

## Nginx Assumptions

Nginx should point your domain to the app running on port `5000`.

The important proxy target is:

```nginx
proxy_pass http://127.0.0.1:5000;
```

WebSockets should be allowed because the app has a `/ws` path:

```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

Do not edit nginx unless you are changing the domain, SSL certificate, or app port.

## What Not To Touch

Do not edit these directly on the droplet unless you specifically know why:

- `.env`, except when changing real secrets or domain settings.
- `node_modules`, because it is rebuilt by `npm ci`.
- `dist`, because it is rebuilt by `npm run build`.
- PM2 internals in `~/.pm2`.
- nginx config, unless the domain or port changes.
- database files, uploads, logs, or persistent storage.

Do not use the laptop as the main dev server. The laptop workflow should be:

```text
Codex changes code -> GitHub stores code -> droplet deploys code
```

## Useful PM2 Commands

Check app status:

```bash
pm2 status archivist
```

Show recent logs:

```bash
pm2 logs archivist --lines 80
```

Restart manually only when needed:

```bash
pm2 restart archivist --update-env
```

Prefer `bash scripts/deploy.sh` for normal deploys because it builds and checks before restarting.
