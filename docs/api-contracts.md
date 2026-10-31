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

## Planned Endpoints (Member 1 – catalog-pricing)

```
GET    /api/products
POST   /api/products
GET    /api/products/:id
PUT    /api/products/:id
DELETE /api/products/:id

GET    /api/plans
POST   /api/plans
GET    /api/plans/:id
PUT    /api/plans/:id

GET    /api/taxes
POST   /api/taxes

GET    /api/discounts
POST   /api/discounts
GET    /api/discounts/:code/validate
```

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
