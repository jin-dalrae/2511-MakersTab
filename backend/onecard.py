"""
OneCard integration: encrypted credential storage, scheduled scraping,
and REST API for the MakersTab frontend.

Wired into the main app via `setup_onecard_routes(api_router, db, get_current_user)`
in server.py. Background polling is started by adding `scheduled_onecard_refresh(db)`
to the existing APScheduler.

Security model:
  - User-supplied CCA SSO username + password are encrypted with Fernet
    using a key from the ONECARD_ENCRYPTION_KEY env var.
  - If the env key is missing, /onecard/connect refuses to store anything
    rather than silently using a default (which would lose data on rotation).
  - Cookies are encrypted too — a DB dump alone cannot impersonate the user.
"""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from cryptography.fernet import Fernet, InvalidToken
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from onecard_scraper import (
    LoginFailed,
    OneCardTransaction,
    ScrapeResult,
    SessionExpired,
    login_and_capture_cookies,
    scrape_account,
)

logger = logging.getLogger(__name__)

CREDENTIALS_COLLECTION = "onecard_credentials"
BALANCES_COLLECTION = "onecard_balances"
TRANSACTIONS_COLLECTION = "onecard_transactions"


# ---------------------------------------------------------------------------
# Encryption
# ---------------------------------------------------------------------------

def _get_fernet() -> Fernet:
    key = os.environ.get("ONECARD_ENCRYPTION_KEY")
    if not key:
        raise HTTPException(
            status_code=503,
            detail="OneCard integration is not configured (missing ONECARD_ENCRYPTION_KEY).",
        )
    try:
        return Fernet(key.encode() if isinstance(key, str) else key)
    except Exception as e:
        logger.error(f"Invalid ONECARD_ENCRYPTION_KEY: {e}")
        raise HTTPException(status_code=503, detail="OneCard encryption key invalid")


def _encrypt(value: str) -> str:
    return _get_fernet().encrypt(value.encode("utf-8")).decode("utf-8")


def _decrypt(token: str) -> str:
    try:
        return _get_fernet().decrypt(token.encode("utf-8")).decode("utf-8")
    except InvalidToken as e:
        raise HTTPException(status_code=500, detail="Stored OneCard data could not be decrypted") from e


# ---------------------------------------------------------------------------
# API models
# ---------------------------------------------------------------------------

class ConnectRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)
    risk_acknowledged: bool


class StatusResponse(BaseModel):
    connected: bool
    last_sync_at: Optional[str] = None
    last_error: Optional[str] = None
    account_id: Optional[str] = None
    display_name: Optional[str] = None


class BalanceResponse(BaseModel):
    pot_name: str
    amount: float


class TransactionResponse(BaseModel):
    code: str
    occurred_at: str
    amount: float
    running_balance: Optional[float]


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------

async def _store_connection(db, user_id: str, username: str, password: str, cookies: list) -> None:
    doc = {
        "user_id": user_id,
        "username_enc": _encrypt(username),
        "password_enc": _encrypt(password),
        "cookies_enc": _encrypt(json.dumps(cookies)),
        "cookies_captured_at": datetime.now(timezone.utc).isoformat(),
        "last_sync_at": None,
        "last_error": None,
        "account_id": None,
        "display_name": None,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db[CREDENTIALS_COLLECTION].update_one(
        {"user_id": user_id},
        {"$set": doc},
        upsert=True,
    )


async def _load_connection(db, user_id: str) -> Optional[Dict[str, Any]]:
    return await db[CREDENTIALS_COLLECTION].find_one({"user_id": user_id}, {"_id": 0})


async def _update_cookies(db, user_id: str, cookies: list) -> None:
    await db[CREDENTIALS_COLLECTION].update_one(
        {"user_id": user_id},
        {"$set": {
            "cookies_enc": _encrypt(json.dumps(cookies)),
            "cookies_captured_at": datetime.now(timezone.utc).isoformat(),
        }},
    )


async def _record_sync(
    db,
    user_id: str,
    result: ScrapeResult,
    error: Optional[str] = None,
) -> None:
    update = {
        "last_sync_at": datetime.now(timezone.utc).isoformat(),
        "last_error": error,
    }
    if result.account_id:
        update["account_id"] = result.account_id
    if result.display_name:
        update["display_name"] = result.display_name
    await db[CREDENTIALS_COLLECTION].update_one(
        {"user_id": user_id}, {"$set": update}
    )

    if not error:
        await _upsert_balances(db, user_id, result.balances)
        await _upsert_transactions(db, user_id, result.transactions)


async def _upsert_balances(db, user_id: str, balances) -> None:
    if not balances:
        return
    # Single-document-per-pot. Replace the user's whole balance set on each successful sync
    # so disappearing pots don't linger as ghosts.
    await db[BALANCES_COLLECTION].delete_many({"user_id": user_id})
    if balances:
        docs = [{
            "user_id": user_id,
            "pot_name": b.pot_name,
            "amount": b.amount,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        } for b in balances]
        await db[BALANCES_COLLECTION].insert_many(docs)


async def _upsert_transactions(db, user_id: str, transactions: List[OneCardTransaction]) -> None:
    if not transactions:
        return
    for tx in transactions:
        await db[TRANSACTIONS_COLLECTION].update_one(
            {"user_id": user_id, "fingerprint": tx.fingerprint},
            {"$setOnInsert": {
                "user_id": user_id,
                "fingerprint": tx.fingerprint,
                "code": tx.code,
                "occurred_at": tx.occurred_at.isoformat(),
                "amount": tx.amount,
                "running_balance": tx.running_balance,
                "scraped_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )


async def _clear_user(db, user_id: str) -> None:
    await db[CREDENTIALS_COLLECTION].delete_many({"user_id": user_id})
    await db[BALANCES_COLLECTION].delete_many({"user_id": user_id})
    await db[TRANSACTIONS_COLLECTION].delete_many({"user_id": user_id})


# ---------------------------------------------------------------------------
# Refresh flow (used by both manual refresh + scheduler)
# ---------------------------------------------------------------------------

async def refresh_one_user(db, user_id: str) -> ScrapeResult:
    """
    Try a scrape with stored cookies. If TouchNet says session expired,
    re-login with stored credentials (this triggers an Okta push on the user's phone)
    and retry once.
    """
    conn = await _load_connection(db, user_id)
    if not conn:
        raise HTTPException(status_code=404, detail="OneCard not connected")

    cookies = json.loads(_decrypt(conn["cookies_enc"]))

    try:
        result = await scrape_account(cookies)
    except SessionExpired:
        logger.info(f"OneCard session expired for user {user_id}; attempting re-login")
        username = _decrypt(conn["username_enc"])
        password = _decrypt(conn["password_enc"])
        login_result = await login_and_capture_cookies(username, password)
        cookies = login_result["cookies"]
        await _update_cookies(db, user_id, cookies)
        result = await scrape_account(cookies)

    await _record_sync(db, user_id, result)
    return result


async def scheduled_onecard_refresh(db) -> None:
    """Periodic job: refresh every connected user."""
    cursor = db[CREDENTIALS_COLLECTION].find({}, {"user_id": 1, "_id": 0})
    user_ids = [doc["user_id"] async for doc in cursor]
    logger.info(f"OneCard scheduled refresh: {len(user_ids)} user(s)")
    for user_id in user_ids:
        try:
            await refresh_one_user(db, user_id)
        except LoginFailed as e:
            logger.warning(f"OneCard re-login failed for {user_id}: {e}")
            await db[CREDENTIALS_COLLECTION].update_one(
                {"user_id": user_id},
                {"$set": {"last_error": f"Re-login failed: {e}"}},
            )
        except Exception as e:
            logger.error(f"OneCard refresh error for {user_id}: {e}", exc_info=True)
            await db[CREDENTIALS_COLLECTION].update_one(
                {"user_id": user_id},
                {"$set": {"last_error": str(e)}},
            )


# ---------------------------------------------------------------------------
# Route registration
# ---------------------------------------------------------------------------

def setup_onecard_routes(api_router: APIRouter, db, get_current_user) -> None:
    """Register /onecard/* routes on the existing api_router."""

    @api_router.post("/onecard/connect", response_model=StatusResponse)
    async def connect_onecard(payload: ConnectRequest, current_user: dict = Depends(get_current_user)):
        if not payload.risk_acknowledged:
            raise HTTPException(status_code=400, detail="Risk acknowledgement required")

        try:
            login_result = await login_and_capture_cookies(payload.username, payload.password)
        except LoginFailed as e:
            raise HTTPException(status_code=400, detail=f"Login failed: {e}")

        await _store_connection(
            db,
            current_user["id"],
            payload.username,
            payload.password,
            login_result["cookies"],
        )

        try:
            result = await scrape_account(login_result["cookies"])
            await _record_sync(db, current_user["id"], result)
        except Exception as e:
            logger.warning(f"Initial scrape failed after connect: {e}")
            await db[CREDENTIALS_COLLECTION].update_one(
                {"user_id": current_user["id"]},
                {"$set": {"last_error": f"Initial scrape failed: {e}"}},
            )

        conn = await _load_connection(db, current_user["id"])
        return _conn_to_status(conn)

    @api_router.delete("/onecard/disconnect")
    async def disconnect_onecard(current_user: dict = Depends(get_current_user)):
        await _clear_user(db, current_user["id"])
        return {"disconnected": True}

    @api_router.get("/onecard/status", response_model=StatusResponse)
    async def onecard_status(current_user: dict = Depends(get_current_user)):
        conn = await _load_connection(db, current_user["id"])
        return _conn_to_status(conn)

    @api_router.post("/onecard/refresh", response_model=StatusResponse)
    async def refresh_onecard(current_user: dict = Depends(get_current_user)):
        try:
            await refresh_one_user(db, current_user["id"])
        except LoginFailed as e:
            raise HTTPException(status_code=400, detail=f"Re-login failed: {e}")
        conn = await _load_connection(db, current_user["id"])
        return _conn_to_status(conn)

    @api_router.get("/onecard/balance", response_model=List[BalanceResponse])
    async def get_balance(current_user: dict = Depends(get_current_user)):
        docs = await db[BALANCES_COLLECTION].find(
            {"user_id": current_user["id"]}, {"_id": 0}
        ).to_list(50)
        return [{"pot_name": d["pot_name"], "amount": d["amount"]} for d in docs]

    @api_router.get("/onecard/transactions", response_model=List[TransactionResponse])
    async def get_transactions(
        limit: int = 50,
        current_user: dict = Depends(get_current_user),
    ):
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


def _conn_to_status(conn: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not conn:
        return {"connected": False, "last_sync_at": None, "last_error": None,
                "account_id": None, "display_name": None}
    return {
        "connected": True,
        "last_sync_at": conn.get("last_sync_at"),
        "last_error": conn.get("last_error"),
        "account_id": conn.get("account_id"),
        "display_name": conn.get("display_name"),
    }
