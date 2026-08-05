/**
 * Normalizes raw extracted data (Gemini or regex) into the canonical invoice model.
 * Accepts both the new canonical-shaped fallback result and legacy flat results.
 */
export function normalizeInvoiceData(rawData, providerId = 'huawei-cloud', method = 'gemini') {
  if (!rawData || typeof rawData !== 'object') {
    throw new Error('Invalid raw extraction data: expected an object.');
  }

  const sourceDocument = rawData.document && typeof rawData.document === 'object'
    ? rawData.document
    : rawData;
  const sourceTotals = rawData.totals && typeof rawData.totals === 'object'
    ? rawData.totals
    : rawData;
  const warnings = [
    ...(Array.isArray(rawData.extraction?.warnings) ? rawData.extraction.warnings : []),
  ];

  const invoiceNumber = String(sourceDocument.invoiceNumber ?? rawData.invoiceNumber ?? rawData.invoiceNo ?? '').trim();
  const customerName = String(sourceDocument.customerName ?? rawData.customerName ?? rawData.accountName ?? '').trim();
  const billingMonth = String(sourceDocument.billingMonth ?? rawData.billingMonth ?? rawData.billingDate ?? '').trim();
  const billingCycle = String(sourceDocument.billingCycle ?? rawData.billingCycle ?? '').trim();
  const exportTime = String(sourceDocument.exportTime ?? rawData.exportTime ?? '').trim();
  const currency = String(sourceDocument.currency ?? rawData.currency ?? sourceTotals.currency ?? 'USD').toUpperCase().trim();

  if (!invoiceNumber) warnings.push('Missing or empty invoiceNumber.');
  if (!customerName) warnings.push('Missing or empty customerName.');
  if (!billingMonth) warnings.push('Missing or empty billingMonth.');

  let services = [];
  if (Array.isArray(rawData.services)) {
    services = rawData.services.map((item, index) => {
      const category = String(item?.category ?? item?.serviceName ?? `Service ${index + 1}`).trim();
      const amount = typeof item?.amount === 'number'
        ? item.amount
        : parseFloat(item?.amountUsd ?? item?.totalCost ?? item?.amount ?? 0) || 0;
      return {
        category,
        amount: Math.round(amount * 100) / 100,
        currency: String(item?.currency ?? currency).toUpperCase().trim(),
        sourceText: String(item?.sourceText ?? category).trim(),
      };
    });
  } else if (rawData.resourcesUsd && typeof rawData.resourcesUsd === 'object') {
    services = Object.entries(rawData.resourcesUsd).map(([category, value]) => ({
      category: category.trim(),
      amount: Math.round((parseFloat(value) || 0) * 100) / 100,
      currency,
      sourceText: category.trim(),
    }));
  } else if (Array.isArray(rawData.lineItems)) {
    services = rawData.lineItems.map((item, index) => ({
      category: String(item?.serviceName ?? item?.category ?? `Item ${index + 1}`).trim(),
      amount: Math.round((parseFloat(item?.totalCost ?? item?.amount ?? 0) || 0) * 100) / 100,
      currency,
      sourceText: String(item?.sourceText ?? item?.serviceName ?? `Item ${index + 1}`).trim(),
    }));
  }

  services = services.filter((item) => item.category.length > 0);
  const calculatedServicesSum = services.reduce((sum, item) => sum + item.amount, 0);
  const parsedServicesTotal = parseFloat(sourceTotals.services);
  const parsedInvoiceTotal = parseFloat(sourceTotals.invoice ?? rawData.totalAmount ?? rawData.totalUsd);
  const finalServicesTotal = Number.isFinite(parsedServicesTotal)
    ? Math.round(parsedServicesTotal * 100) / 100
    : Math.round(calculatedServicesSum * 100) / 100;
  const finalInvoiceTotal = Number.isFinite(parsedInvoiceTotal)
    ? Math.round(parsedInvoiceTotal * 100) / 100
    : finalServicesTotal;

  return {
    document: {
      provider: sourceDocument.provider ?? providerId,
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
      currency: String(sourceTotals.currency ?? currency).toUpperCase().trim(),
    },
    extraction: {
      method,
      confidence: warnings.length === 0 ? 0.95 : 0.8,
      warnings,
    },
  };
}
