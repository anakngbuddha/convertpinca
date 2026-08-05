import ExcelJS from 'exceljs';
import { renderServiceRows } from './row-inserter.js';

/**
 * Loads an Excel template and writes canonical invoice data into resolved worksheets.
 * Preserves all existing styles, fonts, borders, and number formats.
 *
 * @param {string} templatePath - Absolute path to template file
 * @param {object} templateConfig - Template configuration object (sheets & cellMap)
 * @param {object} canonicalModel - Validated canonical invoice model
 * @returns {Promise<Buffer>} - Populated Excel workbook buffer
 */
export async function writeExcel(templatePath, templateConfig, canonicalModel) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const usdFormat = '$#,##0.00';
  const { document, services, totals } = canonicalModel;
  const cellMap = templateConfig.cellMap;

  // 1. Resolve Summary sheet by NAME with fallback to first worksheet
  const summarySheetName = templateConfig.sheets?.summary || 'Summary';
  const summarySheet = workbook.getWorksheet(summarySheetName) || workbook.worksheets[0];

  if (!summarySheet) {
    throw new Error(`No valid worksheet found in template "${templatePath}".`);
  }

  // Populate Summary scalar cells
  const summaryMap = cellMap.summary || {};

  if (summaryMap.invoiceNumber && document.invoiceNumber) {
    summarySheet.getCell(summaryMap.invoiceNumber).value = document.invoiceNumber;
  }
  if (summaryMap.customerName && document.customerName) {
    summarySheet.getCell(summaryMap.customerName).value = document.customerName;
  }
  if (summaryMap.billingMonth && document.billingMonth) {
    summarySheet.getCell(summaryMap.billingMonth).value = document.billingMonth;
  }
  if (summaryMap.currency && document.currency) {
    summarySheet.getCell(summaryMap.currency).value = document.currency;
  }

  if (summaryMap.totalUsd && typeof totals.invoice === 'number') {
    const cell = summarySheet.getCell(summaryMap.totalUsd);
    cell.value = totals.invoice;
    cell.numFmt = usdFormat;
  }

  if (summaryMap.grandTotalUsd && summaryMap.grandTotalUsd !== summaryMap.totalUsd && typeof totals.invoice === 'number') {
    const cell = summarySheet.getCell(summaryMap.grandTotalUsd);
    cell.value = totals.invoice;
    cell.numFmt = usdFormat;
  }

  // 2. Resolve Services/Resources sheet by NAME with fallback to summarySheet
  const servicesSheetName = templateConfig.sheets?.services || 'Resources';
  const servicesSheet = workbook.getWorksheet(servicesSheetName) || summarySheet;

  if (servicesSheet && cellMap.services) {
    renderServiceRows(servicesSheet, cellMap.services, services);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
