import os
from pathlib import Path
from dotenv import load_dotenv
import httpx
import json

load_dotenv(Path(__file__).parent / ".env")
api_key = (os.getenv("AI_API_KEY") or "").strip()
api_url = (os.getenv("AI_API_URL") or "").strip()
modelo = (os.getenv("AI_MODEL") or "").strip()

payload = {
    "model": modelo,
    "messages": [{"role": "user", "content": "Responda apenas: OK"}],
    "temperature": 0,
    "max_tokens": 50,
}

r = httpx.post(api_url, headers={"Authorization": f"Bearer {api_key}"}, json=payload, timeout=120)
print("Status:", r.status_code)

if r.status_code == 200:
    data = r.json()
    print("Chaves do JSON:", list(data.keys()))
    print("Resposta bruta:")
    print(json.dumps(data, ensure_ascii=False, indent=2)[:1500])

    # parse flexível
    try:
        msg = data["choices"][0]["message"]
        conteudo = msg.get("content")
        if isinstance(conteudo, list):
            conteudo = " ".join(p.get("text", "") for p in conteudo if isinstance(p, dict))
        print("Texto extraído:", (conteudo or "").strip() or "(vazio — verifique reasoning_content)")
    except Exception as e:
        print("Falha no parse:", e)
else:
    print(r.text[:500])