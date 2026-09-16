import { useEffect, useState } from 'react';
import { getExecutivos, getAgenda } from '../api';

export default function Inicio({ onSelectMeeting }) {
  const [executivos, setExecutivos] = useState([]);
  const [executivo, setExecutivo] = useState('');
  const [reunioes, setReunioes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  // Carrega a lista de executivos (simula o login) e seleciona o primeiro
  useEffect(() => {
    getExecutivos()
      .then((d) => {
        setExecutivos(d.executivos || []);
        if (d.executivos?.length) setExecutivo(d.executivos[0].executivo);
      })
      .catch(() => setErro('Não foi possível carregar os executivos.'));
  }, []);

  // Sempre que trocar de executivo, recarrega a agenda
  useEffect(() => {
    if (!executivo) return;
    setLoading(true);
    setErro('');
    getAgenda(executivo)
      .then((d) => setReunioes(d.reunioes || []))
      .catch(() => setErro('Não foi possível carregar a agenda.'))
      .finally(() => setLoading(false));
  }, [executivo]);

  const formatarData = (iso) =>
    new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  const formatarHora = (iso) =>
    new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="inicio">
      <div className="inicio-header">
        <div>
          <h2>Meu Dia</h2>
          <p>Suas próximas reuniões e o contexto para chegar preparado.</p>
        </div>
        <select value={executivo} onChange={(e) => setExecutivo(e.target.value)} className="inicio-select">
          {executivos.map((ex) => (
            <option key={ex.executivo} value={ex.executivo}>{ex.executivo}</option>
          ))}
        </select>
      </div>

      {erro && <div className="inicio-erro">{erro}</div>}
      {loading && <div className="inicio-loading">Carregando agenda…</div>}

      {!loading && !erro && reunioes.length === 0 && (
        <div className="inicio-vazio">Nenhuma reunião futura na agenda.</div>
      )}

      <div className="inicio-lista">
        {reunioes.map((r) => (
          <button key={r.id_agenda} className="inicio-card" onClick={() => onSelectMeeting(r.id_meeting)}>
            <div className="inicio-card-data">
              <span className="inicio-dia">{formatarData(r.inicio)}</span>
              <span className="inicio-hora">{formatarHora(r.inicio)}</span>
            </div>
            <div className="inicio-card-info">
              <strong>{r.nome_unidade || 'Cliente'}</strong>
              <span>{r.nome_segmento} · {r.uf}</span>
              <span className="inicio-card-meta">{r.formato_meeting} · {r.cnae}</span>
            </div>
            <span className="inicio-card-seta">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}