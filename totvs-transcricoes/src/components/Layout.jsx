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
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50">
      <aside className="w-full lg:w-80 bg-[#0f1419] text-white flex flex-col lg:h-screen">
        {/* Logo */}
        <div className="sidebar-logo p-6 border-b border-gray-800">
          <h1 className="text-2xl font-bold text-[#005CA9] tracking-tight">
            TOTVS Transcrições
          </h1>
        </div>

        {/* Navigation */}
        <nav className="px-4 py-6 space-y-2 flex-shrink-0">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                activePage === item.id
                  ? 'active bg-[#005CA9] text-white shadow-lg'
                  : 'hover:bg-[#1a1f2e] text-gray-200'
              }`}
              onClick={() => onNavigate(item.id)}
            >
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Filter Section */}
        <div className="border-t border-gray-700 px-4 py-6 flex-1 flex flex-col min-h-0">
          <div
            className="flex items-center justify-between mb-4 cursor-pointer select-none flex-shrink-0"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <span className="text-lg font-semibold flex items-center gap-2">
              📋 Reuniões
            </span>
            <span className="sidebar-badge bg-[#FEAC0E] text-black px-2 py-1 rounded-full text-xs font-medium">
              {meetings?.length ?? 0}
            </span>
          </div>

          {isFilterOpen && (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Search Input */}
              <div className="relative mb-4 flex-shrink-0">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none">
                  🔍
                </span>
                <input
                  className="sidebar-search-input w-full pl-10 pr-10 py-2.5 bg-[#1a1f2e] border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-[#005CA9] focus:border-2 transition-colors"
                  placeholder="Buscar reuniões..."
                  value={searchValue}
                  onChange={handleSearch}
                />
                {searchValue && (
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1 transition-colors"
                    onClick={handleClear}
                    type="button"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Meetings List */}
              <div className="sidebar-scroll flex-1 overflow-y-auto space-y-2 pr-1 -mr-1">
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
                        className={`sidebar-meeting-card p-3 rounded-xl cursor-pointer transition-all border-2 hover:bg-[#1a1f2e] hover:border-gray-500 ${
                          isSelected
                            ? 'selected border-[#005CA9] bg-[#005CA9]/20'
                            : 'border-transparent'
                        }`}
                        onClick={() => onSelectMeeting(mid)}
                      >
                        <div className="meeting-title font-medium text-sm truncate pr-2">
                          {title}
                        </div>
                        <div className="meeting-meta flex items-center gap-2 mt-1 text-xs text-gray-400">
                          <span>{dateFormatted}</span>
                          <span>•</span>
                          <span>{dur} min</span>
                          <span className="ml-auto text-base flex-shrink-0">{statusEmoji}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                          <span>{meeting.formato_meeting || '—'}</span>
                          <span>•</span>
                          <span>{meeting.uf || '—'}</span>
                          {meeting.nota_nps && (
                            <>
                              <span>•</span>
                              <span>NPS {meeting.nota_nps.toFixed(1)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-gray-500 text-center py-12 text-sm">
                    Nenhuma reunião encontrada
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="border-t border-gray-700 p-4 flex-shrink-0">
          <div className="font-medium text-sm truncate">Olá, {userName}</div>
          <div className="text-xs text-gray-400 truncate mt-0.5">{userEmail}</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default Layout;