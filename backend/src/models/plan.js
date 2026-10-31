import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const PlanSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    productIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    billingInterval: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
      required: true,
    },
    price: { type: Number, required: true, min: 0 },
    minQuantity: { type: Number, default: 1, min: 1 },
    availableFrom: { type: Date },
    availableUntil: { type: Date },
    allowEarlyClose: { type: Boolean, default: false },
    allowPause: { type: Boolean, default: false },
    allowRenewal: { type: Boolean, default: true },
    autoCloseOnExpiry: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

PlanSchema.index({ name: 1 });

export default model('SubscriptionPlan', PlanSchema);
