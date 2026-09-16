import { useState } from 'react';

const NAV_ITEMS = [
  { id: 'inicio', label: 'Início', icon: '🏠' },
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'reunioes', label: 'Reuniões', icon: '📅' },
  { id: 'transcricoes', label: 'Transcrições', icon: '📝' },
  { id: 'analises', label: 'Análises', icon: '📈' },
  { id: 'assistente', label: 'Assistente', icon: '🤖' },
];

export default function Layout({ page, onNavigate, onSearchMeetings, isOnline, children }) {
  const [search, setSearch] = useState('');

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearch(value);
    onSearchMeetings(value);
  };

  const mostrarBusca = page !== 'inicio' && page !== 'detalhe';

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <strong className="logo">TOTVS</strong>
          <span className="logo-sub">Transcrições</span>
        </div>
        <nav className="nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item${page === item.id ? ' active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className={`sidebar-status ${isOnline ? 'online' : 'offline'}`}>
          <span className="status-dot" />
          {isOnline ? 'Servidor online' : 'Servidor offline'}
        </div>
      </aside>
      <main className="main">
        {mostrarBusca && (
          <header className="topbar">
            <input
              type="search"
              className="search-input"
              placeholder="Buscar reuniões..."
              value={search}
              onChange={handleSearch}
            />
          </header>
        )}
        {children}
      </main>
    </div>
  );
}