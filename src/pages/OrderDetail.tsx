import { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/ui/PageHeader';
import { Section } from '../components/common/ui/Section';
import { Card } from '../components/common/ui/Card';
import { Button } from '../components/common/ui/Button';
import { supabase } from '../lib/supabaseClient';
import { Order, OrderItem } from '../types/order';
import { FileDropZone } from '../components/common/FileDropZone';
import { LabelPrinterModal } from '../components/production/LabelPrinterModal';
import { ClipboardMatchModal } from '../components/orders/ClipboardMatchModal';
import { MaskingModal } from '../components/common/MaskingModal';
import { PdfSplitterModal } from '../components/production/PdfSplitterModal';
import { ShipmentModal } from '../components/features/Shipment/ShipmentModal';
import { ShipmentLabelPrinter } from '../components/features/Shipment/ShipmentLabel';
import { ShipmentWithItems } from '../types/shipment';
import { NumberInput } from '../components/common/NumberInput';
import { Input } from '../components/common/ui/Input';

interface OrderDetailProps {
    orderId: string | null;
    onBack: () => void;
}

// Helper interface for file handling
interface AttachedFile {
    id: string;
    order_item_id: string;
    file_path: string;
    original_name: string;
}

export function OrderDetail({ orderId, onBack }: OrderDetailProps) {
    const [loading, setLoading] = useState(false);
    const [order, setOrder] = useState<Order | null>(null);
    const [items, setItems] = useState<OrderItem[]>([]);

    // UI 상태
    const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
    const [isClipboardModalOpen, setIsClipboardModalOpen] = useState(false);
    // [Modified] Removed isEditMode


    // [Added] Selection State
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
    const [batchDeliveryDate, setBatchDeliveryDate] = useState('');

    // [Added] Masking State
    const [isMaskingModalOpen, setIsMaskingModalOpen] = useState(false);
    const [maskingFile, setMaskingFile] = useState<{ url: string; name: string; id: string } | null>(null);
    const [itemFiles, setItemFiles] = useState<AttachedFile[]>([]);
    const [companyRootPath, setCompanyRootPath] = useState<string>(''); // [Added]

    // [Added] PDF Splitter State
    const [isPdfSplitterOpen, setIsPdfSplitterOpen] = useState(false);
    const [initialPdfUrl, setInitialPdfUrl] = useState<string | null>(null); // [Added]
    const [editingFile, setEditingFile] = useState<{ id: string; path: string; name: string } | null>(null); // [Added] Edit Mode State

    // [Added] Shipment State
    const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false);
    const [shipments, setShipments] = useState<ShipmentWithItems[]>([]);
    const [printingShipment, setPrintingShipment] = useState<ShipmentWithItems | null>(null);

    const toggleSelectItem = (id: string) => {
        const newSet = new Set(selectedItemIds);
        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
        setSelectedItemIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedItemIds.size === items.length) setSelectedItemIds(new Set());
        else setSelectedItemIds(new Set(items.map(i => i.id)));
    };

    const handleBatchUpdateDelivery = async () => {
        if (!batchDeliveryDate) return alert('납기일을 선택해주세요.');
        if (selectedItemIds.size === 0) return alert('선택된 항목이 없습니다.');
        if (!confirm(`선택한 ${selectedItemIds.size}개 항목의 납기일을 ${batchDeliveryDate}로 일괄 변경하시겠습니까?`)) return;

        const ids = Array.from(selectedItemIds);
        const { error } = await supabase.from('order_items').update({ due_date: batchDeliveryDate }).in('id', ids);

        if (error) {
            alert('업데이트 실패: ' + error.message);
        } else {
            setItems(items.map(i => selectedItemIds.has(i.id) ? { ...i, due_date: batchDeliveryDate } : i));
            alert('업데이트되었습니다.');
            setSelectedItemIds(new Set());
            setBatchDeliveryDate('');
        }
    };

    // [Added] Load File as Base64 for Preview/Masking/Splitting
    const loadFileAsBase64 = async (relativePath: string): Promise<string | null> => {
        if (!window.fileSystem || !companyRootPath) {
            alert('데스크탑 앱 환경 및 파일 저장소 설정이 필요합니다.');
            return null;
        }

        // Check if path is already absolute or contains root path
        let fullPath = relativePath;
        if (!relativePath.includes(':\\') && !relativePath.startsWith(companyRootPath)) {
            const cleanPath = relativePath.replace(/^[/\\]/, '');
            fullPath = `${companyRootPath}\\${cleanPath}`;
        }

        try {
            console.log(`[FileLoad] Loading: ${fullPath}`);
            const base64 = await window.fileSystem.readImage(fullPath);
            if (!base64) {
                alert('파일을 읽을 수 없습니다. 경로를 확인해주세요.\n' + fullPath);
                return null;
            }
            return base64;
        } catch (e) {
            console.error('File Read Error:', e);
            alert('파일 읽기 오류');
            return null;
        }
    };

    const handlePreviewFile = async (file: AttachedFile) => {
        if (!window.fileSystem || !companyRootPath) {
            alert('데스크탑 앱 환경 및 파일 저장소 설정이 필요합니다.');
            return;
        }

        // Use openFile to execute in default OS app
        // file.file_path is likely absolute based on current save logic
        // We pass '' as root if path is absolute, or companyRootPath if relative
        const isAbsolute = file.file_path.includes(':\\') || file.file_path.startsWith(companyRootPath);
        const root = isAbsolute ? '' : companyRootPath;
        const path = file.file_path;

        try {
            const result = await window.fileSystem.openFile(root, path);
            if (!result.success) {
                alert('파일 열기 실패: ' + (result.error || 'Unknown error'));
            }
        } catch (e: any) {
            console.error(e);
            alert('파일 실행 중 오류가 발생했습니다.');
        }
    };

    const handleOpenMasking = async (file: AttachedFile) => {
        const base64 = await loadFileAsBase64(file.file_path);
        if (base64) {
            setMaskingFile({ url: base64, name: file.original_name, id: file.id });
            setIsMaskingModalOpen(true);
        }
    };

    const handleOpenSplitter = async (file: AttachedFile) => {
        const base64 = await loadFileAsBase64(file.file_path);
        if (base64) {
            // [Fix] Ensure absolute path for editingFile
            let fullPath = file.file_path;
            if (companyRootPath && !file.file_path.includes(':\\') && !file.file_path.startsWith(companyRootPath)) {
                const cleanPath = file.file_path.replace(/^[/\\]/, '');
                fullPath = `${companyRootPath}\\${cleanPath}`;
            }

            setInitialPdfUrl(base64);
            setEditingFile({ id: file.id, path: fullPath, name: file.original_name });
            setIsPdfSplitterOpen(true);
        }
    };

    // [Added] Clipboard Match Handler
    const handleClipboardMatch = async (matches: { part_no: string; po_no: string; qty: number; unit_price: number; due_date: string }[], currency?: string) => {
        let updateCount = 0;
        const newItems = [...items];

        // [Added] Update Currency if provided and different
        if (currency && currency !== editForm.currency) {
            if (confirm(`붙여넣은 데이터의 통화(${currency})가 현재 수주 통화(${editForm.currency})와 다릅니다.\n수주 통화를 ${currency}로 변경하시겠습니까?`)) {
                setEditForm(prev => ({ ...prev, currency: currency }));
                updateOrderField('currency', currency);
            }
        }

        for (const match of matches) {
            // Find item by Part No (Case insensitive) - Strict matching by Part No
            const targetIndex = newItems.findIndex(i => i.part_no?.toLowerCase() === match.part_no.toLowerCase());

            if (targetIndex !== -1) {
                const item = newItems[targetIndex];
                const payload: any = {};

                // 1. Update PO No (Order Item No)
                if (match.po_no) {
                    payload.order_item_no = match.po_no;
                }


                // 3. Update Qty
                if (match.qty > 0) {
                    payload.qty = match.qty;
                }

                // 4. Update Unit Price
                if (match.unit_price > 0) {
                    payload.unit_price = match.unit_price;
                }

                // 5. Recalculate Supply Price
                const newQty = payload.qty || item.qty;
                const newPrice = payload.unit_price || item.unit_price;
                if (payload.qty || payload.unit_price) {
                    payload.supply_price = newQty * newPrice;
                }

                // 6. Update Due Date
                if (match.due_date) {
                    payload.due_date = match.due_date;
                }

                if (Object.keys(payload).length > 0) {
                    const { error } = await supabase.from('order_items').update(payload).eq('id', item.id);
                    if (!error) {
                        newItems[targetIndex] = { ...item, ...payload };
                        updateCount++;
                    }
                }
            }
        }
        setItems(newItems);
        alert(`${updateCount}개 항목이 업데이트되었습니다.`);
    };

    // 수정 폼 상태
    const [editForm, setEditForm] = useState({
        po_no: '',
        delivery_date: '',
        note: '',
        currency: 'KRW',
        exchange_rate: 1,
        total_amount: 0
    });

    useEffect(() => {
        if (orderId) {
            fetchOrder(orderId);
            fetchShipments(); // [Added]
        }
        fetchCompanyRootPath();
    }, [orderId]);

    const fetchShipments = async () => {
        if (!orderId) return;
        const { data, error } = await supabase
            .from('shipments')
            .select(`
                *,
                shipment_items (*)
            `)
            .eq('order_id', orderId)
            .order('created_at', { ascending: false });

        if (error) console.error('Shipment Fetch Error:', error);
        else setShipments(data as any);
    };

    const fetchCompanyRootPath = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
            if (profile?.company_id) {
                const { data: company } = await supabase.from('companies').select('root_path').eq('id', profile.company_id).single();
                if (company?.root_path) {
                    setCompanyRootPath(company.root_path);
                    localStorage.setItem('company_root_path', company.root_path); // Sync to local
                }
            }
        }
    };

    const fetchOrder = async (id: string) => {
        setLoading(true);
        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .select(`
                *,
                estimate_id,
                estimates (
                    total_amount,
                    currency,
                    exchange_rate
                ),
                clients (
                    currency
                )
            `)
            .eq('id', id)
            .single();

        if (orderError) {
            console.error(orderError);
            setLoading(false);
            return;
        }

        // [Fix] Manually fetch estimate if linked
        let linkedEstimate: any = null;
        if (orderData.estimate_id) {
            const { data: estimateData } = await supabase
                .from('estimates')
                .select('total_amount, currency, base_exchange_rate')
                .eq('id', orderData.estimate_id)
                .single();

            if (estimateData) linkedEstimate = estimateData;
        }

        // Attach estimate data to order object for UI
        const fullOrderData = { ...orderData, estimates: linkedEstimate };
        setOrder(fullOrderData);

        // 폼 초기화
        // 폼 초기화
        setEditForm({
            po_no: orderData.po_no,
            delivery_date: orderData.delivery_date ? orderData.delivery_date.split('T')[0] : '', // YYYY-MM-DD
            note: orderData.note || '',
            currency: orderData.currency || 'KRW',
            exchange_rate: orderData.exchange_rate || 1,
            total_amount: orderData.total_amount || 0
        });

        // [Added] Load Company Root Path
        const storedPath = localStorage.getItem('company_root_path');
        if (storedPath) setCompanyRootPath(storedPath);

        const { data: itemData } = await supabase
            .from('order_items')
            .select(`
                *,
                estimate_items (
                    unit_price,
                    supply_price,
                    estimates (
                        base_exchange_rate
                    )
                )
            `)
            .eq('order_id', id);

        if (itemData) {
            setItems(itemData as OrderItem[]);
            // [Added] Fetch Files
            const itemIds = itemData.map(i => i.id);
            if (itemIds.length > 0) {
                const { data: files } = await supabase.from('files').select('*').in('order_item_id', itemIds);
                if (files) setItemFiles(files as AttachedFile[]);
            }
        }
        setLoading(false);
    };

    const updateOrderField = async (field: string, value: any) => {
        if (!order) return;

        const payload: any = { [field]: value, updated_at: new Date().toISOString() };
        if (field === 'delivery_date' && !value) payload[field] = null;

        const { error } = await supabase.from('orders').update(payload).eq('id', order.id);

        if (error) {
            console.error('Field Update Error:', error);
            alert('수정 실패: ' + error.message);
        }
    };

    const handleDeleteOrder = async () => {
        if (!order) return;
        const confirmDelete = confirm('정말 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며, 모든 품목 데이터도 함께 삭제됩니다.');
        if (!confirmDelete) return;

        try {
            // 1. Delete Order Items first (to prevent FK constraint errors if no cascade)
            const { error: itemsError } = await supabase.from('order_items').delete().eq('order_id', order.id);
            if (itemsError) throw itemsError;

            // 2. Delete the Order
            const { error: orderError } = await supabase.from('orders').delete().eq('id', order.id);
            if (orderError) throw orderError;

            // 3. Reset Estimate Status to 'SENT' (if linked)
            if (order.estimate_id) {
                const { error: estimateError } = await supabase
                    .from('estimates')
                    .update({ status: 'SENT', updated_at: new Date().toISOString() })
                    .eq('id', order.estimate_id);

                if (estimateError) {
                    console.error('견적 상태 복구 실패:', estimateError);
                    alert('수주는 삭제되었으나 견적 상태 복구 중 오류가 발생했습니다.');
                }
            }

            alert('삭제되었습니다.');
            onBack();
        } catch (error: any) {
            console.error('삭제 중 오류:', error);
            alert('삭제 실패: ' + (error.message || '알 수 없는 오류'));
        }
    };

    const handlePoFileDrop = async (files: File[]) => {
        if (!companyRootPath) {
            alert('파일 저장을 위한 회사 루트 경로(Company Root Path)가 설정되지 않았습니다.\n설정 페이지에서 먼저 경로를 지정해주세요.');
            return;
        }

        if (files.length === 0) return;

        setLoading(true);
        let updatedCount = 0;
        let errorCount = 0;

        try {
            // 1. Group files by Part No (File Name Match)
            const matches: { itemId: string; files: File[] }[] = [];

            // Pre-process items for faster lookup
            const itemMap = new Map<string, string>(); // part_no (lower) -> item_id
            items.forEach(item => {
                if (item.part_no) itemMap.set(item.part_no.toLowerCase().trim(), item.id);
            });

            // Iterate dropped files
            for (const file of files) {
                // Extract filename without extension
                const fileName = file.name;
                const lastDotIndex = fileName.lastIndexOf('.');
                const nameNoExt = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;

                // Strict Match: Name must equal Part No (Case Insensitive)
                const targetItemId = itemMap.get(nameNoExt.toLowerCase().trim());

                if (targetItemId) {
                    // Find or create group for this item
                    let group = matches.find(g => g.itemId === targetItemId);
                    if (!group) {
                        group = { itemId: targetItemId, files: [] };
                        matches.push(group);
                    }
                    group.files.push(file);
                }
            }

            if (matches.length === 0) {
                alert('일치하는 도번(Part No)을 가진 품목을 찾을 수 없습니다.\n파일 명이 도번과 정확히 일치하는지 확인해주세요.');
                setLoading(false);
                return;
            }

            // 2. Process each matched item
            for (const group of matches) {
                const { itemId, files: newFiles } = group;

                // A. Delete existing attachment records (Replace logic)
                // Note: We only delete the DB record, not the physical file (to avoid data loss of shared files)
                const { error: deleteError } = await supabase
                    .from('files')
                    .delete()
                    .eq('order_item_id', itemId);

                if (deleteError) {
                    console.error(`Failed to delete old files for item ${itemId}:`, deleteError);
                    errorCount++;
                    continue;
                }

                // B. Save and Insert new files
                for (const file of newFiles) {
                    try {
                        // 1. Copy file to local storage
                        // Target: [CompanyRoot]/attachments/[OriginalName]
                        // Note: file.path is available in Electron environment (File object has path property)
                        // @ts-ignore
                        const sourcePath = file.path;
                        if (!sourcePath) throw new Error('File path not found');

                        const relativeTarget = `attachments\\${file.name}`;

                        const fsResult = await window.fileSystem.saveFile(sourcePath, companyRootPath, relativeTarget);

                        if (!fsResult.success) {
                            throw new Error(fsResult.error || 'Failed to save file');
                        }

                        // 2. Insert DB record
                        const { error: insertError } = await supabase
                            .from('files')
                            .insert({
                                order_item_id: itemId,
                                file_path: relativeTarget, // Save relative path
                                original_name: file.name,
                                file_name: file.name // [Added] Required field
                            });

                        if (insertError) throw insertError;

                    } catch (e) {
                        console.error(`Failed to process file ${file.name}:`, e);
                        errorCount++;
                    }
                }
                updatedCount++;
            }

            // 3. Refresh Item Files
            if (updatedCount > 0) {
                // Fetch all files for current items again
                const itemIds = items.map(i => i.id);
                if (itemIds.length > 0) {
                    const { data: refreshedFiles } = await supabase.from('files').select('*').in('order_item_id', itemIds);
                    if (refreshedFiles) setItemFiles(refreshedFiles as AttachedFile[]);
                }
                alert(`${updatedCount}개 품목의 파일이 업데이트되었습니다.${errorCount > 0 ? `\n(실패: ${errorCount}건)` : ''}`);
            } else {
                alert('업데이트된 항목이 없습니다.');
            }

        } catch (e: any) {
            console.error(e);
            alert('파일 처리 중 오류가 발생했습니다: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePdfSplitAssign = async (results: { blob: Blob; fileName: string; itemId: string }[]) => {
        if (!orderId) return;
        let successCount = 0;

        for (const res of results) {
            try {
                const arrayBuffer = await res.blob.arrayBuffer();
                const buffer = new Uint8Array(arrayBuffer);

                console.group('PDF Save Debug');
                console.log('window.fileSystem:', !!window.fileSystem);
                console.log('companyRootPath (State):', companyRootPath);
                console.log('localStorage check:', localStorage.getItem('company_root_path'));
                console.groupEnd();

                if (window.fileSystem && companyRootPath) {
                    // Normalize path logic:
                    // we want to save at: d:/MiniPDM_Storage/orders/${orderId}/${res.itemId}/${res.fileName}
                    // But we need (buffer, fileName, rootPath, relativePath)

                    // We can treat `companyRootPath` as root.
                    // Relative path from root: orders/${orderId}/${res.itemId}

                    const relativeFolder = `orders/${orderId}/${res.itemId}`;


                    // [Smart Overwrite] Check if file exists
                    const { data: existingFiles } = await supabase
                        .from('files')
                        .select('id')
                        .eq('order_item_id', res.itemId)
                        .eq('original_name', res.fileName);

                    const existingFile = existingFiles && existingFiles.length > 0 ? existingFiles[0] : null;

                    await window.fileSystem.writeFile(buffer, res.fileName, companyRootPath, relativeFolder);

                    if (existingFile) {
                        // Update existing record
                        const { error } = await supabase.from('files')
                            .update({
                                file_size: res.blob.size,
                                file_path: `${companyRootPath}\\${relativeFolder.replace(/\//g, '\\')}\\${res.fileName}`, // Ensure path is correct
                            })
                            .eq('id', existingFile.id);
                        if (!error) successCount++;
                    } else {
                        // Insert new record
                        const { error } = await supabase.from('files').insert({
                            order_item_id: res.itemId,
                            file_path: `${companyRootPath}\\${relativeFolder.replace(/\//g, '\\')}\\${res.fileName}`,
                            original_name: res.fileName,
                            file_size: res.blob.size,
                            uploaded_by: 'system'
                        });
                        if (!error) successCount++;
                    }
                } else {
                    const msg = `저장 실패: 환경 설정 오류\n\nElectron 앱 여부: ${!!window.fileSystem}\n공용 저장소 경로: ${companyRootPath || '(없음)'}\n\n설정 페이지에서 '공용 파일 저장소' 경로를 지정했는지 확인해주세요.`;
                    console.warn(msg);
                    alert(msg);
                }
            } catch (e) {
                console.error('File Save Error', e);
            }
        }

        if (successCount > 0) {
            alert(`${successCount}개 파일이 생성되었습니다.`);
            fetchOrder(orderId);
        } else {
            alert('파일 저장 실패');
        }
    };

    const handleBulkCurrencyChange = async (newCurrency: string) => {
        if (!newCurrency || !orderId) return;

        // 1. Determine Rate (Use Base Exchange Rate Logic)
        // Since we are changing header currency, we should respect the header exchange rate if available,
        // BUT for conversion, we should use the item's specific rate logic (Parent Est Rate > Item Rate).

        // Actually, for bulk change from header, we usually assume the header's exchange rate applies if items don't have specific ones?
        // Let's iterate and use the Item-Level Logic for each item to be safe.

        const prevCurrency = editForm.currency; // Assume current form state is 'old' currency before this update

        const newItems = items.map(item => {
            // Determine Rate for this item
            let rate = 1;
            if (item.estimate_items) {
                const estData = (item.estimate_items as any)?.estimates;
                rate = Array.isArray(estData) ? (estData[0]?.base_exchange_rate || 1) : (estData?.base_exchange_rate || 1);

                // Parent Priority
                if ((order as any)?.estimates?.base_exchange_rate && (order as any)?.estimates?.base_exchange_rate > 1) {
                    rate = (order as any).estimates.base_exchange_rate;
                }
            } else {
                rate = item.exchange_rate || 1;
            }
            // Fallback
            if (rate === 1 && editForm.exchange_rate > 1) rate = editForm.exchange_rate;

            let newUnitPrice = item.unit_price;

            // Conversion Logic
            // Note: We are comparing HEADER currency change. 
            // If Item currency was SAME as Old Header Currency, we convert it.
            // If Item currency was DIFFERENT (already overridden), do we touch it? 
            // Usually, checking "Apply to all" is better, but here let's assume if item follows header (or is plain), we convert.
            // For simplicity and user expectation: Convert ALL items to the new Header Currency.

            // Logic: Convert Item's CURRENT currency -> New Header Currency
            const itemCurr = item.currency || prevCurrency; // If item has no currency, it was following header? Or KRW default?

            if (itemCurr === 'KRW' && newCurrency !== 'KRW') {
                newUnitPrice = item.unit_price / rate;
            } else if (itemCurr !== 'KRW' && newCurrency === 'KRW') {
                newUnitPrice = item.unit_price * rate;
            } else if (itemCurr !== newCurrency) {
                // Foreign A -> Foreign B? (e.g. USD -> EUR). Skip or just swap label?
                // For now, assume just label swap if rate unknown, or skip.
                // Let's stick to KRW <-> Foreign primary case.
            }

            if (newCurrency === 'KRW') newUnitPrice = Math.round(newUnitPrice);
            else newUnitPrice = Number(newUnitPrice.toFixed(2));

            const newSupply = newUnitPrice * item.qty;

            return { ...item, currency: newCurrency, unit_price: newUnitPrice, supply_price: newSupply };
        });

        // 2. Update Local State
        setItems(newItems);
        setEditForm({ ...editForm, currency: newCurrency });

        // 3. Update DB - Header
        await supabase.from('orders').update({ currency: newCurrency }).eq('id', orderId);

        // 4. Update DB - Items (Bulk)
        // Supabase doesn't support bulk update with different values easily in one call unless upsert?
        // But here we might have different values? No, we calculated them.
        // We have to loop update or use upsert if we have comprehensive data.
        // Let's use loop for safety for now, or Promise.all.

        await Promise.all(newItems.map(item =>
            supabase.from('order_items').update({
                currency: newCurrency,
                unit_price: item.unit_price,
                supply_price: item.supply_price
            }).eq('id', item.id)
        ));

        // 5. Total Recalc
        const newTotal = newItems.reduce((sum, it) => {
            // Re-evaluate rate for total (KRW based)
            let r = 1;
            if (it.estimate_item_id) {
                const estData = (it.estimate_items as any)?.estimates;
                r = Array.isArray(estData) ? (estData[0]?.base_exchange_rate || 1) : (estData?.base_exchange_rate || 1);
                if ((order as any)?.estimates?.base_exchange_rate && (order as any)?.estimates?.base_exchange_rate > 1) {
                    r = (order as any).estimates.base_exchange_rate;
                }
            } else {
                r = it.exchange_rate || 1;
            }

            // If Item is Foreign (New Currency), convert to KRW for Total
            if (newCurrency !== 'KRW') return sum + (it.supply_price * r);
            else return sum + it.supply_price;
        }, 0);

        await supabase.from('orders').update({ total_amount: newTotal }).eq('id', orderId);
    };

    const handleSaveMaskedFile = async (blob: Blob) => {
        if (!maskingFile || !window.fileSystem || !companyRootPath) return;

        const arrayBuffer = await blob.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        // Reconstruct path info
        // maskingFile.url was the Base64, but we need the original path to overwrite.
        // Wait, handleOpenMasking set url as Base64. We lost the original path in maskingFile state?
        // Ah, maskingFile.url IS base64. We need the original path.
        // I need to change how masking is opened or store ID and find file.
        // maskingFile has { url, name, id }.
        // Usage: const file = itemFiles.find(f => f.id === maskingFile.id);

        const originalFile = itemFiles.find(f => f.id === maskingFile.id);
        if (!originalFile) {
            alert('원본 파일을 찾을 수 없습니다.');
            return;
        }

        try {
            // Deconstruct original path to find relative path for writeFile
            // originalFile.file_path e.g., "D:\MiniPDM\estimates\...\img.png"
            // companyRootPath e.g., "D:\MiniPDM"

            let fullPath = originalFile.file_path;


            // Extract directoy and filename
            const parts = fullPath.split(/[/\\]/);
            const fileName = parts.pop() || 'masked.png';
            const dirPath = parts.join('\\'); // Directory full path

            // We need relative path from root
            let relativeFolder = dirPath.replace(companyRootPath, '').replace(/^[/\\]/, '');

            await window.fileSystem.writeFile(buffer, fileName, companyRootPath, relativeFolder);
            alert('파일이 덮어쓰기되었습니다.');

            // Force refresh logic might be needed (e.g. update version) or just reload
            handleOpenMasking(originalFile); // Re-open to see changes? Or just close

        } catch (e: any) {
            alert('저장 실패: ' + e.message);
        }
    };


    if (loading) return <div>Loading...</div>;

    return (
        <div className="h-[calc(100vh-64px)] md:h-full flex flex-col bg-slate-50 relative">
            <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32 space-y-6">
                <PageHeader
                    title={orderId ? '수주 상세 (Order Detail)' : '새 수주 작성'}
                    onBack={onBack}
                    actions={
                        <div className="flex gap-2 items-center">
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => setIsLabelModalOpen(true)}
                                className="bg-indigo-600 hover:bg-indigo-700 h-[38px]"
                            >
                                🏷️ 생산 라벨
                            </Button>

                            {/* [Hidden by User Request]
                            {orderId && (
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => setIsShipmentModalOpen(true)}
                                    className="bg-teal-600 hover:bg-teal-700 h-[38px]"
                                >
                                    📦 출하 등록
                                </Button>
                            )}
                            */}

                            {orderId && (
                                <>
                                    <div className="h-6 w-px bg-slate-300 mx-1 hidden md:block"></div>
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={handleDeleteOrder}
                                        className="h-[38px] opacity-70 hover:opacity-100"
                                    >
                                        🗑️
                                    </Button>
                                </>
                            )}
                        </div>
                    }
                />

                <Section>
                    <div className="flex flex-col xl:flex-row gap-4">
                        <div className="flex-1">
                            <Card className="h-full">
                                <h3 className="font-bold text-slate-700 mb-4">기본 정보</h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    {/* Basic Info Inputs */}
                                    {order ? (
                                        <>
                                            <div className="md:col-span-2">
                                                <Input
                                                    label="PO No."
                                                    value={editForm.po_no}
                                                    onChange={e => setEditForm({ ...editForm, po_no: e.target.value })}
                                                    onBlur={e => updateOrderField('po_no', e.target.value)}
                                                    placeholder="PO 번호 입력"
                                                />
                                            </div>
                                            <div className="md:col-span-1">
                                                <Input
                                                    label="납기일 (Delivery Date)"
                                                    type="date"
                                                    value={editForm.delivery_date ? editForm.delivery_date.split('T')[0] : ''}
                                                    onChange={e => setEditForm({ ...editForm, delivery_date: e.target.value })}
                                                    onBlur={e => updateOrderField('delivery_date', e.target.value)}
                                                />
                                            </div>
                                            <div className="md:col-span-1 flex gap-2">
                                                <div className="flex-1">
                                                    <span className="block text-xs font-bold text-slate-500 mb-1">통화</span>
                                                    <select
                                                        className={`w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-blue-100 ${order?.estimate_id ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'bg-white'}`}
                                                        value={editForm.currency}
                                                        onChange={async e => {
                                                            const newCurr = e.target.value;
                                                            if (confirm(`모든 품목의 통화를 ${newCurr}로 변경하고 환율(${editForm.exchange_rate})에 맞춰 단가를 자동 환산하시겠습니까?`)) {
                                                                await handleBulkCurrencyChange(newCurr);
                                                            } else {
                                                                // Just change header label? Or cancel?
                                                                // If user says No, maybe they just want to fix a labeling error without recalc?
                                                                // Let's assume No = Cancel change.
                                                                // But if they just want to change header label without touching items?
                                                                // Let's provide an option or just update header only.
                                                                // For now, simple fallback: Update Header Only if they cancel? No, that's confusing.
                                                                // Let's just do it.
                                                            }
                                                        }}
                                                        disabled={!!order?.estimate_id}
                                                    >
                                                        <option value="KRW">KRW</option>
                                                        <option value="USD">USD</option>
                                                        <option value="EUR">EUR</option>
                                                        <option value="JPY">JPY</option>
                                                        <option value="CNY">CNY</option>
                                                    </select>
                                                </div>
                                                <div className="flex-1">
                                                    <span className="block text-xs font-bold text-slate-500 mb-1">환율</span>
                                                    <NumberInput
                                                        className={`w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-blue-100 text-right font-mono ${order?.estimate_id ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'bg-white'}`}
                                                        value={editForm.exchange_rate}
                                                        onChange={(val) => setEditForm({ ...editForm, exchange_rate: val })}
                                                        onBlur={() => updateOrderField('exchange_rate', editForm.exchange_rate)}
                                                        readOnly={!!order?.estimate_id}
                                                    />
                                                </div>
                                            </div>

                                            {/* Order Amount (Calculated Sum) */}
                                            <div className="md:col-span-2">
                                                <span className="block text-xs font-bold text-slate-500 mb-1">총 수주 합계 (Total Order Sum)</span>
                                                <div className="flex items-center gap-2 h-[38px] px-2 bg-blue-50 rounded border border-blue-200">
                                                    <span className="text-sm font-bold text-blue-600 w-10">{editForm.currency}</span>
                                                    <div className="flex-1 text-right text-sm font-black text-blue-700">
                                                        {items.reduce((sum, item) => sum + ((item.supply_price || 0) * (item.exchange_rate || 1)), 0).toLocaleString()}
                                                    </div>
                                                </div>
                                                {editForm.currency !== 'KRW' && (
                                                    <div className="text-right text-xs text-slate-400 mt-1">
                                                        ≈ ₩ {Math.round(items.reduce((sum, item) => sum + (item.supply_price || 0), 0) * editForm.exchange_rate).toLocaleString()} (KRW 환산)
                                                    </div>
                                                )}
                                            </div>

                                            {/* Comparison with Estimate Total */}
                                            <div className="md:col-span-2">
                                                <span className="block text-xs font-bold text-slate-400 mb-1">총 견적 합계 (Total Estimate Sum)</span>
                                                {(() => {
                                                    const estTotalKRW = (order as any).estimates?.total_amount || 0;
                                                    const orderCurrency = editForm.currency;

                                                    // Determine Rate for global comparison
                                                    // Use the parent estimate rate if available (Primary), then form rate
                                                    let rate = 1;
                                                    if ((order as any)?.estimates?.base_exchange_rate && (order as any)?.estimates?.base_exchange_rate > 1) {
                                                        rate = (order as any).estimates.base_exchange_rate;
                                                    } else if (editForm.exchange_rate > 1) {
                                                        rate = editForm.exchange_rate;
                                                    }

                                                    // Convert Estimate Total to Order Currency
                                                    let estTotalConverted = estTotalKRW;
                                                    if (orderCurrency !== 'KRW') {
                                                        estTotalConverted = estTotalKRW / rate;
                                                    }

                                                    const orderTotalSum = items.reduce((sum, item) => sum + (item.supply_price || 0), 0);
                                                    const diff = orderTotalSum - estTotalConverted;

                                                    // Tolerance: 10 KRW or 0.01 Foreign
                                                    const tolerance = orderCurrency === 'KRW' ? 10 : 0.01;
                                                    const isMatch = Math.abs(diff) < tolerance;

                                                    return (
                                                        <>
                                                            <div className="flex items-center gap-2 h-[38px] px-2 bg-slate-50 rounded border border-slate-200">
                                                                <span className="text-sm font-bold text-slate-400 w-10">
                                                                    {orderCurrency}
                                                                </span>
                                                                <div className="flex-1 text-right text-sm font-bold text-slate-600">
                                                                    {estTotalConverted.toLocaleString(undefined, { maximumFractionDigits: orderCurrency === 'KRW' ? 0 : 2 })}
                                                                </div>
                                                            </div>
                                                            {/* Difference Summary */}
                                                            {(order as any).estimates && (
                                                                <div className={`text-right text-xs font-bold mt-1 ${!isMatch ? 'text-red-500' : 'text-green-600'}`}>
                                                                    {!isMatch && (diff > 0 ? '+' : '')}
                                                                    {(!isMatch ? diff : 0).toLocaleString(undefined, { maximumFractionDigits: orderCurrency === 'KRW' ? 0 : 2 })}
                                                                    {!isMatch ? ' (차액 발생)' : ' (일치)'}
                                                                </div>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>

                                            <div className="md:col-span-4">
                                                <span className="block text-xs font-bold text-slate-500 mb-1">비고 (Note)</span>
                                                <textarea
                                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors min-h-[80px] resize-none"
                                                    value={editForm.note}
                                                    onChange={e => setEditForm({ ...editForm, note: e.target.value })}
                                                    onBlur={e => updateOrderField('note', e.target.value)}
                                                    placeholder="비고 내용을 입력하세요..."
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-slate-400 col-span-2">정보가 없습니다.</div>
                                    )}
                                </div>
                            </Card>
                        </div>
                        <div className="xl:w-[380px] shrink-0">
                            <div className="h-full flex flex-col">
                                <h3 className="text-sm font-bold text-slate-700 mb-2">도면/파일 일괄 등록 (Batch Registration)</h3>
                                <FileDropZone onFilesDropped={handlePoFileDrop} className="flex-1 text-sm bg-white">
                                    <div className="text-xl mb-1">📂</div>
                                    <p className="font-bold text-slate-700 text-sm">여기로 파일을 끌어놓으세요</p>
                                    <p className="text-[10px] text-slate-500 mt-2 px-2 leading-tight">
                                        파일명이 <strong>품목 도번(Part No)</strong>과 일치하면<br />
                                        자동으로 해당 품목에 첨부됩니다.
                                    </p>
                                    <p className="text-[9px] text-slate-400 mt-1">
                                        (예: 306SM0142-A.pdf → 품목 306SM0142-A 에 첨부)
                                    </p>
                                </FileDropZone>
                                <p className="text-xs text-slate-400 mt-1 text-center">지원: PDF, DWG, STEP, DXF 등 모든 포맷</p>
                            </div>
                        </div>
                    </div>
                </Section>

                <Section
                    title={`주문 품목 (${items.length})`}
                    rightElement={
                        <div className="flex flex-wrap gap-2 items-center">
                            <div className="flex items-center gap-1 mr-2">
                                <span className={`text-xs font-bold transition-colors ${selectedItemIds.size > 0 ? 'text-blue-600' : 'text-slate-300'}`}>
                                    {selectedItemIds.size > 0 ? `${selectedItemIds.size}개` : '선택 없음'}
                                </span>
                                <Input
                                    type="date"
                                    className={`!w-32 !py-1 !px-2 rounded text-xs transition-colors ${selectedItemIds.size === 0 ? 'bg-slate-50 text-slate-300 border-slate-200' : 'bg-white border-slate-300'}`}
                                    value={batchDeliveryDate}
                                    onChange={(e) => setBatchDeliveryDate(e.target.value)}
                                    disabled={selectedItemIds.size === 0}
                                />
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleBatchUpdateDelivery}
                                    disabled={selectedItemIds.size === 0 || !batchDeliveryDate}
                                    className={`py-1 transition-colors ${selectedItemIds.size === 0 ? 'opacity-50 cursor-not-allowed bg-slate-50 text-slate-300 border-slate-200' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                                >
                                    일괄 납기
                                </Button>
                            </div>

                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setIsPdfSplitterOpen(true)}
                                className="bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100"
                            >
                                ✂️ PDF 분할
                            </Button>

                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setIsClipboardModalOpen(true)}
                                className="bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
                            >
                                📋 엑셀 붙여넣기
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={async () => {
                                    if (!order) {
                                        alert('주문 정보가 없습니다.');
                                        return;
                                    }

                                    const ok = confirm('모든 품목의 수주번호를 [PO번호-001, 002...] 형식으로 재설정하시겠습니까?');
                                    if (!ok) return;

                                    try {
                                        setLoading(true);

                                        // 1. Fetch latest items to ensure clean state
                                        const { data: latestItems, error: fetchError } = await supabase
                                            .from('order_items')
                                            .select('*')
                                            .eq('order_id', order.id)
                                            .order('id', { ascending: true }); // Ensure stable order

                                        if (fetchError || !latestItems || latestItems.length === 0) {
                                            throw new Error('품목을 불러올 수 없습니다.');
                                        }

                                        let updatedCount = 0;

                                        // 2. Serial Update Loop (Slower but safest)
                                        for (let i = 0; i < latestItems.length; i++) {
                                            const item = latestItems[i];
                                            const seq = (i + 1).toString().padStart(3, '0');
                                            const newNo = `${order.po_no}-${seq}`;

                                            // Update DB
                                            const { error: updateError } = await supabase
                                                .from('order_items')
                                                .update({ order_item_no: newNo })
                                                .eq('id', item.id);

                                            if (updateError) {
                                                console.error(`Failed to update item ${item.id}`, updateError);
                                            } else {
                                                updatedCount++;
                                            }
                                        }

                                        // 3. Re-fetch final state
                                        await fetchOrder(order.id);
                                        alert(`${updatedCount}개 품목의 수주번호가 재설정되었습니다.`);

                                    } catch (e: any) {
                                        console.error(e);
                                        alert('오류 발생: ' + e.message);
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                className="bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100"
                            >
                                🔢 번호 생성
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={async () => {
                                    if (!order) return;
                                    const { data: newItem, error } = await supabase.from('order_items').insert({
                                        order_id: order.id,
                                        part_name: 'New Item',
                                        qty: 1,
                                        unit_price: 0,
                                        supply_price: 0,
                                        process_status: 'WAITING'
                                    }).select().single();
                                    if (error) console.error(error);
                                    if (newItem) setItems([...items, newItem]);
                                }}
                                className="flex items-center gap-1"
                            >
                                + 품목 추가
                            </Button>
                        </div>
                    }
                >
                    {/* Table Content (Simplified Replacement) */}
                    <Card noPadding>
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="w-10 px-4 py-2 text-center">
                                            <input
                                                type="checkbox"
                                                checked={items.length > 0 && selectedItemIds.size === items.length}
                                                onChange={toggleSelectAll}
                                            />
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 w-40">수주번호</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-slate-500">품명</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 min-w-[200px]">도번 / 규격 / 재질</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 w-24">수량</th>
                                        <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 w-44">
                                            <div className="flex items-center justify-end gap-4">
                                                <select
                                                    className="bg-slate-50 border-none outline-none cursor-pointer hover:text-blue-600 appearance-none px-1 text-sm font-black rounded text-blue-600"
                                                    onChange={(e) => handleBulkCurrencyChange(e.target.value)}
                                                    value={items.every(it => it.currency === (items[0]?.currency || (order as any)?.clients?.currency)) ? (items[0]?.currency || (order as any)?.clients?.currency) : ""}
                                                    title="일괄 통화 변경"
                                                >
                                                    <option value="" disabled>통화</option>
                                                    <option value="KRW">₩</option>
                                                    <option value="USD">$</option>
                                                    <option value="EUR">€</option>
                                                    <option value="JPY">¥</option>
                                                    <option value="CNY">¥</option>
                                                </select>
                                                <span className="ml-2">단가</span>
                                            </div>
                                        </th>
                                        <th className="px-4 py-2 text-center text-xs font-bold text-slate-500 w-32">도면/파일</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-slate-500">납기/비고</th>
                                        <th className="px-4 py-2 text-center text-xs font-bold text-slate-500 w-16">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white">
                                    {items.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                                                아직 등록된 품목이 없습니다.
                                            </td>
                                        </tr>
                                    ) : (
                                        items.map(item => {
                                            const myFiles = itemFiles.filter(f => f.order_item_id === item.id);
                                            return (
                                                <tr key={item.id} className="hover:bg-slate-50">
                                                    <td className="px-4 py-2 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedItemIds.has(item.id)}
                                                            onChange={() => toggleSelectItem(item.id)}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <Input
                                                            className="!px-0 !border-b !border-transparent hover:!border-slate-300 focus:!border-blue-500 !bg-transparent !rounded-none !ring-0 !text-sm !font-bold text-slate-700"
                                                            value={item.order_item_no || ''}
                                                            onChange={(e) => setItems(items.map(i => i.id === item.id ? { ...i, order_item_no: e.target.value } : i))}
                                                            onBlur={async (e: any) => await supabase.from('order_items').update({ order_item_no: e.target.value }).eq('id', item.id)}
                                                            placeholder="수주번호"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        {item.estimate_item_id ? (
                                                            <span className="text-sm font-bold text-slate-700 block py-1">{item.part_name}</span>
                                                        ) : (
                                                            <Input
                                                                className="!px-0 !border-b !border-transparent hover:!border-slate-300 focus:!border-blue-500 !bg-transparent !rounded-none !ring-0 !text-sm !font-bold text-slate-700"
                                                                value={item.part_name || ''}
                                                                onChange={async (e) => {
                                                                    const val = e.target.value;
                                                                    setItems(items.map(i => i.id === item.id ? { ...i, part_name: val } : i));
                                                                }}
                                                                onBlur={async (e: any) => await supabase.from('order_items').update({ part_name: e.target.value }).eq('id', item.id)}
                                                                placeholder="품명"
                                                            />
                                                        )}
                                                    </td>
                                                    {/* Status column merged into Price */}
                                                    <td className="px-4 py-2">
                                                        <div className="flex flex-col gap-0.5">
                                                            {item.estimate_item_id ? (
                                                                <span className="text-sm text-slate-600 block font-medium">{item.part_no}</span>
                                                            ) : (
                                                                <Input
                                                                    className="!px-0 !border-b !border-transparent hover:!border-slate-300 focus:!border-blue-500 !bg-transparent !rounded-none !ring-0 !text-sm text-slate-600 font-medium !h-auto !py-0.5"
                                                                    value={item.part_no || ''}
                                                                    onChange={(e) => setItems(items.map(i => i.id === item.id ? { ...i, part_no: e.target.value } : i))}
                                                                    onBlur={async (e: any) => await supabase.from('order_items').update({ part_no: e.target.value }).eq('id', item.id)}
                                                                    placeholder="도번"
                                                                />
                                                            )}
                                                            <div className="text-[11px] text-slate-500 leading-tight">
                                                                <div className="truncate max-w-[200px]" title={item.spec || ''}>{item.spec}</div>
                                                                <div className="text-slate-400">{item.material_name}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <NumberInput
                                                            className="text-left border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none bg-transparent text-sm font-bold p-0"
                                                            value={item.qty}
                                                            onChange={(val) => setItems(items.map(i => i.id === item.id ? { ...i, qty: val } : i))}
                                                            onBlur={async () => {
                                                                const newQty = item.qty;
                                                                const newSupply = newQty * item.unit_price;
                                                                await supabase.from('order_items').update({ qty: newQty, supply_price: newSupply }).eq('id', item.id);
                                                                const updatedItems = items.map(i => i.id === item.id ? { ...i, qty: newQty, supply_price: newSupply } : i);
                                                                setItems(updatedItems);
                                                                const newTotal = updatedItems.reduce((sum, it) => sum + (it.supply_price || 0), 0);
                                                                await supabase.from('orders').update({ total_amount: newTotal }).eq('id', order!.id);
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        <div className="flex flex-col items-end gap-1">
                                                            <div className="flex items-center gap-1 group/price">
                                                                {/* Per-item Currency Selector */}
                                                                <select
                                                                    className="text-sm bg-slate-50 border-none outline-none font-black text-slate-500 cursor-pointer hover:text-blue-600 focus:text-blue-600 appearance-none px-1"
                                                                    value={item.currency || (order as any)?.clients?.currency || 'KRW'}
                                                                    onChange={async (e) => {
                                                                        const prevCurrency = item.currency || (order as any)?.clients?.currency || 'KRW';
                                                                        const newCurrency = e.target.value;

                                                                        // 1. Determine Rate (Same logic as display)
                                                                        let rate = 1;
                                                                        if (item.estimate_items) {
                                                                            const estData = (item.estimate_items as any)?.estimates;
                                                                            rate = Array.isArray(estData) ? (estData[0]?.base_exchange_rate || 1) : (estData?.base_exchange_rate || 1);

                                                                            // Parent Priority
                                                                            if ((order as any)?.estimates?.base_exchange_rate && (order as any)?.estimates?.base_exchange_rate > 1) {
                                                                                rate = (order as any).estimates.base_exchange_rate;
                                                                            }
                                                                        } else {
                                                                            rate = item.exchange_rate || 1;
                                                                        }

                                                                        // Fallback to explicit rate if available and rate is still 1
                                                                        if (rate === 1 && editForm.exchange_rate > 1) rate = editForm.exchange_rate;


                                                                        // 2. Calculate New Unit Price
                                                                        let newUnitPrice = item.unit_price;

                                                                        if (prevCurrency === 'KRW' && newCurrency !== 'KRW') {
                                                                            // KRW -> Foreign (Divide)
                                                                            newUnitPrice = item.unit_price / rate;
                                                                        } else if (prevCurrency !== 'KRW' && newCurrency === 'KRW') {
                                                                            // Foreign -> KRW (Multiply)
                                                                            newUnitPrice = item.unit_price * rate;
                                                                        }

                                                                        // Rounding (KRW: 0 decimals, Foreign: 2 decimals usually, but keep precise for internal?)
                                                                        // Let's round to 2 decimals for Foreign, Integer for KRW to be clean
                                                                        if (newCurrency === 'KRW') newUnitPrice = Math.round(newUnitPrice);
                                                                        else newUnitPrice = Number(newUnitPrice.toFixed(2));

                                                                        const newSupplyPrice = newUnitPrice * item.qty;

                                                                        // 3. Update State & DB
                                                                        const updatedItems = items.map(i => i.id === item.id ? { ...i, currency: newCurrency, unit_price: newUnitPrice, supply_price: newSupplyPrice } : i);
                                                                        setItems(updatedItems);

                                                                        await supabase.from('order_items').update({
                                                                            currency: newCurrency,
                                                                            unit_price: newUnitPrice,
                                                                            supply_price: newSupplyPrice
                                                                        }).eq('id', item.id);

                                                                        // 4. Recalculate Total (Sum of KRW converted)
                                                                        const newTotal = updatedItems.reduce((sum, it) => {
                                                                            // Re-evaluate rate for each item for total calc
                                                                            let r = 1;
                                                                            if (it.estimate_item_id) {
                                                                                const estData = (it.estimate_items as any)?.estimates;
                                                                                r = Array.isArray(estData) ? (estData[0]?.base_exchange_rate || 1) : (estData?.base_exchange_rate || 1);
                                                                                if ((order as any)?.estimates?.base_exchange_rate && (order as any)?.estimates?.base_exchange_rate > 1) {
                                                                                    r = (order as any).estimates.base_exchange_rate;
                                                                                }
                                                                            } else {
                                                                                r = it.exchange_rate || 1;
                                                                            }

                                                                            // If Item is Foreign, convert to KRW for Total
                                                                            const itemCurr = it.currency || 'KRW';
                                                                            const itemSupply = it.supply_price || 0;

                                                                            if (itemCurr !== 'KRW') return sum + (itemSupply * r);
                                                                            else return sum + itemSupply;
                                                                        }, 0);
                                                                        await supabase.from('orders').update({ total_amount: newTotal }).eq('id', order!.id);
                                                                    }}
                                                                >
                                                                    <option value="KRW">₩</option>
                                                                    <option value="USD">$</option>
                                                                    <option value="EUR">€</option>
                                                                    <option value="JPY">¥</option>
                                                                    <option value="CNY">¥</option>
                                                                </select>

                                                                <NumberInput
                                                                    className={`w-44 text-right border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none bg-transparent text-sm font-black p-0 ${item.estimate_items && item.unit_price !== item.estimate_items.unit_price ? 'text-red-600' : 'text-slate-800'}`}
                                                                    value={item.unit_price}
                                                                    onChange={(val) => setItems(items.map(i => i.id === item.id ? { ...i, unit_price: val } : i))}
                                                                    onBlur={async () => {
                                                                        const newPrice = item.unit_price;
                                                                        const newSupply = item.qty * newPrice;
                                                                        await supabase.from('order_items').update({ unit_price: newPrice, supply_price: newSupply }).eq('id', item.id);
                                                                        const updatedItems = items.map(i => i.id === item.id ? { ...i, unit_price: newPrice, supply_price: newSupply } : i);
                                                                        setItems(updatedItems);

                                                                        // Recalculate total sum
                                                                        const newTotal = updatedItems.reduce((sum, it) => {
                                                                            const rate = it.estimate_item_id ? ((it.estimate_items as any)?.estimates?.exchange_rate || 1) : (it.exchange_rate || 1);
                                                                            return sum + ((it.supply_price || 0) * rate);
                                                                        }, 0);
                                                                        await supabase.from('orders').update({ total_amount: newTotal }).eq('id', order!.id);
                                                                    }}
                                                                />
                                                            </div>
                                                            {/* Exchange Rate if not KRW AND Not Linked (Linked uses estimate rate implicitly) */}
                                                            {item.currency && item.currency !== 'KRW' && !item.estimate_item_id && (
                                                                <div className="flex items-center gap-1 text-[9px] mt-0.5">
                                                                    <span className="text-slate-400">Rate:</span>
                                                                    <NumberInput
                                                                        className="w-16 text-right border-b border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent text-slate-500 outline-none"
                                                                        value={item.exchange_rate || 1}
                                                                        onChange={(val) => setItems(items.map(i => i.id === item.id ? { ...i, exchange_rate: val } : i))}
                                                                        onBlur={async () => {
                                                                            const newRate = item.exchange_rate || 1;
                                                                            await supabase.from('order_items').update({ exchange_rate: newRate }).eq('id', item.id);
                                                                            const updatedItems = items.map(i => i.id === item.id ? { ...i, exchange_rate: newRate } : i);

                                                                            const newTotal = updatedItems.reduce((sum, it) => {
                                                                                const rate = it.estimate_item_id ? ((it.estimate_items as any)?.estimates?.exchange_rate || 1) : (it.exchange_rate || 1);
                                                                                return sum + ((it.supply_price || 0) * rate);
                                                                            }, 0);
                                                                            await supabase.from('orders').update({ total_amount: newTotal }).eq('id', order!.id);
                                                                        }}
                                                                    />
                                                                </div>
                                                            )}
                                                            {/* Estimate Comparison */}
                                                            {item.estimate_items && (
                                                                <div className="text-[10px] flex flex-col items-end leading-tight mt-1">
                                                                    {(() => {
                                                                        const estData = (item.estimate_items as any)?.estimates;
                                                                        let estRate = Array.isArray(estData)
                                                                            ? (estData[0]?.base_exchange_rate || 1)
                                                                            : (estData?.base_exchange_rate || 1);

                                                                        // [Fix] Prioritize Parent Estimate Rate if available (Primary Source of Truth)
                                                                        if ((order as any)?.estimates?.base_exchange_rate && (order as any)?.estimates?.base_exchange_rate > 1) {
                                                                            estRate = (order as any).estimates.base_exchange_rate;
                                                                        }

                                                                        const targetCurrency = item.currency || (order as any)?.clients?.currency || 'KRW';
                                                                        const isKRW = targetCurrency === 'KRW';



                                                                        const estUnitPriceInOrderCurrency = isKRW
                                                                            ? item.estimate_items.unit_price
                                                                            : (item.estimate_items.unit_price / estRate);

                                                                        const diff = item.unit_price - estUnitPriceInOrderCurrency;
                                                                        const tolerance = isKRW ? 10 : 0.01;
                                                                        const isMatch = Math.abs(diff) < tolerance;

                                                                        return (
                                                                            <>
                                                                                <div className="flex items-center gap-1">
                                                                                    {/* Status Badge */}
                                                                                    {isMatch ? (
                                                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-green-50 text-green-600 shrink-0">
                                                                                            ✅ 일치
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-red-50 text-red-500 shrink-0">
                                                                                            ⚠️ 불일치
                                                                                        </span>
                                                                                    )}
                                                                                    <span className="text-slate-400 font-bold ml-1">견적단가:</span>
                                                                                    <span className="text-slate-500 font-bold">
                                                                                        {estUnitPriceInOrderCurrency.toLocaleString(undefined, { maximumFractionDigits: isKRW ? 0 : 2 })}
                                                                                    </span>
                                                                                </div>

                                                                                {!isMatch && (
                                                                                    <div className="flex items-center gap-1 mt-0.5">
                                                                                        <span className="text-slate-400">차액:</span>
                                                                                        <span className={`${diff > 0 ? 'text-red-500' : 'text-green-600'} font-black`}>
                                                                                            {diff > 0 ? '+' : ''}
                                                                                            {diff.toLocaleString(undefined, { maximumFractionDigits: isKRW ? 0 : 2 })}
                                                                                        </span>
                                                                                    </div>
                                                                                )}
                                                                            </>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    {/* Files Column */}
                                                    <td className="px-4 py-2 text-center align-top">
                                                        <div className="flex flex-col gap-1 items-start">
                                                            {myFiles.length > 0 ? (
                                                                myFiles.map(f => (
                                                                    <div key={f.id} className="flex items-center gap-1 w-full relative group">
                                                                        <button
                                                                            className="flex-1 text-left text-xs bg-slate-100 px-2 py-1 rounded text-blue-600 hover:bg-blue-50 truncate"
                                                                            onClick={() => handlePreviewFile(f)}
                                                                            title={f.original_name}
                                                                        >
                                                                            <span className="font-bold mr-1">
                                                                                {(f.original_name || '').endsWith('.pdf') ? 'PDF' : (f.original_name || '').match(/\.(png|jpg|jpeg)$/i) ? 'IMG' : 'FILE'}
                                                                            </span>
                                                                            {f.original_name || '이름 없음'}
                                                                        </button>
                                                                        {/* PDF Masking/Split Button */}
                                                                        {(f.original_name || '').toLowerCase().endsWith('.pdf') && (
                                                                            <Button
                                                                                variant="secondary"
                                                                                size="sm"
                                                                                className="absolute right-0 top-0 bottom-0 !px-2 bg-purple-100 hover:bg-purple-200 text-purple-600 transition-opacity !text-xs !leading-none !rounded-none !rounded-r border-none"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleOpenSplitter(f);
                                                                                }}
                                                                                title="마스킹 및 편집"
                                                                            >
                                                                                🖍️
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <span className="text-xs text-slate-300 w-full text-center">-</span>
                                                            )}
                                                            <Button variant="secondary" size="sm" className="!text-[10px] !h-6 !px-1 w-full text-center opacity-60 hover:opacity-100">+ 파일</Button>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <div className="flex flex-col gap-1">
                                                            {/* [Update] Item Date Picker */}
                                                            <Input
                                                                type="date"
                                                                className="!px-0 !border-b !border-transparent hover:!border-slate-300 focus:!border-blue-500 !bg-transparent !rounded-none !ring-0 text-[11px] !text-slate-500 font-mono"
                                                                value={item.due_date ? item.due_date.split('T')[0] : ''} // YYYY-MM-DD
                                                                onChange={(e) => setItems(items.map(i => i.id === item.id ? { ...i, due_date: e.target.value } : i))}
                                                                onBlur={async (e: any) => await supabase.from('order_items').update({ due_date: e.target.value }).eq('id', item.id)}
                                                            />
                                                            <Input
                                                                className="!px-0 !border-b !border-transparent hover:!border-slate-300 focus:!border-blue-500 !bg-transparent !rounded-none !ring-0 text-[11px] !text-slate-400"
                                                                placeholder="비고"
                                                                value={item.note || ''}
                                                                onChange={(e) => setItems(items.map(i => i.id === item.id ? { ...i, note: e.target.value } : i))}
                                                                onBlur={async (e: any) => await supabase.from('order_items').update({ note: e.target.value }).eq('id', item.id)}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2 text-center">
                                                        <Button
                                                            size="sm"
                                                            variant="danger"
                                                            onClick={async () => {
                                                                if (!confirm('삭제하시겠습니까?')) return;
                                                                await supabase.from('order_items').delete().eq('id', item.id);
                                                                setItems(items.filter(i => i.id !== item.id));
                                                            }}
                                                            className="h-[28px] py-0 px-2 opacity-70 hover:opacity-100" // Compact button
                                                        >
                                                            🗑️
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>

                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden space-y-3 p-4 bg-slate-50">
                            {items.length === 0 ? (
                                <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400 font-bold">
                                    등록된 품목이 없습니다.
                                </div>
                            ) : (
                                items.map(item => {
                                    const myFiles = itemFiles.filter(f => f.order_item_id === item.id);
                                    return (
                                        <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-start gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedItemIds.has(item.id)}
                                                        onChange={() => toggleSelectItem(item.id)}
                                                        className="w-5 h-5 text-blue-600 rounded mt-1"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="flex flex-col gap-1 mb-1">
                                                            <div className="flex items-center gap-2">
                                                                <Input
                                                                    className="!text-base !font-black !text-slate-800 tracking-tight !bg-transparent !outline-none !border-b !border-transparent focus:!border-blue-500 flex-1 !px-0 !rounded-none !ring-0 !py-1"
                                                                    value={item.order_item_no || ''}
                                                                    onChange={(e) => setItems(items.map(i => i.id === item.id ? { ...i, order_item_no: e.target.value } : i))}
                                                                    onBlur={async (e: any) => await supabase.from('order_items').update({ order_item_no: e.target.value }).eq('id', item.id)}
                                                                    placeholder="수주번호"
                                                                />
                                                                {item.estimate_items && (
                                                                    item.unit_price === item.estimate_items.unit_price ? (
                                                                        <span className="shrink-0 bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded">일치</span>
                                                                    ) : (
                                                                        <span className="shrink-0 bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded">불일치</span>
                                                                    )
                                                                )}
                                                            </div>
                                                            <Input
                                                                className="!text-xs !text-slate-500 !font-medium !bg-transparent !outline-none !border-b !border-transparent focus:!border-blue-500 w-full !px-0 !rounded-none !ring-0 !py-1"
                                                                value={item.part_name || ''}
                                                                onChange={async (e) => {
                                                                    const val = e.target.value;
                                                                    setItems(items.map(i => i.id === item.id ? { ...i, part_name: val } : i));
                                                                }}
                                                                onBlur={async (e: any) => await supabase.from('order_items').update({ part_name: e.target.value }).eq('id', item.id)}
                                                                placeholder="품명"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Price Info */}
                                                <div className="text-right shrink-0 ml-2">
                                                    <p className="text-lg font-black text-blue-700 leading-none">
                                                        {editForm.currency === 'KRW' ? '₩' : editForm.currency + ' '}
                                                        {(item.supply_price || 0).toLocaleString()}
                                                    </p>
                                                    <div className="mt-2 flex flex-col items-end gap-1">
                                                        <div className="text-xs text-slate-500 font-bold">
                                                            단가: {item.unit_price.toLocaleString()} x {item.qty}
                                                        </div>
                                                        {/* Comparison with Estimate */}
                                                        {item.estimate_items && (() => {
                                                            const estData = (item.estimate_items.estimates as any);
                                                            let estRate = Array.isArray(estData)
                                                                ? (estData[0]?.base_exchange_rate || 1)
                                                                : (estData?.base_exchange_rate || 1);

                                                            // [Fix] Prioritize Parent Estimate Rate if available
                                                            if ((order as any)?.estimates?.base_exchange_rate && (order as any)?.estimates?.base_exchange_rate > 1) {
                                                                estRate = (order as any).estimates.base_exchange_rate;
                                                            }

                                                            const targetCurrency = item.currency || (order as any)?.clients?.currency || 'KRW';
                                                            const isKRW = targetCurrency === 'KRW';



                                                            const estUnitPriceInOrderCurrency = isKRW
                                                                ? item.estimate_items.unit_price
                                                                : (item.estimate_items.unit_price / estRate);

                                                            const diff = item.unit_price - estUnitPriceInOrderCurrency;
                                                            const tolerance = isKRW ? 10 : 0.01;

                                                            if (Math.abs(diff) < tolerance) return null;

                                                            return (
                                                                <div className="text-[10px] flex flex-col items-end leading-tight">
                                                                    <span className="text-slate-400">
                                                                        견적단가: {estUnitPriceInOrderCurrency.toLocaleString(undefined, { maximumFractionDigits: isKRW ? 0 : 2 })}
                                                                    </span>
                                                                    <span className={`${diff > 0 ? 'text-red-500' : 'text-green-600'} font-bold`}>
                                                                        {diff > 0 ? '+' : ''}
                                                                        {diff.toLocaleString(undefined, { maximumFractionDigits: isKRW ? 0 : 2 })}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-3 rounded-lg border border-slate-100 mb-3">
                                                    <div className="flex flex-col gap-1">
                                                        <p className="text-slate-400 font-bold">규격/재질</p>
                                                        <p className="text-slate-700 font-bold">{item.spec || '-'}</p>
                                                        <p className="text-blue-600 font-bold truncate">{item.material_name || '-'}</p>
                                                    </div>
                                                    <div className="flex flex-col gap-1 text-right">
                                                        <p className="text-slate-400 font-bold">납기/비고</p>
                                                        <Input
                                                            type="date"
                                                            className="!text-right !bg-transparent !outline-none !text-slate-800 !font-bold w-full !px-0 !border-none !ring-0 !p-0 !h-auto"
                                                            value={item.due_date ? item.due_date.split('T')[0] : ''}
                                                            onChange={(e) => setItems(items.map(i => i.id === item.id ? { ...i, due_date: e.target.value } : i))}
                                                            onBlur={async (e: any) => await supabase.from('order_items').update({ due_date: e.target.value }).eq('id', item.id)}
                                                        />
                                                        <Input
                                                            className="!text-right !bg-transparent !outline-none !text-slate-500 w-full !px-0 !border-none !ring-0 !p-0 !h-auto"
                                                            value={item.note || ''}
                                                            onChange={(e) => setItems(items.map(i => i.id === item.id ? { ...i, note: e.target.value } : i))}
                                                            onBlur={async (e: any) => await supabase.from('order_items').update({ note: e.target.value }).eq('id', item.id)}
                                                            placeholder="비고 입력"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Files & Actions */}
                                                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                                    <div className="flex flex-wrap gap-2 items-center">
                                                        {myFiles.map(f => (
                                                            <div key={f.id} className="relative group">
                                                                <button
                                                                    onClick={() => handlePreviewFile(f)}
                                                                    className="inline-flex items-center gap-1 text-[10px] bg-slate-50 border px-2 py-1 rounded text-blue-600 max-w-[120px] truncate hover:bg-blue-50"
                                                                >
                                                                    📄 {f.original_name}
                                                                </button>
                                                                {(f.original_name || '').toLowerCase().endsWith('.pdf') && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleOpenSplitter(f);
                                                                        }}
                                                                        className="ml-1 text-[10px] p-1 bg-purple-50 rounded text-purple-600 border border-purple-100"
                                                                        title="마스킹 및 편집"
                                                                    >
                                                                        🖍️
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                        <Button variant="secondary" size="sm" className="!text-[10px] !h-6 !px-1 opacity-60 hover:opacity-100">+ 파일</Button>
                                                    </div>

                                                    <Button
                                                        size="sm"
                                                        variant="danger"
                                                        onClick={async () => {
                                                            if (!confirm('삭제하시겠습니까?')) return;
                                                            await supabase.from('order_items').delete().eq('id', item.id);
                                                            setItems(items.filter(i => i.id !== item.id));
                                                        }}
                                                        className="h-[28px] px-2 opacity-70 hover:opacity-100 ml-2 shrink-0"
                                                    >
                                                        🗑️
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </Card>
                </Section>

                {/* Shipment History Section */}
                {shipments.length > 0 && (
                    <Section title="출하 이력 (Shipment History)">
                        <div className="space-y-4">
                            {shipments.map(shipment => (
                                <Card key={shipment.id} className="border border-teal-100">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-teal-700">{shipment.shipment_no}</span>
                                                <span className="text-xs text-gray-500">{shipment.created_at?.substring(0, 10)}</span>
                                                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">{shipment.courier} {shipment.tracking_no}</span>
                                            </div>
                                            <div className="text-sm text-gray-600 mt-1">
                                                To: {shipment.recipient_name} ({shipment.recipient_contact})
                                            </div>
                                        </div>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => setPrintingShipment(shipment)}
                                            className="ml-2 hover:bg-slate-50 shrink-0"
                                        >
                                            🖨️ 라벨 인쇄
                                        </Button>
                                    </div>
                                    <div className="bg-gray-50 p-2 rounded text-sm">
                                        <ul className="list-disc pl-4 text-gray-600">
                                            {shipment.shipment_items.map(si => {
                                                const orderItem = items.find(i => i.id === si.order_item_id);
                                                return (
                                                    <li key={si.id}>
                                                        {orderItem?.part_name} ({orderItem?.part_no}) - <strong>{si.quantity} ea</strong>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </Section>
                )}

                {/* Modals */}
                {orderId && (
                    <ShipmentModal
                        isOpen={isShipmentModalOpen}
                        onClose={() => setIsShipmentModalOpen(false)}
                        orderId={orderId}
                        items={items}
                        onSuccess={() => {
                            fetchShipments();
                            fetchOrder(orderId);
                        }}
                    />
                )}

                {printingShipment && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
                        <ShipmentLabelPrinter
                            shipment={printingShipment}
                            onClose={() => setPrintingShipment(null)}
                        />
                    </div>
                )}
            </div >

            <LabelPrinterModal
                isOpen={isLabelModalOpen}
                onClose={() => setIsLabelModalOpen(false)}
                order={order}
                items={items}
            />

            <ClipboardMatchModal
                isOpen={isClipboardModalOpen}
                onClose={() => setIsClipboardModalOpen(false)}
                onMatch={handleClipboardMatch}
                defaultCurrency={(order as any)?.clients?.currency || 'KRW'}
            />

            <MaskingModal
                isOpen={isMaskingModalOpen}
                onClose={() => setIsMaskingModalOpen(false)}
                fileUrl={maskingFile?.url || ''}
                fileName={maskingFile?.name || ''}
                onSave={handleSaveMaskedFile}
            />

            <PdfSplitterModal
                isOpen={isPdfSplitterOpen}
                onClose={() => { setIsPdfSplitterOpen(false); setInitialPdfUrl(null); setEditingFile(null); }}
                items={items}
                onAssign={handlePdfSplitAssign}
                initialFileUrl={initialPdfUrl}
                editingFile={editingFile}
            />
        </div >
    );
}
