import { copyCellStyle } from './styles.js';

/**
 * Dynamically inserts and formats service rows into Sheet 2 (Resources / Services).
 *
 * @param {import('exceljs').Worksheet} sheet - ExcelJS Worksheet
 * @param {object} config - Service sheet mapping configuration
 * @param {Array<{ category: string, amount: number }>} services - List of normalized services
 */
export function renderServiceRows(sheet, config, services) {
  const firstDataRow = config.firstDataRow || 2;
  const colCat = config.columns.category || 'A';
  const colAmt = config.columns.amount || 'B';
  const usdFormat = '$#,##0.00';

  // Get sample template row to copy style from
  const templateRow = sheet.getRow(firstDataRow);

  // Determine existing row count and clear extra static template data if any
  const totalItems = services.length;

  services.forEach((service, index) => {
    const currentRowNum = firstDataRow + index;
    const row = sheet.getRow(currentRowNum);

    const cellCat = row.getCell(colCat);
    const cellAmt = row.getCell(colAmt);

    // Copy style from template row cell
    copyCellStyle(templateRow.getCell(colCat), cellCat);
    copyCellStyle(templateRow.getCell(colAmt), cellAmt);

    cellCat.value = service.category;
    cellAmt.value = service.amount;
    cellAmt.numFmt = usdFormat;

    row.commit();
  });

  // Calculate dynamic Total Row position
  const lastDataRow = firstDataRow + totalItems - 1;
  const totalRowNum = firstDataRow + totalItems;

  const totalRow = sheet.getRow(totalRowNum);
  const totalCellCat = totalRow.getCell(colCat);
  const totalCellAmt = totalRow.getCell(colAmt);

  // Copy style for total row
  const sampleTotalRow = sheet.getRow(13); // original total row if present, or template row
  copyCellStyle(sampleTotalRow.getCell(colCat) || templateRow.getCell(colCat), totalCellCat);
  copyCellStyle(sampleTotalRow.getCell(colAmt) || templateRow.getCell(colAmt), totalCellAmt);

  // Write dynamic formula range `=SUM(B2:B{lastDataRow})`
  const formulaRange = `SUM(${colAmt}${firstDataRow}:${colAmt}${lastDataRow})`;
  totalCellAmt.value = { formula: formulaRange };
  totalCellAmt.numFmt = usdFormat;

  totalRow.commit();
}
