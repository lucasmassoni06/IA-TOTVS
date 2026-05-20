from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import asyncio
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DURACAO_MIN = "CASE WHEN DURACAO_MEETING IS NULL OR DURACAO_MEETING = '' THEN 0.0 ELSE CAST(strftime('%s', '1970-01-01 ' || DURACAO_MEETING) AS REAL) / 60.0 END"
WORDS_COUNT = "LENGTH(ANON_TRANSCRICAO) - LENGTH(REPLACE(ANON_TRANSCRICAO, ' ', '')) + 1"

async def sync_run_query(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    def _execute():
        conn = sqlite3.connect("reunioes.db")
        try:
            cur = conn.cursor()
            cur.execute("PRAGMA group_concat_max_len = 10000000")
            cur.execute(query, params)
            columns = [description[0] for description in cur.description]
            return [dict(zip(columns, row)) for row in cur.fetchall()]
        finally:
            conn.close()
    return await asyncio.get_running_loop().run_in_executor(None, _execute)

async def sync_run_one(query: str, params: tuple = ()) -> Optional[Dict[str, Any]]:
    def _execute():
        conn = sqlite3.connect("reunioes.db")
        try:
            cur = conn.cursor()
            cur.execute("PRAGMA group_concat_max_len = 10000000")
            cur.execute(query, params)
            row = cur.fetchone()
            if row is None:
                return None
            columns = [description[0] for description in cur.description]
            return dict(zip(columns, row))
        finally:
            conn.close()
    return await asyncio.get_running_loop().run_in_executor(None, _execute)

def build_where(search: str = "") -> tuple[str, list]:
    if not search:
        return "WHERE 1=1", []
    search_term = f"%{search}%"
    fields = ["ID_MEETING", "STATUS_MEETING", "FORMATO_MEETING", "NOME_UNIDADE", "UF", "CODT", "NOME_SEGMENTO"]
    conditions = [f"{field} LIKE ?" for field in fields]
    where_clause = "WHERE " + " OR ".join(conditions)
    params = [search_term] * len(fields)
    return where_clause, params

@app.get("/health")
async def health():
    return {"status": "ok", "tabela": "reunioes"}

@app.get("/reunioes")
async def get_reunioes(search: str = Query(""), page: int = Query(1), page_size: int = Query(20)):
    where_clause, where_params = build_where(search)
    offset = (page - 1) * page_size
    summary_query = f"""
        SELECT ID_MEETING,
               MAX(DT_MEETING) as dt_meeting,
               MAX(FORMATO_MEETING) as formato_meeting,
               MAX(STATUS_MEETING) as status_meeting,
               AVG({DURACAO_MIN}) as duracao_minutos,
               COUNT(*) as total_linhas,
               MAX(NOME_UNIDADE) as nome_unidade,
               MAX(UF) as uf,
               MAX(NOME_SEGMENTO) as nome_segmento,
               MAX(FAIXA_FATURAMENTO_CLIENTE_EC) as faixa_faturamento,
               MAX(NOTA_NPS) as nota_nps
        FROM reunioes
        {where_clause}
        GROUP BY ID_MEETING
        ORDER BY MAX(DT_MEETING) DESC
        LIMIT ? OFFSET ?
    """
    params = where_params + [page_size, offset]
    data = await sync_run_query(summary_query, tuple(params))
    total_query = f"SELECT COUNT(DISTINCT ID_MEETING) as total FROM reunioes {where_clause}"
    total_res = await sync_run_one(total_query, tuple(where_params))
    total = total_res["total"] if total_res else 0
    total_pages = (total + page_size - 1) // page_size
    return {"data": data, "total": total, "page": page, "page_size": page_size, "total_pages": total_pages}

@app.get("/reunioes/{id_meeting}")
async def get_reuniao(id_meeting: str):
    summary_query = f"""
        SELECT ID_MEETING,
               MAX(DT_MEETING) as dt_meeting,
               MAX(FORMATO_MEETING) as formato_meeting,
               MAX(STATUS_MEETING) as status_meeting,
               AVG({DURACAO_MIN}) as duracao_minutos,
               COUNT(*) as total_linhas,
               MAX(NOME_UNIDADE) as nome_unidade,
               MAX(UF) as uf,
               MAX(NOME_SEGMENTO) as nome_segmento,
               MAX(FAIXA_FATURAMENTO_CLIENTE_EC) as faixa_faturamento,
               MAX(NOTA_NPS) as nota_nps,
               GROUP_CONCAT(ANON_TRANSCRICAO, ' ') as transcricao_completa
        FROM reunioes
        WHERE ID_MEETING = ?
        GROUP BY ID_MEETING
    """
    summary = await sync_run_one(summary_query, (id_meeting,))
    if not summary:
        raise HTTPException(status_code=404, detail="Reunião não encontrada")
    all_rows_query = "SELECT * FROM reunioes WHERE ID_MEETING = ? ORDER BY DT_MEETING DESC"
    linhas = await sync_run_query(all_rows_query, (id_meeting,))
    return {"resumo": summary, "linhas": linhas}

@app.get("/estatisticas/gerais")
async def estatisticas_gerais(search: str = Query("")):
    where_clause, where_params = build_where(search)
    params = tuple(where_params)
    stats = {}
    total_reunioes_res = await sync_run_one(f"SELECT COUNT(DISTINCT ID_MEETING) as total_reunioes FROM reunioes {where_clause}", params)
    stats["total_reunioes"] = total_reunioes_res["total_reunioes"] if total_reunioes_res else 0
    total_trans_res = await sync_run_one(f"SELECT COUNT(*) as total FROM reunioes WHERE ANON_TRANSCRICAO IS NOT NULL AND ANON_TRANSCRICAO != '' {'AND ' + where_clause.replace('WHERE 1=1 AND ', '').replace('WHERE 1=1', '') if where_clause != 'WHERE 1=1' else ''}", params if where_clause != 'WHERE 1=1' else ())
    stats["total_transcricoes"] = total_trans_res["total"] if total_trans_res else 0
    duracao_media_res = await sync_run_one(f"SELECT AVG({DURACAO_MIN}) as duracao_media_minutos FROM reunioes {where_clause}", params)
    stats["duracao_media_minutos"] = float(duracao_media_res["duracao_media_minutos"] or 0)
    clientes_res = await sync_run_one(f"SELECT COUNT(DISTINCT CODT) as total_clientes FROM reunioes {where_clause}", params)
    stats["total_clientes"] = clientes_res["total_clientes"] if clientes_res else 0
    stats["reunioes_por_formato"] = await sync_run_query(f"SELECT FORMATO_MEETING, COUNT(DISTINCT ID_MEETING) as count FROM reunioes {where_clause} GROUP BY FORMATO_MEETING", params)
    stats["reunioes_por_status"] = await sync_run_query(f"SELECT STATUS_MEETING, COUNT(DISTINCT ID_MEETING) as count FROM reunioes {where_clause} GROUP BY STATUS_MEETING", params)
    stats["reunioes_por_mes"] = await sync_run_query(f"SELECT substr(DT_MEETING,1,7) as mes, COUNT(DISTINCT ID_MEETING) as count FROM reunioes {where_clause} GROUP BY mes ORDER BY mes DESC LIMIT 12", params)
    nps_res = await sync_run_one(f"SELECT AVG(NOTA_NPS) as nps_medio FROM reunioes {where_clause}", params)
    stats["nps_medio"] = float(nps_res["nps_medio"] or 0)
    stats["reunioes_por_uf"] = await sync_run_query(f"SELECT UF, COUNT(DISTINCT ID_MEETING) as count FROM reunioes {where_clause} AND UF IS NOT NULL GROUP BY UF ORDER BY count DESC", params)
    unidades_res = await sync_run_one(f"SELECT COUNT(DISTINCT NOME_UNIDADE) as total_unidades FROM reunioes {where_clause}", params)
    stats["total_unidades"] = unidades_res["total_unidades"] if unidades_res else 0
    stats["segmentos_mais_comuns"] = await sync_run_query(f"SELECT NOME_SEGMENTO, COUNT(DISTINCT ID_MEETING) as count FROM reunioes {where_clause} GROUP BY NOME_SEGMENTO ORDER BY count DESC LIMIT 10", params)
    stats["faixa_faturamento_count"] = await sync_run_query(f"SELECT FAIXA_FATURAMENTO_CLIENTE_EC as faixa, COUNT(DISTINCT ID_MEETING) as count FROM reunioes {where_clause} GROUP BY FAIXA_FATURAMENTO_CLIENTE_EC", params)
    stats["distribuicao_nps"] = await sync_run_query(f"""
        SELECT CASE
            WHEN CAST(NOTA_NPS AS REAL) >= 9 THEN 'Promotores (9-10)'
            WHEN CAST(NOTA_NPS AS REAL) >= 7 THEN 'Neutros (7-8)'
            WHEN NOTA_NPS IS NOT NULL AND NOTA_NPS != '' THEN 'Detratores (0-6)'
            ELSE 'Sem NPS'
        END as categoria, COUNT(DISTINCT ID_MEETING) as count
        FROM reunioes {where_clause}
        GROUP BY categoria
        ORDER BY CASE categoria
            WHEN 'Promotores (9-10)' THEN 1
            WHEN 'Neutros (7-8)' THEN 2
            WHEN 'Detratores (0-6)' THEN 3 ELSE 4
        END
    """, params)
    return stats

@app.get("/analises/palavras-chave")
async def analises_palavras_chave(q: str = Query(...)):
    q = q.strip()
    if not q:
        return []
    termo_upper = q.upper()
    termo_like = f"%{termo_upper}%"
    query = """
        SELECT ID_MEETING, DT_MEETING as dt_meeting, NOME_UNIDADE as nome_unidade,
               SUBSTR(ANON_TRANSCRICAO, MAX(1, INSTR(UPPER(ANON_TRANSCRICAO), ?) - 60), 150) as trecho
        FROM reunioes
        WHERE UPPER(ANON_TRANSCRICAO) LIKE ?
        ORDER BY DT_MEETING DESC LIMIT 50
    """
    return await sync_run_query(query, (termo_upper, termo_like))

@app.get("/analises/completas")
async def analises_completas(search: str = Query("")):
    where_clause, where_params = build_where(search)
    params = tuple(where_params)
    stats = {}
    metricas = await sync_run_one(f"""
        SELECT COUNT(DISTINCT ID_MEETING) as total_reunioes,
               ROUND(AVG({DURACAO_MIN}), 1) as duracao_media,
               COUNT(DISTINCT CODT) as total_clientes,
               COUNT(DISTINCT NOME_UNIDADE) as total_unidades,
               ROUND(AVG(CAST(NOTA_NPS AS REAL)), 1) as nps_medio,
               SUM(CASE WHEN ANON_TRANSCRICAO IS NOT NULL AND ANON_TRANSCRICAO != '' THEN 1 ELSE 0 END) as total_transcricoes,
               ROUND(AVG(LENGTH(ANON_TRANSCRICAO)), 0) as media_caracteres
        FROM reunioes {where_clause}
    """, params)
    stats["metricas"] = metricas or {}
    stats["por_uf"] = await sync_run_query(f"SELECT UF, COUNT(DISTINCT ID_MEETING) as count FROM reunioes {where_clause} AND UF IS NOT NULL AND UF != '' GROUP BY UF ORDER BY count DESC", params)
    stats["por_segmento"] = await sync_run_query(f"SELECT NOME_SEGMENTO, COUNT(DISTINCT ID_MEETING) as count FROM reunioes {where_clause} AND NOME_SEGMENTO IS NOT NULL AND NOME_SEGMENTO != '' GROUP BY NOME_SEGMENTO ORDER BY count DESC LIMIT 10", params)
    stats["por_mes"] = await sync_run_query(f"SELECT substr(DT_MEETING,1,7) as mes, COUNT(DISTINCT ID_MEETING) as count FROM reunioes {where_clause} GROUP BY mes ORDER BY mes DESC LIMIT 12", params)
    stats["por_formato"] = await sync_run_query(f"SELECT FORMATO_MEETING, COUNT(DISTINCT ID_MEETING) as count FROM reunioes {where_clause} AND FORMATO_MEETING IS NOT NULL AND FORMATO_MEETING != '' GROUP BY FORMATO_MEETING", params)
    stats["por_status"] = await sync_run_query(f"SELECT STATUS_MEETING, COUNT(DISTINCT ID_MEETING) as count FROM reunioes {where_clause} AND STATUS_MEETING IS NOT NULL AND STATUS_MEETING != '' GROUP BY STATUS_MEETING", params)
    stats["por_faturamento"] = await sync_run_query(f"SELECT FAIXA_FATURAMENTO_CLIENTE_EC as faixa, COUNT(DISTINCT ID_MEETING) as count FROM reunioes {where_clause} AND FAIXA_FATURAMENTO_CLIENTE_EC IS NOT NULL AND FAIXA_FATURAMENTO_CLIENTE_EC != '' GROUP BY faixa ORDER BY count DESC LIMIT 10", params)
    stats["distribuicao_nps"] = await sync_run_query(f"""
        SELECT CASE
            WHEN CAST(NOTA_NPS AS REAL) >= 9 THEN 'Promotores (9-10)'
            WHEN CAST(NOTA_NPS AS REAL) >= 7 THEN 'Neutros (7-8)'
            WHEN NOTA_NPS IS NOT NULL AND NOTA_NPS != '' THEN 'Detratores (0-6)'
            ELSE 'Sem NPS'
        END as categoria, COUNT(DISTINCT ID_MEETING) as count
        FROM reunioes {where_clause}
        GROUP BY categoria ORDER BY CASE categoria WHEN 'Promotores (9-10)' THEN 1 WHEN 'Neutros (7-8)' THEN 2 WHEN 'Detratores (0-6)' THEN 3 ELSE 4 END
    """, params)
    stats["top_unidades"] = await sync_run_query(f"SELECT NOME_UNIDADE, COUNT(DISTINCT ID_MEETING) as count FROM reunioes {where_clause} AND NOME_UNIDADE IS NOT NULL AND NOME_UNIDADE != '' GROUP BY NOME_UNIDADE ORDER BY count DESC LIMIT 10", params)
    stats["duracao_por_segmento"] = await sync_run_query(f"SELECT NOME_SEGMENTO, ROUND(AVG({DURACAO_MIN}), 1) as duracao_media, COUNT(DISTINCT ID_MEETING) as qtd FROM reunioes {where_clause} AND NOME_SEGMENTO IS NOT NULL AND NOME_SEGMENTO != '' GROUP BY NOME_SEGMENTO HAVING qtd >= 3 ORDER BY duracao_media DESC LIMIT 10", params)
    return stats

# ===== IA DE VERDADE =====

class AssistenteRequest(BaseModel):
    question: str

@app.post("/assistente/ask")
async def assistente_ask(req: AssistenteRequest):
    where_clause, where_params = build_where("")
    params = tuple(where_params)

    stats = {}
    total_res = await sync_run_one(f"SELECT COUNT(DISTINCT ID_MEETING) as total FROM reunioes {where_clause}", params)
    stats["total_reunioes"] = total_res["total"] if total_res else 0
    nps_res = await sync_run_one(f"SELECT AVG(CAST(NOTA_NPS AS REAL)) as nps FROM reunioes {where_clause}", params)
    stats["nps_medio"] = round(float(nps_res["nps"] or 0), 1) if nps_res else "—"
    duracao_res = await sync_run_one(f"SELECT AVG({DURACAO_MIN}) as duracao FROM reunioes {where_clause}", params)
    stats["duracao_media"] = round(float(duracao_res["duracao"] or 0), 1) if duracao_res else "—"
    clientes_res = await sync_run_one(f"SELECT COUNT(DISTINCT CODT) as total FROM reunioes {where_clause}", params)
    stats["total_clientes"] = clientes_res["total"] if clientes_res else 0
    unidades_res = await sync_run_one(f"SELECT COUNT(DISTINCT NOME_UNIDADE) as total FROM reunioes {where_clause}", params)
    stats["total_unidades"] = unidades_res["total"] if unidades_res else 0
    transc_res = await sync_run_one(f"SELECT COUNT(*) as total FROM reunioes WHERE ANON_TRANSCRICAO IS NOT NULL AND ANON_TRANSCRICAO != '' {'AND ' + where_clause.replace('WHERE 1=1 AND ', '').replace('WHERE 1=1', '') if where_clause != 'WHERE 1=1' else ''}", params if where_clause != 'WHERE 1=1' else ())
    stats["total_transcricoes"] = transc_res["total"] if transc_res else 0
    top_ufs = await sync_run_query(f"SELECT UF, COUNT(DISTINCT ID_MEETING) as count FROM reunioes {where_clause} AND UF IS NOT NULL AND UF != '' GROUP BY UF ORDER BY count DESC LIMIT 5", params)
    top_segs = await sync_run_query(f"SELECT NOME_SEGMENTO, COUNT(DISTINCT ID_MEETING) as count FROM reunioes {where_clause} AND NOME_SEGMENTO IS NOT NULL AND NOME_SEGMENTO != '' GROUP BY NOME_SEGMENTO ORDER BY count DESC LIMIT 5", params)
    
    uf_list = [f"{u['UF']}: {u['count']}" for u in top_ufs]
    seg_list = [f"{s['NOME_SEGMENTO']}: {s['count']}" for s in top_segs]

    contexto = f"""Você é um assistente de IA especializado em analisar dados de reuniões da TOTVS.
Responda APENAS com base nos dados fornecidos. Seja direto, informativo e use emojis com moderação.

DADOS ATUAIS:
- Total de reuniões: {stats['total_reunioes']}
- NPS médio: {stats['nps_medio']}/10
- Duração média: {stats['duracao_media']} minutos
- Total de clientes: {stats['total_clientes']}
- Total de unidades: {stats['total_unidades']}
- Total de transcrições: {stats['total_transcricoes']}
- Top estados: {', '.join(uf_list) if uf_list else 'N/A'}
- Top segmentos: {', '.join(seg_list) if seg_list else 'N/A'}

PERGUNTA: {req.question}"""

    api_key = os.getenv("AI_API_KEY", "")
    api_url = os.getenv("AI_API_URL", "https://api.openai.com/v1/chat/completions")
    model = os.getenv("AI_MODEL", "gpt-4o-mini")

    if not api_key:
        return {"answer": "⚠️ IA não configurada. Para ativar, crie um arquivo `.env` com `AI_API_KEY=sua_chave`. Enquanto isso, pergunte sobre reuniões, NPS, estados ou segmentos.", "needs_api_key": True}

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                api_url,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": "Você é um analista de dados especializado em reuniões corporativas. Responda em português brasileiro, de forma clara e objetiva. Use no máximo 3 parágrafos."},
                        {"role": "user", "content": contexto}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 500
                }
            )
            data = resp.json()
            answer = data["choices"][0]["message"]["content"]
            return {"answer": answer}
    except Exception:
        return {"answer": "❌ Erro ao conectar com a IA. Verifique sua chave de API e tente novamente.", "error": True}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)