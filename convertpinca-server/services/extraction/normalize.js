/**
 * Normalizes raw extracted data (from Gemini or Regex) into the canonical invoice model.
 *
 * @param {object} rawData - Raw object returned from extraction
 * @param {string} providerId - Template/provider identifier (e.g. 'huawei-cloud')
 * @param {string} method - Extraction method ('gemini' | 'regex-fallback')
 * @returns {object} Canonical invoice model
 */
export function normalizeInvoiceData(rawData, providerId = 'huawei-cloud', method = 'gemini') {
  if (!rawData || typeof rawData !== 'object') {
    throw new Error('Invalid raw extraction data: expected an object.');
  }

  const warnings = [];

  // 1. Document metadata
  const invoiceNumber = String(rawData.invoiceNumber ?? rawData.invoiceNo ?? '').trim();
  const customerName = String(rawData.customerName ?? rawData.accountName ?? '').trim();
  const billingMonth = String(rawData.billingMonth ?? rawData.billingDate ?? '').trim();
  const billingCycle = String(rawData.billingCycle ?? '').trim();
  const exportTime = String(rawData.exportTime ?? '').trim();
  const currency = String(rawData.currency ?? 'USD').toUpperCase().trim();

  if (!invoiceNumber) warnings.push('Missing or empty invoiceNumber.');
  if (!customerName) warnings.push('Missing or empty customerName.');
  if (!billingMonth) warnings.push('Missing or empty billingMonth.');

  // 2. Services array
  let services = [];
  if (Array.isArray(rawData.services)) {
    services = rawData.services.map((item, index) => {
      const category = String(item.category ?? item.serviceName ?? `Service ${index + 1}`).trim();
      const amount = typeof item.amount === 'number' ? item.amount : parseFloat(item.amountUsd ?? item.totalCost ?? item.amount ?? 0) || 0;
      const itemCurrency = String(item.currency ?? currency).toUpperCase().trim();
      const sourceText = String(item.sourceText ?? category).trim();

      return {
        category,
        amount: Math.round(amount * 100) / 100,
        currency: itemCurrency,
        sourceText,
      };
    });
  } else if (rawData.resourcesUsd && typeof rawData.resourcesUsd === 'object') {
    // Legacy / object format fallback
    services = Object.entries(rawData.resourcesUsd).map(([cat, val]) => ({
      category: cat.trim(),
      amount: Math.round((parseFloat(val) || 0) * 100) / 100,
      currency,
      sourceText: cat.trim(),
    }));
  } else if (Array.isArray(rawData.lineItems)) {
    services = rawData.lineItems.map((item, index) => {
      const category = String(item.serviceName ?? item.category ?? `Item ${index + 1}`).trim();
      const amount = typeof item.totalCost === 'number' ? item.totalCost : parseFloat(item.amount ?? item.totalCost ?? 0) || 0;

      return {
        category,
        amount: Math.round(amount * 100) / 100,
        currency,
        sourceText: category,
      };
    });
  }

  // Filter out any invalid items
  services = services.filter((s) => s.category.length > 0);

  // 3. Totals
  const statedServicesTotal = typeof rawData.totals?.services === 'number'
    ? rawData.totals.services
    : (typeof rawData.totalServicesUsd === 'number' ? rawData.totalServicesUsd : null);

  const statedInvoiceTotal = typeof rawData.totals?.invoice === 'number'
    ? rawData.totals.invoice
    : (typeof rawData.totalAmount === 'number' ? rawData.totalAmount : (typeof rawData.totalUsd === 'number' ? rawData.totalUsd : null));

  const calculatedServicesSum = services.reduce((sum, s) => sum + s.amount, 0);

  const finalServicesTotal = statedServicesTotal !== null ? Math.round(statedServicesTotal * 100) / 100 : Math.round(calculatedServicesSum * 100) / 100;
  const finalInvoiceTotal = statedInvoiceTotal !== null ? Math.round(statedInvoiceTotal * 100) / 100 : finalServicesTotal;

  return {
    document: {
      provider: providerId,
      invoiceNumber,
      customerName,
      billingMonth,
      billingCycle,
      exportTime,
      currency,
    },
    services,
    totals: {
      services: finalServicesTotal,
      invoice: finalInvoiceTotal,
      currency,
    },
    extraction: {
      method,
      confidence: warnings.length === 0 ? 0.95 : 0.8,
      warnings,
    },
  };
}
