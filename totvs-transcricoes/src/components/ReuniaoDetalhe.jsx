import { useEffect, useState } from 'react';
import { getContexto } from '../api';

export default function ReuniaoDetalhe({ idMeeting, onVoltar }) {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    setLoading(true);
    setErro('');
    getContexto(idMeeting)
      .then(setDados)
      .catch((e) => setErro(e.message || 'Não foi possível carregar o contexto.'))
      .finally(() => setLoading(false));
  }, [idMeeting]);

  if (loading) return <div className="detalhe-loading">Preparando contexto…</div>;
  if (erro) return <div className="detalhe-erro">{erro}</div>;
  if (!dados) return null;

  const { cliente, fatos, insight, insight_origem, aviso } = dados;

  return (
    <div className="detalhe">
      <button className="detalhe-voltar" onClick={onVoltar}>← Voltar</button>

      <div className="detalhe-cabecalho">
        <h2>{cliente.nome_unidade || 'Cliente'}</h2>
        <p>{cliente.nome_segmento} · {cliente.uf} · {cliente.cnae}</p>
        <p className="detalhe-faixa">{cliente.faixa}</p>
      </div>

      <div className="detalhe-fatos">
        <div className="fato-card"><strong>{fatos.amostra}</strong><span>reuniões comparadas</span></div>
        <div className="fato-card"><strong>{fatos.media_nps ?? '—'}</strong><span>NPS médio</span></div>
        <div className="fato-card"><strong>{fatos.taxa_alta}%</strong><span>NPS ≥ 9</span></div>
        <div className="fato-card"><strong>{fatos.formato_top ?? '—'}</strong><span>formato predominante</span></div>
      </div>

      <div className="detalhe-insight">
        <h3>Insight da IA</h3>
        {insight_origem === 'fallback' && (
          <p className="detalhe-aviso-fallback">(Sem chave de IA configurada — exibindo fatos apurados.)</p>
        )}
        <div className="insight-texto">{insight}</div>
      </div>

      {aviso && <p className="detalhe-aviso">{aviso}</p>}
    </div>
  );
}