import Quotation from '../models/Quotation.js';
import Subscription from '../models/Subscription.js';
import Customer from '../models/Customer.js';

// Helper to generate unique quotation number
const generateQuotationNumber = async () => {
  const year = new Date().getFullYear();
  const count = await Quotation.countDocuments();
  const sequence = String(count + 1).padStart(4, '0');
  const candidate = `QUO-${year}-${sequence}`;
  
  // Check if candidate already exists
  const exists = await Quotation.findOne({ quotationNumber: candidate });
  if (exists) {
    return `QUO-${year}-${sequence}-${Date.now().toString().slice(-4)}`;
  }
  return candidate;
};

// Helper to generate unique subscription number
const generateSubscriptionNumber = async () => {
  const year = new Date().getFullYear();
  const count = await Subscription.countDocuments();
  const sequence = String(count + 1).padStart(4, '0');
  const candidate = `SUB-${year}-${sequence}`;
  
  const exists = await Subscription.findOne({ subscriptionNumber: candidate });
  if (exists) {
    return `SUB-${year}-${sequence}-${Date.now().toString().slice(-4)}`;
  }
  return candidate;
};

/**
 * @desc    Get all quotations (with filters and search)
 * @route   GET /api/quotations
 * @access  Private (Admin, Staff; Customer scoped to own)
 */
export const getQuotations = async (req, res, next) => {
  try {
    const { status, customer, isTemplate, search, page = 1, limit = 10 } = req.query;

    const query = {};

    // Customer role is strictly isolated
    if (req.user.role === 'customer') {
      if (!req.user.customer) {
        return res.status(200).json({ success: true, data: [] });
      }
      query.customer = req.user.customer;
      query.isTemplate = false;
    } else {
      if (status) query.status = status;
      if (customer) query.customer = customer;
      if (isTemplate !== undefined) query.isTemplate = isTemplate === 'true';
      if (search) {
        const searchRegex = new RegExp(search.trim(), 'i');
        query.$or = [{ quotationNumber: searchRegex }, { notes: searchRegex }, { templateName: searchRegex }];
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const [quotations, total] = await Promise.all([
      Quotation.find(query)
        .populate('customer', 'name email company')
        .populate('convertedSubscription', 'subscriptionNumber status')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Quotation.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: quotations,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get quotation templates
 * @route   GET /api/quotations/templates
 * @access  Private (Admin, Staff)
 */
export const getQuotationTemplates = async (req, res, next) => {
  try {
    const templates = await Quotation.find({ isTemplate: true })
      .populate('customer', 'name email')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      data: templates,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single quotation by ID
 * @route   GET /api/quotations/:id
 * @access  Private (Admin, Staff, or Customer if own)
 */
export const getQuotationById = async (req, res, next) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate('customer')
      .populate('convertedSubscription', 'subscriptionNumber status totalAmount');

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found',
      });
    }

    // Customer isolation check
    if (
      req.user.role === 'customer' &&
      quotation.customer?._id?.toString() !== req.user.customer?.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot view this quotation',
      });
    }

    res.status(200).json({
      success: true,
      data: quotation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new quotation or template
 * @route   POST /api/quotations
 * @access  Private (Admin, Staff)
 */
export const createQuotation = async (req, res, next) => {
  try {
    const {
      customer,
      plan,
      planName,
      billingInterval = 'monthly',
      items = [],
      discountAmount = 0,
      discountCode = '',
      taxRate = 0,
      validityDays = 30,
      isTemplate = false,
      templateName = '',
      notes = '',
    } = req.body;

    if (!customer) {
      return res.status(400).json({
        success: false,
        message: 'Customer is required for quotation',
      });
    }

    const customerRecord = await Customer.findById(customer);
    if (!customerRecord) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    // Calculate line items and totals safely with decimals
    let subtotal = 0;
    const computedItems = items.map((item) => {
      const qty = Math.max(1, Number(item.quantity) || 1);
      const unit = Math.max(0, Number(item.unitPrice) || 0);
      const itemTax = Math.max(0, Number(item.taxRate) || 0);
      const itemDisc = Math.max(0, Number(item.discountAmount) || 0);
      const itemTotal = Number((qty * unit - itemDisc).toFixed(2));
      subtotal += itemTotal;

      return {
        product: item.product || null,
        name: item.name || 'Custom Product / Service',
        variant: item.variant || '',
        quantity: qty,
        unitPrice: unit,
        taxRate: itemTax,
        discountAmount: itemDisc,
        total: itemTotal,
      };
    });

    subtotal = Number(subtotal.toFixed(2));
    const disc = Math.min(subtotal, Math.max(0, Number(discountAmount) || 0));
    const taxableBase = Math.max(0, subtotal - disc);
    const taxAmt = Number(((taxableBase * Number(taxRate)) / 100).toFixed(2));
    const totalAmount = Number((taxableBase + taxAmt).toFixed(2));

    const quotationNumber = await generateQuotationNumber();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (Number(validityDays) || 30));

    const quotation = await Quotation.create({
      quotationNumber,
      customer,
      plan: plan || null,
      planName: planName || 'Standard Plan',
      billingInterval,
      items: computedItems,
      subtotal,
      discountAmount: disc,
      discountCode,
      taxRate: Number(taxRate) || 0,
      taxAmount: taxAmt,
      totalAmount,
      validityDays: Number(validityDays) || 30,
      expiresAt,
      status: 'draft',
      isTemplate: Boolean(isTemplate),
      templateName: templateName || '',
      notes: notes || '',
    });

    await quotation.populate('customer', 'name email company');

    res.status(201).json({
      success: true,
      message: isTemplate ? 'Quotation template saved' : 'Quotation created successfully',
      data: quotation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a quotation (only allowed if draft)
 * @route   PUT /api/quotations/:id
 * @access  Private (Admin, Staff)
 */
export const updateQuotation = async (req, res, next) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    if (quotation.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: `Cannot edit quotation with status '${quotation.status}'. Only draft quotations can be modified.`,
      });
    }

    const {
      plan,
      planName,
      billingInterval,
      items,
      discountAmount,
      discountCode,
      taxRate,
      validityDays,
      notes,
    } = req.body;

    if (items) {
      let subtotal = 0;
      quotation.items = items.map((item) => {
        const qty = Math.max(1, Number(item.quantity) || 1);
        const unit = Math.max(0, Number(item.unitPrice) || 0);
        const itemDisc = Math.max(0, Number(item.discountAmount) || 0);
        const itemTotal = Number((qty * unit - itemDisc).toFixed(2));
        subtotal += itemTotal;
        return {
          product: item.product || null,
          name: item.name || 'Custom Product',
          variant: item.variant || '',
          quantity: qty,
          unitPrice: unit,
          discountAmount: itemDisc,
          total: itemTotal,
        };
      });
      quotation.subtotal = Number(subtotal.toFixed(2));
    }

    if (plan !== undefined) quotation.plan = plan;
    if (planName) quotation.planName = planName;
    if (billingInterval) quotation.billingInterval = billingInterval;
    if (discountCode !== undefined) quotation.discountCode = discountCode;
    if (discountAmount !== undefined) quotation.discountAmount = Number(discountAmount);
    if (taxRate !== undefined) quotation.taxRate = Number(taxRate);
    if (notes !== undefined) quotation.notes = notes;

    // Recalculate totals
    const disc = Math.min(quotation.subtotal, Math.max(0, quotation.discountAmount || 0));
    const taxableBase = Math.max(0, quotation.subtotal - disc);
    quotation.taxAmount = Number(((taxableBase * Number(quotation.taxRate || 0)) / 100).toFixed(2));
    quotation.totalAmount = Number((taxableBase + quotation.taxAmount).toFixed(2));

    if (validityDays) {
      quotation.validityDays = validityDays;
      const exp = new Date(quotation.createdAt);
      exp.setDate(exp.getDate() + Number(validityDays));
      quotation.expiresAt = exp;
    }

    await quotation.save();

    res.status(200).json({
      success: true,
      message: 'Quotation updated successfully',
      data: quotation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark quotation as sent
 * @route   PATCH /api/quotations/:id/send
 * @access  Private (Admin, Staff)
 */
export const sendQuotation = async (req, res, next) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    if (quotation.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: `Only draft quotations can be marked as sent. Current status: ${quotation.status}`,
      });
    }

    quotation.status = 'sent';
    await quotation.save();

    res.status(200).json({
      success: true,
      message: 'Quotation marked as sent to customer',
      data: quotation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Confirm / Accept quotation
 * @route   PATCH /api/quotations/:id/confirm
 * @access  Private (Admin, Staff, or Customer accepting their own quotation)
 */
export const confirmQuotation = async (req, res, next) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    if (
      req.user.role === 'customer' &&
      quotation.customer?.toString() !== req.user.customer?.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (['converted', 'cancelled', 'expired'].includes(quotation.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot confirm quotation with status: ${quotation.status}`,
      });
    }

    quotation.status = 'confirmed';
    await quotation.save();

    res.status(200).json({
      success: true,
      message: 'Quotation confirmed successfully',
      data: quotation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Convert confirmed quotation into an active subscription
 * @route   POST /api/quotations/:id/convert
 * @access  Private (Admin, Staff)
 */
export const convertQuotationToSubscription = async (req, res, next) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    if (quotation.status === 'converted') {
      return res.status(400).json({
        success: false,
        message: 'This quotation has already been converted to a subscription',
      });
    }

    // Automatically confirm if still in draft or sent
    if (['draft', 'sent'].includes(quotation.status)) {
      quotation.status = 'confirmed';
    }

    const subscriptionNumber = await generateSubscriptionNumber();
    const startDate = new Date();

    // Calculate expiry and next billing date according to interval
    const tempSub = new Subscription({ billingInterval: quotation.billingInterval });
    const nextBillingDate = tempSub.calculateNextBillingDate(startDate);
    const expiryDate = new Date(startDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1-year default lifecycle

    const subscription = await Subscription.create({
      subscriptionNumber,
      customer: quotation.customer,
      quotation: quotation._id,
      plan: quotation.plan,
      planName: quotation.planName || 'Standard Plan',
      billingInterval: quotation.billingInterval,
      items: quotation.items,
      subtotal: quotation.subtotal,
      discountAmount: quotation.discountAmount,
      discountCode: quotation.discountCode,
      taxRate: quotation.taxRate,
      taxAmount: quotation.taxAmount,
      totalAmount: quotation.totalAmount,
      paymentTerms: 'Due on receipt',
      startDate,
      nextBillingDate,
      expiryDate,
      status: 'confirmed',
      statusHistory: [
        {
          status: 'confirmed',
          changedAt: new Date(),
          changedBy: req.user._id,
          reason: `Converted from Quotation ${quotation.quotationNumber}`,
        },
      ],
      notes: quotation.notes || '',
    });

    quotation.status = 'converted';
    quotation.convertedSubscription = subscription._id;
    await quotation.save();

    await subscription.populate('customer', 'name email company');

    res.status(201).json({
      success: true,
      message: `Quotation converted successfully into Subscription ${subscription.subscriptionNumber}`,
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};
