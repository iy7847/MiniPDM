import { useEffect, useState, Fragment } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useProfile } from '../hooks/useProfile';
import { PageHeader } from '../components/common/ui/PageHeader';
import { Section } from '../components/common/ui/Section';
import { Card } from '../components/common/ui/Card';
import { Button } from '../components/common/ui/Button';
import { NumberInput } from '../components/common/NumberInput';
import { MobileModal } from '../components/common/MobileModal';
import { FormattedInput } from '../components/common/FormattedInput';
import { Combobox } from '../components/common/Combobox';
import { Material, PostProcessing, HeatTreatment } from '../types/estimate';
import { useAppToast } from '../contexts/ToastContext';
import { usePreservedState } from '../hooks/usePreservedState';
export function Materials() {
  const [activeTab, setActiveTab] = usePreservedState<'materials' | 'post-processings' | 'heat-treatments'>('materials_activeTab', 'materials');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [postProcessings, setPostProcessings] = useState<PostProcessing[]>([]);
  const [heatTreatments, setHeatTreatments] = useState<HeatTreatment[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useProfile();
  const toast = useAppToast();
  const [userRole, setUserRole] = useState<string>('member');
  const [showMobileForm, setShowMobileForm] = useState(false);

  // 원자재 양식
  const [form, setForm] = useState({
    name: '',
    code: '',
    density: 0,
    unit_price: 0,
    category: '일반'
  });

  // 후처리 양식
  const [ppForm, setPpForm] = useState({
    name: '',
    price_per_kg: 0
  });

  // 열처리 양식
  const [htForm, setHtForm] = useState({
    name: '',
    price_per_kg: 0
  });

  // 편집 상태
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [editingPpId, setEditingPpId] = useState<string | null>(null);
  const [editingHtId, setEditingHtId] = useState<string | null>(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (profile?.company_id) {
      if (activeTab === 'materials') fetchMaterials();
      else if (activeTab === 'post-processings') fetchPostProcessings();
      else fetchHeatTreatments();
    }
  }, [profile, activeTab]);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      setUserRole(profile?.role || 'member');
    }
  };

  const fetchMaterials = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('category', { ascending: true })
      .order('name', { ascending: true });
    if (!error) setMaterials(data || []);
    setLoading(false);
  };

  const fetchPostProcessings = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('post_processings')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('name', { ascending: true });
    if (!error) setPostProcessings(data || []);
    setLoading(false);
  };

  const fetchHeatTreatments = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('heat_treatments')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('name', { ascending: true });
    if (!error) setHeatTreatments(data || []);
    setLoading(false);
  };

  // --- 원자재 핸들러 ---
  const handleMaterialSave = async () => {
    if (!profile?.company_id) { toast.warning('로그인이 필요합니다.'); return; }
    if (!form.name || !form.code) { toast.warning('이름과 코드를 입력해주세요.'); return; }

    if (editingMaterialId) {
      const { error } = await supabase.from('materials').update({
        name: form.name,
        code: form.code,
        density: form.density,
        unit_price: form.unit_price,
        category: form.category || '일반'
      }).eq('id', editingMaterialId);

      if (error) toast.error(error.message);
      else {
        setMaterials(materials.map(m => m.id === editingMaterialId ? { ...m, ...form, category: form.category || '일반' } : m));
        resetMaterialForm();
      }
    } else {
      const { data, error } = await supabase.from('materials').insert([{
        company_id: profile.company_id,
        name: form.name,
        code: form.code,
        density: form.density,
        unit_price: form.unit_price,
        category: form.category || '일반'
      }]).select();

      if (error) toast.error(error.message);
      else {
        if (data) setMaterials([...materials, ...data]);
        resetMaterialForm();
      }
    }
  };

  const handleMaterialEdit = (m: Material) => {
    setEditingMaterialId(m.id);
    setForm({
      name: m.name,
      code: m.code,
      density: m.density,
      unit_price: m.unit_price,
      category: m.category || '일반'
    });
    setEditingPpId(null); // 다른 편집 상태 초기화
    setEditingHtId(null);
    if (window.innerWidth < 768) {
      setShowMobileForm(true); // 모바일에서만 모달 열기
    }
  };

  const resetMaterialForm = () => {
    setForm({ name: '', code: '', density: 0, unit_price: 0, category: '일반' });
    setEditingMaterialId(null);
    setShowMobileForm(false);
  };

  const handleMaterialDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    await supabase.from('materials').delete().eq('id', id);
    setMaterials(materials.filter(m => m.id !== id));
  };

  // --- 후처리 핸들러 ---
  const handlePpSave = async () => {
    if (!profile?.company_id) { toast.warning('로그인이 필요합니다.'); return; }
    if (!ppForm.name) { toast.warning('후처리명을 입력해주세요.'); return; }

    if (editingPpId) {
      const { error } = await supabase.from('post_processings').update({
        name: ppForm.name,
        price_per_kg: ppForm.price_per_kg
      }).eq('id', editingPpId);

      if (error) toast.error(error.message);
      else {
        setPostProcessings(postProcessings.map(p => p.id === editingPpId ? { ...p, ...ppForm } : p));
        resetPpForm();
      }
    } else {
      const { data, error } = await supabase.from('post_processings').insert([{
        company_id: profile.company_id,
        name: ppForm.name,
        price_per_kg: ppForm.price_per_kg
      }]).select();

      if (error) toast.error(error.message);
      else {
        if (data) setPostProcessings([...postProcessings, ...data]);
        resetPpForm();
      }
    }
  };

  const handlePpEdit = (p: PostProcessing) => {
    setEditingPpId(p.id);
    setPpForm({
      name: p.name,
      price_per_kg: p.price_per_kg
    });
    setEditingMaterialId(null);
    if (window.innerWidth < 768) {
      setShowMobileForm(true);
    }
  };

  const resetPpForm = () => {
    setPpForm({ name: '', price_per_kg: 0 });
    setEditingPpId(null);
    setShowMobileForm(false);
  };

  const handlePpDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    await supabase.from('post_processings').delete().eq('id', id);
    setPostProcessings(postProcessings.filter(p => p.id !== id));
  };

  // --- 열처리 핸들러 ---
  const handleHtSave = async () => {
    if (!profile?.company_id) { toast.warning('로그인이 필요합니다.'); return; }
    if (!htForm.name) { toast.warning('열처리명을 입력해주세요.'); return; }

    if (editingHtId) {
      const { error } = await supabase.from('heat_treatments').update({
        name: htForm.name,
        price_per_kg: htForm.price_per_kg
      }).eq('id', editingHtId);

      if (error) toast.error(error.message);
      else {
        setHeatTreatments(heatTreatments.map(h => h.id === editingHtId ? { ...h, ...htForm } : h));
        resetHtForm();
      }
    } else {
      const { data, error } = await supabase.from('heat_treatments').insert([{
        company_id: profile.company_id,
        name: htForm.name,
        price_per_kg: htForm.price_per_kg
      }]).select();

      if (error) toast.error(error.message);
      else {
        if (data) setHeatTreatments([...heatTreatments, ...data]);
        resetHtForm();
      }
    }
  };

  const handleHtEdit = (h: HeatTreatment) => {
    setEditingHtId(h.id);
    setHtForm({
      name: h.name,
      price_per_kg: h.price_per_kg
    });
    setEditingMaterialId(null);
    setEditingPpId(null);
    if (window.innerWidth < 768) {
      setShowMobileForm(true);
    }
  };

  const resetHtForm = () => {
    setHtForm({ name: '', price_per_kg: 0 });
    setEditingHtId(null);
    setShowMobileForm(false);
  };

  const handleHtDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    await supabase.from('heat_treatments').delete().eq('id', id);
    setHeatTreatments(heatTreatments.filter(h => h.id !== id));
  };

  const groupedMaterials = materials.reduce((acc, current) => {
    const cat = current.category || '일반';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(current);
    return acc;
  }, {} as Record<string, Material[]>);

  return (
    <div className="h-full flex flex-col bg-slate-50 relative">
      <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32 space-y-6">
        <PageHeader title="기초 데이터 관리" />

        {/* 탭 */}
        <div className="flex bg-slate-50 p-1 gap-1 border-b border-slate-200 w-full md:w-96">
          <button
            onClick={() => setActiveTab('materials')}
            className={`flex-1 py-2 text-sm font-bold text-center rounded-md transition-all ${activeTab === 'materials'
              ? 'bg-white text-blue-600 shadow-sm border border-slate-200 ring-1 ring-slate-200/50'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
          >
            원자재 관리
          </button>
          <button
            onClick={() => setActiveTab('post-processings')}
            className={`flex-1 py-2 text-sm font-bold text-center rounded-md transition-all ${activeTab === 'post-processings'
              ? 'bg-white text-blue-600 shadow-sm border border-slate-200 ring-1 ring-slate-200/50'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
          >
            후처리 관리
          </button>
          <button
            onClick={() => setActiveTab('heat-treatments')}
            className={`flex-1 py-2 text-sm font-bold text-center rounded-md transition-all ${activeTab === 'heat-treatments'
              ? 'bg-white text-blue-600 shadow-sm border border-slate-200 ring-1 ring-slate-200/50'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
          >
            열처리 관리
          </button>
        </div>

        {/* 추가 버튼 (모바일) */}
        <Button
          onClick={() => setShowMobileForm(true)}
          className="md:hidden w-full mb-4"
          variant="primary"
        >
          <span>+</span> {activeTab === 'materials' ? '새 원자재 추가' : (activeTab === 'post-processings' ? '새 후처리 추가' : '새 열처리 추가')}
        </Button>

        {/* 콘텐츠 영역 */}
        <div className="flex flex-col md:flex-row gap-6 items-start">

          {/* === 탭 1: 원자재 === */}
          {activeTab === 'materials' && (
            <>
              {/* 목록 */}
              <Section title="원자재 목록" className="flex-1 w-full">
                <Card noPadding>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="p-3 text-xs font-bold text-slate-500 border-b">코드</th>
                          <th className="p-3 text-xs font-bold text-slate-500 border-b">재질명</th>
                          <th className="p-3 text-xs font-bold text-slate-500 border-b text-right">비중</th>
                          <th className="p-3 text-xs font-bold text-slate-500 border-b text-right">단가(kg)</th>
                          {(userRole === 'super_admin' || userRole === 'admin' || userRole === 'manager') && <th className="p-3 border-b w-10"></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr><td colSpan={5} className="p-8 text-center text-slate-400">로딩 중...</td></tr>
                        ) : materials.length === 0 ? (
                          <tr><td colSpan={5} className="p-8 text-center text-slate-400">등록된 원자재가 없습니다.</td></tr>
                        ) : (
                          Object.entries(groupedMaterials).map(([category, items]) => (
                            <Fragment key={category}>
                              <tr className="bg-slate-100/80 border-b">
                                <td colSpan={5} className="p-2 px-3 text-sm font-black text-slate-700 bg-brand-50/30">
                                  {category} <span className="text-xs font-normal text-slate-500 ml-2">({items.length}개)</span>
                                </td>
                              </tr>
                              {items.map(m => (
                                <tr key={m.id} className="border-b hover:bg-slate-50 last:border-0 pl-2">
                                  <td className="p-3 pl-5 text-sm font-bold text-slate-700 border-l-2 border-transparent hover:border-brand-500 transition-colors">{m.code}</td>
                                  <td className="p-3 text-sm text-slate-600">{m.name}</td>
                                  <td className="p-3 text-sm text-right text-slate-600">{m.density}</td>
                                  <td className="p-3 text-sm text-right text-blue-600 font-bold">₩{m.unit_price.toLocaleString()}</td>
                                  {(userRole === 'super_admin' || userRole === 'admin' || userRole === 'manager') && (
                                    <td className="p-3 text-right">
                                      <div className="flex justify-end gap-2">
                                        <Button
                                          variant="secondary"
                                          size="sm"
                                          onClick={() => handleMaterialEdit(m)}
                                          className="h-[28px] opacity-70 hover:opacity-100"
                                        >
                                          ✏️
                                        </Button>
                                        <Button
                                          variant="danger"
                                          size="sm"
                                          onClick={() => handleMaterialDelete(m.id)}
                                          className="h-[28px] opacity-70 hover:opacity-100"
                                        >
                                          🗑️
                                        </Button>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </Fragment>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </Section>

              {/* Desktop Side Form */}
              {(userRole === 'super_admin' || userRole === 'admin' || userRole === 'manager') && (
                <Section title="새 원자재 등록" className="hidden md:block w-80 shrink-0 sticky top-4">
                  <Card>
                    <div className="space-y-4">
                      <div><Combobox label="카테고리 (예: 스틸, AL)" value={form.category} onChange={v => setForm({ ...form, category: v })} options={Object.keys(groupedMaterials)} /></div>
                      <div><FormattedInput label="원자재 코드 (예: AL6061)" value={form.code} onChange={v => setForm({ ...form, code: v })} /></div>
                      <div><FormattedInput label="재질 상세명" value={form.name} onChange={v => setForm({ ...form, name: v })} /></div>
                      <div><NumberInput label="비중 (g/cm³)" value={form.density} onChange={v => setForm({ ...form, density: v })} /></div>
                      <div><NumberInput label="Kg당 단가 (₩)" value={form.unit_price} onChange={v => setForm({ ...form, unit_price: v })} /></div>
                      <div className="flex gap-2">
                        {editingMaterialId && (
                          <Button onClick={resetMaterialForm} variant="ghost" className="flex-1">취소</Button>
                        )}
                        <Button onClick={handleMaterialSave} variant="primary" className="flex-1">
                          {editingMaterialId ? '수정하기' : '등록하기'}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </Section>
              )}
            </>
          )}

          {/* === 탭 2: 후처리 === */}
          {activeTab === 'post-processings' && (
            <>
              {/* List */}
              <Section title="후처리 목록" className="flex-1 w-full">
                <Card noPadding>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="p-3 text-xs font-bold text-slate-500 border-b">후처리명</th>
                          <th className="p-3 text-xs font-bold text-slate-500 border-b text-right">단가 (kg당)</th>
                          {(userRole === 'super_admin' || userRole === 'admin' || userRole === 'manager') && <th className="p-3 border-b w-10"></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr><td colSpan={3} className="p-8 text-center text-slate-400">로딩 중...</td></tr>
                        ) : postProcessings.length === 0 ? (
                          <tr><td colSpan={3} className="p-8 text-center text-slate-400">등록된 후처리가 없습니다.</td></tr>
                        ) : (
                          postProcessings.map(p => (
                            <tr key={p.id} className="border-b hover:bg-slate-50 last:border-0">
                              <td className="p-3 text-sm font-bold text-slate-700">{p.name}</td>
                              <td className="p-3 text-sm text-right text-orange-600 font-bold">₩{p.price_per_kg.toLocaleString()} / kg</td>
                              {(userRole === 'super_admin' || userRole === 'admin' || userRole === 'manager') && (
                                <td className="p-3 text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => handlePpEdit(p)}
                                      className="h-[28px] opacity-70 hover:opacity-100"
                                    >
                                      ✏️
                                    </Button>
                                    <Button
                                      variant="danger"
                                      size="sm"
                                      onClick={() => handlePpDelete(p.id)}
                                      className="h-[28px] opacity-70 hover:opacity-100"
                                    >
                                      🗑️
                                    </Button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </Section>

              {/* Desktop Side Form */}
              {(userRole === 'super_admin' || userRole === 'admin' || userRole === 'manager') && (
                <Section title="새 후처리 등록" className="hidden md:block w-80 shrink-0 sticky top-4">
                  <Card>
                    <div className="space-y-4">
                      <div><FormattedInput label="후처리명 (예: 아노다이징)" value={ppForm.name} onChange={v => setPpForm({ ...ppForm, name: v })} /></div>
                      <div><NumberInput label="Kg당 단가 (₩)" value={ppForm.price_per_kg} onChange={v => setPpForm({ ...ppForm, price_per_kg: v })} /></div>
                      <div className="flex gap-2">
                        {editingPpId && (
                          <Button onClick={resetPpForm} variant="ghost" className="flex-1">취소</Button>
                        )}
                        <Button onClick={handlePpSave} variant="warning" className="flex-1">
                          {editingPpId ? '수정하기' : '등록하기'}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </Section>
              )}
            </>
          )}

          {/* === 탭 3: 열처리 === */}
          {activeTab === 'heat-treatments' && (
            <>
              {/* List */}
              <Section title="열처리 목록" className="flex-1 w-full">
                <Card noPadding>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="p-3 text-xs font-bold text-slate-500 border-b">열처리명</th>
                          <th className="p-3 text-xs font-bold text-slate-500 border-b text-right">단가 (kg당)</th>
                          {(userRole === 'super_admin' || userRole === 'admin' || userRole === 'manager') && <th className="p-3 border-b w-10"></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr><td colSpan={3} className="p-8 text-center text-slate-400">로딩 중...</td></tr>
                        ) : heatTreatments.length === 0 ? (
                          <tr><td colSpan={3} className="p-8 text-center text-slate-400">등록된 열처리가 없습니다.</td></tr>
                        ) : (
                          heatTreatments.map(h => (
                            <tr key={h.id} className="border-b hover:bg-slate-50 last:border-0">
                              <td className="p-3 text-sm font-bold text-slate-700">{h.name}</td>
                              <td className="p-3 text-sm text-right text-red-600 font-bold">₩{h.price_per_kg.toLocaleString()} / kg</td>
                              {(userRole === 'super_admin' || userRole === 'admin' || userRole === 'manager') && (
                                <td className="p-3 text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => handleHtEdit(h)}
                                      className="h-[28px] opacity-70 hover:opacity-100"
                                    >
                                      ✏️
                                    </Button>
                                    <Button
                                      variant="danger"
                                      size="sm"
                                      onClick={() => handleHtDelete(h.id)}
                                      className="h-[28px] opacity-70 hover:opacity-100"
                                    >
                                      🗑️
                                    </Button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </Section>

              {/* Desktop Side Form */}
              {(userRole === 'super_admin' || userRole === 'admin' || userRole === 'manager') && (
                <Section title="새 열처리 등록" className="hidden md:block w-80 shrink-0 sticky top-4">
                  <Card>
                    <div className="space-y-4">
                      <div><FormattedInput label="열처리명 (예: 진공열처리)" value={htForm.name} onChange={v => setHtForm({ ...htForm, name: v })} /></div>
                      <div><NumberInput label="Kg당 단가 (₩)" value={htForm.price_per_kg} onChange={v => setHtForm({ ...htForm, price_per_kg: v })} /></div>
                      <div className="flex gap-2">
                        {editingHtId && (
                          <Button onClick={resetHtForm} variant="ghost" className="flex-1">취소</Button>
                        )}
                        <Button onClick={handleHtSave} variant="danger" className="flex-1">
                          {editingHtId ? '수정하기' : '등록하기'}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </Section>
              )}
            </>
          )}

        </div>

        {/* 모바일 모달 폼 */}
        <MobileModal isOpen={showMobileForm} onClose={() => setShowMobileForm(false)} title={activeTab === 'materials' ? '새 원자재 추가' : (activeTab === 'post-processings' ? '새 후처리 추가' : '새 열처리 추가')}>
          <div className="space-y-4">
            {activeTab === 'materials' ? (
              <>
                <div><Combobox label="카테고리" value={form.category} onChange={v => setForm({ ...form, category: v })} options={Object.keys(groupedMaterials)} /></div>
                <div><FormattedInput label="코드" value={form.code} onChange={v => setForm({ ...form, code: v })} /></div>
                <div><FormattedInput label="재질명" value={form.name} onChange={v => setForm({ ...form, name: v })} /></div>
                <div><NumberInput label="비중" value={form.density} onChange={v => setForm({ ...form, density: v })} /></div>
                <div><NumberInput label="단가" value={form.unit_price} onChange={v => setForm({ ...form, unit_price: v })} /></div>
                <div><NumberInput label="단가" value={form.unit_price} onChange={v => setForm({ ...form, unit_price: v })} /></div>
                <div className="flex gap-2">
                  {editingMaterialId && (
                    <Button onClick={resetMaterialForm} variant="ghost" className="flex-1">취소</Button>
                  )}
                  <Button onClick={handleMaterialSave} variant="primary" className="flex-1">
                    {editingMaterialId ? '수정' : '저장'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div><FormattedInput label="후처리명" value={ppForm.name} onChange={v => setPpForm({ ...ppForm, name: v })} /></div>
                <div><NumberInput label="Kg당 단가" value={ppForm.price_per_kg} onChange={v => setPpForm({ ...ppForm, price_per_kg: v })} /></div>
                <div className="flex gap-2">
                  {editingPpId && (
                    <Button onClick={resetPpForm} variant="ghost" className="flex-1">취소</Button>
                  )}
                  <Button onClick={handlePpSave} variant="warning" className="flex-1">
                    {editingPpId ? '수정' : '저장'}
                  </Button>
                </div>
              </>
            )}
            {activeTab === 'heat-treatments' && (
              <>
                <div><FormattedInput label="열처리명" value={htForm.name} onChange={v => setHtForm({ ...htForm, name: v })} /></div>
                <div><NumberInput label="Kg당 단가" value={htForm.price_per_kg} onChange={v => setHtForm({ ...htForm, price_per_kg: v })} /></div>
                <div className="flex gap-2">
                  {editingHtId && (
                    <Button onClick={resetHtForm} variant="ghost" className="flex-1">취소</Button>
                  )}
                  <Button onClick={handleHtSave} variant="danger" className="flex-1">
                    {editingHtId ? '수정' : '저장'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </MobileModal>
      </div>
    </div>
  );
}
