"""
TouchNet OneWeb scraper for CCA (institution code C20080).

Two-stage:
  1. Playwright drives a real Chromium through CCA Okta SSO + push MFA, returns session cookies.
  2. httpx + BeautifulSoup re-uses those cookies for cheap polling of the dashboard
     and statement pages.

Selectors below are best-effort given the OneWeb screenshots; verify against
a captured HTML sample before relying on them in production.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List, Optional

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

ONEWEB_BASE = "https://secure.touchnet.net/C20080_oneweb"
DASHBOARD_URL = f"{ONEWEB_BASE}/Account/Dashboard"
FUNDS_URL = f"{ONEWEB_BASE}/Account/Funds"
STATEMENT_URL = f"{ONEWEB_BASE}/Account/Statement"

# Default 90s window for the user to tap Okta Verify push approval on their phone.
PUSH_APPROVAL_TIMEOUT_MS = 90_000


@dataclass
class Balance:
    pot_name: str
    amount: float


@dataclass
class OneCardTransaction:
    code: str          # e.g. "004 : VEND (MONEY)"
    occurred_at: datetime
    amount: float      # signed; negative = spend
    running_balance: Optional[float]

    @property
    def fingerprint(self) -> str:
        return f"{self.code}|{self.occurred_at.isoformat()}|{self.amount:.2f}"


@dataclass
class ScrapeResult:
    balances: List[Balance] = field(default_factory=list)
    transactions: List[OneCardTransaction] = field(default_factory=list)
    account_id: Optional[str] = None
    display_name: Optional[str] = None
    session_expired: bool = False


class SessionExpired(Exception):
    """Raised when TouchNet redirects us back to SSO mid-scrape."""


class LoginFailed(Exception):
    """Raised when Playwright login flow fails before reaching the dashboard."""


# ---------------------------------------------------------------------------
# Playwright login
# ---------------------------------------------------------------------------

async def login_and_capture_cookies(
    username: str,
    password: str,
    push_timeout_ms: int = PUSH_APPROVAL_TIMEOUT_MS,
    headless: bool = True,
) -> dict:
    """
    Drive CCA Okta SSO + TouchNet OneWeb to capture authenticated cookies.

    Returns {"cookies": [...playwright cookie dicts...], "captured_at": iso8601}.
    Raises LoginFailed on timeout or unexpected state.
    """
    from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=headless)
        context = await browser.new_context()
        page = await context.new_page()
        try:
            await page.goto(ONEWEB_BASE + "/", wait_until="domcontentloaded")

            # CCA Okta typically presents identifier first, then password on a second screen.
            # Selectors here match Okta's hosted sign-in widget; if CCA uses a custom IdP
            # theme these will need updating once we see the real DOM.
            await _fill_okta_identifier(page, username)
            await _fill_okta_password(page, password)
            await _wait_for_dashboard_after_push(page, push_timeout_ms)

            cookies = await context.cookies()
            return {
                "cookies": cookies,
                "captured_at": datetime.now(timezone.utc).isoformat(),
            }
        except PlaywrightTimeout as e:
            raise LoginFailed(f"Login timed out: {e}") from e
        finally:
            await context.close()
            await browser.close()


async def _fill_okta_identifier(page, username: str) -> None:
    selectors = [
        'input[name="identifier"]',
        'input[name="username"]',
        'input#okta-signin-username',
        'input[autocomplete="username"]',
    ]
    field = await _first_visible(page, selectors, timeout_ms=20_000)
    if not field:
        raise LoginFailed("Could not locate Okta username field")
    await field.fill(username)

    next_button_selectors = [
        'input[type="submit"][value="Next"]',
        'button:has-text("Next")',
        'input[type="submit"]',
    ]
    btn = await _first_visible(page, next_button_selectors, timeout_ms=5_000)
    if btn:
        await btn.click()


async def _fill_okta_password(page, password: str) -> None:
    selectors = [
        'input[name="credentials.passcode"]',
        'input[type="password"][name="password"]',
        'input[type="password"]',
    ]
    field = await _first_visible(page, selectors, timeout_ms=20_000)
    if not field:
        raise LoginFailed("Could not locate Okta password field")
    await field.fill(password)

    submit_selectors = [
        'input[type="submit"][value="Verify"]',
        'button:has-text("Verify")',
        'button:has-text("Sign In")',
        'input[type="submit"]',
    ]
    btn = await _first_visible(page, submit_selectors, timeout_ms=5_000)
    if btn:
        await btn.click()


async def _wait_for_dashboard_after_push(page, timeout_ms: int) -> None:
    """Block until the URL lands back on the TouchNet dashboard, or timeout."""
    await page.wait_for_url(
        re.compile(r"secure\.touchnet\.net/.+/Account/Dashboard"),
        timeout=timeout_ms,
    )


async def _first_visible(page, selectors: list, timeout_ms: int):
    """Return the first selector that becomes visible, or None."""
    for sel in selectors:
        try:
            locator = page.locator(sel).first
            await locator.wait_for(state="visible", timeout=timeout_ms // len(selectors))
            return locator
        except Exception:
            continue
    return None


# ---------------------------------------------------------------------------
# httpx fetch + HTML parse
# ---------------------------------------------------------------------------

def _cookies_to_jar(cookie_dicts: list) -> dict:
    """Convert Playwright cookie dicts to a flat {name: value} jar for httpx."""
    return {c["name"]: c["value"] for c in cookie_dicts if "name" in c and "value" in c}


async def scrape_account(cookies: list) -> ScrapeResult:
    """
    Fetch dashboard + statement pages using stored cookies.
    Raises SessionExpired if TouchNet bounces us back to the SSO login.
    """
    jar = _cookies_to_jar(cookies)
    result = ScrapeResult()

    async with httpx.AsyncClient(cookies=jar, follow_redirects=False, timeout=15.0) as client:
        # Dashboard: balance(s) + account info
        dash_resp = await _get_authenticated(client, DASHBOARD_URL)
        _parse_dashboard(dash_resp.text, result)

        # Statement: paginated transaction history (DataTables renders all rows in HTML;
        # if it turns out to be server-side AJAX we'll switch to hitting that endpoint).
        stmt_resp = await _get_authenticated(client, STATEMENT_URL)
        _parse_statement(stmt_resp.text, result)

    return result


async def _get_authenticated(client: httpx.AsyncClient, url: str) -> httpx.Response:
    resp = await client.get(url)
    if resp.status_code in (301, 302, 303, 307, 308):
        location = resp.headers.get("location", "")
        if "okta" in location.lower() or "login" in location.lower() or "sso" in location.lower():
            raise SessionExpired(f"Redirected to {location}")
    if resp.status_code == 401 or resp.status_code == 403:
        raise SessionExpired(f"{resp.status_code} on {url}")
    resp.raise_for_status()
    return resp


# ---------------------------------------------------------------------------
# Parsers — tentative selectors, refine with real HTML
# ---------------------------------------------------------------------------

_AMOUNT_RE = re.compile(r"-?\$?\s*([\-]?\d{1,3}(?:,\d{3})*(?:\.\d+)?)")
_BALANCE_LINE_RE = re.compile(r"\$\s*([\-]?\d{1,3}(?:,\d{3})*(?:\.\d+)?)")
_ACCOUNT_ID_RE = re.compile(r"ID#\s*(\d{6,})")


def _parse_dashboard(html: str, result: ScrapeResult) -> None:
    soup = BeautifulSoup(html, "html.parser")

    # Account info: "Hello, <name>" + "ID# 010032684"
    text_blob = soup.get_text(" ", strip=True)
    m = re.search(r"Hello,\s*([^|]+?)(?:\s*Account|\s*ID#|$)", text_blob)
    if m:
        result.display_name = m.group(1).strip()
    m = _ACCOUNT_ID_RE.search(text_blob)
    if m:
        result.account_id = m.group(1)

    # Balance cards. OneWeb renders each balance pot in a card with the pot name
    # (e.g. "Student Balance") and the dollar amount.
    # Real selectors will become obvious once we have a captured HTML sample;
    # for now we sweep common containers and pair the name with the nearest dollar amount.
    for card in soup.select(".balance-card, .balance, [class*='balance' i]"):
        name_el = card.select_one(".balance-name, .name, h3, h4, strong")
        amount_el = card.select_one(".balance-amount, .amount, [class*='amount' i]")
        if not (name_el and amount_el):
            continue
        amount_match = _BALANCE_LINE_RE.search(amount_el.get_text(" ", strip=True))
        if not amount_match:
            continue
        amount = float(amount_match.group(1).replace(",", ""))
        name = name_el.get_text(" ", strip=True).rstrip(".")
        result.balances.append(Balance(pot_name=name, amount=amount))


def _parse_statement(html: str, result: ScrapeResult) -> None:
    soup = BeautifulSoup(html, "html.parser")

    # Statement page: DataTables-rendered table with columns Transaction | Date - Time | Amount | Balance
    table = soup.find("table")
    if not table:
        return

    headers = [th.get_text(strip=True).lower() for th in table.select("thead th")]
    col_idx = {
        "transaction": _find_col(headers, ["transaction"]),
        "datetime": _find_col(headers, ["date", "time"]),
        "amount": _find_col(headers, ["amount"]),
        "balance": _find_col(headers, ["balance"]),
    }

    for row in table.select("tbody tr"):
        cells = [td.get_text(" ", strip=True) for td in row.select("td")]
        if not cells:
            continue
        try:
            code = _safe_cell(cells, col_idx["transaction"])
            dt_str = _safe_cell(cells, col_idx["datetime"])
            amt_str = _safe_cell(cells, col_idx["amount"])
            bal_str = _safe_cell(cells, col_idx["balance"])
            occurred_at = _parse_oneweb_datetime(dt_str)
            amount = _parse_signed_amount(amt_str)
            if amount is None or occurred_at is None or not code:
                continue
            running = _parse_signed_amount(bal_str)
            result.transactions.append(OneCardTransaction(
                code=code,
                occurred_at=occurred_at,
                amount=amount,
                running_balance=running,
            ))
        except Exception as e:
            logger.warning(f"OneCard row parse skipped: {e}")
            continue


def _find_col(headers: List[str], keywords: List[str]) -> Optional[int]:
    for i, h in enumerate(headers):
        if all(kw in h for kw in keywords):
            return i
    for i, h in enumerate(headers):
        if any(kw in h for kw in keywords):
            return i
    return None


def _safe_cell(cells: List[str], idx: Optional[int]) -> str:
    if idx is None or idx >= len(cells):
        return ""
    return cells[idx]


def _parse_oneweb_datetime(s: str) -> Optional[datetime]:
    """OneWeb statement shows '2026-05-11 18:39:39'."""
    s = s.strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%m/%d/%Y %H:%M:%S", "%m/%d/%Y %I:%M %p"):
        try:
            return datetime.strptime(s, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _parse_signed_amount(s: str) -> Optional[float]:
    if not s:
        return None
    negative = "-" in s
    m = _AMOUNT_RE.search(s.replace(",", ""))
    if not m:
        return None
    val = float(m.group(1))
    return -abs(val) if negative else val
