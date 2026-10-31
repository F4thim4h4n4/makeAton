# API Contracts – Subscription Management System

> This document is the **shared contract** between frontend and backend team members.
> Update this file as each feature branch implements its endpoints.

---

## General Conventions

- Base URL (development): `http://localhost:5000/api`
- All requests and responses use `Content-Type: application/json`
- Successful responses wrap data in a `data` field:

```json
{
  "success": true,
  "data": { ... }
}
```

- Error responses follow this shape:

```json
{
  "success": false,
  "message": "Human-readable error description"
}
```

- HTTP status codes:

| Code | Meaning               |
|------|-----------------------|
| 200  | OK                    |
| 201  | Created               |
| 400  | Bad Request           |
| 401  | Unauthorized          |
| 403  | Forbidden             |
| 404  | Not Found             |
| 409  | Conflict              |
| 500  | Internal Server Error |

---

## Implemented Endpoints

### Health Check

```
GET /api/health
```

Response `200`:
```json
{
  "success": true,
  "message": "Subscription Management System API is running",
  "environment": "development",
  "uptime": "42s",
  "timestamp": "2026-10-31T00:00:00.000Z"
}
```

---

### Member 1: Catalog, Plans, Taxes & Discounts (feature/catalog-pricing)

#### Products & Variants
- `GET /api/products?search=&type=&status=&page=&limit=` — List products with search, filters, pagination, and variant counts.
- `POST /api/products` — Create product (`name`, `type`, `salesPrice`, `costPrice`, `notes`, `status`).
- `GET /api/products/:id` — Retrieve single product details including its variants.
- `PATCH /api/products/:id` — Update product.
- `POST /api/products/:id/deactivate` — Safely deactivate product without breaking historical links.
- `GET /api/products/:id/variants` — Get variants with calculated prices (`salesPrice + additionalPrice`).
- `POST /api/products/:id/variants` — Create product variant (`name`, `additionalPrice`, `status`).
- `PATCH /api/products/:id/variants/:variantId` — Update product variant.

#### Subscription Plans
- `GET /api/plans?search=&billingInterval=&status=&page=&limit=` — List plans.
- `POST /api/plans` — Create plan (`name`, `description`, `productIds`, `billingInterval`, `price`, `minQuantity`, `availableFrom`, `availableUntil`, `allowEarlyClose`, `allowPause`, `allowRenewal`, `autoCloseOnExpiry`, `status`).
- `GET /api/plans/:id` — Get plan details with populated product associations.
- `PATCH /api/plans/:id` — Update plan.
- `POST /api/plans/:id/deactivate` — Deactivate plan.
- `POST /api/plans/:id/calculate` — Authoritative price calculation for quantity: `{ planPrice, quantity, subtotal: price * quantity }`.

#### Tax Rules
- `GET /api/taxes?search=&type=&status=&page=&limit=` — List tax rules.
- `POST /api/taxes` — Create tax rule (`name`, `type`, `rate`, `applicableProducts`, `effectiveFrom`, `effectiveTo`, `status`).
- `GET /api/taxes/:id` — Get single tax rule.
- `PATCH /api/taxes/:id` — Update tax rule.
- `POST /api/taxes/:id/deactivate` — Deactivate tax rule.
- `POST /api/taxes/calculate` — Calculate taxes for transaction: body `{ amount, productId?, date? }` → returns breakdown `{ applicable, taxes: [...], totalTax, amountAfterTax }`.

#### Discount Rules
- `GET /api/discounts?search=&type=&scope=&status=&page=&limit=` — List discounts.
- `POST /api/discounts` — Create discount rule (`name`, `description`, `type`, `value`, `minPurchaseAmount`, `minQuantity`, `startDate`, `endDate`, `maxUsageCount`, `applicableProducts`, `scope`, `status`).
- `GET /api/discounts/:id` — Get discount rule.
- `PATCH /api/discounts/:id` — Update discount rule.
- `POST /api/discounts/:id/deactivate` — Deactivate discount rule.
- `POST /api/discounts/evaluate` — Evaluate discount applicability: body `{ discountId, amount, productId?, quantity?, date? }` → returns `{ applicable, discountAmount, amountAfterDiscount, reason? }`.
- `POST /api/discounts/:id/apply` — Atomically increment usage count when invoice is paid/processed.

---

## Planned Endpoints (Member 2 – subscriptions-auth)

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/customers
POST   /api/customers
GET    /api/customers/:id
PUT    /api/customers/:id

GET    /api/quotations
POST   /api/quotations
GET    /api/quotations/:id
PATCH  /api/quotations/:id/send
PATCH  /api/quotations/:id/accept

GET    /api/subscriptions
POST   /api/subscriptions
GET    /api/subscriptions/:id
PATCH  /api/subscriptions/:id/pause
PATCH  /api/subscriptions/:id/resume
PATCH  /api/subscriptions/:id/cancel
```

---

## Planned Endpoints (Member 3 – billing-payments)

```
GET    /api/invoices
POST   /api/invoices/generate         # triggered by subscription renewal
GET    /api/invoices/:id
PATCH  /api/invoices/:id/void

GET    /api/payments
POST   /api/payments
GET    /api/payments/:id
```

---

## Planned Endpoints (Member 4 – dashboard-portal)

```
GET    /api/dashboard/summary         # MRR, active subs, churn
GET    /api/reports/revenue           # Revenue by period
GET    /api/reports/subscriptions     # Subscription growth

# Customer self-service portal
GET    /api/portal/me                 # Current customer profile
GET    /api/portal/subscriptions      # Customer's own subscriptions
GET    /api/portal/invoices           # Customer's own invoices
```

---

## Updating This Document

When you implement an endpoint:
1. Move it from "Planned" to "Implemented".
2. Add request body and response examples.
3. Note any authentication requirements.
4. Commit the update with your feature PR.
