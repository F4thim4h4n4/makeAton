import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import Product from '../models/product.js';
import ProductVariant from '../models/productVariant.js';
import SubscriptionPlan from '../models/plan.js';
import TaxRule from '../models/taxRule.js';
import DiscountRule from '../models/discountRule.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/subscription_db';

export const seedCatalogPricing = async () => {
  console.log(`[SEED] Connecting to ${MONGODB_URI}...`);
  await mongoose.connect(MONGODB_URI);
  console.log('[SEED] Connected. Seeding catalog & pricing data...');

  // 1. Products
  await Product.deleteMany({});
  await ProductVariant.deleteMany({});
  await SubscriptionPlan.deleteMany({});
  await TaxRule.deleteMany({});
  await DiscountRule.deleteMany({});

  const p1 = await Product.create({
    name: 'Brightloop CRM Software',
    type: 'Software',
    salesPrice: 2500,
    costPrice: 800,
    notes: 'Flagship customer relationship management suite for growing teams',
    status: 'active',
  });

  const p2 = await Product.create({
    name: 'Brightloop Cloud Storage',
    type: 'Infrastructure',
    salesPrice: 1200,
    costPrice: 400,
    notes: 'Secure encrypted cloud backup and object storage (1TB base)',
    status: 'active',
  });

  const p3 = await Product.create({
    name: 'Brightloop Enterprise ERP',
    type: 'Enterprise',
    salesPrice: 15000,
    costPrice: 5000,
    notes: 'All-in-one business operations, accounting, and inventory platform',
    status: 'active',
  });

  console.log(`[SEED] ✓ Seeded 3 Products`);

  // 2. Product Variants (Base + Variant price formula)
  await ProductVariant.create({
    product: p1._id,
    name: 'Standard Edition',
    additionalPrice: 0,
    status: 'active',
  });

  await ProductVariant.create({
    product: p1._id,
    name: 'Odoo Integration Edition',
    additionalPrice: 560, // Base 2500 + 560 = 3060
    status: 'active',
  });

  await ProductVariant.create({
    product: p1._id,
    name: 'Enterprise VIP Edition',
    additionalPrice: 1200, // Base 2500 + 1200 = 3700
    status: 'active',
  });

  await ProductVariant.create({
    product: p2._id,
    name: 'Extra 5TB Capacity',
    additionalPrice: 800,
    status: 'active',
  });

  console.log(`[SEED] ✓ Seeded 4 Product Variants`);

  // 3. Subscription Plans (Daily, Weekly, Monthly, Yearly)
  await SubscriptionPlan.create({
    name: 'CRM Monthly Starter',
    description: 'Billed monthly per active seat with standard support',
    productIds: [p1._id],
    billingInterval: 'monthly',
    price: 2500,
    minQuantity: 1,
    availableFrom: new Date('2026-01-01'),
    availableUntil: new Date('2030-12-31'),
    allowPause: true,
    allowRenewal: true,
    allowEarlyClose: true,
    autoCloseOnExpiry: false,
    status: 'active',
  });

  await SubscriptionPlan.create({
    name: 'CRM Annual Pro',
    description: 'Yearly subscription with 2 months free equivalent savings',
    productIds: [p1._id],
    billingInterval: 'yearly',
    price: 25000,
    minQuantity: 1,
    availableFrom: new Date('2026-01-01'),
    allowPause: true,
    allowRenewal: true,
    allowEarlyClose: false,
    autoCloseOnExpiry: false,
    status: 'active',
  });

  await SubscriptionPlan.create({
    name: 'Cloud Storage Weekly Micro',
    description: 'Flexible weekly backup allocation for temporary projects',
    productIds: [p2._id],
    billingInterval: 'weekly',
    price: 350,
    minQuantity: 2,
    status: 'active',
  });

  await SubscriptionPlan.create({
    name: 'ERP Enterprise Annual Suite',
    description: 'Complete ERP license for up to 50 employees, billed annually',
    productIds: [p3._id],
    billingInterval: 'yearly',
    price: 150000,
    minQuantity: 1,
    status: 'active',
  });

  console.log(`[SEED] ✓ Seeded 4 Subscription Plans`);

  // 4. Tax Rules
  await TaxRule.create({
    name: 'GST 18%',
    type: 'percentage',
    rate: 18,
    status: 'active',
  });

  await TaxRule.create({
    name: 'Standard VAT 5%',
    type: 'percentage',
    rate: 5,
    applicableProducts: [p2._id],
    status: 'active',
  });

  await TaxRule.create({
    name: 'Environmental / Tech Surcharge',
    type: 'fixed',
    rate: 50,
    status: 'active',
  });

  console.log(`[SEED] ✓ Seeded 3 Tax Rules`);

  // 5. Discount Rules
  await DiscountRule.create({
    name: 'WELCOME20',
    description: '20% discount on initial software subscription purchase',
    type: 'percentage',
    value: 20,
    minPurchaseAmount: 1000,
    minQuantity: 1,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2027-12-31'),
    maxUsageCount: 500,
    currentUsageCount: 12,
    scope: 'subscription',
    status: 'active',
  });

  await DiscountRule.create({
    name: 'FLAT500',
    description: 'Flat ₹500 off on purchases above ₹3000',
    type: 'fixed',
    value: 500,
    minPurchaseAmount: 3000,
    minQuantity: 1,
    maxUsageCount: 100,
    currentUsageCount: 4,
    scope: 'subscription',
    status: 'active',
  });

  await DiscountRule.create({
    name: 'CLOUD50',
    description: '₹50 off Cloud Storage infrastructure tier',
    type: 'fixed',
    value: 50,
    minPurchaseAmount: 500,
    minQuantity: 1,
    applicableProducts: [p2._id],
    scope: 'product',
    status: 'active',
  });

  console.log(`[SEED] ✓ Seeded 3 Discount Rules`);
  console.log('[SEED] ✅ Catalog & Pricing Seed Complete!');
};

// Auto-run if executed directly via CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedCatalogPricing()
    .then(() => {
      mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error('[SEED] ❌ Failed to seed:', err);
      process.exit(1);
    });
}