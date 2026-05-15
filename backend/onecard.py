"""
OneCard manual import.

No credentials, no scraping, no scheduler. The user opens CCA OneWeb themselves,
copies the "Current Statement" table, and pastes it into MakersTab. We parse the
text into a balance + transaction list and store it. Receipt OCR remains the
primary balance source; this is for backfilling history you didn't snap a receipt for.
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict

logger = logging.getLogger(__name__)

BALANCES_COLLECTION = "onecard_balances"
TRANSACTIONS_COLLECTION = "onecard_transactions"


# ---------------------------------------------------------------------------
# API models
# ---------------------------------------------------------------------------

class ImportRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    raw_text: str
    pot_name: Optional[str] = None


class BalanceResponse(BaseModel):
    pot_name: str
    amount: float


class TransactionResponse(BaseModel):
    code: str
    occurred_at: str
    amount: float
    running_balance: Optional[float]


class ImportResult(BaseModel):
    pot_name: str
    balance: Optional[float]
    transactions_added: int
    transactions_total: int
    skipped_duplicates: int


# ---------------------------------------------------------------------------
# Statement parser
# ---------------------------------------------------------------------------

# A statement row, however the browser serializes a copy: tabs or runs of spaces
# between cells. Anchor on the ISO datetime OneWeb prints (e.g. 2026-05-11 18:39:39).
_DT_RE = re.compile(r"(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2})")
_MONEY_RE = re.compile(r"-?\$?\s*-?\d{1,3}(?:,\d{3})*(?:\.\d+)?")
_END_BALANCE_RE = re.compile(r"End\s*Amount\s*\$?\s*(-?[\d,]+(?:\.\d+)?)", re.IGNORECASE)
_POT_NAME_RE = re.compile(r"^\s*Name\b[\s:]*([A-Za-z0-9 ]+?)\s*$", re.IGNORECASE)


def _to_float(token: str) -> Optional[float]:
    if not token:
        return None
    negative = token.strip().startswith("-") or token.strip().startswith("($")
    cleaned = re.sub(r"[^\d.]", "", token)
    if cleaned in ("", "."):
        return None
    try:
        val = float(cleaned)
    except ValueError:
        return None
    return -val if negative else val


def parse_statement(text: str) -> dict:
    """
    Parse a pasted OneWeb 'Current Statement'.

    Returns {pot_name, balance, transactions:[{code, occurred_at, amount, running_balance}]}.
    Forgiving by design — students will paste with inconsistent whitespace.
    """
    pot_name: Optional[str] = None
    end_balance: Optional[float] = None
    transactions: List[dict] = []

    for raw in text.splitlines():
        line = raw.replace("\t", " ").strip()
        if not line:
            continue

        if pot_name is None:
            m = _POT_NAME_RE.match(line)
            if m and "amount" not in m.group(1).lower():
                pot_name = m.group(1).strip()
                continue

        if end_balance is None:
            m = _END_BALANCE_RE.search(line)
            if m:
                end_balance = _to_float(m.group(1))
                continue

        dt_match = _DT_RE.search(line)
        if not dt_match:
            continue

        dt_str = dt_match.group(1).replace("T", " ")
        try:
            occurred_at = datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
        except ValueError:
            continue

        code = line[: dt_match.start()].strip(" |\t")
        tail = line[dt_match.end():]
        money_tokens = _MONEY_RE.findall(tail)
        # First money token after the datetime = transaction amount,
        # second (if present) = running balance column.
        amount = _to_float(money_tokens[0]) if money_tokens else None
        running = _to_float(money_tokens[1]) if len(money_tokens) > 1 else None

        if amount is None or not code:
            continue

        transactions.append({
            "code": code,
            "occurred_at": occurred_at,
            "amount": amount,
            "running_balance": running,
        })

    return {
        "pot_name": pot_name or "Student Balance",
        "balance": end_balance,
        "transactions": transactions,
    }


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------

async def _upsert_balance(db, user_id: str, pot_name: str, amount: float) -> None:
    await db[BALANCES_COLLECTION].update_one(
        {"user_id": user_id, "pot_name": pot_name},
        {"$set": {
            "user_id": user_id,
            "pot_name": pot_name,
            "amount": amount,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )


async def _insert_transactions(db, user_id: str, transactions: List[dict]) -> tuple:
    added = 0
    skipped = 0
    for tx in transactions:
        fingerprint = f"{tx['code']}|{tx['occurred_at'].isoformat()}|{tx['amount']:.2f}"
        result = await db[TRANSACTIONS_COLLECTION].update_one(
            {"user_id": user_id, "fingerprint": fingerprint},
            {"$setOnInsert": {
                "user_id": user_id,
                "fingerprint": fingerprint,
                "code": tx["code"],
                "occurred_at": tx["occurred_at"].isoformat(),
                "amount": tx["amount"],
                "running_balance": tx.get("running_balance"),
                "imported_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )
        if result.upserted_id is not None:
            added += 1
        else:
            skipped += 1
    return added, skipped


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

def setup_onecard_routes(api_router: APIRouter, db, get_current_user) -> None:
    """Register /onecard/* routes on the existing api_router."""

    @api_router.post("/onecard/import", response_model=ImportResult)
    async def import_statement(payload: ImportRequest, current_user: dict = Depends(get_current_user)):
        parsed = parse_statement(payload.raw_text)

        if parsed["balance"] is None and not parsed["transactions"]:
            raise HTTPException(
                status_code=400,
                detail="No balance or transactions found. Copy the whole Current Statement table from OneWeb and paste it again.",
            )

        pot_name = (payload.pot_name or parsed["pot_name"]).strip() or "Student Balance"

        if parsed["balance"] is not None:
            await _upsert_balance(db, current_user["id"], pot_name, parsed["balance"])

        added, skipped = await _insert_transactions(db, current_user["id"], parsed["transactions"])
        total = await db[TRANSACTIONS_COLLECTION].count_documents({"user_id": current_user["id"]})

        return {
            "pot_name": pot_name,
            "balance": parsed["balance"],
            "transactions_added": added,
            "transactions_total": total,
            "skipped_duplicates": skipped,
        }

    @api_router.get("/onecard/balance", response_model=List[BalanceResponse])
    async def get_balance(current_user: dict = Depends(get_current_user)):
        docs = await db[BALANCES_COLLECTION].find(
            {"user_id": current_user["id"]}, {"_id": 0}
        ).to_list(50)
        return [{"pot_name": d["pot_name"], "amount": d["amount"]} for d in docs]

    @api_router.get("/onecard/transactions", response_model=List[TransactionResponse])
    async def get_transactions(limit: int = 50, current_user: dict = Depends(get_current_user)):
        limit = max(1, min(500, limit))
        docs = await db[TRANSACTIONS_COLLECTION].find(
            {"user_id": current_user["id"]}, {"_id": 0}
        ).sort("occurred_at", -1).to_list(limit)
        return [{
            "code": d["code"],
            "occurred_at": d["occurred_at"],
            "amount": d["amount"],
            "running_balance": d.get("running_balance"),
        } for d in docs]

    @api_router.delete("/onecard/clear")
    async def clear_onecard(current_user: dict = Depends(get_current_user)):
        await db[BALANCES_COLLECTION].delete_many({"user_id": current_user["id"]})
        await db[TRANSACTIONS_COLLECTION].delete_many({"user_id": current_user["id"]})
        return {"cleared": True}
