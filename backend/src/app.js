import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import appConfig from './config/config.js';
import healthRoutes from './routes/healthRoutes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: appConfig.frontendUrl,
    credentials: true,
  })
);

// ── Request logging (dev only) ────────────────────────────────────────────────
if (appConfig.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/health', healthRoutes);

// Member 1: product & pricing routes
import productRoutes from './routes/productRoutes.js';
import variantRoutes from './routes/variantRoutes.js';
import planRoutes from './routes/planRoutes.js';
import taxRoutes from './routes/taxRoutes.js';
import discountRoutes from './routes/discountRoutes.js';
app.use('/api/products', productRoutes);
app.use('/api/products/:id/variants', variantRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/taxes', taxRoutes);
app.use('/api/discounts', discountRoutes);

// ── Member 2: Auth, Customer, Quotation & Subscription routes ────────────────
import authRoutes from './routes/authRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import quotationRoutes from './routes/quotationRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';

app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// TODO (Member 3): mount billing/payment routes here
// app.use('/api/invoices', invoiceRoutes);
// app.use('/api/payments', paymentRoutes);

// TODO (Member 4): mount dashboard/reports routes here
// app.use('/api/dashboard', dashboardRoutes);
// app.use('/api/reports', reportRoutes);

// ── Error handling (must be last) ─────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
