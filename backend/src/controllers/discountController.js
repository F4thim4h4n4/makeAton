import DiscountRule from '../models/discountRule.js';

const buildFilter = (query) => {
  const filter = {};
  if (query.search) {
    filter.name = { $regex: query.search, $options: 'i' };
  }
  if (query.type) {
    filter.type = query.type;
  }
  if (query.scope) {
    filter.scope = query.scope;
  }
  if (query.status) {
    filter.status = query.status;
  }
  return filter;
};

export const getDiscounts = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const filter = buildFilter(req.query);
    const skip = (page - 1) * limit;

    const [total, discounts] = await Promise.all([
      DiscountRule.countDocuments(filter),
      DiscountRule.find(filter)
        .populate('applicableProducts', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.json({
      success: true,
      data: discounts,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[GET /api/discounts] error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createDiscount = async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      value,
      minPurchaseAmount,
      minQuantity,
      startDate,
      endDate,
      maxUsageCount,
      applicableProducts,
      scope,
      status,
    } = req.body;

    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({
        success: false,
        message: 'endDate cannot be before startDate',
      });
    }

    const discount = await DiscountRule.create({
      name,
      description,
      type,
      value,
      minPurchaseAmount,
      minQuantity,
      startDate,
      endDate,
      maxUsageCount,
      applicableProducts,
      scope,
      status,
    });
    res.status(201).json({ success: true, data: discount });
  } catch (err) {
    console.error('[POST /api/discounts] error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getDiscountById = async (req, res) => {
  try {
    const discount = await DiscountRule.findById(req.params.id)
      .populate('applicableProducts', 'name')
      .lean();
    if (!discount) {
      return res.status(404).json({ success: false, message: 'Discount not found' });
    }
    res.json({ success: true, data: discount });
  } catch (err) {
    console.error('[GET /api/discounts/:id] error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateDiscount = async (req, res) => {
  try {
    const updates = req.body;
    if (updates.startDate && updates.endDate) {
      if (new Date(updates.endDate) < new Date(updates.startDate)) {
        return res.status(400).json({
          success: false,
          message: 'endDate cannot be before startDate',
        });
      }
    }
    const discount = await DiscountRule.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    ).lean();
    if (!discount) {
      return res.status(404).json({ success: false, message: 'Discount not found' });
    }
    res.json({ success: true, data: discount });
  } catch (err) {
    console.error('[PATCH /api/discounts/:id] error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deactivateDiscount = async (req, res) => {
  try {
    const discount = await DiscountRule.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { new: true }
    ).lean();
    if (!discount) {
      return res.status(404).json({ success: false, message: 'Discount not found' });
    }
    res.json({ success: true, data: discount });
  } catch (err) {
    console.error('[POST /api/discounts/:id/deactivate] error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
