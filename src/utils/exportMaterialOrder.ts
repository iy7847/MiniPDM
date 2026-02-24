import * as ExcelJS from 'exceljs';
import { ExtendedProductionItem } from '../pages/ProductionManagement';

export const exportMaterialOrder = async (items: ExtendedProductionItem[]) => {
    // 1. 워크북 및 워크시트 생성
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('소재 발주서');

    // 2. 컬럼 헤더 설정
    worksheet.columns = [
        { header: '도번', key: 'part_no', width: 20 },
        { header: '품명', key: 'part_name', width: 25 },
        { header: '형태', key: 'shape', width: 10 },
        { header: '재질', key: 'material', width: 20 },
        { header: '두께/외경(mm)', key: 'thickness_or_diameter', width: 15 },
        { header: '가로/길이(mm)', key: 'width_or_length', width: 15 },
        { header: '세로(mm)', key: 'depth', width: 12 },
        { header: '수량', key: 'qty', width: 10 },
        { header: '비고', key: 'note', width: 20 },
    ];

    // 헤더 스타일 지정
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // 3. 데이터 채우기
    items.forEach(item => {
        const estItem = item.estimate_items;
        const shape = estItem?.shape === 'round' ? '봉재' : '판재';
        const material = estItem?.materials?.code || estItem?.materials?.name || item.material_name || '';

        let tOrD = '';
        let wOrL = '';
        let d = '';

        if (estItem?.shape === 'round') {
            // 봉재 (round)
            // 지름: raw_w, 길이: raw_d
            tOrD = estItem.raw_w ? `∅${estItem.raw_w}` : '-';
            wOrL = estItem.raw_d ? `${estItem.raw_d}` : '-';
            d = '-';
        } else {
            // 판재 (rect)
            // 두께: raw_h, 가로: raw_w, 세로: raw_d
            tOrD = estItem?.raw_h ? `${estItem.raw_h}` : '-';
            wOrL = estItem?.raw_w ? `${estItem.raw_w}` : '-';
            d = estItem?.raw_d ? `${estItem.raw_d}` : '-';
        }

        worksheet.addRow({
            part_no: item.part_no,
            part_name: item.part_name,
            shape: shape,
            material: material,
            thickness_or_diameter: tOrD,
            width_or_length: wOrL,
            depth: d,
            qty: item.qty,
            note: ''
        });
    });

    // 중앙 정렬 (수량 등)
    worksheet.getColumn('qty').alignment = { horizontal: 'center' };
    worksheet.getColumn('shape').alignment = { horizontal: 'center' };

    // 4. 버퍼 생성 및 브라우저 다운로드 실행
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    // 파일명 생성
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filename = `소재발주서_${today}.xlsx`;

    // 가상의 a 태그를 생성하여 클라이언트 사이드 다운로드 트리거
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
