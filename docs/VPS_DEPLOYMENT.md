# Archivist VPS Deployment (Node + Nginx + Postgres)

This gets you off Replit and onto your own VPS.

## 1) Server prerequisites
- Ubuntu 22.04+ (or similar)
- DNS A record for your domain (e.g. `archivistplus.com`) to your VPS IP
- Ports open: `80`, `443`

Install base tools:
```bash
sudo apt update
sudo apt install -y nginx postgresql postgresql-contrib git curl build-essential
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pm2
```

## 2) Database setup
```bash
sudo -u postgres psql
CREATE USER archivist WITH PASSWORD 'CHANGE_ME';
CREATE DATABASE archivist OWNER archivist;
\q
```

`DATABASE_URL` format:
```text
postgres://archivist:CHANGE_ME@127.0.0.1:5432/archivist
```

## 3) App setup
```bash
git clone <your-repo-url> archivist
cd archivist
npm ci
npm run setup:env
```

Edit `.env`:
- `APP_URL=https://archivistplus.com`
- `DATABASE_URL=postgres://...`
- `SESSION_SECRET=<long-random-secret>`
- `DISCORD_CLIENT_ID=...`
- `DISCORD_CLIENT_SECRET=...`
- `TRUST_PROXY=true`

Build and run:
```bash
npm run build
pm2 start npm --name archivist -- start
pm2 save
pm2 startup
```

## 4) Nginx reverse proxy
Create `/etc/nginx/sites-available/archivist`:
```nginx
server {
    listen 80;
    server_name archivistplus.com www.archivistplus.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/archivist /etc/nginx/sites-enabled/archivist
sudo nginx -t
sudo systemctl reload nginx
```

## 5) HTTPS (Let's Encrypt)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d archivistplus.com -d www.archivistplus.com
```

## 6) Discord OAuth settings
In Discord Developer Portal, set redirect URIs:
- `https://archivistplus.com/auth/discord/callback`
- local (optional): `http://localhost:5000/auth/discord/callback`

## 7) Verify routes
- `/`
- `/auth/discord`
- `/auth/discord/callback`
- `/dashboard`
- `/health`

## 8) Updates
```bash
cd archivist
git pull
npm ci
npm run build
pm2 restart archivist
```
