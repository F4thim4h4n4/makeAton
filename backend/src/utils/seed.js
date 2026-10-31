import mongoose from 'mongoose';
import appConfig from '../config/config.js';
import connectDB from '../config/database.js';
import User from '../models/User.js';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import Plan from '../models/Plan.js';
import Tax from '../models/Tax.js';
import Discount from '../models/Discount.js';
import Quotation from '../models/Quotation.js';
import Subscription from '../models/Subscription.js';
import { hashPassword } from './authUtils.js';

export const seedDatabase = async () => {
  console.log('[Seed] 🌱 Starting database seeding for Brightloop Software...');

  // Clear existing collections
  await Promise.all([
    User.deleteMany({}),
    Customer.deleteMany({}),
    Product.deleteMany({}),
    Plan.deleteMany({}),
    Tax.deleteMany({}),
    Discount.deleteMany({}),
    Quotation.deleteMany({}),
    Subscription.deleteMany({}),
  ]);

  console.log('[Seed] 🧹 Cleared existing records.');

  // 1. Create Tax Rules
  const vatTax = await Tax.create({
    name: 'VAT Standard 20%',
    rate: 20,
    region: 'EU/UK',
    isActive: true,
  });

  const stateTax = await Tax.create({
    name: 'State Sales Tax 8%',
    rate: 8,
    region: 'US',
    isActive: true,
  });

  // 2. Create Discounts
  const welcomeDiscount = await Discount.create({
    code: 'WELCOME10',
    type: 'percentage',
    value: 10,
    maxUses: 100,
    usedCount: 5,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    isActive: true,
  });

  const flatDiscount = await Discount.create({
    code: 'STARTUP50',
    type: 'flat',
    value: 50,
    minPurchase: 200,
    maxUses: 50,
    usedCount: 2,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    isActive: true,
  });

  // 3. Create Products with Variants
  const businessSuite = await Product.create({
    name: 'Business Suite',
    description: 'Comprehensive business management, accounting, and CRM software.',
    salesPrice: 2000,
    costPrice: 800,
    variants: [
      { name: 'Standard Edition', additionalPrice: 0 },
      { name: 'Odoo Brand Edition', additionalPrice: 560 }, // Matches problem statement example!
      { name: 'Enterprise Edition', additionalPrice: 1200 },
    ],
    isActive: true,
  });

  const analyticsPro = await Product.create({
    name: 'Analytics Pro',
    description: 'Real-time financial business intelligence and automated revenue dashboards.',
    salesPrice: 450,
    costPrice: 150,
    variants: [
      { name: 'Standard', additionalPrice: 0 },
      { name: 'AI Forecast Module', additionalPrice: 250 },
    ],
    isActive: true,
  });

  // 4. Create Plans for Billing Intervals (Daily, Weekly, Monthly, Yearly)
  const monthlyPlan = await Plan.create({
    name: 'Business Suite Monthly',
    product: businessSuite._id,
    billingInterval: 'monthly',
    price: 2560,
    currency: 'USD',
    minQuantity: 1,
    allowPause: true,
    allowEarlyClosure: true,
    allowRenewal: true,
    isActive: true,
  });

  const yearlyPlan = await Plan.create({
    name: 'Business Suite Annual',
    product: businessSuite._id,
    billingInterval: 'yearly',
    price: 25000,
    currency: 'USD',
    minQuantity: 1,
    allowPause: true,
    allowEarlyClosure: true,
    allowRenewal: true,
    isActive: true,
  });

  const weeklyPlan = await Plan.create({
    name: 'Analytics Pro Weekly',
    product: analyticsPro._id,
    billingInterval: 'weekly',
    price: 120,
    currency: 'USD',
    minQuantity: 1,
    isActive: true,
  });

  const dailyPlan = await Plan.create({
    name: 'On-Demand Cloud Daily',
    product: analyticsPro._id,
    billingInterval: 'daily',
    price: 25,
    currency: 'USD',
    minQuantity: 1,
    isActive: true,
  });

  // 5. Create Customers
  const customerAcme = await Customer.create({
    name: 'Acme Corporation',
    email: 'billing@acme.com',
    phone: '+1 555-0199',
    company: 'Acme Global Holdings',
    address: {
      street: '100 Innovation Way',
      city: 'Austin',
      state: 'TX',
      country: 'USA',
      postcode: '78701',
    },
    status: 'active',
    notes: 'Key enterprise account since 2025',
  });

  const customerTechStart = await Customer.create({
    name: 'TechStart Labs',
    email: 'finance@techstart.io',
    phone: '+1 555-0244',
    company: 'TechStart Innovations',
    address: {
      street: '45 Silicon Boulevard',
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
      postcode: '94107',
    },
    status: 'active',
  });

  const customerGlobalLog = await Customer.create({
    name: 'Global Logistics Inc',
    email: 'ops@globallogistics.com',
    phone: '+44 20 7946 0912',
    company: 'Global Logistics Ltd',
    address: {
      street: '12 Freight House',
      city: 'London',
      state: '',
      country: 'United Kingdom',
      postcode: 'EC1A 1BB',
    },
    status: 'active',
  });

  // 6. Create Users (Admin, Staff, Customer)
  // Password complexity: > 8 chars, 1 uppercase, 1 lowercase, 1 special char
  const adminPasswordHash = await hashPassword('Admin123!@#');
  const staffPasswordHash = await hashPassword('Staff123!@#');
  const customerPasswordHash = await hashPassword('Customer123!@#');

  const adminUser = await User.create({
    name: 'Alice Administrator',
    email: 'admin@brightloop.com',
    passwordHash: adminPasswordHash,
    role: 'admin',
    isActive: true,
  });

  const staffUser = await User.create({
    name: 'Bob Staff',
    email: 'staff@brightloop.com',
    passwordHash: staffPasswordHash,
    role: 'staff',
    isActive: true,
  });

  const customerUser = await User.create({
    name: 'Charlie Customer',
    email: 'billing@acme.com',
    passwordHash: customerPasswordHash,
    role: 'customer',
    customer: customerAcme._id,
    isActive: true,
  });

  customerAcme.user = customerUser._id;
  await customerAcme.save();

  // 7. Create Quotations
  const quotation1 = await Quotation.create({
    quotationNumber: 'QUO-2026-0001',
    customer: customerAcme._id,
    plan: monthlyPlan._id,
    planName: 'Business Suite Monthly',
    billingInterval: 'monthly',
    items: [
      {
        product: businessSuite._id,
        name: 'Business Suite (Odoo Brand Edition)',
        variant: 'Odoo Brand Edition (+560)',
        quantity: 1,
        unitPrice: 2560,
        taxRate: 8,
        discountAmount: 256,
        total: 2304,
      },
    ],
    subtotal: 2560,
    discountAmount: 256,
    discountCode: 'WELCOME10',
    taxRate: 8,
    taxAmount: 184.32,
    totalAmount: 2488.32,
    validityDays: 30,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    status: 'confirmed',
    notes: 'Quotation ready for subscription activation',
  });

  const quotationTemplate = await Quotation.create({
    quotationNumber: 'QUO-TEMPLATE-001',
    customer: customerTechStart._id,
    plan: yearlyPlan._id,
    planName: 'Enterprise Annual Package',
    billingInterval: 'yearly',
    items: [
      {
        product: businessSuite._id,
        name: 'Business Suite Enterprise',
        variant: 'Enterprise Edition',
        quantity: 2,
        unitPrice: 3200,
        taxRate: 20,
        discountAmount: 0,
        total: 6400,
      },
    ],
    subtotal: 6400,
    discountAmount: 0,
    taxRate: 20,
    taxAmount: 1280,
    totalAmount: 7680,
    validityDays: 60,
    isTemplate: true,
    templateName: 'Standard Enterprise Package Template',
    status: 'draft',
    notes: 'Reusable template for enterprise clients',
  });

  // 8. Create Subscriptions demonstrating the complete lifecycle
  const subActiveAcme = await Subscription.create({
    subscriptionNumber: 'SUB-2026-0001',
    customer: customerAcme._id,
    quotation: quotation1._id,
    plan: monthlyPlan._id,
    planName: 'Business Suite Monthly',
    billingInterval: 'monthly',
    items: [
      {
        product: businessSuite._id,
        name: 'Business Suite (Odoo Brand Edition)',
        variant: 'Odoo Brand Edition',
        quantity: 1,
        unitPrice: 2560,
        taxRate: 8,
        discountAmount: 256,
        total: 2304,
      },
    ],
    subtotal: 2560,
    discountAmount: 256,
    discountCode: 'WELCOME10',
    taxRate: 8,
    taxAmount: 184.32,
    totalAmount: 2488.32,
    paymentTerms: 'Due on receipt',
    startDate: new Date(),
    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    status: 'active',
    statusHistory: [
      {
        status: 'draft',
        changedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        changedBy: staffUser._id,
        reason: 'Quotation converted',
      },
      {
        status: 'confirmed',
        changedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        changedBy: staffUser._id,
        reason: 'Terms accepted by customer',
      },
      {
        status: 'active',
        changedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        changedBy: adminUser._id,
        reason: 'First invoice issued and activated',
      },
    ],
    autoRenew: true,
  });

  quotation1.status = 'converted';
  quotation1.convertedSubscription = subActiveAcme._id;
  await quotation1.save();

  const subPausedTechStart = await Subscription.create({
    subscriptionNumber: 'SUB-2026-0002',
    customer: customerTechStart._id,
    plan: weeklyPlan._id,
    planName: 'Analytics Pro Weekly',
    billingInterval: 'weekly',
    items: [
      {
        product: analyticsPro._id,
        name: 'Analytics Pro + AI Forecast Module',
        variant: 'AI Forecast Module',
        quantity: 2,
        unitPrice: 700,
        taxRate: 8,
        discountAmount: 50,
        total: 1350,
      },
    ],
    subtotal: 1400,
    discountAmount: 50,
    discountCode: 'STARTUP50',
    taxRate: 8,
    taxAmount: 108,
    totalAmount: 1458,
    paymentTerms: 'Net 15',
    startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    nextBillingDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    status: 'paused',
    pausedAt: new Date(),
    statusHistory: [
      {
        status: 'confirmed',
        changedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        changedBy: staffUser._id,
        reason: 'Customer initiated',
      },
      {
        status: 'active',
        changedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        changedBy: staffUser._id,
        reason: 'Provisioned',
      },
      {
        status: 'paused',
        changedAt: new Date(),
        changedBy: staffUser._id,
        reason: 'Customer requested pause during product revamp',
      },
    ],
    autoRenew: true,
  });

  const subConfirmedGlobal = await Subscription.create({
    subscriptionNumber: 'SUB-2026-0003',
    customer: customerGlobalLog._id,
    plan: yearlyPlan._id,
    planName: 'Business Suite Annual',
    billingInterval: 'yearly',
    items: [
      {
        product: businessSuite._id,
        name: 'Business Suite Standard',
        variant: 'Standard Edition',
        quantity: 5,
        unitPrice: 2000,
        taxRate: 20,
        discountAmount: 1000,
        total: 9000,
      },
    ],
    subtotal: 10000,
    discountAmount: 1000,
    taxRate: 20,
    taxAmount: 1800,
    totalAmount: 10800,
    paymentTerms: 'Net 30',
    startDate: new Date(),
    nextBillingDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    status: 'confirmed',
    statusHistory: [
      {
        status: 'confirmed',
        changedAt: new Date(),
        changedBy: staffUser._id,
        reason: 'Confirmed awaiting initial billing cycle run',
      },
    ],
    autoRenew: true,
  });

  console.log('[Seed] ✅ Database seeded successfully!');
  console.log('───────────────────────────────────────────────────');
  console.log('DEMO ACCOUNTS READY:');
  console.log('👑 Admin:    admin@brightloop.com     / Admin123!@#');
  console.log('👔 Staff:    staff@brightloop.com     / Staff123!@#');
  console.log('👤 Customer: billing@acme.com         / Customer123!@#');
  console.log('───────────────────────────────────────────────────');
};

// If run directly from CLI
if (process.argv[1]?.endsWith('seed.js')) {
  (async () => {
    try {
      await connectDB();
      await seedDatabase();
      process.exit(0);
    } catch (err) {
      console.error('[Seed] ❌ Failed to seed database:', err);
      process.exit(1);
    }
  })();
}
