import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const TaxRuleSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true,
    },
    rate: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function (v) {
          // Percentage must be 0–100
          if (this.type === 'percentage') return v >= 0 && v <= 100;
          return v >= 0;
        },
        message: (props) =>
          `Rate ${props.value} is not valid for the selected tax type`,
      },
    },
    applicableProducts: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    effectiveFrom: { type: Date },
    effectiveTo: { type: Date },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

TaxRuleSchema.index({ status: 1, effectiveFrom: 1, effectiveTo: 1 });

export default model('TaxRule', TaxRuleSchema);
