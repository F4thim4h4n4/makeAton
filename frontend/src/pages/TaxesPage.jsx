import { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/apiClient.js';
import TaxFormModal from '../components/catalog/TaxFormModal.jsx';

const STATUS_COLORS = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-neutral-100 text-neutral-500',
};

function TaxesPage() {
  const [taxes, setTaxes] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTax, setEditingTax] = useState(null);

  // Live Tax Calculation preview
  const [calcAmount, setCalcAmount] = useState('2500');
  const [calcResult, setCalcResult] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState('');

  const fetchTaxes = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await apiClient.get('/taxes', { params });
      setTaxes(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tax rules');
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, statusFilter]);

  useEffect(() => {
    fetchTaxes(1);
  }, [fetchTaxes]);

  const handleDeactivate = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this tax rule?')) return;
    try {
      await apiClient.post(`/taxes/${id}/deactivate`);
      fetchTaxes(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deactivate tax rule');
    }
  };

  const handleFormClose = (saved) => {
    setShowForm(false);
    setEditingTax(null);
    if (saved) fetchTaxes(pagination.page);
  };

  const handleCalculatePreview = async (e) => {
    e.preventDefault();
    setCalcLoading(true);
    setCalcError('');
    try {
      const res = await apiClient.post('/taxes/calculate', {
        amount: Number(calcAmount) || 0,
      });
      setCalcResult(res.data.data);
    } catch (err) {
      setCalcError(err.response?.data?.message || 'Calculation failed');
    } finally {
      setCalcLoading(false);
    }
  };

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Tax Management</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Configure percentage and fixed tax rules across catalog products
          </p>
        </div>
        <button
          id="btn-add-tax"
          onClick={() => {
            setEditingTax(null);
            setShowForm(true);
          }}
          className="btn-primary"
        >
          + Add Tax Rule
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="input-search-taxes"
            type="text"
            placeholder="Search tax rules..."
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
        ) : taxes.length === 0 ? (
          <div className="text-center py-16 text-neutral-400">
            <p className="text-lg font-medium">No tax rules found</p>
            <p className="text-sm mt-1">Configure your first tax rule (e.g. GST, VAT).</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="text-left px-6 py-3 font-semibold text-neutral-600">Tax Name</th>
                  <th className="text-left px-6 py-3 font-semibold text-neutral-600">Type</th>
                  <th className="text-right px-6 py-3 font-semibold text-neutral-600">Rate / Amount</th>
                  <th className="text-left px-6 py-3 font-semibold text-neutral-600">Applicable Products</th>
                  <th className="text-left px-6 py-3 font-semibold text-neutral-600">Effective Period</th>
                  <th className="text-center px-6 py-3 font-semibold text-neutral-600">Status</th>
                  <th className="text-right px-6 py-3 font-semibold text-neutral-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {taxes.map((t) => (
                  <tr key={t._id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-neutral-900">{t.name}</td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                        {t.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-medium text-neutral-800">
                      {t.type === 'percentage' ? `${t.rate}%` : `₹${t.rate?.toFixed(2)}`}
                    </td>
                    <td className="px-6 py-4 text-xs text-neutral-600">
                      {t.applicableProducts && t.applicableProducts.length > 0 ? (
                        <span>
                          {t.applicableProducts
                            .map((p) => (typeof p === 'object' ? p.name : p))
                            .join(', ')}
                        </span>
                      ) : (
                        <span className="italic text-neutral-400">All Products</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-neutral-600">
                      {fmtDate(t.effectiveFrom)} – {fmtDate(t.effectiveTo)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_COLORS[t.status]
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingTax(t);
                          setShowForm(true);
                        }}
                        className="text-primary-600 hover:text-primary-800 text-xs font-medium"
                      >
                        Edit
                      </button>
                      {t.status === 'active' && (
                        <button
                          onClick={() => handleDeactivate(t._id)}
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
            Page {pagination.page} of {pagination.pages} ({pagination.total} tax rules)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => fetchTaxes(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="btn-secondary disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => fetchTaxes(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="btn-secondary disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Tax Calculation Simulator */}
      <div className="card bg-neutral-50/70 border border-neutral-200">
        <h2 className="text-base font-semibold text-neutral-900 mb-2">
          Authoritative Tax Engine Preview
        </h2>
        <p className="text-xs text-neutral-500 mb-4">
          Test real-time calculation backed by the server tax calculator service.
        </p>

        <form onSubmit={handleCalculatePreview} className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="tax-calc-amount" className="block text-xs font-medium text-neutral-700 mb-1">
              Taxable Amount (₹)
            </label>
            <input
              id="tax-calc-amount"
              type="number"
              step="0.01"
              min="0"
              value={calcAmount}
              onChange={(e) => setCalcAmount(e.target.value)}
              className="px-3 py-2 bg-white border border-neutral-300 rounded-lg text-sm w-44 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            type="submit"
            disabled={calcLoading}
            className="btn-primary text-sm py-2 px-4 disabled:opacity-50"
          >
            {calcLoading ? 'Calculating...' : 'Preview Taxes'}
          </button>
        </form>

        {calcError && <p className="text-xs text-red-500 mt-2">{calcError}</p>}

        {calcResult && (
          <div className="mt-4 p-4 bg-white border border-neutral-200 rounded-lg max-w-lg space-y-2">
            <div className="flex justify-between text-xs text-neutral-600">
              <span>Taxable Subtotal:</span>
              <span className="font-mono font-medium">₹{Number(calcAmount).toFixed(2)}</span>
            </div>
            {calcResult.taxes && calcResult.taxes.length > 0 ? (
              calcResult.taxes.map((tx, idx) => (
                <div key={idx} className="flex justify-between text-xs text-neutral-700">
                  <span>
                    + {tx.name} ({tx.type === 'percentage' ? `${tx.rate}%` : `Fixed ₹${tx.rate}`}):
                  </span>
                  <span className="font-mono text-emerald-700">+₹{tx.taxAmount.toFixed(2)}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-neutral-400 italic">No active taxes applied</p>
            )}
            <div className="border-t pt-2 flex justify-between font-bold text-sm text-neutral-900">
              <span>Total Amount After Tax:</span>
              <span className="font-mono text-primary-700">
                ₹{calcResult.amountAfterTax?.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && <TaxFormModal tax={editingTax} onClose={handleFormClose} />}
    </div>
  );
}

export default TaxesPage;
