# Member 1 Integration Guide: Catalog, Pricing, Taxes & Discounts

> **Branch**: `feature/catalog-pricing`  
> **Responsible Member**: Member 1  
> **Audience**: Member 2 (Subscriptions & Auth), Member 3 (Billing & Invoices), Member 4 (Dashboard & Portal)

---

## 1. Overview & Architecture

Member 1 delivers the authoritative product catalog, product variants, subscription plans, tax rules, and discount rules for Brightloop Software's Subscription Management System.

All features are database-backed via MongoDB / Mongoose, validated server-side with `express-validator`, and expose RESTful APIs consumed by a React administration UI and by downstream modules (Quotations, Subscriptions, and Invoices).

---

## 2. Shared Data Models & Structures

### Products (`Product`)
Located at `backend/src/models/product.js`:
```typescript
interface Product {
  _id: ObjectId;
  name: string;             // Required, trimmed
  type?: string;            // e.g. "Software", "Infrastructure", "Enterprise"
  salesPrice: number;       // Required, >= 0
  costPrice?: number;       // >= 0
  notes?: string;
  status: 'active' | 'inactive'; // Default: 'active'
  createdAt: Date;
  updatedAt: Date;
}
```

### Product Variants (`ProductVariant`)
Located at `backend/src/models/productVariant.js`:
```typescript
interface ProductVariant {
  _id: ObjectId;
  product: ObjectId;        // Ref: Product (Required)
  name: string;             // Required, e.g. "Odoo Edition", "Standard"
  additionalPrice: number;  // Required, >= 0
  status: 'active' | 'inactive'; // Default: 'active'
  createdAt: Date;
  updatedAt: Date;
}
```

#### Variant Price Formula
$$\text{Final Product Price} = \text{Base Sales Price} + \text{Variant Additional Price}$$
- Computed by the backend and returned as `calculatedPrice`.
- Example: Base Price = ₹2,500, Variant Additional = ₹560 $\rightarrow$ Final = ₹3,060.

### Subscription Plans (`SubscriptionPlan`)
Located at `backend/src/models/plan.js`:
```typescript
interface SubscriptionPlan {
  _id: ObjectId;
  name: string;             // Required, trimmed
  description?: string;
  productIds: ObjectId[];   // Ref: Product[]
  billingInterval: 'daily' | 'weekly' | 'monthly' | 'yearly';
  price: number;            // Required, >= 0
  minQuantity: number;      // Default: 1, min: 1
  availableFrom?: Date;
  availableUntil?: Date;
  allowPause: boolean;      // Default: false
  allowRenewal: boolean;    // Default: true
  allowEarlyClose: boolean;  // Default: false
  autoCloseOnExpiry: boolean;// Default: false
  status: 'active' | 'inactive';
}
```

#### Billing Interval Representation
Consistently lowercase enum strings:
- `'daily'`
- `'weekly'`
- `'monthly'`
- `'yearly'`

#### Plan Pricing Formula
$$\text{Plan Subtotal} = \text{Plan Price} \times \text{Quantity}$$
- Available via endpoint `POST /api/plans/:id/calculate` with `{ quantity }`.
- Automatically enforces `quantity >= minQuantity` and checks `status === 'active'`.

### Tax Rules (`TaxRule`)
Located at `backend/src/models/taxRule.js`:
```typescript
interface TaxRule {
  _id: ObjectId;
  name: string;             // e.g. "GST 18%", "Standard VAT 5%"
  type: 'percentage' | 'fixed';
  rate: number;             // 0-100 for percentage, >= 0 for fixed
  applicableProducts: ObjectId[]; // Empty array = applies universally to all products
  effectiveFrom?: Date;
  effectiveTo?: Date;
  status: 'active' | 'inactive';
}
```

### Discount Rules (`DiscountRule`)
Located at `backend/src/models/discountRule.js`:
```typescript
interface DiscountRule {
  _id: ObjectId;
  name: string;             // Promo code or rule name, e.g. "WELCOME20"
  description?: string;
  type: 'percentage' | 'fixed';
  value: number;            // 0-100 for percentage, >= 0 for fixed
  minPurchaseAmount: number;// Default: 0
  minQuantity: number;      // Default: 0
  startDate?: Date;
  endDate?: Date;
  maxUsageCount: number;    // 0 = unlimited
  currentUsageCount: number;// Default: 0
  applicableProducts: ObjectId[]; // Empty array = all products
  scope: 'product' | 'subscription'; // Default: 'product'
  status: 'active' | 'inactive';
}
```

---

## 3. Calculation Services for Member 3 (Billing & Invoices)

### Tax Calculation Service
Import in your invoice / billing service:
```javascript
import { calculateTax } from '../services/taxCalculator.js';

const taxSummary = await calculateTax({
  productId: '66a123...', // Optional: filter by product applicability
  amount: 2500,           // Taxable amount (after discount)
  date: new Date(),       // Optional: defaults to now
});
```

#### Output Structure
```json
{
  "applicable": true,
  "taxes": [
    {
      "taxId": "66a456...",
      "name": "GST 18%",
      "type": "percentage",
      "rate": 18,
      "taxAmount": 450.00
    }
  ],
  "totalTax": 450.00,
  "amountAfterTax": 2950.00
}
```

### Discount Evaluation Service
Import in your billing / quotation service:
```javascript
import { evaluateDiscount, incrementUsage } from '../services/discountCalculator.js';

// 1. Evaluate discount eligibility and amount
const evalResult = await evaluateDiscount({
  discountId: '66a789...',
  productId: '66a123...', // Optional: checked if discount is product-scoped
  amount: 2000,
  quantity: 2,
  date: new Date(),
});

if (evalResult.applicable) {
  console.log('Discount amount:', evalResult.discountAmount);
  console.log('Amount after discount:', evalResult.amountAfterDiscount);

  // 2. Atomically record usage when invoice is confirmed / paid
  await incrementUsage(evalResult.discountId);
} else {
  console.log('Discount rejected because:', evalResult.reason);
}
```

### Standard Calculation Order of Operations
1. **Plan Subtotal**: $\text{Plan Price} \times \text{Quantity}$
2. **Apply Discount**: Evaluate discount against Plan Subtotal $\rightarrow$ yields $\text{Discounted Subtotal}$ (Capped at eligible amount; never negative).
3. **Calculate Taxes**: Taxes calculated on $\text{Discounted Subtotal}$.
4. **Final Invoice Total**: $\text{Discounted Subtotal} + \text{Total Taxes}$.

---

## 4. REST API Reference

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/products` | Query products (`search`, `type`, `status`, `page`, `limit`) | Public / Admin |
| `POST` | `/api/products` | Create new product | Admin |
| `GET` | `/api/products/:id` | Get product by ID (includes variants) | Public / Admin |
| `PATCH` | `/api/products/:id` | Update product details | Admin |
| `POST` | `/api/products/:id/deactivate` | Soft-deactivate product | Admin |
| `GET` | `/api/products/:id/variants` | Get variants with `calculatedPrice` | Public / Admin |
| `POST` | `/api/products/:id/variants` | Create variant for product | Admin |
| `PATCH` | `/api/products/:id/variants/:variantId` | Update variant details / status | Admin |
| `GET` | `/api/plans` | Query subscription plans | Public / Admin |
| `POST` | `/api/plans` | Create subscription plan | Admin |
| `GET` | `/api/plans/:id` | Get plan details with populated products | Public / Admin |
| `PATCH` | `/api/plans/:id` | Update subscription plan | Admin |
| `POST` | `/api/plans/:id/deactivate` | Soft-deactivate plan | Admin |
| `POST` | `/api/plans/:id/calculate` | Compute subtotal for quantity | Public / Member 2 |
| `GET` | `/api/taxes` | Query tax rules | Public / Admin |
| `POST` | `/api/taxes` | Create tax rule | Admin |
| `GET` | `/api/taxes/:id` | Get single tax rule | Public / Admin |
| `PATCH` | `/api/taxes/:id` | Update tax rule | Admin |
| `POST` | `/api/taxes/:id/deactivate` | Soft-deactivate tax rule | Admin |
| `POST` | `/api/taxes/calculate` | Preview tax calculation | Public / Member 3 |
| `GET` | `/api/discounts` | Query discount rules | Public / Admin |
| `POST` | `/api/discounts` | Create discount rule | Admin |
| `GET` | `/api/discounts/:id` | Get single discount rule | Public / Admin |
| `PATCH` | `/api/discounts/:id` | Update discount rule | Admin |
| `POST` | `/api/discounts/:id/deactivate` | Soft-deactivate discount rule | Admin |
| `POST` | `/api/discounts/evaluate` | Evaluate discount applicability | Public / Member 3 |
| `POST` | `/api/discounts/:id/apply` | Atomic increment of usage counter | Member 3 |

---

## 5. Running and Testing

### Run Tests
```bash
# From workspace root
npm test

# Or directly in backend
cd backend && npm test
```

### Seed Development Data
```bash
# Ensure MongoDB is running and MONGODB_URI is set in backend/.env
cd backend && npm run seed
```

### Start Servers
```bash
npm run dev           # Starts both frontend (5173) and backend (5000)
```

