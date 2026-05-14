# Deploying the MakersTab backend (Fly.io)

The frontend already lives on Firebase Hosting at `https://makerstab-app-001.web.app`. This guide
deploys the FastAPI backend (auth verification, receipt OCR, OneCard scraper, cafe menu scraping)
to Fly.io so the live site's OneCard tab and admin features actually work.

Why Fly.io: Playwright ships a ~600MB Chromium binary. Cloud Run cold-starts on that are brutal
(and exceed the 90s Okta push window we use). Fly's always-warm machines fit better. Render or
a regular Docker host work too; the `Dockerfile` is portable.

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
  EMERGENT_LLM_KEY='sk-...' \
  ONECARD_ENCRYPTION_KEY="$(python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())')"
```

Anything you skip will return a 503 from the matching feature (e.g. OneCard refuses to connect
without `ONECARD_ENCRYPTION_KEY`).

## Deploy

```bash
fly deploy
```

Fly builds the Docker image (Playwright base + Python deps + app), pushes to its registry,
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

- `shared-cpu-2x` + 2GB RAM + `min_machines_running=1` ≈ **$3–5/month** at the time of writing.
- If you can tolerate cold starts, drop `min_machines_running` to `0` — costs go to ~$0 when idle,
  but the OneCard "Connect" call will time out on the first attempt of a cold day. Pick your poison.

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
5. Instance type: at least **Standard 2 GB** (Chromium needs the RAM)

Render's cold start is slower than Fly's by ~10s, but you get a free static IP and easy
custom domains in exchange.
