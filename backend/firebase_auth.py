"""
Firebase ID token verification using python-jose.

Avoids the firebase-admin SDK dependency: we only need to verify ID tokens here
(not call any Google APIs), so fetching Google's public x509 certs and verifying
the JWT signature ourselves is enough — and works without a service account.
"""
from __future__ import annotations

import logging
import os
import time
from typing import Dict, Optional

import httpx
from jose import jwt
from jose.utils import base64url_decode  # noqa: F401  (used implicitly by jwt)
from cryptography import x509
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization

logger = logging.getLogger(__name__)

FIREBASE_CERTS_URL = (
    "https://www.googleapis.com/robot/v1/metadata/x509/"
    "securetoken@system.gserviceaccount.com"
)

_certs_cache: Dict[str, str] = {}
_certs_expires_at: float = 0.0


class FirebaseAuthError(Exception):
    pass


def _refresh_certs() -> None:
    """Fetch and cache Google's public x509 certs as PEM-encoded public keys."""
    global _certs_cache, _certs_expires_at

    resp = httpx.get(FIREBASE_CERTS_URL, timeout=5.0)
    resp.raise_for_status()
    raw = resp.json()  # {kid: x509_pem_str}

    parsed: Dict[str, str] = {}
    for kid, cert_pem in raw.items():
        cert = x509.load_pem_x509_certificate(cert_pem.encode("utf-8"), default_backend())
        pubkey_pem = cert.public_key().public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        ).decode("utf-8")
        parsed[kid] = pubkey_pem

    _certs_cache = parsed

    # Honor Cache-Control max-age; fall back to 1h.
    cache_control = resp.headers.get("cache-control", "")
    max_age = 3600
    for part in cache_control.split(","):
        part = part.strip()
        if part.startswith("max-age="):
            try:
                max_age = int(part.split("=", 1)[1])
            except ValueError:
                pass
            break
    _certs_expires_at = time.time() + max_age


def _get_public_key(kid: str) -> str:
    if not _certs_cache or time.time() >= _certs_expires_at:
        _refresh_certs()
    if kid not in _certs_cache:
        # Cert rotation can race a request; force a refresh once before giving up.
        _refresh_certs()
    if kid not in _certs_cache:
        raise FirebaseAuthError(f"Unknown signing key id: {kid}")
    return _certs_cache[kid]


def verify_id_token(id_token: str, project_id: Optional[str] = None) -> dict:
    """
    Verify a Firebase ID token and return its decoded claims.
    Raises FirebaseAuthError on any validation failure.
    """
    project_id = project_id or os.environ.get("FIREBASE_PROJECT_ID")
    if not project_id:
        raise FirebaseAuthError("FIREBASE_PROJECT_ID not configured")

    try:
        unverified_header = jwt.get_unverified_header(id_token)
    except Exception as e:
        raise FirebaseAuthError(f"Malformed token: {e}") from e

    kid = unverified_header.get("kid")
    if not kid:
        raise FirebaseAuthError("Token missing 'kid' header")

    public_key = _get_public_key(kid)

    try:
        claims = jwt.decode(
            id_token,
            public_key,
            algorithms=["RS256"],
            audience=project_id,
            issuer=f"https://securetoken.google.com/{project_id}",
            options={"verify_at_hash": False},
        )
    except Exception as e:
        raise FirebaseAuthError(f"Token verification failed: {e}") from e

    if not claims.get("sub"):
        raise FirebaseAuthError("Token missing subject")
    if claims.get("auth_time") and claims["auth_time"] > time.time():
        raise FirebaseAuthError("Token auth_time is in the future")

    return claims
