import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  // 모드 전환 (true: 로그인, false: 새 회사 등록)
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loading, setLoading] = useState(false);

  // 입력 폼 상태
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [managerName, setManagerName] = useState('');

  // 1. 로그인 처리 함수
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(`로그인 실패: ${error.message}`);
    }
    // 성공 시 App.tsx의 onAuthStateChange가 감지하여 자동으로 대시보드로 이동시킴
    setLoading(false);
  };

  // 2. 회사 등록 및 관리자 가입 함수
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !managerName) {
      alert('회사명과 관리자 이름은 필수입니다.');
      return;
    }
    setLoading(true);

    try {
      // (1) 회원가입 요청
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: managerName, // 메타데이터에 이름 저장
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('회원가입 중 오류가 발생했습니다.');

      // (2) 회사(Company) 데이터 생성
      // 주의: 실제 서비스에서는 이 과정을 서버(Supabase Edge Functions)에서 처리하는 것이 더 안전합니다.
      // 현재는 프로토타입이므로 클라이언트에서 진행합니다.
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert([{ 
            name: companyName,
            updated_by: authData.user.id, // 공통 필드: 생성자 기록
            update_memo: '최초 회사 생성' 
        }])
        .select()
        .single();

      if (companyError) throw companyError;

      // (3) 가입된 사용자의 소속 회사(company_id) 업데이트
      // 회원가입 트리거에 의해 profiles 데이터는 이미 생성되어 있음
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
            company_id: companyData.id,
            role: 'admin',
            name: managerName,
            updated_by: authData.user.id,
            update_memo: '관리자 등록'
        })
        .eq('id', authData.user.id);

      if (profileError) throw profileError;

      alert('회사 등록 및 회원가입이 완료되었습니다! 로그인해주세요.');
      setIsLoginMode(true); // 로그인 모드로 전환

    } catch (error: any) {
      console.error(error);
      alert(`등록 실패: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-xl">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-blue-600 tracking-tight">
            MiniPDM
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            {isLoginMode 
              ? '임가공 제조업체를 위한 스마트한 선택' 
              : '새로운 워크스페이스 시작하기'}
          </p>
        </div>
        
        {/* 폼 (모드에 따라 핸들러 변경) */}
        <form onSubmit={isLoginMode ? handleLogin : handleRegister} className="space-y-5">
          
          {/* 회원가입 모드일 때만 보이는 필드 (안내 문구 추가) */}
          {!isLoginMode && (
            <div className="space-y-4 bg-slate-50 p-4 rounded border border-slate-200">
              <div className="p-2 mb-2 text-xs text-amber-700 bg-amber-50 rounded border border-amber-200">
                <strong>💡 주의사항:</strong> 이 기능은 회사를 처음 등록하는 <strong>관리자용</strong>입니다. <br/>
                이미 등록된 회사의 직원분들은 관리자에게 <strong>초대 메일</strong>을 요청하세요.
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  회사명 (Company Name)
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="예: (주)미래정밀"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  관리자 이름
                </label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="홍길동"
                />
              </div>
            </div>
          )}

          {/* 공통 필드 */}
          <div>
            <label className="block text-sm font-medium text-slate-700">이메일</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="admin@company.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700">비밀번호</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="6자리 이상 입력"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-3 text-white font-bold hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
          >
            {loading ? '처리 중...' : (isLoginMode ? '로그인' : '새 회사(워크스페이스) 생성')}
          </button>
        </form>

        {/* 모드 전환 버튼 */}
        <div className="mt-6 text-center pt-4 border-t border-slate-100">
          <p className="text-sm text-slate-600 mb-2">
            {isLoginMode ? '아직 계정이 없으신가요?' : '이미 계정이 있으신가요?'}
          </p>
          <button
            onClick={() => setIsLoginMode(!isLoginMode)}
            className="text-sm font-semibold text-blue-600 hover:text-blue-800 underline"
          >
            {isLoginMode ? '새로운 회사 등록하기 (관리자용)' : '기존 계정으로 로그인'}
          </button>
        </div>
      </div>
    </div>
  );
}