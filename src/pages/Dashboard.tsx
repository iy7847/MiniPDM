import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Materials } from './Materials';
import { Clients } from './Clients';
import { Estimates } from './Estimates';
import { Settings } from './Settings';
// [추가] 분리된 사이드바 컴포넌트 불러오기
import { Sidebar } from '../components/layout/Sidebar';

interface DashboardProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Dashboard({ currentPage, onNavigate }: DashboardProps) {
  // 사이드바 확장/축소 상태 관리
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'materials':
        return <Materials />;
      case 'clients':
        return <Clients />;
      case 'estimates':
        return <Estimates />;
      case 'settings':
        return <Settings />;
      case 'dashboard':
      default:
        return (
          <>
            <header className="mb-8 flex justify-between items-center">
              <h1 className="text-2xl font-bold text-slate-800">대시보드</h1>
              <div className="text-sm text-slate-500">환영합니다, 관리자님</div>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-700 mb-2">신규 견적 요청</h3>
                <p className="text-3xl font-bold text-blue-600">12건</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-700 mb-2">진행 중인 발주</h3>
                <p className="text-3xl font-bold text-orange-500">5건</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-700 mb-2">이번 달 매출</h3>
                <p className="text-3xl font-bold text-green-600">₩ 24.5M</p>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* [수정] 사이드바 컴포넌트 사용 */}
      <Sidebar 
        currentPage={currentPage}
        onNavigate={onNavigate}
        onLogout={handleLogout}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      {/* 메인 콘텐츠 */}
      <main className="flex-1 p-4 md:p-8 overflow-auto w-full">
        {renderContent()}
      </main>
    </div>
  );
}