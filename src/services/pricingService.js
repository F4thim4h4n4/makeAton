/**
 * Pricing & Financial Calculation Service
 * Implements strict calculation order:
 * 1. Unit Price = Base Price + Variant Adjustments
 * 2. Line Subtotal = Unit Price * Quantity
 * 3. Discount Eligibility & Deduction
 * 4. Tax Calculation on Net Amount
 * 5. Line Total = Net Amount + Tax Amount
 * Rounding to 2 decimal places with decimal-safe financial math.
 */

function roundCurrency(amount) {
  return Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
}

/**
 * Validates discount eligibility
 */
function evaluateDiscount(discountRule, lineBaseTotal, quantity, currentDate = new Date().toISOString().slice(0, 10)) {
  if (!discountRule || !discountRule.is_active) {
    return 0;
  }

  // Date validity check
  if (discountRule.start_date && currentDate < discountRule.start_date) {
    return 0;
  }
  if (discountRule.end_date && currentDate > discountRule.end_date) {
    return 0;
  }

  // Usage limit check
  if (discountRule.max_uses > 0 && discountRule.current_uses >= discountRule.max_uses) {
    return 0;
  }

  // Minimum requirements
  if (discountRule.min_purchase_amount > 0 && lineBaseTotal < discountRule.min_purchase_amount) {
    return 0;
  }
  if (discountRule.min_quantity > 0 && quantity < discountRule.min_quantity) {
    return 0;
  }

  let discountAmount = 0;
  if (discountRule.discount_type === 'percentage') {
    discountAmount = (lineBaseTotal * discountRule.value) / 100;
  } else if (discountRule.discount_type === 'fixed') {
    discountAmount = Math.min(Number(discountRule.value), lineBaseTotal);
  }

  return roundCurrency(discountAmount);
}

/**
 * Calculates a single line item
 */
function calculateLineItem({ basePrice, variantAdjustment = 0, quantity = 1, discountRule = null, taxRate = 0, currentDate }) {
  const qty = Number(quantity) || 1;
  const unitPrice = roundCurrency(Number(basePrice) + Number(variantAdjustment));
  const lineBaseTotal = roundCurrency(unitPrice * qty);

  const discountAmount = evaluateDiscount(discountRule, lineBaseTotal, qty, currentDate);
  const netAmount = roundCurrency(Math.max(0, lineBaseTotal - discountAmount));

  const taxAmount = roundCurrency((netAmount * Number(taxRate)) / 100);
  const lineTotal = roundCurrency(netAmount + taxAmount);

  return {
    unitPrice,
    quantity: qty,
    lineBaseTotal,
    discountAmount,
    netAmount,
    taxRate: Number(taxRate),
    taxAmount,
    lineTotal
  };
}

/**
 * Calculates invoice or quotation summary from line items
 */
function calculateInvoiceTotals(calculatedLines) {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;
  let totalAmount = 0;

  for (const line of calculatedLines) {
    subtotal += line.lineBaseTotal;
    discountTotal += line.discountAmount;
    taxTotal += line.taxAmount;
    totalAmount += line.lineTotal;
  }

  return {
    subtotal: roundCurrency(subtotal),
    discountTotal: roundCurrency(discountTotal),
    taxTotal: roundCurrency(taxTotal),
    totalAmount: roundCurrency(totalAmount)
  };
}

module.exports = {
  roundCurrency,
  evaluateDiscount,
  calculateLineItem,
  calculateInvoiceTotals
};
