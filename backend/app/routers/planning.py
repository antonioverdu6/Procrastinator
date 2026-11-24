from typing import Optional

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
    return get_settings()


@router.post("/settings", response_model=UserSettingsModel)
def update_user_settings(settings: UserSettingsModel):
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
                githubToken = ?
            WHERE id = 1
            ''',
            (
                settings.defaultDailyHours,
                settings.aiProvider,
                settings.apiKey,
                settings.customModel,
                settings.strictness,
                settings.pomodoroWorkMins,
                settings.pomodoroBreakMins,
                1 if settings.soundEnabled else 0,
                (settings.githubToken or '').strip(),
            ),
        )
    return settings
