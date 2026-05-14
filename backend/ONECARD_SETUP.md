# OneCard (CCA OneWeb) Integration — Setup

MakersTab can connect to CCA's TouchNet OneWeb portal
(`https://secure.touchnet.net/C20080_oneweb/`) to surface a user's OneCard
balance and transaction history.

## How it works

1. User enters their CCA SSO username + password on `/onecard`.
2. Backend launches headless Chromium via Playwright, walks through CCA Okta SSO,
   and waits up to 90 s for the user to approve the Okta Verify push on their phone.
3. After the push is approved, the dashboard URL loads; backend captures the
   `.touchnet.net` session cookies.
4. Username, password, and cookies are encrypted with Fernet and stored in
   MongoDB. The password is **never** stored in plaintext anywhere.
5. Every 4 hours, a scheduled job re-fetches the dashboard + statement using
   the stored cookies. If the session has expired, it re-runs the login flow
   (which triggers a fresh push on the user's phone).
6. The frontend reads `/api/onecard/{status,balance,transactions}` to render
   the cached data instantly without scraping live.

## Required setup

### 1. Install Playwright Chromium

```bash
cd backend
pip install -r requirements.txt
python -m playwright install chromium
```

### 2. Generate and set the encryption key

```bash
python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'
```

Add to `backend/.env`:

```
ONECARD_ENCRYPTION_KEY=<the-generated-key>
```

> **Rotating this key invalidates every stored OneCard credential** —
> users will have to reconnect. There is no migration path other than disconnect/reconnect.

### 3. Restart the backend

The scheduler picks up the new periodic refresh job on startup. Indexes are
created on first run.

## What's stored

| Collection | Per user | Contents |
|---|---|---|
| `onecard_credentials` | 1 doc | `username_enc`, `password_enc`, `cookies_enc`, `last_sync_at`, `last_error`, `account_id`, `display_name` |
| `onecard_balances` | N docs (one per pot) | `pot_name`, `amount`, `updated_at` |
| `onecard_transactions` | N docs | `fingerprint` (dedupe key), `code`, `occurred_at`, `amount`, `running_balance` |

Disconnecting (`DELETE /api/onecard/disconnect`) wipes all three for that user.

## API surface

All endpoints require the standard MakersTab bearer token.

- `POST /api/onecard/connect` — `{ username, password, risk_acknowledged }`. Logs in, captures cookies, runs an initial scrape. Long-running (waits for push approval).
- `DELETE /api/onecard/disconnect` — wipes credentials, cookies, balances, transactions.
- `GET  /api/onecard/status` — `{ connected, last_sync_at, last_error, account_id, display_name }`.
- `POST /api/onecard/refresh` — forces an immediate refresh. May trigger a push if session has expired.
- `GET  /api/onecard/balance` — array of `{ pot_name, amount }`.
- `GET  /api/onecard/transactions?limit=50` — array of `{ code, occurred_at, amount, running_balance }`, most recent first.

## Known limitations / what to refine

- **HTML selectors are tentative.** `_parse_dashboard` and the Okta login selectors
  in `onecard_scraper.py` were written from screenshots. Once an authenticated
  HTML capture is available, tighten them — the table parser uses header text
  detection so it should hold up, but the balance card parser is a best-effort sweep.
- **No alerting on repeated failures.** After 3 consecutive failed refreshes the
  user only sees `last_error` in the UI. No email/push from MakersTab itself.
- **Single Chromium per login.** Concurrent connects from many users will queue.
  For >5 simultaneous users add a queue or a Playwright pool.
- **Push fatigue.** Default 4-hour refresh + manual refresh button. Lower
  cadence at your own risk — every refresh after session expiry pings the user's phone.

## Risk reminder for users

Storing CCA SSO passwords on a third-party server (even encrypted) materially
expands the blast radius of a MakersTab compromise. Automated access to
TouchNet OneWeb may also be prohibited by CCA's AUP and/or TouchNet's ToS.
The connect form requires an explicit "I understand the risks" checkbox.
