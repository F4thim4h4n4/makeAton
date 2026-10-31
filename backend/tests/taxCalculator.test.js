import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import TaxRule from '../src/models/taxRule.js';
import mongoose from 'mongoose';

describe('Tax Rule Schema & Validation', () => {
  it('should accept a valid percentage tax rule', () => {
    const tax = new TaxRule({
      name: 'GST 18%',
      type: 'percentage',
      rate: 18,
      status: 'active',
    });
    const err = tax.validateSync();
    assert.equal(err, undefined);
    assert.equal(tax.rate, 18);
  });

  it('should accept a valid fixed tax rule', () => {
    const tax = new TaxRule({
      name: 'Surcharge',
      type: 'fixed',
      rate: 50,
      status: 'active',
    });
    const err = tax.validateSync();
    assert.equal(err, undefined);
    assert.equal(tax.rate, 50);
  });

  it('should reject a percentage tax rule with rate > 100', () => {
    const tax = new TaxRule({
      name: 'Super Tax',
      type: 'percentage',
      rate: 120,
    });
    const err = tax.validateSync();
    assert.ok(err);
    assert.ok(err.errors.rate, 'Percentage > 100 must fail validation');
  });

  it('should reject negative tax rates', () => {
    const tax = new TaxRule({
      name: 'Negative Tax',
      type: 'percentage',
      rate: -5,
    });
    const err = tax.validateSync();
    assert.ok(err);
    assert.ok(err.errors.rate, 'Negative rate must fail validation');
  });
});

describe('Tax Calculation Service Engine', () => {
  const dummyProductId = new mongoose.Types.ObjectId();
  const otherProductId = new mongoose.Types.ObjectId();

  const calculateTaxesPure = ({ rules, productId, amount, date = new Date() }) => {
    // 1. Filter active
    let activeRules = rules.filter((r) => r.status === 'active');

    // 2. Filter dates
    activeRules = activeRules.filter((r) => {
      if (r.effectiveFrom && new Date(r.effectiveFrom) > date) return false;
      if (r.effectiveTo && new Date(r.effectiveTo) < date) return false;
      return true;
    });

    // 3. Filter product applicability
    activeRules = activeRules.filter((r) => {
      if (!r.applicableProducts || r.applicableProducts.length === 0) return true;
      if (!productId) return true;
      return r.applicableProducts.some((p) => p.toString() === productId.toString());
    });

    if (activeRules.length === 0) {
      return {
        applicable: false,
        taxes: [],
        totalTax: 0,
        amountAfterTax: +amount.toFixed(2),
      };
    }

    let totalTax = 0;
    const applied = activeRules.map((t) => {
      const taxAmount =
        t.type === 'percentage'
          ? +(amount * t.rate / 100).toFixed(2)
          : +t.rate.toFixed(2);
      totalTax += taxAmount;
      return {
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

  it('should calculate percentage tax accurately (e.g. ₹2,500 @ 18% = ₹450, total ₹2,950)', () => {
    const rules = [
      {
        name: 'GST 18%',
        type: 'percentage',
        rate: 18,
        status: 'active',
      },
    ];

    const result = calculateTaxesPure({ rules, amount: 2500 });
    assert.equal(result.applicable, true);
    assert.equal(result.taxes[0].taxAmount, 450);
    assert.equal(result.totalTax, 450);
    assert.equal(result.amountAfterTax, 2950);
  });

  it('should calculate fixed tax accurately (e.g. ₹2,500 + ₹50 = ₹2,550)', () => {
    const rules = [
      {
        name: 'Fixed Surcharge',
        type: 'fixed',
        rate: 50,
        status: 'active',
      },
    ];

    const result = calculateTaxesPure({ rules, amount: 2500 });
    assert.equal(result.applicable, true);
    assert.equal(result.taxes[0].taxAmount, 50);
    assert.equal(result.totalTax, 50);
    assert.equal(result.amountAfterTax, 2550);
  });

  it('should calculate multiple additive taxes with consistent rounding', () => {
    const rules = [
      { name: 'VAT 10%', type: 'percentage', rate: 10, status: 'active' },
      { name: 'City Surcharge 2.5%', type: 'percentage', rate: 2.5, status: 'active' },
      { name: 'Eco Fee', type: 'fixed', rate: 15, status: 'active' },
    ];

    const amount = 1000;
    // VAT: 100, City: 25, Eco: 15 -> Total Tax: 140 -> Final: 1140
    const result = calculateTaxesPure({ rules, amount });
    assert.equal(result.totalTax, 140);
    assert.equal(result.amountAfterTax, 1140);
    assert.equal(result.taxes.length, 3);
  });

  it('should ignore inactive tax rules', () => {
    const rules = [
      { name: 'Inactive Tax', type: 'percentage', rate: 18, status: 'inactive' },
    ];

    const result = calculateTaxesPure({ rules, amount: 2500 });
    assert.equal(result.applicable, false);
    assert.equal(result.totalTax, 0);
    assert.equal(result.amountAfterTax, 2500);
  });

  it('should ignore taxes outside their effective date window', () => {
    const pastRules = [
      {
        name: 'Expired Tax',
        type: 'percentage',
        rate: 10,
        status: 'active',
        effectiveTo: new Date('2025-01-01'),
      },
    ];
    const resPast = calculateTaxesPure({ rules: pastRules, amount: 1000, date: new Date('2026-06-01') });
    assert.equal(resPast.applicable, false, 'Expired tax should not apply');

    const futureRules = [
      {
        name: 'Future Tax',
        type: 'percentage',
        rate: 10,
        status: 'active',
        effectiveFrom: new Date('2027-01-01'),
      },
    ];
    const resFuture = calculateTaxesPure({ rules: futureRules, amount: 1000, date: new Date('2026-06-01') });
    assert.equal(resFuture.applicable, false, 'Future tax should not apply yet');
  });

  it('should apply product-specific tax rules only to eligible products', () => {
    const rules = [
      {
        name: 'Special Cloud Tax',
        type: 'percentage',
        rate: 5,
        status: 'active',
        applicableProducts: [dummyProductId],
      },
    ];

    // For matching product
    const match = calculateTaxesPure({ rules, productId: dummyProductId, amount: 1000 });
    assert.equal(match.applicable, true);
    assert.equal(match.totalTax, 50);

    // For non-matching product
    const nonMatch = calculateTaxesPure({ rules, productId: otherProductId, amount: 1000 });
    assert.equal(nonMatch.applicable, false);
    assert.equal(nonMatch.totalTax, 0);
  });
});
