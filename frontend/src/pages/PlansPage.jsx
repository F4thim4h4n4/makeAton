import { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/apiClient.js';
import PlanFormModal from '../components/catalog/PlanFormModal.jsx';

const INTERVAL_LABELS = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };
const STATUS_COLORS = { active: 'bg-emerald-100 text-emerald-700', inactive: 'bg-neutral-100 text-neutral-500' };

function PlansPage() {
  const [plans, setPlans] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [intervalFilter, setIntervalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  // Pricing calculator modal state
  const [calcPlan, setCalcPlan] = useState(null);
  const [calcQty, setCalcQty] = useState(1);
  const [calcResult, setCalcResult] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState('');

  const fetchPlans = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (intervalFilter) params.billingInterval = intervalFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await apiClient.get('/plans', { params });
      setPlans(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, [search, intervalFilter, statusFilter]);

  useEffect(() => { fetchPlans(1); }, [fetchPlans]);

  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this subscription plan?')) return;
    try {
      await apiClient.post(`/plans/${id}/deactivate`);
      fetchPlans(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deactivate plan');
    }
  };

  const handleFormClose = (saved) => {
    setShowForm(false);
    setEditingPlan(null);
    if (saved) fetchPlans(pagination.page);
  };

  const openCalculator = (plan) => {
    setCalcPlan(plan);
    setCalcQty(plan.minQuantity || 1);
    setCalcResult(null);
    setCalcError('');
  };

  const runCalculation = async () => {
    if (!calcPlan) return;
    setCalcLoading(true);
    setCalcError('');
    try {
      const res = await apiClient.post(`/plans/${calcPlan._id}/calculate`, {
        quantity: Number(calcQty),
      });
      setCalcResult(res.data.data);
    } catch (err) {
      setCalcError(err.response?.data?.message || 'Failed to calculate price');
    } finally {
      setCalcLoading(false);
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Subscription Plans</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage billing intervals and pricing rules for your products</p>
        </div>
        <button id="btn-add-plan" onClick={() => { setEditingPlan(null); setShowForm(true); }} className="btn-primary">
          + Add Plan
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="input-search-plans"
            type="text"
            placeholder="Search plans..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <select
            id="select-interval-filter"
            value={intervalFilter}
            onChange={(e) => setIntervalFilter(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Intervals</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-16 text-neutral-400">
            <p className="text-lg font-medium">No plans found</p>
            <p className="text-sm mt-1">Create your first subscription plan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="text-left px-6 py-3 font-semibold text-neutral-600">Name & Products</th>
                  <th className="text-left px-6 py-3 font-semibold text-neutral-600">Interval</th>
                  <th className="text-right px-6 py-3 font-semibold text-neutral-600">Price</th>
                  <th className="text-center px-6 py-3 font-semibold text-neutral-600">Min Qty</th>
                  <th className="text-left px-6 py-3 font-semibold text-neutral-600">Validity</th>
                  <th className="text-center px-6 py-3 font-semibold text-neutral-600">Permissions</th>
                  <th className="text-center px-6 py-3 font-semibold text-neutral-600">Status</th>
                  <th className="text-right px-6 py-3 font-semibold text-neutral-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {plans.map((p) => (
                  <tr key={p._id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-neutral-900">{p.name}</p>
                      {p.productIds && p.productIds.length > 0 && (
                        <p className="text-xs text-primary-700 mt-0.5">
                          Products: {p.productIds.map((pr) => (typeof pr === 'object' ? pr.name : pr)).join(', ')}
                        </p>
                      )}
                      {p.description && <p className="text-xs text-neutral-400 mt-0.5 truncate max-w-xs">{p.description}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700">
                        {INTERVAL_LABELS[p.billingInterval] || p.billingInterval}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-medium">₹{p.price?.toFixed(2)}</td>
                    <td className="px-6 py-4 text-center">{p.minQuantity}</td>
                    <td className="px-6 py-4 text-xs text-neutral-600">
                      {fmtDate(p.availableFrom)} – {fmtDate(p.availableUntil)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-wrap justify-center gap-1 text-[10px]">
                        {p.allowPause && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">Pause</span>}
                        {p.allowRenewal && <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded">Renew</span>}
                        {p.allowEarlyClose && <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded">EarlyClose</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openCalculator(p)}
                        className="text-xs text-emerald-600 hover:text-emerald-800 font-medium"
                        title="Test Pricing Formula"
                      >
                        Calculate
                      </button>
                      <button onClick={() => { setEditingPlan(p); setShowForm(true); }} className="text-primary-600 hover:text-primary-800 text-xs font-medium">
                        Edit
                      </button>
                      {p.status === 'active' && (
                        <button onClick={() => handleDeactivate(p._id)} className="text-red-600 hover:text-red-800 text-xs font-medium">
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-neutral-600">
          <span>Page {pagination.page} of {pagination.pages} ({pagination.total} plans)</span>
          <div className="flex gap-2">
            <button onClick={() => fetchPlans(pagination.page - 1)} disabled={pagination.page <= 1} className="btn-secondary disabled:opacity-40">Previous</button>
            <button onClick={() => fetchPlans(pagination.page + 1)} disabled={pagination.page >= pagination.pages} className="btn-secondary disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      {showForm && <PlanFormModal plan={editingPlan} onClose={handleFormClose} />}

      {/* Pricing Calculator Modal */}
      {calcPlan && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-semibold text-neutral-900">Price Calculator: {calcPlan.name}</h3>
              <button onClick={() => setCalcPlan(null)} className="text-neutral-400 hover:text-neutral-600 text-xl font-bold">×</button>
            </div>
            <div className="text-xs text-neutral-500">
              <p>Plan Rate: <strong className="text-neutral-800">₹{calcPlan.price?.toFixed(2)}</strong> / {calcPlan.billingInterval}</p>
              <p>Min Quantity Required: <strong className="text-neutral-800">{calcPlan.minQuantity}</strong></p>
            </div>
            <div>
              <label htmlFor="calc-qty-input" className="block text-xs font-medium text-neutral-700 mb-1">Enter Quantity (Units / Seats):</label>
              <input
                id="calc-qty-input"
                type="number"
                min={calcPlan.minQuantity || 1}
                value={calcQty}
                onChange={(e) => setCalcQty(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            {calcError && <p className="text-xs text-red-500">{calcError}</p>}
            {calcResult && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm">
                <p className="text-emerald-800 font-medium">Subtotal Calculated:</p>
                <p className="text-lg font-bold text-emerald-950 font-mono mt-1">₹{calcResult.subtotal?.toFixed(2)}</p>
                <p className="text-xs text-emerald-700 mt-1">Formula: ₹{calcResult.planPrice} × {calcResult.quantity} units = ₹{calcResult.subtotal}</p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setCalcPlan(null)} className="btn-secondary text-sm">Close</button>
              <button onClick={runCalculation} disabled={calcLoading} className="btn-primary text-sm">
                {calcLoading ? 'Calculating...' : 'Calculate Subtotal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlansPage;