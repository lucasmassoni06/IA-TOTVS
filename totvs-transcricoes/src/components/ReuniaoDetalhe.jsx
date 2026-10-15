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
  const motivoInsight = dados.insight_motivo;
  const mensagensInsight = {
    chave_ausente: 'Sem chave de IA configurada.',
    timeout: 'A chamada excedeu o tempo limite. Tente novamente.',
    conexao: 'Não foi possível conectar ao provedor de IA. Confira a URL e a conexão do backend.',
    url_invalida: 'A URL configurada para a API de IA é inválida.',
    resposta_invalida: 'O provedor de IA retornou uma resposta inválida.',
    sem_conteudo: 'O provedor de IA respondeu, mas não retornou texto.',
    http_401: 'O provedor recusou a chave (HTTP 401). Confira a credencial usada pelo backend.',
    http_403: 'O provedor negou acesso (HTTP 403). Confira as permissões da chave e do modelo.',
    http_404: 'O endpoint ou modelo não foi encontrado (HTTP 404). Confira AI_API_URL e AI_MODEL.',
    http_429: 'O provedor limitou a chamada ou a cota acabou (HTTP 429). Confira sua cota e tente novamente.',
  };
  const mensagemInsight = mensagensInsight[motivoInsight]
    || (motivoInsight?.startsWith('http_')
      ? `O provedor de IA respondeu com ${motivoInsight.slice(5)}. Consulte o log do backend.`
      : 'Não foi possível gerar o insight. Consulte o log do backend.');

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
          <p className="detalhe-aviso-fallback">
            ({mensagemInsight} Exibindo fatos apurados.)
          </p>
        )}
        <div className="insight-texto">{insight}</div>
      </div>

      {aviso && <p className="detalhe-aviso">{aviso}</p>}
    </div>
  );
}