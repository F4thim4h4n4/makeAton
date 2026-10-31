import TaxRule from '../models/taxRule.js';
import { calculateTax } from '../services/taxCalculator.js';

const buildFilter = (query) => {
  const filter = {};
  if (query.search) {
    filter.name = { $regex: query.search, $options: 'i' };
  }
  if (query.type) {
    filter.type = query.type;
  }
  if (query.status) {
    filter.status = query.status;
  }
  return filter;
};

export const getTaxes = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const filter = buildFilter(req.query);
    const skip = (page - 1) * limit;

    const [total, taxes] = await Promise.all([
      TaxRule.countDocuments(filter),
      TaxRule.find(filter)
        .populate('applicableProducts', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.json({
      success: true,
      data: taxes,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[GET /api/taxes] error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createTax = async (req, res) => {
  try {
    const { name, type, rate, applicableProducts, effectiveFrom, effectiveTo, status } = req.body;

    if (effectiveFrom && effectiveTo && new Date(effectiveTo) < new Date(effectiveFrom)) {
      return res.status(400).json({
        success: false,
        message: 'effectiveTo cannot be before effectiveFrom',
      });
    }

    const tax = await TaxRule.create({
      name,
      type,
      rate,
      applicableProducts,
      effectiveFrom,
      effectiveTo,
      status,
    });
    res.status(201).json({ success: true, data: tax });
  } catch (err) {
    console.error('[POST /api/taxes] error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getTaxById = async (req, res) => {
  try {
    const tax = await TaxRule.findById(req.params.id)
      .populate('applicableProducts', 'name')
      .lean();
    if (!tax) {
      return res.status(404).json({ success: false, message: 'Tax rule not found' });
    }
    res.json({ success: true, data: tax });
  } catch (err) {
    console.error('[GET /api/taxes/:id] error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateTax = async (req, res) => {
  try {
    const updates = req.body;
    if (updates.effectiveFrom && updates.effectiveTo) {
      if (new Date(updates.effectiveTo) < new Date(updates.effectiveFrom)) {
        return res.status(400).json({
          success: false,
          message: 'effectiveTo cannot be before effectiveFrom',
        });
      }
    }
    const tax = await TaxRule.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    }).lean();
    if (!tax) {
      return res.status(404).json({ success: false, message: 'Tax rule not found' });
    }
    res.json({ success: true, data: tax });
  } catch (err) {
    console.error('[PATCH /api/taxes/:id] error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deactivateTax = async (req, res) => {
  try {
    const tax = await TaxRule.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { new: true }
    ).lean();
    if (!tax) {
      return res.status(404).json({ success: false, message: 'Tax rule not found' });
    }
    res.json({ success: true, data: tax });
  } catch (err) {
    console.error('[POST /api/taxes/:id/deactivate] error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const calculateTaxPreview = async (req, res) => {
  try {
    const { productId, amount, date } = req.body;
    const result = await calculateTax({
      productId,
      amount: Number(amount) || 0,
      date: date ? new Date(date) : new Date(),
    });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[POST /api/taxes/calculate] error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
