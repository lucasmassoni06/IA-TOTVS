from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import asyncio
import re
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DURACAO_MIN = "CASE WHEN DURACAO_MEETING IS NULL OR DURACAO_MEETING = '' THEN 0.0 ELSE CAST(strftime('%s', '1970-01-01 ' || DURACAO_MEETING) AS REAL) / 60.0 END"

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

class AssistenteRequest(BaseModel):
    question: str

class FimChatRequest(BaseModel):
    meeting_id: str

class PalavrasChaveRequest(BaseModel):
    meeting_id: str

@app.post("/assistente/ask")
async def assistente_ask(req: AssistenteRequest):
    q = req.question.lower().strip()
    print(f"\n===== PERGUNTA: {req.question} =====")

    # ===== 1. CONSULTA TODOS OS DADOS SEM FILTRO =====
    
    # Total de reuniões por estado (TODOS)
    reunioes_por_estado = await sync_run_query("""
        SELECT UF, COUNT(DISTINCT ID_MEETING) as total
        FROM reunioes
        WHERE UF IS NOT NULL AND UF != ''
        GROUP BY UF
        ORDER BY total DESC
    """, ())
    
    # Total de reuniões por segmento (TODOS)
    reunioes_por_segmento = await sync_run_query("""
        SELECT NOME_SEGMENTO, COUNT(DISTINCT ID_MEETING) as total
        FROM reunioes
        WHERE NOME_SEGMENTO IS NOT NULL AND NOME_SEGMENTO != ''
        GROUP BY NOME_SEGMENTO
        ORDER BY total DESC
    """, ())
    
    # Top 5 reuniões mais longas (sem filtro de estado)
    mais_longas = await sync_run_query(f"""
        SELECT ID_MEETING, MAX(DT_MEETING) as dt, NOME_UNIDADE, UF,
               ROUND({DURACAO_MIN}, 1) as dur
        FROM reunioes WHERE {DURACAO_MIN} > 0
        GROUP BY ID_MEETING ORDER BY dur DESC LIMIT 5
    """, ())

    # Estatísticas gerais
    total_reunioes = (await sync_run_one("SELECT COUNT(DISTINCT ID_MEETING) as total FROM reunioes", ()))["total"]
    nps_medio = round(float((await sync_run_one("SELECT AVG(CAST(NOTA_NPS AS REAL)) as n FROM reunioes", ()))["n"] or 0), 1)
    dur_media = round(float((await sync_run_one(f"SELECT AVG({DURACAO_MIN}) as d FROM reunioes", ()))["d"] or 0), 1)

    # ===== 2. DETECTA INTENÇÃO =====
    uf_map = {
        "são paulo": "SP", "sp": "SP", "sao paulo": "SP",
        "rio de janeiro": "RJ", "rj": "RJ",
        "minas gerais": "MG", "mg": "MG",
        "bahia": "BA", "ba": "BA",
        "paraná": "PR", "pr": "PR", "parana": "PR",
        "rio grande do sul": "RS", "rs": "RS",
        "santa catarina": "SC", "sc": "SC",
        "pernambuco": "PE", "pe": "PE",
        "ceará": "CE", "ce": "CE", "ceara": "CE",
        "distrito federal": "DF", "df": "DF", "brasília": "DF", "brasilia": "DF",
        "goiás": "GO", "go": "GO", "goias": "GO",
        "amazonas": "AM", "am": "AM",
        "pará": "PA", "pa": "PA", "para": "PA",
        "espírito santo": "ES", "es": "ES", "espirito santo": "ES",
    }

    uf_encontrada = None
    for nome, sigla in uf_map.items():
        if nome in q:
            uf_encontrada = sigla
            break

    # ===== 3. MONTA CONTEXTO COMPLETO =====
    # Estados formatados
    estados_str = "\n".join([f"  • {e['UF']}: {e['total']} reuniões" for e in reunioes_por_estado])
    
    # Segmentos formatados
    segmentos_str = "\n".join([f"  • {s['NOME_SEGMENTO']}: {s['total']} reuniões" for s in reunioes_por_segmento[:10]])
    
    # Reuniões mais longas
    longas_str = "\n".join([f"  • {r['ID_MEETING']} | {r['NOME_UNIDADE']} ({r['UF']}) | {r['dur']} min" for r in mais_longas])

    dados_completos = f"""DADOS GLOBAIS (TODOS OS ESTADOS):
• Total de reuniões: {total_reunioes}
• NPS médio: {nps_medio}/10  
• Duração média: {dur_media} min

REUNIÕES POR ESTADO:
{estados_str}

PRINCIPAIS SEGMENTOS:
{segmentos_str}

REUNIÕES MAIS LONGAS:
{longas_str if longas_str else "Nenhuma"}

INSTRUÇÃO: Responda APENAS com base nos dados acima. Os dados de TODOS os estados estão disponíveis."""

    # ===== SE PEDIU ESTADO ESPECÍFICO, ADICIONA FILTRO =====
    if uf_encontrada:
        total_uf = (await sync_run_one("SELECT COUNT(DISTINCT ID_MEETING) as t FROM reunioes WHERE UF = ?", (uf_encontrada,)))["t"]
        nps_uf = await sync_run_one("SELECT AVG(CAST(NOTA_NPS AS REAL)) as n FROM reunioes WHERE UF = ?", (uf_encontrada,))
        nps_uf_val = round(float(nps_uf["n"] or 0), 1) if nps_uf and nps_uf["n"] else 0
        nome_estado = [k for k, v in uf_map.items() if v == uf_encontrada][0].title()
        
        # Reuniões mais longas desse estado
        longas_uf = await sync_run_query(f"""
            SELECT ID_MEETING, MAX(DT_MEETING) as dt, NOME_UNIDADE,
                   ROUND({DURACAO_MIN}, 1) as dur
            FROM reunioes WHERE {DURACAO_MIN} > 0 AND UF = ?
            GROUP BY ID_MEETING ORDER BY dur DESC LIMIT 3
        """, (uf_encontrada,))

        dados_completos += f"""

DADOS ESPECÍFICOS DE {nome_estado.upper()} ({uf_encontrada}):
• Total: {total_uf} reuniões
• NPS: {nps_uf_val}/10
• Representa {round(total_uf/total_reunioes*100, 1)}% do total"""

        if longas_uf:
            dados_completos += "\n• Reuniões mais longas em " + nome_estado + ":"
            for r in longas_uf:
                dados_completos += f"\n  - {r['ID_MEETING']} | {r['NOME_UNIDADE']} | {r['dur']} min"

    # ===== 4. CHAMA A IA =====
    api_key = os.getenv("AI_API_KEY", "")
    api_url = os.getenv("AI_API_URL", "")

    if api_key and api_url:
        model = os.getenv("AI_MODEL", "llama3.2:3b")
        
        prompt = f"""{dados_completos}

PERGUNTA: {req.question}

REGRAS:
1. Responda apenas com os dados fornecidos acima
2. NÃO diga que não tem dados — todos os dados estão aqui
3. Seja direto e específico, cite números e nomes"""

        try:
            async with httpx.AsyncClient(timeout=60) as client:
                payload = {
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.2,
                    "max_tokens": 500,
                    "stream": False
                }
                resp = await client.post(api_url, json=payload, headers={"Content-Type": "application/json"})
                
                if resp.status_code == 200:
                    data = resp.json()
                    if "choices" in data:
                        return {"answer": data["choices"][0]["message"]["content"]}
                    elif "response" in data:
                        return {"answer": data["response"]}
        except Exception as e:
            print(f"ERRO: {e}")

    # Fallback direto sem IA
    return {"answer": f"📊 Dados de **todos os estados:**\n{estados_str}\n\nTotal geral: {total_reunioes} reuniões | NPS: {nps_medio}/10"}

if __name__ == "__main__":
    import uvicorn
    print("🚀 Servidor TOTVS Transcrições rodando!")
    uvicorn.run(app, host="0.0.0.0", port=8000)