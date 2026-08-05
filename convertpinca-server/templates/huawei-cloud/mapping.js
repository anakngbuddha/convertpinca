export default {
  id: 'huawei-cloud',
  name: 'Huawei Cloud Billing Statement',
  description: 'Extracts Huawei Cloud monthly billing statements into a structured Excel report',
  templatePath: new URL('./template.xlsx', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
  schema: {
    invoiceNumber: 'string',
    customerName: 'string',
    billingDate: 'string',
    currency: 'string',
    totalAmount: 'number',
    lineItems: [
      {
        serviceName: 'string',
        resourceId: 'string',
        usageAmount: 'string',
        unitPrice: 'number',
        totalCost: 'number',
      },
    ],
  },
  cellMap: {
    invoiceNumber: 'C4',
    customerName: 'C5',
    billingDate: 'C6',
    currency: 'C7',
    totalAmount: 'C8',
    lineItems: {
      startRow: 12,
      columns: {
        serviceName: 'A',
        resourceId: 'B',
        usageAmount: 'C',
        unitPrice: 'D',
        totalCost: 'E',
      },
    },
  },

  /**
   * Fallback extractor using regex on raw PDF text.
   * Matches common Huawei Cloud billing PDF layouts.
   * @param {string} text - Raw text extracted from the PDF
   * @returns {object} - Extracted data matching the schema
   */
  regexExtractor(text) {
    const find = (pattern) => {
      const m = text.match(pattern);
      return m ? m[1].trim() : null;
    };

    const invoiceNumber = find(/Invoice\s*(?:No\.?|Number)[:\s]+([A-Z0-9\-]+)/i)
      ?? find(/(?:Invoice|Bill)\s*#[:\s]*([A-Z0-9\-]+)/i);

    const customerName = find(/(?:Customer|Bill(?:ed)?\s*To|Account\s*Name)[:\s]+(.+)/i);

    const billingDate = find(/(?:Billing|Invoice|Bill)\s*Date[:\s]+(\d{4}[-/]\d{2}[-/]\d{2})/i)
      ?? find(/(?:Period|Month)[:\s]+(\d{4}[-/]\d{2})/i);

    const currency = find(/Currency[:\s]+([A-Z]{3})/i)
      ?? (text.match(/\bCNY\b/) ? 'CNY' : text.match(/\bUSD\b/) ? 'USD' : null);

    const totalAmountRaw = find(/(?:Total\s*Amount|Amount\s*Due|Grand\s*Total)[:\s]+[\$¥]?([\d,]+\.?\d*)/i);
    const totalAmount = totalAmountRaw ? parseFloat(totalAmountRaw.replace(/,/g, '')) : null;

    // Extract line items from tabular rows:
    // Looks for lines that match: <service> <resourceId> <usage> <unitPrice> <totalCost>
    const lineItems = [];
    const tableSection = text.match(/(?:Service\s*Name|Product\s*Name)[\s\S]+?(?=Total|Grand Total|$)/i)?.[0] ?? text;
    const rowPattern = /^(.+?)\s+([\w\-\/]+)\s+([\d.]+\s*\w*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s*$/gm;
    let match;
    while ((match = rowPattern.exec(tableSection)) !== null) {
      const unitPrice = parseFloat(match[4].replace(/,/g, ''));
      const totalCost = parseFloat(match[5].replace(/,/g, ''));
      // Skip header-like rows and zero-cost rows that are likely separators
      if (!isNaN(unitPrice) && !isNaN(totalCost)) {
        lineItems.push({
          serviceName: match[1].trim(),
          resourceId: match[2].trim(),
          usageAmount: match[3].trim(),
          unitPrice,
          totalCost,
        });
      }
    }

    return { invoiceNumber, customerName, billingDate, currency, totalAmount, lineItems };
  },
};

