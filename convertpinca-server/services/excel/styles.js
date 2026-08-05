/**
 * Copies visual styling (font, fill, border, alignment, numFmt) from a source cell to a target cell.
 *
 * @param {import('exceljs').Cell} sourceCell
 * @param {import('exceljs').Cell} targetCell
 */
export function copyCellStyle(sourceCell, targetCell) {
  if (!sourceCell || !targetCell) return;

  if (sourceCell.font) {
    targetCell.font = { ...sourceCell.font };
  }
  if (sourceCell.fill) {
    targetCell.fill = JSON.parse(JSON.stringify(sourceCell.fill));
  }
  if (sourceCell.border) {
    targetCell.border = JSON.parse(JSON.stringify(sourceCell.border));
  }
  if (sourceCell.alignment) {
    targetCell.alignment = { ...sourceCell.alignment };
  }
  if (sourceCell.numFmt) {
    targetCell.numFmt = sourceCell.numFmt;
  }
}
