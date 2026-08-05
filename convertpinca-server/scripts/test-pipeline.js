import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import { normalizeInvoiceData } from '../services/extraction/normalize.js';
import { reconcile } from '../services/validation/reconcile.js';
import { writeExcel } from '../services/excel/writer.js';
import templateConfig from '../templates/huawei-cloud/mapping.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runPipelineTests() {
  console.log('🧪 Starting ConvertPinca Pipeline Test Matrix...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // --- Test Case 1: Standard 11 Services Normalization & Reconciliation ---
  console.log('[Test 1] 11 Services Normalization & Reconciliation');
  const mockRaw11 = {
    invoiceNumber: 'CN-202608-001',
    customerName: 'Acme Cloud Corp',
    billingMonth: '2026-07-01',
    billingCycle: 'Jul 01, 2026~Jul 31, 2026',
    exportTime: 'Aug 05, 2026 09:18:33 GMT+08:00',
    currency: 'USD',
    totalUsd: 473.17,
    services: [
      { category: 'Elastic Cloud Server', amount: 150.00 },
      { category: 'Elastic Volume Service', amount: 50.00 },
      { category: 'Web Application Firewall', amount: 80.00 },
      { category: 'Cloud Certificate & Manager', amount: 15.00 },
      { category: 'Cloud Backup and Recovery', amount: 25.00 },
      { category: 'Host Security Service', amount: 30.00 },
      { category: 'Virtual Private Cloud', amount: 10.00 },
      { category: 'Object Storage Service', amount: 80.00 },
      { category: 'Cloud Eye', amount: 5.00 },
      { category: 'Cloud Trace Service', amount: 8.00 },
      { category: 'Image Management Service', amount: 20.17 },
    ],
  };

  const canonical1 = normalizeInvoiceData(mockRaw11, 'huawei-cloud', 'mock');
  assert(canonical1.services.length === 11, 'Normalized 11 services correctly.');
  assert(canonical1.totals.services === 473.17, 'Calculated services sum correctly ($473.17).');

  const rec1 = reconcile(canonical1);
  assert(rec1.reconciled === true, 'Reconciliation passed for valid 11-service bill.');

  // --- Test Case 2: Math Discrepancy (Hard-Gate Failure) ---
  console.log('\n[Test 2] Math Discrepancy Hard-Gate Check');
  const mockMismatched = {
    ...mockRaw11,
    totals: { services: 473.17, invoice: 999.99, currency: 'USD' },
  };
  const canonical2 = normalizeInvoiceData(mockMismatched, 'huawei-cloud', 'mock');
  const rec2 = reconcile(canonical2);
  assert(rec2.reconciled === false, 'Hard-gate correctly rejected mismatched totals.');
  assert(rec2.errors.some((e) => e.includes('mismatch')), 'Detailed error logged for math discrepancy.');

  // --- Test Case 3: Invalid Currency Check (USD only rule) ---
  console.log('\n[Test 3] Non-USD Currency Rejection');
  const mockEur = {
    ...mockRaw11,
    currency: 'EUR',
  };
  const canonical3 = normalizeInvoiceData(mockEur, 'huawei-cloud', 'mock');
  const rec3 = reconcile(canonical3);
  assert(rec3.reconciled === false, 'Hard-gate rejected EUR currency (USD-only rule).');

  // --- Test Case 4: Dynamic ExcelJS Renderer Verification ---
  console.log('\n[Test 4] Dynamic ExcelJS Renderer Verification');
  const excelBuffer = await writeExcel(templateConfig.templatePath, templateConfig, canonical1);
  assert(Buffer.isBuffer(excelBuffer) && excelBuffer.length > 0, 'Generated non-empty Excel buffer.');

  // Re-open generated workbook with ExcelJS to assert internal structures
  const testWb = new ExcelJS.Workbook();
  await testWb.xlsx.load(excelBuffer);

  const sheet = testWb.getWorksheet('Billing Statement');
  assert(sheet !== undefined, 'Found worksheet "Billing Statement" by name.');
  assert(sheet.getCell('C3').value === 'CN-202608-001', 'Summary cell C3 contains invoice number.');
  assert(sheet.getCell('C4').value === 'Acme Cloud Corp', 'Summary cell C4 contains customer name.');
  assert(sheet.getCell('C7').value === 473.17, 'Summary cell C7 contains total USD.');
  assert(sheet.getCell('C7').numFmt === '$#,##0.00', 'Summary cell C7 has USD format "$#,##0.00".');

  assert(sheet.getCell('A11').value === 'Elastic Cloud Server', 'Table A11 contains first service category.');
  assert(sheet.getCell('E11').value === 150.00, 'Table E11 contains first service amount.');
  assert(sheet.getCell('A21').value === 'Image Management Service', 'Table A21 contains 11th service category.');
  assert(sheet.getCell('E21').value === 20.17, 'Table E21 contains 11th service amount.');

  const totalFormulaCell = sheet.getCell('E22');
  const formulaVal = typeof totalFormulaCell.value === 'object' ? totalFormulaCell.value.formula : totalFormulaCell.value;
  assert(formulaVal === 'SUM(E11:E21)', `Total row formula dynamically set to "SUM(E11:E21)" (actual: "${formulaVal}").`);
  assert(totalFormulaCell.numFmt === '$#,##0.00', 'Total row formula has USD number format "$#,##0.00".');

  // --- Test Case 5: Dynamic Row Inserter with 3 Services ---
  console.log('\n[Test 5] Dynamic ExcelJS Renderer with 3 Services');
  const mockRaw3 = {
    ...mockRaw11,
    totalUsd: 280.00,
    services: [
      { category: 'Elastic Cloud Server', amount: 200.00 },
      { category: 'Object Storage Service', amount: 50.00 },
      { category: 'Host Security Service', amount: 30.00 },
    ],
  };
  const canonical3Serv = normalizeInvoiceData(mockRaw3, 'huawei-cloud', 'mock');
  const excelBuffer3 = await writeExcel(templateConfig.templatePath, templateConfig, canonical3Serv);

  const testWb3 = new ExcelJS.Workbook();
  await testWb3.xlsx.load(excelBuffer3);
  const sheet3 = testWb3.getWorksheet('Billing Statement');

  const formulaCell3 = sheet3.getCell('E14'); // 3 services -> firstDataRow 11 + 3 = row 14
  const formulaVal3 = typeof formulaCell3.value === 'object' ? formulaCell3.value.formula : formulaCell3.value;
  assert(formulaVal3 === 'SUM(E11:E13)', `3-service total row formula set to "SUM(E11:E13)" (actual: "${formulaVal3}").`);

  console.log(`\n===========================================`);
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`===========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runPipelineTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
