import json
import re
from typing import Any, Optional


def safe_json_loads(raw: Any, default: Any) -> Any:
    """Parsea JSON de forma segura devolviendo un valor por defecto si falla o viene vacío."""
    if isinstance(raw, type(default)):
        return raw
    if isinstance(raw, str):
        text = raw.strip()
        if not text:
            return default
        try:
            return json.loads(text)
        except Exception:
            return default
    return default


def extract_json_block(raw: str, expect_array: bool = False) -> Optional[Any]:
    """Extrae el primer objeto o array JSON válido de la salida de un LLM."""
    cleaned = raw.strip()
    cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned)
    cleaned = re.sub(r'\s*```$', '', cleaned)
    pattern = r'\[[\s\S]*\]' if expect_array else r'\{[\s\S]*\}'
    match = re.search(pattern, cleaned)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except Exception:
        return None
