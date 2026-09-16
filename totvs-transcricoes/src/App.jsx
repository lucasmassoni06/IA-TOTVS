import ErrorBoundary from './ErrorBoundary';
import { useEffect, useState } from 'react';
import './App.css';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Reunioes from './components/Reunioes';
import Transcricoes from './components/Transcricoes';
import Analises from './components/Analises';
import Assistente from './components/Assistente';
import Inicio from './components/Inicio';
import ReuniaoDetalhe from './components/ReuniaoDetalhe';
import { getHealth, getReunioes, normalize } from './api';

export default function App() {
  const [page, setPage] = useState('inicio');
  const [detalheId, setDetalheId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [meetings, setMeetings] = useState([]);

  useEffect(() => {
    const check = async () => {
      try {
        await getHealth();
        setIsOnline(true);
      } catch {
        setIsOnline(false);
      }
    };
    check();
    const i = setInterval(check, 30000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getReunioes({ page: 1, pageSize: 100 })
      .then((res) => setMeetings((res.data || []).map(normalize)))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const handleSelectMeetingAndFilter = (id) => {
    setSelectedMeetingId(id);
    setPage('reunioes');
  };

  const abrirContexto = (id) => {
    setDetalheId(id);
    setPage('detalhe');
  };

  const voltarParaInicio = () => {
    setDetalheId(null);
    setPage('inicio');
  };

  const navegar = (destino) => {
    setDetalheId(null);
    setPage(destino);
  };

  const getPageContent = () => {
    switch (page) {
      case 'inicio':
        return <Inicio onSelectMeeting={abrirContexto} />;
      case 'detalhe':
        return detalheId
          ? <ReuniaoDetalhe idMeeting={detalheId} onVoltar={voltarParaInicio} />
          : <Inicio onSelectMeeting={abrirContexto} />;
      case 'dashboard':
        return <Dashboard searchTerm={searchTerm} />;
      case 'reunioes':
        return (
          <Reunioes
            searchTerm={searchTerm}
            selectedMeetingId={selectedMeetingId}
            onSelectMeeting={handleSelectMeetingAndFilter}
          />
        );
      case 'transcricoes':
        return <Transcricoes />;
      case 'analises':
        return <Analises searchTerm={searchTerm} />;
      case 'assistente':
        return <Assistente />;
      default:
        return <Dashboard searchTerm={searchTerm} />;
    }
  };

  return (
    <ErrorBoundary>
      <Layout
        page={page}
        onNavigate={navegar}
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
    </ErrorBoundary>
  );
}