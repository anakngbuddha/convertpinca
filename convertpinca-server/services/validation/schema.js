/**
 * Validates the structure and constraints of a canonical invoice model.
 *
 * @param {object} model - The canonical invoice model object
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateCanonicalSchema(model) {
  const errors = [];
  const warnings = [];

  if (!model || typeof model !== 'object') {
    return { valid: false, errors: ['Canonical model must be an object.'], warnings: [] };
  }

  const { document, services, totals } = model;

  // 1. Document validation
  if (!document || typeof document !== 'object') {
    errors.push('Missing document section in canonical model.');
  } else {
    if (!document.provider) warnings.push('Document provider is missing.');
    if (!document.invoiceNumber) errors.push('Invoice number is missing.');
    if (!document.customerName) warnings.push('Customer name is missing.');

    // Strict USD requirement for current phase
    if (document.currency !== 'USD') {
      errors.push(`Invalid currency "${document.currency}". Only "USD" is supported in this phase.`);
    }
  }

  // 2. Services validation
  if (!Array.isArray(services)) {
    errors.push('Services field must be an array.');
  } else if (services.length === 0) {
    errors.push('Services array cannot be empty.');
  } else {
    services.forEach((s, idx) => {
      if (!s.category || typeof s.category !== 'string' || s.category.trim() === '') {
        errors.push(`Service at index ${idx} is missing a category name.`);
      }
      if (typeof s.amount !== 'number' || isNaN(s.amount)) {
        errors.push(`Service "${s.category || idx}" has an invalid numeric amount.`);
      } else if (s.amount < 0) {
        errors.push(`Service "${s.category}" has a negative amount (${s.amount}).`);
      }
      if (s.currency !== 'USD') {
        errors.push(`Service "${s.category}" currency is "${s.currency}", expected "USD".`);
      }
    });
  }

  // 3. Totals validation
  if (!totals || typeof totals !== 'object') {
    errors.push('Missing totals section in canonical model.');
  } else {
    if (typeof totals.services !== 'number' || isNaN(totals.services) || totals.services < 0) {
      errors.push('Totals.services must be a non-negative number.');
    }
    if (typeof totals.invoice !== 'number' || isNaN(totals.invoice) || totals.invoice < 0) {
      errors.push('Totals.invoice must be a non-negative number.');
    }
    if (totals.currency !== 'USD') {
      errors.push(`Totals currency is "${totals.currency}", expected "USD".`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
