import React, { useState } from 'react';

const Layout = ({
  children,
  activePage,
  onNavigate,
  userName,
  userEmail,
  meetings,
  selectedMeetingId,
  onSelectMeeting,
  onSearchMeetings,
  isOnline
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [searchValue, setSearchValue] = useState('');

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchValue(value);
    onSearchMeetings(value);
  };

  const handleClear = () => {
    setSearchValue('');
    onSearchMeetings('');
  };

  const getStatusEmoji = (status) => {
    switch ((status || '').toUpperCase()) {
      case 'COMPLETED': return '🟢';
      case 'CANCELED': return '🔴';
      case 'SCHEDULED': return '🟡';
      case 'IN_PROGRESS': return '🟠';
      default: return '⚪';
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>' },
    { id: 'analises', label: 'Análises', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 16v-3"/><path d="M12 16v-7"/><path d="M17 16V8"/></svg>' },
    { id: 'reunioes', label: 'Reuniões', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
    { id: 'assistente', label: 'Assistente IA', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect x="2" y="2" width="20" height="15" rx="2" ry="2"/><path d="M16 11h2a2 2 0 0 1 2 2v1"/><path d="M14 20h.01"/><path d="M12 16h.01"/><path d="M10 20h.01"/></svg>' },
    { id: 'transcricoes', label: 'Transcrições', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' }
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F4F7FE' }}>
      <header className="header-main">
        <div className="header-container">
          <div className="header-brand">
            <div className="header-logo">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <rect width="36" height="36" rx="10" fill="#6C47FF"/>
                <text x="18" y="24" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold" fontFamily="Inter, sans-serif">T</text>
              </svg>
            </div>
            <div className="header-title">
              <span className="header-name">TOTVS</span>
              <span className="header-subtitle">Transcrições</span>
            </div>
          </div>
          <nav className="header-nav">
            {navItems.map((item) => (
              <button key={item.id} className={`header-nav-item ${activePage === item.id ? 'active' : ''}`} onClick={() => onNavigate(item.id)}>
                <span className="header-nav-icon" dangerouslySetInnerHTML={{ __html: item.icon }} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="header-actions">
            <div className={`header-status ${isOnline ? 'online' : 'offline'}`}>
              <span className="header-status-dot" />
              {isOnline ? 'Online' : 'Offline'}
            </div>
            <button className="header-btn header-btn-outline">Entrar</button>
            <button className="header-btn header-btn-primary">Criar Conta</button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="sidebar-main">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{(userName || 'U').charAt(0).toUpperCase()}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">Olá, {userName}</div>
              <div className="sidebar-user-email">{userEmail}</div>
            </div>
          </div>
          <div className="sidebar-section sidebar-section-meetings">
            <div className="sidebar-section-header" onClick={() => setIsFilterOpen(!isFilterOpen)}>
              <div className="sidebar-section-label">Reuniões</div>
              <div className="sidebar-section-actions">
                <span className="sidebar-badge">{meetings?.length ?? 0}</span>
                <button className={`sidebar-collapse-btn ${isFilterOpen ? 'open' : ''}`} type="button">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            </div>
            {isFilterOpen && (
              <div className="sidebar-meetings-container">
                <div className="sidebar-search-wrapper">
                  <svg className="sidebar-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <input className="sidebar-search-input" placeholder="Buscar reuniões..." value={searchValue} onChange={handleSearch} />
                  {searchValue && <button className="sidebar-search-clear" onClick={handleClear} type="button"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>}
                </div>
                <div className="sidebar-scroll sidebar-meetings-list">
                  {meetings?.length > 0 ? meetings.map((meeting) => {
                    const mid = meeting.id_meeting;
                    const title = meeting.nome_unidade || `Reunião ${mid}`;
                    const dateFormatted = meeting.dt_meeting ? new Date(meeting.dt_meeting).toLocaleDateString('pt-BR') : '—';
                    const dur = meeting.duracao_minutos ? meeting.duracao_minutos.toFixed(0) : '?';
                    const isSelected = selectedMeetingId && selectedMeetingId === mid;
                    return (
                      <div key={mid} className={`sidebar-meeting-card ${isSelected ? 'selected' : ''}`} onClick={() => onSelectMeeting(mid)}>
                        <div className="sidebar-meeting-top">
                          <span className="sidebar-meeting-title">{title}</span>
                          <span className="sidebar-meeting-status">{getStatusEmoji(meeting.status_meeting)}</span>
                        </div>
                        <div className="sidebar-meeting-meta">
                          <span>{dateFormatted}</span><span className="meta-dot">•</span><span>{dur} min</span><span className="meta-dot">•</span><span>{meeting.formato_meeting || '—'}</span>
                        </div>
                        <div className="sidebar-meeting-tags">
                          {meeting.uf && <span className="sidebar-tag">{meeting.uf}</span>}
                          {meeting.nota_nps && <span className="sidebar-tag sidebar-tag-nps">NPS {meeting.nota_nps.toFixed(1)}</span>}
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="sidebar-empty">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5"><path d="M4 21h16"/><path d="M4 3v18"/><path d="M4 3h12l4 4v14"/></svg>
                      <span className="sidebar-empty-text">Nenhuma reunião encontrada</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>
        <main className="content-main">{children}</main>
      </div>
      <footer className="app-footer">© 2026 TOTVS Transcrições · Construído com foco em desenvolvimento</footer>
    </div>
  );
};

export default Layout;