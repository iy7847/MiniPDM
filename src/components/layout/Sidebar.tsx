// [수정] 불필요한 React import 제거

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ currentPage, onNavigate, onLogout, isCollapsed, onToggleCollapse }: SidebarProps) {
  // 사이드바 버튼 헬퍼
  const SidebarButton = ({ page, icon, label }: { page: string, icon: string, label: string }) => (
    <button 
      onClick={() => onNavigate(page)}
      className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded transition-colors duration-200
        ${currentPage === page ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
      title={isCollapsed ? label : ''}
    >
      <span className="text-xl">{icon}</span>
      {!isCollapsed && <span className="ml-3 text-sm font-medium">{label}</span>}
    </button>
  );

  return (
    <aside 
      className={`${isCollapsed ? 'w-20' : 'w-64'} bg-slate-800 text-white flex flex-col transition-all duration-300 ease-in-out shadow-xl z-20 shrink-0`}
    >
      {/* 로고 및 토글 버튼 */}
      <div className="p-4 flex items-center justify-between border-b border-slate-700 h-16">
        {!isCollapsed && <div className="text-xl font-bold truncate">MiniPDM</div>}
        <button 
          onClick={onToggleCollapse}
          className={`text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700 transition-colors ${isCollapsed ? 'mx-auto' : ''}`}
        >
          {/* [수정] 접혔을 때 햄버거 아이콘(☰) 표시 */}
          {isCollapsed ? '☰' : '◀'}
        </button>
      </div>
      
      {/* 네비게이션 메뉴 */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <SidebarButton page="dashboard" icon="📊" label="대시보드" />
        <SidebarButton page="materials" icon="🔩" label="소재 관리" />
        <SidebarButton page="clients" icon="🏢" label="거래처 관리" />
        <SidebarButton page="estimates" icon="💰" label="견적 관리" />
        <SidebarButton page="settings" icon="⚙️" label="환경 설정" />
      </nav>

      {/* 하단 로그아웃 */}
      <div className="p-4 border-t border-slate-700">
        <button
          onClick={onLogout}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-center px-4'} py-2 text-sm text-slate-300 hover:text-white border border-slate-600 rounded hover:bg-slate-700 transition-colors`}
          title={isCollapsed ? "로그아웃" : ""}
        >
          <span>🚪</span>
          {!isCollapsed && <span className="ml-2">로그아웃</span>}
        </button>
      </div>
    </aside>
  );
}