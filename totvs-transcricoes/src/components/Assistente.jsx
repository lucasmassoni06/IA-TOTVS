import { useState, useRef, useEffect } from 'react';
import { askAssistente } from '../api';

const SUGESTOES = [
  { icon: '📊', text: 'Qual o total de reuniões?' },
  { icon: '🏢', text: 'Quantas unidades temos?' },
  { icon: '💰', text: 'Qual a faixa de faturamento predominante?' },
  { icon: '📝', text: 'Quantas transcrições estão disponíveis?' },
  { icon: '⭐', text: 'Qual o NPS médio?' },
];

export default function Assistente() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text) => {
    const question = text || input;
    if (!question.trim() || loading) return;
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setInput('');
    setLoading(true);
    try {
      const res = await askAssistente(question);
      setMessages((prev) => [...prev, { role: 'assistant', content: res.answer }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ Erro: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="assistente">
      <div className="assistente-chat">
        {messages.length === 0 && (
          <div className="assistente-welcome">
            <p>Pergunte sobre reuniões, NPS, segmentos, estados e mais.</p>
            <div className="sugestoes">
              {SUGESTOES.map((s, i) => (
                <button key={i} className="sugestao" onClick={() => send(s.text)}>
                  {s.icon} {s.text}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`assistente-message ${msg.role}`}>
            {msg.content.split('\n').map((line, j) => (
              <span key={j}>{j > 0 && <br />}{line}</span>
            ))}
          </div>
        ))}
        {loading && <div className="assistente-message assistant typing">Digitando...</div>}
        <div ref={endRef} />
      </div>
      <div className="assistente-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Digite sua pergunta..."
        />
        <button onClick={() => send()} disabled={loading}>Enviar</button>
      </div>
    </div>
  );
}