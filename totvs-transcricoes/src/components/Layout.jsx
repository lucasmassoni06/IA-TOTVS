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
  onSearchMeetings
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
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'reunioes', label: 'Reuniões', icon: '👥' },
    { id: 'transcricoes', label: 'Transcrições', icon: '📝' },
    { id: 'analises', label: 'Análises', icon: '📈' },
    { id: 'configuracoes', label: 'Configurações', icon: '⚙️' }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* ===== HEADER ===== */}
      <header className="header-main">
        <div className="header-container">
          <div className="header-brand">
            <div className="header-logo">
              <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
                <rect width="34" height="34" rx="9" fill="#005CA9"/>
                <text x="17" y="23" textAnchor="middle" fill="white" fontSize="19" fontWeight="bold" fontFamily="Inter, sans-serif">T</text>
              </svg>
            </div>
            <div className="header-title">
              <span className="header-name">TOTVS</span>
              <span className="header-subtitle">Transcrições</span>
            </div>
          </div>
          <div className="header-actions">
            <button className="header-btn header-btn-outline">Entrar</button>
            <button className="header-btn header-btn-primary">Criar Conta</button>
          </div>
        </div>
      </header>

      {/* ===== BODY ===== */}
      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <aside className="sidebar-main">
          {/* User */}
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {(userName || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">Olá, {userName}</div>
              <div className="sidebar-user-email">{userEmail}</div>
            </div>
          </div>

          {/* Navigation */}
          <div className="sidebar-section">
            <div className="sidebar-section-label">Menu</div>
            <nav className="sidebar-nav">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  className={`sidebar-nav-item ${activePage === item.id ? 'active' : ''}`}
                  onClick={() => onNavigate(item.id)}
                >
                  <span className="sidebar-nav-icon">{item.icon}</span>
                  <span className="sidebar-nav-label">{item.label}</span>
                  {activePage === item.id && <span className="sidebar-nav-indicator" />}
                </button>
              ))}
            </nav>
          </div>

          {/* Meetings */}
          <div className="sidebar-section sidebar-section-meetings">
            <div className="sidebar-section-header" onClick={() => setIsFilterOpen(!isFilterOpen)}>
              <div className="sidebar-section-label">Reuniões</div>
              <div className="sidebar-section-actions">
                <span className="sidebar-badge">{meetings?.length ?? 0}</span>
                <button className={`sidebar-collapse-btn ${isFilterOpen ? 'open' : ''}`} type="button">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>

            {isFilterOpen && (
              <div className="sidebar-meetings-container">
                <div className="sidebar-search-wrapper">
                  <svg className="sidebar-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input
                    className="sidebar-search-input"
                    placeholder="Buscar reuniões..."
                    value={searchValue}
                    onChange={handleSearch}
                  />
                  {searchValue && (
                    <button className="sidebar-search-clear" onClick={handleClear} type="button">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                      </svg>
                    </button>
                  )}
                </div>

                <div className="sidebar-scroll sidebar-meetings-list">
                  {meetings?.length > 0 ? (
                    meetings.map((meeting) => {
                      const mid = meeting.id_meeting;
                      const title = meeting.nome_unidade || `Reunião ${mid}`;
                      const dateFormatted = meeting.dt_meeting
                        ? new Date(meeting.dt_meeting).toLocaleDateString('pt-BR')
                        : '—';
                      const dur = meeting.duracao_minutos ? meeting.duracao_minutos.toFixed(0) : '?';
                      const isSelected = selectedMeetingId && selectedMeetingId === mid;
                      const statusEmoji = getStatusEmoji(meeting.status_meeting);

                      return (
                        <div
                          key={mid}
                          className={`sidebar-meeting-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => onSelectMeeting(mid)}
                        >
                          <div className="sidebar-meeting-top">
                            <span className="sidebar-meeting-title">{title}</span>
                            <span className="sidebar-meeting-status">{statusEmoji}</span>
                          </div>
                          <div className="sidebar-meeting-meta">
                            <span>{dateFormatted}</span>
                            <span className="meta-dot">•</span>
                            <span>{dur} min</span>
                            <span className="meta-dot">•</span>
                            <span>{meeting.formato_meeting || '—'}</span>
                          </div>
                          <div className="sidebar-meeting-tags">
                            {meeting.uf && <span className="sidebar-tag">{meeting.uf}</span>}
                            {meeting.nota_nps && <span className="sidebar-tag sidebar-tag-nps">NPS {meeting.nota_nps.toFixed(1)}</span>}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="sidebar-empty">
                      <span className="sidebar-empty-icon">📭</span>
                      <span className="sidebar-empty-text">Nenhuma reunião encontrada</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="content-main">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;