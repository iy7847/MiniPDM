import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { PageLayout } from '../components/common/PageLayout';
import { NumberInput } from '../components/common/NumberInput';
import { MobileModal } from '../components/common/MobileModal';

type Material = {
  id: string;
  category: string;
  name: string;
  code: string;
  density: number;
  unit_price: number;
  updated_at: string;
};

type EditMaterialForm = {
  category: string;
  name: string;
  code: string;
  density: string | number;
  unit_price: string | number;
};

export function Materials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('member'); 

  const [filterCategory, setFilterCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditMaterialForm | null>(null);

  const [newCategory, setNewCategory] = useState('스틸(Steel)');
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newDensity, setNewDensity] = useState('7.85');
  const [newUnitPrice, setNewUnitPrice] = useState('0');
  
  const [showMobileForm, setShowMobileForm] = useState(false);
  const [showMobileEditModal, setShowMobileEditModal] = useState(false);

  useEffect(() => {
    fetchUserData();
    fetchMaterials();
  }, []);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (data) setUserRole(data.role);
    }
  };

  const fetchMaterials = async () => {
    if (materials.length === 0) setLoading(true); 
    const { data, error } = await supabase.from('materials').select('*').order('category', { ascending: true }).order('name', { ascending: true });
    if (!error) setMaterials(data || []);
    setLoading(false);
  };

  const filteredMaterials = materials.filter((mat) => {
    const matchesCategory = filterCategory === 'All' || mat.category === filterCategory;
    const matchesSearch = mat.name.toLowerCase().includes(searchTerm.toLowerCase()) || (mat.code && mat.code.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'admin') return alert('권한이 없습니다.');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();

    const { error } = await supabase.from('materials').insert([{
      company_id: profile?.company_id,
      category: newCategory,
      name: newName,
      code: newCode,
      density: parseFloat(newDensity),
      unit_price: parseFloat(newUnitPrice),
      updated_by: user.id,
      update_memo: '사용자 직접 등록'
    }]);

    if (error) alert(`저장 실패: ${error.message}`);
    else {
      alert('추가되었습니다.');
      fetchMaterials();
      setNewName(''); setNewCode(''); setNewUnitPrice('0');
      setShowMobileForm(false);
    }
  };

  const startEdit = (mat: Material, isMobile = false) => {
    setEditingId(mat.id);
    setEditForm({
      category: mat.category,
      name: mat.name,
      code: mat.code,
      density: String(mat.density),
      unit_price: String(mat.unit_price),
    });
    if (isMobile) setShowMobileEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editingId || !editForm) return;
    const { data: { user } } = await supabase.auth.getUser();
    const finalDensity = parseFloat(String(editForm.density));
    const finalPrice = parseFloat(String(editForm.unit_price));

    const { error } = await supabase.from('materials').update({
        category: editForm.category,
        name: editForm.name,
        code: editForm.code,
        density: isNaN(finalDensity) ? 0 : finalDensity,
        unit_price: isNaN(finalPrice) ? 0 : finalPrice,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
        update_memo: '리스트에서 직접 수정'
      }).eq('id', editingId);

    if (error) alert(`수정 실패: ${error.message}`);
    else {
      setEditingId(null); setEditForm(null); setShowMobileEditModal(false);
      fetchMaterials();
    }
  };

  const handleDelete = async (id: string) => {
    if (userRole !== 'admin') return alert('권한이 없습니다.');
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('materials').delete().eq('id', id);
    if (error) alert(`삭제 실패: ${error.message}`);
    else fetchMaterials();
  };

  const handleEditChange = (field: keyof EditMaterialForm, value: string) => {
    if (!editForm) return;
    setEditForm({ ...editForm, [field]: value });
  };

  const CategoryOptions = () => (
    <>
      <option value="스틸(Steel)">스틸</option>
      <option value="스텐(SUS)">스텐</option>
      <option value="알루미늄(AL)">알루미늄</option>
      <option value="구리/동">구리</option>
      <option value="기타">기타</option>
    </>
  );

  return (
    // [수정] 타이틀 변경: 자재 라이브러리 -> 소재 관리
    <PageLayout 
      title="🔩 소재 관리"
      actions={
        <>
          <select 
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border rounded px-3 py-2 text-sm bg-white outline-none w-full sm:w-auto"
          >
            <option value="All">전체 분류</option>
            <CategoryOptions />
          </select>
          <input 
            type="text" 
            placeholder="소재명 또는 코드 검색..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border rounded px-3 py-2 text-sm flex-1 outline-none w-full"
          />
        </>
      }
    >
      {userRole === 'admin' && (
        <div className="md:hidden mb-4 shrink-0">
          <button 
            onClick={() => setShowMobileForm(!showMobileForm)}
            className={`w-full py-3 rounded-lg font-bold shadow transition-colors ${showMobileForm ? 'bg-slate-200 text-slate-700' : 'bg-blue-600 text-white'}`}
          >
            {/* [수정] 텍스트 변경 */}
            {showMobileForm ? '닫기' : '+ 신규 소재 등록하기'}
          </button>
        </div>
      )}

      {userRole === 'admin' && (
        <div className={`bg-white p-4 md:p-6 rounded-lg shadow-sm border border-slate-200 mb-6 shrink-0 ${showMobileForm ? 'block' : 'hidden'} md:block`}>
          {/* [수정] 텍스트 변경: 신규 자재 빠른 등록 -> 소재 등록 */}
          <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">⚡ 소재 등록</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="p-2 border rounded text-sm w-full h-[38px]">
              <CategoryOptions />
            </select>
            <input required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="소재명" className="p-2 border rounded text-sm w-full" />
            <input required value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="Code" className="p-2 border rounded text-sm w-full uppercase" />
            <NumberInput value={newDensity} onChange={(val) => setNewDensity(val.toString())} placeholder="비중" />
            <NumberInput value={newUnitPrice} onChange={(val) => setNewUnitPrice(val.toString())} placeholder="단가" />
            <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-bold text-sm w-full shadow-sm h-[38px]">
              + 추가
            </button>
          </form>
        </div>
      )}

      <div className="hidden md:block bg-white rounded-lg shadow border border-slate-200 overflow-auto flex-1">
        <table className="min-w-full divide-y divide-slate-200 relative">
          <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">분류</th>
              {/* [수정] 자재명 -> 소재명 */}
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">소재명</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">코드</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">비중</th>
              {/* [수정] Kg단가 -> kg단가 (소문자) */}
              <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase"><span className="normal-case">kg</span>단가</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase">관리</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-10 text-slate-500">데이터를 불러오는 중입니다...</td></tr>
            ) : filteredMaterials.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-slate-400">등록된 소재가 없습니다.</td></tr>
            ) : (
              filteredMaterials.map((mat) => (
                <tr key={mat.id} className="hover:bg-slate-50 group">
                  {editingId === mat.id && editForm ? (
                    <>
                      <td className="px-4 py-3"><select className="border p-1 w-full rounded text-sm" value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})}><CategoryOptions /></select></td>
                      <td className="px-4 py-3"><input className="border p-1 w-full rounded text-sm" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} /></td>
                      <td className="px-4 py-3"><input className="border p-1 w-full rounded text-sm uppercase" value={editForm.code} onChange={e => setEditForm({...editForm, code: e.target.value})} /></td>
                      <td className="px-4 py-3"><NumberInput value={editForm.density} onChange={val => setEditForm({...editForm, density: val})} className="h-[30px] py-1" /></td>
                      <td className="px-4 py-3"><NumberInput value={editForm.unit_price} onChange={val => setEditForm({...editForm, unit_price: val})} className="h-[30px] py-1 text-blue-600 font-bold" /></td>
                      <td className="px-4 py-3 text-center space-x-2">
                        <button onClick={handleUpdate} className="text-green-600 hover:text-green-800 font-bold text-xs border border-green-200 px-2 py-1 rounded bg-green-50">저장</button>
                        <button onClick={() => { setEditingId(null); setEditForm(null); }} className="text-slate-500 hover:text-slate-700 text-xs px-2 py-1">취소</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 text-sm text-slate-900">{mat.category}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{mat.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{mat.code}</td>
                      <td className="px-6 py-4 text-sm text-right text-slate-700">{mat.density}</td>
                      <td className="px-6 py-4 text-sm text-right font-bold text-blue-600">{mat.unit_price.toLocaleString()}</td>
                      <td className="px-6 py-4 text-center text-sm">
                        {userRole === 'admin' && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEdit(mat)} className="text-blue-500 hover:text-blue-700 mr-3 font-medium">수정</button>
                            <button onClick={() => handleDelete(mat.id)} className="text-red-500 hover:text-red-700 font-medium">삭제</button>
                          </div>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden overflow-y-auto space-y-4 pb-4 flex-1">
        {loading && <div className="text-center py-10 text-slate-500">데이터 로딩 중...</div>}
        
        {!loading && filteredMaterials.map((mat) => (
          <div key={mat.id} className="bg-white p-4 rounded-lg shadow border border-slate-200 flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600 mb-1">{mat.category}</span>
                <h4 className="text-lg font-bold text-slate-800">{mat.name}</h4>
                <p className="text-sm text-slate-400">Code: {mat.code}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-blue-600">{mat.unit_price.toLocaleString()}</p>
                <p className="text-xs text-slate-400">kg단가</p>
              </div>
            </div>
            {userRole === 'admin' && (
              <div className="border-t pt-2 flex justify-between items-center mt-2">
                <span className="text-sm text-slate-500">비중: {mat.density}</span>
                <div className="space-x-3">
                  <button onClick={() => startEdit(mat, true)} className="text-sm text-blue-600 font-bold border border-blue-200 px-3 py-1.5 rounded">수정</button>
                  <button onClick={() => handleDelete(mat.id)} className="text-sm text-red-600 font-bold border border-red-200 px-3 py-1.5 rounded">삭제</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {!loading && filteredMaterials.length === 0 && (
          <div className="text-center text-slate-500 py-8">검색 결과가 없습니다.</div>
        )}
      </div>

      {editingId && editForm && (
        <MobileModal 
          isOpen={showMobileEditModal} 
          onClose={() => setShowMobileEditModal(false)} 
          title="소재 정보 수정"
          footer={
            <>
              <button onClick={() => setShowMobileEditModal(false)} className="flex-1 py-3 text-slate-600 font-bold border rounded bg-white hover:bg-slate-50">취소</button>
              <button onClick={handleUpdate} className="flex-1 py-3 text-white font-bold border rounded bg-blue-600 hover:bg-blue-700 shadow-sm">수정 완료</button>
            </>
          }
        >
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">분류</label>
            <select className="w-full border p-2 rounded" value={editForm.category} onChange={e => handleEditChange('category', e.target.value)}><CategoryOptions /></select>
          </div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">소재명</label><input className="w-full border p-2 rounded" value={editForm.name} onChange={e => handleEditChange('name', e.target.value)} /></div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">코드</label><input className="w-full border p-2 rounded uppercase" value={editForm.code} onChange={e => handleEditChange('code', e.target.value)} /></div>
          <div className="flex gap-4">
            <div className="flex-1"><NumberInput label="비중" value={editForm.density} onChange={val => handleEditChange('density', val.toString())} /></div>
            <div className="flex-1"><NumberInput label="kg단가" value={editForm.unit_price} onChange={val => handleEditChange('unit_price', val.toString())} className="text-blue-600 font-bold" /></div>
          </div>
        </MobileModal>
      )}
    </PageLayout>
  );
}