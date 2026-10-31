import { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/apiClient.js';
import ProductFormModal from '../components/catalog/ProductFormModal.jsx';
import VariantPanel from '../components/catalog/VariantPanel.jsx';

const STATUS_COLORS = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-neutral-100 text-neutral-500',
};

function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const fetchProducts = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await apiClient.get('/products', { params });
      setProducts(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchProducts(1);
  }, [fetchProducts]);

  const handleDeactivate = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this product?')) return;
    try {
      await apiClient.post(`/products/${id}/deactivate`);
      fetchProducts(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deactivate');
    }
  };

  const handleFormClose = (saved) => {
    setShowForm(false);
    setEditingProduct(null);
    if (saved) fetchProducts(pagination.page);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Products</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Manage your product catalog and variants
          </p>
        </div>
        <button
          id="btn-add-product"
          onClick={() => { setEditingProduct(null); setShowForm(true); }}
          className="btn-primary"
        >
          + Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="input-search-products"
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <select
            id="select-status-filter"
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

      {/* Error */}
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
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-neutral-400">
            <p className="text-lg font-medium">No products found</p>
            <p className="text-sm mt-1">Create your first product to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="text-left px-6 py-3 font-semibold text-neutral-600">Name</th>
                  <th className="text-left px-6 py-3 font-semibold text-neutral-600">Type</th>
                  <th className="text-right px-6 py-3 font-semibold text-neutral-600">Sales Price</th>
                  <th className="text-right px-6 py-3 font-semibold text-neutral-600">Cost Price</th>
                  <th className="text-center px-6 py-3 font-semibold text-neutral-600">Variants</th>
                  <th className="text-center px-6 py-3 font-semibold text-neutral-600">Status</th>
                  <th className="text-right px-6 py-3 font-semibold text-neutral-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {products.map((p) => (
                  <tr key={p._id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-neutral-900">{p.name}</td>
                    <td className="px-6 py-4 text-neutral-600">{p.type || '—'}</td>
                    <td className="px-6 py-4 text-right font-mono">₹{p.salesPrice?.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-mono text-neutral-500">
                      {p.costPrice != null ? `₹${p.costPrice.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedProduct(p)}
                        className="text-primary-600 hover:underline"
                      >
                        {p.variantCount || 0}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => { setEditingProduct(p); setShowForm(true); }}
                        className="text-primary-600 hover:text-primary-800 text-xs font-medium"
                      >
                        Edit
                      </button>
                      {p.status === 'active' && (
                        <button
                          onClick={() => handleDeactivate(p._id)}
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

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-neutral-600">
          <span>Page {pagination.page} of {pagination.pages} ({pagination.total} products)</span>
          <div className="flex gap-2">
            <button
              onClick={() => fetchProducts(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="btn-secondary disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => fetchProducts(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="btn-secondary disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <ProductFormModal
          product={editingProduct}
          onClose={handleFormClose}
        />
      )}

      {selectedProduct && (
        <VariantPanel
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}

export default ProductsPage;
