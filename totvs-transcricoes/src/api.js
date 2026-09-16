const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function handle(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Erro ${res.status}`);
  }
  return res.json();
}

export function normalize(m) {
  const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
  return {
    id_meeting: m.id_meeting ?? m.ID_MEETING,
    dt_meeting: m.dt_meeting ?? m.DT_MEETING,
    formato_meeting: m.formato_meeting ?? m.FORMATO_MEETING,
    status_meeting: m.status_meeting ?? m.STATUS_MEETING,
    duracao_minutos: num(m.duracao_minutos ?? m.DURACAO_MINUTOS),
    total_linhas: num(m.total_linhas ?? m.TOTAL_LINHAS),
    nome_unidade: m.nome_unidade ?? m.NOME_UNIDADE,
    uf: m.uf ?? m.UF,
    nome_segmento: m.nome_segmento ?? m.NOME_SEGMENTO,
    faixa_faturamento: m.faixa_faturamento ?? m.FAIXA_FATURAMENTO_CLIENTE_EC,
    nota_nps: num(m.nota_nps ?? m.NOTA_NPS),
  };
}
export async function getHealth() {
  return handle(await fetch(`${API}/health`));
}

export async function getEstatisticas(search = '') {
  const p = new URLSearchParams({ search });
  return handle(await fetch(`${API}/estatisticas/gerais?${p}`));
}

export async function getReunioes({ search = '', page = 1, pageSize = 20 } = {}) {
  const p = new URLSearchParams({ search, page: String(page), page_size: String(pageSize) });
  return handle(await fetch(`${API}/reunioes?${p}`));
}

export async function getAnalises(search = '') {
  const p = new URLSearchParams({ search });
  return handle(await fetch(`${API}/analises/completas?${p}`));
}

export async function getPalavrasChave(q) {
  const p = new URLSearchParams({ q });
  return handle(await fetch(`${API}/analises/palavras-chave?${p}`));
}

export async function askAssistente(question) {
  return handle(await fetch(`${API}/assistente/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  }));
}

export async function getExecutivos() {
  const res = await fetch(`${API}/executivos`);
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return res.json();
}

export async function getAgenda(executivo) {
  const res = await fetch(`${API}/agenda?executivo=${encodeURIComponent(executivo)}`);
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return res.json();
}

export async function getContexto(idMeeting) {
  const res = await fetch(`${API}/contexto/${encodeURIComponent(idMeeting)}`);
  if (!res.ok) throw new Error(`Erro ${res.status} — sem contexto para esta reunião`);
  return res.json();
}