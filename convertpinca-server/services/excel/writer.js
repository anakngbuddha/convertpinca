import ExcelJS from 'exceljs';

const black = { name: 'Calibri', size: 11, color: { argb: 'FF000000' } };
const bold = { ...black, bold: true };
const title = { ...bold, size: 16 };
const thin = { style: 'thin', color: { argb: 'FFD9D9D9' } };
const border = { top: thin, left: thin, bottom: thin, right: thin };
const phpFormat = '₱ #,##0.00';

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
    const current = sheet.getRow(row);
    for (let col = 1; col <= 12; col += 1) {
      const cell = current.getCell(col);
      cell.value = null;
      cell.fill = { type: 'pattern', pattern: 'none' };
      cell.font = black;
      cell.border = { top: {}, left: {}, bottom: {}, right: {} };
      cell.alignment = { vertical: 'center' };
    }
  }
  for (const range of [...sheet.model.merges]) sheet.unMergeCells(range);
}

function setWidths(sheet, widths) {
  for (const [column, width] of Object.entries(widths)) sheet.getColumn(column).width = width;
}

function writeSummary(sheet, model, totalPhp) {
  clearSheet(sheet);
  sheet.name = 'Summary';
  setWidths(sheet, { A: 18, B: 34, C: 25, D: 18, E: 4 });

  sheet.mergeCells('A1:D1');
  const heading = sheet.getCell('A1');
  heading.value = 'HUAWEI CLOUD Bill';
  styleCell(heading, { font: title, border: { top: {}, left: {}, bottom: {}, right: {} } });
  sheet.getRow(1).height = 28;

  const { document } = model;
  const rows = [
    ['A5', document.billingMonth || '', {}],
    ['A6', 'Account Name:', { font: bold }],
    ['B6', document.customerName || '', {}],
    ['C6', 'Remaining Amount Due:', { font: bold }],
    ['D6', totalPhp, { font: bold, numFmt: phpFormat, alignment: { horizontal: 'right', vertical: 'center' } }],
    ['A7', 'Billing Cycle:', { font: bold }],
    ['B7', document.billingCycle || '', {}],
    ['C7', 'Bill Amount:', { font: bold }],
    ['D7', totalPhp, { font: bold, numFmt: phpFormat, alignment: { horizontal: 'right', vertical: 'center' } }],
    ['A8', 'Export Time:', { font: bold }],
    ['B8', document.exportTime || '', {}],
    ['C8', 'Invoice No:', { font: bold }],
    ['D8', document.invoiceNumber || '', { font: bold }],
    ['A10', 'Summary', { font: { ...bold, size: 13 } }],
    ['A12', 'Total', { font: bold }],
    ['A13', '₱', { font: bold }],
    ['B13', totalPhp, { font: bold, numFmt: phpFormat, alignment: { horizontal: 'right', vertical: 'center' } }],
  ];

  for (const [ref, value, options] of rows) {
    const cell = sheet.getCell(ref);
    cell.value = value;
    styleCell(cell, options);
  }
}

function writeResources(sheet, model, categories, exchangeRate, totalPhp) {
  clearSheet(sheet);
  sheet.name = 'Resources';
  setWidths(sheet, { A: 38, B: 18, C: 4 });
  sheet.views = [{ showGridLines: true }];
  sheet.freezePane = { xSplit: 0, ySplit: 1 };

  const headerA = sheet.getCell('A1');
  headerA.value = 'Resources';
  styleCell(headerA, { font: bold, alignment: { horizontal: 'center', vertical: 'center' } });
  const headerB = sheet.getCell('B1');
  headerB.value = 'DP';
  styleCell(headerB, { font: bold, alignment: { horizontal: 'center', vertical: 'center' } });

  const totalsByCategory = new Map();
  for (const service of model.services || []) {
    const key = String(service.category || '').trim().toLowerCase();
    totalsByCategory.set(key, (totalsByCategory.get(key) || 0) + Number(service.amount || 0));
  }

  categories.forEach((category, index) => {
    const row = index + 2;
    const usd = totalsByCategory.get(category.toLowerCase()) || 0;
    const php = Number.isFinite(exchangeRate) ? usd * exchangeRate : 0;
    const categoryCell = sheet.getCell(`A${row}`);
    categoryCell.value = category;
    styleCell(categoryCell);
    const amountCell = sheet.getCell(`B${row}`);
    amountCell.value = php;
    amountCell.numFmt = phpFormat;
    styleCell(amountCell, { alignment: { horizontal: 'right', vertical: 'center' }, numFmt: phpFormat });
  });

  const totalRow = categories.length + 2;
  const totalLabel = sheet.getCell(`A${totalRow}`);
  totalLabel.value = '';
  styleCell(totalLabel, { font: bold });
  const totalCell = sheet.getCell(`B${totalRow}`);
  totalCell.value = { formula: `SUM(B2:B${totalRow - 1})` };
  styleCell(totalCell, { font: bold, numFmt: phpFormat, alignment: { horizontal: 'right', vertical: 'center' } });

  sheet.getCell('A15').value = '1. Partner bills use GMT+08:00 as the time standard.';
  sheet.mergeCells('A15:B15');
  styleCell(sheet.getCell('A15'), { border: { top: {}, left: {}, bottom: {}, right: {} } });
  sheet.getCell('A16').value = 'This bill is used only to present your expenditure information.';
  sheet.mergeCells('A16:B16');
  styleCell(sheet.getCell('A16'), { border: { top: {}, left: {}, bottom: {}, right: {} } });
  sheet.getCell('A18').value = '2. To view more details, log in to the Partner Center and download the bill.';
  sheet.mergeCells('A18:B18');
  styleCell(sheet.getCell('A18'), { border: { top: {}, left: {}, bottom: {}, right: {} } });
}

export async function writeExcel(templatePath, templateConfig, canonicalModel) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  // Rebuild the output sheets deliberately. The old template had a single dark
  // worksheet, which is why results ignored the expected Summary/Resources layout.
  for (const sheet of [...workbook.worksheets]) workbook.removeWorksheet(sheet.id);
  const summary = workbook.addWorksheet('Summary');
  const resources = workbook.addWorksheet('Resources');

  const document = canonicalModel.document || {};
  const invoiceUsd = Number(canonicalModel.totals?.invoice || 0);
  const exchangeRate = Number(document.exchangeRateUsdToPhp);
  const totalPhp = Number(document.totalPhp) || (Number.isFinite(exchangeRate) ? invoiceUsd * exchangeRate : invoiceUsd);
  const categories = templateConfig.resourceCategories || [];

  writeSummary(summary, canonicalModel, totalPhp);
  writeResources(resources, canonicalModel, categories, exchangeRate, totalPhp);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
