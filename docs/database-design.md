# Database Design – Subscription Management System

> This document is a **design guide** for team members implementing their Mongoose models.
> Create models in `backend/src/models/` following the conventions below.

---

## Conventions

- **Collection names**: Mongoose pluralises model names automatically (e.g. `Product` → `products`).
- **Timestamps**: Always enable `{ timestamps: true }` on every schema.
- **References**: Use `mongoose.Schema.Types.ObjectId` with a `ref` pointing to the model name.
- **Indexes**: Define indexes on fields used frequently in queries (e.g. `email`, `status`).
- **Enums**: Use string enums to enforce valid values.

---

## Planned Collections (Member 1 – catalog-pricing)

### `products`
| Field        | Type     | Notes                               |
|--------------|----------|-------------------------------------|
| name         | String   | Required, unique                    |
| description  | String   |                                     |
| isActive     | Boolean  | Default: true                       |
| variants     | [ObjectId] | Ref: ProductVariant               |

### `product_variants`
| Field        | Type     | Notes                               |
|--------------|----------|-------------------------------------|
| product      | ObjectId | Ref: Product                        |
| name         | String   | e.g. "Monthly", "Annual"            |
| billingCycle | String   | Enum: monthly, quarterly, annual    |

### `plans`
| Field        | Type     | Notes                               |
|--------------|----------|-------------------------------------|
| name         | String   | Required                            |
| variant      | ObjectId | Ref: ProductVariant                 |
| price        | Number   | Base price before tax/discount      |
| currency     | String   | Default: "USD"                      |
| isActive     | Boolean  |                                     |

### `taxes`
| Field        | Type     | Notes                               |
|--------------|----------|-------------------------------------|
| name         | String   | e.g. "VAT 20%"                      |
| rate         | Number   | 0–100 percentage                    |
| region       | String   |                                     |

### `discounts`
| Field        | Type     | Notes                               |
|--------------|----------|-------------------------------------|
| code         | String   | Unique promo code                   |
| type         | String   | Enum: percentage, flat              |
| value        | Number   |                                     |
| maxUses      | Number   |                                     |
| usedCount    | Number   | Default: 0                          |
| validFrom    | Date     |                                     |
| validUntil   | Date     |                                     |

---

## Planned Collections (Member 2 – subscriptions-auth)

### `users`
| Field        | Type     | Notes                               |
|--------------|----------|-------------------------------------|
| email        | String   | Required, unique, indexed           |
| passwordHash | String   | Never store plain text              |
| role         | String   | Enum: admin, billing_manager, viewer|
| isActive     | Boolean  |                                     |

### `customers`
| Field        | Type     | Notes                               |
|--------------|----------|-------------------------------------|
| user         | ObjectId | Ref: User (optional – for portal)   |
| name         | String   | Required                            |
| email        | String   | Required, indexed                   |
| phone        | String   |                                     |
| address      | Object   | { street, city, country, postcode } |

### `quotations`
| Field        | Type     | Notes                               |
|--------------|----------|-------------------------------------|
| customer     | ObjectId | Ref: Customer                       |
| plans        | [ObjectId] | Ref: Plan                         |
| discount     | ObjectId | Ref: Discount (optional)            |
| status       | String   | Enum: draft, sent, accepted, expired|
| expiresAt    | Date     |                                     |

### `subscriptions`
| Field        | Type     | Notes                               |
|--------------|----------|-------------------------------------|
| customer     | ObjectId | Ref: Customer                       |
| plan         | ObjectId | Ref: Plan                           |
| status       | String   | Enum: active, paused, cancelled     |
| startDate    | Date     |                                     |
| nextBillingDate | Date  |                                     |
| cancelledAt  | Date     |                                     |

---

## Planned Collections (Member 3 – billing-payments)

### `invoices`
| Field        | Type     | Notes                                       |
|--------------|----------|---------------------------------------------|
| subscription | ObjectId | Ref: Subscription                           |
| customer     | ObjectId | Ref: Customer                               |
| invoiceNumber | String  | Unique, auto-generated                      |
| billingPeriod | Object  | { from: Date, to: Date }                    |
| lineItems    | [Object] | [{ description, quantity, unitPrice, tax }] |
| subtotal     | Number   |                                             |
| taxAmount    | Number   |                                             |
| total        | Number   |                                             |
| status       | String   | Enum: pending, paid, overdue, void          |
| dueDate      | Date     |                                             |

> **Duplicate prevention**: Add a compound unique index on `{ subscription, billingPeriod.from }`.

### `payments`
| Field        | Type     | Notes                               |
|--------------|----------|-------------------------------------|
| invoice      | ObjectId | Ref: Invoice                        |
| amount       | Number   | Supports partial payments           |
| method       | String   | Enum: card, bank_transfer, manual   |
| status       | String   | Enum: succeeded, failed, refunded   |
| paidAt       | Date     |                                     |
| reference    | String   | External transaction ID             |

---

## Notes for All Members

- Run migrations or seed scripts only in the `develop` branch, never in `main`.
- Do not expose `passwordHash` or internal IDs in API responses.
- Add Mongoose virtuals and instance methods in the model file, not in controllers.
- Use Mongoose middleware (pre/post hooks) for tasks like password hashing.
