# MakersTab

**Know exactly how much dining money you have left — without doing the math in your head.**

MakersTab is a meal-plan budgeting app for California College of the Arts (CCA)
students. You snap a photo of your cafe receipt, an AI reads it, and the app
tells you whether you're on track to make your money last the whole semester —
or about to run out three weeks early.

Live: **https://makerstab-app-001.web.app**

---

## Why does this exist? (the plain-language version)

Imagine the school gives you a debit card at the start of the semester with, say,
**$1,865** on it. That's your "meal plan." Every time you buy food at the campus
cafe, money comes off the card. When it hits $0, you're done — no more campus food
money until next semester, which might still be **two months away**.

Here's the trap almost every student falls into:

> It's week 3. You have $1,600 left. That feels like *a lot*. So you grab the
> $14 bowl and the $5 latte without thinking. Then it's week 11, you have $90
> left, finals haven't even started, and you're eating instant noodles in the
> studio.

The problem isn't that students are bad with money. The problem is that **a
declining balance against a calendar is genuinely hard to track in your head.**
"Do I have enough?" depends on three moving numbers at once: how much is left,
how many weeks remain, and how fast you've been spending. Nobody recomputes that
every time they're standing in line holding a sandwich.

**MakersTab does that math for you, automatically, every time you eat.**

It answers one question on a single screen: *am I spending too fast, too slow,
or just right to make it to the end of the semester?*

### Who it's for and what they get

| Person | What they were doing before | What MakersTab gives them |
|---|---|---|
| A first-year on a big plan | Guessing, then panicking in November | A weekly "you can spend ~$X this week" number |
| A commuter on the tiny Micro plan | Avoiding the cafe entirely "to be safe" | Confidence to actually use the money they paid for |
| Anyone | Mental math in line | A photo of a receipt and a green/yellow/red status |

---

## How it works (the 30-second version)

```
   You buy food            You snap the receipt        MakersTab tells you
   at the cafe       ─►     in the app            ─►    where you stand
   ($14.49)                 (one photo)                 "On track · 9 weeks left
                                                         ~$138/week to spend"
```

1. **Snap.** Take a photo of the printed receipt.
2. **Read.** An AI vision model (GPT-4o) reads the items, the total, and — most
   importantly — the **remaining balance** the cafe register printed at the bottom.
3. **Reconcile.** MakersTab trusts that printed balance as the source of truth and
   updates your account. If the balance dropped more than the receipt explains
   (you bought something off-app, or with cash), it quietly records the gap so
   your history stays honest.
4. **Forecast.** It compares how fast you're *actually* spending against how fast
   you *should* spend to reach the end of the semester at exactly $0, and shows
   you a status: **On Track / Over Budget / Under Budget**.

You never type a number. The receipt is the input; the forecast is the output.

---

## The money math (why the forecast is trustworthy)

This is the core idea, explained simply:

- The semester has a **start date** and an **end date** (CCA's real OneCard
  load/wipe dates — e.g. Fall loads Aug 18, Spring wipes May 18).
- Your plan has a **starting amount** (e.g. $1,865).
- The **ideal burn rate** = starting amount ÷ total weeks in the semester.
  Spend exactly that each week and you hit $0 right at the end. Perfect.
- The **actual burn rate** = what you've really spent ÷ weeks elapsed so far.
- If actual > ideal by more than ~20%, you're **Over Budget** (slow down).
  If actual < ideal, you're **Under Budget** (you can treat yourself).
  Within 20%, you're **On Track**.
- The **weekly recommendation** = money left ÷ weeks remaining. That's the
  single number to remember: "I can spend about this much this week."

It's the same logic a careful person would do with a calendar and a calculator —
MakersTab just does it on every receipt so you never have to.

---

## ✨ Features

- **📸 AI Receipt Scanning** — photograph a receipt; GPT-4o extracts items,
  prices, date/time, and the printed remaining balance.
- **📊 Spending analytics** — ideal-vs-actual curve, category breakdown
  (meals / drinks / convenience / etc.), weekly averages.
- **🚦 Budget health** — one glance tells you On Track / Over / Under.
- **🔮 Run-out forecast** — "at this pace your money lasts until <date>."
- **🍽️ Daily cafe menu** — scraped nightly from Bon Appétit so you can plan.
- **🆔 OneCard import** *(Beta)* — paste your CCA OneWeb statement to backfill
  transaction history. No login, no scraping, no credentials. See
  [`backend/ONECARD_SETUP.md`](backend/ONECARD_SETUP.md).
- **🛒 Order online** — one tap to the official CCA dining ordering portal
  (same campus login you already use).
- **📱 Mobile-first** — designed to be used standing in line.

---

## Technical architecture (the engineer's version)

### The big picture

```
┌──────────────────────────┐   Firebase ID token    ┌───────────────────────────┐
│  React 19 SPA (CRA/Craco) │ ──────────────────────►│  FastAPI (async, uvicorn) │
│  Firebase Auth (web SDK)  │   Authorization: Bearer │  verifies token via       │
│  Tailwind + shadcn/ui     │ ◄────────────────────── │  Google x509 public certs │
│  hosted on Firebase       │      JSON responses     │                           │
└──────────────────────────┘                         └────────────┬──────────────┘
         │                                                         │
         │ unauthenticated marketing                               │ Motor (async)
         ▼                                                         ▼
   Landing / Auth pages                                   ┌──────────────────┐
                                                          │     MongoDB      │
   GPT-4o Vision  ◄────  receipt image (server-side)      │ users, receipts, │
   (via emergentintegrations)                             │ transactions,    │
                                                          │ onecard_*, menu  │
   Bon Appétit site  ◄── nightly APScheduler scrape       └──────────────────┘
```

### Authentication — why it's verify-only

The frontend uses the **Firebase Web SDK** for sign-up/sign-in. Firebase mints a
short-lived signed **ID token** (a JWT). Every API call sends it as a bearer token.

The backend (`firebase_auth.py`) verifies that token **without the Firebase Admin
SDK and without a service-account key**. It fetches Google's public x509 signing
certificates (rotated every few hours, cached with the `Cache-Control` max-age),
checks the RS256 signature, and validates `aud`/`iss`/`exp`. Verification needs
no secret — only the project ID — so there's no service-account file to leak.

On the first authenticated request for a new Firebase user, `get_current_user`
auto-provisions a Mongo `users` document keyed by the Firebase UID. There is no
backend signup/login route; auth lives entirely in Firebase.

### The receipt OCR pipeline (the interesting part)

```
image upload
  → Pillow re-encode/compress (shrink payload before the LLM call)
  → GPT-4o Vision with RECEIPT_OCR_PROMPT (one shared constant, strict JSON-only)
  → parse JSON: items[], total, remaining_balance, date, time, merchant
  → reconcile_balance_from_receipt():
        expected = current_balance - receipt_total
        gap      = expected - printed_remaining_balance
        if gap > $0.01:
            insert a placeholder "untracked" transaction for the gap
            (so cash/off-app spends don't silently corrupt the trend)
        set balance := printed_remaining_balance   # the register is truth
  → else fall back to simple subtraction
```

The printed remaining balance is treated as authoritative because the register
can't lie about it — this self-heals drift from receipts the user forgot to scan.
`RECEIPT_OCR_PROMPT` and `reconcile_balance_from_receipt()` are single shared
definitions (they used to be copy-pasted across `/receipts/preview` and
`/receipts`; that duplication was refactored out).

### OneCard — an engineering-judgment story worth reading

The first design logged into CCA's TouchNet OneWeb *for* the user: store their
SSO password (Fernet-encrypted), drive headless Chromium through Okta + push MFA,
poll every 4 hours. It worked — and it was the wrong call. Storing institutional
credentials on a third-party server is a huge blast radius, and automated TouchNet
access likely violates CCA's AUP / TouchNet's ToS.

It was deliberately torn out and replaced with a **manual paste-import**: the
student copies their own statement, pastes it in, and `parse_statement()` (a
forgiving text parser anchored on the ISO datetime + "End Amount" line) turns it
into balance + deduplicated transaction records. **Zero credentials, zero
automation, zero ToS exposure.** Receipt OCR was always the primary balance
source anyway — OneCard import is just optional history backfill.

The takeaway: "technically it works" is not the same as "we should ship it."

### Why these technology choices

- **FastAPI + Motor (async)** — receipt OCR is an I/O-bound call to an LLM;
  async lets one worker handle many in-flight scans without blocking.
- **MongoDB** — receipts/transactions are schema-loose, append-heavy documents;
  a document store fits better than rigid tables here.
- **Firebase Auth (verify-only)** — outsources password storage, reset flows,
  and session security to Google; the backend never holds a credential.
- **`mockApi.js`** — the frontend ships with an in-memory mock so the UI is
  fully demoable with zero backend running (useful for design/QA). Real data
  flows through the FastAPI backend once `REACT_APP_API_URL` is set.
- **Recharts** — the ideal-vs-actual curve is the product; a charting lib that
  composes as React components keeps that visualization maintainable.

---

## 🛠️ Tech Stack

**Frontend:** React 19 · Craco (CRA override) · Tailwind CSS · Radix/shadcn-ui ·
Lucide icons · Recharts · Firebase Web SDK (Auth) · hosted on Firebase Hosting

**Backend:** FastAPI · Motor (async MongoDB) · Firebase ID-token verification
(`python-jose` + Google x509 certs, no Admin SDK) · OpenAI GPT-4o via
`emergentintegrations` · APScheduler (nightly menu scrape) · BeautifulSoup
(menu scraper) · slowapi (rate limiting)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- MongoDB (local or an Atlas URI)
- A Firebase project (free tier) — grab the Web SDK config from
  **Project settings → General → Your apps**

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
# create backend/.env (see Environment Variables below)
uvicorn server:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
# create frontend/.env with your Firebase Web SDK config
npm start                         # opens http://localhost:3000
```

Without a backend running, the frontend still works for demo/design — most
screens fall back to `mockApi.js` (in-memory + localStorage). Receipt OCR,
admin, and OneCard import need the backend up.

---

## 🔐 Environment Variables

### `backend/.env`

```ini
# Database
MONGO_URL=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/?retryWrites=true&w=majority
DB_NAME=makerstab

# Firebase — used to verify ID tokens the frontend sends (no secret needed)
FIREBASE_PROJECT_ID=makerstab-app-001

# Receipt OCR
EMERGENT_LLM_KEY=your_openai_api_key
```

### `frontend/.env`

CRA only exposes vars prefixed `REACT_APP_`.

```ini
REACT_APP_FIREBASE_API_KEY=...
REACT_APP_FIREBASE_AUTH_DOMAIN=makerstab-app-001.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=makerstab-app-001
REACT_APP_FIREBASE_STORAGE_BUCKET=makerstab-app-001.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=...
REACT_APP_FIREBASE_APP_ID=...
# Point the SPA at a deployed backend (omit for localhost dev):
REACT_APP_API_URL=https://your-backend.fly.dev/api
```

> The Firebase Web `apiKey` is a public project identifier, **not** a secret.
> Security comes from Firebase Auth providers + Firestore/Storage rules.

---

## 🆔 OneCard Import (manual)

MakersTab does **not** connect to TouchNet, store CCA credentials, or scrape
anything:

1. You open your own OneWeb **Current Statement** and copy the table.
2. You paste it into `/onecard` and click **Import**.
3. The backend parses it into balance + transaction records (duplicates skipped
   by fingerprint) and stores only those records.

Full design + parser notes: [`backend/ONECARD_SETUP.md`](backend/ONECARD_SETUP.md).

---

## ☁️ Deployment

- **Frontend** is live on Firebase Hosting (`firebase deploy --only hosting`
  from the repo root after `npm run build` in `frontend/`).
- **Backend** ships as a Docker image. Full Fly.io walkthrough (Mongo Atlas
  setup, secrets, CORS lockdown, Render alternative) in
  [`backend/DEPLOY.md`](backend/DEPLOY.md). After deploy, set
  `REACT_APP_API_URL` and rebuild/redeploy the frontend so OCR + OneCard work
  on the live site.

---

## 📂 Project Structure

```
makerstab/
├── backend/
│   ├── server.py             # FastAPI app: routes, scheduler, Mongo init,
│   │                         #   receipt OCR + reconcile_balance_from_receipt
│   ├── firebase_auth.py      # Firebase ID-token verifier (Google x509, no Admin SDK)
│   ├── onecard.py            # OneCard manual paste-import: parse_statement + routes
│   ├── menu_scraper.py       # Nightly Bon Appétit cafe menu scraper
│   ├── ONECARD_SETUP.md      # OneCard import design + parser notes
│   ├── DEPLOY.md             # Fly.io / Render backend deploy guide
│   ├── Dockerfile            # python:3.12-slim
│   └── .env                  # not committed
├── frontend/
│   ├── src/
│   │   ├── App.js            # routes + Firebase Auth state
│   │   ├── pages/            # Landing, AuthPage, Dashboard, AdminDashboard,
│   │   │                     #   OneCardSettings, Terms, Privacy
│   │   ├── lib/              # firebase.js (init + getAuthHeaders), theme.js
│   │   ├── hooks/            # useOneCard, ...
│   │   ├── services/         # onecardApi.js, mockApi.js
│   │   └── components/ui/    # shadcn/ui (vendored)
│   ├── package.json
│   └── .env                  # not committed
└── README.md
```

---

## 🔮 Roadmap

- **Firestore migration** — auth is already Firebase; move storage off Mongo
  to fully consolidate on Firebase.
- **OneCard parser hardening** — broaden `parse_statement()` against more
  real-world pasted-statement shapes.
- **Anonymous social benchmarks** — "you spend less than 60% of students on
  your plan."
- **Nutrition** — join menu items to nutrition data.

---

*MakersTab is an independent student project. It is not affiliated with,
endorsed by, or operated in partnership with California College of the Arts,
Bon Appétit, or TouchNet.*
