import httpx
from ..scheduler import get_settings

DEFAULT_GEMINI_MODELS = [
    'gemini-flash-lite-latest',
    'gemini-flash-latest',
    'gemini-3.8-flash',
]


async def query_llm(
    prompt: str,
    system_prompt: str = '',
    max_tokens: int = 2000,
    json_mode: bool = False,
) -> str:
    """Cliente unificado para consultar Gemini, OpenAI o Groq con soporte opcional de JSON nativo."""
    settings = get_settings()
    api_key = settings.get('apiKey', '').strip()
    if not api_key:
        raise ValueError("NO_API_KEY")

    provider = settings.get('aiProvider', 'gemini')

    async with httpx.AsyncClient(timeout=25.0) as client:
        if provider == 'gemini':
            custom = (settings.get('customModel') or '').strip()
            candidates = [custom] if custom else DEFAULT_GEMINI_MODELS
            last_error = "Sin respuesta de Gemini"

            gen_config: dict = {
                "temperature": 0.3,
                "maxOutputTokens": max_tokens,
            }
            if json_mode:
                gen_config["responseMimeType"] = "application/json"

            for model in candidates:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
                payload = {
                    "contents": [
                        {
                            "role": "user",
                            "parts": [{"text": f"{system_prompt}\n\n{prompt}" if system_prompt else prompt}],
                        }
                    ],
                    "generationConfig": gen_config,
                }
                try:
                    res = await client.post(url, json=payload)
                    if res.status_code == 200:
                        data = res.json()
                        text = data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')
                        if text.strip():
                            return text
                    last_error = f"Gemini ({model}) {res.status_code}: {res.text[:200]}"
                except Exception as exc:
                    last_error = f"Gemini ({model}) {type(exc).__name__}: {exc}"

            raise Exception(last_error)

        endpoint = (
            "https://api.groq.com/openai/v1/chat/completions"
            if provider == 'groq'
            else "https://api.openai.com/v1/chat/completions"
        )
        default_model = 'llama-3.3-70b-versatile' if provider == 'groq' else 'gpt-4o-mini'
        model = settings.get('customModel') or default_model

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        }
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.3,
            "max_tokens": max_tokens,
        }
        if json_mode and provider == 'openai':
            payload["response_format"] = {"type": "json_object"}

        res = await client.post(endpoint, json=payload, headers=headers)
        if res.status_code != 200:
            raise Exception(f"AI API error: {res.status_code} - {res.text}")
        data = res.json()
        return data.get('choices', [{}])[0].get('message', {}).get('content', '')
