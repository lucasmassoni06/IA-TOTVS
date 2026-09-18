import os
from pathlib import Path
from dotenv import load_dotenv
import httpx

load_dotenv(Path(__file__).parent / ".env")
api_key = (os.getenv("AI_API_KEY") or "").strip()

r = httpx.get(
    "https://generativelanguage.googleapis.com/v1beta/openai/models",
    headers={"Authorization": f"Bearer {api_key}"},
    timeout=30,
)
print(f"Status: {r.status_code}")
if r.status_code == 200:
    for m in r.json().get("data", []):
        print(m.get("id"))
else:
    print(r.text[:300])