# Deploying the MakersTab backend (Fly.io)

The frontend already lives on Firebase Hosting at `https://makerstab-app-001.web.app`. This guide
deploys the FastAPI backend (auth verification, receipt OCR, OneCard scraper, cafe menu scraping)
to Fly.io so the live site's OneCard tab and admin features actually work.

Why Fly.io: simple single-VM Docker deploy with a generous free allowance. The backend is a
plain FastAPI + Mongo client app (no Chromium / Playwright), so any Docker host — Render,
Railway, Cloud Run — works equally well; the `Dockerfile` is portable.

## Prerequisites

```bash
# Fly CLI
brew install flyctl
# or: curl -L https://fly.io/install.sh | sh

fly auth login
```

You also need a MongoDB instance reachable from the public internet. MongoDB Atlas free tier (M0)
is the easiest path:

1. https://cloud.mongodb.com → Create cluster (M0 Free).
2. Database Access → add a user with read/write.
3. Network Access → add `0.0.0.0/0` (or restrict to Fly's egress IPs once you have them).
4. Connect → "Drivers" → copy the connection string (looks like `mongodb+srv://...`).

## First-time launch

From the repo root:

```bash
cd backend
fly launch --copy-config --no-deploy
# Answer 'no' to: organization (use default), Postgres, Redis, deploy now.
# If it asks about overwriting fly.toml: NO — keep the one in the repo.
```

This creates the Fly app and registers it under your account. The `app` name in `fly.toml` is
`makerstab-backend`; if that's taken globally, edit the name in `fly.toml` first.

## Secrets

```bash
fly secrets set \
  MONGO_URL='mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority' \
  DB_NAME='makerstab' \
  FIREBASE_PROJECT_ID='makerstab-app-001' \
  EMERGENT_LLM_KEY='sk-...'
```

`EMERGENT_LLM_KEY` powers receipt OCR; skip it and only the scanner is degraded.
OneCard import needs no secret — it just parses pasted text.

## Deploy

```bash
fly deploy
```

Fly builds the Docker image (python:3.12-slim + deps + app), pushes to its registry,
and rolls out the machine. The `/api/health` healthcheck must pass within 30s for the rollout
to succeed. If it fails, check `fly logs`.

After deploy:

```bash
fly status
fly open      # opens https://makerstab-backend.fly.dev
curl https://makerstab-backend.fly.dev/api/health
```

## Point the frontend at the live backend

In `frontend/.env`:

```ini
REACT_APP_API_URL=https://makerstab-backend.fly.dev/api
```

Then from the repo root:

```bash
cd frontend
npm run build
firebase deploy --only hosting
```

After this, OneCard / receipt OCR / admin all hit production instead of `localhost:8000`.

## Firebase Auth: add the backend domain

To make sure CORS + token verification work end-to-end, in the Firebase Console:

- **Authentication → Settings → Authorized domains**: add `makerstab-app-001.web.app`
  (frontend) — backend doesn't need to be listed since it's not a redirect target.

The backend already accepts CORS from all origins (`CORS_ORIGINS=*` env default in `server.py`).
For production you'll want to lock that to the Firebase domain:

```bash
fly secrets set CORS_ORIGINS='https://makerstab-app-001.web.app,https://makerstab-app-001.firebaseapp.com'
```

## Cost notes

- `shared-cpu-1x` + 512MB RAM + `min_machines_running=0` is essentially free at this scale —
  the machine sleeps when idle and cold-starts in a few seconds on the next request.
- Bump `min_machines_running` to `1` in `fly.toml` if you want to avoid that first-request
  cold start; it's only a couple dollars a month.

## Rolling back

```bash
fly releases             # find the release ID before the bad deploy
fly deploy --image-label <release-id>
```

Or just redeploy from a known-good local checkout: `fly deploy`.

## Alternative: Render

If you'd rather use Render:

1. Repo → New + → Web Service
2. Build command: (blank — Dockerfile detected automatically)
3. Start command: (blank — Dockerfile `CMD`)
4. Environment: copy the same secrets
5. Instance type: the free or starter tier is plenty (no Chromium, light memory footprint)

Render's cold start is slower than Fly's by ~10s, but you get a free static IP and easy
custom domains in exchange.
