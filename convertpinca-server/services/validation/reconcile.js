import { validateCanonicalSchema } from './schema.js';

/**
 * Reconciles numbers in the canonical invoice model against tolerance limits.
 * Hard-gated: returns { reconciled: false } if math or schema checks fail.
 *
 * @param {object} canonicalModel - The canonical invoice model
 * @returns {{ reconciled: boolean, errors: string[], warnings: string[], details: object }}
 */
export function reconcile(canonicalModel) {
  // Step 1: Structural Schema Validation
  const schemaResult = validateCanonicalSchema(canonicalModel);
  const errors = [...schemaResult.errors];
  const warnings = [...schemaResult.warnings];

  if (!schemaResult.valid) {
    return {
      reconciled: false,
      errors,
      warnings,
      details: { cause: 'schema_validation_failed' },
    };
  }

  const { services, totals } = canonicalModel;

  // Step 2: Math Reconciliation
  const calculatedSum = services.reduce((acc, item) => acc + item.amount, 0);
  const roundedSum = Math.round(calculatedSum * 100) / 100;

  const statedServicesTotal = Math.round(totals.services * 100) / 100;
  const statedInvoiceTotal = Math.round(totals.invoice * 100) / 100;

  // Tolerance formula: Math.max(0.01, Math.abs(expected) * 0.001)
  const servicesTolerance = Math.max(0.01, Math.abs(statedServicesTotal) * 0.001);
  const servicesDiff = Math.abs(roundedSum - statedServicesTotal);

  if (servicesDiff > servicesTolerance) {
    errors.push(
      `Services sum mismatch: calculated sum of services ($${roundedSum.toFixed(2)}) ` +
      `does not match stated services total ($${statedServicesTotal.toFixed(2)}). ` +
      `Difference: $${servicesDiff.toFixed(2)} (tolerance: $${servicesTolerance.toFixed(2)}).`
    );
  }

  const invoiceTolerance = Math.max(0.01, Math.abs(statedInvoiceTotal) * 0.001);
  const invoiceDiff = Math.abs(statedServicesTotal - statedInvoiceTotal);

  if (invoiceDiff > invoiceTolerance) {
    errors.push(
      `Totals mismatch: stated services total ($${statedServicesTotal.toFixed(2)}) ` +
      `does not match stated invoice total ($${statedInvoiceTotal.toFixed(2)}). ` +
      `Difference: $${invoiceDiff.toFixed(2)}.`
    );
  }

  const isReconciled = errors.length === 0;

  return {
    reconciled: isReconciled,
    errors,
    warnings,
    details: {
      calculatedSum: roundedSum,
      statedServicesTotal,
      statedInvoiceTotal,
      servicesDiff,
      invoiceDiff,
    },
  };
}
