import Product from '../models/product.js';
import ProductVariant from '../models/productVariant.js';

// Helper to build filter object from query params
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

export const getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const filter = buildFilter(req.query);
    const skip = (page - 1) * limit;

    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    // Add variant count for each product (cheap aggregation)
    const productIds = products.map((p) => p._id);
    const variantCounts = await ProductVariant.aggregate([
      { $match: { product: { $in: productIds } } },
      { $group: { _id: '$product', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(
      variantCounts.map((vc) => [vc._id.toString(), vc.count])
    );
    const enriched = products.map((p) => ({
      ...p,
      variantCount: countMap[p._id.toString()] || 0,
    }));

    res.json({
      success: true,
      data: enriched,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[GET /api/products] error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createProduct = async (req, res) => {
  try {
    const { name, type, salesPrice, costPrice, notes, status } = req.body;
    const product = await Product.create({
      name,
      type,
      salesPrice,
      costPrice,
      notes,
      status,
    });
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    console.error('[POST /api/products] error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).lean();
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    // also fetch variants
    const variants = await ProductVariant.find({ product: id }).lean();
    res.json({ success: true, data: { ...product, variants } });
  } catch (err) {
    console.error('[GET /api/products/:id] error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const product = await Product.findByIdAndUpdate(id, updates, { new: true }).lean();
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (err) {
    console.error('[PATCH /api/products/:id] error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deactivateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    // For now, just set status to inactive. In future, add reference checks.
    const product = await Product.findByIdAndUpdate(
      id,
      { status: 'inactive' },
      { new: true }
    ).lean();
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (err) {
    console.error('[POST /api/products/:id/deactivate] error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
