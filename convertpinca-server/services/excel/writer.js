import ExcelJS from 'exceljs';

/**
 * Loads an Excel template and writes extracted data into mapped cells.
 * Preserves all existing styles, merged cells, and formatting.
 *
 * @param {string} templatePath - Absolute path to the .xlsx template file
 * @param {object} cellMap - Cell mapping configuration from template mapping.js
 * @param {object} data - Extracted data from Gemini
 * @returns {Promise<Buffer>} - Populated Excel workbook as a buffer
 */
export async function writeExcel(templatePath, cellMap, data) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  const sheet = workbook.worksheets[0];

  // Write simple header/scalar fields
  for (const [key, cellRef] of Object.entries(cellMap)) {
    if (key === 'lineItems') continue;
    if (data[key] !== undefined && data[key] !== null) {
      const cell = sheet.getCell(cellRef);
      cell.value = data[key];
      // Preserve existing style — do not reset fill/font
    }
  }

  // Write line items (tabular rows)
  if (cellMap.lineItems && Array.isArray(data.lineItems)) {
    const { startRow, columns } = cellMap.lineItems;

    data.lineItems.forEach((item, index) => {
      const rowNum = startRow + index;
      for (const [field, col] of Object.entries(columns)) {
        if (item[field] !== undefined && item[field] !== null) {
          const cell = sheet.getCell(`${col}${rowNum}`);
          cell.value = item[field];
        }
      }
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
