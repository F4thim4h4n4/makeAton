import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const ProductSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, trim: true },
    salesPrice: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, min: 0 },
    notes: { type: String },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

// Indexes for common queries
ProductSchema.index({ name: 1 });

export default model('Product', ProductSchema);
