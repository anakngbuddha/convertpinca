/**
 * Script to generate the huawei-cloud template.xlsx file.
 * Run once with: node scripts/generate-template.js
 */
import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, '../templates/huawei-cloud/template.xlsx');

async function generate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ConvertPinca';
  wb.created = new Date();

  const ws = wb.addWorksheet('Billing Statement');

  // --- Column widths ---
  ws.columns = [
    { width: 30 }, // A - Service Name
    { width: 28 }, // B - Resource ID
    { width: 20 }, // C - Usage Amount
    { width: 16 }, // D - Unit Price
    { width: 16 }, // E - Total Cost
  ];

  // --- Colors ---
  const PURPLE = '7C3AED';
  const DARK_BG = '0F0F1A';
  const HEADER_BG = '1E1B4B';
  const ROW_ALT = '1A1A2E';
  const WHITE = 'FFFFFF';
  const GRAY = '94A3B8';

  const purpleFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${PURPLE}` } };
  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${HEADER_BG}` } };
  const darkFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${DARK_BG}` } };
  const altFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${ROW_ALT}` } };

  // --- Title Row (rows 1-2) ---
  ws.mergeCells('A1:E2');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'HUAWEI CLOUD — BILLING STATEMENT';
  titleCell.font = { bold: true, size: 16, color: { argb: `FF${WHITE}` }, name: 'Calibri' };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  titleCell.fill = purpleFill;

  // --- Metadata rows (3-8) ---
  const metaKeys = [
    [3, 'Invoice Number', 'C4'],
    [4, 'Customer Name', 'C5'],
    [5, 'Billing Date', 'C6'],
    [6, 'Currency', 'C7'],
    [7, 'Total Amount', 'C8'],
  ];

  const metaLabels = ['', 'Invoice Number', 'Customer Name', 'Billing Date', 'Currency', 'Total Amount'];
  for (let r = 3; r <= 8; r++) {
    const row = ws.getRow(r);
    row.height = 22;

    // Merge A-B for label
    ws.mergeCells(`A${r}:B${r}`);
    const labelCell = ws.getCell(`A${r}`);
    labelCell.fill = headerFill;
    labelCell.font = { bold: true, color: { argb: `FF${GRAY}` }, size: 10, name: 'Calibri' };
    labelCell.alignment = { vertical: 'middle', horizontal: 'right' };
    if (metaLabels[r - 2]) labelCell.value = metaLabels[r - 2].toUpperCase();

    // Merge C-E for value
    ws.mergeCells(`C${r}:E${r}`);
    const valueCell = ws.getCell(`C${r}`);
    valueCell.fill = darkFill;
    valueCell.font = { color: { argb: `FF${WHITE}` }, size: 11, name: 'Calibri' };
    valueCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    valueCell.border = {
      bottom: { style: 'thin', color: { argb: 'FF2D2D4E' } },
    };
  }

  // --- Separator row 9 ---
  ws.getRow(9).height = 8;
  ws.mergeCells('A9:E9');
  ws.getCell('A9').fill = purpleFill;

  // --- Column Headers row 10 ---
  const colHeaders = ['Service Name', 'Resource ID', 'Usage / Qty', 'Unit Price', 'Total Cost'];
  const headerRow = ws.getRow(10);
  headerRow.height = 28;
  colHeaders.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.fill = purpleFill;
    cell.font = { bold: true, color: { argb: `FF${WHITE}` }, size: 10, name: 'Calibri' };
    cell.alignment = { vertical: 'middle', horizontal: i >= 3 ? 'right' : 'left' };
    if (i >= 3) cell.numFmt = '#,##0.00';
  });

  // --- Line item placeholder rows 11-25 ---
  for (let r = 11; r <= 25; r++) {
    const row = ws.getRow(r);
    row.height = 20;
    for (let c = 1; c <= 5; c++) {
      const cell = row.getCell(c);
      cell.fill = r % 2 === 0 ? altFill : darkFill;
      cell.font = { color: { argb: `FF${WHITE}` }, size: 10, name: 'Calibri' };
      cell.alignment = { vertical: 'middle', horizontal: c >= 4 ? 'right' : 'left' };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FF1E1E3A' } },
      };
      if (c >= 4) cell.numFmt = '#,##0.00';
    }
  }

  // --- Footer total row 26 ---
  const totalRow = ws.getRow(26);
  totalRow.height = 26;
  ws.mergeCells('A26:C26');
  const totalLabelCell = ws.getCell('A26');
  totalLabelCell.value = 'TOTAL';
  totalLabelCell.font = { bold: true, color: { argb: `FF${WHITE}` }, size: 11, name: 'Calibri' };
  totalLabelCell.fill = headerFill;
  totalLabelCell.alignment = { vertical: 'middle', horizontal: 'right' };

  ws.mergeCells('D26:E26');
  const totalValueCell = ws.getCell('D26');
  totalValueCell.fill = purpleFill;
  totalValueCell.font = { bold: true, color: { argb: `FF${WHITE}` }, size: 12, name: 'Calibri' };
  totalValueCell.alignment = { vertical: 'middle', horizontal: 'right' };
  totalValueCell.numFmt = '#,##0.00';

  // Protect sheet structure
  ws.views = [{ showGridLines: false }];

  await wb.xlsx.writeFile(OUT_PATH);
  console.log(`✅ Template written to ${OUT_PATH}`);
}

generate().catch(console.error);
