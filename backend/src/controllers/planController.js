import SubscriptionPlan from '../models/plan.js';

const buildFilter = (query) => {
  const filter = {};
  if (query.search) {
    filter.name = { $regex: query.search, $options: 'i' };
  }
  if (query.billingInterval) {
    filter.billingInterval = query.billingInterval;
  }
  if (query.status) {
    filter.status = query.status;
  }
  return filter;
};

export const getPlans = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const filter = buildFilter(req.query);
    const skip = (page - 1) * limit;

    const [total, plans] = await Promise.all([
      SubscriptionPlan.countDocuments(filter),
      SubscriptionPlan.find(filter)
        .populate('productIds', 'name salesPrice')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.json({
      success: true,
      data: plans,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[GET /api/plans] error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createPlan = async (req, res) => {
  try {
    const {
      name,
      description,
      productIds,
      billingInterval,
      price,
      minQuantity,
      availableFrom,
      availableUntil,
      allowEarlyClose,
      allowPause,
      allowRenewal,
      autoCloseOnExpiry,
      status,
    } = req.body;

    // Validate date range
    if (availableFrom && availableUntil && new Date(availableUntil) < new Date(availableFrom)) {
      return res.status(400).json({
        success: false,
        message: 'availableUntil cannot be before availableFrom',
      });
    }

    const plan = await SubscriptionPlan.create({
      name,
      description,
      productIds,
      billingInterval,
      price,
      minQuantity,
      availableFrom,
      availableUntil,
      allowEarlyClose,
      allowPause,
      allowRenewal,
      autoCloseOnExpiry,
      status,
    });

    res.status(201).json({ success: true, data: plan });
  } catch (err) {
    console.error('[POST /api/plans] error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getPlanById = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id)
      .populate('productIds', 'name salesPrice')
      .lean();
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }
    res.json({ success: true, data: plan });
  } catch (err) {
    console.error('[GET /api/plans/:id] error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updatePlan = async (req, res) => {
  try {
    const updates = req.body;

    // Validate date range if both provided
    if (updates.availableFrom && updates.availableUntil) {
      if (new Date(updates.availableUntil) < new Date(updates.availableFrom)) {
        return res.status(400).json({
          success: false,
          message: 'availableUntil cannot be before availableFrom',
        });
      }
    }

    const plan = await SubscriptionPlan.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    ).lean();

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }
    res.json({ success: true, data: plan });
  } catch (err) {
    console.error('[PATCH /api/plans/:id] error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deactivatePlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { new: true }
    ).lean();
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }
    res.json({ success: true, data: plan });
  } catch (err) {
    console.error('[POST /api/plans/:id/deactivate] error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/plans/:id/calculate
 * Calculate subtotal for a plan given a quantity.
 * Body: { quantity: number }
 * Returns: { planPrice, quantity, subtotal }
 */
export const calculatePlanPrice = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id).lean();
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }
    if (plan.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Plan is not active' });
    }

    const quantity = Number(req.body.quantity) || plan.minQuantity;
    if (quantity < plan.minQuantity) {
      return res.status(400).json({
        success: false,
        message: `Minimum quantity is ${plan.minQuantity}`,
      });
    }

    const subtotal = +(plan.price * quantity).toFixed(2);
    res.json({
      success: true,
      data: {
        planId: plan._id,
        planName: plan.name,
        planPrice: plan.price,
        quantity,
        subtotal,
      },
    });
  } catch (err) {
    console.error('[POST /api/plans/:id/calculate] error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
