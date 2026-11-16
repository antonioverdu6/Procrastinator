# Reglas de Desarrollo: Procrastinator

Consulta y sigue estrictamente las directrices completas definidas en [AGENTS.md](./AGENTS.md):
- Estética blanca minimalista.
- Estilos centralizados como objetos en `src/style.js`.
- Una carpeta por componente bajo `src/components/<NombreComponente>/`.
- Integraciones con LLM en `backend/app/ai_service.py` con modo híbrido (API Key + Fallback local), consumidas vía `src/services/api.ts`.
