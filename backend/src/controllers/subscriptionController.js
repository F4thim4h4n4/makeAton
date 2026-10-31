import Subscription from '../models/Subscription.js';
import Customer from '../models/Customer.js';

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
 * @desc    Get all subscriptions (with filters, search, pagination)
 * @route   GET /api/subscriptions
 * @access  Private (Admin, Staff; Customer gets only own)
 */
export const getSubscriptions = async (req, res, next) => {
  try {
    const {
      status,
      billingInterval,
      customer,
      search,
      page = 1,
      limit = 10,
      sort = '-createdAt',
    } = req.query;

    const query = {};

    // Customer role data isolation
    if (req.user.role === 'customer') {
      if (!req.user.customer) {
        return res.status(200).json({ success: true, data: [] });
      }
      query.customer = req.user.customer;
    } else {
      if (status) query.status = status;
      if (billingInterval) query.billingInterval = billingInterval;
      if (customer) query.customer = customer;
      if (search) {
        const searchRegex = new RegExp(search.trim(), 'i');
        query.$or = [
          { subscriptionNumber: searchRegex },
          { planName: searchRegex },
          { notes: searchRegex },
        ];
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const [subscriptions, total] = await Promise.all([
      Subscription.find(query)
        .populate('customer', 'name email company phone')
        .populate('statusHistory.changedBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Subscription.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: subscriptions,
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
 * @desc    Get single subscription by ID
 * @route   GET /api/subscriptions/:id
 * @access  Private (Admin, Staff, or Customer if own)
 */
export const getSubscriptionById = async (req, res, next) => {
  try {
    const subscription = await Subscription.findById(req.params.id)
      .populate('customer')
      .populate('statusHistory.changedBy', 'name email');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }

    // Customer isolation check
    if (
      req.user.role === 'customer' &&
      subscription.customer?._id?.toString() !== req.user.customer?.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot view this subscription',
      });
    }

    res.status(200).json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new subscription
 * @route   POST /api/subscriptions
 * @access  Private (Admin, Staff)
 */
export const createSubscription = async (req, res, next) => {
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
      paymentTerms = 'Due on receipt',
      startDate = new Date(),
      autoRenew = true,
      notes = '',
    } = req.body;

    if (!customer) {
      return res.status(400).json({
        success: false,
        message: 'Customer is required',
      });
    }

    const customerRecord = await Customer.findById(customer);
    if (!customerRecord) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    // Compute lines and amounts safely
    let subtotal = 0;
    const computedItems = items.map((item) => {
      const qty = Math.max(1, Number(item.quantity) || 1);
      const unit = Math.max(0, Number(item.unitPrice) || 0);
      const itemDisc = Math.max(0, Number(item.discountAmount) || 0);
      const itemTotal = Number((qty * unit - itemDisc).toFixed(2));
      subtotal += itemTotal;

      return {
        product: item.product || null,
        name: item.name || 'Custom Product / Service',
        variant: item.variant || '',
        quantity: qty,
        unitPrice: unit,
        taxRate: Number(item.taxRate) || 0,
        discountAmount: itemDisc,
        total: itemTotal,
      };
    });

    subtotal = Number(subtotal.toFixed(2));
    const disc = Math.min(subtotal, Math.max(0, Number(discountAmount) || 0));
    const taxableBase = Math.max(0, subtotal - disc);
    const taxAmt = Number(((taxableBase * Number(taxRate)) / 100).toFixed(2));
    const totalAmount = Number((taxableBase + taxAmt).toFixed(2));

    const subscriptionNumber = await generateSubscriptionNumber();

    const start = new Date(startDate);
    const tempSub = new Subscription({ billingInterval });
    const nextBillingDate = tempSub.calculateNextBillingDate(start);

    // Default expiry is 1 year from start
    const expiryDate = new Date(start);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    const subscription = await Subscription.create({
      subscriptionNumber,
      customer,
      plan: plan || null,
      planName: planName || 'Standard Subscription Plan',
      billingInterval,
      items: computedItems,
      subtotal,
      discountAmount: disc,
      discountCode,
      taxRate: Number(taxRate) || 0,
      taxAmount: taxAmt,
      totalAmount,
      paymentTerms,
      startDate: start,
      expiryDate,
      nextBillingDate,
      status: 'confirmed',
      autoRenew: Boolean(autoRenew),
      notes: notes || '',
      statusHistory: [
        {
          status: 'confirmed',
          changedAt: new Date(),
          changedBy: req.user._id,
          reason: 'Initial creation',
        },
      ],
    });

    await subscription.populate('customer', 'name email company');

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Transition subscription status (activate, close, etc.)
 * @route   PATCH /api/subscriptions/:id/status
 * @access  Private (Admin, Staff)
 */
export const updateSubscriptionStatus = async (req, res, next) => {
  try {
    const { status: targetStatus, reason = '' } = req.body;
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    if (!Subscription.canTransition(subscription.status, targetStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition: Cannot transition subscription from '${subscription.status}' to '${targetStatus}'.`,
      });
    }

    subscription.status = targetStatus;
    subscription.statusHistory.push({
      status: targetStatus,
      changedAt: new Date(),
      changedBy: req.user._id,
      reason: reason || `Status updated to ${targetStatus}`,
    });

    if (targetStatus === 'closed') {
      subscription.cancelledAt = new Date();
    }

    await subscription.save();

    res.status(200).json({
      success: true,
      message: `Subscription status updated to '${targetStatus}'`,
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Pause active subscription
 * @route   PATCH /api/subscriptions/:id/pause
 * @access  Private (Admin, Staff)
 */
export const pauseSubscription = async (req, res, next) => {
  try {
    const { reason = 'Paused by administrator/staff' } = req.body;
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    if (subscription.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Only active subscriptions can be paused. Current status: ${subscription.status}`,
      });
    }

    subscription.status = 'paused';
    subscription.pausedAt = new Date();
    subscription.statusHistory.push({
      status: 'paused',
      changedAt: new Date(),
      changedBy: req.user._id,
      reason,
    });

    await subscription.save();

    res.status(200).json({
      success: true,
      message: 'Subscription has been paused',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resume paused subscription
 * @route   PATCH /api/subscriptions/:id/resume
 * @access  Private (Admin, Staff)
 */
export const resumeSubscription = async (req, res, next) => {
  try {
    const { reason = 'Resumed by administrator/staff' } = req.body;
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    if (subscription.status !== 'paused') {
      return res.status(400).json({
        success: false,
        message: `Only paused subscriptions can be resumed. Current status: ${subscription.status}`,
      });
    }

    subscription.status = 'active';
    subscription.resumedAt = new Date();
    
    // Shift next billing date if paused
    if (subscription.nextBillingDate && subscription.nextBillingDate < new Date()) {
      subscription.nextBillingDate = subscription.calculateNextBillingDate(new Date());
    }

    subscription.statusHistory.push({
      status: 'active',
      changedAt: new Date(),
      changedBy: req.user._id,
      reason,
    });

    await subscription.save();

    res.status(200).json({
      success: true,
      message: 'Subscription has been resumed and is now active',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel / Close subscription early
 * @route   PATCH /api/subscriptions/:id/cancel
 * @access  Private (Admin, Staff, or Customer cancelling own subscription)
 */
export const cancelSubscription = async (req, res, next) => {
  try {
    const { reason = 'Early cancellation' } = req.body;
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    if (
      req.user.role === 'customer' &&
      subscription.customer?.toString() !== req.user.customer?.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (subscription.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'This subscription is already closed',
      });
    }

    subscription.status = 'closed';
    subscription.cancelledAt = new Date();
    subscription.autoRenew = false;
    subscription.statusHistory.push({
      status: 'closed',
      changedAt: new Date(),
      changedBy: req.user._id,
      reason,
    });

    await subscription.save();

    res.status(200).json({
      success: true,
      message: 'Subscription has been closed',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Renew subscription for another billing cycle
 * @route   PATCH /api/subscriptions/:id/renew
 * @access  Private (Admin, Staff)
 */
export const renewSubscription = async (req, res, next) => {
  try {
    const { reason = 'Manual renewal by staff' } = req.body;
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    if (['closed'].includes(subscription.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot renew a closed subscription. Please create a new subscription.',
      });
    }

    // Extend nextBillingDate and expiryDate
    const baseDate = subscription.nextBillingDate && subscription.nextBillingDate > new Date()
      ? subscription.nextBillingDate
      : new Date();

    subscription.nextBillingDate = subscription.calculateNextBillingDate(baseDate);

    // Extend expiry by 1 year or interval
    const newExpiry = new Date(subscription.expiryDate || new Date());
    newExpiry.setFullYear(newExpiry.getFullYear() + 1);
    subscription.expiryDate = newExpiry;

    subscription.status = 'active';
    subscription.statusHistory.push({
      status: 'active',
      changedAt: new Date(),
      changedBy: req.user._id,
      reason,
    });

    await subscription.save();

    res.status(200).json({
      success: true,
      message: `Subscription renewed. Next billing date: ${subscription.nextBillingDate.toISOString().split('T')[0]}`,
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};
