/**
 * dashboardService.js  (Member 4 – feature/dashboard-portal)
 * Axios helpers for all dashboard, report, and customer portal API endpoints.
 */

import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

const api = axios.create({ baseURL: BASE, withCredentials: true });

// Dashboard
export const fetchDashboardSummary = () =>
  api.get('/dashboard/summary').then((r) => r.data);

export const fetchDashboardCharts = (period = '30d') =>
  api.get('/dashboard/charts', { params: { period } }).then((r) => r.data);

export const fetchDashboardRecent = () =>
  api.get('/dashboard/recent').then((r) => r.data);

// Reports
export const fetchRevenueReport = (params = {}) =>
  api.get('/reports/revenue', { params }).then((r) => r.data);

export const fetchOverdueReport = () =>
  api.get('/reports/overdue').then((r) => r.data);

export const fetchSubscriptionReport = (params = {}) =>
  api.get('/reports/subscriptions', { params }).then((r) => r.data);

export const downloadRevenueCsv = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  const url = `${BASE}/reports/export${qs ? `?${qs}` : ''}`;
  const a = document.createElement('a');
  a.href = url;
  a.download = 'revenue-report.csv';
  a.click();
};

// Customer Portal
export const fetchPortalProfile = () =>
  api.get('/portal/profile').then((r) => r.data);

export const fetchPortalSubscriptions = () =>
  api.get('/portal/subscriptions').then((r) => r.data);

export const fetchPortalInvoices = () =>
  api.get('/portal/invoices').then((r) => r.data);

export const fetchPortalInvoiceDetail = (id) =>
  api.get(`/portal/invoices/${id}`).then((r) => r.data);

export const fetchPortalPayments = () =>
  api.get('/portal/payments').then((r) => r.data);
