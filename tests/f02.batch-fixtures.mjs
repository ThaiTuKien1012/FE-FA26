// Model the backend wire response in fixture browser tests.
export function batchView(batch, products, today) {
  const daysToExpiry = batch.expiryDate ? (Date.parse(batch.expiryDate) - Date.parse(today)) / 86400000 : null;
  const effectiveStatus = daysToExpiry !== null && daysToExpiry < 0 ? 'EXPIRED' : batch.status;
  const warnings = products.find(product => product.id === batch.productId)?.requiresExpiry &&
    !batch.pushDay && effectiveStatus !== 'EXPIRED' ? ['MISSING_PUSH_DAY'] : [];
  return { ...batch, effectiveStatus, daysToExpiry, warnings };
}
