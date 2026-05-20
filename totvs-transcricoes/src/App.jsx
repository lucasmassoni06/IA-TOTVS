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

const PieChart = ({ data, size = 180, donut = false, colors }) => {
  if (!data || data.length === 0 || data.every(d => !d.count)) return null;
  const total = data.reduce((s, d) => s + (d.count || 0), 0);
  if (total === 0) return null;
  const palette = colors || ['#6C47FF','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#6366f1','#f97316','#84cc16'];
  const cx = size / 2, cy = size / 2, radius = size * 0.4, innerR = donut ? radius * 0.6 : 0;
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
    return <path key={i} d={path} fill={palette[i % palette.length]} stroke="white" strokeWidth="1.5" />;
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
        <text x={p.x} y={p.y - 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="white">{pct}%</text>
        <text x={p.x} y={p.y + 7} textAnchor="middle" fontSize="6.5" fill="rgba(255,255,255,0.85)">{d.categoria || d.FORMATO_MEETING || d.STATUS_MEETING || ''}</text>
      </g>
    );
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', margin: '0 auto' }}>
      {slices}{labels.length <= 5 && labels}
    </svg>
  );
};

const LineChart = ({ data, height = 200, color = '#6C47FF' }) => {
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
  const dots = data.map((d, i) => <g key={`dt-${i}`}><circle cx={toX(i)} cy={toY(d.count)} r="4" fill={color} stroke="white" strokeWidth="2" /><circle cx={toX(i)} cy={toY(d.count)} r="7" fill={color} opacity="0.12" /></g>);
  const area = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(d.count)}`).join(' ') + ` L ${toX(data.length-1)} ${pad.top+ch} L ${toX(0)} ${pad.top+ch} Z`;
  return (
    <svg width="100%" height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={{ display: 'block' }}>
      {grid}<path d={area} fill={`${color}0d`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {dots}
    </svg>
  );
};

const RingChart = ({ value = 0, max = 10, size = 120, label = 'NPS' }) => {
  const pct = Math.min(value / max, 1);
  const r = size * 0.42;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const cx = size / 2, cy = size / 2;
  const getColor = (v) => {
    if (v >= 8) return '#10b981';
    if (v >= 6) return '#f59e0b';
    return '#ef4444';
  };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="6" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={getColor(value)} strokeWidth="6"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="22" fontWeight="700" fill="#0f172a">{typeof value === 'number' ? value.toFixed(1) : value}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="9" fill="#64748b">{label}</text>
    </svg>
  );
};

const BarList = ({ data, labelKey = 'label', valueKey = 'count', colors, maxBars = 12 }) => {
  if (!data || data.length === 0) return null;
  const items = data.slice(0, maxBars);
  const mx = Math.max(...items.map(x => x[valueKey] || 0));
  const safeMx = mx > 0 ? mx : 1;
  const palette = colors || ['#6C47FF'];
  return (
    <div className="bar-list">
      {items.map((item, i) => (
        <div key={i} className="bar-row">
          <span className="bar-label">{item[labelKey] || '—'}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(item[valueKey] / safeMx) * 100}%`, background: palette[i % palette.length] }} />
          </div>
          <span className="bar-count">{item[valueKey]}</span>
        </div>
      ))}
    </div>
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
  const [isOnline, setIsOnline] = useState(false);
  const [assistenteMessages, setAssistenteMessages] = useState([]);
  const [assistenteInput, setAssistenteInput] = useState('');
  const [assistenteLoading, setAssistenteLoading] = useState(false);

  const suggestedQuestions = [
    { icon: '📊', text: 'Quantas reuniões foram realizadas no total?' },
    { icon: '⭐', text: 'Qual o NPS médio das reuniões?' },
    { icon: '🏢', text: 'Quais estados têm mais reuniões?' },
    { icon: '🏭', text: 'Quais os segmentos mais comuns?' },
    { icon: '⏱️', text: 'Qual a duração média das reuniões?' },
    { icon: '💰', text: 'Qual a faixa de faturamento predominante?' },
  ];

    const handleAssistenteSend = async (text) => {
    const question = text || assistenteInput;
    if (!question.trim() || assistenteLoading) return;

    const newMessages = [...assistenteMessages, { role: 'user', content: question }];
    setAssistenteMessages(newMessages);
    setAssistenteInput('');
    setAssistenteLoading(true);

    try {
      const resp = await fetch(`${API}/assistente/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });
      const data = await resp.json();
      const answer = data.answer || '❌ Não consegui processar.';
      setAssistenteMessages(prev => [...prev, { role: 'bot', content: answer }]);
    } catch (e) {
      try {
        const statsRes = await fetch(`${API}/estatisticas/gerais`).then(r => r.json()).catch(() => ({}));
        const s = statsRes || {};
        const q = question.toLowerCase();
        let answer = '';
        if (q.includes('quantas') || q.includes('total') || q.includes('reuni') || q.includes('reunioes')) {
          answer = `📊 **${s.total_reunioes || 0}** reuniões registradas.`;
        } else if (q.includes('nps') || q.includes('satisfação') || q.includes('satisfacao') || q.includes('nota')) {
          answer = `⭐ **NPS médio:** ${s.nps_medio ? Number(s.nps_medio).toFixed(1) : '—'}/10`;
        } else if (q.includes('estado') || q.includes('uf')) {
          const ufs = s.reunioes_por_uf || [];
          answer = `🗺️ **Estados:**\n${ufs.slice(0,5).map(u => `• ${u.UF}: ${u.count}`).join('\n')}`;
        } else if (q.includes('segment') || q.includes('setor')) {
          const segs = s.segmentos_mais_comuns || [];
          answer = `🏭 **Segmentos:**\n${segs.slice(0,5).map(seg => `• ${seg.NOME_SEGMENTO}: ${seg.count}`).join('\n')}`;
        } else if (q.includes('dura') || q.includes('tempo') || q.includes('média') || q.includes('media')) {
          answer = `⏱️ **Duração média:** ${(s.duracao_media_minutos || 0).toFixed(1)} min`;
        } else if (q.includes('cliente')) {
          answer = `👥 **${s.total_clientes || '—'}** clientes em **${s.total_unidades || '—'}** unidades`;
        } else if (q.includes('transcri')) {
          answer = `📝 **${s.total_transcricoes || 0}** transcrições disponíveis`;
        } else {
          answer = `📊 **Resumo:** ${s.total_reunioes || 0} reuniões, NPS ${s.nps_medio ? Number(s.nps_medio).toFixed(1) : '—'}/10, ${s.total_clientes || '—'} clientes.`;
        }
        setAssistenteMessages(prev => [...prev, { role: 'bot', content: answer }]);
      } catch {
        setAssistenteMessages(prev => [...prev, { role: 'bot', content: '❌ Servidor offline.' }]);
      }
    }
    setAssistenteLoading(false);
  };

  useEffect(() => {
    const check = () => { fetch(`${API}/health`).then(r=>r.json()).then(d=>setIsOnline(d.status==='ok')).catch(()=>setIsOnline(false)); };
    check(); const i = setInterval(check, 30000); return () => clearInterval(i);
  }, []);

  useEffect(() => {
    setStatsLoading(true);
    const p = new URLSearchParams();
    if (searchTerm) p.append('search', searchTerm);
    fetch(`${API}/estatisticas/gerais?${p}`).then(r=>r.json()).then(d=>{setStats(d||{});setStatsLoading(false);}).catch(()=>setStatsLoading(false));
  }, [searchTerm]);

  useEffect(() => {
    setLoading(true);
    const p = new URLSearchParams({ page: '1', page_size: '2000' });
    if (searchTerm) p.append('search', searchTerm);
    fetch(`${API}/reunioes?${p}`).then(r=>r.json()).then(r=>{setMeetings((r.data||[]).map(normalize));setLoading(false);}).catch(()=>{setMeetings([]);setLoading(false);});
  }, [searchTerm]);

  useEffect(() => {
    if (!selectedMeetingId) { setSelectedMeeting(null); setSelectedLinhas([]); return; }
    fetch(`${API}/reunioes/${selectedMeetingId}`).then(r=>r.json()).then(r=>{
      const resumo = normalize(r.resumo||r);
      const linhas = (r.linhas||[]).map(l=>({ANON_TRANSCRICAO:l.ANON_TRANSCRICAO||l.anon_transcricao||''}));
      setSelectedMeeting(resumo); setSelectedLinhas(linhas);
    }).catch(()=>{setSelectedMeeting(null);setSelectedLinhas([]);});
  }, [selectedMeetingId]);

  useEffect(() => {
    if (!transcricaoQuery||!transcricaoQuery.trim()) { setTranscricaoResults([]); return; }
    const t = setTimeout(() => {
      setTranscricaoLoading(true);
      fetch(`${API}/analises/palavras-chave?q=${encodeURIComponent(transcricaoQuery.trim())}`)
        .then(r=>r.json()).then(d=>{setTranscricaoResults(Array.isArray(d)?d:(d.data||[]));setTranscricaoLoading(false);})
        .catch(()=>{setTranscricaoResults([]);setTranscricaoLoading(false);});
    }, 400);
    return () => clearTimeout(t);
  }, [transcricaoQuery]);

  useEffect(() => {
    setAnalisesLoading(true);
    const p = new URLSearchParams();
    if (searchTerm) p.append('search', searchTerm);
    fetch(`${API}/analises/completas?${p}`).then(r=>r.json()).then(d=>{setAnalisesData(d||{});setAnalisesLoading(false);}).catch(()=>{setAnalisesData({});setAnalisesLoading(false);});
  }, [searchTerm]);

  const safeMax = (arr) => { if (!arr||!Array.isArray(arr)||arr.length===0) return 1; const m = Math.max(...arr.map(x=>x.count||0)); return m>0?m:1; };
  const handleSelectMeetingAndFilter = (id) => { setSelectedMeetingId(id); setSearchTerm(id); setActivePage('reunioes'); };

  const paleta = ['#6C47FF','#8b5cf6','#a78bfa','#c4b5fd','#ddd6fe'];
  const paletaStatus = ['#10b981','#ef4444','#f59e0b','#6C47FF','#8b5cf6'];
  const paletaNps = ['#10b981','#f59e0b','#ef4444','#94a3b8'];
  const paletaUf = ['#6C47FF','#6366f1','#8b5cf6','#a78bfa','#14b8a6','#0ea5e9','#f59e0b','#f97316','#ec4899','#10b981','#84cc16','#06b6d4'];

  const renderDashboard = () => (
    <div className="dashboard">
      {searchTerm && <div className="filter-badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>Filtrando: <strong>"{searchTerm}"</strong><button className="filter-clear-btn" onClick={()=>setSearchTerm('')}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></div>}
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon-box"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg></div><span className="stat-value">{stats.total_reunioes||0}</span><span className="stat-label">Reuniões</span></div>
        <div className="stat-card"><div className="stat-icon-box green"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><span className="stat-value">{(stats.duracao_media_minutos||0).toFixed(1)}</span><span className="stat-label">Duração Média (min)</span></div>
        <div className="stat-card"><div className="stat-icon-box purple"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><span className="stat-value">{stats.total_clientes||'—'}</span><span className="stat-label">Clientes</span></div>
        <div className="stat-card"><div className="stat-icon-box orange"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div><span className="stat-value">{stats.total_unidades||'—'}</span><span className="stat-label">Unidades</span></div>
        <div className="stat-card"><div className="stat-icon-box pink"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div><span className="stat-value">{stats.nps_medio?Number(stats.nps_medio).toFixed(1):'—'}</span><span className="stat-label">NPS Médio</span></div>
        <div className="stat-card"><div className="stat-icon-box teal"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div><span className="stat-value">{stats.total_transcricoes||0}</span><span className="stat-label">Transcrições</span></div>
      </div>
      {!statsLoading&&<>
        <div className="charts-grid charts-grid-2col">
          <div className="chart-card chart-card-wide"><div className="chart-header"><h3><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6C47FF" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> Reuniões por Mês</h3></div><LineChart data={(stats.reunioes_por_mes||[]).reverse()} height={200} color="#6C47FF"/></div>
          <div className="chart-card chart-card-center"><div className="chart-header"><h3><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> NPS Médio</h3></div><RingChart value={stats.nps_medio||0} max={10} size={140} label="Média Geral"/><div className="nps-extra-info">{(stats.distribuicao_nps||[]).map((item,i)=><div key={i} className="nps-tag" style={{borderLeftColor:paletaNps[i]}}><span className="nps-tag-label">{item.categoria}</span><span className="nps-tag-value">{item.count}</span></div>)}</div></div>
        </div>
        <div className="charts-grid">
          <div className="chart-card chart-card-center"><div className="chart-header"><h3><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6C47FF" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 4 4 0 0 1-4 4"/><path d="M12 22a15.3 15.3 0 0 1-4-10 4 4 0 0 1 4-4"/></svg> NPS</h3></div><PieChart data={stats.distribuicao_nps||[]} size={180} colors={paletaNps}/><div className="pie-legend">{(stats.distribuicao_nps||[]).map((item,i)=>item.categoria?<div key={i} className="legend-item"><span className="legend-dot" style={{background:paletaNps[i]}}/><span className="legend-label">{item.categoria}</span><span className="legend-value">{item.count}</span></div>:null)}</div></div>
          <div className="chart-card chart-card-center"><div className="chart-header"><h3><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> Formato</h3></div><PieChart data={stats.reunioes_por_formato||[]} size={180} donut colors={paleta}/><div className="pie-legend">{(stats.reunioes_por_formato||[]).map((item,i)=>item.FORMATO_MEETING?<div key={i} className="legend-item"><span className="legend-dot" style={{background:paleta[i]}}/><span className="legend-label">{item.FORMATO_MEETING}</span><span className="legend-value">{item.count}</span></div>:null)}</div></div>
          <div className="chart-card chart-card-center"><div className="chart-header"><h3><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Status</h3></div><PieChart data={stats.reunioes_por_status||[]} size={180} donut colors={paletaStatus}/><div className="pie-legend">{(stats.reunioes_por_status||[]).map((item,i)=>item.STATUS_MEETING?<div key={i} className="legend-item"><span className="legend-dot" style={{background:paletaStatus[i]}}/><span className="legend-label">{item.STATUS_MEETING}</span><span className="legend-value">{item.count}</span></div>:null)}</div></div>
        </div>
        <div className="charts-grid">
          <div className="chart-card"><div className="chart-header"><h3><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6C47FF" strokeWidth="2"><path d="M3 3v18h18"/><path d="M7 16v-3"/><path d="M12 16v-7"/><path d="M17 16V8"/></svg> Estados</h3></div><BarList data={(stats.reunioes_por_uf||[]).slice(0,12)} labelKey="UF" valueKey="count" colors={paletaUf}/></div>
          <div className="chart-card"><div className="chart-header"><h3><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> Segmentos</h3></div><BarList data={(stats.segmentos_mais_comuns||[]).slice(0,10)} labelKey="NOME_SEGMENTO" valueKey="count" colors={['#8b5cf6','#a78bfa','#c4b5fd','#ddd6fe','#ede9fe']}/></div>
          <div className="chart-card"><div className="chart-header"><h3><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Faturamento</h3></div><BarList data={(stats.faixa_faturamento_count||[]).slice(0,8)} labelKey="faixa" valueKey="count" colors={['#10b981','#34d399','#6ee7b7','#a7f3d0','#d1fae5']}/></div>
        </div>
      </>}
    </div>
  );

  const renderReunioes = () => {
    if (!selectedMeeting) {
      return (<div className="page-reunioes"><h2 className="page-title">Reuniões</h2><p className="page-subtitle">{meetings.length} encontradas{searchTerm?` para "${searchTerm}"`:''}</p><div className="meetings-table-wrapper"><table className="meetings-table"><thead><tr><th>ID</th><th>Data</th><th>Formato</th><th>Status</th><th>Duração</th><th>UF</th><th>Unidade</th><th>Segmento</th><th>NPS</th></tr></thead><tbody>{meetings.map(m=><tr key={m.id_meeting} onClick={()=>handleSelectMeetingAndFilter(m.id_meeting)} className="clickable-row"><td className="cell-id">{m.id_meeting}</td><td>{m.dt_meeting?new Date(m.dt_meeting).toLocaleDateString('pt-BR'):'—'}</td><td><span className="badge badge-formato">{m.formato_meeting||'—'}</span></td><td><span className="badge badge-status">{m.status_meeting||'—'}</span></td><td>{m.duracao_minutos?`${m.duracao_minutos.toFixed(1)} min`:'—'}</td><td>{m.uf||'—'}</td><td>{m.nome_unidade||'—'}</td><td>{m.nome_segmento||'—'}</td><td>{m.nota_nps?m.nota_nps.toFixed(1):'—'}</td></tr>)}</tbody></table></div></div>);
    }
    return (<div className="page-reunioes"><button className="back-btn" onClick={()=>{setSelectedMeetingId(null);setSearchTerm('');}}>← Voltar</button><div className="meeting-detail"><h2>{selectedMeeting.nome_unidade||`Reunião ${selectedMeeting.id_meeting}`}</h2><div className="detail-grid">{[['ID',selectedMeeting.id_meeting],['Data',selectedMeeting.dt_meeting?new Date(selectedMeeting.dt_meeting).toLocaleDateString('pt-BR'):'—'],['Formato',selectedMeeting.formato_meeting||'—'],['Status',selectedMeeting.status_meeting||'—'],['Duração',selectedMeeting.duracao_minutos?`${selectedMeeting.duracao_minutos.toFixed(1)} min`:'—'],['UF',selectedMeeting.uf||'—'],['Unidade',selectedMeeting.nome_unidade||'—'],['Segmento',selectedMeeting.nome_segmento||'—'],['NPS',selectedMeeting.nota_nps?selectedMeeting.nota_nps.toFixed(1):'—']].map(([k,v],i)=><div key={i} className="detail-item"><strong>{k}:</strong> {v}</div>)}</div>{selectedLinhas.length>0&&<div className="transcricoes-section"><h3>Transcrição ({selectedLinhas.length} falas)</h3><div className="transcricao-linhas">{selectedLinhas.flatMap((l,idx)=>{const t=l.ANON_TRANSCRICAO||'';return t.split(/(?=\[LOCUTOR \d+\]:|\[LOCAL\]:|\[PESSOA\]:|\[EMPRESA\]:)/g).filter(x=>x.trim()).map((fala,i)=><div key={`${idx}-${i}`} className="transcricao-item">{fala.trim()}</div>);})}</div></div>}</div></div>);
  };

  const renderTranscricoes = () => (
    <div className="page-transcricoes"><h2 className="page-title">Transcrições</h2><p className="page-subtitle">Busque por palavras-chave nas transcrições</p>
      <div className="transcricao-search"><svg className="transcricao-search-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="text" className="transcricao-search-input" placeholder="Digite uma palavra-chave..." value={transcricaoQuery} onChange={e=>setTranscricaoQuery(e.target.value)}/>{transcricaoQuery&&<button className="transcricao-search-clear" onClick={()=>setTranscricaoQuery('')}>✕</button>}
      </div>
      {transcricaoQuery?<>{transcricaoLoading?<div className="loading">Buscando...</div>:transcricaoResults.length===0?<div className="empty-state">Nada encontrado para "{transcricaoQuery}"</div>:<div className="transcricao-results">{transcricaoResults.map((item,i)=><div key={i} className="transcricao-result-card" onClick={()=>{setSelectedMeetingId(item.ID_MEETING);setSearchTerm(item.ID_MEETING);setActivePage('reunioes');}}><div className="transcricao-result-header"><span className="transcricao-result-id">#{item.ID_MEETING}</span><span className="transcricao-result-date">{item.dt_meeting?new Date(item.dt_meeting).toLocaleDateString('pt-BR'):'—'}</span><span className="transcricao-result-unidade">{item.nome_unidade||'—'}</span></div><div className="transcricao-result-trecho">{item.trecho||'(trecho)'}</div></div>)}</div>}</>:<div className="empty-state"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>Digite uma palavra-chave para buscar</div>}
    </div>
  );

  const renderAnalises = () => {
    if (analisesLoading) return <div className="loading">Carregando...</div>;
    if (!analisesData||!analisesData.metricas) return <div className="empty-state">Nenhum dado disponível</div>;
    const m=analisesData.metricas;
    return (<div className="page-analises"><h2 className="page-title">Análises</h2><p className="page-subtitle">{searchTerm?`Filtrado para "${searchTerm}"`:'Todos os dados'}</p>
      <div className="analises-stats-grid">
        <div className="analise-stat-card blue"><span className="analise-stat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg></span><span className="analise-stat-value">{m.total_reunioes||0}</span><span className="analise-stat-label">Reuniões</span></div>
        <div className="analise-stat-card green"><span className="analise-stat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span><span className="analise-stat-value">{m.duracao_media||'—'}</span><span className="analise-stat-label">Duração Média (min)</span></div>
        <div className="analise-stat-card purple"><span className="analise-stat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span><span className="analise-stat-value">{m.total_clientes||0}</span><span className="analise-stat-label">Clientes</span></div>
        <div className="analise-stat-card orange"><span className="analise-stat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></span><span className="analise-stat-value">{m.total_unidades||0}</span><span className="analise-stat-label">Unidades</span></div>
        <div className="analise-stat-card pink"><span className="analise-stat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span><span className="analise-stat-value">{m.nps_medio||'—'}</span><span className="analise-stat-label">NPS Médio</span></div>
        <div className="analise-stat-card teal"><span className="analise-stat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></span><span className="analise-stat-value">{m.total_transcricoes||0}</span><span className="analise-stat-label">Transcrições</span></div>
        <div className="analise-stat-card indigo"><span className="analise-stat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="9" y1="21" x2="9" y2="8"/><line x1="14" y1="21" x2="14" y2="11"/><line x1="19" y1="21" x2="19" y2="3"/></svg></span><span className="analise-stat-value">{m.media_caracteres?Number(m.media_caracteres).toLocaleString('pt-BR'):'—'}</span><span className="analise-stat-label">Média Caracteres</span></div>
      </div>
      <div className="analises-charts-grid">
        <div className="analise-chart-card"><div className="chart-header"><h3>Estados</h3></div><BarList data={(analisesData.por_uf||[]).slice(0,12)} labelKey="UF" valueKey="count" colors={paletaUf}/></div>
        <div className="analise-chart-card"><div className="chart-header"><h3>Segmentos</h3></div><BarList data={(analisesData.por_segmento||[]).slice(0,10)} labelKey="NOME_SEGMENTO" valueKey="count" colors={['#8b5cf6','#a78bfa','#c4b5fd','#ddd6fe','#ede9fe']}/></div>
        <div className="analise-chart-card"><div className="chart-header"><h3>Mês</h3></div><LineChart data={(analisesData.por_mes||[]).reverse()} height={180} color="#f59e0b"/></div>
        <div className="analise-chart-card"><div className="chart-header"><h3>Formato</h3></div><BarList data={analisesData.por_formato||[]} labelKey="FORMATO_MEETING" valueKey="count" colors={paleta}/></div>
        <div className="analise-chart-card"><div className="chart-header"><h3>Status</h3></div><BarList data={analisesData.por_status||[]} labelKey="STATUS_MEETING" valueKey="count" colors={paletaStatus}/></div>
        <div className="analise-chart-card"><div className="chart-header"><h3>NPS</h3></div><BarList data={analisesData.distribuicao_nps||[]} labelKey="categoria" valueKey="count" colors={paletaNps}/></div>
        <div className="analise-chart-card"><div className="chart-header"><h3>Unidades</h3></div><BarList data={(analisesData.top_unidades||[]).slice(0,10)} labelKey="NOME_UNIDADE" valueKey="count" colors={paletaUf}/></div>
        <div className="analise-chart-card"><div className="chart-header"><h3>Faturamento</h3></div><BarList data={analisesData.por_faturamento||[]} labelKey="faixa" valueKey="count" colors={['#10b981','#34d399','#6ee7b7','#a7f3d0','#d1fae5']}/></div>
        <div className="analise-chart-card"><div className="chart-header"><h3>Duração por Segmento</h3></div><BarList data={analisesData.duracao_por_segmento||[]} labelKey="NOME_SEGMENTO" valueKey="duracao_media" colors={['#6366f1','#818cf8','#a5b4fc','#c7d2fe','#e0e7ff']}/></div>
      </div>
    </div>);
  };

  const renderAssistente = () => (
    <div className="page-assistente">
      <h2 className="page-title">Assistente IA</h2>
      <p className="page-subtitle">Tire dúvidas sobre reuniões, métricas e transcrições</p>
      <div className="assistente-container">
        <div className="assistente-sidebar">
          <h3>Perguntas Sugeridas</h3>
          {suggestedQuestions.map((item,i)=>(
            <div key={i} className="assistente-suggestion" onClick={()=>{setAssistenteInput(item.text);handleAssistenteSend(item.text);}}>
              <span className="assistente-suggestion-icon">{item.icon}</span>{item.text}
            </div>
          ))}
        </div>
        <div className="assistente-chat">
          <div className="assistente-messages">
            {assistenteMessages.length===0?(
              <div className="assistente-welcome">
                <div className="assistente-welcome-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6C47FF" strokeWidth="2"><path d="M12 8V4H8"/><rect x="2" y="2" width="20" height="15" rx="2" ry="2"/><path d="M16 11h2a2 2 0 0 1 2 2v1"/><path d="M14 20h.01"/><path d="M12 16h.01"/><path d="M10 20h.01"/></svg></div>
                <h3>Como posso ajudar?</h3>
                <p>Faça perguntas sobre reuniões, métricas, transcrições. Ex: "quantas vezes a palavra lugar aparece?"</p>
              </div>
            ):assistenteMessages.map((msg,i)=>(
              <div key={i} className={`assistente-message ${msg.role}`}>
                {msg.content.split('\n').map((line,j)=><React.Fragment key={j}>{j>0&&<br/>}{line}</React.Fragment>)}
              </div>
            ))}
            {assistenteLoading&&<div className="assistente-message bot"><div className="assistente-loading"><span className="assistente-loading-dot"/><span className="assistente-loading-dot"/><span className="assistente-loading-dot"/></div></div>}
          </div>
          <div className="assistente-input-area">
            <input className="assistente-input" placeholder="Digite sua pergunta..." value={assistenteInput} onChange={e=>setAssistenteInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleAssistenteSend()} disabled={assistenteLoading}/>
            <button className="assistente-send-btn" onClick={()=>handleAssistenteSend()} disabled={!assistenteInput.trim()||assistenteLoading}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const getPageContent = () => {
    if (loading&&!meetings.length&&activePage!=='transcricoes'&&activePage!=='analises'&&activePage!=='assistente') return <div className="loading">Carregando...</div>;
    switch(activePage) {
      case 'dashboard': return renderDashboard();
      case 'reunioes': return renderReunioes();
      case 'transcricoes': return renderTranscricoes();
      case 'analises': return renderAnalises();
      case 'assistente': return renderAssistente();
      default: return <div className="empty-state">Página em construção</div>;
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
      onSelectMeeting={handleSelectMeetingAndFilter}
      onSearchMeetings={setSearchTerm}
      isOnline={isOnline}
    >
      <div className="main-content">{getPageContent()}</div>
    </Layout>
  );
}

export default App;