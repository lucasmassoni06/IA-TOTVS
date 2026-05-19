import React, { useState, useEffect } from 'react';
import './App.css';
import Layout from './components/Layout';

const API = 'http://localhost:8000';

function normalize(m) {
  return {
    id_meeting: m.id_meeting || m.ID_MEETING,
    dt_meeting: m.dt_meeting || m.DT_MEETING,
    formato_meeting: m.formato_meeting || m.FORMATO_MEETING,
    status_meeting: m.status_meeting || m.STATUS_MEETING,
    duracao_minutos: m.duracao_minutos || m.DURACAO_MINUTOS,
    nome_unidade: m.nome_unidade || m.NOME_UNIDADE,
    uf: m.uf || m.UF,
    nome_segmento: m.nome_segmento || m.NOME_SEGMENTO,
    faixa_faturamento: m.faixa_faturamento || m.FAIXA_FATURAMENTO,
    nota_nps: m.nota_nps || m.NOTA_NPS,
    total_linhas: m.total_linhas || m.TOTAL_LINHAS,
    ANON_TRANSCRICAO: m.ANON_TRANSCRICAO,
    transcricao_completa: m.transcricao_completa || m.TRANSCRICAO_COMPLETA,
  };
}

// ===== COMPONENTES SVG =====
const PieChart = ({ data, size = 180, donut = false }) => {
  if (!data || data.length === 0 || data.every(d => !d.count)) return null;
  const total = data.reduce((s, d) => s + (d.count || 0), 0);
  if (total === 0) return null;
  const colors = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#6366f1','#f97316','#84cc16'];
  const cx = size / 2, cy = size / 2, radius = size * 0.4, innerR = donut ? radius * 0.55 : 0;
  const polar = (a, r) => ({ x: cx + r * Math.cos((a - 90) * Math.PI / 180), y: cy + r * Math.sin((a - 90) * Math.PI / 180) });
  let cur = 0;
  const slices = data.filter(d => d.count).map((d, i) => {
    const ang = (d.count / total) * 360;
    const s = polar(cur, radius), e = polar(cur + ang, radius);
    const s2 = polar(cur + ang, innerR), e2 = polar(cur, innerR);
    const la = ang > 180 ? 1 : 0;
    const path = donut
      ? `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${la} 1 ${e.x} ${e.y} L ${s2.x} ${s2.y} A ${innerR} ${innerR} 0 ${la} 0 ${e2.x} ${e2.y} Z`
      : `M ${cx} ${cy} L ${s.x} ${s.y} A ${radius} ${radius} 0 ${la} 1 ${e.x} ${e.y} Z`;
    cur += ang;
    return <path key={i} d={path} fill={colors[i % colors.length]} stroke="white" strokeWidth="1.5" />;
  });
  cur = 0;
  const labels = data.filter(d => d.count).map((d, i) => {
    const ang = (d.count / total) * 360;
    const mid = cur + ang / 2;
    const p = polar(mid, radius * 0.65);
    const pct = ((d.count / total) * 100).toFixed(1);
    cur += ang;
    return (
      <g key={`l-${i}`}>
        <text x={p.x} y={p.y - 5} textAnchor="middle" fontSize="10" fontWeight="600" fill="white">{pct}%</text>
        <text x={p.x} y={p.y + 7} textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.8)">{d.categoria || d.FORMATO_MEETING || d.STATUS_MEETING || ''}</text>
      </g>
    );
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices}{labels.length <= 6 && labels}
    </svg>
  );
};

const LineChart = ({ data, height = 200 }) => {
  if (!data || data.length < 2) return null;
  const maxVal = Math.max(...data.map(d => d.count || 0));
  if (maxVal === 0) return null;
  const pad = { top: 20, right: 16, bottom: 32, left: 44 };
  const svgW = 420, svgH = height;
  const cw = svgW - pad.left - pad.right, ch = svgH - pad.top - pad.bottom;
  const toX = i => pad.left + (i / (data.length - 1)) * cw;
  const toY = v => pad.top + ch - (v / maxVal) * ch;
  const pts = data.map((d, i) => `${toX(i)},${toY(d.count)}`).join(' ');
  const grid = [0, 0.25, 0.5, 0.75, 1].map(r => {
    const y = pad.top + ch - r * ch;
    return <line key={r} x1={pad.left} y1={y} x2={svgW - pad.right} y2={y} stroke="#f1f5f9" strokeWidth="1" />;
  });
  const yLabs = [0, 0.25, 0.5, 0.75, 1].map(r => {
    const y = pad.top + ch - r * ch;
    return <text key={`yl-${r}`} x={pad.left - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#94a3b8">{Math.round(maxVal * r)}</text>;
  });
  const xLabs = data.map((d, i) => (
    <text key={`xl-${i}`} x={toX(i)} y={svgH - 6} textAnchor="middle" fontSize="10" fill="#94a3b8">{d.mes ? d.mes.substring(5) : ''}</text>
  ));
  const dots = data.map((d, i) => <circle key={`dt-${i}`} cx={toX(i)} cy={toY(d.count)} r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />);
  const area = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(d.count)}`).join(' ') + ` L ${toX(data.length-1)} ${pad.top+ch} L ${toX(0)} ${pad.top+ch} Z`;
  return (
    <svg width="100%" height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
      {grid}{yLabs}<path d={area} fill="rgba(59,130,246,0.08)" />
      <polyline points={pts} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {dots}{xLabs}
    </svg>
  );
};

function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [meetings, setMeetings] = useState([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [selectedLinhas, setSelectedLinhas] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [transcricaoQuery, setTranscricaoQuery] = useState('');
  const [transcricaoResults, setTranscricaoResults] = useState([]);
  const [transcricaoLoading, setTranscricaoLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [analisesData, setAnalisesData] = useState(null);
  const [analisesLoading, setAnalisesLoading] = useState(false);

  // Stats (agora com filtro)
  useEffect(() => {
    setStatsLoading(true);
    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    fetch(`${API}/estatisticas/gerais?${params}`)
      .then(r => r.json())
      .then(d => { setStats(d || {}); setStatsLoading(false); })
      .catch(() => setStatsLoading(false));
  }, [searchTerm]);

  // Meetings
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: '1', page_size: '2000' });
    if (searchTerm) params.append('search', searchTerm);
    fetch(`${API}/reunioes?${params}`)
      .then(r => r.json())
      .then(r => { const data = (r.data || []).map(normalize); setMeetings(data); setLoading(false); })
      .catch(() => { setMeetings([]); setLoading(false); });
    setSelectedMeetingId(null);
    setSelectedMeeting(null);
    setSelectedLinhas([]);
  }, [searchTerm]);

  // Detalhe da reunião
  useEffect(() => {
    if (!selectedMeetingId) { setSelectedMeeting(null); setSelectedLinhas([]); return; }
    fetch(`${API}/reunioes/${selectedMeetingId}`)
      .then(r => r.json())
      .then(r => {
        const resumo = normalize(r.resumo || r);
        const linhas = (r.linhas || []).map(l => ({ ANON_TRANSCRICAO: l.ANON_TRANSCRICAO || l.anon_transcricao || '' }));
        setSelectedMeeting(resumo);
        setSelectedLinhas(linhas);
      })
      .catch(() => { setSelectedMeeting(null); setSelectedLinhas([]); });
  }, [selectedMeetingId]);

  // Busca transcrições
  useEffect(() => {
    if (!transcricaoQuery || transcricaoQuery.trim() === '') { setTranscricaoResults([]); return; }
    const timer = setTimeout(() => {
      setTranscricaoLoading(true);
      fetch(`${API}/analises/palavras-chave?q=${encodeURIComponent(transcricaoQuery.trim())}`)
        .then(r => r.json())
        .then(data => { setTranscricaoResults(Array.isArray(data) ? data : (data.data || [])); setTranscricaoLoading(false); })
        .catch(() => { setTranscricaoResults([]); setTranscricaoLoading(false); });
    }, 400);
    return () => clearTimeout(timer);
  }, [transcricaoQuery]);

  // Análises aprofundadas
  useEffect(() => {
    setAnalisesLoading(true);
    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    fetch(`${API}/analises/completas?${params}`)
      .then(r => r.json())
      .then(d => { setAnalisesData(d || {}); setAnalisesLoading(false); })
      .catch(() => { setAnalisesData({}); setAnalisesLoading(false); });
  }, [searchTerm]);

  const safeMax = (arr) => {
    if (!arr || !Array.isArray(arr) || arr.length === 0) return 1;
    const m = Math.max(...arr.map(x => x.count || 0));
    return m > 0 ? m : 1;
  };

  const displayStats = stats;

  const renderDashboard = () => (
    <div className="dashboard">
      {searchTerm && (
        <div className="filter-badge">
          🔍 Filtrando por: <strong>"{searchTerm}"</strong>
          <span className="filter-result-count">{stats.total_reunioes || 0} resultados</span>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card"><span className="stat-icon">🎯</span><span className="stat-value">{stats.total_reunioes || 0}</span><span className="stat-label">Reuniões</span></div>
        <div className="stat-card"><span className="stat-icon">⏱️</span><span className="stat-value">{(stats.duracao_media_minutos || 0).toFixed(1)}</span><span className="stat-label">Duração Média (min)</span></div>
        <div className="stat-card"><span className="stat-icon">👥</span><span className="stat-value">{stats.total_clientes || '—'}</span><span className="stat-label">Clientes</span></div>
        <div className="stat-card"><span className="stat-icon">🏢</span><span className="stat-value">{stats.total_unidades || '—'}</span><span className="stat-label">Unidades</span></div>
        <div className="stat-card"><span className="stat-icon">⭐</span><span className="stat-value">{stats.nps_medio ? Number(stats.nps_medio).toFixed(1) : '—'}</span><span className="stat-label">NPS Médio</span></div>
        <div className="stat-card"><span className="stat-icon">📝</span><span className="stat-value">{stats.total_transcricoes || 0}</span><span className="stat-label">Transcrições</span></div>
      </div>

      {!statsLoading && (
        <div className="charts-grid">
          <div className="chart-card chart-card-wide">
            <h3>📈 Reuniões por Mês</h3>
            <LineChart data={(stats.reunioes_por_mes || []).reverse()} height={200} />
          </div>

          <div className="chart-card chart-card-center">
            <h3>⭐ Distribuição NPS</h3>
            <PieChart data={stats.distribuicao_nps || []} size={200} />
            <div className="pie-legend">
              {(stats.distribuicao_nps || []).map((item, i) => {
                const c = ['#3b82f6','#10b981','#f59e0b','#ef4444'];
                return item.categoria ? (
                  <div key={i} className="legend-item"><span className="legend-dot" style={{background:c[i]}}/><span className="legend-label">{item.categoria}</span><span className="legend-value">{item.count}</span></div>
                ) : null;
              })}
            </div>
          </div>

          <div className="chart-card chart-card-center">
            <h3>📹 Por Formato</h3>
            <PieChart data={stats.reunioes_por_formato || []} size={200} donut />
            <div className="pie-legend">
              {(stats.reunioes_por_formato || []).map((item, i) => {
                const c = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6'];
                return item.FORMATO_MEETING ? (
                  <div key={i} className="legend-item"><span className="legend-dot" style={{background:c[i]}}/><span className="legend-label">{item.FORMATO_MEETING}</span><span className="legend-value">{item.count}</span></div>
                ) : null;
              })}
            </div>
          </div>

          <div className="chart-card chart-card-center">
            <h3>✅ Por Status</h3>
            <PieChart data={stats.reunioes_por_status || []} size={200} donut />
            <div className="pie-legend">
              {(stats.reunioes_por_status || []).map((item, i) => {
                const c = ['#10b981','#ef4444','#f59e0b','#3b82f6','#8b5cf6'];
                return item.STATUS_MEETING ? (
                  <div key={i} className="legend-item"><span className="legend-dot" style={{background:c[i]}}/><span className="legend-label">{item.STATUS_MEETING}</span><span className="legend-value">{item.count}</span></div>
                ) : null;
              })}
            </div>
          </div>

          <div className="chart-card">
            <h3>🗺️ Reuniões por Estado</h3>
            <div className="bar-list">{(stats.reunioes_por_uf || []).slice(0, 12).map((item, i) => (
              <div key={i} className="bar-row"><span className="bar-label">{item.UF || '—'}</span><div className="bar-track"><div className="bar-fill" style={{width:`${(item.count/safeMax(stats.reunioes_por_uf))*100}%`}}/></div><span className="bar-count">{item.count}</span></div>
            ))}</div>
          </div>

          <div className="chart-card">
            <h3>🏭 Segmentos</h3>
            <div className="bar-list">{(stats.segmentos_mais_comuns || []).map((item, i) => (
              <div key={i} className="bar-row"><span className="bar-label">{item.NOME_SEGMENTO || '—'}</span><div className="bar-track"><div className="bar-fill purple" style={{width:`${(item.count/safeMax(stats.segmentos_mais_comuns))*100}%`}}/></div><span className="bar-count">{item.count}</span></div>
            ))}</div>
          </div>

          <div className="chart-card">
            <h3>💰 Faixa de Faturamento</h3>
            <div className="bar-list">{(stats.faixa_faturamento_count || []).slice(0, 8).map((item, i) => (
              <div key={i} className="bar-row"><span className="bar-label small">{item.faixa || '—'}</span><div className="bar-track"><div className="bar-fill green" style={{width:`${(item.count/safeMax(stats.faixa_faturamento_count))*100}%`}}/></div><span className="bar-count">{item.count}</span></div>
            ))}</div>
          </div>
        </div>
      )}
    </div>
  );

  const renderReunioes = () => {
    if (!selectedMeeting) {
      return (
        <div className="page-reunioes">
          <h2 className="page-title">👥 Reuniões</h2>
          <p className="page-subtitle">{meetings.length} reuniões encontradas{searchTerm ? ` para "${searchTerm}"` : ''} — clique em uma linha para ver os detalhes</p>
          <div className="meetings-table-wrapper">
            <table className="meetings-table">
              <thead><tr><th>ID</th><th>Data</th><th>Formato</th><th>Status</th><th>Duração</th><th>UF</th><th>Unidade</th><th>Segmento</th><th>NPS</th></tr></thead>
              <tbody>{meetings.map(m => (
                <tr key={m.id_meeting} onClick={() => setSelectedMeetingId(m.id_meeting)} className="clickable-row">
                  <td className="cell-id">{m.id_meeting}</td>
                  <td>{m.dt_meeting ? new Date(m.dt_meeting).toLocaleDateString('pt-BR') : '—'}</td>
                  <td><span className="badge badge-formato">{m.formato_meeting || '—'}</span></td>
                  <td><span className="badge badge-status">{m.status_meeting || '—'}</span></td>
                  <td className="cell-num">{m.duracao_minutos ? `${m.duracao_minutos.toFixed(1)} min` : '—'}</td>
                  <td>{m.uf || '—'}</td>
                  <td>{m.nome_unidade || '—'}</td>
                  <td>{m.nome_segmento || '—'}</td>
                  <td className="cell-num">{m.nota_nps ? m.nota_nps.toFixed(1) : '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      );
    }
    return (
      <div className="page-reunioes">
        <button className="back-btn" onClick={() => setSelectedMeetingId(null)}>← Voltar para lista</button>
        <div className="meeting-detail">
          <h2>📋 {selectedMeeting.nome_unidade || `Reunião ${selectedMeeting.id_meeting}`}</h2>
          <div className="detail-grid">
            <div className="detail-item"><strong>ID:</strong> {selectedMeeting.id_meeting}</div>
            <div className="detail-item"><strong>Data:</strong> {selectedMeeting.dt_meeting ? new Date(selectedMeeting.dt_meeting).toLocaleDateString('pt-BR') : '—'}</div>
            <div className="detail-item"><strong>Hora:</strong> {selectedMeeting.dt_meeting ? new Date(selectedMeeting.dt_meeting).toLocaleTimeString('pt-BR') : '—'}</div>
            <div className="detail-item"><strong>Formato:</strong> {selectedMeeting.formato_meeting || '—'}</div>
            <div className="detail-item"><strong>Status:</strong> {selectedMeeting.status_meeting || '—'}</div>
            <div className="detail-item"><strong>Duração:</strong> {selectedMeeting.duracao_minutos ? `${selectedMeeting.duracao_minutos.toFixed(1)} min` : '—'}</div>
            <div className="detail-item"><strong>UF:</strong> {selectedMeeting.uf || '—'}</div>
            <div className="detail-item"><strong>Unidade:</strong> {selectedMeeting.nome_unidade || '—'}</div>
            <div className="detail-item"><strong>Segmento:</strong> {selectedMeeting.nome_segmento || 'Não informado'}</div>
            <div className="detail-item"><strong>NPS:</strong> {selectedMeeting.nota_nps ? selectedMeeting.nota_nps.toFixed(1) : '—'}</div>
          </div>
          {selectedLinhas.length > 0 && (
            <div className="transcricoes">
              <h3>📝 Linhas Individuais da Transcrição ({selectedLinhas.length} falas)</h3>
              <div className="transcricao-linhas">
                {selectedLinhas.flatMap((l, idx) => {
                  const texto = l.ANON_TRANSCRICAO || '';
                  const falas = texto.split(/(?=\[LOCUTOR \d+\]:|\[LOCAL\]:|\[PESSOA\]:|\[EMPRESA\]:)/g);
                  return falas.filter(f => f.trim()).map((fala, i) => (
                    <div key={`${idx}-${i}`} className="transcricao-item">{fala.trim()}</div>
                  ));
                })}
              </div>
              {selectedMeeting.transcricao_completa && (
                <details style={{ marginTop: 20 }}>
                  <summary className="transcricao-summary">📄 Ver texto completo da transcrição</summary>
                  <div className="transcricao-completa">{selectedMeeting.transcricao_completa}</div>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTranscricoes = () => (
    <div className="page-transcricoes">
      <h2 className="page-title">📝 Transcrições</h2>
      <p className="page-subtitle">Busque por palavras-chave nas transcrições das reuniões</p>
      <div className="transcricao-search">
        <span className="transcricao-search-icon">🔍</span>
        <input type="text" className="transcricao-search-input" placeholder="Digite uma palavra-chave..." value={transcricaoQuery} onChange={e => setTranscricaoQuery(e.target.value)} />
        {transcricaoQuery && <button className="transcricao-search-clear" onClick={() => setTranscricaoQuery('')}>✕</button>}
      </div>
      {transcricaoQuery ? (
        <>
          <div className="transcricao-stats">
            <div className="transcricao-stat-card"><span className="transcricao-stat-value">{transcricaoResults.length}</span><span className="transcricao-stat-label">Reuniões encontradas</span></div>
            <div className="transcricao-stat-card"><span className="transcricao-stat-value">"{transcricaoQuery}"</span><span className="transcricao-stat-label">Termo buscado</span></div>
          </div>
          {transcricaoLoading ? <div className="loading">Buscando...</div>
            : transcricaoResults.length === 0 ? <div className="empty-state">Nenhuma transcrição encontrada para "{transcricaoQuery}"</div>
            : <div className="transcricao-results">{transcricaoResults.map((item, i) => (
                <div key={i} className="transcricao-result-card" onClick={() => { setSelectedMeetingId(item.ID_MEETING); setActivePage('reunioes'); }}>
                  <div className="transcricao-result-header">
                    <span className="transcricao-result-id">#{item.ID_MEETING}</span>
                    <span className="transcricao-result-date">{item.dt_meeting ? new Date(item.dt_meeting).toLocaleDateString('pt-BR') : '—'}</span>
                    <span className="transcricao-result-unidade">{item.nome_unidade || '—'}</span>
                  </div>
                  <div className="transcricao-result-trecho">{item.trecho || '(trecho)'}</div>
                </div>
              ))}</div>
          }
        </>
      ) : (
        <div className="empty-state">🔍 Digite uma palavra-chave para buscar nas transcrições</div>
      )}
    </div>
  );

  const renderAnalises = () => {
    if (analisesLoading) return <div className="loading">Carregando análises...</div>;
    if (!analisesData || !analisesData.metricas) return <div className="empty-state">Nenhum dado disponível</div>;

    const m = analisesData.metricas;

    return (
      <div className="page-analises">
        <h2 className="page-title">📈 Análises Aprofundadas</h2>
        <p className="page-subtitle">
          {searchTerm ? `Resultados filtrados para "${searchTerm}"` : 'Todos os dados disponíveis'}
        </p>

        <div className="analises-stats-grid">
          <div className="analise-stat-card blue"><span className="analise-stat-icon">📊</span><span className="analise-stat-value">{m.total_reunioes || 0}</span><span className="analise-stat-label">Reuniões</span></div>
          <div className="analise-stat-card green"><span className="analise-stat-icon">⏱️</span><span className="analise-stat-value">{m.duracao_media || '—'}</span><span className="analise-stat-label">Duração Média (min)</span></div>
          <div className="analise-stat-card purple"><span className="analise-stat-icon">👥</span><span className="analise-stat-value">{m.total_clientes || 0}</span><span className="analise-stat-label">Clientes</span></div>
          <div className="analise-stat-card orange"><span className="analise-stat-icon">🏢</span><span className="analise-stat-value">{m.total_unidades || 0}</span><span className="analise-stat-label">Unidades</span></div>
          <div className="analise-stat-card pink"><span className="analise-stat-icon">⭐</span><span className="analise-stat-value">{m.nps_medio || '—'}</span><span className="analise-stat-label">NPS Médio</span></div>
          <div className="analise-stat-card teal"><span className="analise-stat-icon">📝</span><span className="analise-stat-value">{m.total_transcricoes || 0}</span><span className="analise-stat-label">Transcrições</span></div>
          <div className="analise-stat-card indigo"><span className="analise-stat-icon">📏</span><span className="analise-stat-value">{m.media_caracteres ? Number(m.media_caracteres).toLocaleString('pt-BR') : '—'}</span><span className="analise-stat-label">Média Caracteres</span></div>
        </div>

        <div className="analises-charts-grid">
          <div className="analise-chart-card"><h3>🗺️ Reuniões por Estado</h3><div className="bar-list">{(analisesData.por_uf || []).slice(0, 12).map((item, i) => (<div key={i} className="bar-row"><span className="bar-label">{item.UF || '—'}</span><div className="bar-track"><div className="bar-fill" style={{width:`${(item.count/safeMax(analisesData.por_uf))*100}%`}}/></div><span className="bar-count">{item.count}</span></div>))}</div></div>
          <div className="analise-chart-card"><h3>🏭 Top Segmentos</h3><div className="bar-list">{(analisesData.por_segmento || []).map((item, i) => (<div key={i} className="bar-row"><span className="bar-label small">{item.NOME_SEGMENTO || '—'}</span><div className="bar-track"><div className="bar-fill purple" style={{width:`${(item.count/safeMax(analisesData.por_segmento))*100}%`}}/></div><span className="bar-count">{item.count}</span></div>))}</div></div>
          <div className="analise-chart-card"><h3>📅 Reuniões por Mês</h3><div className="bar-list">{(analisesData.por_mes || []).reverse().map((item, i) => (<div key={i} className="bar-row"><span className="bar-label">{item.mes || '—'}</span><div className="bar-track"><div className="bar-fill orange" style={{width:`${(item.count/safeMax(analisesData.por_mes))*100}%`}}/></div><span className="bar-count">{item.count}</span></div>))}</div></div>
          <div className="analise-chart-card"><h3>📹 Por Formato de Reunião</h3><div className="bar-list">{(analisesData.por_formato || []).map((item, i) => (<div key={i} className="bar-row"><span className="bar-label">{item.FORMATO_MEETING || '—'}</span><div className="bar-track"><div className="bar-fill teal" style={{width:`${(item.count/safeMax(analisesData.por_formato))*100}%`}}/></div><span className="bar-count">{item.count}</span></div>))}</div></div>
          <div className="analise-chart-card"><h3>✅ Por Status</h3><div className="bar-list">{(analisesData.por_status || []).map((item, i) => (<div key={i} className="bar-row"><span className="bar-label">{item.STATUS_MEETING || '—'}</span><div className="bar-track"><div className="bar-fill pink" style={{width:`${(item.count/safeMax(analisesData.por_status))*100}%`}}/></div><span className="bar-count">{item.count}</span></div>))}</div></div>
          <div className="analise-chart-card"><h3>⭐ Distribuição NPS</h3><div className="bar-list">{(analisesData.distribuicao_nps || []).map((item, i) => { const colors = ['#10b981','#f59e0b','#ef4444','#94a3b8']; return (<div key={i} className="bar-row"><span className="bar-label small">{item.categoria || '—'}</span><div className="bar-track"><div className="bar-fill" style={{width:`${(item.count/safeMax(analisesData.distribuicao_nps))*100}%`,background:colors[i]||'#3b82f6'}}/></div><span className="bar-count">{item.count}</span></div>); })}</div></div>
          <div className="analise-chart-card"><h3>🏢 Top Unidades</h3><div className="bar-list">{(analisesData.top_unidades || []).map((item, i) => (<div key={i} className="bar-row"><span className="bar-label small">{item.NOME_UNIDADE || '—'}</span><div className="bar-track"><div className="bar-fill green" style={{width:`${(item.count/safeMax(analisesData.top_unidades))*100}%`}}/></div><span className="bar-count">{item.count}</span></div>))}</div></div>
          <div className="analise-chart-card"><h3>💰 Faixa de Faturamento</h3><div className="bar-list">{(analisesData.por_faturamento || []).map((item, i) => (<div key={i} className="bar-row"><span className="bar-label small">{item.faixa || '—'}</span><div className="bar-track"><div className="bar-fill indigo" style={{width:`${(item.count/safeMax(analisesData.por_faturamento))*100}%`}}/></div><span className="bar-count">{item.count}</span></div>))}</div></div>
          <div className="analise-chart-card"><h3>⏱️ Duração Média por Segmento (min)</h3><div className="bar-list">{(analisesData.duracao_por_segmento || []).map((item, i) => (<div key={i} className="bar-row"><span className="bar-label small">{item.NOME_SEGMENTO || '—'}</span><div className="bar-track"><div className="bar-fill" style={{width:`${(item.duracao_media/safeMax(analisesData.duracao_por_segmento.map(x=>({count:x.duracao_media}))))*100}%`,background:'#6366f1'}}/></div><span className="bar-count">{item.duracao_media} min</span></div>))}</div></div>
        </div>
      </div>
    );
  };

  const getPageContent = () => {
    if (loading && !meetings.length && activePage !== 'transcricoes') return <div className="loading">Carregando...</div>;
    switch (activePage) {
      case 'dashboard': return renderDashboard();
      case 'reunioes': return renderReunioes();
      case 'transcricoes': return renderTranscricoes();
      case 'analises': return renderAnalises();
      default: return <div className="empty-state">Página em construção 🚧</div>;
    }
  };

  return (
    <Layout
      activePage={activePage}
      onNavigate={setActivePage}
      userName="Lucas"
      userEmail="lucas@totvs.com"
      meetings={meetings}
      selectedMeetingId={selectedMeetingId}
      onSelectMeeting={(id) => setSelectedMeetingId(id)}
      onSearchMeetings={setSearchTerm}
    >
      <div className="main-content">{getPageContent()}</div>
    </Layout>
  );
}

export default App;