import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { EstimateItem, EXCEL_AVAILABLE_COLUMNS } from '../types/estimate';

export const exportEstimateToExcel = async (
  items: EstimateItem[],
  columnIds: string[],
  fileName: string
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('견적서');

  // 1. 헤더 설정
  // 저장된 columnIds 순서대로 헤더를 구성합니다.
  const columns = columnIds.map(id => {
    const colDef = EXCEL_AVAILABLE_COLUMNS.find(c => c.id === id);
    return {
      header: colDef ? colDef.label : id,
      key: id,
      width: 15, // 기본 너비
    };
  });

  worksheet.columns = columns;

  // 2. 스타일 적용 (헤더)
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  
  // 3. 데이터 추가
  // [수정] 사용하지 않는 index 매개변수 제거
  items.forEach((item) => {
    const rowData: any = { ...item };
    
    // 데이터 가공 (필요 시)
    // 예: 순번 추가, 날짜 포맷 등
    // 여기서는 기본 데이터 그대로 매핑합니다.
    
    // 특수 처리: 원자재명 (ID 대신 이름이 필요하다면 로직 추가 필요)
    // 현재는 EstimateItem에 material_name 속성이 없으므로, 필요시 상위에서 매핑해서 넘겨줘야 함.
    // 일단은 있는 그대로 출력.

    worksheet.addRow(rowData);
  });

  // 4. 파일 생성 및 저장
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${fileName}.xlsx`);
};