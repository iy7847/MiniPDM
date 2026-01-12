import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useProfile } from '../hooks/useProfile';
import { PageHeader } from '../components/common/ui/PageHeader';
import { Section } from '../components/common/ui/Section';
import { Card } from '../components/common/ui/Card';
import { Button } from '../components/common/ui/Button';
import { NumberInput } from '../components/common/NumberInput';
import { MobileModal } from '../components/common/MobileModal';
import { FormattedInput } from '../components/common/FormattedInput';
import { Material, PostProcessing, HeatTreatment } from '../types/estimate';

export function Materials() {
  const [activeTab, setActiveTab] = useState<'materials' | 'post-processings' | 'heat-treatments'>('materials');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [postProcessings, setPostProcessings] = useState<PostProcessing[]>([]);
  const [heatTreatments, setHeatTreatments] = useState<HeatTreatment[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useProfile();
  const [userRole, setUserRole] = useState<string>('member');
  const [showMobileForm, setShowMobileForm] = useState(false);

  // Material Form
  const [form, setForm] = useState({
    name: '',
    code: '',
    density: 0,
    unit_price: 0
  });

  // PostProcessing Form
  const [ppForm, setPpForm] = useState({
    name: '',
    price_per_kg: 0
  });

  // HeatTreatment Form
  const [htForm, setHtForm] = useState({
    name: '',
    price_per_kg: 0
  });

  // Edit States
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

  // --- Material Handlers ---
  const handleMaterialSave = async () => {
    if (!profile?.company_id) return alert('로그인이 필요합니다.');
    if (!form.name || !form.code) return alert('이름과 코드를 입력해주세요.');

    if (editingMaterialId) {
      // Update
      const { error } = await supabase.from('materials').update({
        name: form.name,
        code: form.code,
        density: form.density,
        unit_price: form.unit_price,
      }).eq('id', editingMaterialId);

      if (error) alert(error.message);
      else {
        setMaterials(materials.map(m => m.id === editingMaterialId ? { ...m, ...form } : m));
        resetMaterialForm();
      }
    } else {
      // Insert
      const { data, error } = await supabase.from('materials').insert([{
        company_id: profile.company_id,
        name: form.name,
        code: form.code,
        density: form.density,
        unit_price: form.unit_price,
        category: 'GENERAL'
      }]).select();

      if (error) alert(error.message);
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
      unit_price: m.unit_price
    });
    setEditingPpId(null); // Clear other edit state
    setEditingHtId(null);
    setShowMobileForm(true); // Open modal for mobile if applicable, or just useful logic
  };

  const resetMaterialForm = () => {
    setForm({ name: '', code: '', density: 0, unit_price: 0 });
    setEditingMaterialId(null);
    setShowMobileForm(false);
  };

  const handleMaterialDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    await supabase.from('materials').delete().eq('id', id);
    setMaterials(materials.filter(m => m.id !== id));
  };

  // --- PostProcessing Handlers ---
  const handlePpSave = async () => {
    if (!profile?.company_id) return alert('로그인이 필요합니다.');
    if (!ppForm.name) return alert('후처리명을 입력해주세요.');

    if (editingPpId) {
      // Update
      const { error } = await supabase.from('post_processings').update({
        name: ppForm.name,
        price_per_kg: ppForm.price_per_kg
      }).eq('id', editingPpId);

      if (error) alert(error.message);
      else {
        setPostProcessings(postProcessings.map(p => p.id === editingPpId ? { ...p, ...ppForm } : p));
        resetPpForm();
      }
    } else {
      // Insert
      const { data, error } = await supabase.from('post_processings').insert([{
        company_id: profile.company_id,
        name: ppForm.name,
        price_per_kg: ppForm.price_per_kg
      }]).select();

      if (error) alert(error.message);
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
    setShowMobileForm(true);
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

  // --- HeatTreatment Handlers ---
  const handleHtSave = async () => {
    if (!profile?.company_id) return alert('로그인이 필요합니다.');
    if (!htForm.name) return alert('열처리명을 입력해주세요.');

    if (editingHtId) {
      // Update
      const { error } = await supabase.from('heat_treatments').update({
        name: htForm.name,
        price_per_kg: htForm.price_per_kg
      }).eq('id', editingHtId);

      if (error) alert(error.message);
      else {
        setHeatTreatments(heatTreatments.map(h => h.id === editingHtId ? { ...h, ...htForm } : h));
        resetHtForm();
      }
    } else {
      // Insert
      const { data, error } = await supabase.from('heat_treatments').insert([{
        company_id: profile.company_id,
        name: htForm.name,
        price_per_kg: htForm.price_per_kg
      }]).select();

      if (error) alert(error.message);
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
    setShowMobileForm(true);
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

  return (
    <div className="h-full flex flex-col bg-slate-50 relative">
      <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32 space-y-6">
        <PageHeader title="기초 데이터 관리" />

        {/* Tabs */}
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

        {/* Add Button (Mobile) */}
        <Button
          onClick={() => setShowMobileForm(true)}
          className="md:hidden w-full mb-4"
          variant="primary"
        >
          <span>+</span> {activeTab === 'materials' ? '새 원자재 추가' : (activeTab === 'post-processings' ? '새 후처리 추가' : '새 열처리 추가')}
        </Button>

        {/* Content Area */}
        <div className="flex flex-col md:flex-row gap-6 items-start">

          {/* === TAB 1: MATERIALS === */}
          {activeTab === 'materials' && (
            <>
              {/* List */}
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
                          materials.map(m => (
                            <tr key={m.id} className="border-b hover:bg-slate-50 last:border-0">
                              <td className="p-3 text-sm font-bold text-slate-700">{m.code}</td>
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
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </Section>

              {/* Desktop Side Form */}
              {(userRole === 'super_admin' || userRole === 'admin' || userRole === 'manager') && (
                <Section title="새 원자재 등록" className="hidden md:block w-80 shrink-0">
                  <Card>
                    <div className="space-y-4">
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

          {/* === TAB 2: POST PROCESSINGS === */}
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
                <Section title="새 후처리 등록" className="hidden md:block w-80 shrink-0">
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

          {/* === TAB 3: HEAT TREATMENTS === */}
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
                <Section title="새 열처리 등록" className="hidden md:block w-80 shrink-0">
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

        {/* Mobile Modal Form */}
        <MobileModal isOpen={showMobileForm} onClose={() => setShowMobileForm(false)} title={activeTab === 'materials' ? '새 원자재 추가' : (activeTab === 'post-processings' ? '새 후처리 추가' : '새 열처리 추가')}>
          <div className="space-y-4">
            {activeTab === 'materials' ? (
              <>
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
