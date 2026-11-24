import sqlite3
import os
from datetime import datetime, timezone
from typing import Dict, Any

from .lib.json_utils import safe_json_loads

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, 'procrastinator.db')

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def _ensure_column(cursor, table: str, column: str, definition: str):
    """Añade una columna a una tabla SQLite existente si aún no existe."""
    cursor.execute(f'PRAGMA table_info({table})')
    existing = {row['name'] for row in cursor.fetchall()}
    if column not in existing:
        cursor.execute(f'ALTER TABLE {table} ADD COLUMN {column} {definition}')

def row_to_task(row) -> Dict[str, Any]:
    """Convierte una fila SQLite de tasks en dict deserializando subtasks."""
    d = dict(row)
    d['subtasks'] = safe_json_loads(d.get('subtasks'), [])
    if not d.get('epic'):
        d['epic'] = 'General'
    return d

def row_to_chat_message(row) -> Dict[str, Any]:
    """Convierte una fila SQLite de chat_messages en dict con metadatos JSON."""
    d = dict(row)
    meta = safe_json_loads(d.pop('metadata', None), {})
    for key in ('suggestedActions', 'planProposal', 'actionsTaken'):
        if key in meta:
            d[key] = meta[key]
    return d

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # Proyectos
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT DEFAULT '#2563EB',
        targetHours REAL DEFAULT 25.0,
        status TEXT DEFAULT 'active',
        repoUrl TEXT DEFAULT '',
        createdAt TEXT NOT NULL
    )
    ''')
    _ensure_column(cursor, 'projects', 'repoUrl', "TEXT DEFAULT ''")

    # Tareas
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        projectId TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        epic TEXT DEFAULT 'General',
        subtasks TEXT DEFAULT '[]',
        estimatedMinutes INTEGER DEFAULT 45,
        actualMinutes INTEGER DEFAULT 0,
        status TEXT DEFAULT 'backlog',
        priority TEXT DEFAULT 'medium',
        difficulty TEXT DEFAULT 'medium',
        deferredCount INTEGER DEFAULT 0,
        scheduledDate TEXT,
        completedAt TEXT,
        "order" INTEGER DEFAULT 0,
        FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    )
    ''')

    # Migraciones seguras para bases de datos ya existentes
    _ensure_column(cursor, 'tasks', 'epic', "TEXT DEFAULT 'General'")
    _ensure_column(cursor, 'tasks', 'subtasks', "TEXT DEFAULT '[]'")

    # Planes diarios
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS daily_plans (
        date TEXT PRIMARY KEY,
        baseCapacityMinutes INTEGER DEFAULT 150,
        extraMinutesAdjustment INTEGER DEFAULT 0,
        completed INTEGER DEFAULT 0
    )
    ''')

    # Sesiones de trabajo
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS work_sessions (
        id TEXT PRIMARY KEY,
        taskId TEXT NOT NULL,
        date TEXT NOT NULL,
        startTime TEXT NOT NULL,
        durationMinutes INTEGER NOT NULL
    )
    ''')

    # Mensajes de chat
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        metadata TEXT DEFAULT '{}'
    )
    ''')
    _ensure_column(cursor, 'chat_messages', 'metadata', "TEXT DEFAULT '{}'")

    # Configuración de usuario
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        defaultDailyHours REAL DEFAULT 2.5,
        aiProvider TEXT DEFAULT 'gemini',
        apiKey TEXT DEFAULT '',
        customModel TEXT,
        strictness TEXT DEFAULT 'balanced',
        pomodoroWorkMins INTEGER DEFAULT 45,
        pomodoroBreakMins INTEGER DEFAULT 10,
        soundEnabled INTEGER DEFAULT 1,
        githubToken TEXT DEFAULT ''
    )
    ''')
    _ensure_column(cursor, 'settings', 'githubToken', "TEXT DEFAULT ''")

    # Insertar configuración por defecto si no existe
    cursor.execute('SELECT COUNT(*) as count FROM settings WHERE id = 1')
    if cursor.fetchone()['count'] == 0:
        cursor.execute('''
        INSERT INTO settings (id, defaultDailyHours, aiProvider, apiKey, strictness, pomodoroWorkMins, pomodoroBreakMins, soundEnabled)
        VALUES (1, 2.5, 'gemini', '', 'balanced', 45, 10, 1)
        ''')

    # Seed de proyectos iniciales si la base de datos está vacía
    cursor.execute('SELECT COUNT(*) as count FROM projects')
    if cursor.fetchone()['count'] == 0:
        now_iso = datetime.now(timezone.utc).isoformat()
        cursor.execute('''
        INSERT INTO projects (id, name, description, color, targetHours, status, createdAt)
        VALUES 
        ('proj-1', 'SaaS Dashboard Pro', 'Plataforma con analítica en tiempo real y facturación Stripe', '#2563EB', 35.0, 'active', ?),
        ('proj-2', 'App Móvil React Native', 'Cliente móvil con sincronización offline de notas', '#16A34A', 20.0, 'active', ?)
        ''', (now_iso, now_iso))

        today_str = datetime.now().strftime('%Y-%m-%d')
        cursor.execute('''
        INSERT INTO tasks (id, projectId, title, description, estimatedMinutes, actualMinutes, status, priority, difficulty, deferredCount, scheduledDate, completedAt, "order")
        VALUES 
        ('task-1', 'proj-1', 'Crear esquema Prisma y migración inicial', 'Definir modelos User, Team y Subscription', 45, 40, 'completed', 'high', 'medium', 0, ?, ?, 1),
        ('task-2', 'proj-1', 'Implementar endpoint de autenticación JWT', 'Rutas /login y /register seguras con cookies httpOnly', 50, 20, 'in_progress', 'urgent', 'hard', 0, ?, NULL, 2),
        ('task-3', 'proj-1', 'Diseñar componente de Header con selector', 'Barra de navegación responsive con avatar', 40, 0, 'scheduled_today', 'medium', 'easy', 0, ?, NULL, 3),
        ('task-4', 'proj-1', 'Integrar Webhooks de Stripe', 'Manejar eventos customer.subscription.created', 60, 0, 'backlog', 'high', 'hard', 1, NULL, NULL, 4),
        ('task-5', 'proj-2', 'Configurar navegación base de Expo Router', 'Estructura por carpetas y temas oscuro/claro', 45, 0, 'backlog', 'medium', 'medium', 0, NULL, NULL, 5)
        ''', (today_str, now_iso, today_str, today_str))

        # Mensaje de bienvenida inicial
        cursor.execute('''
        INSERT INTO chat_messages (id, role, content, timestamp)
        VALUES ('welcome-1', 'assistant', '¡Hola! Soy tu Project Manager personal anti-procrastinación. 🎯\n\nTu objetivo de hoy está calculado para **2.5 horas** de desarrollo enfocado. Tienes 3 micro-tareas preparadas para avanzar sin agobios.\n\n¿Tienes más o menos tiempo hoy? Puedes decirme por ejemplo:\n- *"Hoy tengo 1 hora extra"* ⚡\n- *"Solo dispongo de 45 minutos"* ⏱️\n- *"¿Por dónde empiezo?"* 🚀', ?)
        ''', (now_iso,))

    conn.commit()
    conn.close()
