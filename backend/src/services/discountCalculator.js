import DiscountRule from '../models/discountRule.js';

/**
 * Reusable Discount Calculation Service
 *
 * Interface for Member 3 (billing):
 *   evaluateDiscount({ discountId, productId, amount, quantity, date })
 *   → { applicable, discountId, discountType, eligibleAmount, discountAmount, reason? }
 *
 * Rules:
 *   - Only active discounts apply.
 *   - Must be within startDate–endDate range (if set).
 *   - Must meet minPurchaseAmount and minQuantity.
 *   - Product must be in applicableProducts (if non-empty).
 *   - maxUsageCount: 0 = unlimited; otherwise currentUsageCount < maxUsageCount.
 *   - Percentage: discountAmount = amount × value / 100
 *   - Fixed: discountAmount = value
 *   - Discount cannot exceed the eligible amount (no negative totals).
 *   - Rounding: 2 decimal places.
 *
 * After applying a discount, call incrementUsage(discountId) to bump currentUsageCount.
 */
export const evaluateDiscount = async ({
  discountId,
  productId,
  amount,
  quantity = 1,
  date = new Date(),
}) => {
  const discount = await DiscountRule.findById(discountId).lean();

  if (!discount) {
    return { applicable: false, reason: 'Discount not found' };
  }

  // Status check
  if (discount.status !== 'active') {
    return { applicable: false, discountId, reason: 'Discount is inactive' };
  }

  // Date validity
  if (discount.startDate && new Date(discount.startDate) > date) {
    return { applicable: false, discountId, reason: 'Discount has not started yet' };
  }
  if (discount.endDate && new Date(discount.endDate) < date) {
    return { applicable: false, discountId, reason: 'Discount has expired' };
  }

  // Min purchase
  if (discount.minPurchaseAmount && amount < discount.minPurchaseAmount) {
    return {
      applicable: false,
      discountId,
      reason: `Minimum purchase amount is ₹${discount.minPurchaseAmount}`,
    };
  }

  // Min quantity
  if (discount.minQuantity && quantity < discount.minQuantity) {
    return {
      applicable: false,
      discountId,
      reason: `Minimum quantity is ${discount.minQuantity}`,
    };
  }

  // Product applicability
  if (discount.applicableProducts && discount.applicableProducts.length > 0 && productId) {
    const isApplicable = discount.applicableProducts.some(
      (p) => p.toString() === productId.toString()
    );
    if (!isApplicable) {
      return {
        applicable: false,
        discountId,
        reason: 'Discount does not apply to this product',
      };
    }
  }

  // Usage limit
  if (discount.maxUsageCount > 0 && discount.currentUsageCount >= discount.maxUsageCount) {
    return {
      applicable: false,
      discountId,
      reason: 'Discount usage limit has been reached',
    };
  }

  // Calculate discount amount
  let discountAmount = 0;
  if (discount.type === 'percentage') {
    discountAmount = +(amount * discount.value / 100).toFixed(2);
  } else {
    discountAmount = +discount.value.toFixed(2);
  }

  // Cap at eligible amount (no negative totals)
  if (discountAmount > amount) {
    discountAmount = +amount.toFixed(2);
  }

  return {
    applicable: true,
    discountId: discount._id,
    discountName: discount.name,
    discountType: discount.type,
    discountValue: discount.value,
    eligibleAmount: +amount.toFixed(2),
    discountAmount,
    amountAfterDiscount: +(amount - discountAmount).toFixed(2),
  };
};

/**
 * Atomically increment the usage counter for a discount.
 * Call this after successfully applying a discount to an invoice.
 * Uses $inc for concurrency safety.
 */
export const incrementUsage = async (discountId) => {
  return DiscountRule.findByIdAndUpdate(
    discountId,
    { $inc: { currentUsageCount: 1 } },
    { new: true }
  );
};
