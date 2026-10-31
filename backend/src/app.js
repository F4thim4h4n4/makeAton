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

// TODO (Member 1): mount product/pricing routes here
// app.use('/api/products', productRoutes);
// app.use('/api/plans', planRoutes);
// app.use('/api/taxes', taxRoutes);
// app.use('/api/discounts', discountRoutes);

// TODO (Member 2): mount auth/subscription routes here
// app.use('/api/auth', authRoutes);
// app.use('/api/customers', customerRoutes);
// app.use('/api/quotations', quotationRoutes);
// app.use('/api/subscriptions', subscriptionRoutes);

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
