import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const DiscountRuleSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    type: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function (v) {
          if (this.type === 'percentage') return v >= 0 && v <= 100;
          return v >= 0;
        },
        message: (props) =>
          `Value ${props.value} is not valid for the selected discount type`,
      },
    },
    minPurchaseAmount: { type: Number, default: 0, min: 0 },
    minQuantity: { type: Number, default: 0, min: 0 },
    startDate: { type: Date },
    endDate: { type: Date },
    maxUsageCount: { type: Number, default: 0, min: 0 }, // 0 = unlimited
    currentUsageCount: { type: Number, default: 0, min: 0 },
    applicableProducts: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    scope: {
      type: String,
      enum: ['product', 'subscription'],
      default: 'product',
    },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

DiscountRuleSchema.index({ status: 1, startDate: 1, endDate: 1 });

export default model('DiscountRule', DiscountRuleSchema);
