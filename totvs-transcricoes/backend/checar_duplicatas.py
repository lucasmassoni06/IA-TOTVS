import sqlite3
from pathlib import Path

c = sqlite3.connect(Path(__file__).parent / "reunioes.db")
tot, dist = c.execute("""
    SELECT COUNT(*), COUNT(DISTINCT ID_MEETING)
    FROM reunioes
    WHERE NOME_SEGMENTO != '' AND UF != ''
""").fetchone()

print(f"linhas elegíveis:      {tot}")
print(f"id_meeting distintos:  {dist}")
print(f"linhas duplicadas:     {tot - dist}")