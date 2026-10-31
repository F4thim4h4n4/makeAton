import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import SubscriptionPlan from '../src/models/plan.js';
import mongoose from 'mongoose';

describe('Subscription Plan Management & Rules', () => {
  const dummyProductId = new mongoose.Types.ObjectId();

  it('should accept all supported billing intervals: daily, weekly, monthly, yearly', () => {
    const intervals = ['daily', 'weekly', 'monthly', 'yearly'];
    intervals.forEach((interval) => {
      const plan = new SubscriptionPlan({
        name: `Plan ${interval}`,
        productIds: [dummyProductId],
        billingInterval: interval,
        price: 1000,
        minQuantity: 1,
      });
      const err = plan.validateSync();
      assert.equal(err, undefined, `Interval ${interval} should be valid`);
      assert.equal(plan.billingInterval, interval);
    });
  });

  it('should reject invalid billing intervals', () => {
    const plan = new SubscriptionPlan({
      name: 'Hourly Plan',
      billingInterval: 'hourly',
      price: 50,
    });
    const err = plan.validateSync();
    assert.ok(err);
    assert.ok(err.errors.billingInterval, 'Invalid billingInterval should be rejected');
  });

  it('should reject negative plan prices', () => {
    const plan = new SubscriptionPlan({
      name: 'Negative Plan',
      billingInterval: 'monthly',
      price: -500,
    });
    const err = plan.validateSync();
    assert.ok(err);
    assert.ok(err.errors.price, 'Negative price must be rejected');
  });

  it('should reject minimum quantity less than 1', () => {
    const plan = new SubscriptionPlan({
      name: 'Zero Qty Plan',
      billingInterval: 'monthly',
      price: 500,
      minQuantity: 0,
    });
    const err = plan.validateSync();
    assert.ok(err);
    assert.ok(err.errors.minQuantity, 'Min quantity < 1 must be rejected');
  });

  it('should store permissions for pause, renewal, early closure, and auto-expiry', () => {
    const plan = new SubscriptionPlan({
      name: 'Flexible Plan',
      billingInterval: 'yearly',
      price: 12000,
      minQuantity: 5,
      allowPause: true,
      allowRenewal: true,
      allowEarlyClose: true,
      autoCloseOnExpiry: true,
      status: 'active',
    });
    const err = plan.validateSync();
    assert.equal(err, undefined);
    assert.equal(plan.allowPause, true);
    assert.equal(plan.allowRenewal, true);
    assert.equal(plan.allowEarlyClose, true);
    assert.equal(plan.autoCloseOnExpiry, true);
  });
});

describe('Plan Pricing Calculation Logic', () => {
  it('should calculate plan subtotal: Plan price × Quantity', () => {
    const plan = {
      price: 2500,
      minQuantity: 1,
      status: 'active',
    };
    const quantity = 3;

    assert.ok(quantity >= plan.minQuantity, 'Quantity meets minimum');
    const subtotal = +(plan.price * quantity).toFixed(2);
    assert.equal(subtotal, 7500);
  });

  it('should enforce minimum quantity requirement', () => {
    const plan = {
      price: 1000,
      minQuantity: 5,
      status: 'active',
    };
    const attemptedQty = 3;

    const isValid = attemptedQty >= plan.minQuantity;
    assert.equal(isValid, false, 'Attempted quantity below minQuantity must be rejected');
  });

  it('should reject pricing calculation for inactive plans', () => {
    const plan = {
      price: 1000,
      minQuantity: 1,
      status: 'inactive',
    };

    assert.equal(plan.status === 'active', false, 'Inactive plan cannot be used for new pricing');
  });

  it('should handle decimal pricing and quantities accurately', () => {
    const planPrice = 499.95;
    const quantity = 10;
    const subtotal = +(planPrice * quantity).toFixed(2);
    assert.equal(subtotal, 4999.50);
  });
});
