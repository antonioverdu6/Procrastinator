# Procrastinator

> Aplicación de escritorio local para Windows pensada para programadores. Reparte tus desarrollos en objetivos diarios alcanzables, planifica proyectos por épicas y subtareas al estilo Jira/Azure DevOps, gestiona tu energía con un Copiloto PM y analiza tu rendimiento real con dashboards.

---

## ⚡ Inicio Rápido

> **Requisitos previos:** Python 3.10+ (`pip install -r backend/requirements.txt`) y Node.js (`npm.cmd install`).

### Opción 1: Lanzadores Directos (Recomendado)
* **Modo Escritorio (FastAPI + Electron):** haz doble clic en **`iniciar.bat`**.
* **Modo Web (FastAPI + Vite):** haz doble clic en **`iniciar-web.bat`**.

### Opción 2: Desde la Terminal (PowerShell / CMD)

#### Todo en uno (Desktop Electron + FastAPI + Vite)
```powershell
npm.cmd run electron:dev
```

#### Modo separado en 2 terminales (útil en desarrollo web)
* **Terminal 1 — Backend FastAPI** (`http://127.0.0.1:8000` | Swagger en `/docs`):
  ```powershell
  python backend/run.py
  ```
* **Terminal 2 — Frontend Web (Vite + React)** (`http://localhost:5173`):
  ```powershell
  npm.cmd run dev
  ```

---

## 🎯 ¿Cómo Funciona?

Procrastinator combate la sobrecarga mental mediante tres pilares:

| Pilar | Funcionamiento |
| :--- | :--- |
| **Objetivo Diario** | Oculta el backlog infinito y selecciona solo las tareas que caben en tu jornada habitual (por defecto 2.5 horas en bloques de 30-45 min). |
| **Copiloto PM & Jornada** | Desglosa proyectos completos por épicas y subtareas desde el chat, añade tareas al backlog o ajusta tu jornada al vuelo (*"Tengo 1 hora extra"*, *"Hoy solo puedo 45 minutos"*). |
| **Dashboard de Rendimiento** | Gráficos reales de horas planificadas frente a horas dedicadas, cálculo de racha diaria y ratio de precisión en tus estimaciones. |

---

## 🧭 Vistas y Funcionalidades Inteligentes

### 1. Objetivo Diario (`DailyFocus`) & Temporizador (`Timer`)
- **Foco único**: Presenta una única tarea activa para evitar parálisis por análisis.
- **Checklist de Subtareas Persistentes**: Muestra y guarda en SQLite las subtareas del ticket activo para marcar el progreso paso a paso.
- **💡 ¿Cómo lo resuelvo? (Guía Técnica IA + Q&A con contexto del Repo)**: Explica la arquitectura y flujo de datos para resolver la tarea, muestra código de partida (`quickSnippet`), lee archivos reales del repositorio vinculado y permite hacer **preguntas técnicas directas** dentro de la misma guía.
- **Detector de atascos**: Alerta visual cuando superas el tiempo estimado de la tarea para sugerir pausas o cortes limpios.

### 2. Proyectos & Backlog (`ProjectManager`)
- **🔗 Repositorio GitHub (o ruta local) vinculado**: Al crear un proyecto o seleccionarlo, puedes vincular una URL de GitHub (y un token opcional en Ajustes si es privado) para que la Guía Técnica inspeccione tu árbol de archivos y código real.
- **🗺️ Planificador de Nuevo Proyecto (Estilo Jira / Azure DevOps)**:
  - **Paso 1 (Briefing técnico):** Define nombre, descripción, stack tecnológico opcional y nivel de desglose (`MVP Enfocado`, `Completo por Módulos` o `Detallado estilo Jira`). El PM calcula automáticamente la meta total de horas según el alcance y tu velocidad histórica.
  - **Paso 2 (Tablero por Épicas y Subtareas):** Agrupa automáticamente las tareas por **Épicas / Módulos** (Arquitectura, Base de Datos, Backend API, Auth, Frontend UI, QA, etc.), cada una con sus **subtareas editables**. Incluye chat de refinamiento en tiempo real antes de volcar todo al backlog en bloque.
- **📋 Backlog por Épicas y Desglose bajo demanda**:
  - Alterna entre vista agrupada **Por Épica** o **Lista** plana.
  - Despliega y marca subtareas persistidas directamente desde el backlog, o pulsa **Desglosar** en cualquier tarea para que el PM genere sus subtareas.
- **⚖️ Evaluación de Tareas con el PM**: Al crear una tarea suelta, *"Evaluar con PM"* dictamina si aporta valor al MVP, asigna prioridad y ajusta los minutos según tu velocidad histórica (`accuracyRatio`).

### 3. Copiloto PM & Jornada (`Chatbot`)
- **Planificación desde el chat**: Si describes un proyecto nuevo (*"Desglósame una app de reservas con React, FastAPI y Stripe de 20h"*), el Copiloto genera una propuesta interactiva agrupada por épicas y subtareas con botones para **Crear Proyecto en 1 clic** o **Abrir y editar en Planificador**.
- **Acciones sobre el backlog y la jornada**: Puede crear tareas en proyectos existentes, desglosar la tarea prioritaria en subtareas e interpretar ajustes de tiempo (*"+1h extra"*, *"solo puedo 1 hora"*).
- **Híbrido**: Funciona 100% offline mediante su motor modular local y se potencia conectando **Google Gemini**, **OpenAI** o **Groq** desde Ajustes.

### 4. Métricas de Rendimiento (`Dashboard`)
- Gráficos con Recharts: comparativa semanal de horas planificadas vs. reales.
- Contador de **Racha de Días** cumpliendo el objetivo.
- **Índice Anti-Fricción**: Mide tu constancia penalizando las tareas pospuestas repetidamente.

---

## ⚙️ Configuración del Asistente de IA

Tus datos y claves se almacenan **únicamente en tu equipo**:

1. Pulsa el icono **⚙️ (Ajustes)** en la barra superior.
2. Selecciona tu proveedor:
   - **Google Gemini**: Clave gratuita en [Google AI Studio](https://aistudio.google.com/app/apikey).
   - **OpenAI**: Desde [platform.openai.com](https://platform.openai.com/api-keys).
   - **Groq**: Desde [console.groq.com](https://console.groq.com/keys).
3. Introduce tu API Key y pulsa **Guardar Ajustes**.

> Si no configuras ninguna clave, el asistente continuará funcionando con su motor local modular sin conexión.

---

## 📂 Estructura del Proyecto (Arquitectura Modular Desacoplada)

El sistema separa el backend modular en Python (**FastAPI** + **SQLite**) de la interfaz (**React** + **Vite** + **Electron**):

```
Procrastinator/
├── backend/
│   ├── app/
│   │   ├── lib/                    # Librería compartida (utilidades, LLM y BD)
│   │   │   ├── json_utils.py       # Parseo seguro y extracción JSON de LLMs
│   │   │   ├── task_normalizer.py  # Normalización de tareas, épicas y subtareas
│   │   │   ├── llm_client.py       # Cliente unificado Gemini / OpenAI / Groq
│   │   │   └── db_helpers.py       # Context manager SQLite y helpers CRUD
│   │   ├── services/               # Lógica de negocio e IA desacoplada
│   │   │   ├── local_planner.py    # Planificador modular offline y parsers
│   │   │   ├── roadmap_service.py  # Generación y refinamiento de roadmaps
│   │   │   ├── task_ai_service.py  # Guía técnica, evaluación y desglose de tareas
│   │   │   └── copilot_service.py  # Orquestador del Copiloto PM
│   │   ├── routers/                # Endpoints REST separados por dominio
│   │   │   ├── projects.py         # /api/projects y /api/projects/commit-plan
│   │   │   ├── tasks.py            # /api/tasks y registro de tiempo
│   │   │   ├── planning.py         # /api/daily-plan, /api/stats y /api/settings
│   │   │   ├── chat.py             # /api/chat y acciones del Copiloto
│   │   │   └── ai.py               # /api/ai/* (roadmap, refine, breakdown, guide)
│   │   ├── main.py                 # Punto de entrada FastAPI y montaje de routers
│   │   ├── database.py             # Esquema SQLite local y migraciones seguras
│   │   ├── models.py               # Esquemas Pydantic tipados
│   │   ├── scheduler.py            # Reparto de carga diaria y estadísticas
│   │   └── ai_service.py           # Fachada de re-exportación de servicios IA
│   ├── data/
│   │   └── procrastinator.db       # Base de datos SQLite local persistente
│   ├── requirements.txt            # fastapi, uvicorn, pydantic, httpx
│   └── run.py                      # Script directo de arranque (puerto 8000)
├── electron/
│   ├── main.cjs                    # Proceso principal nativo de Electron
│   └── preload.cjs                 # Puente seguro de Electron
├── src/
│   ├── style.js                    # Tokens y estilos estructurados por objetos
│   ├── style.d.ts                  # Tipado estricto de estilos
│   ├── services/
│   │   └── api.ts                  # Cliente HTTP tipado que conecta con FastAPI
│   ├── components/
│   │   ├── ProcrastinatorBox/      # Primitivo estático ("div-procrastinator")
│   │   ├── ProcrastinatorButton/   # Botón estático
│   │   ├── ProcrastinatorBadge/    # Badge estático
│   │   ├── ProcrastinatorInput/    # Input estático
│   │   ├── ProcrastinatorModal/    # Modal estático
│   │   ├── ProcrastinatorText/     # Tipografía estática
│   │   ├── DailyFocus/             # Vista del objetivo diario y cola de tareas
│   │   ├── Timer/                  # Temporizador, subtareas persistentes y guía IA
│   │   ├── ProjectManager/         # Planificador por épicas, backlog y evaluación PM
│   │   ├── Dashboard/              # Métricas y gráficos de rendimiento
│   │   ├── Chatbot/                # Copiloto PM conversacional con propuestas
│   │   ├── Navbar/                 # Barra de navegación superior
│   │   └── SettingsModal/          # Configuración de horas y claves
│   ├── types/
│   │   └── index.ts                # Modelos TypeScript sincronizados
│   ├── App.tsx                     # Orquestador principal de vistas
│   └── main.tsx                    # Entrada de React
├── iniciar.bat                     # Lanzador de un solo clic (FastAPI + Desktop)
├── iniciar-web.bat                 # Lanzador de un solo clic (FastAPI + Web)
└── package.json
```
