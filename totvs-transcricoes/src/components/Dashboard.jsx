import { useEffect, useState } from 'react';
import { getEstatisticas } from '../api.js';
import PieChart from './charts/PieChart.jsx';
import LineChart from './charts/LineChart.jsx';
import RingChart from './charts/RingChart.jsx';
import BarList from './charts/BarList.jsx';

export default function Dashboard({ searchTerm }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getEstatisticas(searchTerm)
      .then((d) => setStats(d || {}))
      .catch((err) => { if (err.name !== 'AbortError') setError(err); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [searchTerm]);

  if (loading) return <div className="loading">Carregando...</div>;
  if (error) return <div className="error">Erro ao carregar: {error.message}</div>;
  if (!stats) return null;

  return (
    <div className="dashboard">
      <div className="stats-grid">
        <div className="stat-card"><h3>Reuniões</h3><div className="stat-value">{stats.total_reunioes ?? '—'}</div></div>
        <div className="stat-card"><h3>Transcrições</h3><div className="stat-value">{stats.total_transcricoes ?? '—'}</div></div>
        <div className="stat-card"><h3>Clientes</h3><div className="stat-value">{stats.total_clientes ?? '—'}</div></div>
        <div className="stat-card"><h3>Unidades</h3><div className="stat-value">{stats.total_unidades ?? '—'}</div></div>
        <div className="stat-card"><h3>Duração média</h3><div className="stat-value">{stats.duracao_media_minutos ?? '—'} min</div></div>
        <div className="stat-card"><h3>NPS médio</h3><div className="stat-value">{stats.nps_medio ?? '—'}</div></div>
      </div>
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header"><h3>Reuniões por Formato</h3></div>
          <PieChart data={stats.reunioes_por_formato || []} />
        </div>
        <div className="chart-card">
          <div className="chart-header"><h3>Reuniões por Status</h3></div>
          <PieChart data={stats.reunioes_por_status || []} colors={['#22c55e', '#f59e0b', '#ef4444', '#6366f1']} />
        </div>
        <div className="chart-card">
          <div className="chart-header"><h3>Reuniões por Mês</h3></div>
          <LineChart data={stats.reunioes_por_mes || []} />
        </div>
        <div className="chart-card">
          <div className="chart-header"><h3>NPS Médio</h3></div>
          <RingChart value={Number(stats.nps_medio) || 0} max={10} label="NPS" />
        </div>
        <div className="chart-card">
          <div className="chart-header"><h3>Reuniões por UF</h3></div>
          <BarList data={stats.reunioes_por_uf || []} labelKey="UF" valueKey="count" colors={['#6366f1']} />
        </div>
        <div className="chart-card">
          <div className="chart-header"><h3>Segmentos mais comuns</h3></div>
          <BarList data={stats.segmentos_mais_comuns || []} labelKey="NOME_SEGMENTO" valueKey="count" colors={['#22c55e']} />
        </div>
      </div>
    </div>
  );
}