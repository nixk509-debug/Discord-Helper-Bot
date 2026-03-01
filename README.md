# Discord Helper Bot / Archivist

## Root causes found (production instability)
- **Session cookie behavior behind reverse proxy was brittle** (`sameSite: "none"` in production), which can cause auth cookie drops and login loops depending on browser/proxy behavior.
- **Dashboard runtime glitch**: `useEffect` was used without being imported in `client/src/pages/dashboard/index.tsx`, which can break rendering.
- **Bot status mismatch**: UI inferred status indirectly; there was no dedicated bot readiness endpoint.
- **Stats endpoint reliability**: `/api/stats` could fail hard on DB/query errors instead of returning a stable response.
- **Replit-only Stripe sync assumptions** were still attempted on non-Replit hosting, creating noisy startup behavior.
- **A duplicate response call** existed in `POST /api/templates`, which can trigger "headers already sent" errors.

## Production on DigitalOcean (checklist)

### 1) Build and deploy commands (run on droplet)
```bash
git pull
npm i
npm run build
npm run verify:build-output
pm2 restart archivist --update-env
```

### 2) Quick health checks
```bash
curl -sS http://127.0.0.1:5000/health
curl -sS http://127.0.0.1:5000/api/stats
```

### 3) Nginx requirements
Use a server block similar to this (adjust domain/certs):

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # ssl_certificate ...
    # ssl_certificate_key ...

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Required for websocket path /ws
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_read_timeout 3600;
    }
}
```

### 4) App env notes
- Do **not** commit secrets.
- Keep `.env` on droplet only.
- Set `APP_URL` or `PUBLIC_BASE_URL` to your canonical https URL.
- Optional: set `TRUST_PROXY=1` (default is already 1 in code).

