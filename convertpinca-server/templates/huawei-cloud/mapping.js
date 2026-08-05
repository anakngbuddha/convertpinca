export default {
  id: 'huawei-cloud',
  name: 'Huawei Cloud Billing Statement',
  description: 'Extracts Huawei Cloud monthly billing statements into a canonical Excel report (USD)',
  templatePath: new URL('./template.xlsx', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
  sheets: { summary: 'Billing Statement', services: 'Billing Statement' },
  schema: {
    document: {
      provider: 'huawei-cloud',
      invoiceNumber: 'string',
      customerName: 'string',
      billingMonth: 'string (YYYY-MM-01)',
      billingCycle: 'string',
      exportTime: 'string',
      currency: 'USD',
    },
    services: [{ category: 'string', amount: 'number', currency: 'USD', sourceText: 'string' }],
    totals: { services: 'number', invoice: 'number', currency: 'USD' },
  },
  cellMap: {
    summary: { invoiceNumber: 'C3', customerName: 'C4', billingMonth: 'C5', currency: 'C6', totalUsd: 'C7' },
    services: {
      sheetName: 'Billing Statement',
      headerRow: 10,
      firstDataRow: 11,
      columns: { category: 'A', amount: 'E' },
      totalRowMode: 'after-data',
    },
  },

  regexExtractor(text) {
    const raw = String(text || '').replace(/\u00a0/g, ' ');
    const lines = raw.split(/\r?\n/).map((line) => line.replace(/[ \t]+/g, ' ').trim()).filter(Boolean);
    const joined = lines.join(' ');
    const first = (patterns) => {
      for (const pattern of patterns) {
        const match = joined.match(pattern);
        if (match?.[1]) return match[1].trim();
      }
      return '';
    };

    const invoiceNumber = first([
      /(?:invoice|bill)\s*(?:no\.?|number|#)\s*[:：]?\s*([A-Z0-9][A-Z0-9\-_/]+)/i,
      /(?:invoice|bill)\s*id\s*[:：]?\s*([A-Z0-9][A-Z0-9\-_/]+)/i,
    ]);
    const customerName = first([/(?:customer|billed\s*to|account\s*name)\s*[:：]\s*([^\n]+?)(?=\s+(?:billing|invoice|bill)\b|$)/i]);
    const billingMonthRaw = first([
      /(?:billing|invoice|bill)\s*date\s*[:：]?\s*(\d{4}[-/]\d{2}(?:[-/]\d{2})?)/i,
      /(?:period|month)\s*[:：]?\s*(\d{4}[-/]\d{2}(?:[-/]\d{2})?)/i,
    ]);
    const billingMonth = billingMonthRaw
      ? billingMonthRaw.replace(/\//g, '-').replace(/^(\d{4}-\d{2})$/, '$1-01')
      : '';
    const billingCycle = first([/(?:billing\s*cycle|billing\s*period)\s*[:：]?\s*([^\n]+?)(?=\s+(?:export|invoice|total)\b|$)/i]);
    const exportTime = first([/(?:export\s*time|generated\s*at)\s*[:：]?\s*([^\n]+?)(?=\s+(?:invoice|total)\b|$)/i]);

    const totalMatch = joined.match(/(?:grand\s*total|total\s*(?:amount|bill|due|expenditure)|amount\s*due)\s*[:：=]?\s*(?:USD\s*)?\$?\s*([\d,]+(?:\.\d{1,2})?)/i);
    const invoiceTotal = totalMatch ? Number(totalMatch[1].replace(/,/g, '')) : 0;

    const services = [];
    const seen = new Set();
    const ignored = /^(service|service name|product|product name|category|amount|total|grand total|subtotal|currency|usd|quantity|unit price|billing period|date)$/i;
    const moneyAtEnd = /^(.*?)\s+(?:USD\s*)?\$?\s*([\d,]+\.\d{2})\s*$/i;

    for (const line of lines) {
      const match = line.match(moneyAtEnd);
      if (!match) continue;
      const category = match[1].replace(/^[-•*]\s*/, '').trim();
      const amount = Number(match[2].replace(/,/g, ''));
      if (!category || ignored.test(category) || /\b(?:grand\s*)?total|subtotal|amount due/i.test(category) || !Number.isFinite(amount)) continue;
      // Avoid treating metadata lines and detailed resource rows as services.
      if (/^(invoice|bill|customer|account|billing|export|period|month|exchange|currency)\b/i.test(category)) continue;
      const key = `${category.toLowerCase()}|${amount.toFixed(2)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      services.push({ category, amount, currency: 'USD', sourceText: line });
    }

    const calculatedSum = Math.round(services.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
    return {
      document: { provider: 'huawei-cloud', invoiceNumber, customerName, billingMonth, billingCycle, exportTime, currency: 'USD' },
      services,
      totals: {
        services: calculatedSum,
        invoice: invoiceTotal || calculatedSum,
        currency: 'USD',
      },
      extraction: {
        method: 'regex-fallback',
        confidence: services.length > 0 && (invoiceNumber || invoiceTotal) ? 0.85 : 0.2,
        warnings: services.length === 0 ? ['Fallback parser found no service rows.'] : [],
      },
    };
  },
};
