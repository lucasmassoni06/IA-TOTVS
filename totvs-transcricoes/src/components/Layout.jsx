import React, { useState } from 'react';

const Layout = ({
  activePage,
  onNavigate,
  userName,
  userEmail,
  meetings,
  selectedMeetingId,
  onSelectMeeting,
  onSearchMeetings,
  children
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
    switch (status) {
      case 'COMPLETED': return '🟢';
      case 'CANCELED': return '🔴';
      case 'SCHEDULED': return '🟡';
      case 'IN_PROGRESS': return '🟠';
      default: return '';
    }
  };

  const navItems = [
    { icon: '📊', label: 'Dashboard', page: 'dashboard' },
    { icon: '👥', label: 'Reuniões', page: 'reunioes' },
    { icon: '📝', label: 'Transcrições', page: 'transcricoes' },
    { icon: '📈', label: 'Análises', page: 'analises' },
    { icon: '⚙️', label: 'Configurações', page: 'configuracoes' }
  ];

  return (
    <div className="flex" style={{ height: '100vh', overflow: 'hidden' }}>
      <aside className="w-72 bg-black text-white flex flex-col flex-shrink-0 p-6" style={{ height: '100vh', overflow: 'hidden' }}>
        <div className="text-2xl font-bold mb-6 text-white tracking-tight flex-shrink-0">
          TOTVS
          <div className="text-xl font-normal text-yellow-400">Transcrições</div>
        </div>

        <nav className="space-y-1 mb-6 flex-shrink-0">
          {navItems.map((item) => (
            <button
              key={item.page}
              onClick={() => onNavigate(item.page)}
              className={`w-full text-left p-3 rounded-lg flex items-center space-x-3 transition-colors ${
                activePage === item.page
                  ? 'bg-gray-700 text-white'
                  : 'hover:bg-gray-800 text-gray-300 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="space-y-3 flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-center flex-shrink-0">
            <h3 className="font-semibold text-lg">Reuniões</h3>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {isFilterOpen ? '▲' : '▼'}
            </button>
          </div>
          <div className="relative flex-shrink-0">
            <input
              type="text"
              value={searchValue}
              onChange={handleSearch}
              placeholder="Buscar reuniões..."
              className="w-full bg-gray-800 border border-gray-700 text-white p-3 rounded-lg pr-10 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
            {searchValue && (
              <button
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            )}
          </div>
          {isFilterOpen && (
            <div className="flex-1 overflow-y-auto space-y-2 pt-3 border-t border-gray-700 min-h-0">
              {meetings.length === 0 ? (
                <div className="text-gray-400 text-center py-8 text-sm">
                  Nenhuma reunião encontrada
                </div>
              ) : (
                meetings.map((meeting) => {
                  const meetingId = meeting.id_meeting;
                  const title = meeting.nome_unidade || meetingId;
                  const dateFormatted = meeting.dt_meeting
                    ? new Date(meeting.dt_meeting).toLocaleDateString('pt-BR')
                    : '—';
                  const duracao = meeting.duracao_minutos
                    ? meeting.duracao_minutos.toFixed(1)
                    : '?';
                  const statusEmoji = getStatusEmoji(meeting.status_meeting);
                  const npsText = meeting.nota_nps
                    ? `• NPS ${meeting.nota_nps.toFixed(1)}`
                    : '';
                  const isSelected = selectedMeetingId && selectedMeetingId === meetingId;

                  return (
                    <div
                      key={meetingId || Math.random()}
                      onClick={() => onSelectMeeting(meetingId)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors flex flex-col ${
                        isSelected
                          ? 'bg-blue-900/50 border border-blue-500/50'
                          : 'hover:bg-gray-800'
                      }`}
                    >
                      <div className="font-semibold text-sm mb-1 truncate">{title}</div>
                      <div className="text-xs text-gray-300 mb-1">
                        {dateFormatted} • {duracao} min
                      </div>
                      <div className="text-xs text-gray-400 flex items-center justify-between">
                        <span>
                          {meeting.formato_meeting || '—'} {meeting.uf || '—'} {npsText}
                        </span>
                        <span>{statusEmoji}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="mt-auto pt-6 border-t border-gray-800 flex-shrink-0">
          <div className="font-semibold text-sm mb-1 truncate">{userName}</div>
          <div className="text-xs text-gray-400 truncate">{userEmail}</div>
        </div>
      </aside>

      <main className="flex-1" style={{ height: '100vh', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
};

export default Layout;