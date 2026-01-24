import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useProfile } from '../hooks/useProfile'; // Implemented useProfile
import { PageHeader } from '../components/common/ui/PageHeader';
import { Section } from '../components/common/ui/Section';
import { Card } from '../components/common/ui/Card';
import { Button } from '../components/common/ui/Button';
import { FormattedInput } from '../components/common/FormattedInput';
import { NumberInput } from '../components/common/NumberInput';
import { DiscountPolicyChart, DEFAULT_POLICY } from '../components/settings/DiscountPolicyChart';
import { ExcelExportPreset, EXCEL_AVAILABLE_COLUMNS } from '../types/estimate';
import { UserManagement } from '../components/features/UserManagement'; // Implemented UserManagement

export function Settings() {
  const { profile } = useProfile(); // Get profile
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState('');
  const [activeTab, setActiveTab] = useState<'basic' | 'discount' | 'quotation' | 'users'>('basic'); // Added 'users'

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
    label_printer_width: 55, // Default
    label_printer_height: 35, // Default
    default_margin_w: 5,
    default_margin_d: 5,
    default_margin_h: 0,
    default_margin_round_w: 5, // [New]
    default_margin_round_d: 5, // [New]
    default_rounding_unit: 1000,
    default_time_step: 0.1,
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
            default_margin_round_w: company.default_margin_round_w !== null ? company.default_margin_round_w : 5, // [New]
            default_margin_round_d: company.default_margin_round_d !== null ? company.default_margin_round_d : 5, // [New]
            default_rounding_unit: company.default_rounding_unit || 1000,
            default_time_step: company.default_time_step || 0.1,
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
          default_margin_round_w: form.default_margin_round_w, // [New]
          default_margin_round_d: form.default_margin_round_d, // [New]
          default_rounding_unit: form.default_rounding_unit,
          default_time_step: form.default_time_step,
          updated_at: new Date().toISOString()
        })
        .eq('id', companyId);

      if (error) throw error;
      setNotification({ message: '회사 설정이 성공적으로 저장되었습니다.', type: 'success' });
    } catch (err: any) {
      console.error(err);
      setNotification({ message: `저장 실패: ${err.message}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddPreset = async () => {
    if (!newPresetName.trim()) return alert('프리셋 이름을 입력하세요.');
    const { error } = await supabase.from('excel_export_presets').insert({
      company_id: companyId,
      name: newPresetName,
      columns: ['part_no', 'part_name', 'qty', 'unit_price', 'supply_price']
    });

    if (error) alert('추가 실패: ' + error.message);
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

  const handlePolicyChange = (newPolicy: any) => {
    setForm(prev => ({ ...prev, discount_policy: newPolicy }));
  };

  const updateForm = (key: string, value: any) => {
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

  if (loading) return <div className="p-8">로딩 중...</div>;

  return (
    <div className="h-full flex flex-col bg-slate-50 relative">
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        <PageHeader
          title="환경 설정"
          actions={
            <Button
              variant="primary"
              onClick={handleSave}
              isLoading={saving}
              disabled={saving}
            >
              {saving ? '저장 중...' : '설정 저장하기'}
            </Button>
          }
        />

        {notification && (
          <div className={`p-4 rounded-lg text-center text-sm font-bold shadow-sm ${notification.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
            {notification.message}
          </div>
        )}

        <div className="flex bg-white p-1 gap-1 border border-slate-200 rounded-lg w-full max-w-2xl mx-auto shadow-sm">
          <button
            onClick={() => setActiveTab('basic')}
            className={`flex-1 py-2 text-sm font-bold text-center rounded-md transition-all ${activeTab === 'basic'
              ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
          >
            기본 정보 설정
          </button>
          <button
            onClick={() => setActiveTab('quotation')}
            className={`flex-1 py-2 text-sm font-bold text-center rounded-md transition-all ${activeTab === 'quotation'
              ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
          >
            견적서/엑셀 설정
          </button>
          <button
            onClick={() => setActiveTab('discount')}
            className={`flex-1 py-2 text-sm font-bold text-center rounded-md transition-all ${activeTab === 'discount'
              ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
          >
            할인율 정책
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 py-2 text-sm font-bold text-center rounded-md transition-all ${activeTab === 'users'
                ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
            >
              사용자 관리
            </button>
          )}
        </div>

        {/* Content */}
        <div className="pb-12">

          {/* [탭 1] 기본 정보 */}
          {activeTab === 'basic' && (
            <Section title="기본 정보" className="max-w-xl mx-auto">
              <Card>
                <div className="space-y-6">
                  <div><label className="block text-sm font-bold text-slate-700 mb-1">회사명</label><input className="w-full border p-2 rounded bg-slate-50 text-slate-500" value={form.name} disabled /></div>

                  <div className="grid grid-cols-2 gap-4">
                    <div><FormattedInput label="사업자등록번호" type="biz_num" value={form.biz_num} onChange={(val) => updateForm('biz_num', val)} /></div>
                    <div><label className="block text-xs font-bold text-slate-500 mb-1">대표자명</label><input className="w-full border p-2 rounded text-sm" value={form.ceo_name} onChange={(e) => updateForm('ceo_name', e.target.value)} /></div>
                  </div>

                  <div><label className="block text-xs font-bold text-slate-500 mb-1">주소 (Address)</label><input className="w-full border p-2 rounded text-sm" value={form.address} onChange={(e) => updateForm('address', e.target.value)} placeholder="견적서에 표시될 주소를 입력하세요" /></div>

                  <div className="grid grid-cols-2 gap-4">
                    <div><FormattedInput label="전화번호 (Tel)" type="phone" value={form.phone} onChange={(val) => updateForm('phone', val)} /></div>
                    <div><FormattedInput label="팩스 (Fax)" type="phone" value={form.fax} onChange={(val) => updateForm('fax', val)} /></div>
                  </div>

                  <div><FormattedInput label="이메일 (Email)" type="email" value={form.email} onChange={(val) => updateForm('email', val)} /></div>

                  <div className="h-px bg-slate-100 my-4"></div>

                  <div className="bg-slate-50 p-4 rounded border border-slate-200"><label className="block text-sm font-bold text-slate-700 mb-1">기본 적용 환율 (USD 기준)</label><NumberInput value={form.default_exchange_rate} onChange={(val) => updateForm('default_exchange_rate', val)} /></div>
                  <div className="bg-orange-50 p-4 rounded border border-orange-200"><label className="block text-sm font-bold text-orange-800 mb-1">기본 임율 (가공비 계산용)</label><NumberInput value={form.default_hourly_rate} onChange={(val) => updateForm('default_hourly_rate', val)} className="text-orange-700 font-bold" /></div>
                  <div className="bg-blue-50 p-4 rounded border border-blue-200">
                    <label className="block text-sm font-bold text-blue-800 mb-1">📂 파일 저장소 루트 경로</label>
                    <div className="flex gap-2 h-10">
                      <input
                        className="flex-1 border border-blue-300 px-3 py-2 rounded text-sm font-mono bg-white"
                        value={form.root_path}
                        onChange={(e) => updateForm('root_path', e.target.value)}
                      />
                      <button
                        onClick={handleSelectRootPath}
                        className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold flex items-center justify-center hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
                      >
                        폴더 선택
                      </button>
                    </div>
                  </div>

                  {/* Label Printer Settings */}
                  <div className="bg-slate-100 p-4 rounded border border-slate-300">
                    <label className="block text-sm font-bold text-slate-800 mb-2">🖨️ 라벨 프린터 기본 설정 (Label Size)</label>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 mb-1">너비 (Width, mm)</label>
                        <NumberInput
                          value={form.label_printer_width}
                          onChange={(val) => updateForm('label_printer_width', val)}
                          placeholder="55"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 mb-1">높이 (Height, mm)</label>
                        <NumberInput
                          value={form.label_printer_height}
                          onChange={(val) => updateForm('label_printer_height', val)}
                          placeholder="35"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Rounding & Time Step Settings */}
                  <div className="bg-slate-100 p-4 rounded border border-slate-300 mt-4">
                    <label className="block text-sm font-bold text-slate-800 mb-2">⚙️ 계산 설정 (Calculation Settings)</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">단가 절사 단위 (Rounding Unit)</label>
                        <select
                          className="w-full border p-2 rounded text-sm bg-white"
                          value={form.default_rounding_unit}
                          onChange={(e) => updateForm('default_rounding_unit', parseInt(e.target.value))}
                        >
                          <option value="1">1원 단위</option>
                          <option value="10">10원 단위</option>
                          <option value="100">100원 단위</option>
                          <option value="1000">1000원 단위</option>
                          <option value="10000">10000원 단위</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">가공 시간 단위 (Time Step)</label>
                        <select
                          className="w-full border p-2 rounded text-sm bg-white"
                          value={form.default_time_step}
                          onChange={(e) => updateForm('default_time_step', parseFloat(e.target.value))}
                        >
                          <option value="1">1 (Integer)</option>
                          <option value="0.1">0.1 (1 Decimal)</option>
                          <option value="0.01">0.01 (2 Decimals)</option>
                          <option value="0.001">0.001 (3 Decimals)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Default Material Margins */}
                  <div className="bg-slate-100 p-4 rounded border border-slate-300 mt-4">
                    <label className="block text-sm font-bold text-slate-800 mb-2">📐 기본 자재 여유 치수 (Default Material Margins)</label>

                    {/* Plate Margins */}
                    <div className="mb-4">
                      <label className="block text-xs font-bold text-blue-600 mb-2 border-b border-slate-300 pb-1">⬛ 사각/판재 (Plate)</label>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">두께 여유 (Height +)</label>
                          <NumberInput
                            value={form.default_margin_h}
                            onChange={(val) => updateForm('default_margin_h', val)}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">가로 여유 (Width +)</label>
                          <NumberInput
                            value={form.default_margin_w}
                            onChange={(val) => updateForm('default_margin_w', val)}
                            placeholder="5"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">세로 여유 (Depth +)</label>
                          <NumberInput
                            value={form.default_margin_d}
                            onChange={(val) => updateForm('default_margin_d', val)}
                            placeholder="5"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Round Margins */}
                    <div>
                      <label className="block text-xs font-bold text-green-600 mb-2 border-b border-slate-300 pb-1">⚫ 원형/봉재 (Round Bar)</label>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">지름 여유 (OD +)</label>
                          <NumberInput
                            value={form.default_margin_round_w}
                            onChange={(val) => updateForm('default_margin_round_w', val)}
                            placeholder="5"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">길이 여유 (L +)</label>
                          <NumberInput
                            value={form.default_margin_round_d}
                            onChange={(val) => updateForm('default_margin_round_d', val)}
                            placeholder="5"
                          />
                        </div>
                        <div className="opacity-50">
                          <label className="block text-xs font-bold text-slate-400 mb-1">-</label>
                          <input disabled className="w-full border p-2 rounded bg-slate-100" />
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </Card>
            </Section>
          )}

          {/* [탭 2] 견적서/엑셀 설정 */}
          {activeTab === 'quotation' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <Section title="견적서 양식 (Template)">
                <Card>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {['A', 'B', 'C'].map((type) => (
                      <div
                        key={type}
                        onClick={() => updateForm('quotation_template_type', type)}
                        className={`cursor-pointer border-2 rounded-lg p-4 flex flex-col items-center gap-2 transition-all ${form.quotation_template_type === type ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-blue-300'
                          }`}
                      >
                        <div className="w-16 h-20 bg-white border border-slate-300 shadow-sm flex items-center justify-center text-xs text-slate-400">
                          {type === 'A' ? 'Modern' : type === 'B' ? 'Classic' : 'Detail'}
                        </div>
                        <span className={`font-bold ${form.quotation_template_type === type ? 'text-blue-700' : 'text-slate-600'}`}>Type {type}</span>
                      </div>
                    ))}
                  </div>

                  <h4 className="text-sm font-bold text-slate-700 mb-3">🖼️ 로고 및 직인</h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">회사 로고 (상단)</label>
                      <div className="flex gap-2 h-9">
                        <input className="flex-1 border p-2 rounded text-xs text-slate-500 bg-slate-50" value={form.logo_path} readOnly placeholder="이미지 선택..." />
                        <button
                          onClick={() => handleSelectImage('logo_path')}
                          className="bg-slate-600 text-white px-4 py-2 rounded text-xs font-bold flex items-center justify-center hover:bg-slate-700 transition-colors whitespace-nowrap"
                        >
                          찾기
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">직인/도장 (서명란)</label>
                      <div className="flex gap-2 h-9">
                        <input className="flex-1 border p-2 rounded text-xs text-slate-500 bg-slate-50" value={form.seal_path} readOnly placeholder="이미지 선택..." />
                        <button
                          onClick={() => handleSelectImage('seal_path')}
                          className="bg-slate-600 text-white px-4 py-2 rounded text-xs font-bold flex items-center justify-center hover:bg-slate-700 transition-colors whitespace-nowrap"
                        >
                          찾기
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              </Section>

              {/* [New] Default Terms Section */}
              <Section title="견적서 발행 조건 기본값 (Default Terms)">
                <Card>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div><FormattedInput label="기본 결제 조건 (Payment)" value={form.default_payment_terms} onChange={val => updateForm('default_payment_terms', val)} placeholder="예: 50% 선금, 50% 인도 전" /></div>
                      <div><FormattedInput label="기본 인도 조건 (Incoterms)" value={form.default_incoterms} onChange={val => updateForm('default_incoterms', val)} placeholder="예: EXW, FOB Busan" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><FormattedInput label="기본 납기 (Delivery)" value={form.default_delivery_period} onChange={val => updateForm('default_delivery_period', val)} placeholder="예: 발주 후 2-3주" /></div>
                      <div><FormattedInput label="기본 도착지 (Destination)" value={form.default_destination} onChange={val => updateForm('default_destination', val)} placeholder="예: 귀사 지정 장소" /></div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">기본 비고 (Note)</label>
                      <textarea
                        className="w-full border p-2 rounded h-24 text-sm bg-slate-50 focus:bg-white transition-colors"
                        value={form.default_note}
                        onChange={e => updateForm('default_note', e.target.value)}
                        placeholder="모든 견적서에 기본으로 들어갈 비고 문구를 입력하세요."
                      />
                    </div>
                  </div>
                </Card>
              </Section>

              <Section
                title="엑셀 내보내기 양식 (Preset)"
                rightElement={
                  <div className="flex gap-2 items-center">
                    <input
                      className="border px-3 py-1.5 rounded text-sm focus:ring-2 focus:ring-green-500 focus:outline-none w-40"
                      placeholder="새 양식 이름"
                      value={newPresetName}
                      onChange={e => setNewPresetName(e.target.value)}
                    />
                    <Button
                      size="sm"
                      variant="success"
                      onClick={handleAddPreset}
                    >
                      + 추가
                    </Button>
                  </div>
                }
              >
                <Card>
                  <div className="space-y-8">
                    {excelPresets.length === 0 && <p className="text-slate-400 text-center py-4">등록된 양식이 없습니다.</p>}
                    {excelPresets.map(preset => (
                      <div key={preset.id} className="border rounded-lg p-5 bg-slate-50">
                        <div className="flex justify-between items-center mb-4">
                          <span className="font-bold text-lg text-slate-800">📌 {preset.name}</span>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeletePreset(preset.id)}
                            className="h-[28px] opacity-70 hover:opacity-100"
                          >
                            🗑️
                          </Button>
                        </div>

                        <div className="flex gap-4 h-64">
                          {/* 왼쪽: 사용 가능한 컬럼 */}
                          <div className="flex-1 flex flex-col border rounded bg-white overflow-hidden">
                            <div className="bg-slate-100 p-2 text-xs font-bold text-slate-500 border-b text-center">사용 가능 항목 (클릭하여 추가)</div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                              {EXCEL_AVAILABLE_COLUMNS.filter(col => !preset.columns.includes(col.id)).map(col => (
                                <button
                                  key={col.id}
                                  onClick={() => addColumnToPreset(preset.id, col.id)}
                                  className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-green-50 hover:text-green-700 rounded border border-transparent hover:border-green-200 transition-colors"
                                >
                                  + {col.label}
                                </button>
                              ))}
                              {EXCEL_AVAILABLE_COLUMNS.filter(col => !preset.columns.includes(col.id)).length === 0 && (
                                <div className="text-center text-xs text-slate-300 py-4">모두 선택됨</div>
                              )}
                            </div>
                          </div>

                          {/* 가운데 화살표 */}
                          <div className="flex flex-col justify-center items-center text-slate-400">
                            <span>➡</span>
                          </div>

                          {/* 오른쪽: 선택된 컬럼 (순서 변경 가능) */}
                          <div className="flex-1 flex flex-col border rounded bg-white overflow-hidden border-green-200">
                            <div className="bg-green-100 p-2 text-xs font-bold text-green-800 border-b border-green-200 text-center">선택된 항목 (드래그로 순서 변경)</div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-green-50/30">
                              {preset.columns.map((colId, index) => {
                                const colDef = EXCEL_AVAILABLE_COLUMNS.find(c => c.id === colId);
                                return (
                                  <div
                                    key={colId}
                                    draggable
                                    onDragStart={(e) => onDragStart(e, index)}
                                    onDragOver={onDragOver}
                                    onDrop={(e) => onDrop(e, preset.id, index)}
                                    className="flex justify-between items-center px-3 py-2 bg-white border border-slate-200 rounded shadow-sm cursor-move hover:border-blue-400 transition-colors"
                                  >
                                    <span className="text-sm font-bold text-slate-700">
                                      <span className="text-slate-300 mr-2">☰</span>
                                      {colDef?.label || colId}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeColumnFromPreset(preset.id, colId)}
                                      className="h-[24px] w-[24px] p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                                    >
                                      ✕
                                    </Button>
                                  </div>
                                );
                              })}
                              {preset.columns.length === 0 && (
                                <div className="text-center text-xs text-red-300 py-4">항목을 추가해주세요</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </Section>
            </div>
          )}

          {/* [탭 3] 할인율 정책 */}
          {activeTab === 'discount' && (
            <Section title="할인율 정책" className="max-w-4xl mx-auto">
              <Card>
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded border border-blue-200 mb-4">
                    <h4 className="font-bold text-blue-800 mb-1">💡 인터랙티브 할인율 정책</h4>
                    <p className="text-sm text-blue-700">각 난이도별(A~F) 수량에 따른 할인율을 그래프의 점을 <strong>드래그</strong>하여 설정하세요.</p>
                  </div>
                  <DiscountPolicyChart policyData={form.discount_policy} onChange={handlePolicyChange} />
                </div>
              </Card>
            </Section>
          )}

          {/* [탭 4] 사용자 관리 */}
          {activeTab === 'users' && isAdmin && (
            <Section title="사용자 관리" className="max-w-4xl mx-auto">
              <UserManagement />
            </Section>
          )}

        </div>
      </div>
    </div >
  );
}