# Subscription Management System

> MakeAton Hackathon · Team Project

A full-stack web application for managing product subscriptions: plans, pricing, billing, invoices, and a customer self-service portal.

---

## Technology Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Frontend   | React 18, Vite 5, Tailwind CSS 3        |
| Routing    | React Router 6                          |
| HTTP       | Axios                                   |
| Backend    | Node.js ≥ 18, Express 4                 |
| Database   | MongoDB, Mongoose 8                     |
| Dev tools  | ESLint, concurrently, node --watch      |

---

## Prerequisites

- **Node.js** ≥ 18 and **npm** ≥ 9  
  Install from <https://nodejs.org/en/download/>
- **MongoDB** – either a local instance or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster
- **Git** ≥ 2.40

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/<your-org>/subscription-management-system.git
cd subscription-management-system

# 2. Install all dependencies (root + frontend + backend)
npm run install:all
```

---

## Environment Configuration

### Backend

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and fill in your values:

| Variable       | Description                                      | Example                                              |
|----------------|--------------------------------------------------|------------------------------------------------------|
| `PORT`         | Port the backend server listens on               | `5000`                                               |
| `NODE_ENV`     | Runtime environment                              | `development`                                        |
| `MONGODB_URI`  | Full MongoDB connection string                   | `mongodb://localhost:27017/subscription_db`          |
| `FRONTEND_URL` | Frontend origin for CORS                         | `http://localhost:5173`                              |

> **Security**: Never commit `backend/.env` to Git. It is already listed in `.gitignore`.

### Frontend

No `.env` file is required for local development. The Vite dev server automatically proxies `/api/*` requests to `http://localhost:5000`.

If you need to point the frontend at a remote backend, create `frontend/.env.local`:

```env
VITE_API_BASE_URL=https://your-api-domain.com/api
```

---

## Running the Application

### Start both frontend and backend together

```bash
npm run dev
```

This uses `concurrently` to run both servers in a single terminal.

### Start individually

```bash
npm run dev:frontend   # http://localhost:5173
npm run dev:backend    # http://localhost:5000
```

### Lint all code

```bash
npm run lint
```

---

## Verifying the Setup

Once the backend is running, confirm the health-check endpoint:

```bash
curl http://localhost:5000/api/health
# or open in your browser: http://localhost:5000/api/health
```

Expected response:

```json
{
  "success": true,
  "message": "Subscription Management System API is running",
  "environment": "development",
  "uptime": "5s",
  "timestamp": "2026-10-31T00:00:00.000Z"
}
```

---

## Implementation Status

| Module                     | Status        | Branch                       | Owner    |
|----------------------------|---------------|------------------------------|----------|
| Project scaffold           | ✅ Complete   | `develop`                    | All      |
| Products & Plans           | 🚧 Placeholder | `feature/catalog-pricing`    | Member 1 |
| Discounts & Taxes          | 🚧 Placeholder | `feature/catalog-pricing`    | Member 1 |
| Authentication & Roles     | 🚧 Placeholder | `feature/subscriptions-auth` | Member 2 |
| Customers & Quotations     | 🚧 Placeholder | `feature/subscriptions-auth` | Member 2 |
| Subscriptions Lifecycle    | 🚧 Placeholder | `feature/subscriptions-auth` | Member 2 |
| Invoices & Billing         | 🚧 Placeholder | `feature/billing-payments`   | Member 3 |
| Payments                   | 🚧 Placeholder | `feature/billing-payments`   | Member 3 |
| Dashboard & Reports        | 🚧 Placeholder | `feature/dashboard-portal`   | Member 4 |
| Customer Self-Service Portal | 🚧 Placeholder | `feature/dashboard-portal` | Member 4 |

---

## GitHub Collaboration Workflow

See [`docs/team-workflow.md`](docs/team-workflow.md) for the full branching strategy.

Quick summary:

1. Each member works on their assigned `feature/*` branch.
2. Commit and push changes regularly.
3. Open a **Pull Request** into `develop` when a feature is ready.
4. The team reviews and merges into `develop`.
5. After integration testing, `develop` is merged into `main`.

---

## Project Structure

```
subscription-management-system/
├── frontend/          # React + Vite application
├── backend/           # Express + Node.js API
├── docs/              # Architecture and workflow documentation
├── .gitignore
├── .editorconfig
└── package.json       # Root scripts (dev, lint, install:all)
```

---

## License

MIT – see [LICENSE](LICENSE) (add when ready).
