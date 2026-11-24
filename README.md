# Procrastinator

> Local Windows desktop & web application designed for developers. Breaks software projects into achievable daily focus blocks, plans projects with Jira/Azure DevOps-style epics and subtasks, adapts your schedule via an AI Project Manager Copilot, and tracks real performance metrics.

---

## ⚡ Quick Start

> **Prerequisites:** Python 3.10+ (`pip install -r backend/requirements.txt`) and Node.js (`npm.cmd install`).

### Option 1: One-Click Launchers (Windows)
* **Desktop Mode (FastAPI + Electron):** double-click **`iniciar.bat`**.
* **Web Mode (FastAPI + Vite):** double-click **`iniciar-web.bat`**.

### Option 2: From Terminal (PowerShell / CMD)

#### All-in-one (Electron Desktop + FastAPI + Vite)
```powershell
npm.cmd run electron:dev
```

#### Separate Terminals (ideal for web development)
* **Terminal 1 — FastAPI Backend** (`http://127.0.0.1:8000` | Swagger UI at `/docs`):
  ```powershell
  python backend/run.py
  ```
* **Terminal 2 — Vite + React Frontend** (`http://localhost:5173`):
  ```powershell
  npm.cmd run dev
  ```

---

## 🎯 How It Works

Procrastinator fights developer overwhelm through three core pillars:

| Pillar | Behavior |
| :--- | :--- |
| **Daily Focus** | Hides your infinite backlog and surfaces only the micro-tasks that fit your daily capacity (default: 2.5 hours in 30–45 min blocks). |
| **PM & Schedule Copilot** | Breaks down full projects into epics and subtasks directly in chat, edits/migrates existing backlog tasks, summarizes projects, or adjusts today's capacity (*"+1 extra hour"*, *"Only 1h today"*). |
| **Performance Dashboard** | Real charts comparing planned vs. actual hours, daily streak tracking, and estimate accuracy ratio (`accuracyRatio`). |

---

## 🧭 Views & Smart Features

### 1. Daily Focus (`DailyFocus`) & Focus Timer (`Timer`)
- **Single-task focus**: Shows one active task at a time to eliminate analysis paralysis.
- **Persistent Subtask Checklist**: Renders and saves ticket subtasks directly in SQLite so progress persists across sessions.
- **💡 How do I solve this? (AI Technical Guide + Repo-Aware Q&A)**: Explains architecture and data flow, provides a starter `quickSnippet`, reads real files from your linked GitHub repository or local folder, and includes an inline **Technical Q&A** chat inside the guide.
- **Overtime detector**: Visual alert when you exceed the estimated time to suggest clean commits or short breaks.

### 2. Projects & Backlog (`ProjectManager`)
- **🗺️ New Project Planner (Jira / Azure DevOps Style)**:
  - **Step 1 (Technical Briefing):** Enter project name, description, optional tech stack, optional GitHub/local repository URL, and breakdown depth (`Focused MVP`, `Full Modules`, or `Detailed Jira-style`). The PM automatically calculates the total hour goal based on scope and your historical velocity.
  - **Step 2 (Epics & Subtasks Board):** Groups proposed tasks by **Epics / Modules** with editable titles, priorities, durations, and subtasks, plus a conversational PM refiner before committing everything to the backlog in one transaction.
- **🔗 GitHub / Local Repository Linking**: Link any public or private GitHub repository (or local folder path) so the Technical Guide inspects your actual codebase.
- **📋 Backlog by Epic & On-Demand Breakdown**: Toggle between **By Epic** and flat **List** views, check off subtasks directly in the backlog, or click **Break down** on any task to generate subtasks with AI.
- **⚖️ PM Task Evaluation**: When creating a single task, click **Evaluate with PM** to check MVP value, get a realistic priority, and calibrate duration using your `accuracyRatio`.

### 3. PM & Daily Copilot (`Chatbot`)
- **Project planning from chat**: Describe an app or feature set and the Copilot returns an interactive Epic/Task/Subtask proposal card with one-click **Create Project** or **Open & edit in Planner**.
- **Backlog & schedule actions**: Summarize active projects (*"Tell me what my project is about"*), add tasks, swap technologies across existing tasks (*"Change Prisma to SQLAlchemy"*), delete obsolete tasks, break down your active task, or adjust daily hours.
- **Hybrid execution**: Works offline with its modular local planner and connects to **Google Gemini**, **OpenAI**, or **Groq** when an API Key is configured.

### 4. Performance Dashboard (`Dashboard`)
- Recharts visualizations comparing planned vs. actual hours and daily completion rates.
- **Active Streak** counter and **Anti-Friction Score** tracking postponed tasks.
- Project effort donut chart and priority distribution breakdown.

---

## ⚙️ AI & Language Configuration

All settings and keys are stored **strictly locally** in SQLite (`backend/data/procrastinator.db`, ignored by Git) and API keys are never sent back to the frontend in plaintext once saved:

1. Click **⚙️ (Settings)** in the top navigation bar.
2. Choose your **Interface & Assistant Language**: **Español (ES)** or **English (EN)**.
3. Select your AI provider:
   - **Google Gemini**: Free/paid keys at [Google AI Studio](https://aistudio.google.com/app/apikey).
   - **OpenAI**: From [platform.openai.com](https://platform.openai.com/api-keys).
   - **Groq**: From [console.groq.com](https://console.groq.com/keys).
4. *(Optional)* Add a **GitHub Token** (`github.com/settings/tokens`) for private repositories or higher GitHub API rate limits (public repositories also fall back automatically to public archive/raw downloads or local folder paths).

> Without an API Key, the app remains fully usable via its offline modular planning and analysis engine.

---

## 📂 Project Structure (Modular Decoupled Architecture)

The codebase cleanly separates the modular Python backend (**FastAPI** + **SQLite**) from the micro-component frontend (**React** + **Vite** + **Electron**):

```
Procrastinator/
├── backend/
│   ├── app/
│   │   ├── lib/                    # Shared utilities (JSON, LLM client, repo reader, SQLite helpers)
│   │   ├── services/               # Decoupled AI & planning services (roadmap, task AI, copilot, local planner)
│   │   ├── routers/                # FastAPI routers by domain (projects, tasks, planning, chat, ai)
│   │   ├── main.py                 # FastAPI entry point & router registration
│   │   ├── database.py             # Local SQLite schema & safe migrations
│   │   ├── models.py               # Pydantic request/response schemas
│   │   ├── scheduler.py            # Daily capacity algorithm & stats
│   │   └── ai_service.py           # Compatibility re-export facade
│   ├── data/                       # Local SQLite DB directory (gitignored)
│   ├── requirements.txt            # fastapi, uvicorn, pydantic, httpx
│   └── run.py                      # Backend launcher (port 8000)
├── electron/
│   ├── main.cjs                    # Electron main process
│   └── preload.cjs                 # Secure Electron preload bridge
├── src/
│   ├── i18n/                       # Separate JS localization & conversation files (es.js, en.js, index.tsx)
│   ├── style.js & style.d.ts       # Centralized flat design tokens
│   ├── services/api.ts             # Typed HTTP client for FastAPI
│   ├── types/index.ts              # Shared TypeScript interfaces
│   ├── components/
│   │   ├── Procrastinator*/        # Typed UI primitives (Box, Button, Badge, Input, Modal, Text)
│   │   ├── FormattedText/          # Inline markdown (**bold**, *italic*, `code`) renderer
│   │   ├── DailyFocus/ & DailyCapacityCard/
│   │   ├── Timer/, SubtaskChecklist/ & TaskTechnicalGuide/
│   │   ├── ProjectManager/, ProjectPlannerPanel/, NewTaskPanel/, ProjectRepoCard/ & BacklogTaskRow/
│   │   ├── Dashboard/, DashboardKpis/ & DashboardCharts/
│   │   ├── Chatbot/ & ChatProposalCard/
│   │   ├── Navbar/
│   │   └── SettingsModal/
│   ├── App.tsx
│   └── main.tsx
├── iniciar.bat                     # One-click launcher (FastAPI + Electron)
├── iniciar-web.bat                 # One-click launcher (FastAPI + Web)
└── package.json
```
