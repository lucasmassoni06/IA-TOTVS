import { useEffect, useState } from 'react';
import { getPalavrasChave } from '../api';

export default function Transcricoes() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const controller = new AbortController();
    const t = setTimeout(() => {
      setLoading(true);
      setError(null);
      getPalavrasChave(query)
        .then((d) => setResults(d || []))
        .catch((err) => { if (err.name !== 'AbortError') setError(err); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 400);
    return () => { clearTimeout(t); controller.abort(); };
  }, [query]);

  return (
    <div className="transcricoes">
      <input
        type="search"
        placeholder="Buscar palavra-chave nas transcrições..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {loading && <div className="loading">Buscando...</div>}
      {error && <div className="error">Erro: {error.message}</div>}
      {!loading && !error && results.length === 0 && query.trim() && (
        <div className="empty">Nenhuma ocorrência encontrada</div>
      )}
      <div className="transcricoes-list">
        {results.map((item, idx) => {
          const falas = (item.ANON_TRANSCRICAO || '').split(/(?=\[LOCUTOR \d+\]:|\[LOCAL\]:|\[PESSOA\]:|\[EMPRESA\]:)/g).filter((x) => x.trim());
          return (
            <div key={`${item.ID_MEETING}-${idx}`} className="transcricao-card">
              <div className="transcricao-header">
                <strong>{item.nome_unidade || item.NOME_UNIDADE}</strong>
                <span>{item.dt_meeting || item.DT_MEETING}</span>
              </div>
              <div className="transcricao-trecho">{item.trecho}</div>
              {falas.map((fala, i) => (
                <div key={`${idx}-${i}`} className="transcricao-item">{fala.trim()}</div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}