# Architecture Overview – Subscription Management System

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Browser                            │
│           React + Vite + Tailwind CSS                   │
│           (http://localhost:5173 in dev)                │
└──────────────────────────┬──────────────────────────────┘
                           │  HTTP / REST  (JSON)
                           │  Vite dev proxy → /api/*
┌──────────────────────────▼──────────────────────────────┐
│                    Express API                          │
│           (http://localhost:5000 in dev)                │
│                                                         │
│  ┌─────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Routes  │→ │ Controllers  │→ │     Services      │  │
│  └─────────┘  └──────────────┘  └────────┬──────────┘  │
│                                          │              │
│                                 ┌────────▼──────────┐  │
│                                 │  Mongoose Models  │  │
│                                 └────────┬──────────┘  │
└──────────────────────────────────────────┼─────────────┘
                                           │  Mongoose ODM
┌──────────────────────────────────────────▼─────────────┐
│                      MongoDB                           │
│            (local or Atlas cluster)                    │
└────────────────────────────────────────────────────────┘
```

## Module Boundaries

| Module                   | Backend Namespace      | Frontend Path          | Owner    |
|--------------------------|------------------------|------------------------|----------|
| Products & Pricing       | `/api/products`, `/api/plans`, `/api/taxes`, `/api/discounts` | `/products`, `/discounts-taxes` | Member 1 |
| Auth & Subscriptions     | `/api/auth`, `/api/customers`, `/api/quotations`, `/api/subscriptions` | `/login`, `/customers`, `/quotations`, `/subscriptions` | Member 2 |
| Billing & Payments       | `/api/invoices`, `/api/payments` | `/invoices`, `/payments` | Member 3 |
| Dashboard & Portal       | `/api/dashboard`, `/api/reports` | `/dashboard`, `/reports` | Member 4 |

## Data Flow

1. The browser makes an HTTP request to `/api/<resource>`.
2. In development, Vite's dev server proxies the request to `http://localhost:5000`.
3. Express matches the route and delegates to the appropriate controller.
4. The controller calls a service function that contains business logic.
5. The service interacts with MongoDB through a Mongoose model.
6. The response is returned as JSON.

## Security Considerations (to be implemented)

- JWT-based authentication (Member 2) — stateless, tokens stored in `httpOnly` cookies or memory.
- Role-based access control — admin, billing manager, viewer roles.
- Input validation with a library such as Joi or express-validator (validators/).
- Helmet.js for HTTP security headers.
- Rate limiting on authentication endpoints.
- HTTPS in production.
