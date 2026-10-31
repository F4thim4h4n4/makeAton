/**
 * dashboardController.js  (Member 4 – feature/dashboard-portal)
 *
 * Provides three aggregation-backed endpoints:
 *   GET /api/dashboard/summary  – KPI totals
 *   GET /api/dashboard/charts   – revenue data points
 *   GET /api/dashboard/recent   – recent activity lists
 *
 * All handlers return safe defaults (zeros / empty arrays) when the
 * collections populated by Members 2 & 3 are not yet available.
 */

import mongoose from 'mongoose';

// ── Lazy model helpers ───────────────────────────────────────────────────────
// We resolve models lazily so this controller loads safely even before the
// other members' models are registered in the same process.

const getModel = (name) => {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the start-of-day Date for a given number of days ago.
 */
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Safe aggregate – returns [] if the model is missing or aggregate fails.
 */
const safeAggregate = async (modelName, pipeline) => {
  const Model = getModel(modelName);
  if (!Model) return [];
  try {
    return await Model.aggregate(pipeline);
  } catch {
    return [];
  }
};

// ── GET /api/dashboard/summary ───────────────────────────────────────────────

export const getSummary = async (_req, res) => {
  try {
    // Active subscriptions
    const [activeSubs] = await safeAggregate('Subscription', [
      { $match: { status: 'active' } },
      { $count: 'total' },
    ]);

    // Total revenue (sum of payments with status 'completed' or 'paid')
    const [revenue] = await safeAggregate('Payment', [
      { $match: { status: { $in: ['completed', 'paid'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    // Outstanding receivables (invoices not fully paid)
    const [outstanding] = await safeAggregate('Invoice', [
      { $match: { status: { $in: ['confirmed', 'sent', 'draft'] } } },
      { $group: { _id: null, total: { $sum: '$outstandingAmount' } } },
    ]);

    // Overdue invoices count (dueDate < now and not paid)
    const [overdue] = await safeAggregate('Invoice', [
      {
        $match: {
          status: { $nin: ['paid', 'cancelled'] },
          dueDate: { $lt: new Date() },
        },
      },
      { $count: 'total' },
    ]);

    res.json({
      activeSubscriptions: activeSubs?.total ?? 0,
      totalRevenue: revenue?.total ?? 0,
      outstandingReceivables: outstanding?.total ?? 0,
      overdueInvoices: overdue?.total ?? 0,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load dashboard summary', error: err.message });
  }
};

// ── GET /api/dashboard/charts?period=30d|90d|12m ────────────────────────────

export const getCharts = async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    let startDate;
    let groupFormat;

    if (period === '12m') {
      startDate = daysAgo(365);
      groupFormat = '%Y-%m'; // group by month
    } else if (period === '90d') {
      startDate = daysAgo(90);
      groupFormat = '%Y-%m-%d';
    } else {
      // default 30d
      startDate = daysAgo(30);
      groupFormat = '%Y-%m-%d';
    }

    const revenueData = await safeAggregate('Payment', [
      {
        $match: {
          status: { $in: ['completed', 'paid'] },
          paymentDate: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: '$paymentDate' } },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', revenue: 1, count: 1 } },
    ]);

    const invoicedData = await safeAggregate('Invoice', [
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: '$createdAt' } },
          invoiced: { $sum: '$totalAmount' },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', invoiced: 1 } },
    ]);

    res.json({ period, revenueData, invoicedData });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load chart data', error: err.message });
  }
};

// ── GET /api/dashboard/recent ────────────────────────────────────────────────

export const getRecent = async (_req, res) => {
  try {
    const SubModel = getModel('Subscription');
    const PayModel = getModel('Payment');

    // Recent subscriptions
    let recentSubscriptions = [];
    if (SubModel) {
      recentSubscriptions = await SubModel
        .find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('customer', 'name email')
        .populate('plan', 'name billingInterval')
        .select('subscriptionNumber status startDate expiryDate createdAt')
        .lean()
        .catch(() => []);
    }

    // Recent payments
    let recentPayments = [];
    if (PayModel) {
      recentPayments = await PayModel
        .find({})
        .sort({ paymentDate: -1 })
        .limit(10)
        .populate('invoice', 'invoiceNumber')
        .populate('customer', 'name email')
        .select('amount paymentMethod paymentDate status notes')
        .lean()
        .catch(() => []);
    }

    // Upcoming renewals (subscriptions expiring in next 30 days)
    let upcomingRenewals = [];
    if (SubModel) {
      const in30 = new Date();
      in30.setDate(in30.getDate() + 30);
      upcomingRenewals = await SubModel
        .find({ status: 'active', expiryDate: { $gte: new Date(), $lte: in30 } })
        .sort({ expiryDate: 1 })
        .limit(10)
        .populate('customer', 'name email')
        .populate('plan', 'name')
        .select('subscriptionNumber expiryDate')
        .lean()
        .catch(() => []);
    }

    res.json({ recentSubscriptions, recentPayments, upcomingRenewals });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load recent activity', error: err.message });
  }
};
