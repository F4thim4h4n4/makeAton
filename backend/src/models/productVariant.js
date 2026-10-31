import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const VariantSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true, trim: true },
    additionalPrice: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

VariantSchema.index({ product: 1, name: 1 }, { unique: true });

export default model('ProductVariant', VariantSchema);
