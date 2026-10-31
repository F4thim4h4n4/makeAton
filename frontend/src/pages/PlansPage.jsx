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
    if (!window.confirm('Deactivate this plan?')) return;
    try {
      await apiClient.post(`/plans/${id}/deactivate`);
      fetchPlans(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deactivate');
    }
  };

  const handleFormClose = (saved) => {
    setShowForm(false);
    setEditingPlan(null);
    if (saved) fetchPlans(pagination.page);
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Subscription Plans</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage billing plans for your products</p>
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
                  <th className="text-left px-6 py-3 font-semibold text-neutral-600">Name</th>
                  <th className="text-left px-6 py-3 font-semibold text-neutral-600">Interval</th>
                  <th className="text-right px-6 py-3 font-semibold text-neutral-600">Price</th>
                  <th className="text-center px-6 py-3 font-semibold text-neutral-600">Min Qty</th>
                  <th className="text-left px-6 py-3 font-semibold text-neutral-600">Available</th>
                  <th className="text-center px-6 py-3 font-semibold text-neutral-600">Status</th>
                  <th className="text-right px-6 py-3 font-semibold text-neutral-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {plans.map((p) => (
                  <tr key={p._id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-neutral-900">{p.name}</p>
                      {p.description && <p className="text-xs text-neutral-500 mt-0.5 truncate max-w-xs">{p.description}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700">
                        {INTERVAL_LABELS[p.billingInterval]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono">₹{p.price?.toFixed(2)}</td>
                    <td className="px-6 py-4 text-center">{p.minQuantity}</td>
                    <td className="px-6 py-4 text-xs text-neutral-600">
                      {fmtDate(p.availableFrom)} – {fmtDate(p.availableUntil)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => { setEditingPlan(p); setShowForm(true); }} className="text-primary-600 hover:text-primary-800 text-xs font-medium">Edit</button>
                      {p.status === 'active' && (
                        <button onClick={() => handleDeactivate(p._id)} className="text-red-600 hover:text-red-800 text-xs font-medium">Deactivate</button>
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
    </div>
  );
}

export default PlansPage;
