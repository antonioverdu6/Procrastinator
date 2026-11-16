# Reglas de Desarrollo para el Proyecto: Procrastinator

Este archivo define las directrices y estándares estrictos que cualquier asistente de IA o desarrollador debe seguir en este repositorio.

---

## 1. Identidad y Propósito del Proyecto
- **Nombre**: `Procrastinator` (nunca renombrar a DevPace u otros).
- **Objetivo**: Aplicación de escritorio local para Windows que ayuda a programadores a evitar la procrastinación mediante:
  1. Reparto inteligente de objetivos diarios (2.5h habituales en micro-bloques de 30-45m).
  2. Copiloto técnico que desglosa tareas, evalúa utilidad y adapta la jornada.
  3. Dashboards de rendimiento real (racha, precisión estimada vs real y horas registradas).

---

## 2. Regla de Arquitectura de Componentes (Obligatoria)
- **Una carpeta por componente**: Todo nuevo componente debe residir en su propio subdirectorio bajo `src/components/<NombreComponente>/`:
  ```
  src/components/<NombreComponente>/
  ├── <NombreComponente>.tsx
  └── index.ts
  ```
- **Prohibición**: Queda terminantemente prohibido crear archivos `.tsx` sueltos directamente en la raíz de `src/components/`.

---

## 3. Sistema de Estilos y Diseño Visual
- **Estética Minimalista en Blanco Puro**:
  - Lienzo: `#F8FAFC`.
  - Tarjetas y modales: `#FFFFFF` con bordes sutiles `#E2E8F0`.
  - Tipografía: Alta legibilidad con `#0F172A` para títulos y `#334155` para cuerpo.
  - Acento funcional: `#2563EB` (azul estándar profesional).
  - **Prohibido**: No usar fondos oscuros opresivos, sombras excesivas, ni gradientes de neón estilo chatbot genérico.
- **Estilos Estructurados por Objeto**:
  - Todos los estilos y tokens deben consumirse desde [`src/style.js`](./src/style.js) (`styles.card`, `styles.button`, `styles.input`, `styles.badge`, `styles.layout`, etc.).
  - Si se añade una nueva variante de estilo, debe registrarse en `src/style.js` y tiparse en `src/style.d.ts`.
- **Componentes Primitivos Estáticos (Obligatorios)**:
  - En lugar de usar elementos HTML genéricos como `<div>`, `<button>`, `<span>` o `<p>` con clases sueltas repetidas, se debe emplear el sistema de primitivos armonizados:
    - `<ProcrastinatorBox>` (el "div-procrastinator" con variantes predefinidas en `src/style.js`: `page`, `header`, `card`, `card-interactive`, `card-selected`, `subtle`, `row`, `row-between`, `stack`, `stack-sm`, `grid-2`, `grid-3`, `grid-4`, `list`, `list-item`, `modal-overlay`, `modal-card`, etc. Prohibido añadir strings ad-hoc de clases de layout dentro de `className`).
    - `<ProcrastinatorButton>` (variantes `primary`, `secondary`, `ghost`, `success`, `danger`).
    - `<ProcrastinatorBadge>` (variantes `primary`, `success`, `warning`, `danger`, `neutral`).
    - `<ProcrastinatorInput>` y `<ProcrastinatorText>`.

---

## 4. Filosofía del Project Manager con IA
- Toda interacción con LLMs y asistencia técnica reside en el backend en [`backend/app/ai_service.py`](./backend/app/ai_service.py) y se consume de forma desacoplada desde el cliente [`src/services/api.ts`](./src/services/api.ts).
- **Principios de Asistencia**:
  - **Pragmatismo técnico**: Priorizar soluciones directas de 30-45 minutos frente a sobreingeniería.
  - **Evaluación de utilidad**: Al crear tareas, el PM debe alertar si la tarea huele a procrastinación productiva o no es esencial para el MVP.
  - **Estimación personalizada**: Ajustar siempre los minutos estimados utilizando la velocidad histórica del usuario (`accuracyRatio`).
  - **Soporte Híbrido**: Cualquier función de IA debe contemplar modo API Key (Gemini, OpenAI, Groq) y disponer de un fallback local offline que garantice que la app nunca se quede bloqueada.

---

## 5. Arquitectura Desacoplada: FastAPI + React
- **Backend (Python / FastAPI)**: Reside bajo `backend/app/` y expone una API REST limpia:
  - Base de datos SQLite local persistente en `backend/data/procrastinator.db`.
  - Modelos estrictos con Pydantic en `backend/app/models.py`.
  - Algoritmo de planificación y estadísticas en `backend/app/scheduler.py`.
  - Integración con LLMs y asistencia técnica en `backend/app/ai_service.py`.
  - Punto de arranque: `python backend/run.py` (puerto 8000).
- **Frontend (React + Vite + Electron)**:
  - Reside bajo `src/` y consume la API a través del cliente tipado [`src/services/api.ts`](./src/services/api.ts).
  - No debe mantener lógica de negocio pesada ni persistencia directa; delega todo al backend de FastAPI.

---

## 6. Entorno Windows y Ejecución
- En entornos Windows PowerShell, invocar comandos de npm mediante `npm.cmd` o a través del script [`iniciar.bat`](./iniciar.bat).
- El backend corre en `http://127.0.0.1:8000`.
- El proceso nativo de Electron está configurado en [`electron/main.cjs`](./electron/main.cjs) y [`electron/preload.cjs`](./electron/preload.cjs).
- Verificar siempre que `npm.cmd run build` pase con 0 errores de TypeScript antes de dar una tarea por finalizada.
