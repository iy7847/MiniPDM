import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

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
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // 사용자 정보 가져오기
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || null);
      }
    };
    fetchUser();
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
    <>
      {/* 모바일 사이드바 배경 (오버레이) */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-30 md:hidden"
          onClick={onToggleCollapse}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-40 md:relative md:translate-x-0 transition-transform duration-300 ease-in-out
          ${isCollapsed ? '-translate-x-full md:translate-x-0 md:w-20' : 'translate-x-0 w-64'}
          bg-slate-800 text-white flex flex-col shadow-xl shrink-0
        `}
      >
        {/* 로고 및 토글 버튼 */}
        <div className={`flex items-center border-b border-slate-700/50 h-16 shrink-0 transition-all duration-300 ${isCollapsed ? 'justify-center' : 'px-4 justify-between'}`}>
          {!isCollapsed && (
            <div
              onClick={onToggleCollapse}
              className="group flex items-center gap-2 cursor-pointer select-none"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-lg group-hover:scale-110 transition-transform">
                M
              </div>
              <span className="text-xl font-black tracking-tighter text-slate-100 group-hover:text-blue-400 transition-colors">
                MiniPDM
              </span>
            </div>
          )}

          <button
            onClick={onToggleCollapse}
            className={`
              flex items-center justify-center rounded-xl transition-all duration-300
              ${isCollapsed
                ? 'w-12 h-12 bg-blue-600 text-white shadow-lg rotate-0'
                : 'w-8 h-8 text-slate-400 hover:text-white hover:bg-slate-700 -rotate-180'
              }
            `}
            title={isCollapsed ? "펼치기" : "접기"}
          >
            <span className={isCollapsed ? "text-xl" : "text-base"}>
              {isCollapsed ? '☰' : '◀'}
            </span>
          </button>
        </div>

        {/* 네비게이션 메뉴 */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <SidebarButton page="dashboard" icon="📊" label="대시보드" />
          <SidebarButton page="materials" icon="🔩" label="소재 관리" />
          <SidebarButton page="clients" icon="🏢" label="거래처 관리" />
          <SidebarButton page="estimates" icon="💰" label="견적 관리" />
          <SidebarButton page="estimate-search" icon="🔍" label="견적 검색" /> {/* [New] */}
          <SidebarButton page="orders" icon="📦" label="수주/발주" />
          <SidebarButton page="shipments" icon="🚛" label="출하 관리" />
          <SidebarButton page="expense-analysis" icon="📉" label="지출 분석" />
          <SidebarButton page="settings" icon="⚙️" label="환경 설정" />
        </nav>


        {/* 하단 로그아웃 및 사용자 정보 */}
        <div className="p-4 border-t border-slate-700 shrink-0 space-y-4">
          {!isCollapsed && userEmail && (
            <div className="px-1 py-1 animate-fade-in">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black shadow-lg border border-blue-400/30">
                  {userEmail[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter leading-none mb-1">Status: Online</p>
                  <p className="text-sm font-black text-slate-100 truncate tracking-tight">{userEmail.split('@')[0]}</p>
                </div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-2.5 border border-slate-600/50">
                <p className="text-[11px] text-blue-300 font-bold leading-relaxed">
                  ✨ 오늘도 멋진 성과 기원합니다! <br />
                  <span className="text-slate-400 font-medium">{userEmail}</span>
                </p>
              </div>
            </div>
          )}

          <button
            onClick={onLogout}
            className={`w-full flex items-center ${isCollapsed ? 'md:justify-center' : 'justify-center px-4'} py-2.5 text-sm text-slate-300 hover:text-white border border-slate-600 rounded-lg hover:bg-slate-700 transition-all active:scale-95 group shadow-sm mb-4`}
            title={isCollapsed ? "로그아웃" : ""}
          >
            <span className="group-hover:translate-x-1 transition-transform">🚪</span>
            {!isCollapsed && <span className="ml-2 font-bold">로그아웃</span>}
          </button>

          {!isCollapsed && (
            <div className="text-center opacity-30 hover:opacity-100 transition-opacity">
              <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                {appVersion || 'v0.0.0'} • © 2025 MiniPDM
              </p>
              {updateStatus && <p className="text-[9px] text-green-400 font-bold mt-1 animate-pulse">{updateStatus}</p>}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
