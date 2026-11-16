# Procrastinator

> Aplicación de escritorio local para Windows pensada para programadores. Reparte tus desarrollos en objetivos diarios alcanzables, gestiona tu energía con un asistente conversacional y analiza tu rendimiento real con dashboards.

---

## ⚡ Inicio Rápido

### Opción 1: Lanzador Directo (Recomendado)
Haz doble clic en **`iniciar.bat`** en la carpeta del proyecto.

### Opción 2: Desde la Terminal (PowerShell / CMD)
```powershell
npm.cmd run electron:dev
```

Si prefieres abrirlo en el navegador web:
```powershell
npm.cmd run dev
```

---

## 🎯 ¿Cómo Funciona?

Procrastinator combate la sobrecarga mental mediante tres pilares:

| Pilar | Funcionamiento |
| :--- | :--- |
| **Objetivo Diario** | Oculta el backlog infinito y selecciona solo las tareas que caben en tu jornada habitual (por defecto 2.5 horas en bloques de 30-45 min). |
| **Copiloto Conversacional** | ¿Tienes más o menos energía hoy? Dile al bot *"Tengo 1 hora extra"* o *"Hoy solo puedo 45 minutos"* y reestructurará la jornada automáticamente sin culpa. |
| **Dashboard de Rendimiento** | Gráficos reales de horas planificadas frente a horas dedicadas, cálculo de racha diaria y ratio de precisión en tus estimaciones. |

---

## 🧭 Vistas y Funcionalidades Inteligentes

### 1. Objetivo Diario (`DailyFocus`) & Temporizador (`Timer`)
- **Foco único**: Presenta una única tarea activa para evitar parálisis por análisis.
- **💡 ¿Qué tengo que hacer? (Guía de Ejecución con IA)**: Botón directo en la tarea activa. La IA desglosa la tarea en una checklist interactiva paso a paso (~10 min cada paso), indica los archivos o módulos a tocar y te alerta de trampas o errores comunes para que no te estanques.
- **Detector de atascos**: Alerta visual cuando superas el tiempo estimado de la tarea para sugerir pausas o cortes limpios.

### 2. Proyectos & Backlog (`ProjectManager`)
- **⚖️ Evaluación de Tareas con el PM**: Al escribir una tarea, puedes pulsar en *"Evaluar con PM"*. La IA dictamina si es **útil para el proyecto** o si es distracción / sobreingeniería, asigna su **prioridad real** y calcula la **duración estimada personalizada** ajustada a tu velocidad histórica real (`accuracyRatio`).
- **🗺️ Asistente de Nuevo Proyecto con Desglose y Conversación**:
  - Al crear un proyecto, el PM genera automáticamente 5 a 7 micro-tareas secuenciales.
  - **Refinamiento conversacional**: Puedes chatear con el PM (*"Quita los pagos y pon login con Google"*, *"Haz las tareas más cortas"*) y el bot actualizará dinámicamente la lista de tareas en tiempo real antes de guardarlas en el backlog.

### 3. Copiloto de Jornada (`Chatbot`)
- Motor conversacional capaz de interpretar comandos de tiempo (*"+1h extra"*, *"reducir a 1h hoy"*).
- **Híbrido**: Funciona 100% offline sin configurar nada mediante su motor local, y permite conectar **Google Gemini** (gratuito) o **OpenAI** desde Ajustes.

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

> Si no configuras ninguna clave, el asistente continuará funcionando con su motor heurístico local sin conexión.

---

## 📂 Estructura del Proyecto (Arquitectura Desacoplada)

El sistema separa completamente el backend en Python (**FastAPI** + **SQLite**) de la interfaz de usuario (**React** + **Vite** + **Electron**):

```
Procrastinator/
├── backend/
│   ├── app/
│   │   ├── main.py            # Servidor FastAPI y endpoints REST (/api/...)
│   │   ├── database.py        # Base de datos SQLite local y migraciones
│   │   ├── models.py          # Esquemas Pydantic tipados
│   │   ├── scheduler.py       # Algoritmo de reparto de carga y estadísticas
│   │   └── ai_service.py      # Integración con Gemini / OpenAI / Groq
│   ├── data/
│   │   └── procrastinator.db  # Base de datos SQLite local persistente
│   ├── requirements.txt       # fastapi, uvicorn, pydantic, httpx
│   └── run.py                 # Script directo de arranque (puerto 8000)
├── electron/
│   ├── main.cjs               # Proceso principal nativo de Electron
│   └── preload.cjs            # Puente seguro de Electron
├── src/
│   ├── style.js               # Tokens y estilos estructurados por objetos
│   ├── style.d.ts             # Tipado estricto de estilos
│   ├── services/
│   │   └── api.ts             # Cliente HTTP tipado que conecta con FastAPI
│   ├── components/
│   │   ├── ProcrastinatorBox/ # Primitivo estático ("div-procrastinator")
│   │   ├── ProcrastinatorButton/ # Botón estático
│   │   ├── ProcrastinatorBadge/  # Badge estático
│   │   ├── ProcrastinatorInput/  # Input estático
│   │   ├── ProcrastinatorText/   # Tipografía estática
│   │   ├── DailyFocus/        # Vista del objetivo diario y cola de tareas
│   │   ├── Timer/             # Temporizador de foco y fricción
│   │   ├── ProjectManager/    # Proyectos, backlog y refinamiento con IA
│   │   ├── Dashboard/         # Métricas y gráficos de rendimiento
│   │   ├── Chatbot/           # Asistente conversacional de jornada
│   │   ├── Navbar/            # Barra de navegación superior
│   │   └── SettingsModal/     # Configuración de horas y claves
│   ├── types/
│   │   └── index.ts           # Modelos TypeScript sincronizados
│   ├── App.tsx                # Orquestador principal de vistas
│   └── main.tsx               # Entrada de React
├── iniciar.bat                # Lanzador de un solo clic (FastAPI + Desktop)
└── package.json
```
