import { useEffect, useState } from 'react';
import { getReunioes, normalize } from '../api';

export default function Reunioes({ searchTerm, selectedMeetingId, onSelectMeeting }) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getReunioes({ search: searchTerm, page, pageSize: 20 })
      .then((res) => {
        setData((res.data || []).map(normalize));
        setTotal(res.total || 0);
        setTotalPages(res.total_pages || 1);
      })
      .catch((err) => { if (err.name !== 'AbortError') setError(err); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [searchTerm, page]);

  if (loading) return <div className="loading">Carregando...</div>;
  if (error) return <div className="error">Erro ao carregar: {error.message}</div>;

  return (
    <div className="reunioes">
      <div className="results-info">{total} reuniões encontradas</div>
      <table className="meetings-table">
        <thead>
          <tr>
            <th>ID</th><th>Data</th><th>Unidade</th><th>UF</th><th>Segmento</th><th>Formato</th><th>Status</th><th>NPS</th><th>Duração</th>
          </tr>
        </thead>
        <tbody>
          {data.map((m) => (
            <tr key={m.id_meeting} onClick={() => onSelectMeeting(m.id_meeting)} className={selectedMeetingId === m.id_meeting ? 'selected' : ''}>
              <td>{m.id_meeting}</td>
              <td>{m.dt_meeting}</td>
              <td>{m.nome_unidade}</td>
              <td>{m.uf}</td>
              <td>{m.nome_segmento}</td>
              <td>{m.formato_meeting}</td>
              <td>{m.status_meeting}</td>
              <td>{m.nota_nps ?? '—'}</td>
              <td>{m.duracao_minutos ? `${Number(m.duracao_minutos).toFixed(1)} min` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
          <span>Página {page} de {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</button>
        </div>
      )}
    </div>
  );
}