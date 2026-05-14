import React, { useState, useEffect } from 'react';
import './App.css';
import Layout from './components/Layout';

const API = 'http://localhost:8000';

// Normaliza os campos da API (maiúsculo ou minúsculo)
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

  // Stats
  useEffect(() => {
    setStatsLoading(true);
    fetch(`${API}/estatisticas/gerais`)
      .then(r => r.json())
      .then(d => { setStats(d || {}); setStatsLoading(false); })
      .catch(() => setStatsLoading(false));
  }, []);

  // Meetings
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: '1', page_size: '2000' });
    if (searchTerm) params.append('search', searchTerm);
    fetch(`${API}/reunioes?${params}`)
      .then(r => r.json())
      .then(r => {
        const data = (r.data || []).map(normalize);
        setMeetings(data);
        setLoading(false);
      })
      .catch(() => { setMeetings([]); setLoading(false); });

    setSelectedMeetingId(null);
    setSelectedMeeting(null);
    setSelectedLinhas([]);
  }, [searchTerm]);

  // Detalhe da reunião
  useEffect(() => {
    if (!selectedMeetingId) {
      setSelectedMeeting(null);
      setSelectedLinhas([]);
      return;
    }
    fetch(`${API}/reunioes/${selectedMeetingId}`)
      .then(r => r.json())
      .then(r => {
        const resumo = normalize(r.resumo || r);
        const linhas = (r.linhas || []).map(l => ({
          ANON_TRANSCRICAO: l.ANON_TRANSCRICAO || l.anon_transcricao || l.anon_transcricao || (typeof l === 'string' ? l : ''),
        }));
        setSelectedMeeting(resumo);
        setSelectedLinhas(linhas);
      })
      .catch(() => { setSelectedMeeting(null); setSelectedLinhas([]); });
  }, [selectedMeetingId]);

  // Busca transcrições
  useEffect(() => {
    if (!transcricaoQuery || transcricaoQuery.trim() === '') {
      setTranscricaoResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setTranscricaoLoading(true);
      fetch(`${API}/analises/palavras-chave?q=${encodeURIComponent(transcricaoQuery.trim())}`)
        .then(r => r.json())
        .then(data => {
          const list = Array.isArray(data) ? data : (data.data || []);
          setTranscricaoResults(list);
          setTranscricaoLoading(false);
        })
        .catch(() => { setTranscricaoResults([]); setTranscricaoLoading(false); });
    }, 400);
    return () => clearTimeout(timer);
  }, [transcricaoQuery]);

  const safeMax = (arr) => {
    if (!arr || !Array.isArray(arr) || arr.length === 0) return 1;
    const m = Math.max(...arr.map(x => x.count || 0));
    return m > 0 ? m : 1;
  };

  const localStats = React.useMemo(() => {
    if (!searchTerm || !meetings.length) return null;
    const total = meetings.length;
    const duracao = meetings.reduce((s, m) => s + (m.duracao_minutos || 0), 0) / total;
    const ufCount = {};
    const segCount = {};
    meetings.forEach(m => {
      const uf = m.uf || '—';
      ufCount[uf] = (ufCount[uf] || 0) + 1;
      const seg = m.nome_segmento || 'Não informado';
      segCount[seg] = (segCount[seg] || 0) + 1;
    });
    return {
      total_reunioes: total,
      duracao_media_minutos: duracao,
      total_clientes: null,
      total_unidades: null,
      nps_medio: null,
      total_transcricoes: total,
      reunioes_por_uf: Object.entries(ufCount).map(([UF, count]) => ({ UF, count })),
      segmentos_mais_comuns: Object.entries(segCount).map(([NOME_SEGMENTO, count]) => ({ NOME_SEGMENTO, count })).sort((a, b) => b.count - a.count)
    };
  }, [searchTerm, meetings]);

  const displayStats = localStats || stats;

  const renderDashboard = () => (
    <div className="dashboard">
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">🎯</span>
          <span className="stat-value">{displayStats.total_reunioes || 0}</span>
          <span className="stat-label">Total Reuniões</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">⏱️</span>
          <span className="stat-value">{(displayStats.duracao_media_minutos || 0).toFixed(1)}</span>
          <span className="stat-label">Duração Média (min)</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">👥</span>
          <span className="stat-value">{displayStats.total_clientes || '—'}</span>
          <span className="stat-label">Clientes</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🏢</span>
          <span className="stat-value">{displayStats.total_unidades || '—'}</span>
          <span className="stat-label">Unidades</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">⭐</span>
          <span className="stat-value">{displayStats.nps_medio ? displayStats.nps_medio.toFixed(1) : '—'}</span>
          <span className="stat-label">NPS Médio</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📝</span>
          <span className="stat-value">{displayStats.total_transcricoes || meetings.length || 0}</span>
          <span className="stat-label">Transcrições</span>
        </div>
      </div>

      {!statsLoading && (
        <div className="charts-grid">
          <div className="chart-card">
            <h3>🗺️ Reuniões por Estado</h3>
            <div className="bar-list">
              {(stats.reunioes_por_uf || []).map((item, i) => (
                <div key={i} className="bar-row">
                  <span className="bar-label">{item.UF || '—'}</span>
                  <div className="bar-track"><div className="bar-fill" style={{width: `${(item.count / safeMax(stats.reunioes_por_uf)) * 100}%`}} /></div>
                  <span className="bar-count">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="chart-card">
            <h3>🏭 Segmentos</h3>
            <div className="bar-list">
              {(stats.segmentos_mais_comuns || []).map((item, i) => (
                <div key={i} className="bar-row">
                  <span className="bar-label">{item.NOME_SEGMENTO || 'Não informado'}</span>
                  <div className="bar-track"><div className="bar-fill purple" style={{width: `${(item.count / safeMax(stats.segmentos_mais_comuns)) * 100}%`}} /></div>
                  <span className="bar-count">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="chart-card">
            <h3>📅 Reuniões por Mês</h3>
            <div className="bar-list">
              {(stats.reunioes_por_mes || []).map((item, i) => (
                <div key={i} className="bar-row">
                  <span className="bar-label">{item.mes || '—'}</span>
                  <div className="bar-track"><div className="bar-fill orange" style={{width: `${(item.count / safeMax(stats.reunioes_por_mes)) * 100}%`}} /></div>
                  <span className="bar-count">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="chart-card">
            <h3>💰 Faixa de Faturamento</h3>
            <div className="bar-list">
              {(stats.faixa_faturamento_count || []).slice(0, 10).map((item, i) => (
                <div key={i} className="bar-row">
                  <span className="bar-label small">{item.faixa || '—'}</span>
                  <div className="bar-track"><div className="bar-fill green" style={{width: `${(item.count / safeMax(stats.faixa_faturamento_count)) * 100}%`}} /></div>
                  <span className="bar-count">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="chart-card">
            <h3>📹 Por Formato</h3>
            <div className="bar-list">
              {(stats.reunioes_por_formato || []).map((item, i) => (
                <div key={i} className="bar-row">
                  <span className="bar-label">{item.FORMATO_MEETING || '—'}</span>
                  <div className="bar-track"><div className="bar-fill teal" style={{width: `${(item.count / safeMax(stats.reunioes_por_formato)) * 100}%`}} /></div>
                  <span className="bar-count">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="chart-card">
            <h3>✅ Por Status</h3>
            <div className="bar-list">
              {(stats.reunioes_por_status || []).map((item, i) => (
                <div key={i} className="bar-row">
                  <span className="bar-label">{item.STATUS_MEETING || '—'}</span>
                  <div className="bar-track"><div className="bar-fill pink" style={{width: `${(item.count / safeMax(stats.reunioes_por_status)) * 100}%`}} /></div>
                  <span className="bar-count">{item.count}</span>
                </div>
              ))}
            </div>
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
          <p className="page-subtitle">
            {meetings.length} reuniões encontradas{searchTerm ? ` para "${searchTerm}"` : ''}
            — clique em uma linha para ver os detalhes
          </p>
          <div className="meetings-table-wrapper">
            <table className="meetings-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Data</th>
                  <th>Formato</th>
                  <th>Status</th>
                  <th>Duração</th>
                  <th>UF</th>
                  <th>Unidade</th>
                  <th>Segmento</th>
                  <th>NPS</th>
                </tr>
              </thead>
              <tbody>
                {meetings.map(m => (
                  <tr key={m.id_meeting} onClick={() => { setSelectedMeetingId(m.id_meeting); }} className="clickable-row">
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
                ))}
              </tbody>
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
                    <div key={`${idx}-${i}`} className="transcricao-item">
                      {fala.trim()}
                    </div>
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
        <input type="text" className="transcricao-search-input" placeholder="Digite uma palavra-chave..." value={transcricaoQuery} onChange={(e) => setTranscricaoQuery(e.target.value)} />
        {transcricaoQuery && <button className="transcricao-search-clear" onClick={() => setTranscricaoQuery('')}>✕</button>}
      </div>
      {transcricaoQuery && (
        <>
          <div className="transcricao-stats">
            <div className="transcricao-stat-card">
              <span className="transcricao-stat-value">{transcricaoResults.length}</span>
              <span className="transcricao-stat-label">Reuniões encontradas</span>
            </div>
            <div className="transcricao-stat-card">
              <span className="transcricao-stat-value">"{transcricaoQuery}"</span>
              <span className="transcricao-stat-label">Termo buscado</span>
            </div>
          </div>
          {transcricaoLoading ? (
            <div className="loading">Buscando...</div>
          ) : transcricaoResults.length === 0 ? (
            <div className="empty-state">Nenhuma transcrição encontrada para "{transcricaoQuery}"</div>
          ) : (
            <div className="transcricao-results">
              {transcricaoResults.map((item, i) => (
                <div key={i} className="transcricao-result-card" onClick={() => { setSelectedMeetingId(item.ID_MEETING); setActivePage('reunioes'); }}>
                  <div className="transcricao-result-header">
                    <span className="transcricao-result-id">#{item.ID_MEETING}</span>
                    <span className="transcricao-result-date">{item.dt_meeting ? new Date(item.dt_meeting).toLocaleDateString('pt-BR') : '—'}</span>
                    <span className="transcricao-result-unidade">{item.nome_unidade || '—'}</span>
                  </div>
                  <div className="transcricao-result-trecho">{item.trecho || '(trecho)'}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {!transcricaoQuery && <div className="empty-state">🔍 Digite uma palavra-chave para buscar nas transcrições</div>}
    </div>
  );

  const getPageContent = () => {
    if (loading && !meetings.length && activePage !== 'transcricoes') return <div className="loading">Carregando...</div>;
    switch (activePage) {
      case 'dashboard': return renderDashboard();
      case 'reunioes': return renderReunioes();
      case 'transcricoes': return renderTranscricoes();
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
      onSelectMeeting={(id) => { setSelectedMeetingId(id); }}
      onSearchMeetings={setSearchTerm}
    >
      <div className="main-content">{getPageContent()}</div>
    </Layout>
  );
}

export default App;