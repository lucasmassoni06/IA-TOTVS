from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import asyncio
from typing import List, Dict, Any, Optional

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

    return {
        "data": data,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }

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
async def estatisticas_gerais():
    stats = {}

    # total_reunioes
    total_reunioes_res = await sync_run_one("SELECT COUNT(DISTINCT ID_MEETING) as total_reunioes FROM reunioes")
    stats["total_reunioes"] = total_reunioes_res["total_reunioes"] if total_reunioes_res else 0

    # total_transcricoes
    total_trans_res = await sync_run_one("SELECT COUNT(*) as total FROM reunioes WHERE ANON_TRANSCRICAO IS NOT NULL AND ANON_TRANSCRICAO != ''")
    stats["total_transcricoes"] = total_trans_res["total"] if total_trans_res else 0

    # duracao_media_minutos
    duracao_media_res = await sync_run_one(f"SELECT AVG({DURACAO_MIN}) as duracao_media_minutos FROM reunioes")
    stats["duracao_media_minutos"] = float(duracao_media_res["duracao_media_minutos"] or 0)

    # total_clientes
    clientes_res = await sync_run_one("SELECT COUNT(DISTINCT CODT) as total_clientes FROM reunioes")
    stats["total_clientes"] = clientes_res["total_clientes"] if clientes_res else 0

    # reunioes_por_formato
    stats["reunioes_por_formato"] = await sync_run_query("SELECT FORMATO_MEETING, COUNT(DISTINCT ID_MEETING) as count FROM reunioes GROUP BY FORMATO_MEETING")

    # reunioes_por_status
    stats["reunioes_por_status"] = await sync_run_query("SELECT STATUS_MEETING, COUNT(DISTINCT ID_MEETING) as count FROM reunioes GROUP BY STATUS_MEETING")

    # reunioes_por_mes (últimos 12 meses approx)
    stats["reunioes_por_mes"] = await sync_run_query("SELECT substr(DT_MEETING,1,7) as mes, COUNT(DISTINCT ID_MEETING) as count FROM reunioes GROUP BY mes ORDER BY mes DESC LIMIT 12")

    # nps_medio
    nps_res = await sync_run_one("SELECT AVG(NOTA_NPS) as nps_medio FROM reunioes")
    stats["nps_medio"] = float(nps_res["nps_medio"] or 0)

    # reunioes_por_uf
    stats["reunioes_por_uf"] = await sync_run_query("SELECT UF, COUNT(DISTINCT ID_MEETING) as count FROM reunioes WHERE UF IS NOT NULL GROUP BY UF ORDER BY count DESC")

    # total_unidades
    unidades_res = await sync_run_one("SELECT COUNT(DISTINCT NOME_UNIDADE) as total_unidades FROM reunioes")
    stats["total_unidades"] = unidades_res["total_unidades"] if unidades_res else 0

    # segmentos_mais_comuns
    stats["segmentos_mais_comuns"] = await sync_run_query("SELECT NOME_SEGMENTO, COUNT(DISTINCT ID_MEETING) as count FROM reunioes GROUP BY NOME_SEGMENTO ORDER BY count DESC LIMIT 10")

    # faixa_faturamento_count
    stats["faixa_faturamento_count"] = await sync_run_query("SELECT FAIXA_FATURAMENTO_CLIENTE_EC as faixa, COUNT(DISTINCT ID_MEETING) as count FROM reunioes GROUP BY FAIXA_FATURAMENTO_CLIENTE_EC")

    return stats

@app.get("/estatisticas/reuniao/{id_meeting}")
async def estatisticas_reuniao(id_meeting: str):
    query = f"""
        SELECT SUM({DURACAO_MIN}) as duracao_total_minutos,
               COUNT(CASE WHEN ANON_TRANSCRICAO IS NOT NULL AND ANON_TRANSCRICAO != '' THEN 1 END) as qtd_transcricoes,
               AVG(CASE WHEN ANON_TRANSCRICAO IS NOT NULL AND ANON_TRANSCRICAO != '' THEN {WORDS_COUNT} END) as media_palavras,
               MAX(FORMATO_MEETING) as formato,
               MAX(STATUS_MEETING) as status,
               AVG(NOTA_NPS) as nota_nps,
               MAX(UF) as uf,
               MAX(NOME_UNIDADE) as nome_unidade,
               MAX(NOME_SEGMENTO) as nome_segmento
        FROM reunioes
        WHERE ID_MEETING = ?
    """
    res = await sync_run_one(query, (id_meeting,))
    if not res:
        raise HTTPException(status_code=404, detail="Reunião não encontrada")
    # Convert to float where appropriate
    res["duracao_total_minutos"] = float(res["duracao_total_minutos"] or 0)
    res["media_palavras"] = float(res["media_palavras"] or 0)
    res["nota_nps"] = float(res["nota_nps"] or 0)
    return res

@app.get("/analises/palavras-chave")
async def analises_palavras_chave(q: str = Query(...)):
    q = q.strip()
    if not q:
        return []
    termo_upper = q.upper()
    termo_like = f"%{termo_upper}%"
    
    query = """
        SELECT 
            ID_MEETING,
            DT_MEETING as dt_meeting,
            NOME_UNIDADE as nome_unidade,
            SUBSTR(
                ANON_TRANSCRICAO,
                MAX(1, INSTR(UPPER(ANON_TRANSCRICAO), ?) - 60),
                150
            ) as trecho
        FROM reunioes
        WHERE UPPER(ANON_TRANSCRICAO) LIKE ?
        ORDER BY DT_MEETING DESC
        LIMIT 50
    """
    return await sync_run_query(query, (termo_upper, termo_like))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)