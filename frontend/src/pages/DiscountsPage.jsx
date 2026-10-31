import { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/apiClient.js';
import DiscountFormModal from '../components/catalog/DiscountFormModal.jsx';

const STATUS_COLORS = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-neutral-100 text-neutral-500',
};

function DiscountsPage() {
  const [discounts, setDiscounts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [scopeFilter, setScopeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);

  // Discount Simulator
  const [simDiscountId, setSimDiscountId] = useState('');
  const [simAmount, setSimAmount] = useState('2000');
  const [simQty, setSimQty] = useState('1');
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState('');

  const fetchDiscounts = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;
      if (scopeFilter) params.scope = scopeFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await apiClient.get('/discounts', { params });
      setDiscounts(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load discounts');
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, scopeFilter, statusFilter]);

  useEffect(() => {
    fetchDiscounts(1);
  }, [fetchDiscounts]);

  const handleDeactivate = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this discount?')) return;
    try {
      await apiClient.post(`/discounts/${id}/deactivate`);
      fetchDiscounts(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deactivate discount');
    }
  };

  const handleFormClose = (saved) => {
    setShowForm(false);
    setEditingDiscount(null);
    if (saved) fetchDiscounts(pagination.page);
  };

  const handleSimulate = async (e) => {
    e.preventDefault();
    if (!simDiscountId) {
      setSimError('Please select a discount rule to evaluate');
      return;
    }
    setSimLoading(true);
    setSimError('');
    setSimResult(null);
    try {
      const res = await apiClient.post('/discounts/evaluate', {
        discountId: simDiscountId,
        amount: Number(simAmount) || 0,
        quantity: Number(simQty) || 1,
      });
      setSimResult(res.data.data);
    } catch (err) {
      setSimError(err.response?.data?.message || 'Evaluation failed');
    } finally {
      setSimLoading(false);
    }
  };

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Discount Management</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Configure promotional discount codes, validity windows, and usage caps
          </p>
        </div>
        <button
          id="btn-add-discount"
          onClick={() => {
            setEditingDiscount(null);
            setShowForm(true);
          }}
          className="btn-primary"
        >
          + Add Discount
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="input-search-discounts"
            type="text"
            placeholder="Search discounts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Types</option>
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed (₹)</option>
          </select>
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Scopes</option>
            <option value="product">Selected Products</option>
            <option value="subscription">Whole Subscription</option>
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

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : discounts.length === 0 ? (
          <div className="text-center py-16 text-neutral-400">
            <p className="text-lg font-medium">No discounts found</p>
            <p className="text-sm mt-1">Create your first discount code or promo rule.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="text-left px-6 py-3 font-semibold text-neutral-600">Name / Code</th>
                  <th className="text-left px-6 py-3 font-semibold text-neutral-600">Type & Value</th>
                  <th className="text-left px-6 py-3 font-semibold text-neutral-600">Scope</th>
                  <th className="text-left px-6 py-3 font-semibold text-neutral-600">Min Rules</th>
                  <th className="text-center px-6 py-3 font-semibold text-neutral-600">Usage</th>
                  <th className="text-left px-6 py-3 font-semibold text-neutral-600">Validity Period</th>
                  <th className="text-center px-6 py-3 font-semibold text-neutral-600">Status</th>
                  <th className="text-right px-6 py-3 font-semibold text-neutral-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {discounts.map((d) => (
                  <tr key={d._id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-neutral-900">{d.name}</p>
                      {d.description && (
                        <p className="text-xs text-neutral-400 truncate max-w-xs">{d.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-emerald-700">
                      {d.type === 'percentage' ? `${d.value}% Off` : `₹${d.value?.toFixed(2)} Off`}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 capitalize">
                        {d.scope}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-neutral-600">
                      {d.minPurchaseAmount > 0 && <p>Min Purchase: ₹{d.minPurchaseAmount}</p>}
                      {d.minQuantity > 0 && <p>Min Qty: {d.minQuantity}</p>}
                      {d.minPurchaseAmount === 0 && d.minQuantity === 0 && (
                        <span className="text-neutral-400">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-xs">
                      <span className="font-medium text-neutral-800">
                        {d.currentUsageCount || 0}
                      </span>{' '}
                      / {d.maxUsageCount > 0 ? d.maxUsageCount : '∞'}
                    </td>
                    <td className="px-6 py-4 text-xs text-neutral-600">
                      {fmtDate(d.startDate)} – {fmtDate(d.endDate)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_COLORS[d.status]
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingDiscount(d);
                          setShowForm(true);
                        }}
                        className="text-primary-600 hover:text-primary-800 text-xs font-medium"
                      >
                        Edit
                      </button>
                      {d.status === 'active' && (
                        <button
                          onClick={() => handleDeactivate(d._id)}
                          className="text-red-600 hover:text-red-800 text-xs font-medium"
                        >
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
          <span>
            Page {pagination.page} of {pagination.pages} ({pagination.total} discount rules)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => fetchDiscounts(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="btn-secondary disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => fetchDiscounts(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="btn-secondary disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Discount Evaluation Simulator */}
      <div className="card bg-neutral-50/70 border border-neutral-200">
        <h2 className="text-base font-semibold text-neutral-900 mb-2">
          Discount Eligibility & Calculation Simulator
        </h2>
        <p className="text-xs text-neutral-500 mb-4">
          Test real-time validation (min purchase, limits, date validity, max caps) powered by backend discount evaluation.
        </p>

        <form onSubmit={handleSimulate} className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="sim-discount-select" className="block text-xs font-medium text-neutral-700 mb-1">
              Select Discount Rule
            </label>
            <select
              id="sim-discount-select"
              value={simDiscountId}
              onChange={(e) => setSimDiscountId(e.target.value)}
              className="px-3 py-2 bg-white border border-neutral-300 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">-- Choose Discount --</option>
              {discounts.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name} ({d.type === 'percentage' ? `${d.value}%` : `₹${d.value}`})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sim-amount-input" className="block text-xs font-medium text-neutral-700 mb-1">
              Transaction Amount (₹)
            </label>
            <input
              id="sim-amount-input"
              type="number"
              step="0.01"
              min="0"
              value={simAmount}
              onChange={(e) => setSimAmount(e.target.value)}
              className="px-3 py-2 bg-white border border-neutral-300 rounded-lg text-sm w-36 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label htmlFor="sim-qty-input" className="block text-xs font-medium text-neutral-700 mb-1">
              Quantity
            </label>
            <input
              id="sim-qty-input"
              type="number"
              min="1"
              value={simQty}
              onChange={(e) => setSimQty(e.target.value)}
              className="px-3 py-2 bg-white border border-neutral-300 rounded-lg text-sm w-24 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            type="submit"
            disabled={simLoading}
            className="btn-primary text-sm py-2 px-4 disabled:opacity-50"
          >
            {simLoading ? 'Evaluating...' : 'Simulate Discount'}
          </button>
        </form>

        {simError && <p className="text-xs text-red-500 mt-2">{simError}</p>}

        {simResult && (
          <div className="mt-4 p-4 bg-white border border-neutral-200 rounded-lg max-w-lg space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  simResult.applicable
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {simResult.applicable ? 'Applicable ✓' : 'Rejected ✗'}
              </span>
              {!simResult.applicable && (
                <span className="text-xs text-red-600 font-medium">
                  Reason: {simResult.reason}
                </span>
              )}
            </div>

            {simResult.applicable && (
              <>
                <div className="flex justify-between text-xs text-neutral-600">
                  <span>Eligible Amount:</span>
                  <span className="font-mono">₹{simResult.eligibleAmount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-emerald-700 font-medium">
                  <span>
                    Discount Applied ({simResult.discountName} - {simResult.discountType}):
                  </span>
                  <span className="font-mono">-₹{simResult.discountAmount?.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-sm text-neutral-900">
                  <span>Amount After Discount:</span>
                  <span className="font-mono text-primary-700">
                    ₹{simResult.amountAfterDiscount?.toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && <DiscountFormModal discount={editingDiscount} onClose={handleFormClose} />}
    </div>
  );
}

export default DiscountsPage;
