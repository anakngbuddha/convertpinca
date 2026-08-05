import ExcelJS from 'exceljs';

const thinBorder = { style: 'thin', color: { argb: 'FFD9D9D9' } };
const formalBorder = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };
const font = { name: 'Calibri', size: 11, color: { argb: 'FF000000' } };
const labelFont = { ...font, bold: true };
const moneyFormat = '₱ #,##0.00';

function setCell(cell, value, options = {}) {
  cell.value = value;
  cell.font = options.font || font;
  cell.border = formalBorder;
  cell.alignment = options.alignment || { vertical: 'center' };
  if (options.numFmt) cell.numFmt = options.numFmt;
}

function resetSheet(sheet) {
  sheet.properties.defaultRowHeight = 18;
  sheet.views = [{ showGridLines: false }];
  sheet.eachRow((row) => row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    cell.font = font;
    cell.border = formalBorder;
  }));
}

function findSheet(workbook, name) { return workbook.getWorksheet(name) || workbook.addWorksheet(name); }
function setWidths(sheet, widths) { for (const [column, width] of Object.entries(widths)) sheet.getColumn(column).width = width; }

function writeSummary(sheet, map, model) {
  resetSheet(sheet);
  sheet.name = 'Summary';
  setWidths(sheet, { A: 18, B: 30, C: 25, D: 18, E: 18 });
  sheet.mergeCells('A1:E1');
  setCell(sheet.getCell(map.title || 'A1'), 'HUAWEI CLOUD BILL', { font: { ...labelFont, size: 16 }, alignment: { horizontal: 'center', vertical: 'center' } });
  sheet.getRow(1).height = 28;
  const { document, totals } = model;
  const rate = document.exchangeRateUsdToPhp;
  const totalPhp = document.totalPhp ?? (rate ? totals.invoice * rate : null);
  setCell(sheet.getCell('A5'), document.billingMonth || '');
  setCell(sheet.getCell('A6'), 'Account Name:', { font: labelFont }); setCell(sheet.getCell('B6'), document.customerName || '');
  setCell(sheet.getCell('C6'), 'Remaining Amount Due:', { font: labelFont }); setCell(sheet.getCell('D6'), totalPhp, { numFmt: moneyFormat });
  setCell(sheet.getCell('A7'), 'Billing Cycle:', { font: labelFont }); setCell(sheet.getCell('B7'), document.billingCycle || '');
  setCell(sheet.getCell('C7'), 'Bill Amount:', { font: labelFont }); setCell(sheet.getCell('D7'), totalPhp, { numFmt: moneyFormat });
  setCell(sheet.getCell('A8'), 'Export Time:', { font: labelFont }); setCell(sheet.getCell('B8'), document.exportTime || '');
  setCell(sheet.getCell('C8'), 'Invoice No:', { font: labelFont }); setCell(sheet.getCell('D8'), document.invoiceNumber || '');
  setCell(sheet.getCell('A10'), 'Summary', { font: { ...labelFont, size: 13 } });
  setCell(sheet.getCell('A12'), 'Total', { font: labelFont }); setCell(sheet.getCell('B13'), totalPhp, { numFmt: moneyFormat, font: labelFont });
  setCell(sheet.getCell('A13'), '', { font: labelFont });
}

function writeResources(sheet, map, model, categories) {
  resetSheet(sheet);
  sheet.name = 'Resources';
  setWidths(sheet, { A: 36, B: 18 });
  setCell(sheet.getCell('A1'), 'Resources', { font: labelFont, alignment: { horizontal: 'center' } });
  setCell(sheet.getCell('B1'), 'DP', { font: labelFont, alignment: { horizontal: 'center' } });
  const rate = model.document.exchangeRateUsdToPhp;
  const totalsByCategory = new Map();
  for (const service of model.services || []) {
    const key = service.category.trim().toLowerCase();
    totalsByCategory.set(key, (totalsByCategory.get(key) || 0) + service.amount);
  }
  categories.forEach((category, index) => {
    const row = 2 + index;
    const usd = totalsByCategory.get(category.toLowerCase()) || 0;
    const php = rate ? usd * rate : usd;
    setCell(sheet.getCell(`A${row}`), category);
    setCell(sheet.getCell(`B${row}`), php, { numFmt: moneyFormat, alignment: { horizontal: 'right', vertical: 'center' } });
  });
  const totalRow = 2 + categories.length;
  setCell(sheet.getCell(`A${totalRow}`), '', { font: labelFont });
  setCell(sheet.getCell(`B${totalRow}`), { formula: `SUM(B2:B${totalRow - 1})` }, { numFmt: moneyFormat, font: labelFont, alignment: { horizontal: 'right', vertical: 'center' } });
}

export async function writeExcel(templatePath, templateConfig, canonicalModel) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  const summary = findSheet(workbook, 'Summary');
  const resources = findSheet(workbook, 'Resources');
  for (const sheet of [...workbook.worksheets]) if (!['Summary', 'Resources'].includes(sheet.name)) workbook.removeWorksheet(sheet.id);
  writeSummary(summary, templateConfig.cellMap.summary, canonicalModel);
  writeResources(resources, templateConfig.cellMap.resources, canonicalModel, templateConfig.resourceCategories || []);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
