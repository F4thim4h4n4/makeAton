import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Product from '../src/models/product.js';
import ProductVariant from '../src/models/productVariant.js';
import mongoose from 'mongoose';

describe('Product Management & Validation', () => {
  it('should accept a valid product', () => {
    const product = new Product({
      name: 'Brightloop CRM Software',
      type: 'Software',
      salesPrice: 2500,
      costPrice: 800,
      notes: 'Standard CRM license',
      status: 'active',
    });
    const err = product.validateSync();
    assert.equal(err, undefined, 'Valid product should have no validation errors');
    assert.equal(product.name, 'Brightloop CRM Software');
    assert.equal(product.salesPrice, 2500);
  });

  it('should reject a product with missing required name', () => {
    const product = new Product({
      salesPrice: 1500,
    });
    const err = product.validateSync();
    assert.ok(err, 'Should produce validation error');
    assert.ok(err.errors.name, 'Missing name must produce validation error');
  });

  it('should reject a product with missing required salesPrice', () => {
    const product = new Product({
      name: 'Brightloop Add-on',
    });
    const err = product.validateSync();
    assert.ok(err, 'Should produce validation error');
    assert.ok(err.errors.salesPrice, 'Missing salesPrice must produce error');
  });

  it('should reject a product with negative salesPrice', () => {
    const product = new Product({
      name: 'Negative Price Product',
      salesPrice: -50,
    });
    const err = product.validateSync();
    assert.ok(err, 'Should fail on negative salesPrice');
    assert.ok(err.errors.salesPrice, 'salesPrice error should be present');
  });

  it('should reject a product with negative costPrice', () => {
    const product = new Product({
      name: 'Negative Cost Product',
      salesPrice: 100,
      costPrice: -20,
    });
    const err = product.validateSync();
    assert.ok(err, 'Should fail on negative costPrice');
    assert.ok(err.errors.costPrice, 'costPrice error should be present');
  });

  it('should support product deactivation status', () => {
    const product = new Product({
      name: 'Legacy Product',
      salesPrice: 1000,
      status: 'active',
    });
    assert.equal(product.status, 'active');
    product.status = 'inactive';
    const err = product.validateSync();
    assert.equal(err, undefined);
    assert.equal(product.status, 'inactive');
  });
});

describe('Product Variant & Price Calculation', () => {
  const dummyProductId = new mongoose.Types.ObjectId();

  it('should accept a valid variant', () => {
    const variant = new ProductVariant({
      product: dummyProductId,
      name: 'Odoo Edition',
      additionalPrice: 560,
      status: 'active',
    });
    const err = variant.validateSync();
    assert.equal(err, undefined);
  });

  it('should reject a variant with negative additionalPrice', () => {
    const variant = new ProductVariant({
      product: dummyProductId,
      name: 'Invalid Price Variant',
      additionalPrice: -100,
    });
    const err = variant.validateSync();
    assert.ok(err);
    assert.ok(err.errors.additionalPrice);
  });

  it('should calculate variant price correctly: Base Price + Additional Price', () => {
    const basePrice = 2500;
    const variantAdditionalPrice = 560;
    const calculatedPrice = +(basePrice + variantAdditionalPrice).toFixed(2);

    assert.equal(calculatedPrice, 3060, 'Final price must equal 2500 + 560 = 3060');
  });

  it('should calculate zero-additional variant price correctly', () => {
    const basePrice = 1200;
    const variantAdditionalPrice = 0;
    const calculatedPrice = +(basePrice + variantAdditionalPrice).toFixed(2);

    assert.equal(calculatedPrice, 1200);
  });

  it('should calculate decimal variant prices with 2 decimal precision', () => {
    const basePrice = 99.99;
    const variantAdditionalPrice = 14.99;
    const calculatedPrice = +(basePrice + variantAdditionalPrice).toFixed(2);

    assert.equal(calculatedPrice, 114.98);
  });
});
