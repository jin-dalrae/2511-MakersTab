# OneCard (CCA OneWeb) — Manual Import

MakersTab does **not** log in to TouchNet, store CCA credentials, or scrape
anything automatically. The OneCard feature is a manual paste-import:

1. The student opens their OneWeb **Current Statement** themselves
   (`https://secure.touchnet.net/C20080_oneweb/Account/Statement`), in their
   own browser, already logged in.
2. They select the statement table and copy it.
3. They paste it into MakersTab's OneCard page and click **Import**.
4. The backend parses the text into a balance + transaction list and stores
   only those parsed records.

Receipt OCR remains the primary balance source — every scanned receipt updates
the meal-plan balance. OneCard import is just for backfilling transaction
history you didn't snap a receipt for.

## Why this design

Earlier iterations stored CCA SSO credentials and drove a headless browser
through Okta. That was abandoned: storing institutional credentials on a
third-party server is a large blast radius, and automated TouchNet access
likely violates CCA's AUP / TouchNet's ToS. The paste model keeps the student
fully in control and removes MakersTab from the trust path entirely.

## Setup

Nothing OneCard-specific. No Playwright, no Chromium, no encryption key.
The two collections are created automatically on backend startup:

| Collection | Per user | Contents |
|---|---|---|
| `onecard_balances` | one doc per pot | `pot_name`, `amount`, `updated_at` |
| `onecard_transactions` | N docs | `fingerprint` (dedupe key), `code`, `occurred_at`, `amount`, `running_balance`, `imported_at` |

## API

All endpoints require the standard Firebase bearer token.

- `POST /api/onecard/import` — `{ raw_text, pot_name? }`. Parses pasted statement,
  upserts the balance, inserts new transactions (duplicates skipped via
  fingerprint). Returns `{ pot_name, balance, transactions_added,
  transactions_total, skipped_duplicates }`.
- `GET  /api/onecard/balance` — array of `{ pot_name, amount }`.
- `GET  /api/onecard/transactions?limit=50` — most recent first.
- `DELETE /api/onecard/clear` — wipes the user's balances + transactions.

## Parser notes

`parse_statement()` in `onecard.py` anchors on the ISO datetime OneWeb prints
(`2026-05-11 18:39:39`). It tolerates tab- or space-separated cells (students
copy-paste inconsistently). It also reads `End Amount $X` for the current
balance and `Name <pot>` for the pot label. If CCA changes the statement
layout, this parser is the only thing that needs updating — and it fails
soft (skips unparseable rows, returns a 400 only if nothing at all parsed).
