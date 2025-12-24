/**
 * 2.5 src/lib/supabaseClient.ts
 * * 이 파일은 Supabase 프로젝트와 우리 앱(MiniPDM)을 연결하는 다리 역할을 합니다.
 * 앱의 어디서든 데이터베이스가 필요하면 이 파일을 불러와서 사용합니다.
 */

import { createClient } from '@supabase/supabase-js';

// 환경 변수(.env)에서 Supabase 접속 정보를 가져옵니다.
// Vite를 사용하므로 import.meta.env를 사용합니다.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 접속 정보가 없으면 에러를 띄워 개발자가 바로 알 수 있게 합니다.
if (!supabaseUrl || !supabaseAnonKey) {
  // [수정] 초보자를 위해 에러 발생 시 화면에 경고창을 띄웁니다.
  const msg = '치명적 오류: .env 파일이 없거나 환경 변수가 설정되지 않았습니다.\n서버를 재시작했는지 확인해주세요.';
  alert(msg);
  throw new Error(msg);
}

// Supabase 클라이언트 생성 (이 객체를 통해 DB 조회, 로그인 등을 수행합니다)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // 로그인 세션을 로컬 스토리지에 유지 (앱을 껐다 켜도 로그인 유지)
    autoRefreshToken: true, // 토큰 만료 시 자동으로 갱신
  },
});