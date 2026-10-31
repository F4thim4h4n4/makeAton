import { useState, useEffect, useCallback } from 'react';
import apiClient from '../../services/apiClient.js';

function VariantPanel({ product, onClose }) {
  const [variants, setVariants] = useState([]);
  const [basePrice, setBasePrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [form, setForm] = useState({ name: '', additionalPrice: '', status: 'active' });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchVariants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/products/${product._id}/variants`);
      setVariants(res.data.data);
      setBasePrice(res.data.basePrice);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load variants');
    } finally {
      setLoading(false);
    }
  }, [product._id]);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Variant name is required';
    if (form.additionalPrice === '' || isNaN(form.additionalPrice)) {
      errs.additionalPrice = 'Valid price is required';
    } else if (Number(form.additionalPrice) < 0) {
      errs.additionalPrice = 'Price cannot be negative';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const startAdd = () => {
    setEditingVariant(null);
    setForm({ name: '', additionalPrice: '', status: 'active' });
    setFormErrors({});
    setShowAdd(true);
  };

  const startEdit = (v) => {
    setEditingVariant(v);
    setForm({
      name: v.name,
      additionalPrice: v.additionalPrice.toString(),
      status: v.status || 'active',
    });
    setFormErrors({});
    setShowAdd(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setError('');
    try {
      if (editingVariant) {
        await apiClient.patch(`/products/${product._id}/variants/${editingVariant._id}`, {
          name: form.name.trim(),
          additionalPrice: Number(form.additionalPrice),
          status: form.status,
        });
      } else {
        await apiClient.post(`/products/${product._id}/variants`, {
          name: form.name.trim(),
          additionalPrice: Number(form.additionalPrice),
          status: form.status,
        });
      }
      setForm({ name: '', additionalPrice: '', status: 'active' });
      setShowAdd(false);
      setEditingVariant(null);
      fetchVariants();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save variant');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (variant) => {
    const nextStatus = variant.status === 'active' ? 'inactive' : 'active';
    try {
      await apiClient.patch(`/products/${product._id}/variants/${variant._id}`, {
        status: nextStatus,
      });
      fetchVariants();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update variant status');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">
              Variants — {product.name}
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Base product price: ₹{basePrice?.toFixed(2)}
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 text-xl font-bold">
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
            </div>
          ) : variants.length === 0 && !showAdd ? (
            <div className="text-center py-10 text-neutral-400">
              <p className="font-medium">No variants yet</p>
              <p className="text-sm mt-1">Add a variant such as an Edition, Brand, or Tier.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {variants.map((v) => (
                <div
                  key={v._id}
                  className="flex items-center justify-between px-4 py-3 bg-neutral-50 rounded-lg hover:bg-neutral-100/70 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-neutral-800">{v.name}</p>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          v.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-neutral-200 text-neutral-600'
                        }`}
                      >
                        {v.status}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      +₹{v.additionalPrice?.toFixed(2)} extra → Final: <span className="font-semibold text-neutral-900 font-mono">₹{v.calculatedPrice?.toFixed(2)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(v)}
                      className="text-xs font-medium text-primary-600 hover:text-primary-800 px-2 py-1"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleStatus(v)}
                      className={`text-xs font-medium px-2 py-1 ${
                        v.status === 'active'
                          ? 'text-red-600 hover:text-red-800'
                          : 'text-emerald-600 hover:text-emerald-800'
                      }`}
                    >
                      {v.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add / Edit form */}
          {showAdd && (
            <form onSubmit={handleSave} className="card bg-neutral-50 border border-neutral-200 space-y-3 mt-4">
              <h3 className="text-sm font-semibold text-neutral-800">
                {editingVariant ? `Edit Variant: ${editingVariant.name}` : 'Add New Variant'}
              </h3>
              <div>
                <label htmlFor="variant-name" className="block text-sm font-medium text-neutral-700 mb-1">
                  Variant Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="variant-name"
                  type="text"
                  placeholder="e.g. Odoo, Enterprise Edition, Pro"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    formErrors.name ? 'border-red-400' : 'border-neutral-300'
                  }`}
                />
                {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <label htmlFor="variant-price" className="block text-sm font-medium text-neutral-700 mb-1">
                  Additional Price (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  id="variant-price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.additionalPrice}
                  onChange={(e) => setForm((p) => ({ ...p, additionalPrice: e.target.value }))}
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    formErrors.additionalPrice ? 'border-red-400' : 'border-neutral-300'
                  }`}
                />
                {formErrors.additionalPrice && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.additionalPrice}</p>
                )}
                {form.additionalPrice !== '' && !isNaN(form.additionalPrice) && Number(form.additionalPrice) >= 0 && (
                  <p className="text-xs text-neutral-500 mt-1">
                    Preview: ₹{basePrice?.toFixed(2)} + ₹{Number(form.additionalPrice).toFixed(2)} ={' '}
                    <strong className="text-neutral-900 font-mono">
                      ₹{(basePrice + Number(form.additionalPrice)).toFixed(2)}
                    </strong>
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="variant-status" className="block text-sm font-medium text-neutral-700 mb-1">
                  Status
                </label>
                <select
                  id="variant-status"
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdd(false);
                    setEditingVariant(null);
                  }}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingVariant ? 'Update Variant' : 'Add Variant'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 flex justify-between shrink-0">
          {!showAdd && (
            <button onClick={startAdd} className="btn-primary text-sm">
              + Add Variant
            </button>
          )}
          <button onClick={onClose} className="btn-secondary text-sm ml-auto">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default VariantPanel;