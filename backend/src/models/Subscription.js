import mongoose from 'mongoose';

const subscriptionItemSchema = new mongoose.Schema(
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
      min: 0,
      default: 0,
    },
    discountAmount: {
      type: Number,
      min: 0,
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

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reason: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const subscriptionSchema = new mongoose.Schema(
  {
    subscriptionNumber: {
      type: String,
      required: [true, 'Subscription number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer reference is required'],
      index: true,
    },
    quotation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quotation',
      default: null,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      default: null,
    },
    planName: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
    },
    billingInterval: {
      type: String,
      enum: {
        values: ['daily', 'weekly', 'monthly', 'yearly'],
        message: 'Interval must be daily, weekly, monthly, or yearly',
      },
      required: true,
      default: 'monthly',
      index: true,
    },
    items: {
      type: [subscriptionItemSchema],
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
    paymentTerms: {
      type: String,
      default: 'Due on receipt',
      trim: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiryDate: {
      type: Date,
      index: true,
    },
    nextBillingDate: {
      type: Date,
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'quotation', 'confirmed', 'active', 'paused', 'closed', 'expired'],
        message: 'Invalid subscription status',
      },
      default: 'confirmed',
      index: true,
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
    pausedAt: {
      type: Date,
      default: null,
    },
    resumedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    autoRenew: {
      type: Boolean,
      default: true,
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

// Method to calculate next billing date based on interval
subscriptionSchema.methods.calculateNextBillingDate = function (fromDate = new Date()) {
  const next = new Date(fromDate);
  switch (this.billingInterval) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      next.setMonth(next.getMonth() + 1);
  }
  return next;
};

// Valid transitions rule engine
subscriptionSchema.statics.canTransition = function (currentStatus, newStatus) {
  const allowedTransitions = {
    draft: ['quotation', 'confirmed', 'closed'],
    quotation: ['confirmed', 'closed'],
    confirmed: ['active', 'closed'],
    active: ['paused', 'closed', 'expired'],
    paused: ['active', 'closed'],
    expired: ['active', 'closed', 'confirmed'],
    closed: [], // Terminal status
  };

  return allowedTransitions[currentStatus]?.includes(newStatus) ?? false;
};

const Subscription = mongoose.model('Subscription', subscriptionSchema);
export default Subscription;
