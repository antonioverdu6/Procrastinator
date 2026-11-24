import base64
import os
import re
from typing import Any, Dict, List, Optional, Tuple

import httpx

IGNORED_SEGMENTS = {
    'node_modules', '.git', 'dist', 'build', '__pycache__', '.venv', 'venv',
    '.next', '.nuxt', 'coverage', 'release', '.pytest_cache', '.mypy_cache',
}
IGNORED_EXTENSIONS = {
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg', '.woff', '.woff2',
    '.ttf', '.eot', '.mp4', '.mp3', '.zip', '.tar', '.gz', '.exe', '.dll',
    '.pyc', '.db', '.sqlite', '.lock',
}
KEY_MANIFEST_FILES = {
    'package.json', 'requirements.txt', 'pyproject.toml', 'README.md',
    'tsconfig.json', 'Cargo.toml', 'go.mod',
}
CODE_EXTENSIONS = {
    '.py', '.ts', '.tsx', '.js', '.jsx', '.sql', '.json', '.md', '.yml', '.yaml',
    '.go', '.rs', '.java', '.cs', '.php', '.rb', '.html', '.css',
}


def parse_github_repo(repo_url: str) -> Optional[Tuple[str, str]]:
    """Extrae (owner, repo) de una URL o slug de GitHub."""
    raw = (repo_url or '').strip().rstrip('/')
    if not raw:
        return None
    if raw.endswith('.git'):
        raw = raw[:-4]

    match = re.search(r'github\.com[:/]([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)$', raw)
    if match:
        return match.group(1), match.group(2)

    slug = re.match(r'^([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)$', raw)
    if slug and not os.path.exists(raw):
        return slug.group(1), slug.group(2)

    return None


def _is_relevant_path(path: str) -> bool:
    norm = path.replace('\\', '/')
    parts = [p.lower() for p in norm.split('/')]
    if any(seg in IGNORED_SEGMENTS for seg in parts):
        return False
    _, ext = os.path.splitext(norm.lower())
    if ext in IGNORED_EXTENSIONS:
        return False
    if norm.lower().endswith('package-lock.json') or norm.lower().endswith('yarn.lock'):
        return False
    return (ext in CODE_EXTENSIONS) or (os.path.basename(norm) in KEY_MANIFEST_FILES)


SPANISH_TO_CODE_SYNONYMS = {
    'esquema': ['database', 'db', 'models', 'schema', 'sqlite', 'prisma', 'sql', 'types'],
    'entidades': ['models', 'database', 'schema', 'types', 'entities'],
    'entidad': ['models', 'database', 'schema', 'types'],
    'relaciones': ['database', 'models', 'schema', 'foreign'],
    'tablas': ['database', 'db', 'sql', 'schema', 'models'],
    'tabla': ['database', 'db', 'sql', 'schema', 'models'],
    'datos': ['database', 'db', 'models', 'data', 'types'],
    'migracion': ['database', 'migration', 'schema'],
    'autenticacion': ['auth', 'login', 'user', 'jwt', 'token', 'session'],
    'usuario': ['user', 'users', 'auth', 'settings'],
    'usuarios': ['user', 'users', 'auth'],
    'interfaz': ['component', 'components', 'app', 'tsx', 'ui', 'style'],
    'pantalla': ['component', 'components', 'app', 'tsx', 'page', 'view'],
    'vista': ['component', 'components', 'app', 'tsx', 'view'],
    'componente': ['component', 'components', 'tsx'],
    'formulario': ['form', 'input', 'modal', 'tsx'],
    'endpoint': ['router', 'routers', 'routes', 'main', 'api'],
    'endpoints': ['router', 'routers', 'routes', 'main', 'api'],
    'rutas': ['router', 'routers', 'routes', 'main', 'api'],
    'servidor': ['main', 'server', 'app', 'run'],
    'servicio': ['service', 'services'],
    'servicios': ['service', 'services'],
    'pago': ['stripe', 'payment', 'billing', 'checkout'],
    'pagos': ['stripe', 'payment', 'billing', 'checkout'],
    'configuracion': ['settings', 'config', 'env'],
    'ajustes': ['settings', 'config'],
    'estadisticas': ['scheduler', 'stats', 'dashboard'],
    'metricas': ['scheduler', 'stats', 'dashboard'],
    'planificador': ['scheduler', 'planner', 'projectmanager', 'roadmap'],
    'copiloto': ['copilot', 'chat', 'chatbot'],
    'temporizador': ['timer', 'dailyfocus'],
    'subtareas': ['tasks', 'task', 'database', 'normalizer'],
    'tareas': ['tasks', 'task', 'models', 'database'],
    'tarea': ['tasks', 'task', 'models', 'database'],
    'proyecto': ['projects', 'project', 'models', 'database'],
    'proyectos': ['projects', 'project', 'models', 'database'],
}


def _score_path_relevance(path: str, keywords: List[str]) -> int:
    lower = path.lower()
    base = os.path.basename(lower)
    _, ext = os.path.splitext(lower)
    score = 0

    for kw in keywords:
        if len(kw) >= 2 and kw in lower:
            score += 8 if kw in base else 4

    if any(folder in lower for folder in ('src/', 'app/', 'backend/app/', 'api/', 'services/', 'routers/', 'components/', 'lib/', 'models')):
        score += 3
    if ext in ('.py', '.ts', '.tsx', '.js', '.jsx', '.sql'):
        score += 2
    if base in {k.lower() for k in KEY_MANIFEST_FILES}:
        score += 1
    return score


def _extract_keywords(query_text: str) -> List[str]:
    stop = {'para', 'como', 'este', 'esta', 'con', 'los', 'las', 'del', 'una', 'que', 'sobre', 'the', 'and', 'with', 'paso', 'exactamente', 'dentro'}
    tokens = re.findall(r'[a-zA-ZáéíóúñÁÉÍÓÚÑ0-9_]{3,}', (query_text or '').lower())
    norm_map = str.maketrans('áéíóúñ', 'aeioun')
    seen: List[str] = []
    for raw_tok in tokens:
        tok = raw_tok.translate(norm_map)
        if tok in stop:
            continue
        if tok not in seen:
            seen.append(tok)
        for syn in SPANISH_TO_CODE_SYNONYMS.get(tok, []):
            if syn not in seen:
                seen.append(syn)
    return seen[:28]


def _read_local_repo_context(local_path: str, query_text: str) -> Dict[str, Any]:
    """Lee estructura y archivos clave cuando el usuario vincula una ruta local."""
    root = os.path.abspath(local_path)
    all_files: List[str] = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d.lower() not in IGNORED_SEGMENTS]
        for fname in filenames:
            rel = os.path.relpath(os.path.join(dirpath, fname), root).replace('\\', '/')
            if _is_relevant_path(rel):
                all_files.append(rel)
            if len(all_files) >= 300:
                break
        if len(all_files) >= 300:
            break

    keywords = _extract_keywords(query_text)
    ranked = sorted(all_files, key=lambda p: _score_path_relevance(p, keywords), reverse=True)
    snippets: List[Dict[str, str]] = []
    for rel in ranked[:4]:
        full = os.path.join(root, rel)
        try:
            with open(full, 'r', encoding='utf-8', errors='ignore') as fh:
                content = fh.read(2600)
            if content.strip():
                snippets.append({"path": rel, "content": content})
        except Exception:
            continue

    return {
        "connected": True,
        "repoLabel": os.path.basename(root) or root,
        "defaultBranch": "local",
        "language": None,
        "description": f"Repositorio local en {root}",
        "filesCount": len(all_files),
        "treePreview": all_files[:80],
        "fileSnippets": snippets,
        "error": None,
    }


async def _fetch_github_file_content(
    client: httpx.AsyncClient,
    owner: str,
    repo: str,
    branch: str,
    path: str,
    headers: Dict[str, str],
) -> Optional[str]:
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}?ref={branch}"
    res = await client.get(url, headers=headers)
    if res.status_code != 200:
        return None
    data = res.json()
    if isinstance(data, dict) and data.get('encoding') == 'base64' and data.get('content'):
        try:
            decoded = base64.b64decode(data['content']).decode('utf-8', errors='ignore')
            return decoded[:2600]
        except Exception:
            return None
    return None


async def fetch_repo_context(
    repo_url: Optional[str],
    query_text: str = '',
    github_token: Optional[str] = None,
) -> Dict[str, Any]:
    """Obtiene árbol de archivos y fragmentos relevantes desde un repo GitHub o ruta local."""
    raw = (repo_url or '').strip()
    if not raw:
        return {"connected": False, "repoLabel": "", "filesCount": 0, "treePreview": [], "fileSnippets": [], "error": None}

    if os.path.isdir(raw):
        return _read_local_repo_context(raw, query_text)

    parsed = parse_github_repo(raw)
    if not parsed:
        return {
            "connected": False,
            "repoLabel": raw,
            "filesCount": 0,
            "treePreview": [],
            "fileSnippets": [],
            "error": "URL de GitHub no válida (usa https://github.com/usuario/repo o usuario/repo).",
        }

    owner, repo = parsed
    label = f"{owner}/{repo}"
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "Procrastinator-PM-App",
    }
    if github_token and github_token.strip():
        headers["Authorization"] = f"Bearer {github_token.strip()}"

    try:
        async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
            meta_res = await client.get(f"https://api.github.com/repos/{owner}/{repo}", headers=headers)
            if meta_res.status_code == 404:
                return {
                    "connected": False,
                    "repoLabel": label,
                    "filesCount": 0,
                    "treePreview": [],
                    "fileSnippets": [],
                    "error": "Repositorio no encontrado o privado (añade un GitHub Token en Ajustes si es privado).",
                }
            if meta_res.status_code != 200:
                return {
                    "connected": False,
                    "repoLabel": label,
                    "filesCount": 0,
                    "treePreview": [],
                    "fileSnippets": [],
                    "error": f"GitHub API devolvió {meta_res.status_code}.",
                }

            meta = meta_res.json()
            branch = meta.get('default_branch') or 'main'
            language = meta.get('language')
            repo_desc = meta.get('description') or ''

            tree_res = await client.get(
                f"https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}?recursive=1",
                headers=headers,
            )
            paths: List[str] = []
            if tree_res.status_code == 200:
                for node in tree_res.json().get('tree', []):
                    if node.get('type') == 'blob' and _is_relevant_path(node.get('path', '')):
                        paths.append(node['path'])

            keywords = _extract_keywords(query_text)
            ranked = sorted(paths, key=lambda p: _score_path_relevance(p, keywords), reverse=True)

            snippets: List[Dict[str, str]] = []
            for p in ranked[:4]:
                content = await _fetch_github_file_content(client, owner, repo, branch, p, headers)
                if content and content.strip():
                    snippets.append({"path": p, "content": content})

            return {
                "connected": True,
                "repoLabel": label,
                "defaultBranch": branch,
                "language": language,
                "description": repo_desc,
                "filesCount": len(paths),
                "treePreview": paths[:85],
                "fileSnippets": snippets,
                "error": None,
            }
    except Exception as exc:
        return {
            "connected": False,
            "repoLabel": label,
            "filesCount": 0,
            "treePreview": [],
            "fileSnippets": [],
            "error": f"No se pudo conectar con GitHub: {str(exc)[:120]}",
        }
