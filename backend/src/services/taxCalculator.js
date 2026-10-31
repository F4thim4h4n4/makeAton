import TaxRule from '../models/taxRule.js';

/**
 * Reusable Tax Calculation Service
 *
 * Interface for Member 3 (billing):
 *   calculateTax({ productId, amount, date })
 *   → { applicable: boolean, taxes: [{ taxId, name, type, rate, taxAmount }], totalTax, amountAfterTax }
 *
 * Rules:
 *   - Only active tax rules apply.
 *   - Tax rules must be within effective date range (if dates are set).
 *   - If a tax rule has applicableProducts, the product must be in the list.
 *   - If applicableProducts is empty, the tax applies to all products.
 *   - Percentage: taxAmount = amount × rate / 100
 *   - Fixed: taxAmount = rate (the fixed amount)
 *   - Multiple taxes are additive.
 *   - Rounding: 2 decimal places.
 *
 * Order of operations (agreed convention):
 *   1. Calculate subtotal (plan price × quantity)
 *   2. Apply discounts to get discountedSubtotal
 *   3. Apply taxes on discountedSubtotal
 *   4. Final total = discountedSubtotal + totalTax
 */
export const calculateTax = async ({ productId, amount, date = new Date() }) => {
  // Build query for eligible taxes
  const query = {
    status: 'active',
    $or: [
      { effectiveFrom: { $exists: false } },
      { effectiveFrom: null },
      { effectiveFrom: { $lte: date } },
    ],
  };

  let taxes = await TaxRule.find(query).lean();

  // Filter by effectiveTo
  taxes = taxes.filter((t) => {
    if (!t.effectiveTo) return true;
    return new Date(t.effectiveTo) >= date;
  });

  // Filter by product applicability
  taxes = taxes.filter((t) => {
    if (!t.applicableProducts || t.applicableProducts.length === 0) return true;
    if (!productId) return true;
    return t.applicableProducts.some((p) => p.toString() === productId.toString());
  });

  if (taxes.length === 0) {
    return {
      applicable: false,
      taxes: [],
      totalTax: 0,
      amountAfterTax: +amount.toFixed(2),
    };
  }

  let totalTax = 0;
  const applied = taxes.map((t) => {
    let taxAmount = 0;
    if (t.type === 'percentage') {
      taxAmount = +(amount * t.rate / 100).toFixed(2);
    } else {
      taxAmount = +t.rate.toFixed(2);
    }
    totalTax += taxAmount;
    return {
      taxId: t._id,
      name: t.name,
      type: t.type,
      rate: t.rate,
      taxAmount,
    };
  });

  totalTax = +totalTax.toFixed(2);

  return {
    applicable: true,
    taxes: applied,
    totalTax,
    amountAfterTax: +(amount + totalTax).toFixed(2),
  };
};
