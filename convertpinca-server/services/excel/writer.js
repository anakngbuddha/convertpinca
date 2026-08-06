import ExcelJS from 'exceljs';

const black = { name: 'Calibri', size: 11, color: { argb: 'FF000000' } };
const bold = { ...black, bold: true };
const title = { ...bold, size: 16 };
const thin = { style: 'thin', color: { argb: 'FFD9D9D9' } };
const border = { top: thin, left: thin, bottom: thin, right: thin };
const phpFormat = '₱ #,##0.00';
const percentFormat = '0.00%';

function styleCell(cell, options = {}) {
  cell.font = options.font || black;
  cell.border = options.border || border;
  cell.alignment = options.alignment || { vertical: 'center' };
  cell.fill = { type: 'pattern', pattern: 'none' };
  if (options.numFmt) cell.numFmt = options.numFmt;
}

function clearSheet(sheet) {
  sheet.views = [{ showGridLines: true }];
  sheet.properties.defaultRowHeight = 18;
  for (let row = 1; row <= Math.max(sheet.rowCount, 40); row += 1) {
    for (let col = 1; col <= 12; col += 1) styleCell(sheet.getRow(row).getCell(col), { border: { top: {}, left: {}, bottom: {}, right: {} } });
  }
  for (const range of [...sheet.model.merges]) sheet.unMergeCells(range);
}

function setWidths(sheet, widths) {
  for (const [column, width] of Object.entries(widths)) sheet.getColumn(column).width = width;
}

function calculatePhp(usd, settings) {
  const rate = Number(settings?.exchangeRate);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('A valid USD to PHP exchange rate is required.');
  let value = Number(usd || 0) * rate;
  if (settings.vatIncluded) value *= 1.12;
  const adjustment = Number(settings.adjustmentPercent || 0) / 100;
  if (settings.adjustmentType === 'margin') value *= 1 + adjustment;
  if (settings.adjustmentType === 'discount') value *= 1 - adjustment;
  return Math.round(value * 100) / 100;
}

function writeSummary(sheet, model, settings, totalPhp) {
  clearSheet(sheet);
  sheet.name = 'Summary';
  setWidths(sheet, { A: 20, B: 36, C: 26, D: 20 });
  sheet.mergeCells('A1:D1');
  const heading = sheet.getCell('A1');
  heading.value = 'HUAWEI CLOUD Bill';
  styleCell(heading, { font: title, border: { top: {}, left: {}, bottom: {}, right: {} } });
  sheet.getRow(1).height = 28;

  const { document } = model;
  const rows = [
    ['A5', document.billingMonth || ''], ['A6', 'Account Name:'], ['B6', document.customerName || ''],
    ['C6', 'Remaining Amount Due:'], ['D6', totalPhp], ['A7', 'Billing Cycle:'], ['B7', document.billingCycle || ''],
    ['C7', 'Bill Amount:'], ['D7', totalPhp], ['A8', 'Export Time:'], ['B8', document.exportTime || ''],
    ['C8', 'Invoice No:'], ['D8', document.invoiceNumber || ''], ['A10', 'Summary'], ['A12', 'Total'], ['A13', '₱'], ['B13', totalPhp],
    ['A15', 'Conversion Settings'], ['A16', 'VAT included (12%):'], ['B16', settings.vatIncluded ? 'Yes' : 'No'],
    ['A17', 'USD to PHP rate:'], ['B17', settings.exchangeRate], ['A18', 'Adjustment:'],
    ['B18', settings.adjustmentType === 'none' ? 'None' : `${settings.adjustmentType === 'margin' ? 'Margin' : 'Discount'} ${Number(settings.adjustmentPercent || 0).toFixed(2)}%`],
  ];
  for (const [ref, value] of rows) {
    const cell = sheet.getCell(ref);
    const isLabel = ['A6','C6','A7','C7','A8','C8','A10','A12','A15','A16','A17','A18'].includes(ref);
    cell.value = value;
    styleCell(cell, { font: isLabel ? bold : black, numFmt: ref === 'D6' || ref === 'D7' || ref === 'B13' ? phpFormat : ref === 'B17' ? '0.000000' : undefined, alignment: ref === 'D6' || ref === 'D7' || ref === 'B13' ? { horizontal: 'right', vertical: 'center' } : undefined });
  }
}

function writeResources(sheet, model, categories, settings) {
  clearSheet(sheet);
  sheet.name = 'Resources';
  setWidths(sheet, { A: 42, B: 20 });
  sheet.freezePane = { xSplit: 0, ySplit: 1 };
  for (const [ref, value] of [['A1', 'Resources'], ['B1', 'DP']]) {
    sheet.getCell(ref).value = value;
    styleCell(sheet.getCell(ref), { font: bold, alignment: { horizontal: 'center', vertical: 'center' } });
  }
  const totalsByCategory = new Map();
  for (const service of model.services || []) {
    const key = String(service.category || '').trim().toLowerCase();
    totalsByCategory.set(key, (totalsByCategory.get(key) || 0) + Number(service.amount || 0));
  }
  categories.forEach((category, index) => {
    const row = index + 2;
    const usd = totalsByCategory.get(category.toLowerCase()) || 0;
    const amountCell = sheet.getCell(`B${row}`);
    amountCell.value = calculatePhp(usd, settings);
    styleCell(sheet.getCell(`A${row}`), {});
    sheet.getCell(`A${row}`).value = category;
    styleCell(amountCell, { alignment: { horizontal: 'right', vertical: 'center' }, numFmt: phpFormat });
  });
  const totalRow = categories.length + 2;
  sheet.getCell(`B${totalRow}`).value = { formula: `SUM(B2:B${totalRow - 1})` };
  styleCell(sheet.getCell(`A${totalRow}`), { font: bold });
  styleCell(sheet.getCell(`B${totalRow}`), { font: bold, numFmt: phpFormat, alignment: { horizontal: 'right', vertical: 'center' } });
}

export async function writeExcel(templatePath, templateConfig, canonicalModel, conversion = {}) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  for (const sheet of [...workbook.worksheets]) workbook.removeWorksheet(sheet.id);
  const summary = workbook.addWorksheet('Summary');
  const resources = workbook.addWorksheet('Resources');
  const settings = { vatIncluded: false, adjustmentType: 'none', adjustmentPercent: 0, ...conversion };
  const totalPhp = calculatePhp(canonicalModel.totals?.invoice || 0, settings);
  writeSummary(summary, canonicalModel, settings, totalPhp);
  writeResources(resources, canonicalModel, templateConfig.resourceCategories || [], settings);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
