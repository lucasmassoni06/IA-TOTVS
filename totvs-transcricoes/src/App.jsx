import React, { useState, useEffect } from 'react';
import './App.css';
import Layout from './components/Layout';

const API = 'http://localhost:8000';

function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [meetings, setMeetings] = useState([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [selectedLinhas, setSelectedLinhas] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statsLoading, setStatsLoading] = useState(true);
  const [transcricaoQuery, setTranscricaoQuery] = useState('');
  const [transcricaoResults, setTranscricaoResults] = useState([]);
  const [transcricaoLoading, setTranscricaoLoading] = useState(false);

  useEffect(() => {
    if (searchTerm) return;
    setStatsLoading(true);
    fetch(`${API}/estatisticas/gerais`)
      .then(r => r.json())
      .then(d => { setStats(d || {}); setStatsLoading(false); })
      .catch(() => setStatsLoading(false));
  }, [searchTerm]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: '1', page_size: '2000' });
    if (searchTerm && searchTerm.trim() !== '') {
      params.append('search', searchTerm.trim());
    }
    fetch(`${API}/reunioes?${params.toString()}`)
      .then(r => r.json())
      .then(r => {
        setMeetings(r.data || []);
        setLoading(false);
      })
      .catch(() => { setMeetings([]); setLoading(false); });
    
    setSelectedMeetingId(null);
    setSelectedMeeting(null);
    setSelectedLinhas([]);
  }, [searchTerm]);

  useEffect(() => {
    if (!selectedMeetingId) {
      setSelectedMeeting(null);
      setSelectedLinhas([]);
      return;
    }
    fetch(`${API}/reunioes/${selectedMeetingId}`)
      .then(r => r.json())
      .then(r => {
        setSelectedMeeting(r.resumo || r);
        setSelectedLinhas(r.linhas || []);
      })
      .catch(() => { setSelectedMeeting(null); setSelectedLinhas([]); });
  }, [selectedMeetingId]);

  // Busca de transcrições com debounce
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
      reunioes_por_uf: Object.entries(ufCount).map(([UF, count]) => ({ UF, count })),
      segmentos_mais_comuns: Object.entries(segCount).map(([NOME_SEGMENTO, count]) => ({ NOME_SEGMENTO, count })).sort((a, b) => b.count - a.count)
    };
  }, [searchTerm, meetings]);

  const displayStats = localStats || stats;

  const renderDashboard = () => (
    <div className="dashboard">
      {searchTerm && <div className="filter-badge">🔍 Filtrado por: <strong>"{searchTerm}"</strong></div>}
      
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

      {!searchTerm && !statsLoading && (
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
        </div>
      )}

      {searchTerm && displayStats.segmentos_mais_comuns && displayStats.segmentos_mais_comuns.length > 0 && (
        <div className="charts-grid">
          <div className="chart-card">
            <h3>🗺️ Estados (filtrados)</h3>
            <div className="bar-list">
              {[...displayStats.reunioes_por_uf].sort((a, b) => b.count - a.count).map((item, i) => (
                <div key={i} className="bar-row">
                  <span className="bar-label">{item.UF || '—'}</span>
                  <div className="bar-track"><div className="bar-fill" style={{width: `${(item.count / safeMax(displayStats.reunioes_por_uf)) * 100}%`}} /></div>
                  <span className="bar-count">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="chart-card">
            <h3>🏭 Segmentos (filtrados)</h3>
            <div className="bar-list">
              {displayStats.segmentos_mais_comuns.map((item, i) => (
                <div key={i} className="bar-row">
                  <span className="bar-label">{item.NOME_SEGMENTO || 'Não informado'}</span>
                  <div className="bar-track"><div className="bar-fill purple" style={{width: `${(item.count / safeMax(displayStats.segmentos_mais_comuns)) * 100}%`}} /></div>
                  <span className="bar-count">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {!searchTerm && statsLoading && <div className="loading" style={{minHeight: 200}}>Carregando gráficos...</div>}
    </div>
  );

  const renderReunioes = () => {
    if (!selectedMeeting) {
      return (
        <div className="page-reunioes">
          <h2 className="page-title">👥 Reuniões</h2>
          <p className="page-subtitle">
            {meetings.length} reuniões encontradas{searchTerm ? ` para "${searchTerm}"` : ''}
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

          {/* TRANSCRIÇÃO: linhas individuais SEMPRE visíveis */}
          {selectedLinhas.length > 0 && (
            <div className="transcricoes">
              <h3>📝 Transcrição por Locutor</h3>
              <div className="transcricao-linhas">
                {selectedLinhas.flatMap((l, idx) => {
                  const texto = l.ANON_TRANSCRICAO || '';
                  // Quebrar o texto nos padrões de locutor: [LOCUTOR N]:, [LOCAL]:, [PESSOA]:, [EMPRESA]:
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
                  <summary className="transcricao-summary">
                    📄 Ver texto completo da transcrição
                  </summary>
                  <div className="transcricao-completa">
                    {selectedMeeting.transcricao_completa}
                  </div>
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
        <input
          type="text"
          className="transcricao-search-input"
          placeholder="Digite uma palavra-chave para buscar nas transcrições..."
          value={transcricaoQuery}
          onChange={(e) => setTranscricaoQuery(e.target.value)}
        />
        {transcricaoQuery && (
          <button className="transcricao-search-clear" onClick={() => setTranscricaoQuery('')}>✕</button>
        )}
      </div>

      {transcricaoQuery && transcricaoQuery.trim() !== '' && (
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
            <div className="loading" style={{minHeight: 200}}>Buscando nas transcrições...</div>
          ) : transcricaoResults.length === 0 ? (
            <div className="empty-state" style={{minHeight: 150}}>
              Nenhuma transcrição encontrada para "{transcricaoQuery}"
            </div>
          ) : (
            <div className="transcricao-results">
              {transcricaoResults.map((item, i) => (
                <div
                  key={i}
                  className="transcricao-result-card"
                  onClick={() => {
                    setSelectedMeetingId(item.ID_MEETING);
                    setActivePage('reunioes');
                  }}
                >
                  <div className="transcricao-result-header">
                    <span className="transcricao-result-id">#{item.ID_MEETING}</span>
                    <span className="transcricao-result-date">
                      {item.dt_meeting ? new Date(item.dt_meeting).toLocaleDateString('pt-BR') : '—'}
                    </span>
                    <span className="transcricao-result-unidade">{item.nome_unidade || '—'}</span>
                  </div>
                  <div className="transcricao-result-trecho">
                    {item.trecho || '(trecho não disponível)'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {(!transcricaoQuery || transcricaoQuery.trim() === '') && (
        <div className="empty-state" style={{minHeight: 250}}>
          🔍 Digite uma palavra-chave acima para buscar nas transcrições
        </div>
      )}
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
      onSelectMeeting={(id) => { setSelectedMeetingId(id); setActivePage('reunioes'); }}
      onSearchMeetings={setSearchTerm}
    >
      <div className="main-content">{getPageContent()}</div>
    </Layout>
  );
}

export default App;