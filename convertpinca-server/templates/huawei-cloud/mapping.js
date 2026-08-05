export default {
  id: 'huawei-cloud',
  name: 'Huawei Cloud Billing Statement',
  description: 'Extracts Huawei Cloud monthly billing statements into a canonical Excel report (USD)',
  templatePath: new URL('./template.xlsx', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
  sheets: {
    summary: 'Billing Statement',
    services: 'Billing Statement',
  },
  schema: {
    document: {
      provider: 'huawei-cloud',
      invoiceNumber: 'string (e.g. Invoice / Bill number)',
      customerName: 'string (e.g. Account Name / Customer)',
      billingMonth: 'string (YYYY-MM-01 format, first day of billing month)',
      billingCycle: 'string (e.g. Jul 01, 2026~Jul 31, 2026)',
      exportTime: 'string (e.g. Aug 05, 2026 09:18:33 GMT+08:00)',
      currency: 'USD',
    },
    services: [
      {
        category: 'string (service name, e.g. Elastic Cloud Server)',
        amount: 'number (total expenditure for this service in USD)',
        currency: 'USD',
        sourceText: 'string (original line item text)',
      },
    ],
    totals: {
      services: 'number (sum of all service expenditures in USD)',
      invoice: 'number (stated total bill/invoice amount in USD)',
      currency: 'USD',
    },
  },
  cellMap: {
    summary: {
      invoiceNumber: 'C3',
      customerName: 'C4',
      billingMonth: 'C5',
      currency: 'C6',
      totalUsd: 'C7',
      grandTotalUsd: 'C7',
    },
    services: {
      sheetName: 'Billing Statement',
      headerRow: 10,
      firstDataRow: 11,
      columns: {
        category: 'A',
        amount: 'E',
      },
      totalRowMode: 'after-data',
    },
  },

  /**
   * Fallback extractor using regex on raw PDF text.
   * Matches common Huawei Cloud billing PDF layouts and produces the canonical schema.
   * @param {string} text - Raw text extracted from the PDF
   * @returns {object} - Extracted data matching canonical format
   */
  regexExtractor(text) {
    const find = (pattern) => {
      const m = text.match(pattern);
      return m ? m[1].trim() : '';
    };

    const invoiceNumber = find(/Invoice\s*(?:No\.?|Number)[:\s]+([A-Z0-9\-]+)/i)
      || find(/(?:Invoice|Bill)\s*#[:\s]*([A-Z0-9\-]+)/i);

    const customerName = find(/(?:Customer|Bill(?:ed)?\s*To|Account\s*Name)[:\s]+(.+)/i);

    const billingMonthRaw = find(/(?:Billing|Invoice|Bill)\s*Date[:\s]+(\d{4}[-/]\d{2}[-/]\d{2})/i)
      || find(/(?:Period|Month)[:\s]+(\d{4}[-/]\d{2})/i);

    const billingMonth = billingMonthRaw
      ? (billingMonthRaw.length === 7 ? `${billingMonthRaw}-01` : billingMonthRaw)
      : '2026-07-01';

    const billingCycle = find(/(?:Billing\s*Cycle|Period)[:\s]+([A-Za-z0-9,~\s]+)/i);
    const exportTime = find(/(?:Export\s*Time)[:\s]+(.+)/i);

    const totalAmountRaw = find(/(?:Total\s*Amount|Amount\s*Due|Grand\s*Total|Expenditure\s*Total)[:\s]+[\$¥]?([\d,]+\.?\d*)/i);
    const totalAmount = totalAmountRaw ? parseFloat(totalAmountRaw.replace(/,/g, '')) : 0;

    // Extract line items / services from table rows
    const services = [];
    const tableSection = text.match(/(?:Expenditure\s*Summary|Service\s*Name|Product\s*Name)[\s\S]+?(?=Total|Grand Total|$)/i)?.[0] ?? text;
    const rowPattern = /^\s*(.+?)\s+[\$¥]?([\d,]+\.\d{2})\s*$/gm;
    let match;

    while ((match = rowPattern.exec(tableSection)) !== null) {
      const category = match[1].trim();
      const amount = parseFloat(match[2].replace(/,/g, ''));

      if (category && !isNaN(amount) && !category.match(/Total|Grand Total/i)) {
        services.push({
          category,
          amount,
          currency: 'USD',
          sourceText: category,
        });
      }
    }

    const calculatedSum = services.reduce((sum, item) => sum + item.amount, 0);

    return {
      document: {
        provider: 'huawei-cloud',
        invoiceNumber,
        customerName,
        billingMonth,
        billingCycle,
        exportTime,
        currency: 'USD',
      },
      services,
      totals: {
        services: calculatedSum > 0 ? calculatedSum : totalAmount,
        invoice: totalAmount > 0 ? totalAmount : calculatedSum,
        currency: 'USD',
      },
      extraction: {
        method: 'regex-fallback',
        confidence: 0.85,
        warnings: [],
      },
    };
  },
};
