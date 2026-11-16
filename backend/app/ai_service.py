import json
import re
import httpx
from typing import Dict, Any, List, Optional
from .database import get_connection
from .scheduler import get_settings, get_effective_capacity, adjust_today_capacity, get_today_date_str

async def query_llm(prompt: str, system_prompt: str = '') -> str:
    settings = get_settings()
    api_key = settings.get('apiKey', '').strip()
    if not api_key:
        raise ValueError("NO_API_KEY")

    provider = settings.get('aiProvider', 'gemini')

    async with httpx.AsyncClient(timeout=30.0) as client:
        # GEMINI
        if provider == 'gemini':
            model = settings.get('customModel') or 'gemini-1.5-flash'
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            payload = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": f"{system_prompt}\n\n{prompt}"}]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.4,
                    "maxOutputTokens": 1200
                }
            }
            res = await client.post(url, json=payload)
            if res.status_code != 200:
                raise Exception(f"Gemini API error: {res.status_code} - {res.text}")
            data = res.json()
            return data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')

        # OPENAI / GROQ
        endpoint = "https://api.groq.com/openai/v1/chat/completions" if provider == 'groq' else "https://api.openai.com/v1/chat/completions"
        default_model = 'llama-3.3-70b-versatile' if provider == 'groq' else 'gpt-4o-mini'
        model = settings.get('customModel') or default_model

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.4,
            "max_tokens": 1200
        }
        res = await client.post(endpoint, json=payload, headers=headers)
        if res.status_code != 200:
            raise Exception(f"AI API error: {res.status_code} - {res.text}")
        data = res.json()
        return data.get('choices', [{}])[0].get('message', {}).get('content', '')

# --- GUÍA DE EJECUCIÓN (QUÉ TENGO QUE HACER) ---
async def get_task_action_plan(task: Dict[str, Any], project: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    prompt = f"""Actúa como Lead Developer pragmático y Project Manager anti-bloqueo.
El programador tiene activa esta tarea:
- Título: "{task.get('title')}"
- Descripción: "{task.get('description', '')}"
- Proyecto: "{project.get('name', 'General') if project else 'General'}"
- Tiempo estimado: {task.get('estimatedMinutes', 45)} minutos

Proporciona una guía hiper-concreta de ejecución paso a paso:
Responde EXCLUSIVAMENTE con un JSON válido con esta estructura:
{{
  "summary": "Enfoque en 1 o 2 frases",
  "steps": [
    "1. Crear interfaz/tipo...",
    "2. Escribir la lógica mínima del caso feliz...",
    "3. Añadir control de excepciones y validar...",
    "4. Probar en componente..."
  ],
  "filesToTouch": ["src/..."],
  "pitfall": "Trampa o detalle secundario donde suele perderse el tiempo",
  "quickSnippet": ""
}}"""

    try:
        raw = await query_llm(prompt, "Lead Tech y Project Manager enfocado en resultados directos.")
        match = re.search(r'\{[\s\S]*\}', raw)
        if match:
            return json.loads(match.group(0))
    except Exception as e:
        pass

    return {
        "summary": f"Enfoque modular para '{task.get('title')}': implementa la lógica mínima viable en bloques de 15 minutos.",
        "steps": [
            f"1. Definir los tipos o modelos de datos necesarios para '{task.get('title')}'.",
            "2. Desarrollar la función o componente base con el flujo principal funcionando.",
            "3. Comprobar casos límite y posibles fallos sin añadir complejidad innecesaria.",
            "4. Hacer commit y verificar integración con el resto del proyecto."
        ],
        "filesToTouch": ["Archivos de lógica principal", "Tipos / Modelos asociados"],
        "pitfall": "No intentes pulir estilos o casos hiper-raros ahora; busca que funcione el caso base primero.",
        "quickSnippet": ""
    }

# --- EVALUADOR DE TAREAS POR EL PM ---
async def evaluate_task(title: str, description: str, project: Optional[Dict[str, Any]], velocity: float = 1.0) -> Dict[str, Any]:
    prompt = f"""Eres un Project Manager implacable y experimentado para un desarrollador en solitario.
El usuario quiere añadir esta tarea:
- Título: "{title}"
- Detalles: "{description}"
- Proyecto: "{project.get('name', 'General') if project else 'General'}"
- Ratio histórico de velocidad: {velocity}x (si es > 1.0, suele tardar más de lo estimado).

Evalúa si aporta valor real para el MVP o es sobreingeniería, determina prioridad y minutos reales.
Responde ÚNICAMENTE con un JSON:
{{
  "isUseful": true,
  "verdict": "Explicación directa del PM de por qué es esencial o por qué huele a distracción",
  "suggestedPriority": "high",
  "estimatedMinutes": 45,
  "breakdownWarning": ""
}}"""

    try:
        raw = await query_llm(prompt, "Project Manager técnico estricto, realista y pragmático.")
        match = re.search(r'\{[\s\S]*\}', raw)
        if match:
            data = json.loads(match.group(0))
            return {
                "isUseful": bool(data.get("isUseful", True)),
                "verdict": data.get("verdict", "Tarea evaluada para el proyecto."),
                "suggestedPriority": data.get("suggestedPriority", "medium"),
                "estimatedMinutes": int(data.get("estimatedMinutes", 45)),
                "breakdownWarning": data.get("breakdownWarning") or None
            }
    except Exception as e:
        pass

    est = min(90, max(20, int(round(45 * velocity))))
    return {
        "isUseful": True,
        "verdict": f"Tarea relevante para el proyecto. Estimada con factor de velocidad histórico ({velocity}x).",
        "suggestedPriority": "medium",
        "estimatedMinutes": est,
        "breakdownWarning": "Supera 1 hora. Considera partirla en 2 micro-tareas." if est > 60 else None
    }

# --- GENERACIÓN DE ROADMAP AL CREAR PROYECTO ---
async def generate_roadmap(name: str, description: str, target_hours: float, velocity: float = 1.0) -> List[Dict[str, Any]]:
    prompt = f"""Eres un Lead Software Architect y Project Manager.
El usuario va a crear este proyecto de software:
- Nombre: "{name}"
- Descripción: "{description}"
- Horas objetivo: {target_hours}h

Genera una lista de 5 a 7 micro-tareas esenciales para construir este proyecto de forma iterativa y sin parálisis.
Reglas:
- Cada tarea debe ser de 30 a 50 minutos (ajustadas para velocidad {velocity}x).
- Orden secuencial lógico (1. Setup/modelos -> 2. Core logic -> 3. UI/Endpoints -> 4. Cierre).
Responde ÚNICAMENTE con un array JSON de objetos:
[
  {{
    "id": "prop-1",
    "title": "Título conciso y accionable",
    "description": "Qué incluye y qué queda fuera",
    "estimatedMinutes": 45,
    "priority": "high",
    "difficulty": "medium"
  }}
]"""

    try:
        raw = await query_llm(prompt, "Arquitecto de software y PM ágil.")
        match = re.search(r'\[[\s\S]*\]', raw)
        if match:
            items = json.loads(match.group(0))
            return [
                {
                    "id": f"prop-{idx+1}",
                    "title": str(it.get("title", f"Fase {idx+1}")),
                    "description": str(it.get("description", "")),
                    "estimatedMinutes": int(it.get("estimatedMinutes", 45)),
                    "priority": it.get("priority", "medium"),
                    "difficulty": it.get("difficulty", "medium")
                }
                for idx, it in enumerate(items)
            ]
    except Exception as e:
        pass

    return [
        {
            "id": "prop-1",
            "title": f"Configurar entorno y esquema base para {name}",
            "description": "Estructura de carpetas, dependencias e interfaces clave.",
            "estimatedMinutes": 40,
            "priority": "high",
            "difficulty": "medium"
        },
        {
            "id": "prop-2",
            "title": "Implementar el caso de uso principal (Happy Path)",
            "description": "Flujo de valor central de la aplicación.",
            "estimatedMinutes": 50,
            "priority": "urgent",
            "difficulty": "hard"
        },
        {
            "id": "prop-3",
            "title": "Crear vistas o endpoints de consumo",
            "description": "Conectar la lógica con pantallas y APIs.",
            "estimatedMinutes": 45,
            "priority": "medium",
            "difficulty": "medium"
        },
        {
            "id": "prop-4",
            "title": "Validación de errores y casos límite",
            "description": "Asegurar que las excepciones se manejen con elegancia.",
            "estimatedMinutes": 35,
            "priority": "medium",
            "difficulty": "easy"
        },
        {
            "id": "prop-5",
            "title": "Prueba de integración y verificación",
            "description": "Comprobar el flujo de principio a fin.",
            "estimatedMinutes": 30,
            "priority": "high",
            "difficulty": "easy"
        }
    ]

# --- REFINAMIENTO CONVERSACIONAL DE ROADMAP ---
async def refine_roadmap(current_tasks: List[Dict[str, Any]], instruction: str, project_name: str, project_desc: str) -> Dict[str, Any]:
    prompt = f"""Eres el Project Manager de "{project_name}".
Tareas actuales propuestas:
{json.dumps([{"title": t["title"], "estimatedMinutes": t["estimatedMinutes"], "priority": t["priority"]} for t in current_tasks])}

El desarrollador te dice:
"{instruction}"

Aplica sus cambios a la lista de tareas. Responde ÚNICAMENTE con JSON:
{{
  "reply": "Explicación conversacional corta de qué cambiaste",
  "updatedTasks": [
    {{
      "id": "prop-1",
      "title": "...",
      "description": "...",
      "estimatedMinutes": 40,
      "priority": "high",
      "difficulty": "medium"
    }}
  ]
}}"""

    try:
        raw = await query_llm(prompt, "Project Manager técnico conversacional.")
        match = re.search(r'\{[\s\S]*\}', raw)
        if match:
            data = json.loads(match.group(0))
            updated = [
                {
                    "id": f"prop-{idx+1}",
                    "title": str(it.get("title", f"Tarea {idx+1}")),
                    "description": str(it.get("description", "")),
                    "estimatedMinutes": int(it.get("estimatedMinutes", 40)),
                    "priority": it.get("priority", "medium"),
                    "difficulty": it.get("difficulty", "medium")
                }
                for idx, it in enumerate(data.get("updatedTasks", []))
            ]
            return {
                "reply": data.get("reply", "Tareas actualizadas."),
                "updatedTasks": updated if updated else current_tasks
            }
    except Exception as e:
        pass

    return {
        "reply": f"He anotado: '{instruction}'. Puedes editar los minutos o nombres directamente en la lista.",
        "updatedTasks": current_tasks
    }
