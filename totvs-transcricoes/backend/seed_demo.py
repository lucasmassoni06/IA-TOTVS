"""
seed_demo.py — Prepara o banco para a demo da aba "Início".

Cria 2 tabelas NOVAS (a tabela `reunioes` NÃO é alterada):
  1. nps_demo : NPS SIMULADO para as reuniões que têm segmento+UF
                (toda linha é marcada com origem='SIMULADO')
  2. agenda   : agenda fictícia de 2 executivos, apontando para reuniões REAIS
                em datas FUTURAS

Rodar:  python seed_demo.py     (idempotente: limpa e recria antes de popular)
"""

import random
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

# ─── Configuração ──────────────────────────────────────────────
DB = Path(__file__).parent / "reunioes.db"

EXECUTIVOS = ["Lucas Andrade", "Marina Costa"]
REUNIOES_POR_EXECUTIVO = 5
DIAS_A_FRENTE = [1, 2, 3, 5, 7, 9, 12, 15]
HORARIOS = ["09:00", "11:00", "14:00", "16:30"]

# Distribuição realista de NPS: maioria satisfeita, minoria crítica
PESOS_NPS = {0: 1, 1: 1, 2: 1, 3: 2, 4: 3, 5: 5,
             6: 7, 7: 12, 8: 18, 9: 25, 10: 25}

# Enviesa levemente alguns segmentos para a demo gerar padrões VISÍVEIS
# (é dado simulado — deixe claro isso na apresentação)
BIAS_SEGMENTO = [-6, -3, 0, 3, 6]
# ───────────────────────────────────────────────────────────────


def proximo_dia_util(base, dias):
    d = base + timedelta(days=dias)
    while d.weekday() >= 5:          # pula sábado e domingo
        d += timedelta(days=1)
    return d


def duracao_em_min(txt):
    """Converte '01:39:13' em minutos. Devolve None se vazio/inválido."""
    try:
        h, m, s = (int(x) for x in txt.split(":"))
        return h * 60 + m
    except Exception:
        return None


def sortear_nota(bias):
    pesos = dict(PESOS_NPS)
    for nota in pesos:
        if bias > 0 and nota >= 8:
            pesos[nota] += bias
        elif bias < 0 and nota <= 6:
            pesos[nota] += -bias
    notas = list(pesos)
    return random.choices(notas, weights=[pesos[n] for n in notas])[0]


def criar_tabelas(conn):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS nps_demo (
            id_meeting   TEXT PRIMARY KEY,
            nota         REAL NOT NULL,
            origem       TEXT NOT NULL DEFAULT 'SIMULADO',
            dt_pesquisa  TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS agenda (
            id_agenda  INTEGER PRIMARY KEY AUTOINCREMENT,
            executivo  TEXT    NOT NULL,
            id_meeting TEXT    NOT NULL,
            inicio     TEXT    NOT NULL,
            fim        TEXT    NOT NULL
        )
    """)
    conn.execute("DELETE FROM nps_demo")
    conn.execute("DELETE FROM agenda")
    conn.commit()


def popular_nps(conn):
    cur = conn.cursor()
    # CORREÇÃO: GROUP BY ID_MEETING -> uma linha por reunião.
    # O ID_MEETING se repete na tabela reunioes (a PK real é a coluna `id`).
    cur.execute("""
        SELECT ID_MEETING, NOME_SEGMENTO, DURACAO_MEETING
        FROM reunioes
        WHERE NOME_SEGMENTO IS NOT NULL AND NOME_SEGMENTO != ''
          AND UF IS NOT NULL AND UF != ''
        GROUP BY ID_MEETING
    """)
    linhas = cur.fetchall()

    # um viés fixo por segmento, para o insight "ver" diferença entre segmentos
    segmentos = sorted({(r["NOME_SEGMENTO"] or "").strip() for r in linhas})
    bias_seg = {s: random.choice(BIAS_SEGMENTO) for s in segmentos}

    hoje = datetime.now().strftime("%Y-%m-%d")
    for r in linhas:
        seg = (r["NOME_SEGMENTO"] or "").strip()
        dur = duracao_em_min(r["DURACAO_MEETING"] or "")

        bias = bias_seg.get(seg, 0)
        if dur is not None:
            if dur >= 60:
                bias += 8            # reunião longa tende a nota melhor
            elif dur >= 40:
                bias += 3
            elif dur < 25:
                bias -= 5

        nota = float(sortear_nota(bias))
        # INSERT OR REPLACE: rede de segurança para rodar o script de novo
        conn.execute(
            "INSERT OR REPLACE INTO nps_demo (id_meeting, nota, origem, dt_pesquisa) "
            "VALUES (?, ?, 'SIMULADO', ?)",
            (r["ID_MEETING"], nota, hoje),
        )

    conn.commit()
    print(f"📊 NPS simulado gerado para {len(linhas)} reuniões "
          f"({len(segmentos)} segmentos)")
    return linhas


def popular_agenda(conn):
    cur = conn.cursor()
    cur.execute("""
        SELECT ID_MEETING, NOME_UNIDADE, NOME_SEGMENTO, UF
        FROM reunioes
        WHERE STATUS_MEETING = 'COMPLETED'
          AND NOME_SEGMENTO IS NOT NULL AND NOME_SEGMENTO != ''
          AND UF IS NOT NULL AND UF != ''
        GROUP BY ID_MEETING
        ORDER BY RANDOM()
    """)
    candidatas = cur.fetchall()

    total = len(EXECUTIVOS) * REUNIOES_POR_EXECUTIVO
    escolhidas, vistos, segmentos_usados = [], set(), set()

    for r in candidatas:                     # 1ª passada: diversifica segmento
        if len(escolhidas) == total:
            break
        if r["ID_MEETING"] in vistos:
            continue
        seg = (r["NOME_SEGMENTO"] or "").strip()
        if seg in segmentos_usados:
            continue
        escolhidas.append(r)
        vistos.add(r["ID_MEETING"])
        segmentos_usados.add(seg)

    for r in candidatas:                     # 2ª passada: completa se faltar
        if len(escolhidas) == total:
            break
        if r["ID_MEETING"] in vistos:
            continue
        escolhidas.append(r)
        vistos.add(r["ID_MEETING"])

    hoje = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    indice = 0
    for executivo in EXECUTIVOS:
        for i in range(REUNIOES_POR_EXECUTIVO):
            if indice >= len(escolhidas):
                break
            r = escolhidas[indice]
            indice += 1

            dia = proximo_dia_util(hoje, DIAS_A_FRENTE[i % len(DIAS_A_FRENTE)])
            hora = HORARIOS[i % len(HORARIOS)]
            inicio = datetime.strptime(f"{dia:%Y-%m-%d} {hora}", "%Y-%m-%d %H:%M")
            fim = inicio + timedelta(minutes=45 if i % 2 == 0 else 60)

            conn.execute(
                "INSERT INTO agenda (executivo, id_meeting, inicio, fim) "
                "VALUES (?, ?, ?, ?)",
                (executivo, r["ID_MEETING"],
                 inicio.isoformat(timespec="minutes"),
                 fim.isoformat(timespec="minutes")),
            )
            print(f"  ✅ {executivo} · {inicio:%d/%m %H:%M} · "
                  f"{r['NOME_UNIDADE']} ({r['NOME_SEGMENTO']} · {r['UF']})")

    conn.commit()
    return indice


def main():
    if not DB.exists():
        raise SystemExit(f"❌ Banco não encontrado em {DB}")

    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row

    print(f"Banco: {DB}\n")
    criar_tabelas(conn)
    popular_nps(conn)
    print()
    n = popular_agenda(conn)

    print(f"\n🎉 Pronto: {n} reuniões na agenda de "
          f"{len(EXECUTIVOS)} executivos.")
    print("   Tabelas criadas: nps_demo (simulado) e agenda (fictícia).")
    conn.close()


if __name__ == "__main__":
    main()