import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { PageLayout } from '../components/common/PageLayout';
import { MobileModal } from '../components/common/MobileModal';
import { FormattedInput } from '../components/common/FormattedInput';

// 국가 목록 데이터 (그룹핑)
const COUNTRY_GROUPS = {
  '주요 국가 (Major)': [
    { code: 'US', name: '미국 (United States)' },
    { code: 'CN', name: '중국 (China)' },
    { code: 'JP', name: '일본 (Japan)' },
    { code: 'GB', name: '영국 (United Kingdom)' },
    { code: 'VN', name: '베트남 (Vietnam)' },
    { code: 'DE', name: '독일 (Germany)' },
  ],
  '아시아 (Asia)': [
    { code: 'TW', name: '대만 (Taiwan)' },
    { code: 'IN', name: '인도 (India)' },
    { code: 'ID', name: '인도네시아 (Indonesia)' },
    { code: 'TH', name: '태국 (Thailand)' },
    { code: 'SG', name: '싱가포르 (Singapore)' },
    { code: 'PH', name: '필리핀 (Philippines)' },
    { code: 'HK', name: '홍콩 (Hong Kong)' },
  ],
  '유럽 (Europe)': [
    { code: 'FR', name: '프랑스 (France)' },
    { code: 'IT', name: '이탈리아 (Italy)' },
    { code: 'ES', name: '스페인 (Spain)' },
    { code: 'NL', name: '네덜란드 (Netherlands)' },
    { code: 'PL', name: '폴란드 (Poland)' },
    { code: 'TR', name: '튀르키예 (Turkey)' },
    { code: 'CZ', name: '체코 (Czechia)' },
  ],
  '아메리카 (Americas)': [
    { code: 'CA', name: '캐나다 (Canada)' },
    { code: 'MX', name: '멕시코 (Mexico)' },
    { code: 'BR', name: '브라질 (Brazil)' },
  ],
  '오세아니아/기타': [
    { code: 'AU', name: '호주 (Australia)' },
    { code: 'NZ', name: '뉴질랜드 (New Zealand)' },
    { code: 'RU', name: '러시아 (Russia)' },
    { code: 'ZA', name: '남아공 (South Africa)' },
  ]
};

type Client = {
  id: string;
  name: string;
  biz_num: string;
  manager_name: string;
  manager_phone: string;
  manager_email: string;
  is_foreign: boolean;
  country: string;
  currency: string;
};

const INITIAL_FORM = {
  name: '',
  biz_num: '',
  manager_name: '',
  manager_phone: '',
  manager_email: '',
  is_foreign: false,
  country: 'KR',
  currency: 'KRW',
};

export function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('member');

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState(INITIAL_FORM);

  useEffect(() => {
    fetchUserData();
    fetchClients();
  }, []);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (data) setUserRole(data.role);
    }
  };

  const fetchClients = async () => {
    if (clients.length === 0) setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true });

    if (error) console.error('Error fetching clients:', error);
    else setClients(data || []);
    setLoading(false);
  };

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.biz_num && client.biz_num.includes(searchTerm))
  );

  const openModal = (client?: Client) => {
    if (client) {
      setEditId(client.id);
      setFormData({
        name: client.name,
        biz_num: client.biz_num || '',
        manager_name: client.manager_name || '',
        manager_phone: client.manager_phone || '',
        manager_email: client.manager_email || '',
        is_foreign: client.is_foreign ?? false,
        country: client.country || 'KR',
        currency: client.currency || 'KRW',
      });
    } else {
      setEditId(null);
      setFormData(INITIAL_FORM);
    }
    setIsModalOpen(true);
  };

  const checkDuplicate = async (companyId: string) => {
    const { data: nameDup } = await supabase
      .from('clients')
      .select('id')
      .eq('company_id', companyId)
      .ilike('name', formData.name)
      .neq('id', editId || '00000000-0000-0000-0000-000000000000')
      .maybeSingle();

    if (nameDup) {
      alert('이미 등록된 거래처명입니다.');
      return false;
    }

    if (!formData.is_foreign && formData.biz_num) {
      const { data: bizDup } = await supabase
        .from('clients')
        .select('id')
        .eq('company_id', companyId)
        .eq('biz_num', formData.biz_num)
        .neq('id', editId || '00000000-0000-0000-0000-000000000000')
        .maybeSingle();

      if (bizDup) {
        alert('이미 등록된 사업자번호입니다.');
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!formData.name) return alert('거래처명은 필수입니다.');

    if (formData.is_foreign && !formData.country) {
      return alert('해외 기업인 경우 국가를 선택해주세요.');
    }

    if (!formData.is_foreign && formData.biz_num) {
      const cleanNum = formData.biz_num.replace(/-/g, '');
      if (cleanNum.length !== 10) {
        return alert('국내 사업자번호는 10자리 숫자여야 합니다.');
      }
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
    const company_id = profile?.company_id;

    if (!company_id) return alert('사용자 정보를 불러올 수 없습니다.');

    const isUnique = await checkDuplicate(company_id);
    if (!isUnique) return;

    const payload = {
      name: formData.name,
      biz_num: formData.biz_num,
      manager_name: formData.manager_name,
      manager_phone: formData.manager_phone,
      manager_email: formData.manager_email,
      is_foreign: formData.is_foreign,
      country: formData.is_foreign ? formData.country : 'KR',
      currency: formData.currency,
      updated_by: user.id,
      update_memo: editId ? '거래처 정보 수정' : '신규 거래처 등록',
      ...(editId ? { updated_at: new Date().toISOString() } : { company_id }),
    };

    let error;
    if (editId) {
      const res = await supabase.from('clients').update(payload).eq('id', editId);
      error = res.error;
    } else {
      const res = await supabase.from('clients').insert([payload]);
      error = res.error;
    }

    if (error) {
      alert(`저장 실패: ${error.message}`);
    } else {
      alert(editId ? '수정되었습니다.' : '등록되었습니다.');
      setIsModalOpen(false);
      fetchClients();
    }
  };

  const handleDelete = async (id: string) => {
    if (userRole !== 'admin') return alert('권한이 없습니다.');
    if (!window.confirm('정말 삭제하시겠습니까? 관련 견적 데이터에도 영향을 줄 수 있습니다.')) return;

    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) alert(`삭제 실패: ${error.message}`);
    else fetchClients();
  };

  const handleForeignChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isForeign = e.target.checked;
    setFormData({
      ...formData,
      is_foreign: isForeign,
      country: isForeign ? 'US' : 'KR', 
      biz_num: '',
      currency: isForeign ? 'USD' : 'KRW',
    });
  };

  return (
    <PageLayout
      title="🏢 거래처 관리"
      actions={
        <>
          <input
            type="text"
            placeholder="상호명 또는 사업자번호 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border rounded px-3 py-2 text-sm flex-1 outline-none w-full"
          />
          {userRole === 'admin' && (
            <button
              onClick={() => openModal()}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold shadow-sm whitespace-nowrap hover:bg-blue-700"
            >
              + 거래처 등록
            </button>
          )}
        </>
      }
    >
      <div className="hidden md:block bg-white rounded-lg shadow border border-slate-200 overflow-auto flex-1">
        <table className="min-w-full divide-y divide-slate-200 relative">
          <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">국가/통화</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">거래처명</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">사업자/Tax ID</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">담당자</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">연락처</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase">관리</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-10 text-slate-500">데이터 로딩 중...</td></tr>
            ) : filteredClients.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-slate-400">등록된 거래처가 없습니다.</td></tr>
            ) : (
              filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    <div className="flex gap-1">
                      {client.is_foreign ? (
                        <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-xs font-bold">{client.country}</span>
                      ) : (
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">KR</span>
                      )}
                      <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs font-medium">{client.currency || 'KRW'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">{client.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-mono">{client.biz_num || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                    {client.manager_name} <span className="text-slate-400 text-xs">{client.manager_email && `(${client.manager_email})`}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-mono">{client.manager_phone || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    {userRole === 'admin' && (
                      <div className="space-x-3">
                        <button onClick={() => openModal(client)} className="text-blue-600 hover:text-blue-800 font-medium">수정</button>
                        <button onClick={() => handleDelete(client.id)} className="text-red-500 hover:text-red-700 font-medium">삭제</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden overflow-y-auto space-y-4 pb-4 flex-1">
        {loading && <div className="text-center py-10 text-slate-500">데이터 로딩 중...</div>}
        {!loading && filteredClients.length === 0 && <div className="text-center text-slate-500 py-8">등록된 거래처가 없습니다.</div>}
        
        {filteredClients.map((client) => (
          <div key={client.id} className="bg-white p-4 rounded-lg shadow border border-slate-200 flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {client.is_foreign ? (
                    <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold">{client.country}</span>
                  ) : (
                    <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">KR</span>
                  )}
                  <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[10px] font-bold">{client.currency || 'KRW'}</span>
                  <h4 className="text-lg font-bold text-slate-800">{client.name}</h4>
                </div>
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded font-mono">{client.biz_num || '사업자번호 없음'}</span>
              </div>
            </div>
            <div className="text-sm text-slate-600 space-y-1 mt-1">
              <p>👤 {client.manager_name || '담당자 미지정'} {client.manager_email && `(${client.manager_email})`}</p>
              <p>📞 {client.manager_phone || '연락처 없음'}</p>
            </div>
            {userRole === 'admin' && (
              <div className="border-t pt-2 mt-2 flex justify-end space-x-3">
                <button onClick={() => openModal(client)} className="text-sm text-blue-600 font-bold px-3 py-1 border border-blue-200 rounded">수정</button>
                <button onClick={() => handleDelete(client.id)} className="text-sm text-red-600 font-bold px-3 py-1 border border-red-200 rounded">삭제</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <MobileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editId ? '거래처 정보 수정' : '신규 거래처 등록'}
        footer={
          <>
            <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-slate-600 font-bold border rounded bg-white hover:bg-slate-50">취소</button>
            <button onClick={handleSave} className="flex-1 py-3 text-white font-bold border rounded bg-blue-600 hover:bg-blue-700 shadow-sm">저장</button>
          </>
        }
      >
        <div>
          <FormattedInput 
            label="거래처명 (필수)"
            value={formData.name} 
            onChange={(val) => setFormData({...formData, name: val})} 
            placeholder="(주)미래정밀"
          />
        </div>
        
        <div className="bg-slate-50 p-3 rounded border-2 border-blue-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="is_foreign"
                checked={formData.is_foreign}
                onChange={handleForeignChange}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="is_foreign" className="text-sm font-bold text-slate-800 select-none cursor-pointer">해외 기업 (Foreign)</label>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-500">결제 통화</label>
              <select 
                value={formData.currency}
                onChange={(e) => setFormData({...formData, currency: e.target.value})}
                className="border p-1.5 rounded text-sm bg-white font-bold text-blue-600 outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="KRW">KRW (₩)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="CNY">CNY (¥)</option>
                <option value="JPY">JPY (¥)</option>                
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
                <option value="AUD">AUD ($)</option>
                <option value="VND">VND (₫)</option>
              </select>
            </div>
          </div>

          {formData.is_foreign && (
            <div className="animate-in fade-in slide-in-from-top-1">
              <label className="block text-xs font-bold text-slate-500 mb-1">국가 선택</label>
              <select
                className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-blue-200 font-bold text-slate-700 bg-white"
                value={formData.country}
                onChange={(e) => setFormData({...formData, country: e.target.value})}
              >
                {Object.entries(COUNTRY_GROUPS).map(([groupName, countries]) => (
                  <optgroup key={groupName} label={groupName}>
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          )}
        </div>

        <div>
          <FormattedInput 
            label={formData.is_foreign ? "Tax ID (사업자번호)" : "사업자번호"}
            type={formData.is_foreign ? 'text' : 'biz_num'}
            value={formData.biz_num} 
            onChange={(val) => setFormData({...formData, biz_num: val})} 
            placeholder={formData.is_foreign ? "Free Format" : "000-00-00000"}
          />
        </div>
        
        <div className="flex gap-2">
          <div className="flex-1">
            <FormattedInput 
              label="담당자명"
              value={formData.manager_name} 
              onChange={(val) => setFormData({...formData, manager_name: val})} 
              placeholder="홍길동"
            />
          </div>
          <div className="flex-1">
            <FormattedInput 
              label="연락처"
              type={formData.is_foreign ? 'text' : 'phone'}
              value={formData.manager_phone} 
              onChange={(val) => setFormData({...formData, manager_phone: val})} 
              placeholder={formData.is_foreign ? "Free Format" : "010-0000-0000"}
            />
          </div>
        </div>
        <div>
          <FormattedInput 
            label="이메일"
            type="email"
            value={formData.manager_email} 
            onChange={(val) => setFormData({...formData, manager_email: val})} 
            placeholder="manager@partner.com"
          />
        </div>
      </MobileModal>
    </PageLayout>
  );
}