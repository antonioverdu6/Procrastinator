import re
from typing import Any, Dict, List, Optional, Tuple

from ..lib.task_normalizer import (
    normalize_proposed_tasks,
    normalize_subtasks,
    target_task_count,
)


def _est(base: int, velocity: float) -> int:
    return max(20, min(60, int(round((base * velocity) / 5) * 5)))


def build_local_roadmap(
    name: str,
    description: str,
    target_hours: Optional[float] = None,
    velocity: float = 1.0,
    scope: str = 'standard',
    tech_stack: str = '',
) -> List[Dict[str, Any]]:
    """Genera un desglose modular offline adaptado a las palabras clave y stack del proyecto."""
    text = f"{name} {description} {tech_stack}".lower()
    min_tasks, max_tasks = target_task_count(target_hours, scope)
    if target_hours is None:
        desired = max_tasks if scope == 'detailed' else min_tasks + 2
    else:
        desired = max_tasks if scope == 'detailed' else min(
            max_tasks, max(min_tasks, int(round((target_hours * 60) / 40)))
        )

    modules: List[Dict[str, Any]] = [
        {
            "epic": "1. Arquitectura & Setup",
            "title": f"Inicializar repositorio, estructura y dependencias de {name}",
            "description": "Crear estructura de carpetas, variables de entorno y scripts de arranque.",
            "estimatedMinutes": _est(35, velocity),
            "priority": "urgent",
            "difficulty": "easy",
            "subtasks": [
                "Crear estructura de carpetas (backend/frontend o módulos principales)",
                "Configurar .env.example y gestión de configuración local",
                "Instalar dependencias base y verificar comando de arranque",
            ],
        }
    ]

    if any(k in text for k in ['bd', 'base de datos', 'sql', 'sqlite', 'postgres', 'prisma', 'mongo', 'modelo', 'crud', 'app', 'plataforma', 'saas', 'sistema', 'api', 'reserva', 'factura', 'usuario']):
        modules.extend([
            {
                "epic": "2. Base de Datos & Modelos",
                "title": "Diseñar esquema de entidades y relaciones principales",
                "description": "Definir tablas/colecciones clave y restricciones de integridad.",
                "estimatedMinutes": _est(40, velocity),
                "priority": "urgent",
                "difficulty": "medium",
                "subtasks": [
                    "Listar entidades principales y claves foráneas del dominio",
                    "Crear script de inicialización o migración inicial",
                    "Añadir datos semilla (seed) de prueba para desarrollo",
                ],
            },
            {
                "epic": "2. Base de Datos & Modelos",
                "title": "Implementar capa de acceso a datos y esquemas de validación",
                "description": "Repositorios/queries CRUD y contratos tipados de entrada/salida.",
                "estimatedMinutes": _est(40, velocity),
                "priority": "high",
                "difficulty": "medium",
                "subtasks": [
                    "Definir modelos DTO / Pydantic / TypeScript de creación y respuesta",
                    "Implementar funciones de lectura, inserción y actualización seguras",
                    "Validar errores de registro inexistente o datos inválidos",
                ],
            },
        ])

    if any(k in text for k in ['auth', 'login', 'usuario', 'cuenta', 'rol', 'jwt', 'oauth', 'registro', 'saas', 'cliente', 'panel', 'admin']):
        modules.extend([
            {
                "epic": "3. Autenticación & Roles",
                "title": "Implementar registro, login y hash de contraseñas",
                "description": "Flujo seguro de autenticación con emisión de token/sesión.",
                "estimatedMinutes": _est(45, velocity),
                "priority": "high",
                "difficulty": "hard",
                "subtasks": [
                    "Crear endpoint/lógica de registro con validación de email único",
                    "Hashear contraseñas y verificar credenciales en /login",
                    "Generar y validar JWT o cookie de sesión httpOnly",
                ],
            },
            {
                "epic": "3. Autenticación & Roles",
                "title": "Proteger rutas privadas y control de permisos",
                "description": "Middleware/dependencia de usuario actual y manejo de 401/403.",
                "estimatedMinutes": _est(30, velocity),
                "priority": "high",
                "difficulty": "medium",
                "subtasks": [
                    "Crear guard/dependencia de verificación de token",
                    "Aplicar protección en endpoints privados",
                    "Gestionar expiración de sesión en cliente",
                ],
            },
        ])

    if any(k in text for k in ['ia', 'ai', 'llm', 'gemini', 'openai', 'gpt', 'bot', 'scrap', 'automat', 'agente', 'rag']):
        modules.extend([
            {
                "epic": "4. Motor IA & Automatización",
                "title": "Crear servicio conector con LLM / pipeline de procesamiento",
                "description": "Cliente asíncrono con prompts estructurados y parsing JSON.",
                "estimatedMinutes": _est(45, velocity),
                "priority": "urgent",
                "difficulty": "hard",
                "subtasks": [
                    "Implementar cliente HTTP con timeout y manejo de errores de API",
                    "Diseñar prompt del sistema con salida JSON estricta",
                    "Añadir fallback local para operar si falla la API externa",
                ],
            },
            {
                "epic": "4. Motor IA & Automatización",
                "title": "Conectar pipeline de análisis con el flujo principal",
                "description": "Exponer resultado procesado y persistirlo para reutilización.",
                "estimatedMinutes": _est(35, velocity),
                "priority": "high",
                "difficulty": "medium",
                "subtasks": [
                    "Validar y normalizar la respuesta generada",
                    "Guardar resultados o caché en base de datos",
                    "Probar con 3 casos reales y ajustar formato",
                ],
            },
        ])

    if any(k in text for k in ['pago', 'stripe', 'suscrip', 'factura', 'cobro', 'checkout', 'tienda', 'ecommerce', 'carrito']):
        modules.extend([
            {
                "epic": "5. Pagos & Facturación",
                "title": "Integrar creación de sesión de pago / checkout",
                "description": "Flujo de cobro y redirección de éxito/cancelación.",
                "estimatedMinutes": _est(45, velocity),
                "priority": "high",
                "difficulty": "hard",
                "subtasks": [
                    "Configurar SDK o API de pasarela en modo test",
                    "Crear endpoint para generar sesión de checkout",
                    "Mostrar estado del pedido/plan en el frontend",
                ],
            },
            {
                "epic": "5. Pagos & Facturación",
                "title": "Procesar webhooks de confirmación de pago",
                "description": "Verificación de firma y actualización de estado en BD.",
                "estimatedMinutes": _est(40, velocity),
                "priority": "high",
                "difficulty": "hard",
                "subtasks": [
                    "Validar firma criptográfica del webhook",
                    "Actualizar estado de suscripción o factura de forma idempotente",
                    "Probar eventos simulados en local",
                ],
            },
        ])

    modules.extend([
        {
            "epic": "Backend & Lógica Core",
            "title": f"Implementar endpoints y reglas de negocio principales de {name}",
            "description": "Casos de uso centrales (Happy Path) con validaciones de dominio.",
            "estimatedMinutes": _est(45, velocity),
            "priority": "urgent",
            "difficulty": "hard",
            "subtasks": [
                "Definir rutas REST/acciones principales del dominio",
                "Implementar lógica central de creación, listado y actualización",
                "Añadir validaciones de negocio y códigos HTTP claros",
            ],
        },
        {
            "epic": "Backend & Lógica Core",
            "title": "Añadir filtros, búsqueda y acciones de estado en API",
            "description": "Consultas optimizadas para el día a día y transiciones de estado.",
            "estimatedMinutes": _est(35, velocity),
            "priority": "medium",
            "difficulty": "medium",
            "subtasks": [
                "Soportar query params de filtrado y ordenación",
                "Implementar transiciones de estado válidas",
                "Verificar respuestas con curl o /docs",
            ],
        },
    ])

    is_backend_only = any(k in text for k in ['cli', 'solo backend', 'sin ui', 'script']) and not any(
        k in text for k in ['web', 'react', 'front', 'ui', 'dashboard', 'app', 'pantalla', 'móvil', 'mobile']
    )
    if not is_backend_only:
        is_mobile = any(k in text for k in ['móvil', 'mobile', 'react native', 'expo', 'flutter', 'android', 'ios'])
        ui_epic = "Frontend & Pantallas Móviles" if is_mobile else "Frontend & Interfaz"
        modules.extend([
            {
                "epic": ui_epic,
                "title": "Crear cliente API tipado y estado global de vistas",
                "description": "Tipos TypeScript, servicio HTTP y manejo de carga/errores.",
                "estimatedMinutes": _est(30, velocity),
                "priority": "high",
                "difficulty": "easy",
                "subtasks": [
                    "Definir interfaces TypeScript del dominio",
                    "Implementar wrapper fetch/axios con manejo uniforme de errores",
                    "Conectar carga inicial y refresco tras mutaciones",
                ],
            },
            {
                "epic": ui_epic,
                "title": "Construir vista principal y listado interactivo",
                "description": "Pantalla central operativa con tarjetas, filtros y feedback inmediato.",
                "estimatedMinutes": _est(45, velocity),
                "priority": "urgent",
                "difficulty": "medium",
                "subtasks": [
                    "Maquetar layout principal limpio y responsive",
                    "Renderizar listado con estados vacíos y badges de estado",
                    "Conectar acciones rápidas (completar, filtrar, eliminar)",
                ],
            },
            {
                "epic": ui_epic,
                "title": "Implementar formularios de creación y edición",
                "description": "Flujo claro para crear y actualizar registros sin fricción.",
                "estimatedMinutes": _est(40, velocity),
                "priority": "high",
                "difficulty": "medium",
                "subtasks": [
                    "Construir formulario controlado con validación básica",
                    "Mostrar estados de envío y errores de validación",
                    "Actualizar la vista inmediatamente al guardar",
                ],
            },
        ])

    if any(k in text for k in ['dashboard', 'analítica', 'métrica', 'gráfica', 'reporte', 'estadística']):
        modules.append({
            "epic": "Analítica & Dashboard",
            "title": "Calcular métricas agregadas e implementar panel visual",
            "description": "KPIs reales y gráficas de evolución temporal.",
            "estimatedMinutes": _est(40, velocity),
            "priority": "medium",
            "difficulty": "medium",
            "subtasks": [
                "Crear endpoint de métricas agregadas en backend",
                "Renderizar tarjetas KPI y gráfica principal",
                "Comprobar edge cases cuando no hay datos históricos",
            ],
        })

    if any(k in text for k in ['notific', 'email', 'correo', 'recordatorio', 'alerta', 'tiempo real', 'websocket', 'chat']):
        modules.append({
            "epic": "Comunicaciones & Eventos",
            "title": "Implementar sistema de notificaciones o mensajería",
            "description": "Envío y registro de avisos clave dentro del flujo.",
            "estimatedMinutes": _est(40, velocity),
            "priority": "medium",
            "difficulty": "medium",
            "subtasks": [
                "Definir disparadores de eventos que generan notificación",
                "Implementar envío/persistencia del mensaje",
                "Mostrar estado de leído o entrega en UI",
            ],
        })

    modules.extend([
        {
            "epic": "QA, Testing & Cierre",
            "title": "Añadir manejo de errores, edge cases y validaciones de seguridad",
            "description": "Revisar entradas vacías, timeouts y mensajes claros al usuario.",
            "estimatedMinutes": _est(35, velocity),
            "priority": "medium",
            "difficulty": "easy",
            "subtasks": [
                "Probar payloads inválidos y estados vacíos",
                "Añadir mensajes de error comprensibles en UI y API",
                "Revisar que no queden secretos hardcodeados",
            ],
        },
        {
            "epic": "QA, Testing & Cierre",
            "title": "Tests de integración del flujo completo y guía de arranque",
            "description": "Verificar flujo E2E principal y documentar cómo ejecutar el proyecto.",
            "estimatedMinutes": _est(35, velocity),
            "priority": "high",
            "difficulty": "easy",
            "subtasks": [
                "Ejecutar pruebas automatizadas de endpoints críticos",
                "Verificar build de producción sin errores de compilación",
                "Actualizar README con comandos exactos de instalación y uso",
            ],
        },
    ])

    extra_pool = [
        {
            "epic": "Backend & Lógica Core",
            "title": "Implementar paginación y ordenación avanzada",
            "description": "Evitar cargas pesadas cuando crezca el volumen de registros.",
            "estimatedMinutes": _est(30, velocity),
            "priority": "low",
            "difficulty": "easy",
            "subtasks": [
                "Añadir parámetros limit/offset en consultas principales",
                "Devolver metadatos de total de registros",
                "Conectar paginación o carga incremental en UI",
            ],
        },
        {
            "epic": "Frontend & Interfaz",
            "title": "Pulir estados de carga, vacíos y feedback visual",
            "description": "Indicadores discretos y confirmaciones en acciones destructivas.",
            "estimatedMinutes": _est(30, velocity),
            "priority": "low",
            "difficulty": "easy",
            "subtasks": [
                "Añadir indicadores de carga en botones asíncronos",
                "Confirmar borrado de elementos críticos",
                "Verificar contraste y usabilidad en pantalla pequeña",
            ],
        },
        {
            "epic": "QA, Testing & Cierre",
            "title": "Preparar build / empaquetado y checklist de lanzamiento",
            "description": "Validar variables de entorno y artefacto final ejecutable.",
            "estimatedMinutes": _est(30, velocity),
            "priority": "medium",
            "difficulty": "easy",
            "subtasks": [
                "Probar arranque limpio desde cero con BD vacía",
                "Verificar logs de consola sin warnings críticos",
                "Hacer tag/commit de versión v1.0 MVP",
            ],
        },
    ]

    while len(modules) < desired and extra_pool:
        modules.insert(-1, extra_pool.pop(0))

    if scope == 'mvp' and len(modules) > max_tasks:
        modules = modules[:max_tasks]

    return normalize_proposed_tasks(modules, velocity)


def refine_roadmap_local(current_tasks: List[Dict[str, Any]], instruction: str) -> Dict[str, Any]:
    """Refinamiento determinístico offline para comandos frecuentes sobre un roadmap."""
    lower = instruction.lower()
    updated = [dict(t) for t in current_tasks]
    notes: List[str] = []

    min_match = re.search(r'(\d{2})\s*(?:min|minutos|m\b)', lower)
    if min_match and any(k in lower for k in ['máximo', 'maximo', 'max', 'tope', 'reduce', 'hazlas de', 'cortas']):
        cap = max(15, min(60, int(min_match.group(1))))
        for t in updated:
            if t.get('estimatedMinutes', 40) > cap:
                t['estimatedMinutes'] = cap
        notes.append(f"ajustado el límite a {cap} min por tarea")

    rem_match = re.search(r'(?:quita|elimina|borra|sin)\s+(?:el|la|los|las)?\s*([a-záéíóúñ0-9\s]{3,30})', lower)
    if rem_match:
        kw = rem_match.group(1).strip().split()[0]
        before = len(updated)
        filtered = [
            t for t in updated
            if kw not in t.get('title', '').lower() and kw not in t.get('epic', '').lower()
        ]
        if 0 < len(filtered) < before:
            updated = filtered
            notes.append(f"eliminadas las tareas relacionadas con '{kw}'")

    if any(k in lower for k in ['añade', 'agrega', 'pon', 'incluye', 'falta', 'crea']):
        clean_topic = re.sub(
            r'^(?:añade|agrega|pon|incluye|crea)\s+(?:un|una|el|la|módulo de|modulo de|tarea de)?\s*',
            '',
            instruction.strip(),
            flags=re.IGNORECASE,
        )
        topic = clean_topic[:65] if clean_topic else instruction[:65]
        new_id = f"prop-{len(updated) + 1}"
        updated.append({
            "id": new_id,
            "epic": "Módulo Adicional",
            "title": topic[0].upper() + topic[1:] if topic else "Nueva tarea solicitada",
            "description": f"Módulo añadido por indicación: {instruction}",
            "estimatedMinutes": 40,
            "priority": "high",
            "difficulty": "medium",
            "subtasks": normalize_subtasks([
                f"Definir requisitos y estructura de {topic}",
                "Implementar funcionalidad principal",
                "Validar casos borde e integrar con el resto",
            ], prefix=f"{new_id}-sub"),
        })
        notes.append(f"añadida nueva tarea sobre '{topic}'")

    reply = (
        f"He {', '.join(notes)}."
        if notes
        else f"He anotado tu indicación ('{instruction}'). Puedes editar cualquier título, épica, subtarea o tiempo directamente en el tablero de arriba (o conectar una API Key en Ajustes para refinado completo por IA)."
    )
    return {
        "reply": reply,
        "updatedTasks": normalize_proposed_tasks(updated),
    }


def parse_capacity_command(lower: str) -> Optional[Tuple[int, bool, str]]:
    """Detecta ajustes de capacidad diaria en lenguaje natural (ES/EN)."""
    if "+1h" in lower or "1 hora extra" in lower or "una hora extra" in lower or "1 extra hour" in lower or "extra hour" in lower:
        return (60, False, "Añadida +1 hora extra a tu jornada de hoy")
    if "+2h" in lower or "2 horas extra" in lower or "2 extra hours" in lower:
        return (120, False, "Añadidas +2 horas extra a tu jornada de hoy")
    if "+30" in lower or "30 minutos extra" in lower or "30 extra min" in lower:
        return (30, False, "Añadidos +30 min extra a tu jornada de hoy")
    if "-1h" in lower or "1 hora menos" in lower or "1 hour less" in lower:
        return (-60, False, "Reducida 1 hora de tu jornada de hoy")
    if "-30" in lower or "30 minutos menos" in lower:
        return (-30, False, "Reducidos 30 min de tu jornada de hoy")

    abs_min = re.search(r'(?:solo\s+(?:puedo|tengo|dispongo\s+de)|hoy\s+tengo|only\s+(?:have|can)|today\s+i\s+have)\s+(\d{2,3})\s*(?:min|minutos|minutes|m\b)', lower)
    if abs_min:
        mins = max(30, min(480, int(abs_min.group(1))))
        return (mins, True, f"Capacidad de hoy fijada en {mins} minutos")

    abs_hr = re.search(r'(?:solo\s+(?:puedo|tengo|dispongo\s+de)|hoy\s+tengo|only\s+(?:have|can)|today\s+i\s+(?:only\s+)?have)\s+(\d+(?:[.,]\d+)?)\s*(?:h|hora|horas|hour|hours)', lower)
    if abs_hr:
        hrs = float(abs_hr.group(1).replace(',', '.'))
        mins = max(30, min(480, int(round(hrs * 60))))
        return (mins, True, f"Capacidad de hoy fijada en {hrs:g}h ({mins}m)")

    return None


def looks_like_project_breakdown_request(text: str) -> bool:
    """Detecta si el mensaje describe un proyecto para desglosar estilo Jira (ES/EN)."""
    lower = text.lower()
    triggers = [
        'desglosa', 'desglósame', 'planifica', 'planifícame', 'roadmap',
        'como un jira', 'azure devops', 'épicas', 'epicas', 'módulos', 'modulos',
        'quiero hacer', 'quiero crear', 'quiero construir', 'quiero desarrollar',
        'voy a hacer', 'voy a crear', 'nuevo proyecto', 'crear proyecto', 'crea un proyecto',
        'break down', 'plan a project', 'create a project', 'build an app', 'want to build',
    ]
    if any(t in lower for t in triggers):
        return True
    domain_words = ['app', 'aplicación', 'aplicacion', 'web', 'plataforma', 'saas', 'sistema', 'api', 'bot', 'tienda', 'crm', 'erp', 'platform']
    return len(text) >= 55 and any(w in lower for w in domain_words)


def extract_project_meta_from_text(text: str) -> Tuple[str, Optional[float], str]:
    """Extrae nombre corto, horas (si el usuario las indicó) y alcance desde texto libre."""
    hours_match = re.search(r'(\d+(?:[.,]\d+)?)\s*(?:h|hora|horas)', text.lower())
    target_hours: Optional[float] = None
    if hours_match:
        target_hours = max(4.0, min(160.0, float(hours_match.group(1).replace(',', '.'))))

    scope = (
        'detailed'
        if any(k in text.lower() for k in ['detallad', 'completo', 'jira', 'azure', 'exhaustiv'])
        else ('mvp' if 'mvp' in text.lower() else 'standard')
    )

    name_clean = re.sub(
        r'^(?:hola,?\s*)?(?:quiero\s+(?:hacer|crear|construir|desarrollar)|desglósame|desglosame|planifícame|planificame|crea\s+un\s+proyecto\s+(?:para|de)?|nuevo\s+proyecto\s*:?)\s*',
        '',
        text.strip(),
        flags=re.IGNORECASE,
    )
    name_clean = re.sub(r'^(?:un|una|el|la)\s+', '', name_clean, flags=re.IGNORECASE)
    candidate = re.split(r'[.\n,;:]', name_clean)[0].strip()
    words = candidate.split()[:6]
    while words and words[-1].lower() in {'para', 'de', 'con', 'y', 'en', 'a'}:
        words.pop()
    project_name = ' '.join(words).strip()
    if len(project_name) < 3:
        project_name = "Nuevo Proyecto"
    else:
        project_name = project_name[0].upper() + project_name[1:]

    return project_name, target_hours, scope


def _replace_term_ci(text: str, old_term: str, new_term: str) -> str:
    if not text or not old_term:
        return text
    return re.sub(re.escape(old_term), new_term, text, flags=re.IGNORECASE)


def build_local_task_edits(
    msg_text: str,
    projects: List[Dict[str, Any]],
    all_tasks: List[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    """
    Detecta peticiones de editar, migrar tecnología o eliminar tareas ya existentes
    en modo offline (fallback local).
    """
    lower = msg_text.lower()
    active_tasks = [t for t in all_tasks if t.get('status') != 'completed']
    if not active_tasks:
        return None

    # Detectar si apunta a un proyecto concreto
    target_proj = next((p for p in projects if p['name'].lower() in lower), None)
    scoped_tasks = (
        [t for t in active_tasks if t['projectId'] == target_proj['id']]
        if target_proj
        else active_tasks
    )

    # 1. Cambio / migración de tecnología: "cambia X por Y", "pasa de X a Y", "usa Y en vez de X"
    swap_patterns = [
        r'(?:cambia|cambiar|sustituye|sustituir|reemplaza|reemplazar)\s+([a-z0-9\.\+\-#_áéíóúñ\s]{2,28}?)\s+(?:por|a|con)\s+([a-z0-9\.\+\-#_áéíóúñ\s]{2,28})',
        r'(?:pasa|pasar|migra|migrar)\s+de\s+([a-z0-9\.\+\-#_áéíóúñ\s]{2,28}?)\s+a\s+([a-z0-9\.\+\-#_áéíóúñ\s]{2,28})',
        r'(?:usa|usar|utiliza|utilizar)\s+([a-z0-9\.\+\-#_áéíóúñ\s]{2,28}?)\s+en\s+(?:vez|lugar)\s+de\s+([a-z0-9\.\+\-#_áéíóúñ\s]{2,28})',
    ]

    for idx, pat in enumerate(swap_patterns):
        m = re.search(pat, msg_text, flags=re.IGNORECASE)
        if not m:
            continue
        first, second = m.group(1).strip(), m.group(2).strip()
        old_tech, new_tech = (second, first) if idx == 2 else (first, second)
        # Limpiar coletillas tipo "en el proyecto X"
        for stop in (' en el proyecto', ' en ', ' para '):
            if stop in new_tech.lower():
                new_tech = re.split(re.escape(stop), new_tech, flags=re.IGNORECASE)[0].strip()
            if stop in old_tech.lower():
                old_tech = re.split(re.escape(stop), old_tech, flags=re.IGNORECASE)[0].strip()

        if not old_tech or not new_tech:
            continue

        tasks_to_update = []
        for t in scoped_tasks:
            blob = f"{t.get('title', '')} {t.get('description', '')} {t.get('epic', '')} " + " ".join(
                s.get('title', '') for s in (t.get('subtasks') or [])
            )
            if old_tech.lower() in blob.lower():
                new_subs = [
                    {
                        "id": s.get("id") or f"{t['id']}-sub-{i+1}",
                        "title": _replace_term_ci(s.get("title", ""), old_tech, new_tech),
                        "done": bool(s.get("done", False)),
                    }
                    for i, s in enumerate(t.get("subtasks") or [])
                ]
                tasks_to_update.append({
                    "id": t["id"],
                    "title": _replace_term_ci(t.get("title", ""), old_tech, new_tech),
                    "description": _replace_term_ci(t.get("description", ""), old_tech, new_tech),
                    "epic": _replace_term_ci(t.get("epic", "General"), old_tech, new_tech),
                    "subtasks": new_subs,
                })

        if tasks_to_update:
            titles_preview = ", ".join(f"**{u['title']}**" for u in tasks_to_update[:4])
            return {
                "content": f"✏️ He actualizado **{len(tasks_to_update)} tarea(s)** cambiando **{old_tech}** por **{new_tech}**: {titles_preview}.",
                "tasksToUpdate": tasks_to_update,
                "tasksToDelete": [],
                "projectUpdates": (
                    [{"id": target_proj["id"], "description": _replace_term_ci(target_proj.get("description", ""), old_tech, new_tech)}]
                    if target_proj and old_tech.lower() in (target_proj.get("description") or "").lower()
                    else []
                ),
            }

        return {
            "content": f"No encontré tareas pendientes que mencionen **{old_tech}**. Dime qué tarea o módulo concreto quieres migrar a **{new_tech}** (o añade una API Key en Ajustes para reescritura semántica completa).",
            "tasksToUpdate": [],
            "tasksToDelete": [],
            "projectUpdates": [],
        }

    # 2. Eliminar tareas por palabra clave: "elimina las tareas de X", "quita la tarea de X"
    del_match = re.search(
        r'(?:elimina|borra|quita)\s+(?:las\s+tareas|la\s+tarea|tareas)\s+(?:de|sobre|relacionadas\s+con)?\s*([a-záéíóúñ0-9\s\-]{3,40})',
        lower,
    )
    if del_match:
        kw = del_match.group(1).strip()
        for stop in (' en el proyecto', ' del proyecto', ' en '):
            if stop in kw:
                kw = kw.split(stop)[0].strip()
        matched = [
            t for t in scoped_tasks
            if kw in t.get('title', '').lower() or kw in t.get('epic', '').lower()
        ]
        if matched:
            return {
                "content": f"🗑️ He eliminado **{len(matched)} tarea(s)** relacionadas con **{kw}**.",
                "tasksToUpdate": [],
                "tasksToDelete": [t["id"] for t in matched],
                "projectUpdates": [],
            }

    return None
