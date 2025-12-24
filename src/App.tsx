import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // 현재 페이지 상태 관리
  // 'dashboard' | 'materials' ... 화면을 기억하는 변수입니다.
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <div className="text-lg text-slate-600 font-semibold animate-pulse">
          데이터 로딩 중...
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <Dashboard 
      currentPage={currentPage} 
      onNavigate={setCurrentPage} 
    />
  );
}

export default App;