"""
agenda_api.py — Endpoints da aba "Início" (preparação de reunião).

Rotas:
  GET /executivos                 -> executivos disponíveis (seletor que simula o login)
  GET /agenda?executivo=Nome      -> próximas reuniões do executivo
  GET /contexto/{id_meeting}      -> perfil do cliente + fatos + insight da IA

Depende das tabelas criadas por seed_demo.py (agenda, nps_demo).
A tabela `reunioes` NÃO é modificada em nenhum momento.
"""

import os
import sqlite3
from pathlib import Path

import httpx
from fastapi import APIRouter, HTTPException, Query

DB = Path(__file__).parent / "reunioes.db"
router = APIRouter()

MIN_AMOSTRA = 10          # mínimo de reuniões para uma camada ser considerada confiável
MAX_TRECHOS = 4           # quantos trechos de transcrição enviar à IA
TAM_TRECHO = 300          # caracteres por trecho
NOTA_ALTA = 9             # a partir de quanto consideramos "alta performance"


# ─── Infraestrutura ─────────────────────────────────────────────

def _conn():
    """Abre conexão com o banco. Erro claro se o arquivo não existir."""
    if not DB.exists():
        raise HTTPException(500, f"Banco não encontrado em {DB}")
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    return c


def _minutos(txt):
    """Converte '01:39:13' em minutos inteiros. Devolve None se vazio/inválido."""
    try:
        h, m, s = (int(x) for x in (txt or "").split(":"))
        return h * 60 + m
    except Exception:
        return None


def _media(valores):
    """Média de uma lista, ignorando None. None se a lista ficar vazia."""
    vals = [v for v in valores if v is not None]
    return round(sum(vals) / len(vals), 1) if vals else None


def _limpar_texto(t):
    """Remove NUL e aspas soltas das transcrições, e junta as linhas."""
    t = (t or "").replace("\x00", "")
    t = t.strip().strip('"').strip()
    return " ".join(t.split())


# ─── Rotas simples ──────────────────────────────────────────────

@router.get("/executivos")
def listar_executivos():
    """Executivos disponíveis no seletor (simula o login do executivo)."""
    c = _conn()
    try:
        rows = c.execute("""
            SELECT executivo,
                   COUNT(*)   AS total,
                   MIN(inicio) AS proxima
            FROM agenda
            GROUP BY executivo
            ORDER BY proxima
        """).fetchall()
        return {"executivos": [dict(r) for r in rows]}
    finally:
        c.close()


@router.get("/agenda")
def agenda(executivo: str = Query(..., min_length=1)):
    """Próximas reuniões do executivo, já com o resumo do cliente."""
    c = _conn()
    try:
        rows = c.execute("""
            SELECT a.id_agenda,
                   a.executivo,
                   a.id_meeting,
                   a.inicio,
                   a.fim,
                   r.nome_unidade,
                   r.nome_segmento,
                   r.uf,
                   r.formato_meeting,
                   r.cnae,
                   r.faixa,
                   n.nota AS nps_simulado
            FROM agenda a
            LEFT JOIN (
                SELECT ID_MEETING                 AS id_meeting,
                       NOME_UNIDADE               AS nome_unidade,
                       NOME_SEGMENTO              AS nome_segmento,
                       UF                         AS uf,
                       FORMATO_MEETING            AS formato_meeting,
                       CNAE                       AS cnae,
                       FAIXA_FATURAMENTO_CLIENTE_EC AS faixa
                FROM reunioes
                WHERE ID_MEETING IS NOT NULL
                GROUP BY ID_MEETING
            ) r ON r.id_meeting = a.id_meeting
            LEFT JOIN nps_demo n ON n.id_meeting = a.id_meeting
            WHERE a.executivo = ?
            ORDER BY a.inicio
        """, (executivo,)).fetchall()
        return {"executivo": executivo, "reunioes": [dict(r) for r in rows]}
    finally:
        c.close()


# ─── Agregação: camadas de semelhança ───────────────────────────

def _camadas(perfil):
    """
    Camadas de comparação, da mais específica para a mais genérica.
    Só inclui uma camada se os campos necessários estiverem preenchidos.
    """
    seg = (perfil.get("nome_segmento") or "").strip()
    faixa = (perfil.get("faixa") or "").strip()
    uf = (perfil.get("uf") or "").strip()

    camadas = []
    if seg and faixa and uf:
        camadas.append((
            "segmento+faixa+UF",
            "r.NOME_SEGMENTO = ? AND r.FAIXA_FATURAMENTO_CLIENTE_EC = ? AND r.UF = ?",
            [seg, faixa, uf],
        ))
    if seg and faixa:
        camadas.append((
            "segmento+faixa",
            "r.NOME_SEGMENTO = ? AND r.FAIXA_FATURAMENTO_CLIENTE_EC = ?",
            [seg, faixa],
        ))
    if seg and uf:
        camadas.append((
            "segmento+UF",
            "r.NOME_SEGMENTO = ? AND r.UF = ?",
            [seg, uf],
        ))
    if seg:
        camadas.append(("segmento", "r.NOME_SEGMENTO = ?", [seg]))
    if faixa:
        camadas.append(("faixa", "r.FAIXA_FATURAMENTO_CLIENTE_EC = ?", [faixa]))
    if uf:
        camadas.append(("UF", "r.UF = ?", [uf]))
    camadas.append(("global", "1 = 1", []))

    return camadas


def _agregar(c, where, params):
    """Calcula os fatos de um conjunto de reuniões semelhantes."""
    rows = c.execute(f"""
        SELECT r.ID_MEETING,
               r.DURACAO_MEETING,
               r.FORMATO_MEETING,
               n.nota
        FROM reunioes r
        JOIN nps_demo n ON n.id_meeting = r.ID_MEETING
        WHERE r.STATUS_MEETING = 'COMPLETED' AND {where}
        GROUP BY r.ID_MEETING
    """, params).fetchall()

    notas = [r["nota"] for r in rows if r["nota"] is not None]
    duracoes = [_minutos(r["DURACAO_MEETING"]) for r in rows]

    formatos = {}
    for r in rows:
        f = (r["FORMATO_MEETING"] or "").strip() or "não informado"
        formatos[f] = formatos.get(f, 0) + 1

    altas = [n for n in notas if n >= NOTA_ALTA]

    return {
        "amostra": len(rows),
        "media_nps": _media(notas),
        "media_duracao_min": _media(duracoes),
        "alta_performance": len(altas),
        "taxa_alta": round(100 * len(altas) / len(rows)) if rows else 0,
        "formato_top": max(formatos, key=formatos.get) if formatos else None,
        "ids_alta": [r["ID_MEETING"] for r in rows
                     if r["nota"] is not None and r["nota"] >= NOTA_ALTA],
    }


def _trechos(c, where, params):
    """Trechos de transcrições anonimizadas de reuniões com NPS alto."""
    rows = c.execute(f"""
        SELECT r.ANON_TRANSCRICAO AS t
        FROM reunioes r
        JOIN nps_demo n ON n.id_meeting = r.ID_MEETING
        WHERE r.STATUS_MEETING = 'COMPLETED'
          AND n.nota >= {NOTA_ALTA}
          AND {where}
        GROUP BY r.ID_MEETING
        LIMIT {MAX_TRECHOS}
    """, params).fetchall()

    saida = []
    for r in rows:
        t = _limpar_texto(r["t"])
        if len(t) > TAM_TRECHO:
            t = t[:TAM_TRECHO] + "…"
        if t:
            saida.append(t)
    return saida


# ─── Insight ────────────────────────────────────────────────────

def _fatos_para_texto(f):
    """Só os números que a IA e a tela podem usar. Nada inventado."""
    return {
        "amostra": f["amostra"],
        "media_nps": f["media_nps"],
        "media_duracao_min": f["media_duracao_min"],
        "alta_performance": f["alta_performance"],
        "taxa_alta": f["taxa_alta"],
        "formato_top": f["formato_top"],
    }


def _insight_fallback(cliente, f, camada):
    """Texto determinístico: se a IA falhar, a tela nunca fica vazia."""
    dur = f["media_duracao_min"]
    dur_txt = f" e duração média de {dur:.0f} min" if dur else ""
    nps_txt = f"{f['media_nps']}" if f["media_nps"] is not None else "n/d"
    return (
        f"Análise de {f['amostra']} reuniões concluídas com perfil semelhante "
        f"({camada.replace('+', ' + ')}). NPS médio de {nps_txt}{dur_txt}. "
        f"{f['alta_performance']} reuniões ({f['taxa_alta']}%) tiveram NPS igual "
        f"ou superior a {NOTA_ALTA}. Formato predominante: "
        f"{f['formato_top'] or 'não informado'}. Use esta base para orientar a "
        f"abordagem deste cliente."
    )


def _insight_ia(cliente, f, camada, trechos):
    """
    Chama a IA para redigir o insight. Devolve None se não houver chave
    configurada ou se a chamada falhar (o chamador usa o fallback).
    """
    api_key = os.getenv("AI_API_KEY")
    if not api_key:
        return None

    api_url = os.getenv("AI_API_URL", "https://api.openai.com/v1/chat/completions")
    modelo = os.getenv("AI_MODEL", "gpt-4o-mini")

    sistema = (
        "Você é analista de pré-venda da TOTVS e prepara executivos antes de "
        "reuniões com clientes. Use SOMENTE os dados fornecidos — nunca invente "
        "números, nomes de empresas ou de clientes. Responda em português do "
        "Brasil, em três blocos curtos com os títulos exatos: "
        "'Contexto do cliente', 'O que funcionou' e 'Abordagem sugerida'. "
        "Máximo 130 palavras no total. Seja direto: o executivo tem 2 minutos "
        "para ler antes de entrar na reunião."
    )

    dados = (
        f"Perfil do cliente: segmento {cliente.get('nome_segmento')}, "
        f"UF {cliente.get('uf')}, CNAE {cliente.get('cnae')}, "
        f"faixa de faturamento {cliente.get('faixa')}.\n"
        f"Camada de comparação usada: {camada}\n"
        f"Fatos apurados: {_fatos_para_texto(f)}\n"
        f"Trechos de reuniões com NPS alto (anonimizados):\n"
        + "\n---\n".join(trechos or ["(sem trechos disponíveis)"])
    )

    try:
        r = httpx.post(
            api_url,
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": modelo,
                "temperature": 0.3,
                "messages": [
                    {"role": "system", "content": sistema},
                    {"role": "user", "content": dados},
                ],
            },
            timeout=30,
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"].strip()
    except Exception:
        return None


# ─── Rota final ─────────────────────────────────────────────────

@router.get("/contexto/{id_meeting}")
def contexto(id_meeting: str):
    """Perfil do cliente + fatos de reuniões semelhantes + insight."""
    c = _conn()
    try:
        perfil = c.execute("""
            SELECT ID_MEETING,
                   NOME_UNIDADE,
                   NOME_SEGMENTO,
                   UF,
                   CNAE,
                   FAIXA_FATURAMENTO_CLIENTE_EC AS faixa,
                   DURACAO_MEETING,
                   FORMATO_MEETING,
                   DT_MEETING
            FROM reunioes
            WHERE ID_MEETING = ?
            LIMIT 1
        """, (id_meeting,)).fetchone()

        if not perfil:
            raise HTTPException(404, "Reunião não encontrada")
        perfil = dict(perfil)

        # Escolhe a camada mais específica com amostra suficiente.
        # Se nenhuma atingir o mínimo, usa a de maior amostra.
        melhor, melhor_n = None, -1
        for nome, where, params in _camadas(perfil):
            f = _agregar(c, where, params)
            if f["amostra"] >= MIN_AMOSTRA:
                melhor, melhor_n = (nome, where, params, f), f["amostra"]
                break
            if f["amostra"] > melhor_n:
                melhor, melhor_n = (nome, where, params, f), f["amostra"]

        if melhor is None or melhor[3]["amostra"] == 0:
            raise HTTPException(404, "Sem base de comparação no banco")

        camada, where, params, fatos = melhor
        trechos = _trechos(c, where, params)
    finally:
        c.close()

    insight = _insight_ia(perfil, fatos, camada, trechos)
    origem = "ia"
    if not insight:
        insight = _insight_fallback(perfil, fatos, camada)
        origem = "fallback"

    return {
        "cliente": perfil,
        "fatos": {**_fatos_para_texto(fatos), "camada": camada},
        "insight": insight,
        "insight_origem": origem,
        "trechos_usados": len(trechos),
        "aviso": "Notas de NPS simuladas para demonstração (origem='SIMULADO').",
    }