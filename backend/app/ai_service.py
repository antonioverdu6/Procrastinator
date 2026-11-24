"""Fachada de compatibilidad: re-exporta los servicios modulares de IA y LLM."""

from .lib.llm_client import query_llm
from .services.copilot_service import handle_copilot_chat
from .services.roadmap_service import generate_roadmap, refine_roadmap
from .services.task_ai_service import (
    ask_task_technical_question,
    breakdown_task_into_subtasks,
    evaluate_task,
    get_task_action_plan,
)

__all__ = [
    "query_llm",
    "get_task_action_plan",
    "ask_task_technical_question",
    "breakdown_task_into_subtasks",
    "evaluate_task",
    "generate_roadmap",
    "refine_roadmap",
    "handle_copilot_chat",
]
