import base64
import io
import os
import re
import time
import zipfile
from typing import Any, Dict, List, Optional, Tuple

import httpx

_REPO_TREE_CACHE: Dict[str, Tuple[float, Dict[str, Any]]] = {}
_FILE_CONTENT_CACHE: Dict[str, Tuple[float, str]] = {}
_ZIP_FILES_CACHE: Dict[str, Tuple[float, Dict[str, str]]] = {}
_CACHE_TTL_SECONDS = 300.0
_MAX_ZIP_BYTES = 12 * 1024 * 1024

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
    for rel in ranked[:3]:
        full = os.path.join(root, rel)
        try:
            with open(full, 'r', encoding='utf-8', errors='ignore') as fh:
                content = fh.read(1400)
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
        "treePreview": ranked[:35],
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
    has_token: bool = False,
) -> Optional[str]:
    cache_key = f"{owner}/{repo}@{branch}:{path}"
    now = time.time()
    cached = _FILE_CONTENT_CACHE.get(cache_key)
    if cached and (now - cached[0]) < _CACHE_TTL_SECONDS:
        return cached[1]

    # Para repos públicos sin token, raw.githubusercontent.com evita el límite de 60 req/h de api.github.com
    if not has_token:
        raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}"
        res = await client.get(raw_url)
        if res.status_code == 200 and res.text:
            snippet = res.text[:2600]
            _FILE_CONTENT_CACHE[cache_key] = (now, snippet)
            return snippet

    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}?ref={branch}"
    res = await client.get(url, headers=headers)
    if res.status_code != 200:
        return None
    data = res.json()
    if isinstance(data, dict) and data.get('encoding') == 'base64' and data.get('content'):
        try:
            decoded = base64.b64decode(data['content']).decode('utf-8', errors='ignore')[:2600]
            _FILE_CONTENT_CACHE[cache_key] = (now, decoded)
            return decoded
        except Exception:
            return None
    return None


async def _fetch_public_zip_archive(
    client: httpx.AsyncClient,
    owner: str,
    repo: str,
) -> Optional[Dict[str, str]]:
    """Descarga el archivo ZIP público de GitHub (sin usar cuota de api.github.com) y cachea archivos relevantes."""
    cache_key = f"{owner}/{repo}"
    now = time.time()
    cached = _ZIP_FILES_CACHE.get(cache_key)
    if cached and (now - cached[0]) < _CACHE_TTL_SECONDS:
        return cached[1]

    res = await client.get(f"https://codeload.github.com/{owner}/{repo}/zip/HEAD")
    if res.status_code != 200 or len(res.content) > _MAX_ZIP_BYTES:
        return None

    try:
        files_map: Dict[str, str] = {}
        with zipfile.ZipFile(io.BytesIO(res.content)) as zf:
            for info in zf.infolist():
                if info.is_dir() or info.file_size > 250_000:
                    continue
                # Quitar la carpeta raíz '<repo>-HEAD/' del zip
                parts = info.filename.split('/', 1)
                rel = parts[1] if len(parts) == 2 else info.filename
                if not rel or not _is_relevant_path(rel):
                    continue
                with zf.open(info) as fh:
                    text = fh.read(2600).decode('utf-8', errors='ignore')
                if text.strip():
                    files_map[rel] = text
        if files_map:
            _ZIP_FILES_CACHE[cache_key] = (now, files_map)
            return files_map
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
    has_token = bool(github_token and github_token.strip())
    if has_token:
        headers["Authorization"] = f"Bearer {github_token.strip()}"

    now = time.time()
    cache_key = f"{label}:{'auth' if has_token else 'anon'}"

    try:
        async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
            cached_meta = _REPO_TREE_CACHE.get(cache_key)
            if cached_meta and (now - cached_meta[0]) < _CACHE_TTL_SECONDS:
                repo_meta = cached_meta[1]
            else:
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
                if meta_res.status_code == 403:
                    # Si es repo público sin token pero se agotó el límite 60/h de api.github.com,
                    # descargar el ZIP público vía codeload.github.com (sin límite de API)
                    if not has_token:
                        zip_files = await _fetch_public_zip_archive(client, owner, repo)
                        if zip_files:
                            paths = sorted(zip_files.keys())
                            keywords = _extract_keywords(query_text)
                            ranked = sorted(paths, key=lambda p: _score_path_relevance(p, keywords), reverse=True)
                            snippets = [{"path": p, "content": zip_files[p][:1400]} for p in ranked[:3]]
                            return {
                                "connected": True,
                                "repoLabel": label,
                                "defaultBranch": "HEAD",
                                "language": None,
                                "description": "Conectado vía archivo público de GitHub (sin límite de API).",
                                "filesCount": len(paths),
                                "treePreview": ranked[:35],
                                "fileSnippets": snippets,
                                "error": None,
                            }
                    return {
                        "connected": False,
                        "repoLabel": label,
                        "filesCount": 0,
                        "treePreview": [],
                        "fileSnippets": [],
                        "error": "GitHub API devolvió 403 (límite de 60 req/h sin token o repo privado). Añade un GitHub Token gratuito o usa la ruta local de tu carpeta.",
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

                repo_meta = {
                    "defaultBranch": branch,
                    "language": language,
                    "description": repo_desc,
                    "paths": paths,
                }
                _REPO_TREE_CACHE[cache_key] = (now, repo_meta)

            branch = repo_meta["defaultBranch"]
            language = repo_meta["language"]
            repo_desc = repo_meta["description"]
            paths = repo_meta["paths"]

            keywords = _extract_keywords(query_text)
            ranked = sorted(paths, key=lambda p: _score_path_relevance(p, keywords), reverse=True)

            snippets: List[Dict[str, str]] = []
            for p in ranked[:3]:
                content = await _fetch_github_file_content(client, owner, repo, branch, p, headers, has_token=has_token)
                if content and content.strip():
                    snippets.append({"path": p, "content": content[:1400]})

            return {
                "connected": True,
                "repoLabel": label,
                "defaultBranch": branch,
                "language": language,
                "description": repo_desc,
                "filesCount": len(paths),
                "treePreview": ranked[:35],
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
