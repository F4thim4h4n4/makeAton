const express = require('express');
const cors = require('cors');
const path = require('node:path');
const { initDatabase } = require('./database/db');
const { runRecurringBilling } = require('./services/billingService');

// Route modules
const authRoutes = require('./routes/authRoutes');
const catalogRoutes = require('./routes/catalogRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const billingRoutes = require('./routes/billingRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
initDatabase();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api', subscriptionRoutes); // /api/customers, /api/subscriptions, /api/quotations
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Brightloop Subscription & Billing Management System',
    member3_features: 'Recurring Billing, Invoices & Payments Active'
  });
});

// Single Page Application fallback
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    status: err.status || 500
  });
});

// Start Server
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Brightloop Subscription Management System is online!`);
    console.log(`📍 Web UI & APIs: http://localhost:${PORT}`);
    console.log(`👤 Role credentials for demo:`);
    console.log(`   Admin:    admin@brightloop.com / BrightLoop#2026`);
    console.log(`   Staff:    staff@brightloop.com / BrightLoop#2026`);
    console.log(`   Customer: alex@acme.com        / BrightLoop#2026`);
    console.log(`=======================================================`);

    // --- SERVER-SIDE SCHEDULED BACKGROUND RECURRING BILLING JOB ---
    // Runs automatically on server startup and periodically
    // Ensures billing executes completely independent of open browser sessions!
    const SCHEDULE_INTERVAL_MS = process.env.BILLING_INTERVAL_MS || 6 * 60 * 60 * 1000;
    
    function triggerScheduledBilling() {
      try {
        const today = new Date().toISOString().slice(0, 10);
        console.log(`⏰ [Scheduler] Executing automated recurring billing check for ${today}...`);
        const outcome = runRecurringBilling(today, 'scheduled');
        console.log(`✅ [Scheduler] Finished: Checked ${outcome.subscriptionsChecked} subs, Generated ${outcome.invoicesGenerated} invoices ($${outcome.totalBilledAmount}), Skipped ${outcome.skipped}.`);
      } catch (schedErr) {
        console.error(`❌ [Scheduler] Error in recurring billing background job:`, schedErr);
      }
    }

    // Run on start
    triggerScheduledBilling();

    // Schedule periodic timer
    const billingTimer = setInterval(triggerScheduledBilling, SCHEDULE_INTERVAL_MS);

    if (billingTimer.unref) {
      billingTimer.unref();
    }
  });
}

module.exports = { app, server };
