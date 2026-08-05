const resourceCategories = [
  'Elastic Cloud Server',
  'Elastic Volume Service',
  'Web Application Firewall',
  'Cloud Certificate & Manager',
  'Cloud Backup and Recovery',
  'Host Security Service',
  'Virtual Private Cloud',
  'Object Storage Service',
  'Cloud Eye',
  'Cloud Trace Service',
  'Image Management Service',
];

export default {
  id: 'huawei-cloud',
  name: 'Huawei Cloud Billing Statement',
  description: 'Extracts Huawei Cloud monthly billing statements into a formal two-sheet Excel report',
  templatePath: new URL('./template.xlsx', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
  sheets: { summary: 'Summary', services: 'Resources' },
  resourceCategories,
  schema: {
    document: {
      provider: 'huawei-cloud',
      invoiceNumber: 'string',
      customerName: 'string',
      billingMonth: 'string (YYYY-MM-01)',
      billingCycle: 'string',
      exportTime: 'string',
      currency: 'USD',
      exchangeRateUsdToPhp: 'number (copy from PDF)',
      totalPhp: 'number (copy from PDF)',
    },
    services: resourceCategories.map((category) => ({ category, amount: 'number (USD)', currency: 'USD' })),
    totals: { services: 'number (USD)', invoice: 'number (USD)', currency: 'USD' },
  },
  cellMap: {
    summary: {
      title: 'A1', billingMonth: 'A5', customerName: 'B6', remainingAmountPhp: 'D6',
      billingCycle: 'B7', billAmountPhp: 'D7', exportTime: 'B8', invoiceNumber: 'D8', totalPhp: 'B13',
    },
    resources: { headerRow: 1, firstDataRow: 2, totalRow: 13, categoryColumn: 'A', amountColumn: 'B' },
  },
  resourceCategories,
  regexExtractor(text) {
    const raw = String(text || '').replace(/\u00a0/g, ' ');
    const lines = raw.split(/\r?\n/).map((line) => line.replace(/[ \t]+/g, ' ').trim()).filter(Boolean);
    const joined = lines.join(' ');
    const first = (patterns) => {
      for (const pattern of patterns) { const match = joined.match(pattern); if (match?.[1]) return match[1].trim(); }
      return '';
    };
    const invoiceNumber = first([/(?:invoice|bill)\s*(?:no\.?|number|#)\s*[:：]?\s*([A-Z0-9][A-Z0-9\-_/]+)/i]);
    const customerName = first([/(?:account\s*name|customer|billed\s*to)\s*[:：]\s*([^\n]+?)(?=\s+(?:billing|invoice|bill)\b|$)/i]);
    const monthRaw = first([/(?:billing|invoice|bill)\s*date\s*[:：]?\s*(\d{4}[-/]\d{2}(?:[-/]\d{2})?)/i, /(?:period|month)\s*[:：]?\s*(\d{4}[-/]\d{2}(?:[-/]\d{2})?)/i]);
    const billingMonth = monthRaw ? monthRaw.replace(/\//g, '-').replace(/^(\d{4}-\d{2})$/, '$1-01') : '';
    const billingCycle = first([/(?:billing\s*cycle|billing\s*period)\s*[:：]?\s*([^\n]+?)(?=\s+(?:export|invoice|total)\b|$)/i]);
    const exportTime = first([/(?:export\s*time|generated\s*at)\s*[:：]?\s*([^\n]+?)(?=\s+(?:invoice|total)\b|$)/i]);
    const exchangeMatch = joined.match(/exchange\s*rate\s*:\s*1\s*USD\s*=\s*([\d.]+)\s*PHP/i);
    const exchangeRateUsdToPhp = exchangeMatch ? Number(exchangeMatch[1]) : null;
    const phpMatch = joined.match(/remaining\s*amount\s*due\s*:\s*\$?[\d,.]+\s*USD\s*=\s*([\d,.]+)\s*PHP/i);
    const totalPhp = phpMatch ? Number(phpMatch[1].replace(/,/g, '')) : null;
    const totalMatch = joined.match(/(?:remaining\s*amount\s*due|bill\s*amount|grand\s*total|total\s*(?:amount|bill|due|expenditure))\s*[:：=]?\s*(?:USD\s*)?\$?\s*([\d,]+(?:\.\d{1,8})?)/i);
    const invoiceTotal = totalMatch ? Number(totalMatch[1].replace(/,/g, '')) : 0;
    const services = [];
    const amountPattern = /^(.*?)\s+(?:USD\s*)?\$?\s*([\d,]+\.\d{2,8})\s*$/i;
    for (const line of lines) {
      const match = line.match(amountPattern); if (!match) continue;
      const category = match[1].replace(/^[-•*]\s*/, '').trim();
      const amount = Number(match[2].replace(/,/g, ''));
      const matchedCategory = resourceCategories.find((name) => category.toLowerCase().startsWith(name.toLowerCase()));
      if (matchedCategory && Number.isFinite(amount)) services.push({ category: matchedCategory, amount, currency: 'USD', sourceText: line });
    }
    const aggregated = resourceCategories.map((category) => ({ category, amount: services.filter((s) => s.category === category).reduce((sum, s) => sum + s.amount, 0), currency: 'USD', sourceText: category }));
    const calculatedSum = aggregated.reduce((sum, item) => sum + item.amount, 0);
    return {
      document: { provider: 'huawei-cloud', invoiceNumber, customerName, billingMonth, billingCycle, exportTime, currency: 'USD', exchangeRateUsdToPhp, totalPhp },
      services: aggregated,
      totals: { services: calculatedSum, invoice: invoiceTotal || calculatedSum, currency: 'USD' },
      extraction: { method: 'regex-fallback', confidence: invoiceNumber && calculatedSum > 0 ? 0.85 : 0.2, warnings: [] },
    };
  },
};
