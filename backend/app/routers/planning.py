from typing import Any, Dict, Optional

from fastapi import APIRouter

from ..lib.db_helpers import db_session
from ..models import (
    CapacityAdjustRequest,
    DailyPlanResponse,
    StatsResponse,
    UserSettingsModel,
)
from ..scheduler import (
    adjust_today_capacity,
    calculate_stats,
    get_effective_capacity,
    get_settings,
    get_today_date_str,
)

router = APIRouter(prefix="/api", tags=["planning"])


def _mask_secret(secret: str) -> str:
    clean = (secret or '').strip()
    if not clean:
        return ''
    if len(clean) <= 8:
        return '****'
    return f"{clean[:4]}...{clean[-4:]}"


def _sanitize_settings(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Devuelve configuración al cliente sin exponer nunca las claves reales en texto plano."""
    api_key = (raw.get('apiKey') or '').strip()
    gh_token = (raw.get('githubToken') or '').strip()
    return {
        **raw,
        "apiKey": "",
        "githubToken": "",
        "hasApiKey": bool(api_key),
        "apiKeyPreview": _mask_secret(api_key),
        "hasGithubToken": bool(gh_token),
        "githubTokenPreview": _mask_secret(gh_token),
        "clearApiKey": False,
        "clearGithubToken": False,
    }


@router.get("/daily-plan", response_model=DailyPlanResponse)
def get_daily_plan(date: Optional[str] = None):
    return get_effective_capacity(date or get_today_date_str())


@router.post("/daily-plan/adjust")
def adjust_capacity(payload: CapacityAdjustRequest):
    return adjust_today_capacity(payload.deltaMinutes, payload.isAbsolute)


@router.get("/stats", response_model=StatsResponse)
def get_stats():
    return calculate_stats()


@router.get("/settings", response_model=UserSettingsModel)
def get_user_settings():
    return _sanitize_settings(get_settings())


@router.post("/settings", response_model=UserSettingsModel)
def update_user_settings(settings: UserSettingsModel):
    current = get_settings()
    incoming_key = (settings.apiKey or '').strip()
    incoming_gh = (settings.githubToken or '').strip()

    if settings.clearApiKey:
        final_api_key = ''
    elif incoming_key:
        final_api_key = incoming_key
    else:
        final_api_key = (current.get('apiKey') or '').strip()

    if settings.clearGithubToken:
        final_gh_token = ''
    elif incoming_gh:
        final_gh_token = incoming_gh
    else:
        final_gh_token = (current.get('githubToken') or '').strip()

    with db_session() as conn:
        conn.cursor().execute(
            '''
            UPDATE settings SET
                defaultDailyHours = ?,
                aiProvider = ?,
                apiKey = ?,
                customModel = ?,
                strictness = ?,
                pomodoroWorkMins = ?,
                pomodoroBreakMins = ?,
                soundEnabled = ?,
                githubToken = ?,
                language = ?
            WHERE id = 1
            ''',
            (
                settings.defaultDailyHours,
                settings.aiProvider,
                final_api_key,
                settings.customModel,
                settings.strictness,
                settings.pomodoroWorkMins,
                settings.pomodoroBreakMins,
                1 if settings.soundEnabled else 0,
                final_gh_token,
                settings.language or 'es',
            ),
        )
    return _sanitize_settings(get_settings())
