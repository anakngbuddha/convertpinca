/**
 * Sanity-checks extracted invoice/billing data.
 * Verifies that line item subtotals reconcile with the stated total.
 *
 * @param {object} data - Extracted data object
 * @returns {{ valid: boolean, warnings: string[] }}
 */
export function reconcile(data) {
  const warnings = [];

  if (!data) return { valid: false, warnings: ['No extracted data provided.'] };

  // Check required fields
  const requiredFields = ['invoiceNumber', 'billingDate', 'totalAmount'];
  for (const field of requiredFields) {
    if (data[field] === null || data[field] === undefined || data[field] === '') {
      warnings.push(`Missing required field: ${field}`);
    }
  }

  // Check line items totals reconcile with stated total
  if (Array.isArray(data.lineItems) && data.lineItems.length > 0 && data.totalAmount !== null) {
    const lineSum = data.lineItems.reduce((sum, item) => {
      return sum + (parseFloat(item.totalCost) || 0);
    }, 0);

    const statedTotal = parseFloat(data.totalAmount) || 0;
    const tolerance = statedTotal * 0.01; // allow 1% variance for rounding

    if (Math.abs(lineSum - statedTotal) > tolerance && statedTotal > 0) {
      warnings.push(
        `Total mismatch: line items sum to ${lineSum.toFixed(2)} but stated total is ${statedTotal.toFixed(2)}`
      );
    }
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}
