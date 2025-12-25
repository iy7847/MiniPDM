import { useEffect, useState } from 'react';

// 타입 정의 (src/vite-env.d.ts와 중복될 수 있으나 컴포넌트 독립성을 위해 포함하거나 병합 필요)
declare global {
  interface Window {
    versions: {
      app: () => Promise<string>;
    };
    updater?: {
      onUpdateAvailable: (callback: (info: any) => void) => void;
      onUpdateDownloaded: (callback: (info: any) => void) => void;
      restart: () => void;
    };
  }
}

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ currentPage, onNavigate, onLogout, isCollapsed, onToggleCollapse }: SidebarProps) {
  const [appVersion, setAppVersion] = useState('');
  const [updateStatus, setUpdateStatus] = useState('');

  useEffect(() => {
    // 버전 가져오기
    if (window.versions) {
      window.versions.app().then(setAppVersion);
    }

    // 업데이트 이벤트 리스너
    if (window.updater) {
      window.updater.onUpdateAvailable((info: any) => {
        setUpdateStatus(`업데이트 다운로드 중... (v${info.version})`);
      });
      
      window.updater.onUpdateDownloaded((info: any) => {
        // 렌더링 사이클과 충돌 방지를 위해 setTimeout 사용
        setTimeout(() => {
          // 릴리즈 노트 포맷팅
          let releaseNotes = '';
          if (info.releaseNotes) {
             const notes = Array.isArray(info.releaseNotes) 
               ? info.releaseNotes.map((n: any) => n.note).join('\n') 
               : info.releaseNotes;
             // HTML 태그 제거 (간단히)
             const cleanNotes = notes.replace(/<[^>]*>?/gm, '');
             releaseNotes = `\n\n[업데이트 내용]\n${cleanNotes}`;
          }

          const message = `새로운 버전(v${info.version})이 준비되었습니다.${releaseNotes}\n\n지금 재시작하여 설치하시겠습니까?`;

          if (confirm(message)) {
             setUpdateStatus('재시작 중...');
             window.updater?.restart();
          } else {
             setUpdateStatus('업데이트 대기 중 (재시작 시 적용)');
          }
        }, 100);
      });
    }
  }, []);

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

      {/* 버전 및 업데이트 정보 표시 */}
      <div className="p-4 border-t border-slate-700 text-xs text-slate-500 text-center">
        {updateStatus ? (
          <div className="text-green-400 font-bold mb-1 animate-pulse">{updateStatus}</div>
        ) : (
          <div>v{appVersion || '...'}</div>
        )}
        {!isCollapsed && <div className="mt-2">© 2025 MiniPDM</div>}
      </div>

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