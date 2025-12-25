import { useEffect, useState } from 'react';

// [추가] 타입 정의
declare global {
  interface Window {
    versions: {
      app: () => Promise<string>;
    };
    updater?: {
      onUpdateAvailable: (callback: () => void) => void;
      onUpdateDownloaded: (callback: () => void) => void;
      // [추가] 재시작 함수 타입 정의
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
      window.updater.onUpdateAvailable(() => setUpdateStatus('업데이트 다운로드 중...'));
      
      window.updater.onUpdateDownloaded(() => {
        // [수정] 다운로드 완료 시 재시작 여부 묻기
        // confirm은 브라우저를 차단하므로, 실제로는 모달을 쓰는 게 좋지만 여기선 로직 연결에 집중합니다.
        // setTimeout을 사용하여 렌더링 후 실행되도록 하여 입력 잠김 방지
        setTimeout(() => {
          if (confirm('새로운 버전이 다운로드되었습니다. 지금 재시작하여 설치하시겠습니까?')) {
             setUpdateStatus('재시작 중...');
             // [추가] 메인 프로세스에 재시작 요청
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
      <div className="p-4 flex items-center justify-between border-b border-slate-700 h-16">
        {!isCollapsed && <div className="text-xl font-bold truncate">MiniPDM</div>}
        <button 
          onClick={onToggleCollapse}
          className={`text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700 transition-colors ${isCollapsed ? 'mx-auto' : ''}`}
        >
          {isCollapsed ? '☰' : '◀'}
        </button>
      </div>
      
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <SidebarButton page="dashboard" icon="📊" label="대시보드" />
        <SidebarButton page="materials" icon="🔩" label="소재 관리" />
        <SidebarButton page="clients" icon="🏢" label="거래처 관리" />
        <SidebarButton page="estimates" icon="💰" label="견적 관리" />
        <SidebarButton page="settings" icon="⚙️" label="환경 설정" />
      </nav>

      {/* [추가] 버전 및 업데이트 정보 표시 */}
      <div className="p-4 border-t border-slate-700 text-xs text-slate-500 text-center">
        {updateStatus ? (
          <div className="text-green-400 font-bold mb-1 animate-pulse">{updateStatus}</div>
        ) : (
          <div>v{appVersion || '...'}</div>
        )}
        {!isCollapsed && <div className="mt-2">© 2025 MiniPDM</div>}
      </div>

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