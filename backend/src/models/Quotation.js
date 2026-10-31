import mongoose from 'mongoose';

const quotationItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    variant: {
      type: String,
      default: '',
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'Unit price cannot be negative'],
      default: 0,
    },
    taxRate: {
      type: Number,
      min: [0, 'Tax rate cannot be negative'],
      default: 0,
    },
    discountAmount: {
      type: Number,
      min: [0, 'Discount amount cannot be negative'],
      default: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { _id: false }
);

const quotationSchema = new mongoose.Schema(
  {
    quotationNumber: {
      type: String,
      required: [true, 'Quotation number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer is required'],
      index: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      default: null,
    },
    planName: {
      type: String,
      default: '',
      trim: true,
    },
    billingInterval: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
      default: 'monthly',
    },
    items: {
      type: [quotationItemSchema],
      default: [],
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    discountAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    discountCode: {
      type: String,
      trim: true,
      default: '',
    },
    taxRate: {
      type: Number,
      min: 0,
      default: 0,
    },
    taxAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    validityDays: {
      type: Number,
      default: 30,
      min: 1,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'sent', 'confirmed', 'converted', 'expired', 'cancelled'],
        message: 'Invalid quotation status',
      },
      default: 'draft',
      index: true,
    },
    isTemplate: {
      type: Boolean,
      default: false,
      index: true,
    },
    templateName: {
      type: String,
      default: '',
      trim: true,
    },
    convertedSubscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      default: null,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save to compute expiresAt if not explicitly set
quotationSchema.pre('save', function (next) {
  if (!this.expiresAt && this.validityDays) {
    const exp = new Date(this.createdAt || Date.now());
    exp.setDate(exp.getDate() + this.validityDays);
    this.expiresAt = exp;
  }
  next();
});

const Quotation = mongoose.model('Quotation', quotationSchema);
export default Quotation;
