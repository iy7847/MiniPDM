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

  const PAGE_STORAGE_KEYS: Record<string, string[]> = {
    estimates: ['estimates_filters'],
    'estimate-search': ['estimate_search_keyword', 'estimate_search_noteKeyword', 'estimate_search_statusFilter', 'estimate_search_sizeW', 'estimate_search_sizeD', 'estimate_search_sizeH', 'estimate_search_tolerance'],
    orders: ['orders_filters'],
    shipments: ['shipments_filters'],
    production: ['production_activeTab', 'production_viewStatus', 'production_filters', 'production_keyword'],
    'expense-analysis': ['expense_filters', 'expense_materials', 'expense_pp', 'expense_ht'],
    clients: ['clients_searchTerm'],
    materials: ['materials_activeTab'],
  };

  const SidebarButton = ({ page, icon, label }: { page: string, icon: string, label: string }) => {
    const isActive = currentPage === page;

    const handleClick = () => {
      // 1번 방식 반영: 현재 활성화된(페이지) 메뉴를 "다시" 클릭했을 때만 초기화되도록 수정
      if (isActive) {
        const keysToClear = PAGE_STORAGE_KEYS[page];
        if (keysToClear) {
          keysToClear.forEach(key => {
            try {
              sessionStorage.removeItem(key);
            } catch (e) { }
          });
        }
      }
      onNavigate(page);
    };

    return (
      <button
        onClick={handleClick}
        className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-xl transition-all duration-300 group relative overflow-hidden
        ${isActive
            ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 font-bold'
            : 'text-slate-300 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/5 font-medium'}`}
        title={isCollapsed ? label : ''}
      >
        {/* Active Indicator */}
        {isActive && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-brand-200 shadow-[0_0_10px_rgba(199,210,254,0.8)]"></div>}

        <span className={`text-xl transition-all duration-300 ${isActive ? 'scale-110 drop-shadow-md' : 'group-hover:scale-110 drop-shadow-sm'}`}>{icon}</span>

        {!isCollapsed && (
          <span className={`ml-3 tracking-wide transition-all duration-300 ${isActive ? 'translate-x-1 drop-shadow-sm text-[15px]' : 'text-sm group-hover:translate-x-1'}`}>
            {label}
          </span>
        )}

        {isActive && !isCollapsed && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-200 animate-pulse shadow-[0_0_8px_rgba(199,210,254,1)]"></div>
        )}
      </button>
    );
  };

  return (
    <>
      {/* 모바일 사이드바 배경 (오버레이) */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300"
          onClick={onToggleCollapse}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-40 md:relative md:translate-x-0 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)
          ${isCollapsed ? '-translate-x-full md:translate-x-0 md:w-24' : 'translate-x-0 w-[280px]'}
          bg-[#1e2330] flex flex-col border-r border-[#2a3040] shrink-0 shadow-2xl
        `}
      >
        {/* 로고 및 토글 버튼 */}
        <div className={`flex items-center border-b border-white/5 h-20 shrink-0 transition-all duration-300 ${isCollapsed ? 'justify-center' : 'px-6 justify-between'}`}>
          {!isCollapsed && (
            <div
              onClick={onToggleCollapse}
              className="group flex items-center gap-3 cursor-pointer select-none"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-glow group-hover:scale-110 transition-transform duration-300">
                M
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tighter text-white group-hover:text-brand-300 transition-colors leading-none">
                  MiniPDM
                </span>
                <span className="text-[9px] font-bold text-slate-500 tracking-[0.2em] uppercase mt-0.5">Premium</span>
              </div>
            </div>
          )}

          <button
            onClick={onToggleCollapse}
            className={`
              flex items-center justify-center rounded-xl transition-all duration-300
              ${isCollapsed
                ? 'w-10 h-10 bg-slate-800 text-brand-400 border border-slate-700 hover:border-brand-500 hover:text-white shadow-soft'
                : 'w-8 h-8 text-slate-500 hover:text-white hover:bg-slate-800/80 -rotate-180'
              }
            `}
            title={isCollapsed ? "펼치기" : "접기"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={isCollapsed ? 2.5 : 2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        </div>

        {/* 네비게이션 메뉴 */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto scrollbar-hide">
          <div className="px-2 mb-2 mt-4">
            {!isCollapsed && <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-2">Menu</p>}
          </div>
          <SidebarButton page="dashboard" icon="📊" label="대시보드" />
          <SidebarButton page="materials" icon="🔩" label="소재 관리" />
          <SidebarButton page="clients" icon="🏢" label="거래처 관리" />
          <div className="my-2 border-t border-white/5 mx-2"></div>
          <SidebarButton page="estimates" icon="💰" label="견적 관리" />
          <SidebarButton page="estimate-search" icon="🔍" label="견적 검색" />
          <SidebarButton page="orders" icon="📦" label="수주/발주" />
          <div className="my-2 border-t border-white/5 mx-2"></div>
          <SidebarButton page="production" icon="🏭" label="생산 관리" />
          <SidebarButton page="shipments" icon="🚛" label="출하 관리" />
          <SidebarButton page="expense-analysis" icon="📉" label="지출 분석" />
          <div className="mt-8"></div>
          <SidebarButton page="settings" icon="⚙️" label="환경 설정" />
        </nav>

        {/* 하단 로그아웃 및 사용자 정보 */}
        <div className="p-5 border-t border-white/5 shrink-0 bg-black/20 backdrop-blur-sm">
          {!isCollapsed && userEmail && (
            <div className="px-1 py-1 mb-4 flex items-center gap-3 animate-fade-in group cursor-default">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-white font-bold shadow-lg border border-slate-600 group-hover:border-brand-500 transition-colors">
                  {userEmail[0].toUpperCase()}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-200 truncate">{userEmail.split('@')[0]}</p>
                <p className="text-[10px] text-slate-500 font-medium truncate">{userEmail}</p>
              </div>
            </div>
          )}

          <button
            onClick={onLogout}
            className={`w-full flex items-center ${isCollapsed ? 'md:justify-center' : 'justify-center px-4'} py-3 text-sm text-slate-400 hover:text-white border border-slate-700/50 rounded-xl hover:bg-slate-800/80 transition-all active:scale-95 group shadow-sm`}
            title={isCollapsed ? "로그아웃" : ""}
          >
            <span className="group-hover:translate-x-0.5 transition-transform text-lg">🚪</span>
            {!isCollapsed && <span className="ml-2 font-bold">로그아웃</span>}
          </button>

          {!isCollapsed && (
            <div className="text-center mt-4 opacity-40 hover:opacity-80 transition-opacity cursor-pointer">
              <p className="text-[9px] font-bold tracking-[0.2em] text-slate-500 uppercase">
                MiniPDM {appVersion || 'v0.0.0'}
              </p>
              {updateStatus && <p className="text-[9px] text-brand-400 font-bold mt-1 animate-pulse">{updateStatus}</p>}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
