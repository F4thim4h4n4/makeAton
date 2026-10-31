import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import DiscountRule from '../src/models/discountRule.js';
import mongoose from 'mongoose';

describe('Discount Rule Schema & Validation', () => {
  it('should accept a valid percentage discount', () => {
    const disc = new DiscountRule({
      name: 'PROMO20',
      type: 'percentage',
      value: 20,
      status: 'active',
    });
    const err = disc.validateSync();
    assert.equal(err, undefined);
    assert.equal(disc.value, 20);
  });

  it('should accept a valid fixed discount', () => {
    const disc = new DiscountRule({
      name: 'FLAT500',
      type: 'fixed',
      value: 500,
      status: 'active',
    });
    const err = disc.validateSync();
    assert.equal(err, undefined);
    assert.equal(disc.value, 500);
  });

  it('should reject percentage discount value > 100', () => {
    const disc = new DiscountRule({
      name: 'OVER100',
      type: 'percentage',
      value: 125,
    });
    const err = disc.validateSync();
    assert.ok(err);
    assert.ok(err.errors.value);
  });

  it('should reject negative discount values', () => {
    const disc = new DiscountRule({
      name: 'NEGATIVE',
      type: 'fixed',
      value: -100,
    });
    const err = disc.validateSync();
    assert.ok(err);
    assert.ok(err.errors.value);
  });
});

describe('Discount Evaluation Logic', () => {
  const dummyProductId = new mongoose.Types.ObjectId();
  const otherProductId = new mongoose.Types.ObjectId();

  const evaluateDiscountPure = ({ discount, productId, amount, quantity = 1, date = new Date() }) => {
    if (!discount) return { applicable: false, reason: 'Discount not found' };
    if (discount.status !== 'active') return { applicable: false, reason: 'Discount is inactive' };

    if (discount.startDate && new Date(discount.startDate) > date) {
      return { applicable: false, reason: 'Discount has not started yet' };
    }
    if (discount.endDate && new Date(discount.endDate) < date) {
      return { applicable: false, reason: 'Discount has expired' };
    }

    if (discount.minPurchaseAmount && amount < discount.minPurchaseAmount) {
      return { applicable: false, reason: `Minimum purchase amount is ₹${discount.minPurchaseAmount}` };
    }

    if (discount.minQuantity && quantity < discount.minQuantity) {
      return { applicable: false, reason: `Minimum quantity is ${discount.minQuantity}` };
    }

    if (discount.applicableProducts && discount.applicableProducts.length > 0 && productId) {
      const match = discount.applicableProducts.some((p) => p.toString() === productId.toString());
      if (!match) return { applicable: false, reason: 'Discount does not apply to this product' };
    }

    if (discount.maxUsageCount > 0 && discount.currentUsageCount >= discount.maxUsageCount) {
      return { applicable: false, reason: 'Discount usage limit has been reached' };
    }

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
      discountName: discount.name,
      discountType: discount.type,
      eligibleAmount: +amount.toFixed(2),
      discountAmount,
      amountAfterDiscount: +(amount - discountAmount).toFixed(2),
    };
  };

  it('should calculate percentage discount accurately (e.g. ₹2,000 @ 20% = ₹400, final ₹1,600)', () => {
    const discount = {
      name: 'SALE20',
      type: 'percentage',
      value: 20,
      status: 'active',
    };
    const res = evaluateDiscountPure({ discount, amount: 2000 });
    assert.equal(res.applicable, true);
    assert.equal(res.discountAmount, 400);
    assert.equal(res.amountAfterDiscount, 1600);
  });

  it('should calculate fixed discount accurately (e.g. ₹2,000 - ₹500 = ₹1,500)', () => {
    const discount = {
      name: 'FLAT500',
      type: 'fixed',
      value: 500,
      status: 'active',
    };
    const res = evaluateDiscountPure({ discount, amount: 2000 });
    assert.equal(res.applicable, true);
    assert.equal(res.discountAmount, 500);
    assert.equal(res.amountAfterDiscount, 1500);
  });

  it('should prevent discounts from producing negative totals (capped at amount)', () => {
    const discount = {
      name: 'SUPERFIXED',
      type: 'fixed',
      value: 3000,
      status: 'active',
    };
    const res = evaluateDiscountPure({ discount, amount: 2000 });
    assert.equal(res.applicable, true);
    assert.equal(res.discountAmount, 2000, 'Discount must be capped at eligible amount');
    assert.equal(res.amountAfterDiscount, 0, 'Final total must never be negative');
  });

  it('should reject discount if minimum purchase amount is not met', () => {
    const discount = {
      name: 'TIER3000',
      type: 'fixed',
      value: 300,
      minPurchaseAmount: 3000,
      status: 'active',
    };
    const res = evaluateDiscountPure({ discount, amount: 2500 });
    assert.equal(res.applicable, false);
    assert.match(res.reason, /Minimum purchase amount/);
  });

  it('should reject discount if minimum quantity is not met', () => {
    const discount = {
      name: 'BULK5',
      type: 'percentage',
      value: 15,
      minQuantity: 5,
      status: 'active',
    };
    const res = evaluateDiscountPure({ discount, amount: 5000, quantity: 3 });
    assert.equal(res.applicable, false);
    assert.match(res.reason, /Minimum quantity/);
  });

  it('should reject discount if maximum usage limit is reached', () => {
    const discount = {
      name: 'FIRST100',
      type: 'fixed',
      value: 100,
      maxUsageCount: 100,
      currentUsageCount: 100,
      status: 'active',
    };
    const res = evaluateDiscountPure({ discount, amount: 1000 });
    assert.equal(res.applicable, false);
    assert.match(res.reason, /usage limit has been reached/);
  });

  it('should reject expired discounts', () => {
    const discount = {
      name: 'EXPIRED',
      type: 'percentage',
      value: 10,
      endDate: new Date('2025-01-01'),
      status: 'active',
    };
    const res = evaluateDiscountPure({ discount, amount: 1000, date: new Date('2026-06-01') });
    assert.equal(res.applicable, false);
    assert.match(res.reason, /expired/);
  });

  it('should reject discount when product does not match product-specific discount', () => {
    const discount = {
      name: 'PRODUCT_ONLY',
      type: 'fixed',
      value: 100,
      applicableProducts: [dummyProductId],
      status: 'active',
    };
    const res = evaluateDiscountPure({ discount, productId: otherProductId, amount: 1000 });
    assert.equal(res.applicable, false);
    assert.match(res.reason, /does not apply to this product/);
  });
});
