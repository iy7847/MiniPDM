import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { PageLayout } from '../components/common/PageLayout';
import { FormattedInput } from '../components/common/FormattedInput';
import { NumberInput } from '../components/common/NumberInput';
import { DiscountPolicyChart, DEFAULT_POLICY } from '../components/settings/DiscountPolicyChart';

// [수정] declare global 블록 제거 (src/vite-env.d.ts로 통합됨)

export function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState('');
  const [activeTab, setActiveTab] = useState<'basic' | 'discount'>('basic');
  
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [form, setForm] = useState({
    name: '',
    biz_num: '',
    root_path: '',
    default_exchange_rate: 1400, 
    default_hourly_rate: 50000,
    master_admin: '',
    discount_policy: DEFAULT_POLICY,
  });

  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchCompanyInfo = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('company_id, role').eq('id', user.id).single();
      
      if (profile && profile.company_id) {
        setCompanyId(profile.company_id);
        
        const { data: company } = await supabase.from('companies').select('*').eq('id', profile.company_id).single();
        
        if (company) {
          setForm({
            name: company.name,
            biz_num: company.biz_num || '',
            root_path: company.root_path || '',
            default_exchange_rate: company.default_exchange_rate || 1400,
            default_hourly_rate: company.default_hourly_rate || 50000,
            master_admin: user.email || '',
            discount_policy: company.discount_policy_json || DEFAULT_POLICY,
          });
        }
      }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!companyId) return;

    if (!form.root_path) {
      setNotification({ message: '공유 폴더 경로는 필수입니다.', type: 'error' });
      return;
    }

    setSaving(true);
    setNotification(null); 

    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: form.name,
          biz_num: form.biz_num,
          root_path: form.root_path,
          default_exchange_rate: form.default_exchange_rate,
          default_hourly_rate: form.default_hourly_rate,
          discount_policy_json: form.discount_policy,
          updated_at: new Date().toISOString()
        })
        .eq('id', companyId);

      if (error) {
          setNotification({ message: `저장 실패: ${error.message}`, type: 'error' });
      } else {
          setNotification({ message: '회사 설정이 성공적으로 저장되었습니다.', type: 'success' });
      }
    } catch (err) {
      console.error(err);
      setNotification({ message: '알 수 없는 오류가 발생했습니다.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handlePolicyChange = (newPolicy: any) => {
    setForm(prev => ({ ...prev, discount_policy: newPolicy }));
  };

  const updateForm = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  // 폴더 선택 핸들러
  const handleSelectRootPath = async () => {
    if (window.fileSystem && window.fileSystem.selectDirectory) {
      // form.root_path를 인자로 전달하여 해당 경로에서 다이얼로그가 열리도록 함
      const path = await window.fileSystem.selectDirectory(form.root_path);
      if (path) {
        updateForm('root_path', path);
      }
    } else {
      setNotification({ message: 'Electron 환경에서만 폴더 선택 기능을 사용할 수 있습니다.', type: 'error' });
    }
  };

  if (loading) return <div className="p-8">로딩 중...</div>;

  return (
    <PageLayout title="⚙️ 환경 설정">
      <div className="max-w-4xl w-full bg-white rounded-lg shadow border border-slate-200 overflow-hidden relative flex flex-col h-full">
        
        {notification && (
          <div className={`absolute top-0 left-0 w-full p-3 text-center text-sm font-bold transition-all transform z-10 ${
            notification.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {notification.message}
          </div>
        )}

        <div className="flex border-b border-slate-200 shrink-0">
          <button
            onClick={() => setActiveTab('basic')}
            className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors ${
              activeTab === 'basic' ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            기본 정보 설정
          </button>
          <button
            onClick={() => setActiveTab('discount')}
            className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors ${
              activeTab === 'discount' ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            할인율 정책 (Graph)
          </button>
        </div>

        <div className="p-8 flex-1 overflow-y-auto">
          {activeTab === 'basic' ? (
            <div className="space-y-6 max-w-xl mx-auto">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">회사명</label>
                <input className="w-full border p-2 rounded bg-slate-50 text-slate-500" value={form.name} disabled />
              </div>
              <div>
                <FormattedInput 
                  label="사업자등록번호" 
                  type="biz_num" 
                  value={form.biz_num} 
                  onChange={(val) => updateForm('biz_num', val)} 
                />
              </div>
              <div className="bg-slate-50 p-4 rounded border border-slate-200">
                 <label className="block text-sm font-bold text-slate-700 mb-1">기본 적용 환율 (USD 기준)</label>
                 <NumberInput 
                   value={form.default_exchange_rate} 
                   onChange={(val) => updateForm('default_exchange_rate', val)} 
                 />
              </div>
              
              <div className="bg-orange-50 p-4 rounded border border-orange-200">
                 <label className="block text-sm font-bold text-orange-800 mb-1">기본 임율 (가공비 계산용)</label>
                 <p className="text-xs text-orange-600 mb-2">시간당 표준 가공 임율을 입력하세요. (단위: 원/Hr)</p>
                 <NumberInput 
                   value={form.default_hourly_rate} 
                   onChange={(val) => updateForm('default_hourly_rate', val)} 
                   className="text-orange-700 font-bold" 
                 />
              </div>

              <div className="bg-blue-50 p-4 rounded border border-blue-200">
                <label className="block text-sm font-bold text-blue-800 mb-1">📂 파일 저장소 루트 경로 (NAS/공유폴더)</label>
                <p className="text-xs text-blue-600 mb-2">
                  모든 도면 파일이 저장될 로컬 경로를 선택하거나 직접 입력하세요.<br/>
                  (예: <code>\\NAS_Server\WorkData</code> 또는 <code>D:\MiniPDM_Files</code>)
                </p>
                <div className="flex gap-2">
                  <input 
                    className="w-full border border-blue-300 p-2 rounded text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={form.root_path} 
                    onChange={(e) => updateForm('root_path', e.target.value)} 
                    placeholder="경로를 입력하거나 폴더 선택 버튼을 누르세요"
                  />
                  <button 
                    onClick={handleSelectRootPath}
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700 shadow-sm whitespace-nowrap flex items-center gap-1"
                  >
                    <span>📁</span> 폴더 선택
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded border border-blue-200 mb-4">
                <h4 className="font-bold text-blue-800 mb-1">💡 인터랙티브 할인율 정책</h4>
                <p className="text-sm text-blue-700">
                  각 난이도별(A~F) 수량에 따른 할인율을 그래프의 점을 <strong>드래그</strong>하여 설정하세요.<br/>
                  설정된 할인율은 견적 작성 시 수량과 난이도에 따라 자동 적용됩니다.
                </p>
              </div>
              
              <DiscountPolicyChart 
                policyData={form.discount_policy} 
                onChange={handlePolicyChange} 
              />
              
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-center text-xs mt-4">
                <div className="p-2 bg-blue-100 rounded text-blue-800 font-bold">A: 매우 쉬움</div>
                <div className="p-2 bg-green-100 rounded text-green-800 font-bold">B: 쉬움</div>
                <div className="p-2 bg-yellow-100 rounded text-yellow-800 font-bold">C: 보통</div>
                <div className="p-2 bg-orange-100 rounded text-orange-800 font-bold">D: 어려움</div>
                <div className="p-2 bg-red-100 rounded text-red-800 font-bold">E: 매우 어려움</div>
                <div className="p-2 bg-slate-200 rounded text-slate-800 font-bold">F: 불가/연구</div>
              </div>
            </div>
          )}

          <div className="pt-8 border-t mt-8 flex justify-end pb-8">
            <button 
              onClick={handleSave} 
              disabled={saving} 
              className={`px-8 py-3 rounded font-bold shadow-md transition-colors ${
                saving 
                  ? 'bg-slate-400 text-slate-200 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {saving ? '저장 중...' : '설정 저장하기'}
            </button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}