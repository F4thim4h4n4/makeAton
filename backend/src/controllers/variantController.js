import ProductVariant from '../models/productVariant.js';
import Product from '../models/product.js';

export const getVariants = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).lean();
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const variants = await ProductVariant.find({ product: id }).sort({ createdAt: -1 }).lean();

    // Enrich with calculated price
    const enriched = variants.map((v) => ({
      ...v,
      calculatedPrice: +(product.salesPrice + v.additionalPrice).toFixed(2),
    }));

    res.json({ success: true, data: enriched, basePrice: product.salesPrice });
  } catch (err) {
    console.error('[GET /api/products/:id/variants] error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createVariant = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).lean();
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const { name, additionalPrice, status } = req.body;
    const variant = await ProductVariant.create({
      product: id,
      name,
      additionalPrice,
      status,
    });

    const result = variant.toObject();
    result.calculatedPrice = +(product.salesPrice + variant.additionalPrice).toFixed(2);

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A variant with that name already exists for this product',
      });
    }
    console.error('[POST /api/products/:id/variants] error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateVariant = async (req, res) => {
  try {
    const { id, variantId } = req.params;
    const product = await Product.findById(id).lean();
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const updates = req.body;
    const variant = await ProductVariant.findOneAndUpdate(
      { _id: variantId, product: id },
      updates,
      { new: true }
    ).lean();

    if (!variant) {
      return res.status(404).json({ success: false, message: 'Variant not found' });
    }

    variant.calculatedPrice = +(product.salesPrice + variant.additionalPrice).toFixed(2);
    res.json({ success: true, data: variant });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A variant with that name already exists for this product',
      });
    }
    console.error('[PATCH /api/products/:id/variants/:variantId] error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
