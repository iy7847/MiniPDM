import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useProfile } from '../hooks/useProfile'; // useProfile 구현체
import { PageHeader } from '../components/common/ui/PageHeader';
import { Card } from '../components/common/ui/Card';
import { Button } from '../components/common/ui/Button';
import { FormattedInput } from '../components/common/FormattedInput';
import { NumberInput } from '../components/common/NumberInput';
import { DiscountPolicyChart, DEFAULT_POLICY } from '../components/settings/DiscountPolicyChart';
import { ExcelExportPreset, EXCEL_AVAILABLE_COLUMNS, DiscountPolicy } from '../types/estimate';
import { UserManagement } from '../components/features/UserManagement';
import { useAppToast } from '../contexts/ToastContext';

export function Settings() {
  const { profile } = useProfile();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const toast = useAppToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState('');
  const [activeTab, setActiveTab] = useState<'basic' | 'discount' | 'quotation' | 'users'>('basic'); // 'users' 탭 추가

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [form, setForm] = useState({
    name: '',
    biz_num: '',
    ceo_name: '',
    address: '',
    phone: '',
    fax: '',
    email: '',
    root_path: '',
    logo_path: '',
    seal_path: '',
    default_exchange_rate: 1400,
    default_hourly_rate: 50000,
    master_admin: '',
    quotation_template_type: 'A',
    discount_policy: DEFAULT_POLICY,
    default_payment_terms: '',
    default_incoterms: '',
    default_delivery_period: '',
    default_destination: '',
    default_note: '',
    label_printer_width: 55, // 기본값
    label_printer_height: 35, // 기본값
    default_margin_w: 5,
    default_margin_d: 5,
    default_margin_h: 0,
    default_margin_round_w: 5, // [신규]
    default_margin_round_d: 5, // [신규]
    default_rounding_unit: 1000,
    default_time_step: 0.1,
    default_profit_rate_step: 1,
  });

  const [excelPresets, setExcelPresets] = useState<ExcelExportPreset[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

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
            ceo_name: company.ceo_name || '',
            address: company.address || '',
            phone: company.phone || '',
            fax: company.fax || '',
            email: company.email || '',
            root_path: company.root_path || '',
            logo_path: company.logo_path || '',
            seal_path: company.seal_path || '',
            default_exchange_rate: company.default_exchange_rate || 1400,
            default_hourly_rate: company.default_hourly_rate || 50000,
            master_admin: user.email || '',
            quotation_template_type: company.quotation_template_type || 'A',
            discount_policy: company.discount_policy_json || DEFAULT_POLICY,
            default_payment_terms: company.default_payment_terms || '',
            default_incoterms: company.default_incoterms || '',
            default_delivery_period: company.default_delivery_period || '',
            default_destination: company.default_destination || '',
            default_note: company.default_note || '',
            label_printer_width: company.label_printer_width || 55,
            label_printer_height: company.label_printer_height || 35,
            default_margin_w: company.default_margin_w !== null ? company.default_margin_w : 5,
            default_margin_d: company.default_margin_d !== null ? company.default_margin_d : 5,
            default_margin_h: company.default_margin_h !== null ? company.default_margin_h : 0,
            default_margin_round_w: company.default_margin_round_w !== null ? company.default_margin_round_w : 5, // [신규]
            default_margin_round_d: company.default_margin_round_d !== null ? company.default_margin_round_d : 5, // [신규]
            default_rounding_unit: company.default_rounding_unit || 1000,
            default_time_step: company.default_time_step || 0.1,
            default_profit_rate_step: company.default_profit_rate_step || 1,
          });
        }

        const { data: presets } = await supabase.from('excel_export_presets').select('*').eq('company_id', profile.company_id).order('created_at');
        setExcelPresets(presets || []);
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
          ceo_name: form.ceo_name,
          address: form.address,
          phone: form.phone,
          fax: form.fax,
          email: form.email,
          root_path: form.root_path,
          logo_path: form.logo_path,
          seal_path: form.seal_path,
          default_exchange_rate: form.default_exchange_rate,
          default_hourly_rate: form.default_hourly_rate,
          quotation_template_type: form.quotation_template_type,
          discount_policy_json: form.discount_policy,
          default_payment_terms: form.default_payment_terms,
          default_incoterms: form.default_incoterms,
          default_delivery_period: form.default_delivery_period,
          default_destination: form.default_destination,
          default_note: form.default_note,
          label_printer_width: form.label_printer_width,
          label_printer_height: form.label_printer_height,
          default_margin_w: form.default_margin_w,
          default_margin_d: form.default_margin_d,
          default_margin_h: form.default_margin_h,
          default_margin_round_w: form.default_margin_round_w, // [신규]
          default_margin_round_d: form.default_margin_round_d, // [신규]
          default_rounding_unit: form.default_rounding_unit,
          default_time_step: form.default_time_step,
          default_profit_rate_step: form.default_profit_rate_step,
          updated_at: new Date().toISOString()
        })
        .eq('id', companyId);

      if (error) throw error;
      setNotification({ message: '회사 설정이 성공적으로 저장되었습니다.', type: 'success' });
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setNotification({ message: `저장 실패: ${message}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddPreset = async () => {
    if (!newPresetName.trim()) { toast.warning('프리셋 이름을 입력하세요.'); return; }
    const { error } = await supabase.from('excel_export_presets').insert({
      company_id: companyId,
      name: newPresetName,
      columns: ['part_no', 'part_name', 'qty', 'unit_price', 'supply_price']
    });

    if (error) toast.error('추가 실패: ' + error.message);
    else {
      setNewPresetName('');
      fetchCompanyInfo();
    }
  };

  const handleDeletePreset = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    await supabase.from('excel_export_presets').delete().eq('id', id);
    fetchCompanyInfo();
  };

  const handleUpdatePresetColumns = async (id: string, newColumns: string[]) => {
    setExcelPresets(prev => prev.map(p => p.id === id ? { ...p, columns: newColumns } : p));
    await supabase.from('excel_export_presets').update({ columns: newColumns }).eq('id', id);
  };

  const addColumnToPreset = (presetId: string, columnId: string) => {
    const preset = excelPresets.find(p => p.id === presetId);
    if (!preset) return;
    if (preset.columns.includes(columnId)) return;

    const newColumns = [...preset.columns, columnId];
    handleUpdatePresetColumns(presetId, newColumns);
  };

  const removeColumnFromPreset = (presetId: string, columnId: string) => {
    const preset = excelPresets.find(p => p.id === presetId);
    if (!preset) return;

    const newColumns = preset.columns.filter(c => c !== columnId);
    handleUpdatePresetColumns(presetId, newColumns);
  };

  const onDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent, presetId: string, dropIndex: number) => {
    e.preventDefault();
    if (draggedItemIndex === null) return;
    if (draggedItemIndex === dropIndex) return;

    const preset = excelPresets.find(p => p.id === presetId);
    if (!preset) return;

    const newColumns = [...preset.columns];
    const [movedItem] = newColumns.splice(draggedItemIndex, 1);
    newColumns.splice(dropIndex, 0, movedItem);

    handleUpdatePresetColumns(presetId, newColumns);
    setDraggedItemIndex(null);
  };

  const handlePolicyChange = (newPolicy: DiscountPolicy) => {
    setForm(prev => ({ ...prev, discount_policy: newPolicy as any }));
  };

  const updateForm = (key: keyof typeof form, value: string | number | typeof DEFAULT_POLICY) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSelectRootPath = async () => {
    if (window.fileSystem) {
      const path = await window.fileSystem.selectDirectory(form.root_path);
      if (path) updateForm('root_path', path);
    } else {
      setNotification({ message: 'Electron 환경에서만 가능합니다.', type: 'error' });
    }
  };

  const handleSelectImage = async (field: 'logo_path' | 'seal_path') => {
    if (window.fileSystem) {
      // @ts-ignore
      const path = await window.fileSystem.selectImage?.();
      if (path) updateForm(field, path);
    } else {
      setNotification({ message: 'Electron 환경에서만 가능합니다.', type: 'error' });
    }
  };

  if (loading) return (
    <div className="h-full flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold animate-pulse">설정 데이터 로드 중...</p>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-slate-50 relative overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-8 md:px-8 space-y-8">
        <div className="max-w-5xl mx-auto">
          <PageHeader
            title={
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚙️</span>
                <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">환경 설정</h1>
              </div>
            }
            actions={
              <Button
                variant="primary"
                onClick={handleSave}
                isLoading={saving}
                disabled={saving}
                className="shadow-glow h-[42px] px-6"
              >
                {saving ? '저장 중...' : '변경사항 저장하기'}
              </Button>
            }
          />

          {notification && (
            <div className={`mt-6 p-4 rounded-2xl text-center text-sm font-black shadow-soft border animate-in fade-in slide-in-from-top-4 duration-300 ${notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
              : 'bg-red-50 text-red-700 border-red-100'
              }`}>
              {notification.type === 'success' ? '✅ ' : '❌ '}
              {notification.message}
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="mt-8 flex justify-center">
            <div className="inline-flex bg-slate-200/50 p-1.5 rounded-2xl backdrop-blur-sm border border-slate-200 shadow-inner">
              {[
                { id: 'basic', label: '기본 정보', icon: '🏢' },
                { id: 'quotation', label: '견적/엑셀', icon: '📄' },
                { id: 'discount', label: '할인율 정책', icon: '📈' },
                ...(isAdmin ? [{ id: 'users', label: '사용자 관리', icon: '👥' }] : [])
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-2.5 text-sm font-black rounded-xl transition-all duration-200 ${activeTab === tab.id
                    ? 'bg-white text-brand-600 shadow-soft scale-105 ring-1 ring-slate-200'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                    }`}
                >
                  <span className="text-base">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-10 pb-20">
            {/* [탭 1] 기본 정보 */}
            {activeTab === 'basic' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-8">
                  <Card className="shadow-soft rounded-3xl border-0 overflow-hidden">
                    <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-50">
                      <span className="p-2 bg-indigo-50 rounded-xl text-lg">🏢</span>
                      <h3 className="font-black text-slate-700 uppercase tracking-tight">회사 프로필</h3>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">상호명 (Company Name)</label>
                        <input className="w-full border-0 p-3 rounded-2xl bg-slate-100/50 text-slate-500 font-bold outline-none cursor-not-allowed" value={form.name} disabled />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormattedInput label="사업자등록번호" type="biz_num" value={form.biz_num} onChange={(val) => updateForm('biz_num', val)} />
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">대표자명</label>
                          <input className="w-full border border-slate-200 p-3 rounded-2xl text-sm font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-100 transition-all outline-none" value={form.ceo_name} onChange={(e) => updateForm('ceo_name', e.target.value)} />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">주소 (Address)</label>
                        <input className="w-full border border-slate-200 p-3 rounded-2xl text-sm font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-100 transition-all outline-none text-slate-700" value={form.address} onChange={(e) => updateForm('address', e.target.value)} placeholder="견적서에 표시될 주소를 입력하세요" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormattedInput label="전화번호 (Tel)" type="phone" value={form.phone} onChange={(val) => updateForm('phone', val)} />
                        <FormattedInput label="팩스 (Fax)" type="phone" value={form.fax} onChange={(val) => updateForm('fax', val)} />
                      </div>

                      <FormattedInput label="이메일 (Email)" type="email" value={form.email} onChange={(val) => updateForm('email', val)} />
                    </div>
                  </Card>

                  <Card className="shadow-soft rounded-3xl border-0 overflow-hidden bg-white">
                    <div className="flex items-center gap-3 mb-6 pb-2 border-b border-indigo-50">
                      <span className="p-2 bg-indigo-50 rounded-xl text-lg">💰</span>
                      <h3 className="font-black text-slate-700 uppercase tracking-tight">환율 및 임율</h3>
                    </div>
                    <div className="space-y-6">
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">기본 적용 환율 (USD/KRW)</label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-500">$ 1 =</span>
                          <div className="flex-1">
                            <NumberInput
                              value={form.default_exchange_rate}
                              onChange={(val) => updateForm('default_exchange_rate', val)}
                              className="bg-white border-slate-200 text-slate-700 text-sm font-bold focus:ring-brand-100 w-full rounded-2xl p-3"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">작업 임율 (Hourly Rate, ₩/hr)</label>
                        <div className="w-full">
                          <NumberInput
                            value={form.default_hourly_rate}
                            onChange={(val) => updateForm('default_hourly_rate', val)}
                            className="bg-white border-slate-200 text-slate-700 text-sm font-bold focus:ring-brand-100 w-full rounded-2xl p-3"
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                <div className="space-y-8">
                  <Card className="shadow-soft rounded-3xl border-0 overflow-hidden">
                    <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-50">
                      <span className="p-2 bg-blue-50 rounded-xl text-lg">📁</span>
                      <h3 className="font-black text-slate-700 uppercase tracking-tight">파일 저장 경로 및 라벨 설정</h3>
                    </div>
                    <div className="space-y-6">
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">📂 파일 저장소 루트 경로</label>
                        <div className="flex gap-2">
                          <input
                            className="flex-1 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-mono text-slate-600 outline-none"
                            value={form.root_path}
                            onChange={(e) => updateForm('root_path', e.target.value)}
                          />
                          <button
                            onClick={handleSelectRootPath}
                            className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-slate-900 transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
                          >
                            경로 선택
                          </button>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">🖨️ 라벨 프린터 규격 (mm)</label>
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">Width</label>
                            <NumberInput
                              value={form.label_printer_width}
                              onChange={(val) => updateForm('label_printer_width', val)}
                              className="rounded-xl border-slate-200"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">Height</label>
                            <NumberInput
                              value={form.label_printer_height}
                              onChange={(val) => updateForm('label_printer_height', val)}
                              className="rounded-xl border-slate-200"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card className="shadow-soft rounded-3xl border-0 overflow-hidden">
                    <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-50">
                      <span className="p-2 bg-emerald-50 rounded-xl text-lg">📐</span>
                      <h3 className="font-black text-slate-700 uppercase tracking-tight">단위 및 소재 여유 사이즈 설정</h3>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">단가 절사 단위</label>
                          <select
                            className="w-full border border-slate-200 p-3 rounded-2xl text-sm font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-brand-50"
                            value={form.default_rounding_unit}
                            onChange={(e) => updateForm('default_rounding_unit', parseInt(e.target.value))}
                          >
                            <option value="1">1원</option>
                            <option value="10">10원</option>
                            <option value="100">100원</option>
                            <option value="1000">1000원</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">시간 증감 단위</label>
                          <select
                            className="w-full border border-slate-200 p-3 rounded-2xl text-sm font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-brand-50"
                            value={form.default_time_step}
                            onChange={(e) => updateForm('default_time_step', parseFloat(e.target.value))}
                          >
                            <option value="1">1.0h</option>
                            <option value="0.1">0.1h</option>
                            <option value="0.01">0.01h</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">이윤(%) 증감 단위</label>
                          <select
                            className="w-full border border-slate-200 p-3 rounded-2xl text-sm font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-brand-50"
                            value={form.default_profit_rate_step || 1}
                            onChange={(e) => updateForm('default_profit_rate_step', parseFloat(e.target.value))}
                          >
                            <option value="0.01">0.01%</option>
                            <option value="0.1">0.1%</option>
                            <option value="1">1%</option>
                            <option value="5">5%</option>
                            <option value="10">10%</option>
                          </select>
                        </div>
                      </div>

                      <div className="p-5 bg-slate-50 rounded-3xl border border-slate-200 space-y-6">
                        <div className="space-y-3">
                          <label className="inline-flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                            ⬛ Plate Default Margins (mm)
                          </label>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">T+</label>
                              <NumberInput value={form.default_margin_h} onChange={(val) => updateForm('default_margin_h', val)} className="rounded-xl bg-white border-slate-200 shadow-sm sm:h-9" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">W+</label>
                              <NumberInput value={form.default_margin_w} onChange={(val) => updateForm('default_margin_w', val)} className="rounded-xl bg-white border-slate-200 shadow-sm sm:h-9" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">D+</label>
                              <NumberInput value={form.default_margin_d} onChange={(val) => updateForm('default_margin_d', val)} className="rounded-xl bg-white border-slate-200 shadow-sm sm:h-9" />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 pt-2 border-t border-slate-200">
                          <label className="inline-flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                            ⚫ Round Bar Default Margins (mm)
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">OD+</label>
                              <NumberInput value={form.default_margin_round_w} onChange={(val) => updateForm('default_margin_round_w', val)} className="rounded-xl bg-white border-slate-200 shadow-sm sm:h-9" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">L+</label>
                              <NumberInput value={form.default_margin_round_d} onChange={(val) => updateForm('default_margin_round_d', val)} className="rounded-xl bg-white border-slate-200 shadow-sm sm:h-9" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* [탭 2] 견적서/엑셀 설정 */}
            {activeTab === 'quotation' && (
              <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="shadow-smooth rounded-3xl border-0 overflow-hidden">
                  <div className="flex items-center gap-3 mb-8 pb-3 border-b border-slate-50">
                    <span className="p-2 bg-indigo-50 rounded-xl text-lg">📄</span>
                    <h3 className="font-black text-slate-700 uppercase tracking-tight">견적서 양식 및 자산 (Assets)</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    {[
                      { type: 'A', name: 'Modern Full', color: 'bg-indigo-600' },
                      { type: 'B', name: 'Classic Simple', color: 'bg-slate-800' },
                      { type: 'C', name: 'Detailed Table', color: 'bg-emerald-600' }
                    ].map((tpl) => (
                      <div
                        key={tpl.type}
                        onClick={() => updateForm('quotation_template_type', tpl.type)}
                        className={`group cursor-pointer relative border-2 rounded-2xl p-6 flex flex-col items-center gap-4 transition-all duration-300 ${form.quotation_template_type === tpl.type
                          ? 'border-brand-500 bg-brand-50 shadow-soft scale-105'
                          : 'border-slate-100 bg-slate-50/30 hover:bg-white hover:border-slate-200'
                          }`}
                      >
                        <div className={`w-28 h-36 rounded-lg shadow-smooth border border-slate-200 overflow-hidden transition-transform duration-300 group-hover:-translate-y-2 ${form.quotation_template_type === tpl.type ? 'bg-white' : 'bg-slate-100'
                          }`}>
                          <div className={`h-2 ${tpl.color}`}></div>
                          <div className="p-3 space-y-2">
                            <div className="h-1.5 w-full bg-slate-200 rounded"></div>
                            <div className="h-1.5 w-2/3 bg-slate-200 rounded"></div>
                            <div className="pt-2 grid grid-cols-4 gap-1">
                              <div className="h-1 bg-slate-100 rounded"></div>
                              <div className="h-1 bg-slate-100 rounded"></div>
                              <div className="h-1 bg-slate-100 rounded"></div>
                              <div className="h-1 bg-slate-100 rounded"></div>
                            </div>
                            <div className="space-y-1">
                              <div className="h-1 bg-slate-100 rounded w-full"></div>
                              <div className="h-1 bg-slate-100 rounded w-full"></div>
                            </div>
                          </div>
                        </div>
                        <div className="text-center">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${form.quotation_template_type === tpl.type ? 'text-brand-600' : 'text-slate-400'
                            }`}>Template</span>
                          <h4 className={`text-base font-black tracking-tight ${form.quotation_template_type === tpl.type ? 'text-brand-700' : 'text-slate-700'
                            }`}>{tpl.name}</h4>
                        </div>
                        {form.quotation_template_type === tpl.type && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-glow">✓</div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-slate-50 rounded-3xl border border-slate-200">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">회사 로고 (Company Logo)</label>
                      <div className="flex gap-2">
                        <input className="flex-1 bg-white border border-slate-200 p-3 rounded-2xl text-[11px] font-mono text-slate-500 truncate" value={form.logo_path} readOnly placeholder="이미지 파일 경로..." />
                        <button onClick={() => handleSelectImage('logo_path')} className="px-4 py-2 bg-slate-800 text-white rounded-2xl text-[11px] font-black hover:bg-slate-900 transition-all shadow-sm">찾기</button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">법인 직인 (Seal/Stamp)</label>
                      <div className="flex gap-2">
                        <input className="flex-1 bg-white border border-slate-200 p-3 rounded-2xl text-[11px] font-mono text-slate-500 truncate" value={form.seal_path} readOnly placeholder="이미지 파일 경로..." />
                        <button onClick={() => handleSelectImage('seal_path')} className="px-4 py-2 bg-slate-800 text-white rounded-2xl text-[11px] font-black hover:bg-slate-900 transition-all shadow-sm">찾기</button>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="shadow-smooth rounded-3xl border-0 overflow-hidden">
                  <div className="flex items-center gap-3 mb-8 pb-3 border-b border-slate-50">
                    <span className="p-2 bg-brand-50 rounded-xl text-lg">💡</span>
                    <h3 className="font-black text-slate-700 uppercase tracking-tight">발행 조건 기본 문구 (Default Terms)</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <FormattedInput label="기본 결제 조건" value={form.default_payment_terms} onChange={val => updateForm('default_payment_terms', val)} placeholder="예: 인도 후 30일 이내 송금" />
                      <FormattedInput label="기본 인도 조건" value={form.default_incoterms} onChange={val => updateForm('default_incoterms', val)} placeholder="예: EXW, FOB" />
                      <FormattedInput label="기본 납기" value={form.default_delivery_period} onChange={val => updateForm('default_delivery_period', val)} placeholder="예: 발주 후 2주 이내" />
                      <FormattedInput label="기본 인도 장소" value={form.default_destination} onChange={val => updateForm('default_destination', val)} placeholder="예: 귀사 지정 장소" />
                    </div>
                    <div className="flex flex-col">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">기본 비고 사항 (Notes)</label>
                      <textarea
                        className="flex-1 w-full border border-slate-200 p-4 rounded-3xl text-sm font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-50 transition-all outline-none resize-none min-h-[150px]"
                        value={form.default_note}
                        onChange={e => updateForm('default_note', e.target.value)}
                        placeholder="모든 견적서에 공통으로 표시될 안내 문구입니다."
                      />
                    </div>
                  </div>
                </Card>

                <Card className="shadow-smooth rounded-3xl border-0">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-3 border-b border-slate-50">
                    <div className="flex items-center gap-3">
                      <span className="p-2 bg-emerald-50 rounded-xl text-lg">📊</span>
                      <div>
                        <h3 className="font-black text-slate-700 uppercase tracking-tight">엑셀 내보내기 프리셋 (Excel Presets)</h3>
                        <p className="text-[10px] font-bold text-slate-400">데이터 내보내기 양식을 관리합니다.</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        className="border border-slate-200 px-4 py-2 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-brand-100 w-40"
                        placeholder="새 양식 이름"
                        value={newPresetName}
                        onChange={e => setNewPresetName(e.target.value)}
                      />
                      <button
                        onClick={handleAddPreset}
                        className="bg-emerald-600 text-white px-5 py-2 rounded-2xl text-xs font-black shadow-inner hover:bg-emerald-700 transition-all"
                      >
                        + 추가
                      </button>
                    </div>
                  </div>

                  <div className="space-y-10">
                    {excelPresets.length === 0 && (
                      <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 font-bold">
                        등록된 엑셀 양식이 없습니다. 우측 상단에서 새로 추가해보세요.
                      </div>
                    )}
                    {excelPresets.map(preset => (
                      <div key={preset.id} className="group relative bg-white border border-slate-100 rounded-[32px] p-6 shadow-smooth transition-all hover:border-brand-200">
                        <div className="flex justify-between items-center mb-6">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">📌</span>
                            <h4 className="font-black text-xl text-slate-800 tracking-tight">{preset.name}</h4>
                            <span className="px-2 py-0.5 bg-brand-50 text-brand-600 text-[10px] font-black rounded-lg border border-brand-100">{preset.columns.length} columns</span>
                          </div>
                          <button
                            onClick={() => handleDeletePreset(preset.id)}
                            className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-[1fr,40px,1fr] gap-4">
                          {/* Available Columns */}
                          <div className="flex flex-col bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden min-h-[300px]">
                            <div className="bg-slate-100/50 p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center border-b">Available Items</div>
                            <div className="p-3 space-y-1.5 overflow-y-auto max-h-[400px]">
                              {EXCEL_AVAILABLE_COLUMNS.filter(col => !preset.columns.includes(col.id)).map(col => (
                                <button
                                  key={col.id}
                                  onClick={() => addColumnToPreset(preset.id, col.id)}
                                  className="w-full text-left px-4 py-2.5 bg-white rounded-xl text-xs font-bold text-slate-600 border border-slate-100 shadow-sm hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 transition-all flex items-center justify-between"
                                >
                                  <span>{col.label}</span>
                                  <span className="text-xl font-light opacity-30">+</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center justify-center opacity-20 hidden md:flex">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                            </svg>
                          </div>

                          {/* Selected Columns */}
                          <div className="flex flex-col bg-brand-50/20 rounded-2xl border border-brand-100 overflow-hidden min-h-[300px]">
                            <div className="bg-brand-100/30 p-3 text-[10px] font-black text-brand-700 uppercase tracking-widest text-center border-b border-brand-100">Selected Items (Drag to Sort)</div>
                            <div className="p-3 space-y-1.5 overflow-y-auto max-h-[400px]">
                              {preset.columns.map((colId, index) => {
                                const colDef = EXCEL_AVAILABLE_COLUMNS.find(c => c.id === colId);
                                return (
                                  <div
                                    key={colId}
                                    draggable
                                    onDragStart={(e) => onDragStart(e, index)}
                                    onDragOver={onDragOver}
                                    onDrop={(e) => onDrop(e, preset.id, index)}
                                    className="flex items-center justify-between px-4 py-2.5 bg-white rounded-xl text-xs font-black text-slate-700 border border-slate-200 shadow-soft cursor-move hover:ring-2 hover:ring-brand-200 transition-all group/item"
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="text-slate-300 group-hover/item:text-brand-400">☰</span>
                                      {colDef?.label || colId}
                                    </div>
                                    <button onClick={() => removeColumnFromPreset(preset.id, colId)} className="text-slate-300 hover:text-red-500 font-bold px-2 py-1">✕</button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* [탭 3] 할인율 정책 */}
            {activeTab === 'discount' && (
              <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="shadow-smooth rounded-3xl border-0 overflow-hidden">
                  <div className="flex items-center gap-3 mb-8 pb-3 border-b border-slate-50">
                    <span className="p-2 bg-brand-50 rounded-xl text-lg">📊</span>
                    <h3 className="font-black text-slate-700 uppercase tracking-tight">할인율 정책 설정 (Discount Policy)</h3>
                  </div>

                  <div className="bg-brand-600 text-white p-6 rounded-3xl shadow-glow mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-1">
                      <h4 className="text-xl font-black tracking-tight flex items-center gap-2">
                        💡 인터랙티브 보정 계수
                      </h4>
                      <p className="text-sm text-brand-100 font-bold opacity-80">복수 수량 및 품목 난이도에 따른 단가 보정 계수를 그래프로 관리하세요.</p>
                    </div>
                    <ul className="text-xs space-y-1 bg-white/10 p-4 rounded-2xl border border-white/10 font-bold list-disc pl-8">
                      <li>그래프의 포인트를 드래그하여 수치 변경</li>
                      <li>난이도(A~F)별 개별 커브 지원</li>
                      <li>저장 시 견적 산출 로직에 즉시 반영</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-[32px] border border-slate-100 shadow-inner">
                    <DiscountPolicyChart policyData={form.discount_policy} onChange={handlePolicyChange} />
                  </div>
                </Card>
              </div>
            )}

            {/* [탭 4] 사용자 관리 */}
            {activeTab === 'users' && isAdmin && (
              <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <UserManagement />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}