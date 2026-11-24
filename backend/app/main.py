from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import init_db
from .routers import ai, chat, planning, projects, tasks

app = FastAPI(title="Procrastinator API", version="1.1.0")

# CORS abierto para desarrollo local y Electron
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "app": "Procrastinator API",
        "time": datetime.now(timezone.utc).isoformat(),
    }


app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(planning.router)
app.include_router(chat.router)
app.include_router(ai.router)
