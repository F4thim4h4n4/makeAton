/**
 * reportController.js  (Member 4 – feature/dashboard-portal)
 *
 * Provides filterable report endpoints:
 *   GET /api/reports/revenue       – revenue vs invoiced with filters
 *   GET /api/reports/overdue       – aging table of unpaid invoices
 *   GET /api/reports/subscriptions – counts by status / plan
 *   GET /api/reports/export        – CSV download of revenue report
 */

import mongoose from 'mongoose';

const getModel = (name) => {
  try { return mongoose.model(name); } catch { return null; }
};

const safeAggregate = async (modelName, pipeline) => {
  const Model = getModel(modelName);
  if (!Model) return [];
  try { return await Model.aggregate(pipeline); } catch { return []; }
};

// ── Build shared invoice match from query params ──────────────────────────────

const buildInvoiceMatch = (query) => {
  const match = {};
  if (query.from || query.to) {
    match.createdAt = {};
    if (query.from) match.createdAt.$gte = new Date(query.from);
    if (query.to)   match.createdAt.$lte = new Date(query.to);
  }
  if (query.customerId) match.customer = new mongoose.Types.ObjectId(query.customerId);
  if (query.status)     match.status = query.status;
  return match;
};

// ── GET /api/reports/revenue ─────────────────────────────────────────────────

export const getRevenueReport = async (req, res) => {
  try {
    const match = buildInvoiceMatch(req.query);

    const rows = await safeAggregate('Invoice', [
      { $match: match },
      {
        $lookup: {
          from: 'customers',
          localField: 'customer',
          foreignField: '_id',
          as: 'customerInfo',
        },
      },
      { $unwind: { path: '$customerInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          invoiceNumber: 1,
          status: 1,
          totalAmount: 1,
          amountPaid: 1,
          outstandingAmount: 1,
          dueDate: 1,
          createdAt: 1,
          billingPeriodStart: 1,
          billingPeriodEnd: 1,
          customerName: '$customerInfo.name',
          customerEmail: '$customerInfo.email',
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    // Totals
    const totalInvoiced = rows.reduce((s, r) => s + (r.totalAmount ?? 0), 0);
    const totalReceived = rows.reduce((s, r) => s + (r.amountPaid ?? 0), 0);
    const totalOutstanding = rows.reduce((s, r) => s + (r.outstandingAmount ?? 0), 0);

    res.json({ rows, totals: { totalInvoiced, totalReceived, totalOutstanding } });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load revenue report', error: err.message });
  }
};

// ── GET /api/reports/overdue ─────────────────────────────────────────────────

export const getOverdueReport = async (_req, res) => {
  try {
    const now = new Date();

    const rows = await safeAggregate('Invoice', [
      {
        $match: {
          status: { $nin: ['paid', 'cancelled'] },
          dueDate: { $lt: now },
        },
      },
      {
        $lookup: {
          from: 'customers',
          localField: 'customer',
          foreignField: '_id',
          as: 'customerInfo',
        },
      },
      { $unwind: { path: '$customerInfo', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          daysOverdue: {
            $floor: {
              $divide: [
                { $subtract: [now, '$dueDate'] },
                1000 * 60 * 60 * 24,
              ],
            },
          },
        },
      },
      {
        $project: {
          invoiceNumber: 1,
          totalAmount: 1,
          amountPaid: 1,
          outstandingAmount: 1,
          dueDate: 1,
          daysOverdue: 1,
          customerName: '$customerInfo.name',
          customerEmail: '$customerInfo.email',
        },
      },
      { $sort: { daysOverdue: -1 } },
    ]);

    res.json({ rows, totalOverdue: rows.length });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load overdue report', error: err.message });
  }
};

// ── GET /api/reports/subscriptions ───────────────────────────────────────────

export const getSubscriptionReport = async (_req, res) => {
  try {
    const byStatus = await safeAggregate('Subscription', [
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { status: '$_id', count: 1, _id: 0 } },
      { $sort: { count: -1 } },
    ]);

    const byPlan = await safeAggregate('Subscription', [
      {
        $lookup: {
          from: 'plans',
          localField: 'plan',
          foreignField: '_id',
          as: 'planInfo',
        },
      },
      { $unwind: { path: '$planInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$planInfo.name',
          count: { $sum: 1 },
          activeCount: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        },
      },
      { $project: { plan: '$_id', count: 1, activeCount: 1, _id: 0 } },
      { $sort: { count: -1 } },
    ]);

    res.json({ byStatus, byPlan });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load subscription report', error: err.message });
  }
};

// ── GET /api/reports/export ───────────────────────────────────────────────────

export const exportRevenueCsv = async (req, res) => {
  try {
    const match = buildInvoiceMatch(req.query);

    const rows = await safeAggregate('Invoice', [
      { $match: match },
      {
        $lookup: {
          from: 'customers',
          localField: 'customer',
          foreignField: '_id',
          as: 'customerInfo',
        },
      },
      { $unwind: { path: '$customerInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          invoiceNumber: 1,
          status: 1,
          totalAmount: 1,
          amountPaid: 1,
          outstandingAmount: 1,
          dueDate: 1,
          createdAt: 1,
          customerName: '$customerInfo.name',
          customerEmail: '$customerInfo.email',
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    const escape = (v) => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };

    const headers = [
      'Invoice Number', 'Customer Name', 'Customer Email',
      'Status', 'Total Amount', 'Amount Paid', 'Outstanding',
      'Due Date', 'Created At',
    ];

    const csvRows = rows.map((r) => [
      r.invoiceNumber,
      r.customerName,
      r.customerEmail,
      r.status,
      r.totalAmount,
      r.amountPaid,
      r.outstandingAmount,
      r.dueDate ? new Date(r.dueDate).toISOString().split('T')[0] : '',
      r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : '',
    ].map(escape).join(','));

    const csv = [headers.join(','), ...csvRows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="revenue-report.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: 'Failed to export report', error: err.message });
  }
};
