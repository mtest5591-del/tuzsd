"""Admin router for MaksPay platform-level settings.

Adds:
- Platform fee settings (superadmin only): deposit fee, withdrawal fee (cabinet & API)
- Network on/off toggles (superadmin only)
- 2FA (Google Authenticator) enrollment/verify for any user
"""
import io
import base64
import logging
from typing import Optional

import pyotp
import qrcode
from fastapi import APIRouter, HTTPException, Request, Body
from pydantic import BaseModel

from core import db, get_current_user
from catalog import NETWORKS

logger = logging.getLogger("okipays.admin")

admin_router = APIRouter(prefix="/api/admin")
sec_router = APIRouter(prefix="/api/security")

# ---------------------------------------------------------------------------
# Helpers: platform settings
# ---------------------------------------------------------------------------
DEFAULT_PLATFORM = {
    "_id": "platform_settings",
    "deposit_fee": 0.5,               # flat, deducted from incoming amount (in the incoming currency units, e.g. USDT)
    "withdrawal_fee_cabinet": 1.0,    # flat, added on top of user amount for direct-cabinet withdrawals
    "withdrawal_fee_api": 0.8,        # flat, for API-driven withdrawals (merchant integrations)
    "pool_by_iso": {},                # accumulated fees pool per currency iso (e.g. {"USDT": 12.5})
}

DEFAULT_NETWORKS_DOC_ID = "network_settings"


async def get_platform_settings() -> dict:
    s = await db.system.find_one({"_id": "platform_settings"})
    if not s:
        await db.system.insert_one(dict(DEFAULT_PLATFORM))
        s = dict(DEFAULT_PLATFORM)
    # ensure all keys exist
    for k, v in DEFAULT_PLATFORM.items():
        s.setdefault(k, v)
    return s


async def update_platform_settings(patch: dict) -> dict:
    await db.system.update_one({"_id": "platform_settings"},
                               {"$set": patch}, upsert=True)
    return await get_platform_settings()


async def add_to_pool(iso: str, amount: float):
    if not amount:
        return
    await db.system.update_one(
        {"_id": "platform_settings"},
        {"$inc": {f"pool_by_iso.{iso}": float(amount)}},
        upsert=True,
    )


async def get_network_settings() -> dict:
    s = await db.system.find_one({"_id": DEFAULT_NETWORKS_DOC_ID})
    if not s:
        s = {"_id": DEFAULT_NETWORKS_DOC_ID,
             "enabled": {str(nid): True for nid in NETWORKS.keys()}}
        await db.system.insert_one(dict(s))
    # ensure all network ids present with default True
    changed = False
    for nid in NETWORKS.keys():
        if str(nid) not in s.get("enabled", {}):
            s.setdefault("enabled", {})[str(nid)] = True
            changed = True
    if changed:
        await db.system.update_one({"_id": DEFAULT_NETWORKS_DOC_ID},
                                   {"$set": {"enabled": s["enabled"]}}, upsert=True)
    return s


async def is_network_enabled(network_id) -> bool:
    if network_id is None:
        return True
    s = await get_network_settings()
    return bool(s.get("enabled", {}).get(str(network_id), True))


# ---------------------------------------------------------------------------
# 2FA helpers
# ---------------------------------------------------------------------------
def _generate_qr_data_url(otpauth_uri: str) -> str:
    img = qrcode.make(otpauth_uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


async def check_user_2fa(user: dict, otp: Optional[str]) -> bool:
    """If user has 2FA enabled, validate the OTP. Returns True if OK / not enabled."""
    tf = (user or {}).get("two_fa") or {}
    if not tf.get("enabled"):
        return True
    if not otp:
        return False
    return pyotp.TOTP(tf.get("secret", "")).verify(str(otp).replace(" ", ""), valid_window=1)


# ---------------------------------------------------------------------------
# Authorization guard
# ---------------------------------------------------------------------------
async def _require_superadmin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(403, "Тільки для суперадміністратора MaksPay")
    return user


# ---------------------------------------------------------------------------
# Platform fee endpoints
# ---------------------------------------------------------------------------
class PlatformFeesIn(BaseModel):
    deposit_fee: Optional[float] = None
    withdrawal_fee_cabinet: Optional[float] = None
    withdrawal_fee_api: Optional[float] = None
    otp: Optional[str] = None


@admin_router.get("/platform-fees")
async def platform_fees_get(request: Request):
    user = await _require_superadmin(request)
    s = await get_platform_settings()
    s.pop("_id", None)
    return {"status": True, "data": s}


@admin_router.put("/platform-fees")
async def platform_fees_put(request: Request, payload: PlatformFeesIn):
    user = await _require_superadmin(request)
    # 2FA gate for critical settings (if admin enabled it)
    if (user.get("two_fa") or {}).get("enabled"):
        if not await check_user_2fa(user, payload.otp):
            raise HTTPException(401, "Потрібен коректний код 2FA")
    patch = {}
    if payload.deposit_fee is not None:
        if payload.deposit_fee < 0:
            raise HTTPException(400, "Комісія не може бути від'ємною")
        patch["deposit_fee"] = float(payload.deposit_fee)
    if payload.withdrawal_fee_cabinet is not None:
        if payload.withdrawal_fee_cabinet < 0:
            raise HTTPException(400, "Комісія не може бути від'ємною")
        patch["withdrawal_fee_cabinet"] = float(payload.withdrawal_fee_cabinet)
    if payload.withdrawal_fee_api is not None:
        if payload.withdrawal_fee_api < 0:
            raise HTTPException(400, "Комісія не може бути від'ємною")
        patch["withdrawal_fee_api"] = float(payload.withdrawal_fee_api)
    s = await update_platform_settings(patch)
    s.pop("_id", None)
    return {"status": True, "data": s}


# Public read-only view for merchants/users (they need to know cabinet fee at least)
@admin_router.get("/platform-fees/public")
async def platform_fees_public(request: Request):
    await get_current_user(request)
    s = await get_platform_settings()
    return {"status": True, "data": {
        "deposit_fee": s["deposit_fee"],
        "withdrawal_fee_cabinet": s["withdrawal_fee_cabinet"],
        "withdrawal_fee_api": s["withdrawal_fee_api"],
    }}


# ---------------------------------------------------------------------------
# Network toggle endpoints
# ---------------------------------------------------------------------------
class NetworkToggleIn(BaseModel):
    network_id: int
    enabled: bool
    otp: Optional[str] = None


@admin_router.get("/networks")
async def networks_get(request: Request):
    user = await _require_superadmin(request)
    s = await get_network_settings()
    items = []
    for nid, meta in NETWORKS.items():
        items.append({
            "network_id": nid,
            "name": meta.get("name"),
            "chain": meta.get("chain"),
            "iso": meta.get("iso"),
            "enabled": bool(s["enabled"].get(str(nid), True)),
        })
    return {"status": True, "data": items}


@admin_router.put("/networks")
async def networks_put(request: Request, payload: NetworkToggleIn):
    user = await _require_superadmin(request)
    if (user.get("two_fa") or {}).get("enabled"):
        if not await check_user_2fa(user, payload.otp):
            raise HTTPException(401, "Потрібен коректний код 2FA")
    if payload.network_id not in NETWORKS:
        raise HTTPException(400, "Невідома мережа")
    await db.system.update_one(
        {"_id": DEFAULT_NETWORKS_DOC_ID},
        {"$set": {f"enabled.{payload.network_id}": bool(payload.enabled)}},
        upsert=True,
    )
    s = await get_network_settings()
    return {"status": True, "data": {"network_id": payload.network_id,
                                     "enabled": bool(s["enabled"].get(str(payload.network_id), True))}}


# Public: all users need to know which networks are active for UI selection
@admin_router.get("/networks/public")
async def networks_public(request: Request):
    await get_current_user(request)
    s = await get_network_settings()
    return {"status": True, "data": {str(nid): bool(s["enabled"].get(str(nid), True))
                                     for nid in NETWORKS.keys()}}


# ---------------------------------------------------------------------------
# 2FA endpoints (any authenticated user)
# ---------------------------------------------------------------------------
class OtpIn(BaseModel):
    otp: str


@sec_router.get("/2fa/status")
async def twofa_status(request: Request):
    user = await get_current_user(request)
    tf = user.get("two_fa") or {}
    return {"status": True, "data": {"enabled": bool(tf.get("enabled"))}}


@sec_router.post("/2fa/setup")
async def twofa_setup(request: Request):
    """Generate a new pending secret + QR code. Not yet enabled."""
    user = await get_current_user(request)
    secret = pyotp.random_base32()
    label = user.get("email", user["user_id"])
    otpauth = pyotp.totp.TOTP(secret).provisioning_uri(name=label, issuer_name="MaksPay")
    qr = _generate_qr_data_url(otpauth)
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"two_fa.pending_secret": secret}}
    )
    return {"status": True, "data": {"secret": secret, "otpauth_uri": otpauth,
                                     "qr_data_url": qr}}


@sec_router.post("/2fa/enable")
async def twofa_enable(request: Request, payload: OtpIn):
    user = await get_current_user(request)
    pending = ((user.get("two_fa") or {}).get("pending_secret")) or ""
    if not pending:
        raise HTTPException(400, "Спочатку виконайте setup")
    ok = pyotp.TOTP(pending).verify(str(payload.otp).replace(" ", ""), valid_window=1)
    if not ok:
        raise HTTPException(400, "Невірний код")
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"two_fa.enabled": True, "two_fa.secret": pending},
         "$unset": {"two_fa.pending_secret": ""}}
    )
    return {"status": True, "message": "2FA увімкнено"}


@sec_router.post("/2fa/disable")
async def twofa_disable(request: Request, payload: OtpIn):
    user = await get_current_user(request)
    tf = user.get("two_fa") or {}
    if not tf.get("enabled"):
        return {"status": True, "message": "2FA не активна"}
    ok = pyotp.TOTP(tf.get("secret", "")).verify(str(payload.otp).replace(" ", ""), valid_window=1)
    if not ok:
        raise HTTPException(400, "Невірний код")
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"two_fa.enabled": False},
         "$unset": {"two_fa.secret": "", "two_fa.pending_secret": ""}}
    )
    return {"status": True, "message": "2FA вимкнено"}
