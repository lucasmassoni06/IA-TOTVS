import { useEffect, useState } from 'react';
import { getAnalises } from '../api.js';
import PieChart from './charts/PieChart.jsx';
import LineChart from './charts/LineChart.jsx';
import BarList from './charts/BarList.jsx';

export default function Analises({ searchTerm }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getAnalises(searchTerm)
      .then((d) => setData(d || {}))
      .catch((err) => { if (err.name !== 'AbortError') setError(err); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [searchTerm]);

  if (loading) return <div className="loading">Carregando...</div>;
  if (error) return <div className="error">Erro ao carregar: {error.message}</div>;
  if (!data) return null;

  const m = data.metricas || {};
  return (
    <div className="analises">
      <div className="stats-grid">
        <div className="stat-card"><h3>Reuniões</h3><div className="stat-value">{m.total_reunioes ?? '—'}</div></div>
        <div className="stat-card"><h3>Duração média</h3><div className="stat-value">{m.duracao_media ?? '—'} min</div></div>
        <div className="stat-card"><h3>Clientes</h3><div className="stat-value">{m.total_clientes ?? '—'}</div></div>
        <div className="stat-card"><h3>Unidades</h3><div className="stat-value">{m.total_unidades ?? '—'}</div></div>
        <div className="stat-card"><h3>NPS médio</h3><div className="stat-value">{m.nps_medio ?? '—'}</div></div>
        <div className="stat-card"><h3>Transcrições</h3><div className="stat-value">{m.total_transcricoes ?? '—'}</div></div>
      </div>
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header"><h3>Reuniões por UF</h3></div>
          <PieChart data={data.por_uf || []} />
        </div>
        <div className="chart-card">
          <div className="chart-header"><h3>Reuniões por Mês</h3></div>
          <LineChart data={data.por_mes || []} />
        </div>
        <div className="chart-card">
          <div className="chart-header"><h3>Distribuição NPS</h3></div>
          <PieChart data={data.distribuicao_nps || []} colors={['#22c55e', '#f59e0b', '#ef4444', '#94a3b8']} />
        </div>
        <div className="chart-card">
          <div className="chart-header"><h3>Duração por Segmento</h3></div>
          <BarList data={data.duracao_por_segmento || []} labelKey="NOME_SEGMENTO" valueKey="duracao_media" colors={['#6366f1']} />
        </div>
        <div className="chart-card">
          <div className="chart-header"><h3>Top Unidades</h3></div>
          <BarList data={data.top_unidades || []} labelKey="NOME_UNIDADE" valueKey="count" colors={['#06b6d4']} />
        </div>
        <div className="chart-card">
          <div className="chart-header"><h3>Por Faturamento</h3></div>
          <BarList data={data.por_faturamento || []} labelKey="faixa" valueKey="count" colors={['#a855f7']} />
        </div>
      </div>
    </div>
  );
}