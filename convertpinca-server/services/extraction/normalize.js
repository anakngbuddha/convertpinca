/** Normalize extractor output into the canonical invoice model. */
export function normalizeInvoiceData(rawData, providerId = 'huawei-cloud', method = 'gemini') {
  if (!rawData || typeof rawData !== 'object') throw new Error('Invalid raw extraction data: expected an object.');
  const sourceDocument = rawData.document && typeof rawData.document === 'object' ? rawData.document : rawData;
  const sourceTotals = rawData.totals && typeof rawData.totals === 'object' ? rawData.totals : rawData;
  const warnings = [...(Array.isArray(rawData.extraction?.warnings) ? rawData.extraction.warnings : [])];
  const text = (value) => String(value ?? '').trim();
  const number = (value) => { const parsed = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(/,/g, '')); return Number.isFinite(parsed) ? parsed : null; };
  const invoiceNumber = text(sourceDocument.invoiceNumber ?? rawData.invoiceNumber ?? rawData.invoiceNo);
  const customerName = text(sourceDocument.customerName ?? rawData.customerName ?? rawData.accountName);
  const billingMonth = text(sourceDocument.billingMonth ?? rawData.billingMonth ?? rawData.billingDate);
  const billingCycle = text(sourceDocument.billingCycle ?? rawData.billingCycle);
  const exportTime = text(sourceDocument.exportTime ?? rawData.exportTime);
  const currency = text(sourceDocument.currency ?? rawData.currency ?? sourceTotals.currency ?? 'USD').toUpperCase();
  const exchangeRateUsdToPhp = number(sourceDocument.exchangeRateUsdToPhp ?? rawData.exchangeRateUsdToPhp);
  const totalPhp = number(sourceDocument.totalPhp ?? rawData.totalPhp);
  if (!invoiceNumber) warnings.push('Missing or empty invoiceNumber.');
  if (!customerName) warnings.push('Missing or empty customerName.');
  if (!billingMonth) warnings.push('Missing or empty billingMonth.');
  let services = Array.isArray(rawData.services) ? rawData.services.map((item, index) => ({
    category: text(item?.category ?? item?.serviceName ?? `Service ${index + 1}`),
    amount: Math.round((number(item?.amount ?? item?.amountUsd ?? item?.totalCost) ?? 0) * 100) / 100,
    currency: text(item?.currency ?? currency).toUpperCase(),
    sourceText: text(item?.sourceText ?? item?.category),
  })) : [];
  if (!services.length && rawData.resourcesUsd && typeof rawData.resourcesUsd === 'object') services = Object.entries(rawData.resourcesUsd).map(([category, value]) => ({ category, amount: Math.round((number(value) ?? 0) * 100) / 100, currency, sourceText: category }));
  if (!services.length && Array.isArray(rawData.lineItems)) services = rawData.lineItems.map((item) => ({ category: text(item?.serviceName ?? item?.category), amount: Math.round((number(item?.totalCost ?? item?.amount) ?? 0) * 100) / 100, currency, sourceText: text(item?.serviceName ?? item?.category) }));
  const calculatedServicesSum = services.reduce((sum, item) => sum + item.amount, 0);
  const statedServices = number(sourceTotals.services);
  const statedInvoice = number(sourceTotals.invoice ?? rawData.totalAmount ?? rawData.totalUsd);
  return {
    document: { provider: sourceDocument.provider ?? providerId, invoiceNumber, customerName, billingMonth, billingCycle, exportTime, currency, exchangeRateUsdToPhp, totalPhp },
    services: services.filter((item) => item.category),
    totals: { services: Math.round((statedServices ?? calculatedServicesSum) * 100) / 100, invoice: Math.round((statedInvoice ?? statedServices ?? calculatedServicesSum) * 100) / 100, currency: text(sourceTotals.currency ?? currency).toUpperCase() },
    extraction: { method, confidence: warnings.length ? 0.8 : 0.95, warnings },
  };
}
